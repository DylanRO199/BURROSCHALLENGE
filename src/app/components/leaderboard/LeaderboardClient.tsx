'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { LeaderboardDto } from '@/domain/leaderboard';
import { LeaderboardTable } from './LeaderboardTable';
import { StatusBanner } from './StatusBanner';
import Link from 'next/link';
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

const tierNames: Record<string, string> = {
  CHALLENGER: 'Challenger',
  GRANDMASTER: 'Grandmaster',
  MASTER: 'Master',
  DIAMOND: 'Diamante',
  EMERALD: 'Esmeralda',
  PLATINUM: 'Platino',
  GOLD: 'Oro',
  SILVER: 'Plata',
  BRONZE: 'Bronce',
  IRON: 'Hierro',
  UNRANKED: 'Sin clasificar',
};

function formatRank(rank: { tier: string; division: string | null }) {
  const tier = rank.tier.toUpperCase();
  const name = tierNames[tier] || rank.tier;
  if (!rank.division || tier === 'CHALLENGER' || tier === 'GRANDMASTER' || tier === 'MASTER' || tier === 'UNRANKED') {
    return name;
  }
  return `${name} ${rank.division}`;
}

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
  const [showShellInfo, setShowShellInfo] = useState(false);
  
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

  // ─── Polling Architecture ────────────────────────────────────────────────────
  // 4 independent loops, balanced to avoid exceeding Neon free tier quota.
  // Server-side 10s cache on /api/leaderboard means most polls hit cache, not DB.
  //  1. 30s  – DB read (hits server cache most of the time)
  //  2. 30s  – Spectator ping (live-game status for ALL players from Riot)
  //  3. 60s  – Rank LP ping (LP/tier/W/L from Riot for ALL players)
  //  4. 120s – Full refresh (match history, 3 players rotary)

  // 1. Fast DB read — no Riot API calls, just reads latest state from DB
  const pollRef = useRef(false);
  useEffect(() => {
    const interval = setInterval(async () => {
      if (pollRef.current) return;
      pollRef.current = true;
      try {
        const res = await fetch('/api/leaderboard', { cache: 'no-store' });
        if (res.ok) {
          const leaderboard = (await res.json()) as LeaderboardDto;
          setData(leaderboard);
        }
      } catch { /* silent */ } finally {
        pollRef.current = false;
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // 2. Spectator ping — checks live-game status for ALL players every 15s
  const spectatorRef = useRef(false);
  useEffect(() => {
    const interval = setInterval(async () => {
      if (spectatorRef.current) return;
      spectatorRef.current = true;
      try {
        await fetch('/api/leaderboard/spectator', { method: 'POST' });
        const res = await fetch('/api/leaderboard', { cache: 'no-store' });
        if (res.ok) {
          const leaderboard = (await res.json()) as LeaderboardDto;
          setData(leaderboard);
        }
      } catch { /* silent */ } finally {
        spectatorRef.current = false;
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // 3. Rank LP ping — updates LP/tier/W/L for ALL players every 30s (fast, no match history)
  const rankRef = useRef(false);
  useEffect(() => {
    const interval = setInterval(async () => {
      if (rankRef.current) return;
      rankRef.current = true;
      try {
        await fetch('/api/leaderboard/rank', { method: 'POST' });
        const res = await fetch('/api/leaderboard', { cache: 'no-store' });
        if (res.ok) {
          const leaderboard = (await res.json()) as LeaderboardDto;
          setData(leaderboard);
        }
      } catch { /* silent */ } finally {
        rankRef.current = false;
      }
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // 4. Full refresh — updates match history for 3 players (rotary) every 90s
  useEffect(() => {
    const interval = setInterval(() => {
      void refresh();
    }, 120000);
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
            <Link href="/estadisticas" className="lol-btn lol-btn-ghost" style={{ textDecoration: 'none' }}>
              📊 Estadísticas
            </Link>
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

              const hasBlueShell = player.hasBlueShell;

              return (
                <div key={player.riotId} className={`podium-card ${podiumCls} ${animClass} ${hasBlueShell ? 'blue-shell-active' : ''}`}>
                  {hasBlueShell && (
                    <div className="podium-blue-shell-indicator" title="¡Este jugador tiene un CAPARAZÓN AZUL activo!">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/images/blue-shell.jpg" alt="Blue Shell" className="blue-shell-icon-floating" />
                    </div>
                  )}
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
                    <div className="podium-rank-info">
                      <span className="podium-rank-name">{formatRank(player.rank)}</span>
                      <div className="podium-lp-display">
                        <span className="podium-lp-value">{player.rank.leaguePoints}</span>
                        <span className="podium-lp-label">LP</span>
                      </div>
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
          <LeaderboardTable players={data.players} iconVersion={data.iconVersion} />
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

      {/* 🐚 BLUE SHELL INFORMATION PANEL */}
      <section className="blue-shell-info-section">
        <button 
          className="blue-shell-toggle-btn"
          onClick={() => setShowShellInfo(!showShellInfo)}
          aria-expanded={showShellInfo}
        >
          <span className="btn-flex">
            <span className="btn-emoji">🐚</span>
            <strong>REGLAMENTO DEL BLUE SHELL & CASTIGOS</strong>
          </span>
          <span className="toggle-chevron">{showShellInfo ? '▲ Ocultar' : '▼ Mostrar'}</span>
        </button>

        {showShellInfo && (
          <div className="blue-shell-info-card animate-fade-in">
            <div className="info-intro">
              <p>El <strong>Blue Shell (Caparazón Azul)</strong> es una mecánica de sabotaje inspirada en <i>SoloQ Challenge</i>. Diseñada para incentivar la competitividad, permite a los jugadores penalizar a los rivales que lideran la tabla mediante desafíos especiales obligatorios en sus siguientes partidas clasificatorias.</p>
            </div>

            <div className="info-grid">
              <div className="info-column">
                <h3>🛡️ Escudos & Protección</h3>
                <p>Un jugador puede activar un <strong>Escudo de Protección</strong> (ej. 🛡️ 11h). Mientras el escudo esté activo, el jugador es completamente inmune a los ataques de Caparazón Azul. La duración del escudo disminuye con el paso de las horas en tiempo real.</p>
              </div>

              <div className="info-column">
                <h3>🐚 Caparazón Azul (Blue Shell)</h3>
                <p>Representado por el icono del caparazón azul con pinchos y un contador. Si te lanzan un Caparazón Azul (ej. 🐚 1), el jugador objetivo será penalizado y deberá girar la <strong>Ruleta de la Mala Suerte</strong> para recibir un castigo aleatorio en sus siguientes juegos.</p>
              </div>
            </div>

            <div className="info-rules-detail">
              <div className="rules-block">
                <h3>📈 ¿Cómo conseguir Caparazones y Escudos?</h3>
                <ul>
                  <li><strong>Hitos en Partida (In-Game)</strong>: Lograr una Pentakill en una partida de torneo otorga automáticamente 1 Caparazón Azul. Lograr una racha de 5 victorias consecutivas otorga 1 Escudo de Protección (8 horas).</li>
                  <li><strong>Remontadas Legendarias</strong>: Ganar una partida que supere los 45 minutos de duración (donde el equipo estuvo por detrás en oro) otorga 1 Caparazón Azul como recompensa por resiliencia.</li>
                  <li><strong>Récord Diario de LP</strong>: El jugador que logre la mayor subida neta de LP durante un día calendario recibe 1 Caparazón Azul para utilizar al día siguiente.</li>
                  <li><strong>Dinámica de Moderación / Comunidad</strong>: Los administradores y la audiencia pueden sortear o asignar caparazones adicionales a través de predicciones o interacciones del chat.</li>
                </ul>
              </div>

              <div className="rules-block">
                <h3>🎮 ¿Cómo se utilizan los Caparazones?</h3>
                <ul>
                  <li><strong>Lanzamiento</strong>: Un jugador puede lanzar un caparazón a cualquier rival de la tabla que esté por encima de su posición actual (para recortar distancias) o a su elección.</li>
                  <li><strong>La Penalización</strong>: Al recibir el caparazón, el administrador girará la ruleta de castigos. El jugador afectado deberá jugar sus siguientes partidas clasificatorias cumpliendo el hándicap (ej. sin botas, sin flash, etc.).</li>
                  <li><strong>Evidencia</strong>: Para que la partida cuente y se retire el castigo, el jugador debe transmitir la partida por Discord/Twitch o enviar capturas detalladas del HUD e inventario al final de la partida para validar que cumplió con la restricción.</li>
                </ul>
              </div>
            </div>

            <div className="punishments-dictionary">
              <h3>🚫 Catálogo de Castigos Disponibles</h3>
              <div className="punish-grid">
                <div className="punish-item">
                  <span className="item-icon">🥾</span>
                  <div>
                    <strong>Prohibido comprar botas</strong>
                    <p>El jugador no puede comprar ningún tipo de calzado en toda la partida. Deberá jugar a velocidad de movimiento base.</p>
                  </div>
                </div>
                <div className="punish-item">
                  <span className="item-icon">⚡</span>
                  <div>
                    <strong>Prohibido usar Destello (Flash)</strong>
                    <p>El jugador no puede llevar el hechizo de invocador "Destello" (Flash) en sus hechizos. Deberá usar combinaciones como Teleport, Ignición, Extenuación o Fantasmal.</p>
                  </div>
                </div>
                <div className="punish-item">
                  <span className="item-icon">🔇</span>
                  <div>
                    <strong>Jugar sin audio</strong>
                    <p>El jugador debe silenciar por completo el volumen de los efectos, alertas y música de League of Legends durante el juego.</p>
                  </div>
                </div>
                <div className="punish-item">
                  <span className="item-icon">⌨️</span>
                  <div>
                    <strong>Teclas cambiadas / Mano cambiada</strong>
                    <p>El jugador debe jugar utilizando la mano contraria en el mouse, o rotar la configuración de asignación de teclas (ej. cambiar Q, W, E, R por otras menos cómodas).</p>
                  </div>
                </div>
                <div className="punish-item">
                  <span className="item-icon">✴️</span>
                  <div>
                    <strong>Castigo Especial / Ruleta</strong>
                    <p>Un hándicap especial decidido por el administrador del torneo (ej. desactivar HUD, jugar en resolución 800x600, etc.).</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      <VisitorCounter />
    </main>
  );
}