import 'server-only';
import { DrizzleLeaderboardRepository } from '@/server/db/repository';
import { readServerEnv } from '@/server/env';
import { RiotClient } from '@/server/riot/client';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Lightweight spectator-only status endpoint.
 * Checks ALL active players' in-game status in parallel batches and updates the DB.
 * Designed to run in <8s to stay within Vercel Hobby limits.
 */
export async function POST() {
  try {
    const repository = new DrizzleLeaderboardRepository();
    const riot = new RiotClient({ apiKey: readServerEnv().RIOT_API_KEY });

    const players = await repository.getPlayers();

    // Check all players in small batches of 4 to stay under rate limits
    const BATCH_SIZE = 4;
    const updates: Array<{ riotId: string; isOnline: boolean; start: Date | null; queueId: number | null }> = [];

    for (let i = 0; i < players.length; i += BATCH_SIZE) {
      const batch = players.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async (player) => {
          if (!player.puuid) return null;
          try {
            const activeGame = await riot.getActiveGameByPuuid(player.puuid, player.platform);
            if (activeGame?.gameId) {
              return {
                id: player.id,
                riotId: player.riotId,
                isOnline: true,
                start: activeGame.gameStartTime ? new Date(activeGame.gameStartTime) : null,
                queueId: activeGame.gameQueueConfigId ?? null,
              };
            }
            return { id: player.id, riotId: player.riotId, isOnline: false, start: null, queueId: null };
          } catch {
            // 404 = not in game, other errors = skip silently
            return { id: player.id, riotId: player.riotId, isOnline: false, start: null, queueId: null };
          }
        })
      );

      for (const result of results) {
        if (!result) continue;
        await repository.updatePlayerOnlineStatus(result.id, result.isOnline, result.start, result.queueId);
        updates.push({ riotId: result.riotId, isOnline: result.isOnline, start: result.start, queueId: result.queueId });
      }

      // Small delay between batches to avoid bursting rate limit
      if (i + BATCH_SIZE < players.length) {
        await new Promise((r) => setTimeout(r, 150));
      }
    }

    const online = updates.filter((u) => u.isOnline).map((u) => u.riotId);
    console.log(`✅ Spectator ping: ${online.length} jugadores EN VIVO: [${online.join(', ')}]`);

    return NextResponse.json({ success: true, online });
  } catch (error) {
    console.error('POST /api/leaderboard/spectator failed:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
