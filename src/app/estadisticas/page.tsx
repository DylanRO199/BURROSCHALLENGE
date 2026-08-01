import { StatsClient } from '@/app/components/stats/StatsClient';
import { getLeaderboard, getChampionStats } from '@/server/runtime';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function EstadisticasPage() {
  const leaderboard = await getLeaderboard();
  const champions = await getChampionStats();

  return (
    <StatsClient
      leaderboard={leaderboard}
      champions={champions as any[]}
    />
  );
}
