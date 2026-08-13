import type { LeaderboardDto } from '@/domain/leaderboard';
import type { Rank, RecentMatchResult } from '@/domain/types';
import { LiveBadge } from './LiveBadge';
import { useState } from 'react';

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

function rankLabel(rank: Rank) {
  return rank.division ? `${tierNames[rank.tier]} ${rank.division}` : tierNames[rank.tier];
}

function getRankIconUrl(tier: string) {
  if (!tier || tier === 'UNRANKED') {
    return 'https://opgg-static.akamaized.net/images/medals/default.png';
  }
  return `https://opgg-static.akamaized.net/images/medals_new/${tier.toLowerCase()}.png`;
}

function podiumClass(position: number) {
  if (position === 1) return 'podium-gold';
  if (position === 2) return 'podium-silver';
  if (position === 3) return 'podium-bronze';
  return '';
}

const positionIcons: Record<string, string> = {
  TOP: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-top.png',
  JUNGLE: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-jungle.png',
  MIDDLE: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-middle.png',
  MID: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-middle.png',
  BOTTOM: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-bottom.png',
  UTILITY: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-utility.png',
};

const laneNames: Record<string, string> = {
  TOP: 'Superior (Top)',
  JUNGLE: 'Jungla (Jungle)',
  MIDDLE: 'Central (Mid)',
  MID: 'Central (Mid)',
  BOTTOM: 'Tirador (Adc)',
  UTILITY: 'Soporte (Support)',
};

// ─── Position Wreath Badge Component ─────────────────────────────────────────
function PositionWreath({ position }: { position: number }) {
  let wreathColor = '#3c424d'; // grey
  let badgeIcon = '';
  
  if (position === 1) {
    wreathColor = '#c8aa6e'; // gold
    badgeIcon = '👑';
  } else if (position === 2) {
    wreathColor = '#a09b8c'; // silver
  } else if (position === 3) {
    wreathColor = '#cd7f32'; // bronze
  }
  
  return (
    <div className="position-wreath-wrap" style={{ position: 'relative', width: '42px', height: '42px', margin: '0 auto' }}>
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', color: wreathColor }}>
        <path d="M 32,72 C 16,58 16,38 32,24" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M 68,72 C 84,58 84,38 68,24" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M 23,62 C 16,58 18,52 24,55 Z" fill="currentColor" />
        <path d="M 18,48 C 11,45 13,39 19,42 Z" fill="currentColor" />
        <path d="M 20,34 C 14,30 17,24 23,28 Z" fill="currentColor" />
        <path d="M 77,62 C 84,58 82,52 76,55 Z" fill="currentColor" />
        <path d="M 82,48 C 89,45 87,39 81,42 Z" fill="currentColor" />
        <path d="M 80,34 C 86,30 83,24 77,28 Z" fill="currentColor" />
      </svg>
      {badgeIcon && (
        <span className="wreath-crown" style={{ position: 'absolute', top: '-11px', left: '50%', transform: 'translateX(-50%)', fontSize: '11px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>
          {badgeIcon}
        </span>
      )}
      <span className="wreath-number" style={{
        position: 'absolute',
        top: '52%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        fontSize: '0.85rem',
        fontWeight: 800,
        color: position <= 3 ? wreathColor : '#8890a6',
        fontFamily: "'Cinzel', serif"
      }}>
        {position}
      </span>
    </div>
  );
}

// ─── Sparkline Component ─────────────────────────────────────────────────────
function Sparkline({ results }: { results: RecentMatchResult[] }) {
  if (!results || results.length === 0) {
    return <span className="sparkline-empty">—</span>;
  }
  
  // Chronological order (from oldest to newest)
  const chronological = [...results].reverse();
  
  // Calculate relative LP points path
  let currentLp = 100;
  const points = [currentLp];
  for (const m of chronological) {
    if (m.result === 'W') {
      currentLp += m.lpChange && m.lpChange > 0 ? m.lpChange : 20;
    } else if (m.result === 'L') {
      currentLp -= m.lpChange && m.lpChange > 0 ? m.lpChange : 15;
    }
    points.push(currentLp);
  }
  
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min === 0 ? 1 : max - min;
  
  const svgWidth = 100;
  const svgHeight = 26;
  const padding = 2;
  
  const scaledPoints = points.map((p, idx) => {
    const x = padding + (idx / (points.length - 1)) * (svgWidth - padding * 2);
    const y = padding + (1 - (p - min) / range) * (svgHeight - padding * 2);
    return { x, y };
  });
  
  let pathD = `M ${scaledPoints[0].x} ${scaledPoints[0].y}`;
  for (let i = 1; i < scaledPoints.length; i++) {
    pathD += ` L ${scaledPoints[i].x} ${scaledPoints[i].y}`;
  }
  
  const isUp = points[points.length - 1] >= points[0];
  const strokeColor = isUp ? 'var(--green-victory)' : 'var(--red-defeat)';
  const gradientId = `sparkline-grad-${Math.random().toString(36).substr(2, 9)}`;
  const areaD = `${pathD} L ${scaledPoints[scaledPoints.length - 1].x} ${svgHeight} L ${scaledPoints[0].x} ${svgHeight} Z`;
  
  return (
    <div className="sparkline-container" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={svgWidth} height={svgHeight} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.22" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#${gradientId})`} />
        <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={scaledPoints[scaledPoints.length - 1].x} cy={scaledPoints[scaledPoints.length - 1].y} r="2" fill={strokeColor} />
      </svg>
    </div>
  );
}

const AegisIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
    {/* Center shield/crown */}
    <path d="M14 6L18 10V18L14 22L10 18V10L14 6Z" fill="#ffbe4a" fillOpacity="0.15" stroke="#ffbe4a" strokeWidth="1.5" />
    {/* Left wings */}
    <path d="M10 10C8 7 4 8 3 13C2 17 5 19 10 20C8 18 8 14 10 10Z" fill="#ffbe4a" fillOpacity="0.3" stroke="#ffbe4a" strokeWidth="1.2" />
    {/* Right wings */}
    <path d="M18 10C20 7 24 8 25 13C26 17 23 19 18 20C20 18 20 14 18 10Z" fill="#ffbe4a" fillOpacity="0.3" stroke="#ffbe4a" strokeWidth="1.2" />
    {/* Decorative inner elements */}
    <circle cx="14" cy="14" r="2" fill="#ffbe4a" />
  </svg>
);

// ─── Rank Hover Details Sub-Panel Component ─────────────────────────────────
function RankHoverPanel({
  player,
  challengerCutoff,
  grandmasterCutoff,
}: {
  player: LeaderboardDto['players'][0];
  challengerCutoff: number;
  grandmasterCutoff: number;
}) {
  const tier = player.rank.tier;
  const lp = player.rank.leaguePoints;
  const serverRank = player.serverRank;
  
  let targetTierName = 'Grandmaster';
  let targetLp = grandmasterCutoff;
  let lpDiff = lp - targetLp;
  let progressPct = 0;
  
  if (tier === 'CHALLENGER') {
    targetTierName = 'Challenger';
    targetLp = challengerCutoff;
    lpDiff = 0;
    progressPct = 100;
  } else if (tier === 'GRANDMASTER') {
    targetTierName = 'Challenger';
    targetLp = challengerCutoff;
    lpDiff = lp - challengerCutoff;
    const range = challengerCutoff - grandmasterCutoff;
    progressPct = Math.min(100, Math.max(0, ((lp - grandmasterCutoff) / (range || 1)) * 100));
  } else if (tier === 'MASTER') {
    targetTierName = 'Grandmaster';
    targetLp = grandmasterCutoff;
    lpDiff = lp - grandmasterCutoff;
    progressPct = Math.min(100, Math.max(0, (lp / (grandmasterCutoff || 1)) * 100));
  } else {
    targetTierName = 'Siguiente División';
    targetLp = 100;
    lpDiff = lp - 100;
    progressPct = Math.min(100, Math.max(0, lp));
  }
  
  const diffText = lpDiff >= 0 ? `+${lpDiff} LP` : `${lpDiff} LP`;
  
  return (
    <div className="rank-hover-panel">
      <div className="hover-panel-title">
        {targetTierName} - {targetLp} LP
      </div>
      <div className="hover-panel-meta">
        {serverRank ? (
          <span className="hover-panel-server-rank">TOP {serverRank}</span>
        ) : (
          <span className="hover-panel-server-rank no-rank-tag">LAS</span>
        )}
        <span className="hover-panel-diff-lp" style={{ color: lpDiff >= 0 ? '#00f5a0' : '#ffbe4a' }}>
          {diffText} {tier !== 'CHALLENGER' && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={getRankIconUrl(targetTierName.toUpperCase())} alt="" className="diff-tier-mini-icon" />
          )}
        </span>
      </div>
      
      <div className="hover-panel-progress-track">
        <div className="hover-panel-progress-bar" style={{ width: `${progressPct}%` }} />
      </div>
      
      {tier !== 'CHALLENGER' && (
        <div className="hover-panel-corte-label">
          corte {targetLp} LP
        </div>
      )}
    </div>
  );
}

export function LeaderboardTable({
  players,
  iconVersion,
  challengerCutoff,
  grandmasterCutoff,
}: {
  players: LeaderboardDto['players'];
  iconVersion: string;
  challengerCutoff: number;
  grandmasterCutoff: number;
}) {
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);

  if (players.length === 0) {
    return <p>Agrega participantes en `config/players.json`.</p>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Pos.</th>
            <th>Jugador</th>
            <th className="hide-on-mobile">Rol</th>
            <th>Rango & LP</th>
            <th>Aegis</th>
            <th className="hide-on-mobile">Win rate</th>
            <th>Tendencia</th>
            <th>Diario</th>
            <th className="hide-on-mobile">KDA</th>
            <th className="hide-on-mobile">Racha</th>
            <th className="hide-on-mobile">±LP</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player) => {
            const opggUrl = `https://www.op.gg/summoners/las/${encodeURIComponent(
              player.riotId.replace('#', '-')
            )}`;
            const isExpanded = expandedPlayerId === player.riotId;
            
            const totalGames = player.stats.wins + player.stats.losses;
            const winsPct = totalGames > 0 ? (player.stats.wins / totalGames) * 100 : 50;

            return (
              <>
                <tr
                  key={player.riotId}
                  className={`leaderboard-row ${podiumClass(player.position)} ${isExpanded ? 'active-expanded-parent' : ''}`}
                  onClick={() => setExpandedPlayerId(isExpanded ? null : player.riotId)}
                  title="Haz clic para ver el historial y detalles del jugador"
                >
                  <td className="wreath-cell-column">
                    <PositionWreath position={player.position} />
                  </td>
                  <td>
                    <div className="player">
                      <div className="player-avatar-wrapper">
                        {player.profileIconUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={player.profileIconUrl} alt="" />
                        ) : (
                          <span className="player-avatar">{player.riotId.charAt(0).toUpperCase()}</span>
                        )}
                        <span className={`status-badge ${player.isOnline ? 'online' : 'offline'}`} />
                      </div>
                      <div>
                        <div className="player-name-wrapper">
                          <span className="player-name">
                            {player.riotId}
                          </span>
                          <div className="player-badges" style={{ display: 'inline-flex', gap: '4px' }}>
                            <a
                              href={opggUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="opgg-badge"
                            >
                              OP.GG
                            </a>
                          </div>
                        </div>
                        <LiveBadge isOnline={player.isOnline} activeGameStartTime={player.activeGameStartTime} riotId={player.riotId} />
                        {player.error === 'account_not_found' && (
                          <span className="player-error">Cuenta no encontrada</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="lane-cell hide-on-mobile">
                    {player.stats.topLane && positionIcons[player.stats.topLane] ? (
                      <div className="lane-icon-wrap" title={laneNames[player.stats.topLane]}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={positionIcons[player.stats.topLane]}
                          alt={player.stats.topLane}
                          className="lane-icon"
                        />
                      </div>
                    ) : (
                      <span className="lane-empty">—</span>
                    )}
                  </td>
                  <td className="rank">
                    <div className="rank-cell-wrapper">
                      <div className="rank-cell">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getRankIconUrl(player.rank.tier)}
                          alt={player.rank.tier}
                          className="rank-icon"
                        />
                        <div className="rank-text-meta">
                          <span className="rank-tier-name">{rankLabel(player.rank)}</span>
                          <span className="rank-lp-value">{player.rank.leaguePoints} LP</span>
                        </div>
                      </div>
                      <RankHoverPanel player={player} challengerCutoff={challengerCutoff} grandmasterCutoff={grandmasterCutoff} />
                    </div>
                  </td>
                  <td className="aegis-cell-data text-center">
                    <div className="aegis-icon-wrapper" title={`Doble LP: ${player.aegisCount} veces`}>
                      <AegisIcon />
                      <span className="aegis-count-badge">{player.aegisCount}</span>
                    </div>
                  </td>
                  <td className="hide-on-mobile">
                    <div className="winrate-progress-cell">
                      <div className="winrate-text-header">
                        <strong>{player.stats.winRate}%</strong>
                        <span className="winrate-wl-breakdown">{player.stats.wins}V - {player.stats.losses}D</span>
                      </div>
                      <div className="winrate-proportion-bar">
                        <div className="bar-wins" style={{ width: `${winsPct}%` }} />
                        <div className="bar-losses" style={{ width: `${100 - winsPct}%` }} />
                      </div>
                    </div>
                  </td>
                  <td>
                    <Sparkline results={player.stats.recentResults} />
                  </td>
                  <td className="daily-lp">
                    <div className="daily-lp-cell">
                      <div className="daily-lp-vals">
                        <span className="lp-gain">▲ {player.stats.dailyGainedLp ?? 0}</span>
                        <span className="lp-loss">▼ {player.stats.dailyLostLp ?? 0}</span>
                      </div>
                      <div className="daily-record-val" title="Récord de victorias y derrotas de hoy">
                        {player.stats.dailyWins ?? 0}V - {player.stats.dailyLosses ?? 0}D
                      </div>
                    </div>
                  </td>
                  <td className="hide-on-mobile">
                    <div className="kda-display-cell">
                      <strong>{player.stats.kda.toFixed(2)}</strong>
                      <span>{player.stats.averageKills.toFixed(1)} / {player.stats.averageDeaths.toFixed(1)} / {player.stats.averageAssists.toFixed(1)}</span>
                    </div>
                  </td>
                  <td className="hide-on-mobile">
                    {player.stats.streakType
                      ? `${player.stats.streak}${player.stats.streakType}`
                      : '—'}
                  </td>
                  <td className="hide-on-mobile">
                    <div className="avg-lp-cell" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }} title="Promedio de LP ganado y perdido por partida">
                      <span className="lp-gain" style={{ fontWeight: 700, color: '#00f5a0', fontSize: '0.8rem' }}>▲ {player.stats.avgLpGain ?? 30}</span>
                      <span className="lp-loss" style={{ fontWeight: 700, color: '#ff4a4a', fontSize: '0.8rem' }}>▼ {player.stats.avgLpLoss ?? 30}</span>
                    </div>
                  </td>
                </tr>
                {isExpanded && (
                  <tr className="expanded-row-container" key={`${player.riotId}-expanded`}>
                    <td colSpan={11} className="expanded-td">
                      <PlayerDetailDrawer player={player} opggUrl={opggUrl} iconVersion={iconVersion} />
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Sub-Component for Player Detail Drawer ──────────────────────────────────
function PlayerDetailDrawer({
  player,
  opggUrl,
  iconVersion,
}: {
  player: LeaderboardDto['players'][0];
  opggUrl: string;
  iconVersion: string;
}) {
  const [activeTab, setActiveTab] = useState<'historial' | 'stats'>('historial');

  const timeSince = (dateStr: string) => {
    const pDate = new Date(dateStr).getTime();
    const now = Date.now();
    const diffMs = now - pDate;
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffHours < 1) return 'hace unos minutos';
    if (diffHours < 24) return `hace ${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    return `hace ${diffDays} d`;
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const getChampionIcon = (champName: string) => {
    const normalized = champName.replace(/\s/g, '').replace(/'/g, '');
    return `https://ddragon.leagueoflegends.com/cdn/${iconVersion || '14.15.1'}/img/champion/${normalized}.png`;
  };

  return (
    <div className="player-drawer-card animate-fade-in" onClick={(e) => e.stopPropagation()}>
      <div className="drawer-nav">
        <div className="drawer-tabs">
          <button
            className={`drawer-tab-btn ${activeTab === 'historial' ? 'active' : ''}`}
            onClick={() => setActiveTab('historial')}
          >
            📋 Historial
          </button>
          <button
            className={`drawer-tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            📊 Stats & Elo
          </button>
        </div>
        <a href={opggUrl} target="_blank" rel="noopener noreferrer" className="lol-btn lol-btn-ghost drawer-opgg-btn">
          Ver ficha completa →
        </a>
      </div>

      <div className="drawer-content">
        {activeTab === 'historial' && (
          <div className="history-tab-content">
            {player.stats.recentResults.length === 0 ? (
              <p className="no-matches-msg">No hay partidas clasificatorias registradas recientemente.</p>
            ) : (
              <div className="match-rows-list">
                {player.stats.recentResults.slice(0, 8).map((match, i) => {
                  const isWin = match.result === 'W';
                  const isRemake = match.result === 'R';
                  const champName = match.championName || 'Unknown';
                  const kills = match.kills ?? 0;
                  const deaths = match.deaths ?? 0;
                  const assists = match.assists ?? 0;
                  const kdaRatio = deaths === 0 ? (kills + assists) : ((kills + assists) / deaths).toFixed(1);

                  return (
                    <div
                      key={i}
                      className={`match-row-item ${isWin ? 'match-win' : isRemake ? 'match-remake' : 'match-loss'}`}
                    >
                      <div className="match-result-col">
                        <span className="match-outcome-text">
                          {isWin ? 'Victoria' : isRemake ? 'Remake' : 'Derrota'}
                        </span>
                        <span className="match-time-meta">
                          {match.durationSeconds ? formatDuration(match.durationSeconds) : '20:00'} · {match.playedAt ? timeSince(match.playedAt) : 'hace tiempo'}
                        </span>
                      </div>

                      <div className="match-icons-col">
                        <div className="match-lane-icon-wrap" title={match.lane || 'Lane unknown'}>
                          {match.lane && positionIcons[match.lane.toUpperCase()] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={positionIcons[match.lane.toUpperCase()]} alt="" className="match-lane-img" />
                          ) : (
                            <span className="match-lane-dash">—</span>
                          )}
                        </div>

                        <div className="match-champ-avatar-wrap">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={getChampionIcon(champName)} alt={champName} className="match-champ-img" />
                        </div>
                      </div>

                      <div className="match-stats-col">
                        <div className="match-kda-numbers">
                          <span className="k">{kills}</span> / <span className="d">{deaths}</span> / <span className="a">{assists}</span>
                        </div>
                        <div className="match-kda-ratio">
                          <strong>{kdaRatio} KDA</strong> · {match.lane === 'BOTTOM' || match.lane === 'TOP' || match.lane === 'MIDDLE' || match.lane === 'MID' ? '180 CS' : '40 CS'}
                        </div>
                      </div>

                      <div className="match-items-col">
                        {/* Normal item slots (indexes 0 to 5) */}
                        {Array.from({ length: 6 }).map((_, idx) => {
                          const itemId = match.items ? match.items[idx] : 0;
                          return itemId && itemId > 0 ? (
                            <div key={idx} className="match-item-slot has-item">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={`https://ddragon.leagueoflegends.com/cdn/${iconVersion || '14.15.1'}/img/item/${itemId}.png`}
                                alt=""
                                className="match-item-img"
                              />
                            </div>
                          ) : (
                            <div key={idx} className="match-item-slot" />
                          );
                        })}

                        {/* Trinket slot (index 6) */}
                        {(() => {
                          const trinketId = match.items ? match.items[6] : 0;
                          return trinketId && trinketId > 0 ? (
                            <div className="match-item-slot trinket-slot has-item">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={`https://ddragon.leagueoflegends.com/cdn/${iconVersion || '14.15.1'}/img/item/${trinketId}.png`}
                                alt=""
                                className="match-item-img"
                              />
                            </div>
                          ) : (
                            <div className="match-item-slot trinket-slot" />
                          );
                        })()}
                      </div>

                      <div className="match-lp-col">
                        {(() => {
                          const change = match.lpChange ?? 0;
                          const changeText = change > 0 ? `+${change} LP` : change === 0 ? '0 LP' : `${change} LP`;
                          return (
                            <span className={isWin ? 'lp-gain-text' : isRemake ? 'lp-remake-text' : 'lp-loss-text'}>
                              {changeText}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="stats-tab-content grid-2">
            <div className="stats-box-column">
              <h4>🏆 Desempeño General</h4>
              <ul className="stats-list-box">
                <li><strong>Partidas jugadas:</strong> {player.stats.games}</li>
                <li><strong>Win Rate:</strong> {player.stats.winRate}% ({player.stats.wins}V - {player.stats.losses}D)</li>
                <li><strong>KDA Promedio:</strong> {player.stats.kda.toFixed(2)} ({player.stats.averageKills.toFixed(1)} / {player.stats.averageDeaths.toFixed(1)} / {player.stats.averageAssists.toFixed(1)})</li>
                <li><strong>Racha actual:</strong> {player.stats.streakType ? `${player.stats.streak} ${player.stats.streakType === 'W' ? 'Victorias' : 'Derrotas'}` : 'Sin racha'}</li>
              </ul>
            </div>

            <div className="stats-box-column">
              <h4>🔥 Campeones más Jugados</h4>
              <div className="champ-list-row">
                {player.stats.topChampions.map((c, i) => (
                  <div key={i} className="champ-mini-card">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={getChampionIcon(c.name)} alt={c.name} />
                    <div className="champ-mini-meta">
                      <strong>{c.name}</strong>
                      <span>{c.games} part.</span>
                    </div>
                  </div>
                ))}
                {player.stats.topChampions.length === 0 && (
                  <p className="no-matches-msg">Aún no hay campeones más jugados.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}