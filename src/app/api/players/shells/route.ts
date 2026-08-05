import 'server-only';
import { DrizzleLeaderboardRepository } from '@/server/db/repository';
import { invalidateLeaderboardCache } from '@/server/runtime';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { riotId, blueShellCount, shieldHours, punishments } = body;

    if (!riotId) {
      return NextResponse.json(
        { error: 'Parámetro "riotId" es obligatorio.' },
        { status: 400 }
      );
    }

    const updateData: {
      hasBlueShell?: boolean;
      blueShellCount?: number;
      shieldExpiresAt?: Date | null;
      activePunishments?: string;
    } = {};

    if (typeof blueShellCount === 'number') {
      updateData.blueShellCount = blueShellCount;
      updateData.hasBlueShell = blueShellCount > 0;
    }

    if (shieldHours !== undefined) {
      if (shieldHours === null || shieldHours <= 0) {
        updateData.shieldExpiresAt = null;
      } else {
        const expires = new Date();
        expires.setHours(expires.getHours() + shieldHours);
        updateData.shieldExpiresAt = expires;
      }
    }

    if (punishments !== undefined) {
      if (Array.isArray(punishments)) {
        // Validar formato
        const validated = punishments.map((p: any) => ({
          id: String(p.id),
          gamesLeft: typeof p.gamesLeft === 'number' ? p.gamesLeft : 1,
        }));
        updateData.activePunishments = JSON.stringify(validated);
      } else if (punishments === null) {
        updateData.activePunishments = '[]';
      }
    }

    const repository = new DrizzleLeaderboardRepository();
    await repository.updatePlayerShellsAndPunishments(riotId, updateData);

    // Invalida la caché para reflejar el cambio de inmediato
    invalidateLeaderboardCache();

    console.log(`🐚 Shells & Punishments updated for ${riotId}:`, updateData);
    return NextResponse.json({ success: true, updated: updateData });
  } catch (error: any) {
    console.error('POST /api/players/shells failed:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
