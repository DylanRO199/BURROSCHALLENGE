import 'server-only';
import { loadConfig } from '@/server/config';
import { DrizzleLeaderboardRepository } from '@/server/db/repository';
import { readServerEnv } from '@/server/env';
import { createLeaderboardService } from '@/server/leaderboard/service';
import { createRefreshCoordinator } from '@/server/refresh/coordinator';
import { getDataDragonVersion } from '@/server/riot/assets';
import { RiotClient } from '@/server/riot/client';

// ─── Shared Server-side Cache ────────────────────────────────────────────────
let cachedData: any = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 10_000; // 10 seconds

export function invalidateLeaderboardCache() {
  cachedData = null;
  cacheExpiry = 0;
  console.log('🧹 Leaderboard cache invalidated.');
}

export async function getLeaderboard(forceRefresh = false) {
  const nowTime = Date.now();
  if (!forceRefresh && cachedData && nowTime < cacheExpiry) {
    return { data: cachedData, fromCache: true };
  }

  const config = loadConfig();
  const repository = new DrizzleLeaderboardRepository();
  await repository.ensureTournament({
    id: 'soloq-challenge',
    name: config.tournament.name,
    startsAt: config.tournament.startsAt ? new Date(config.tournament.startsAt) : null,
    endsAt: config.tournament.endsAt ? new Date(config.tournament.endsAt) : null,
    timezone: config.tournament.timezone,
    refreshTtlSeconds: config.tournament.refreshTtlSeconds,
  });
  
  const freshData = await createLeaderboardService({
    repository,
    config: config.tournament,
    now: () => new Date(),
    getIconVersion: () => getDataDragonVersion(),
  }).getLeaderboard();

  cachedData = freshData;
  cacheExpiry = nowTime + CACHE_TTL_MS;

  return { data: freshData, fromCache: false };
}


export async function runRefresh() {
  const config = loadConfig();
  const repository = new DrizzleLeaderboardRepository();
  await repository.ensureTournament({
    id: 'soloq-challenge',
    name: config.tournament.name,
    startsAt: config.tournament.startsAt ? new Date(config.tournament.startsAt) : null,
    endsAt: config.tournament.endsAt ? new Date(config.tournament.endsAt) : null,
    timezone: config.tournament.timezone,
    refreshTtlSeconds: config.tournament.refreshTtlSeconds,
  });
  const riot = new RiotClient({
    apiKey: readServerEnv().RIOT_API_KEY,
  });
  return createRefreshCoordinator({
    repository,
    riot,
    now: () => new Date(),
    players: config.players,
    startsAt: config.tournament.startsAt ? new Date(config.tournament.startsAt) : null,
    endsAt: config.tournament.endsAt ? new Date(config.tournament.endsAt) : null,
    refreshTtlSeconds: config.tournament.refreshTtlSeconds,
  }).refresh();
}

export async function getChampionStats() {
  const repository = new DrizzleLeaderboardRepository();
  return repository.getChampionStats();
}