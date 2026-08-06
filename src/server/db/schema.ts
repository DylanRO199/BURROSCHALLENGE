import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const refreshStatusValues = [
  'idle',
  'refreshing',
  'temporary_error',
  'riot_api_key_invalid',
] as const;
export type RefreshStatus = (typeof refreshStatusValues)[number];
export const refreshStatusEnum = pgEnum('refresh_status', refreshStatusValues);

export const tournaments = pgTable('tournaments', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  startsAt: timestamp('starts_at', { withTimezone: true, mode: 'date' }),
  endsAt: timestamp('ends_at', { withTimezone: true, mode: 'date' }),
  timezone: text('timezone').notNull(),
  refreshTtlSeconds: integer('refresh_ttl_seconds').notNull(),
  lastAttemptedAt: timestamp('last_attempted_at', { withTimezone: true, mode: 'date' }),
  lastSuccessfulAt: timestamp('last_successful_at', { withTimezone: true, mode: 'date' }),
  lastSpectatorAttemptedAt: timestamp('last_spectator_attempted_at', { withTimezone: true, mode: 'date' }),
  lastRankAttemptedAt: timestamp('last_rank_attempted_at', { withTimezone: true, mode: 'date' }),
  refreshStatus: refreshStatusEnum('refresh_status').notNull().default('idle'),
});

export const players = pgTable(
  'players',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    riotId: text('riot_id').notNull(),
    platform: text('platform').notNull(),
    gameName: text('game_name'),
    tagLine: text('tag_line'),
    puuid: text('puuid'),
    summonerId: text('summoner_id'),
    accountCluster: text('account_cluster'),
    profileIconId: integer('profile_icon_id'),
    active: boolean('active').notNull().default(true),
    errorCategory: text('error_category'),
    isOnline: boolean('is_online').notNull().default(false),
    activeGameStartTime: timestamp('active_game_start_time', { withTimezone: true, mode: 'date' }),
    activeGameQueueId: integer('active_game_queue_id'),
    hasBlueShell: boolean('has_blue_shell').notNull().default(false),
    blueShellCount: integer('blue_shell_count').notNull().default(0),
    shieldExpiresAt: timestamp('shield_expires_at', { withTimezone: true, mode: 'date' }),
    activePunishments: text('active_punishments').default('[]'),
    lastRefreshedAt: timestamp('last_refreshed_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => [uniqueIndex('players_riot_id_unique').on(table.riotId)]
);


export const rankSnapshots = pgTable(
  'rank_snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    playerId: uuid('player_id').notNull().references(() => players.id, { onDelete: 'cascade' }),
    observedAt: timestamp('observed_at', { withTimezone: true, mode: 'date' }).notNull(),
    tier: text('tier').notNull(),
    division: text('division'),
    leaguePoints: integer('league_points').notNull(),
    seasonWins: integer('season_wins').notNull(),
    seasonLosses: integer('season_losses').notNull(),
    profileIconId: integer('profile_icon_id').notNull(),
  },
  (table) => [index('rank_snapshots_player_observed_idx').on(table.playerId, table.observedAt)]
);

export const playerMatches = pgTable(
  'player_matches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    playerId: uuid('player_id').notNull().references(() => players.id, { onDelete: 'cascade' }),
    matchId: text('match_id').notNull(),
    playedAt: timestamp('played_at', { withTimezone: true, mode: 'date' }).notNull(),
    queueId: integer('queue_id').notNull(),
    championName: text('champion_name').notNull(),
    lane: text('lane'),
    win: boolean('win'),
    kills: integer('kills').notNull(),
    deaths: integer('deaths').notNull(),
    assists: integer('assists').notNull(),
    durationSeconds: integer('duration_seconds').notNull(),
  },
  (table) => [
    uniqueIndex('player_matches_player_match_unique').on(table.playerId, table.matchId),
    index('player_matches_player_played_idx').on(table.playerId, table.playedAt),
  ]
);

export const refreshLeases = pgTable('refresh_leases', {
  id: text('id').primaryKey(),
  leaseUntil: timestamp('lease_until', { withTimezone: true, mode: 'date' }).notNull(),
});

export const visitors = pgTable(
  'visitors',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: text('session_id').notNull(),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true, mode: 'date' }).notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (table) => [uniqueIndex('visitors_session_id_unique').on(table.sessionId)]
);