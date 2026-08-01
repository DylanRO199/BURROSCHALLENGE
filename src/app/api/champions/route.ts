import { getChampionStats } from '@/server/runtime';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stats = await getChampionStats();
    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('GET /api/champions failed:', error);
    return NextResponse.json(
      { error: 'No se pudieron cargar las estadísticas de campeones.' },
      { status: 500 }
    );
  }
}
