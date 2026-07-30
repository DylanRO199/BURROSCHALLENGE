export function RecentResults({ results }: { results: Array<'W' | 'L'> }) {
  if (results.length === 0) return <span>—</span>;

  return (
    <span className="results" aria-label={`${results.length} resultados recientes`}>
      {results.slice(0, 10).map((result, index) => (
        <span key={index} className={`result ${result.toLowerCase()}`} title={result === 'W' ? 'Victoria' : 'Derrota'} />
      ))}
    </span>
  );
}
