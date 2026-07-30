import { runRefresh } from '@/server/runtime';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const result = await runRefresh();
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('POST /api/leaderboard/refresh failed:', error);
    return NextResponse.json(
      { success: false, error: 'No se pudieron actualizar los datos de Riot.' },
      { status: 502 }
    );
  }
}
