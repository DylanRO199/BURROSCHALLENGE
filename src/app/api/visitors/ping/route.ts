import { upsertVisitor } from '@/server/db/visitors';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId } = body as { sessionId?: string };

    if (!sessionId || typeof sessionId !== 'string' || sessionId.length < 8) {
      return NextResponse.json({ error: 'sessionId inválido' }, { status: 400 });
    }

    const stats = await upsertVisitor(sessionId);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('POST /api/visitors/ping failed:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
