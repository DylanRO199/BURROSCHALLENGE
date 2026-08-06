import 'server-only';
import { DrizzleLeaderboardRepository } from '@/server/db/repository';
import { readServerEnv } from '@/server/env';
import { RiotClient } from '@/server/riot/client';
import { NextResponse } from 'next/server';
import { loadConfig } from '@/server/config';
import { refreshPlayerMatchesOnly } from '@/server/refresh/coordinator';
import { invalidateLeaderboardCache } from '@/server/runtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


/**
 * Lightweight rank-only endpoint.
 * Updates LP, W/L and tier for ALL active players in parallel batches.
 * Does NOT fetch match history for everyone — but triggers match history refresh
 * immediately and exclusively for players whose LP just changed.
 */
export async function POST() {
  try {
    const repository = new DrizzleLeaderboardRepository();
    const tournamentId = 'soloq-challenge';

    // Check cooldown to protect Riot API Key from 429
    const tournament = await repository.getTournament();
    const now = new Date();
    if (tournament?.lastRankAttemptedAt) {
      const elapsedMs = now.getTime() - tournament.lastRankAttemptedAt.getTime();
      if (elapsedMs < 60000) {
        console.log(`⏱️ Rank ping skipped (cooldown active: ${Math.round(elapsedMs / 1000)}s / 60s)`);
        return NextResponse.json({ success: true, cached: true });
      }
    }

    // Update cooldown timestamp in DB
    await repository.updateTournamentRankTime(tournamentId, now);

    const riot = new RiotClient({ apiKey: readServerEnv().RIOT_API_KEY });
    const config = loadConfig();
    const startsAt = config.tournament.startsAt ? new Date(config.tournament.startsAt) : null;
    const endsAt = config.tournament.endsAt ? new Date(config.tournament.endsAt) : null;

    const players = await repository.getPlayers();
    const updates: string[] = [];

    // Process in batches of 4 with small pauses to avoid bursting rate limit
    const BATCH_SIZE = 4;
    for (let i = 0; i < players.length; i += BATCH_SIZE) {
      const batch = players.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (player) => {
          if (!player.puuid) return;
          try {
            const leagues = await riot.getLeagueEntriesByPuuid(player.puuid, player.platform);
            const soloQ = leagues.find((l: any) => l.queueType === 'RANKED_SOLO_5x5');
            if (soloQ) {
              // Get the current latest snapshot to compare
              const latest = await repository.getLatestRankSnapshot(player.id);
              const lpChanged =
                !latest ||
                latest.leaguePoints !== soloQ.leaguePoints ||
                latest.tier !== soloQ.tier ||
                latest.division !== soloQ.rank ||
                latest.seasonWins !== soloQ.wins ||
                latest.seasonLosses !== soloQ.losses;

              if (lpChanged) {
                await repository.saveRankSnapshot({
                  playerId: player.id,
                  observedAt: now,
                  rank: {
                    tier: soloQ.tier,
                    division: soloQ.rank,
                    leaguePoints: soloQ.leaguePoints,
                  },
                  seasonWins: soloQ.wins,
                  seasonLosses: soloQ.losses,
                  profileIconId: player.profileIconId ?? 0,
                });
                updates.push(`${player.riotId}: ${soloQ.tier} ${soloQ.rank} ${soloQ.leaguePoints}LP (W:${soloQ.wins} L:${soloQ.losses})`);
                console.log(`📊 LP changed for ${player.riotId}: ${soloQ.leaguePoints}LP. Triggering priority match history refresh.`);

                // Immediately trigger match history update for this player since we know they played a game
                try {
                  await refreshPlayerMatchesOnly({
                    playerId: player.id,
                    riotId: player.riotId,
                    puuid: player.puuid,
                    platform: player.platform,
                    startsAt,
                    endsAt,
                    repository,
                    riot,
                  });
                } catch (matchErr) {
                  console.error(`⚠️ Failed to update matches on-demand for ${player.riotId}:`, matchErr);
                }
              }
            }
          } catch (err: any) {
            // Non-blocking: silently skip if rate limited or error
            if (err?.status !== 429) {
              console.warn(`⚠️ Rank update error for ${player.riotId}:`, err?.message ?? err);
            }
          }
        })
      );

      // Small delay between batches
      if (i + BATCH_SIZE < players.length) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    const online = updates.length > 0;
    if (online) {
      // Import invalidation dynamically or use imported one. We already imported it from '@/server/runtime' at the top of the file!
    }
    invalidateLeaderboardCache();

    console.log(`✅ Rank ping: ${updates.length} players changed LP: ${updates.join(', ') || 'none'}`);
    return NextResponse.json({ success: true, changed: updates.length, updates });
  } catch (error) {
    console.error('POST /api/leaderboard/rank failed:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
