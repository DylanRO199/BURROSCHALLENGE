import type { LeaderboardDto } from '@/domain/leaderboard';
import type { Rank } from '@/domain/types';
import { RecentResults } from './RecentResults';

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

function podiumClass(position: number) {
  if (position === 1) return 'podium-gold';
  if (position === 2) return 'podium-silver';
  if (position === 3) return 'podium-bronze';
  return '';
}


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
          {players.map((player) => (
            <tr key={player.riotId}>
              <td className={`position ${podiumClass(player.position)}`}>{player.position}</td>
              <td>
                <div className="player">
                  {player.profileIconUrl ? (
                    // Data Dragon is an external Riot CDN, so Next Image optimization is not required here.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={player.profileIconUrl} alt="" />
                  ) : (
                    <span className="player-avatar">{player.riotId.charAt(0).toUpperCase()}</span>
                  )}
                  <div>
                    <span className="player-name">{player.riotId}</span>
                    {player.error === 'account_not_found' && <span className="player-error">Cuenta no encontrada</span>}
                  </div>
                </div>
              </td>
              <td className="rank">{rankLabel(player.rank)}</td>
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
          ))}
        </tbody>
      </table>
    </div>
  );
}