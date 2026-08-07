import type { LeaderboardDto } from '@/domain/leaderboard';
import type { Rank } from '@/domain/types';
import { RecentResults } from './RecentResults';
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

export function LeaderboardTable({ players }: { players: LeaderboardDto['players'] }) {
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
            <th>Rol</th>
            <th>Rango</th>
            <th>LP</th>
            <th>Diario</th>
            <th>V / D</th>
            <th>Win rate</th>
            <th>KDA</th>
            <th>Racha</th>
            <th>Últimas</th>
            <th>Shells</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player) => {
            const opggUrl = `https://www.op.gg/summoners/las/${encodeURIComponent(
              player.riotId.replace('#', '-')
            )}`;
            const isExpanded = expandedPlayerId === player.riotId;
            const hasBlueShell = player.hasBlueShell;

            return (
              <>
                <tr
                  key={player.riotId}
                  className={`leaderboard-row ${podiumClass(player.position)} ${isExpanded ? 'active-expanded-parent' : ''} ${hasBlueShell ? 'blue-shell-row' : ''}`}
                  onClick={() => setExpandedPlayerId(isExpanded ? null : player.riotId)}
                  title="Haz clic para ver el historial y detalles del jugador"
                >
                  <td className={`position ${podiumClass(player.position)}`}>
                    <div className="pos-cell">
                      <span className="pos-number">{player.position}</span>
                      <span
                        className={`pos-change ${
                          player.positionChange > 0 ? 'up' : player.positionChange < 0 ? 'down' : 'same'
                        }`}
                      >
                        {player.positionChange > 0
                          ? `▲${player.positionChange}`
                          : player.positionChange < 0
                          ? `▼${Math.abs(player.positionChange)}`
                          : '='}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="player">
                      <div className="player-avatar-wrapper">
                        {player.profileIconUrl ? (
                          // Data Dragon is an external Riot CDN, so Next Image optimization is not required here.
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
                            {player.hasBlueShell && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src="/images/blue-shell.jpg" alt="Blue Shell" className="table-blue-shell-icon" title="¡Este jugador tiene un CAPARAZÓN AZUL activo!" />
                            )}
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
                  <td className="lane-cell">
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
                    <div className="rank-cell">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getRankIconUrl(player.rank.tier)}
                        alt={player.rank.tier}
                        className="rank-icon"
                      />
                      <span>{rankLabel(player.rank)}</span>
                    </div>
                  </td>
                  <td className="lp">{player.rank.leaguePoints}</td>
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
                  <td>
                    {player.stats.wins} / {player.stats.losses}
                  </td>
                  <td>{player.stats.winRate}%</td>
                  <td>{player.stats.kda.toFixed(2)}</td>
                  <td>
                    {player.stats.streakType
                      ? `${player.stats.streak}${player.stats.streakType}`
                      : '—'}
                  </td>
                  <td>
                    <RecentResults results={player.stats.recentResults} />
                  </td>
                  <td className="shells-cell">
                    <div className="shells-flex">
                      {/* 1. Shield Badge */}
                      {player.shieldHoursLeft !== null && (
                        <div className="shell-badge shield-active" title={`Protegido por escudo. Expira en ${player.shieldHoursLeft}h.`}>
                          <span className="shell-emoji">🛡️</span>
                          <span className="shell-counter">{player.shieldHoursLeft}h</span>
                        </div>
                      )}

                      {/* 2. Blue Shell Badge */}
                      {player.blueShellCount > 0 && (
                        <div className="shell-badge blue-shell-active-badge" title={`Atacado por ${player.blueShellCount} caparazón(es) azul(es).`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/images/blue-shell.jpg" alt="Shell" className="mini-shell-icon" />
                          <span className="shell-counter count-bubble">{player.blueShellCount}</span>
                        </div>
                      )}

                      {/* 3. Punishments Badges */}
                      {player.punishments.map((pun) => {
                        let icon = '✴️';
                        let title = 'Castigo Especial';
                        let colorClass = 'special-punish';

                        if (pun.id === 'no_boots') {
                          icon = '🥾';
                          title = 'Castigo: Prohibido comprar botas';
                          colorClass = 'boots-punish';
                        } else if (pun.id === 'no_flash') {
                          icon = '⚡';
                          title = 'Castigo: Prohibido usar Destello (Flash)';
                          colorClass = 'flash-punish';
                        } else if (pun.id === 'no_audio') {
                          icon = '🔇';
                          title = 'Castigo: Jugar sin audio en el juego';
                          colorClass = 'audio-punish';
                        } else if (pun.id === 'keyboard') {
                          icon = '⌨️';
                          title = 'Castigo: Jugar con teclas cambiadas / mano cambiada';
                          colorClass = 'keys-punish';
                        }

                        return (
                          <div key={pun.id} className={`shell-badge punishment-active-badge ${colorClass}`} title={`${title} - Partidas restantes: ${pun.gamesLeft}`}>
                            <span className="shell-emoji">{icon}</span>
                            <span className="shell-slash-overlay">/</span>
                            <span className="shell-counter count-bubble punish-count">{pun.gamesLeft}</span>
                          </div>
                        );
                      })}

                      {player.shieldHoursLeft === null && player.blueShellCount === 0 && player.punishments.length === 0 && (
                        <span className="shells-empty">—</span>
                      )}
                    </div>
                  </td>
                </tr>
                {isExpanded && (
                  <tr className="expanded-row-container" key={`${player.riotId}-expanded`}>
                    <td colSpan={12} className="expanded-td">
                      <PlayerDetailDrawer player={player} opggUrl={opggUrl} />
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
}: {
  player: LeaderboardDto['players'][0];
  opggUrl: string;
}) {
  const [activeTab, setActiveTab] = useState<'historial' | 'stats' | 'shells'>('historial');

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
    return `https://ddragon.leagueoflegends.com/cdn/15.1.1/img/champion/${normalized}.png`;
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
          <button
            className={`drawer-tab-btn ${activeTab === 'shells' ? 'active' : ''}`}
            onClick={() => setActiveTab('shells')}
          >
            🐚 Blue Shell {player.blueShellCount > 0 && `x${player.blueShellCount}`}
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
                                src={`https://ddragon.leagueoflegends.com/cdn/15.1.1/img/item/${itemId}.png`}
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
                                src={`https://ddragon.leagueoflegends.com/cdn/15.1.1/img/item/${trinketId}.png`}
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
                        <span className={isWin ? 'lp-gain-text' : isRemake ? 'lp-remake-text' : 'lp-loss-text'}>
                          {isWin ? '+31 LP' : isRemake ? '0 LP' : '-16 LP'}
                        </span>
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

        {activeTab === 'shells' && (
          <div className="shells-tab-content">
            <div className="shells-grid-detail">
              <div className="cooldown-box">
                <h4>🛡️ Estado de Escudo</h4>
                {player.shieldHoursLeft !== null ? (
                  <div className="active-shield-detail animate-pulse">
                    <span className="shield-huge-icon">🛡️</span>
                    <div>
                      <strong>Escudo Activo</strong>
                      <p>Inmune a ataques de Caparazón Azul durante las próximas {player.shieldHoursLeft} horas.</p>
                    </div>
                  </div>
                ) : (
                  <div className="inactive-shield-detail">
                    <span className="shield-huge-icon disabled-shield">🛡️</span>
                    <div>
                      <strong>Sin Escudo</strong>
                      <p>Vulnerable a ataques de Caparazón Azul.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="cooldown-box">
                <h4>🚫 Castigos y Penalizaciones Activas</h4>
                <div className="punishments-detail-list">
                  {player.punishments.map((pun) => {
                    let title = 'Castigo Especial';
                    let desc = 'Sujeto a las reglas de la administración.';
                    let icon = '✴️';

                    if (pun.id === 'no_boots') {
                      title = 'Prohibido comprar botas';
                      desc = 'Jugar sin botas en todo el transcurso de la partida.';
                      icon = '🥾';
                    } else if (pun.id === 'no_flash') {
                      title = 'Prohibido usar Destello (Flash)';
                      desc = 'Hechizo de Destello deshabilitado. Jugar con otros hechizos.';
                      icon = '⚡';
                    } else if (pun.id === 'no_audio') {
                      title = 'Jugar sin audio';
                      desc = 'Volumen del juego al 0%. Obligatorio jugar silenciado.';
                      icon = '🔇';
                    } else if (pun.id === 'keyboard') {
                      title = 'Teclas / Mano cambiada';
                      desc = 'Rotación o reasignación de configuración física de juego.';
                      icon = '⌨️';
                    }

                    return (
                      <div key={pun.id} className="punish-detail-item">
                        <span className="p-icon">{icon}</span>
                        <div className="p-meta">
                          <strong>{title} ({pun.gamesLeft} part. restantes)</strong>
                          <p>{desc}</p>
                        </div>
                      </div>
                    );
                  })}

                  {player.punishments.length === 0 && (
                    <div className="no-punish-detail">
                      <span className="p-ok-icon">🟢</span>
                      <div>
                        <strong>Ningún castigo activo</strong>
                        <p>Este jugador está jugando limpio sin hándicaps temporales.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}