'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { LeaderboardDto } from '@/domain/leaderboard';
import { LeaderboardTable } from './LeaderboardTable';
import { StatusBanner } from './StatusBanner';

export function LeaderboardClient({
  initialData,
}: {
  initialData: LeaderboardDto;
}) {
  const [data, setData] = useState(initialData);
  const [refreshing, setRefreshing] = useState(false);
  const autoRefreshStarted = useRef(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    console.log('==========================');
    console.log('Refresh iniciado');

    if (refreshing) {
      console.log('Ya hay una actualización en progreso');
      return;
    }

    setRefreshing(true);
    setMessage('Actualizando ranking...');

    setData((current) => ({
      ...current,
      refresh: {
        ...current.refresh,
        status: 'refreshing',
      },
    }));

    try {
      console.log('POST /api/leaderboard/refresh');

      const refreshResponse = await fetch('/api/leaderboard/refresh', {
        method: 'POST',
      });

      console.log('Status Refresh:', refreshResponse.status);

      const refreshBody = await refreshResponse.text();
      console.log('Respuesta Refresh:', refreshBody);

      if (!refreshResponse.ok) {
        throw new Error('Falló la actualización');
      }

      console.log('GET /api/leaderboard');

      const leaderboardResponse = await fetch('/api/leaderboard', {
        cache: 'no-store',
      });

      console.log('Status Leaderboard:', leaderboardResponse.status);

      if (!leaderboardResponse.ok) {
        throw new Error('No se pudo obtener el leaderboard');
      }

      const leaderboard =
        (await leaderboardResponse.json()) as LeaderboardDto;

      console.log('Leaderboard recibido:', leaderboard);

      setData(leaderboard);

      setMessage('✅ Ranking actualizado correctamente');
    } catch (error) {
      console.error('ERROR:', error);

      setData((current) => ({
        ...current,
        refresh: {
          ...current.refresh,
          status: 'temporary_error',
        },
      }));

      setMessage('❌ Error al actualizar');
    } finally {
      setRefreshing(false);
      console.log('Refresh finalizado');
      console.log('==========================');
    }
  }, [refreshing]);

  useEffect(() => {
    if (data.refresh.stale && !autoRefreshStarted.current) {
      autoRefreshStarted.current = true;
      void refresh();
    }
  }, [data.refresh.stale, refresh]);

  const updatedAt = data.refresh.lastSuccessfulAt
    ? new Intl.DateTimeFormat('es-CL', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'America/Santiago',
      }).format(new Date(data.refresh.lastSuccessfulAt))
    : 'Sin actualizar';

  return (
    <main>
      <StatusBanner
        status={data.refresh.status}
        lastSuccessfulAt={data.refresh.lastSuccessfulAt}
      />

      <header>
        <div className="eyebrow">✦ TEMPORADA 2026 ✦</div>

        <span className="crown">♛</span>

        <div className="region">
          LAS · RANKED SOLO/DUO
        </div>

        <h1>{data.tournament.name}</h1>

        <p className="subtitle">
          Sube todo lo que puedas. El rango más alto se queda con la cima.
        </p>

        <div className="toolbar">
          <span>
            Última actualización: {updatedAt}
          </span>

          <button
            onClick={() => {
              console.log('CLICK EN BOTÓN');
              void refresh();
            }}
            disabled={refreshing}
          >
            {refreshing
              ? '🔄 Actualizando...'
              : '🔄 Actualizar ranking'}
          </button>
        </div>

        {message && (
          <p
            style={{
              marginTop: '10px',
              fontWeight: 'bold',
            }}
          >
            {message}
          </p>
        )}
      </header>

      <section>
        <div className="section-title">
          <h2>CLASIFICACIÓN</h2>
          <span>{data.players.length} participantes</span>
        </div>

        <LeaderboardTable players={data.players} />
      </section>
    </main>
  );
}