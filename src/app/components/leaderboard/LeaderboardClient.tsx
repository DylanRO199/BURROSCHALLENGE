'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { LeaderboardDto } from '@/domain/leaderboard';
import { LeaderboardTable } from './LeaderboardTable';
import { StatusBanner } from './StatusBanner';
import { VisitorCounter } from '../VisitorCounter';
import { LiveBadge } from './LiveBadge';
import { Countdown } from './Countdown';

// ─── Types ───────────────────────────────────────────────────────────────────

type TierKey = 'S' | 'A' | 'B' | 'C' | 'D';
type TierState = Record<TierKey, string[]>; // riotId[]

const TIERS: TierKey[] = ['S', 'A', 'B', 'C', 'D'];
const TIER_COLORS: Record<TierKey, string> = {
  S: '#e5a020',
  A: '#5ba85a',
  B: '#4b91d9',
  C: '#8a5fc9',
  D: '#c05050',
};

const STORAGE_KEY = 'bq_tierlist_v1';

function emptyTierState(): TierState {
  return { S: [], A: [], B: [], C: [], D: [] };
}

function loadTierState(): TierState {
  if (typeof window === 'undefined') return emptyTierState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyTierState();
    const parsed = JSON.parse(raw) as TierState;
    // Validate shape
    for (const k of TIERS) {
      if (!Array.isArray(parsed[k])) return emptyTierState();
    }
    return parsed;
  } catch {
    return emptyTierState();
  }
}

function saveTierState(state: TierState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getRankIconUrl(tier: string) {
  if (!tier || tier === 'UNRANKED') {
    return 'https://opgg-static.akamaized.net/images/medals/default.png';
  }
  return `https://opgg-static.akamaized.net/images/medals_new/${tier.toLowerCase()}.png`;
}

// ─── PlayerCard (draggable) ───────────────────────────────────────────────────

function PlayerCard({
  player,
  mini = false,
}: {
  player: LeaderboardDto['players'][0];
  mini?: boolean;
}) {
  const [name] = player.riotId.split('#');
  return (
    <div className={`tl-player-card${mini ? ' tl-mini' : ''}`}>
      {player.profileIconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={player.profileIconUrl} alt="" className="tl-avatar" />
      ) : (
        <span className="tl-avatar-placeholder">{name.charAt(0).toUpperCase()}</span>
      )}
      {!mini && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getRankIconUrl(player.rank.tier)}
            alt={player.rank.tier}
            className="tl-rank-icon"
          />
          <div className="tl-player-info">
            <span className="tl-player-name">{name}</span>
            <span className="tl-player-lp">{player.rank.leaguePoints} LP</span>
          </div>
        </>
      )}
      {mini && <span className="tl-mini-name">{name}</span>}
    </div>
  );
}

// ─── TierListBuilder ──────────────────────────────────────────────────────────

function TierListBuilder({ players }: { players: LeaderboardDto['players'] }) {
  const [tiers, setTiers] = useState<TierState>(emptyTierState);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<TierKey | 'pool' | null>(null);
  const hydrated = useRef(false);

  // Load from localStorage after mount
  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      setTiers(loadTierState());
    }
  }, []);

  // Persist on change
  useEffect(() => {
    if (hydrated.current) saveTierState(tiers);
  }, [tiers]);

  // Players not yet placed in any tier
  const allPlacedIds = new Set(TIERS.flatMap((t) => tiers[t]));
  const poolPlayers = players.filter((p) => !allPlacedIds.has(p.riotId));

  function findSource(id: string): TierKey | 'pool' {
    for (const t of TIERS) {
      if (tiers[t].includes(id)) return t;
    }
    return 'pool';
  }

  function movePlayer(id: string, dest: TierKey | 'pool') {
    const src = findSource(id);
    if (src === dest) return;

    setTiers((prev) => {
      const next = { ...prev };
      // Remove from source tier
      if (src !== 'pool') {
        next[src] = prev[src].filter((x) => x !== id);
      }
      // Add to dest tier
      if (dest !== 'pool') {
        next[dest] = [...prev[dest], id];
      }
      return next;
    });
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  }

  function handleDrop(e: React.DragEvent, dest: TierKey | 'pool') {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggingId;
    if (id) movePlayer(id, dest);
    setDraggingId(null);
    setDragOver(null);
  }

  function handleDragOver(e: React.DragEvent, zone: TierKey | 'pool') {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(zone);
  }

  function clearAll() {
    const empty = emptyTierState();
    setTiers(empty);
    saveTierState(empty);
  }

  return (
    <div className="tl-builder">
      {/* Pool */}
      <div
        className={`tl-pool${dragOver === 'pool' ? ' drag-over' : ''}`}
        onDrop={(e) => handleDrop(e, 'pool')}
        onDragOver={(e) => handleDragOver(e, 'pool')}
        onDragLeave={() => setDragOver(null)}
      >
        <div className="tl-pool-header">
          <span className="tl-pool-label">🎮 Jugadores</span>
          <span className="tl-pool-hint">Arrastra a un tier ↓</span>
          <button className="tl-clear-btn" onClick={clearAll} title="Restablecer todo">
            ↺ Resetear
          </button>
        </div>
        <div className="tl-pool-cards">
          {poolPlayers.length === 0 && (
            <span className="tl-pool-empty">Todos los jugadores están en un tier</span>
          )}
          {poolPlayers.map((p) => (
            <div
              key={p.riotId}
              draggable
              onDragStart={(e) => handleDragStart(e, p.riotId)}
              onDragEnd={() => setDraggingId(null)}
              className={`tl-draggable${draggingId === p.riotId ? ' dragging' : ''}`}
            >
              <PlayerCard player={p} />
            </div>
          ))}
        </div>
      </div>

      {/* Tier rows */}
      <div className="tl-rows">
        {TIERS.map((tier) => {
          const tierPlayers = tiers[tier]
            .map((id) => players.find((p) => p.riotId === id))
            .filter(Boolean) as LeaderboardDto['players'];

          return (
            <div
              key={tier}
              className={`tl-row${dragOver === tier ? ' drag-over' : ''}`}
              onDrop={(e) => handleDrop(e, tier)}
              onDragOver={(e) => handleDragOver(e, tier)}
              onDragLeave={() => setDragOver(null)}
            >
              <div className="tl-tier-label" style={{ background: TIER_COLORS[tier] }}>
                {tier}
              </div>
              <div className="tl-tier-content">
                {tierPlayers.length === 0 && (
                  <span className="tl-drop-hint">Suelta aquí</span>
                )}
                {tierPlayers.map((p) => (
                  <div
                    key={p.riotId}
                    draggable
                    onDragStart={(e) => handleDragStart(e, p.riotId)}
                    onDragEnd={() => setDraggingId(null)}
                    onDoubleClick={() => movePlayer(p.riotId, 'pool')}
                    className={`tl-draggable${draggingId === p.riotId ? ' dragging' : ''}`}
                    title="Doble clic para volver al pool"
                  >
                    <PlayerCard player={p} mini />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className="tl-tip">💡 Doble clic sobre un jugador en un tier para devolverlo al pool. Los tiers se guardan automáticamente.</p>
    </div>
  );
}




// ─── LeaderboardClient Component ─────────────────────────────────────────────

export function LeaderboardClient({
  initialData,
}: {
  initialData: LeaderboardDto;
}) {
  const [data, setData] = useState(initialData);
  const [refreshing, setRefreshing] = useState(false);
  const [positionChanges, setPositionChanges] = useState<Record<string, 'up' | 'down' | null>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'tierlist'>('leaderboard');
  
  const prevPlayersRef = useRef<LeaderboardDto['players']>(initialData.players);

  // Monitor position changes when data updates
  useEffect(() => {
    const prevPlayers = prevPlayersRef.current;
    if (!prevPlayers) {
      prevPlayersRef.current = data.players;
      return;
    }

    const changes: Record<string, 'up' | 'down'> = {};
    let hasChanges = false;

    for (const p of data.players) {
      const prevP = prevPlayers.find((x) => x.riotId === p.riotId);
      if (prevP) {
        if (p.position < prevP.position) {
          changes[p.riotId] = 'up';
          hasChanges = true;
        } else if (p.position > prevP.position) {
          changes[p.riotId] = 'down';
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      setPositionChanges(changes);
      const timer = setTimeout(() => {
        setPositionChanges({});
      }, 5000); // Keep visual animation for 5 seconds
      return () => clearTimeout(timer);
    }

    prevPlayersRef.current = data.players;
  }, [data.players]);

  const refresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    setMessage(null);

    setData((current) => ({
      ...current,
      refresh: { ...current.refresh, status: 'refreshing' },
    }));

    try {
      const refreshResponse = await fetch('/api/leaderboard/refresh', { method: 'POST' });
      if (!refreshResponse.ok) throw new Error('Falló la actualización');

      const leaderboardResponse = await fetch('/api/leaderboard', { cache: 'no-store' });
      if (!leaderboardResponse.ok) throw new Error('No se pudo obtener el leaderboard');

      const leaderboard = (await leaderboardResponse.json()) as LeaderboardDto;
      setData(leaderboard);
      setMessage(null);
    } catch (error) {
      console.error('ERROR durante la actualización:', error);
      setData((current) => ({
        ...current,
        refresh: { ...current.refresh, status: 'temporary_error' },
      }));
      setMessage('Error al actualizar');
    } finally {
      setRefreshing(false);
    }
  }, [refreshing]);

  // Real-time auto sync: silently run refresh() every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      void refresh();
    }, 15000);

    return () => clearInterval(interval);
  }, [refresh]);

  const updatedAt = data.refresh.lastSuccessfulAt
    ? new Intl.DateTimeFormat('es-CL', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'America/Santiago',
      }).format(new Date(data.refresh.lastSuccessfulAt))
    : 'Sin actualizar';

  return (
    <main className="lol-container">
      <StatusBanner
        status={data.refresh.status}
        lastSuccessfulAt={data.refresh.lastSuccessfulAt}
      />

      <header className="lol-header">
        <div className="eyebrow">✦ LEAGUE OF LEGENDS · LAS ✦</div>

        <div className="lol-crest">
          <svg viewBox="0 0 100 100" className="lol-crest-icon" aria-hidden="true">
            <path d="M50 5 L85 25 L85 75 L50 95 L15 75 L15 25 Z" fill="none" stroke="currentColor" strokeWidth="3" />
            <path d="M50 15 L75 30 L75 70 L50 85 L25 70 L25 30 Z" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
            <polygon points="50,25 65,50 50,75 35,50" fill="currentColor" opacity="0.8" />
          </svg>
        </div>

        <div className="region">RANKED SOLO / DUO · TEMPORADA 2026</div>

        <h1 className="lol-title">{data.tournament.name}</h1>

        <div className="lol-divider">
          <span className="divider-line"></span>
          <span className="divider-gem">◆</span>
          <span className="divider-line"></span>
        </div>

        <p className="subtitle">
          Tabla de clasificación oficial. El invocador con más puntos dominará la Grieta.
        </p>

        <Countdown endsAt={data.tournament.endsAt} />

        <div className="toolbar">
          <span className="last-update">Última actualización: {updatedAt}</span>
          <div className="toolbar-actions">
            <a href="/estadisticas" className="lol-btn lol-btn-ghost" style={{ textDecoration: 'none' }}>
              📊 Estadísticas
            </a>
            <button className="lol-btn" onClick={() => void refresh()} disabled={refreshing}>
              {refreshing ? 'Actualizando...' : 'Actualizar ranking'}
            </button>
          </div>
        </div>

        {message && <p className="lol-error-msg">{message}</p>}
      </header>

      {data.players.length > 0 && (
        <div className="podium-section">
          <div className="podium-cards-grid">
            {data.players.slice(0, 3).map((player) => {
              const [name, tag] = player.riotId.split('#');
              const rWins = player.stats.wins;
              const rLosses = player.stats.losses;

              let animClass = '';
              if (positionChanges[player.riotId] === 'up') {
                animClass = 'animate-rank-up';
              } else if (positionChanges[player.riotId] === 'down') {
                animClass = 'animate-rank-down';
              }

              let podiumCls = '';
              let badgeIcon = '';
              if (player.position === 1) { podiumCls = 'first-place'; badgeIcon = '👑'; }
              else if (player.position === 2) { podiumCls = 'second-place'; badgeIcon = '🥈'; }
              else if (player.position === 3) { podiumCls = 'third-place'; badgeIcon = '🥉'; }

              return (
                <div key={player.riotId} className={`podium-card ${podiumCls} ${animClass}`}>
                  <div className="podium-card-header">
                    <span className="podium-badge">{badgeIcon}</span>
                    <div className="podium-player-info">
                      <div className="podium-avatar-wrapper">
                        {player.profileIconUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={player.profileIconUrl} alt="" className="podium-avatar" />
                        ) : (
                          <span className="podium-avatar-placeholder">{name.charAt(0).toUpperCase()}</span>
                        )}
                        <span className={`status-badge ${player.isOnline ? 'online' : 'offline'}`} />
                      </div>
                      <div className="podium-names">
                        <span className="podium-name">{name}</span>
                        <span className="podium-tag">#{tag || 'LAS'}</span>
                        <LiveBadge isOnline={player.isOnline} activeGameStartTime={player.activeGameStartTime} riotId={player.riotId} />
                      </div>
                    </div>
                    <span className="podium-role-icon">
                      <svg viewBox="0 0 24 24" className="role-svg">
                        <path d="M12 2L2 22h20L12 2zm0 3.99L18.49 19H5.51L12 5.99z" fill="currentColor" />
                      </svg>
                    </span>
                  </div>
                  <div className="podium-card-body">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={getRankIconUrl(player.rank.tier)} alt={player.rank.tier} className="podium-emblem" />
                    <div className="podium-lp-display">
                      <span className="podium-lp-value">{player.rank.leaguePoints}</span>
                      <span className="podium-lp-label">LP</span>
                    </div>
                  </div>
                  <div className="podium-card-footer">
                    <div className="podium-stat-col">
                      <span className="stat-val">{rWins}W {rLosses}L</span>
                      <span className="stat-lbl">{rWins + rLosses} partidas</span>
                    </div>
                    <div className="podium-stat-col">
                      <span className="stat-val">{player.stats.winRate}%</span>
                      <span className="stat-lbl">Winrate</span>
                    </div>
                    <div className="podium-stat-col">
                      <span className="stat-val">{player.stats.kda.toFixed(2)}</span>
                      <span className="stat-lbl">KDA</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab switcher */}
      <div className="tab-switcher">
        <button
          className={`tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaderboard')}
        >
          ⚔ Clasificación
        </button>
        <button
          className={`tab-btn ${activeTab === 'tierlist' ? 'active' : ''}`}
          onClick={() => setActiveTab('tierlist')}
        >
          🏆 Tier List
        </button>
      </div>

      {activeTab === 'leaderboard' && (
        <section>
          <div className="section-title">
            <h2>CLASIFICACIÓN</h2>
            <span>{data.players.length} participantes</span>
          </div>
          <LeaderboardTable players={data.players} />
        </section>
      )}

      {activeTab === 'tierlist' && (
        <section>
          <div className="section-title">
            <h2>TIER LIST</h2>
            <span>Arrastra los jugadores a cada tier</span>
          </div>
          <TierListBuilder players={data.players} />
        </section>
      )}

      <VisitorCounter />
    </main>
  );
}