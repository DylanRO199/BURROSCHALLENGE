import { DrizzleLeaderboardRepository } from '@/server/db/repository';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { riotId } = body as { riotId?: string };

    if (!riotId || typeof riotId !== 'string') {
      return NextResponse.json({ error: 'riotId es requerido' }, { status: 400 });
    }

    const repository = new DrizzleLeaderboardRepository();
    const player = await repository.getPlayerByRiotId(riotId);

    if (!player) {
      return NextResponse.json({ error: 'Jugador no encontrado' }, { status: 404 });
    }

    await repository.deactivatePlayer(riotId);

    return NextResponse.json({ success: true, message: `${riotId} eliminado del torneo.` });
  } catch (error) {
    console.error('POST /api/players/remove failed:', error);
    return NextResponse.json({ error: 'Error al eliminar el jugador.' }, { status: 500 });
  }
}
