import { getLeaderboard } from '@/server/runtime';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─── In-process memory cache ─────────────────────────────────────────────────
// Caches the leaderboard response for 10 seconds in the serverless instance.
// This prevents every frontend poll from hitting the DB directly.
let cachedData: any = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 10_000; // 10 seconds

export async function GET() {
  try {
    const now = Date.now();

    // Serve from cache if still fresh
    if (cachedData && now < cacheExpiry) {
      return NextResponse.json(cachedData, {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
          'X-Cache': 'HIT',
        },
      });
    }

    // Cache miss — fetch from DB and store
    const data = await getLeaderboard();
    cachedData = data;
    cacheExpiry = now + CACHE_TTL_MS;

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error('GET /api/leaderboard failed:', error);
    return NextResponse.json(
      { error: 'No se pudo cargar la clasificación.' },
      { status: 500 }
    );
  }
}
