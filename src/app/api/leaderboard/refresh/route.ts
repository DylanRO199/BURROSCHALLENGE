import { runRefresh } from '@/server/runtime';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const result = await runRefresh();
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    const rawKey = process.env.RIOT_API_KEY || '';
    console.error('POST /api/leaderboard/refresh failed:', error);
    console.warn('DIAGNOSTICO RIOT_API_KEY:', {
      length: rawKey.length,
      startsWithQuote: rawKey.startsWith('"') || rawKey.startsWith("'"),
      endsWithQuote: rawKey.endsWith('"') || rawKey.endsWith("'"),
      hasWhitespace: /\s/.test(rawKey),
      firstChars: rawKey.substring(0, 8),
    });
    return NextResponse.json(
      { success: false, error: 'No se pudieron actualizar los datos de Riot.' },
      { status: 502 }
    );
  }
}
