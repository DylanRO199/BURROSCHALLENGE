import 'server-only';
import { DrizzleLeaderboardRepository } from '@/server/db/repository';
import { invalidateLeaderboardCache } from '@/server/runtime';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { riotId, hasBlueShell } = await request.json();

    if (!riotId || typeof hasBlueShell !== 'boolean') {
      return NextResponse.json(
        { error: 'Parámetros inválidos. Se requiere "riotId" y "hasBlueShell".' },
        { status: 400 }
      );
    }

    const repository = new DrizzleLeaderboardRepository();
    await repository.updatePlayerBlueShell(riotId, hasBlueShell);

    // Invalida la caché del ranking para mostrar el cambio al instante
    invalidateLeaderboardCache();

    console.log(`🐚 Blue Shell status updated for ${riotId} -> ${hasBlueShell}`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('POST /api/players/blue-shell failed:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
