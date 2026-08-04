import { LeaderboardClient } from '@/app/components/leaderboard/LeaderboardClient';
import { getLeaderboard } from '@/server/runtime';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function HomePage() {
  const { data } = await getLeaderboard();
  return <LeaderboardClient initialData={data} />;
}
