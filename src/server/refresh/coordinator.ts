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
  refreshTtlSeconds,
}: {
  repository: DrizzleLeaderboardRepository;
  riot: RiotClient;
  now: () => Date;
  players: AppConfig['players'];
  startsAt: Date | null;
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
        for (const playerConfig of players) {
          const { gameName, tagLine } = parseRiotId(playerConfig.riotId);

          // 1. Obtener cuenta de Riot
          const account = await riot.getAccountByRiotId(playerConfig.riotId);
          const puuid = account.puuid;

          // 2. Obtener summoner
          const summoner = await riot.getSummonerByPuuid(puuid, playerConfig.platform);
          const profileIconId = summoner.profileIconId;

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
            accountCluster: 'americas',
            profileIconId,
          });

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

          // 6. Obtener partidas recientes (últimas 20 de Solo/Duo)
          const matchIds: string[] = await riot.getMatchIdsByPuuid(puuid, 420, 10);
          const matches = [];
          const matchDataList = await Promise.all(matchIds.map((matchId) => riot.getMatch(matchId)));
          for (let index = 0; index < matchDataList.length; index += 1) {
            const matchData = matchDataList[index];
            const matchId = matchIds[index];
            const participant = matchData.info.participants.find(
              (p: any) => p.puuid === puuid
            );
            if (participant) {
              matches.push({
                matchId,
                playedAt: new Date(matchData.info.gameCreation),
                queueId: matchData.info.queueId,
                championName: participant.championName,
                win: participant.win,
                kills: participant.kills,
                deaths: participant.deaths,
                assists: participant.assists,
                durationSeconds: matchData.info.gameDuration,
              });
            }
          }
          await repository.saveMatches(playerId, matches);
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