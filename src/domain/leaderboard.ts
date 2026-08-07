import type { Rank, TournamentStatistics } from './types';

export type PublicRefreshStatus =
  | 'idle'
  | 'refreshing'
  | 'temporary_error'
  | 'riot_api_key_invalid';

export type LeaderboardDto = {
  tournament: {
    name: string;
    startsAt: string | null;
    endsAt: string | null;
  };
  refresh: {
    status: PublicRefreshStatus;
    lastSuccessfulAt: string | null;
    stale: boolean;
  };
  iconVersion: string;
  players: Array<{
    position: number;
    positionChange: number;
    riotId: string;
    profileIconUrl: string | null;
    rank: Rank;
    stats: TournamentStatistics;
    error: 'account_not_found' | null;
    isOnline: boolean;
    activeGameStartTime: string | null;
    activeGameQueueId: number | null;
    hasBlueShell: boolean;
    blueShellCount: number;
    shieldHoursLeft: number | null;
    punishments: Array<{ id: string; gamesLeft: number }>;
  }>;
};