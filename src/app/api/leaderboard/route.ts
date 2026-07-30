import { getLeaderboard } from '@/server/runtime';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getLeaderboard();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error) {
    console.error('GET /api/leaderboard failed:', error);
    return NextResponse.json(
      { error: 'No se pudo cargar la clasificación.' },
      { status: 500 }
    );
  }
}
