import { DrizzleLeaderboardRepository } from '@/server/db/repository';
import { RiotClient } from '@/server/riot/client';
import { readServerEnv } from '@/server/env';
import { parseRiotId } from '@/domain/riot-id';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { riotId, platform = 'la2' } = await request.json();

    if (!riotId || typeof riotId !== 'string' || !riotId.includes('#')) {
      return NextResponse.json(
        { error: 'Formato de Riot ID inválido. Debe ser Nombre#TAG.' },
        { status: 400 }
      );
    }

    const { gameName, tagLine } = parseRiotId(riotId);
    const repository = new DrizzleLeaderboardRepository();
    const riot = new RiotClient({
      apiKey: readServerEnv().RIOT_API_KEY,
    });

    // 1. Verify Riot Account
    let account;
    try {
      account = await riot.getAccountByRiotId(riotId);
    } catch (e) {
      console.error(`Riot ID not found: ${riotId}`, e);
      return NextResponse.json(
        { error: `No se encontró la cuenta de Riot para ${riotId}` },
        { status: 404 }
      );
    }

    const puuid = account.puuid;

    // 2. Add player to DB
    const playerId = await repository.upsertPlayer({
      riotId,
      platform,
      gameName,
      tagLine,
      puuid,
      summonerId: '',
      accountCluster: 'americas',
      profileIconId: 0,
    });

    return NextResponse.json({ success: true, playerId });
  } catch (error: any) {
    console.error('POST /api/players/add failed:', error);
    return NextResponse.json(
      { error: error?.message || 'Error interno al agregar el jugador.' },
      { status: 500 }
    );
  }
}
