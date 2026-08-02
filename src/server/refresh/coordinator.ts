import type { DrizzleLeaderboardRepository } from '@/server/db/repository';
import { RiotApiError, RiotClient } from '@/server/riot/client';
import type { AppConfig } from '@/server/config';
import { parseRiotId } from '@/domain/riot-id';

export function createRefreshCoordinator({
  repository,
  riot,
  now,
  players,
  startsAt,
  endsAt,
  refreshTtlSeconds,
}: {
  repository: DrizzleLeaderboardRepository;
  riot: RiotClient;
  now: () => Date;
  players: AppConfig['players'];
  startsAt: Date | null;
  endsAt: Date | null;
  refreshTtlSeconds: number;
}) {
  return {
    async refresh() {
      console.log('🔄 Iniciando actualización de datos...');
      const tournamentId = 'soloq-challenge';
      const tournament = await repository.getTournament();
      if (!tournament) {
        throw new Error('Torneo no configurado');
      }

      await repository.updateTournament(tournamentId, {
        lastAttemptedAt: now(),
        refreshStatus: 'refreshing',
      });

      try {
        // Sync active players in DB with config players
        const dbPlayersBefore = await repository.getPlayers();
        const configRiotIds = new Set(players.map((p) => p.riotId));

        // Deactivate players no longer in config
        for (const dbP of dbPlayersBefore) {
          if (!configRiotIds.has(dbP.riotId)) {
            console.log(`Deactivating player ${dbP.riotId} as they are not in config`);
            await repository.deactivatePlayer(dbP.riotId);
          }
        }

        // Add/reactivate players from config
        for (const pConfig of players) {
          const dbP = await repository.getPlayerByRiotId(pConfig.riotId);
          if (!dbP) {
            console.log(`Adding player ${pConfig.riotId} from config`);
            try {
              const account = await riot.getAccountByRiotId(pConfig.riotId);
              const { gameName, tagLine } = parseRiotId(pConfig.riotId);
              await repository.upsertPlayer({
                riotId: pConfig.riotId,
                platform: pConfig.platform,
                gameName,
                tagLine,
                puuid: account.puuid,
                summonerId: '',
                accountCluster: 'americas',
                profileIconId: 0,
              });
            } catch (err) {
              console.error(`Failed to add player ${pConfig.riotId}:`, err);
            }
          } else if (!dbP.active) {
            // Player exists but is inactive — reactivate it
            console.log(`Reactivating player ${pConfig.riotId}`);
            const { gameName, tagLine } = parseRiotId(pConfig.riotId);
            if (dbP.puuid && dbP.accountCluster) {
              await repository.upsertPlayer({
                riotId: pConfig.riotId,
                platform: pConfig.platform,
                gameName: dbP.gameName ?? gameName,
                tagLine: dbP.tagLine ?? tagLine,
                puuid: dbP.puuid,
                summonerId: dbP.summonerId ?? '',
                accountCluster: dbP.accountCluster,
                profileIconId: dbP.profileIconId ?? 0,
              });
            } else {
              // puuid missing, fetch from Riot API
              try {
                const account = await riot.getAccountByRiotId(pConfig.riotId);
                await repository.upsertPlayer({
                  riotId: pConfig.riotId,
                  platform: pConfig.platform,
                  gameName,
                  tagLine,
                  puuid: account.puuid,
                  summonerId: '',
                  accountCluster: 'americas',
                  profileIconId: 0,
                });
              } catch (err) {
                console.error(`Failed to reactivate ${pConfig.riotId}:`, err);
              }
            }
          }
        }

        const dbPlayers = await repository.getPlayers();

        for (const playerConfig of dbPlayers) {
          const { gameName, tagLine } = parseRiotId(playerConfig.riotId);

          // 1. Obtener cuenta de Riot (sólo si no tenemos el PUUID en DB)
          let puuid = playerConfig.puuid;
          if (!puuid) {
            try {
              console.log(`PUUID no encontrado en DB para ${playerConfig.riotId}, obteniendo de Riot...`);
              const account = await riot.getAccountByRiotId(playerConfig.riotId);
              puuid = account.puuid || null;
            } catch (err) {
              console.error(`Error al obtener cuenta de Riot para ${playerConfig.riotId}:`, err);
              continue;
            }
          }
          if (!puuid) {
            console.error(`No se pudo obtener el PUUID para ${playerConfig.riotId}`);
            continue;
          }

          // 2. Obtener summoner
          const summoner = await riot.getSummonerByPuuid(puuid, playerConfig.platform);
          const profileIconId = summoner.profileIconId;
          const summonerId: string | null = summoner.id ?? null;

          // 3. Obtener ligas
          const leagues = await riot.getLeagueEntriesByPuuid(puuid, playerConfig.platform);
          const soloQ = leagues.find((l: any) => l.queueType === 'RANKED_SOLO_5x5');

          // 4. Guardar/actualizar jugador
          const playerId = await repository.upsertPlayer({
            riotId: playerConfig.riotId,
            platform: playerConfig.platform,
            gameName,
            tagLine,
            puuid,
            summonerId: summonerId || '',
            accountCluster: 'americas',
            profileIconId,
          });

          // 4.5. Obtener estado online (Spectator v5 via PUUID)
          let isOnline = false;
          let activeGameStartTime: Date | null = null;
          let activeGameQueueId: number | null = null;
          try {
            const activeGame = await riot.getActiveGameByPuuid(puuid, playerConfig.platform);
            if (activeGame && activeGame.gameId) {
              isOnline = true;
              // gameStartTime es epoch en milisegundos
              activeGameStartTime = activeGame.gameStartTime
                ? new Date(activeGame.gameStartTime)
                : null;
              activeGameQueueId = activeGame.gameQueueConfigId ?? null;
              console.log(`🟢 ${playerConfig.riotId} está EN PARTIDA (gameId: ${activeGame.gameId}, inicio: ${activeGameStartTime?.toISOString()})`);
            }
          } catch (err: any) {
            if (err?.status !== 404) {
              console.warn(`⚠️ Spectator API error para ${playerConfig.riotId}: ${err?.message}`);
            }
            // 404 = no está jugando, normal
          }
          await repository.updatePlayerOnlineStatus(playerId, isOnline, activeGameStartTime, activeGameQueueId);


          // 5. Guardar snapshot de rango
          if (soloQ) {
            await repository.saveRankSnapshot({
              playerId,
              observedAt: now(),
              rank: {
                tier: soloQ.tier,
                division: soloQ.rank,
                leaguePoints: soloQ.leaguePoints,
              },
              seasonWins: soloQ.wins,
              seasonLosses: soloQ.losses,
              profileIconId,
            });
          }

          // 6. Obtener partidas recientes dentro de la duración del torneo
          const startSec = startsAt ? Math.floor(startsAt.getTime() / 1000) : undefined;
          const endSec = endsAt ? Math.floor(endsAt.getTime() / 1000) : undefined;
          const matchIds: string[] = await riot.getMatchIdsByPuuid(puuid, 420, 100, startSec, endSec);
          
          const existingMatches = await repository.getMatches(playerId, 1000);
          const existingMatchIds = new Set(existingMatches.map((m) => m.matchId));
          const newMatchIds = matchIds.filter((id) => !existingMatchIds.has(id));

          const matches = [];
          if (newMatchIds.length > 0) {
            console.log(`Obteniendo ${newMatchIds.length} partidas nuevas para ${playerConfig.riotId}...`);
            const matchDataList = [];
            for (const matchId of newMatchIds) {
              try {
                const data = await riot.getMatch(matchId);
                matchDataList.push({ matchId, matchData: data });
                // Delays 60ms to avoid 20req/sec burst limits
                await new Promise((resolve) => setTimeout(resolve, 60));
              } catch (err) {
                if (err instanceof RiotApiError && err.status === 429) {
                  console.warn("⚠️ Rate limit 429 alcanzado. Esperando 2 segundos...");
                  await new Promise((resolve) => setTimeout(resolve, 2000));
                  try {
                    const data = await riot.getMatch(matchId);
                    matchDataList.push({ matchId, matchData: data });
                  } catch (retryErr) {
                    console.error(`Reintento fallido para partida ${matchId}:`, retryErr);
                  }
                } else {
                  console.error(`Error al obtener partida ${matchId}:`, err);
                }
              }
            }

            for (let index = 0; index < matchDataList.length; index += 1) {
              const { matchId, matchData } = matchDataList[index];
              const participant = matchData.info.participants.find(
                (p: any) => p.puuid === puuid
              );
              if (participant) {
                const isRemake =
                  (participant.gameEndedInEarlySurrender === true || participant.gameEndedInVoid === true) &&
                  matchData.info.gameDuration < 240;
                matches.push({
                  matchId,
                  playedAt: new Date(matchData.info.gameCreation),
                  queueId: matchData.info.queueId,
                  championName: participant.championName,
                  lane: participant.teamPosition || participant.individualPosition || null,
                  win: isRemake ? null : participant.win,
                  kills: participant.kills,
                  deaths: participant.deaths,
                  assists: participant.assists,
                  durationSeconds: matchData.info.gameDuration,
                });
              }
            }
            await repository.saveMatches(playerId, matches);
          }
        }

        await repository.updateTournament(tournamentId, {
          lastSuccessfulAt: now(),
          refreshStatus: 'idle',
        });

        console.log('✅ Actualización completada exitosamente');
      } catch (error) {
        console.error('❌ Error durante la actualización:', error);
        await repository.updateTournament(tournamentId, {
          refreshStatus:
            error instanceof RiotApiError && (error.status === 401 || error.status === 403)
              ? 'riot_api_key_invalid'
              : 'temporary_error',
        });
        throw error;
      }
    },
  };
}