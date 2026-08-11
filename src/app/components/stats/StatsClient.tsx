'use client';

import { useState, useMemo } from 'react';
import type { LeaderboardDto } from '@/domain/leaderboard';
import Link from 'next/link';

type ChampionStat = {
  championName: string;
  games: number;
  wins: number;
  losses: number;
  kills: number;
  deaths: number;
  assists: number;
};

type SortField = 'games' | 'winRate' | 'kda' | 'averageKills' | 'averageDeaths' | 'averageAssists';
type SortOrder = 'asc' | 'desc';

function getRankIconUrl(tier: string) {
  if (!tier || tier === 'UNRANKED') {
    return 'https://opgg-static.akamaized.net/images/medals/default.png';
  }
  return `https://opgg-static.akamaized.net/images/medals_new/${tier.toLowerCase()}.png`;
}

function getChampionIconUrl(championName: string, iconVersion = '14.15.1') {
  const normalized = championName.replace(/\s/g, '').replace(/'/g, '');
  return `https://ddragon.leagueoflegends.com/cdn/${iconVersion}/img/champion/${normalized}.png`;
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
  TOP: 'Top',
  JUNGLE: 'Jungle',
  MIDDLE: 'Mid',
  MID: 'Mid',
  BOTTOM: 'Adc',
  UTILITY: 'Support',
};

export function StatsClient({
  leaderboard,
  champions,
}: {
  leaderboard: LeaderboardDto;
  champions: ChampionStat[];
}) {
  const [activeTab, setActiveTab] = useState<'players' | 'champions'>('players');
  const [sortField, setSortField] = useState<SortField>('kda');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const players = leaderboard.players;

  // Compute Highlights/Leaders
  const leaders = useMemo(() => {
    if (players.length === 0) return null;

    const grindeador = [...players].sort((a, b) => b.stats.games - a.stats.games)[0];
    const imparable = [...players].sort((a, b) => b.stats.kda - a.stats.kda)[0];
    const verdugo = [...players].sort((a, b) => b.stats.averageKills - a.stats.averageKills)[0];
    const inmortal = [...players].sort((a, b) => a.stats.averageDeaths - b.stats.averageDeaths)[0];
    const escudero = [...players].sort((a, b) => b.stats.averageAssists - a.stats.averageAssists)[0];
    const racha = [...players].sort((a, b) => {
      const aVal = a.stats.streakType === 'W' ? a.stats.streak : 0;
      const bVal = b.stats.streakType === 'W' ? b.stats.streak : 0;
      return bVal - aVal;
    })[0];

    return {
      grindeador,
      imparable,
      verdugo,
      inmortal,
      escudero,
      racha,
    };
  }, [players]);

  // Sort players list
  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      let aVal = 0;
      let bVal = 0;

      if (sortField === 'games') {
        aVal = a.stats.games;
        bVal = b.stats.games;
      } else if (sortField === 'winRate') {
        aVal = a.stats.winRate;
        bVal = b.stats.winRate;
      } else if (sortField === 'kda') {
        aVal = a.stats.kda;
        bVal = b.stats.kda;
      } else if (sortField === 'averageKills') {
        aVal = a.stats.averageKills;
        bVal = b.stats.averageKills;
      } else if (sortField === 'averageDeaths') {
        aVal = a.stats.averageDeaths;
        bVal = b.stats.averageDeaths;
      } else if (sortField === 'averageAssists') {
        aVal = a.stats.averageAssists;
        bVal = b.stats.averageAssists;
      }

      if (sortOrder === 'desc') {
        return bVal - aVal;
      } else {
        return aVal - bVal;
      }
    });
  }, [players, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedChampions = useMemo(() => {
    return [...champions]
      .filter((c) => c.games > 0)
      .map((c) => ({
        ...c,
        winRate: Math.round((c.wins / c.games) * 100),
        kda: (c.kills + c.assists) / Math.max(1, c.deaths),
      }))
      .sort((a, b) => b.games - a.games);
  }, [champions]);

  return (
    <main className="lol-container">
      <header className="lol-header">
        <div className="eyebrow">✦ BURROS QUEUE CHALLENGE ✦</div>
        <div className="lol-crest">
          <svg viewBox="0 0 100 100" className="lol-crest-icon" aria-hidden="true">
            <path d="M50 5 L85 25 L85 75 L50 95 L15 75 L15 25 Z" fill="none" stroke="currentColor" strokeWidth="3" />
            <polygon points="50,25 65,50 50,75 35,50" fill="currentColor" opacity="0.8" />
          </svg>
        </div>
        <div className="region">ESTADÍSTICAS DEL TORNEO</div>
        <h1 className="lol-title">LÍDERES Y DATOS</h1>
        <div className="lol-divider">
          <span className="divider-line"></span>
          <span className="divider-gem">◆</span>
          <span className="divider-line"></span>
        </div>
        <div className="toolbar" style={{ justifyContent: 'center' }}>
          <Link href="/" className="lol-btn lol-btn-ghost">← Volver al Ranking</Link>
        </div>
      </header>

      {/* Tab Switcher */}
      <div className="tab-switcher">
        <button
          className={`tab-btn ${activeTab === 'players' ? 'active' : ''}`}
          onClick={() => setActiveTab('players')}
        >
          ⚔ Jugadores
        </button>
        <button
          className={`tab-btn ${activeTab === 'champions' ? 'active' : ''}`}
          onClick={() => setActiveTab('champions')}
        >
          🏆 Campeones
        </button>
      </div>

      {activeTab === 'players' && (
        <>
          {/* Leaders Highlights Cards */}
          {leaders && (
            <div className="stats-leaders-grid">
              {/* Imparable (KDA) */}
              <div className="leader-card">
                <div className="leader-card-badge">KDA</div>
                <div className="leader-card-title">El Imparable</div>
                {leaders.imparable.profileIconUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={leaders.imparable.profileIconUrl} alt="" className="leader-avatar" />
                )}
                <div className="leader-name">{leaders.imparable.riotId.split('#')[0]}</div>
                <div className="leader-stat-val">{leaders.imparable.stats.kda.toFixed(2)}</div>
                <div className="leader-stat-label">Ratio KDA</div>
              </div>

              {/* Grindeador (Games) */}
              <div className="leader-card">
                <div className="leader-card-badge">PARTIDAS</div>
                <div className="leader-card-title">El Grindeador</div>
                {leaders.grindeador.profileIconUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={leaders.grindeador.profileIconUrl} alt="" className="leader-avatar" />
                )}
                <div className="leader-name">{leaders.grindeador.riotId.split('#')[0]}</div>
                <div className="leader-stat-val">{leaders.grindeador.stats.games}</div>
                <div className="leader-stat-label">Partidas Jugadas</div>
              </div>

              {/* Verdugo (Kills) */}
              <div className="leader-card">
                <div className="leader-card-badge">KILLS</div>
                <div className="leader-card-title">El Verdugo</div>
                {leaders.verdugo.profileIconUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={leaders.verdugo.profileIconUrl} alt="" className="leader-avatar" />
                )}
                <div className="leader-name">{leaders.verdugo.riotId.split('#')[0]}</div>
                <div className="leader-stat-val">{leaders.verdugo.stats.averageKills.toFixed(1)}</div>
                <div className="leader-stat-label">Kills por partida</div>
              </div>

              {/* Inmortal (Deaths) */}
              <div className="leader-card">
                <div className="leader-card-badge">DEATHS</div>
                <div className="leader-card-title">El Inmortal</div>
                {leaders.inmortal.profileIconUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={leaders.inmortal.profileIconUrl} alt="" className="leader-avatar" />
                )}
                <div className="leader-name">{leaders.inmortal.riotId.split('#')[0]}</div>
                <div className="leader-stat-val">{leaders.inmortal.stats.averageDeaths.toFixed(1)}</div>
                <div className="leader-stat-label">Muertes por partida</div>
              </div>

              {/* Escudero (Assists) */}
              <div className="leader-card">
                <div className="leader-card-badge">ASSISTS</div>
                <div className="leader-card-title">El Escudero</div>
                {leaders.escudero.profileIconUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={leaders.escudero.profileIconUrl} alt="" className="leader-avatar" />
                )}
                <div className="leader-name">{leaders.escudero.riotId.split('#')[0]}</div>
                <div className="leader-stat-val">{leaders.escudero.stats.averageAssists.toFixed(1)}</div>
                <div className="leader-stat-label">Asistencias por partida</div>
              </div>

              {/* Racha */}
              <div className="leader-card">
                <div className="leader-card-badge">RACHA</div>
                <div className="leader-card-title">Sin Frenos</div>
                {leaders.racha.profileIconUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={leaders.racha.profileIconUrl} alt="" className="leader-avatar" />
                )}
                <div className="leader-name">{leaders.racha.riotId.split('#')[0]}</div>
                <div className="leader-stat-val">
                  {leaders.racha.stats.streakType === 'W' ? `${leaders.racha.stats.streak}🔥` : '0'}
                </div>
                <div className="leader-stat-label">Racha de victorias</div>
              </div>
            </div>
          )}

          {/* Full Player Stats Table */}
          <section style={{ marginTop: '40px' }}>
            <div className="section-title">
              <h2>MÉTRICAS POR JUGADOR</h2>
              <span>Haz clic en las columnas para ordenar</span>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Invocador</th>
                    <th>Rol</th>
                    <th className="sortable-header" onClick={() => handleSort('games')}>
                      Partidas {sortField === 'games' && (sortOrder === 'desc' ? '▼' : '▲')}
                    </th>
                    <th className="sortable-header" onClick={() => handleSort('winRate')}>
                      Win Rate {sortField === 'winRate' && (sortOrder === 'desc' ? '▼' : '▲')}
                    </th>
                    <th className="sortable-header" onClick={() => handleSort('kda')}>
                      KDA {sortField === 'kda' && (sortOrder === 'desc' ? '▼' : '▲')}
                    </th>
                    <th className="sortable-header" onClick={() => handleSort('averageKills')}>
                      Kills Avg {sortField === 'averageKills' && (sortOrder === 'desc' ? '▼' : '▲')}
                    </th>
                    <th className="sortable-header" onClick={() => handleSort('averageDeaths')}>
                      Deaths Avg {sortField === 'averageDeaths' && (sortOrder === 'desc' ? '▼' : '▲')}
                    </th>
                    <th className="sortable-header" onClick={() => handleSort('averageAssists')}>
                      Assists Avg {sortField === 'averageAssists' && (sortOrder === 'desc' ? '▼' : '▲')}
                    </th>
                    <th>Racha</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPlayers.map((p) => {
                    const [name] = p.riotId.split('#');
                    return (
                      <tr key={p.riotId}>
                        <td>
                          <div className="player">
                            <div className="player-avatar-wrapper" title={p.isOnline ? "En partida" : "Desconectado"}>
                              {p.profileIconUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={p.profileIconUrl} alt="" className="player-avatar" style={{ borderRadius: '50%', border: '1px solid var(--border-gold)' }} />
                              ) : (
                                <span className="player-avatar">{name.charAt(0).toUpperCase()}</span>
                              )}
                              <span className={`status-badge ${p.isOnline ? 'online' : 'offline'}`} />
                            </div>
                            <div>
                              <span className="player-name">{p.riotId}</span>
                            </div>
                          </div>
                        </td>
                        <td className="lane-cell">
                          {p.stats.topLane && positionIcons[p.stats.topLane] ? (
                            <div className="lane-icon-wrap" title={laneNames[p.stats.topLane]}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={positionIcons[p.stats.topLane]}
                                alt={p.stats.topLane}
                                className="lane-icon"
                              />
                            </div>
                          ) : (
                            <span className="lane-empty">—</span>
                          )}
                        </td>
                        <td>{p.stats.games}</td>
                        <td className="lp" style={{ fontWeight: 'bold' }}>{p.stats.winRate}%</td>
                        <td style={{ color: p.stats.kda >= 3 ? '#00f5a0' : 'inherit' }}>
                          {p.stats.kda.toFixed(2)}
                        </td>
                        <td>{p.stats.averageKills.toFixed(1)}</td>
                        <td>{p.stats.averageDeaths.toFixed(1)}</td>
                        <td>{p.stats.averageAssists.toFixed(1)}</td>
                        <td>
                          {p.stats.streakType
                            ? `${p.stats.streak}${p.stats.streakType}`
                            : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {activeTab === 'champions' && (
        <section>
          <div className="section-title">
            <h2>MÉTRICAS POR CAMPEÓN</h2>
            <span>Desempeño general de campeones jugados</span>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Campeón</th>
                  <th>Partidas</th>
                  <th>Victorias</th>
                  <th>Derrotas</th>
                  <th>Win Rate</th>
                  <th>KDA Promedio</th>
                  <th>KDA Detalle</th>
                </tr>
              </thead>
              <tbody>
                {sortedChampions.map((c) => (
                  <tr key={c.championName}>
                    <td>
                      <div className="player">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getChampionIconUrl(c.championName, leaderboard.iconVersion)}
                          alt={c.championName}
                          className="tier-champ-icon"
                          style={{ width: '32px', height: '32px', borderRadius: '4px', border: '1px solid var(--border-gold)' }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              `https://ddragon.leagueoflegends.com/cdn/${leaderboard.iconVersion || '14.15.1'}/img/champion/Aatrox.png`;
                          }}
                        />
                        <span className="player-name" style={{ marginLeft: '10px' }}>{c.championName}</span>
                      </div>
                    </td>
                    <td>{c.games}</td>
                    <td style={{ color: 'var(--green-victory)' }}>{c.wins}</td>
                    <td style={{ color: 'var(--red-defeat)' }}>{c.losses}</td>
                    <td className="lp" style={{ fontWeight: 'bold' }}>{c.winRate}%</td>
                    <td>{c.kda.toFixed(2)}</td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {(c.kills / c.games).toFixed(1)} / {(c.deaths / c.games).toFixed(1)} / {(c.assists / c.games).toFixed(1)}
                      </span>
                    </td>
                  </tr>
                ))}
                {sortedChampions.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      No hay partidas registradas todavía.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
