import 'server-only';
import { and, desc, asc, eq, gt, gte, lt, inArray, isNotNull, sql } from 'drizzle-orm';
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
      challengerCutoff?: number;
      grandmasterCutoff?: number;
      lastCutoffFetchedAt?: Date;
    }
  ) {
    await db.update(tournaments).set(data).where(eq(tournaments.id, id));
  }

  async updateTournamentSpectatorTime(id: string, date: Date) {
    await db.update(tournaments).set({ lastSpectatorAttemptedAt: date }).where(eq(tournaments.id, id));
  }

  async updateTournamentRankTime(id: string, date: Date) {
    await db.update(tournaments).set({ lastRankAttemptedAt: date }).where(eq(tournaments.id, id));
  }

  async ensureTournament(data: {
    id: string;
    name: string;
    startsAt: Date | null;
    endsAt: Date | null;
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
          endsAt: data.endsAt,
          timezone: data.timezone,
          refreshTtlSeconds: data.refreshTtlSeconds,
        },
      });
  }

  async getPlayers() {
    return db.select().from(players).where(eq(players.active, true));
  }

  async getPlayersSortedByLastRefreshed() {
    // NULLS FIRST ensures players who have never been refreshed are always
    // picked before players who were recently refreshed.
    return db
      .select()
      .from(players)
      .where(eq(players.active, true))
      .orderBy(sql`${players.lastRefreshedAt} ASC NULLS FIRST`);
  }

  async getPlayerByRiotId(riotId: string) {
    const result = await db.select().from(players).where(eq(players.riotId, riotId)).limit(1);
    return result[0] || null;
  }

  async deactivatePlayer(riotId: string) {
    await db
      .update(players)
      .set({ active: false })
      .where(eq(players.riotId, riotId));
  }

  async upsertPlayer(player: {
    riotId: string;
    platform: string;
    gameName: string;
    tagLine: string;
    puuid: string;
    summonerId: string;
    accountCluster: string;
    profileIconId: number;
    lastRefreshedAt?: Date;
  }): Promise<string> {
    const existing = await this.getPlayerByRiotId(player.riotId);
    if (existing) {
      await db
        .update(players)
        .set({
          gameName: player.gameName,
          tagLine: player.tagLine,
          puuid: player.puuid,
          summonerId: player.summonerId,
          accountCluster: player.accountCluster,
          profileIconId: player.profileIconId,
          active: true,
          errorCategory: null,
          ...(player.lastRefreshedAt ? { lastRefreshedAt: player.lastRefreshedAt } : {}),
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
          summonerId: player.summonerId,
          accountCluster: player.accountCluster,
          profileIconId: player.profileIconId,
          active: true,
          ...(player.lastRefreshedAt ? { lastRefreshedAt: player.lastRefreshedAt } : {}),
        })
        .returning({ id: players.id });
      return result[0].id;
    }
  }

  async updatePlayerOnlineStatus(
    playerId: string,
    isOnline: boolean,
    activeGameStartTime?: Date | null,
    activeGameQueueId?: number | null
  ) {
    await db
      .update(players)
      .set({
        isOnline,
        activeGameStartTime: activeGameStartTime ?? null,
        activeGameQueueId: activeGameQueueId ?? null,
      })
      .where(eq(players.id, playerId));
  }

  async updatePlayerServerRank(playerId: string, serverRank: number | null) {
    await db
      .update(players)
      .set({ serverRank })
      .where(eq(players.id, playerId));
  }

  async updatePlayerLastRefreshed(playerId: string, observedAt: Date) {
    await db
      .update(players)
      .set({ lastRefreshedAt: observedAt })
      .where(eq(players.id, playerId));
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

  async getRankSnapshots(playerId: string, limit: number) {
    return db
      .select()
      .from(rankSnapshots)
      .where(eq(rankSnapshots.playerId, playerId))
      .orderBy(desc(rankSnapshots.observedAt))
      .limit(limit);
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
      lane?: string | null;
      win: boolean | null;
      kills: number;
      deaths: number;
      assists: number;
      durationSeconds: number;
      item0?: number;
      item1?: number;
      item2?: number;
      item3?: number;
      item4?: number;
      item5?: number;
      item6?: number;
    }>
  ) {
    if (matches.length === 0) return;
    await db
      .insert(playerMatches)
      .values(matches.map((m) => ({ ...m, playerId })))
      .onConflictDoNothing();
  }

  async getChampionStats() {
    return db
      .select({
        championName: playerMatches.championName,
        games: sql<number>`count(*)::int`,
        wins: sql<number>`sum(case when ${playerMatches.win} = true then 1 else 0 end)::int`,
        losses: sql<number>`sum(case when ${playerMatches.win} = false then 1 else 0 end)::int`,
        kills: sql<number>`sum(${playerMatches.kills})::int`,
        deaths: sql<number>`sum(${playerMatches.deaths})::int`,
        assists: sql<number>`sum(${playerMatches.assists})::int`,
      })
      .from(playerMatches)
      .groupBy(playerMatches.championName)
      .orderBy(sql`count(*) desc`);
  }

  async getRankSnapshotsForDay(playerId: string, todayStart: Date) {
    const snapshotsToday = await db
      .select()
      .from(rankSnapshots)
      .where(
        and(
          eq(rankSnapshots.playerId, playerId),
          gte(rankSnapshots.observedAt, todayStart)
        )
      )
      .orderBy(asc(rankSnapshots.observedAt));

    const beforeToday = await db
      .select()
      .from(rankSnapshots)
      .where(
        and(
          eq(rankSnapshots.playerId, playerId),
          lt(rankSnapshots.observedAt, todayStart)
        )
      )
      .orderBy(desc(rankSnapshots.observedAt))
      .limit(1);

    return {
      snapshotsToday,
      lastSnapshotBeforeToday: beforeToday[0] || null,
    };
  }

  async updatePlayerBlueShell(riotId: string, hasBlueShell: boolean) {
    await db
      .update(players)
      .set({ hasBlueShell })
      .where(eq(players.riotId, riotId));
  }

  async updatePlayerShellsAndPunishments(
    riotId: string,
    data: {
      hasBlueShell?: boolean;
      blueShellCount?: number;
      shieldExpiresAt?: Date | null;
      activePunishments?: string;
    }
  ) {
    await db
      .update(players)
      .set(data)
      .where(eq(players.riotId, riotId));
  }
}