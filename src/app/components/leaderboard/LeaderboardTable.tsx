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

export function LeaderboardTable({
  players,
  iconVersion,
}: {
  players: LeaderboardDto['players'];
  iconVersion: string;
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
            <th>Rango</th>
            <th>LP</th>
            <th className="hide-on-mobile">Diario</th>
            <th className="hide-on-mobile">V / D</th>
            <th className="hide-on-mobile">Win rate</th>
            <th className="hide-on-mobile">KDA</th>
            <th className="hide-on-mobile">Racha</th>
            <th className="hide-on-mobile">Últimas</th>
            <th className="hide-on-mobile">±LP</th>
            <th className="hide-on-mobile-sm">Shells</th>
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
                  className={`leaderboard-row ${podiumClass(player.position)} ${isExpanded ? 'active-expanded-parent' : ''}`}
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
                  <td className="daily-lp hide-on-mobile">
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
                    {player.stats.wins} / {player.stats.losses}
                  </td>
                  <td className="hide-on-mobile">{player.stats.winRate}%</td>
                  <td className="hide-on-mobile">{player.stats.kda.toFixed(2)}</td>
                  <td className="hide-on-mobile">
                    {player.stats.streakType
                      ? `${player.stats.streak}${player.stats.streakType}`
                      : '—'}
                  </td>
                  <td className="hide-on-mobile">
                    <RecentResults results={player.stats.recentResults} />
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
                    <td colSpan={12} className="expanded-td">
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