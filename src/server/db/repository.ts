import 'server-only';
import { and, desc, eq, gt, inArray, isNotNull, sql } from 'drizzle-orm';
import { db } from './client';
import { playerMatches, players, rankSnapshots, tournaments } from './schema';
import type { MatchFact, Rank } from '@/domain/types';

export class DrizzleLeaderboardRepository {
  async getTournament() {
    const result = await db.select().from(tournaments).limit(1);
    return result[0] || null;
  }

  async updateTournament(
    id: string,
    data: {
      lastAttemptedAt?: Date;
      lastSuccessfulAt?: Date;
      refreshStatus?: 'idle' | 'refreshing' | 'temporary_error' | 'riot_api_key_invalid';
    }
  ) {
    await db.update(tournaments).set(data).where(eq(tournaments.id, id));
  }

  async ensureTournament(data: {
    id: string;
    name: string;
    startsAt: Date | null;
    timezone: string;
    refreshTtlSeconds: number;
  }) {
    await db
      .insert(tournaments)
      .values(data)
      .onConflictDoUpdate({
        target: tournaments.id,
        set: {
          name: data.name,
          startsAt: data.startsAt,
          timezone: data.timezone,
          refreshTtlSeconds: data.refreshTtlSeconds,
        },
      });
  }

  async getPlayers() {
    return db.select().from(players).where(eq(players.active, true));
  }

  async getPlayerByRiotId(riotId: string) {
    const result = await db.select().from(players).where(eq(players.riotId, riotId)).limit(1);
    return result[0] || null;
  }

  async upsertPlayer(player: {
    riotId: string;
    platform: string;
    gameName: string;
    tagLine: string;
    puuid: string;
    accountCluster: string;
    profileIconId: number;
  }) {
    const existing = await this.getPlayerByRiotId(player.riotId);
    if (existing) {
      await db
        .update(players)
        .set({
          gameName: player.gameName,
          tagLine: player.tagLine,
          puuid: player.puuid,
          accountCluster: player.accountCluster,
          profileIconId: player.profileIconId,
          active: true,
          errorCategory: null,
        })
        .where(eq(players.id, existing.id));
      return existing.id;
    } else {
      const result = await db
        .insert(players)
        .values({
          riotId: player.riotId,
          platform: player.platform,
          gameName: player.gameName,
          tagLine: player.tagLine,
          puuid: player.puuid,
          accountCluster: player.accountCluster,
          profileIconId: player.profileIconId,
          active: true,
        })
        .returning({ id: players.id });
      return result[0].id;
    }
  }

  async saveRankSnapshot(data: {
    playerId: string;
    observedAt: Date;
    rank: Rank;
    seasonWins: number;
    seasonLosses: number;
    profileIconId: number;
  }) {
    await db.insert(rankSnapshots).values({
      playerId: data.playerId,
      observedAt: data.observedAt,
      tier: data.rank.tier,
      division: data.rank.division,
      leaguePoints: data.rank.leaguePoints,
      seasonWins: data.seasonWins,
      seasonLosses: data.seasonLosses,
      profileIconId: data.profileIconId,
    });
  }

  async getLatestRankSnapshot(playerId: string) {
    const result = await db
      .select()
      .from(rankSnapshots)
      .where(eq(rankSnapshots.playerId, playerId))
      .orderBy(desc(rankSnapshots.observedAt))
      .limit(1);
    return result[0] || null;
  }

  async getMatches(playerId: string, limit: number) {
    return db
      .select()
      .from(playerMatches)
      .where(eq(playerMatches.playerId, playerId))
      .orderBy(desc(playerMatches.playedAt))
      .limit(limit);
  }

  async saveMatches(
    playerId: string,
    matches: Array<{
      matchId: string;
      playedAt: Date;
      queueId: number;
      championName: string;
      win: boolean;
      kills: number;
      deaths: number;
      assists: number;
      durationSeconds: number;
    }>
  ) {
    if (matches.length === 0) return;
    await db
      .insert(playerMatches)
      .values(matches.map((m) => ({ ...m, playerId })))
      .onConflictDoNothing();
  }
}