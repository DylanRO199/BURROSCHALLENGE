import type { LeaderboardDto } from '@/domain/leaderboard';
import type { Rank } from '@/domain/types';
import { RecentResults } from './RecentResults';
import { LiveBadge } from './LiveBadge';

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
            <th>V / D</th>
            <th>Win rate</th>
            <th>KDA</th>
            <th>Racha</th>
            <th>Últimas</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player) => {
            const [gameName, tagLine] = player.riotId.split('#');
            const opggUrl = `https://www.op.gg/summoners/las/${encodeURIComponent(gameName)}-${encodeURIComponent(tagLine)}`;
            return (
              <tr key={player.riotId}>
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
                        <span className="player-name">{player.riotId}</span>
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
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}