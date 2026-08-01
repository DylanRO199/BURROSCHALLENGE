export type Tier =
  | 'CHALLENGER'
  | 'GRANDMASTER'
  | 'MASTER'
  | 'DIAMOND'
  | 'EMERALD'
  | 'PLATINUM'
  | 'GOLD'
  | 'SILVER'
  | 'BRONZE'
  | 'IRON'
  | 'UNRANKED';

export type Division = 'I' | 'II' | 'III' | 'IV' | null;

export type Rank = {
  tier: Tier;
  division: Division;
  leaguePoints: number;
};

export type MatchFact = {
  matchId: string;
  playedAt: Date;
  queueId: number;
  championName: string;
  win: boolean | null;
  kills: number;
  deaths: number;
  assists: number;
  durationSeconds: number;
};

export type RecentMatchResult = {
  result: 'W' | 'L' | 'R';
  championName?: string;
  kills?: number;
  deaths?: number;
  assists?: number;
};

export type TournamentStatistics = {
  games: number;
  wins: number;
  losses: number;
  winRate: number;
  streak: number;
  streakType: 'W' | 'L' | null;
  kda: number;
  averageKills: number;
  averageDeaths: number;
  averageAssists: number;
  recentResults: Array<RecentMatchResult | 'W' | 'L'>;
  topChampions: Array<{ name: string; games: number }>;
  topLane: string | null;
  seasonWins?: number;
  seasonLosses?: number;
  dailyGainedLp?: number;
  dailyLostLp?: number;
};