import { runRefresh } from '@/server/runtime';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const result = await runRefresh();

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });

  } catch (error) {

    console.error('POST /api/refresh failed:', error);

    return NextResponse.json(
      {
        error: 'No se pudo actualizar el ranking.'
      },
      {
        status: 500
      }
    );

  }
}