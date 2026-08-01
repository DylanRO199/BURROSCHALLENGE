import type { RecentMatchResult } from '@/domain/types';

function getOpggChampionIcon(championName?: string) {
  if (!championName) return 'https://opgg-static.akamaized.net/images/lol/champion/Fiddlesticks.png';
  return `https://opgg-static.akamaized.net/meta/images/lol/latest/champion/${championName}.png`;
}

export function RecentResults({
  results,
}: {
  results: Array<RecentMatchResult | 'W' | 'L'>;
}) {
  if (!results || results.length === 0) return <span>—</span>;

  return (
    <span className="results" aria-label={`${results.length} resultados recientes`}>
      {results.slice(0, 10).map((item, index) => {
        const isObject = typeof item === 'object' && item !== null;
        const resultType = isObject ? item.result : item;
        const championName = isObject ? item.championName : undefined;
        let outcomeText = 'Derrota';
        if (resultType === 'W') outcomeText = 'Victoria';
        else if (resultType === 'R') outcomeText = 'Remake';
        const kdaText =
          isObject && item.kills !== undefined
            ? `${item.kills} / ${item.deaths} / ${item.assists}`
            : null;

        return (
          <div key={index} className="result-container">
            <span
              className={`result ${resultType.toLowerCase()}`}
            />
            <div className="result-tooltip">
              {championName && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={getOpggChampionIcon(championName)}
                  alt={championName}
                  className="tooltip-champ-img"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://opgg-static.akamaized.net/images/lol/champion/${championName}.png`;
                  }}
                />
              )}
              <div className="tooltip-text">
                <span className="tooltip-champ-name">
                  {championName || 'Partida'}
                </span>
                <span className={`tooltip-outcome ${resultType.toLowerCase()}`}>
                  {outcomeText} {kdaText ? `(${kdaText})` : ''}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </span>
  );
}
