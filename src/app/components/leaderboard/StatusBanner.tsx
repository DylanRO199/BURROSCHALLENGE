import type { PublicRefreshStatus } from '@/domain/leaderboard';

type Props = {
  status: PublicRefreshStatus;
  lastSuccessfulAt: string | null;
};

function formattedTimestamp(timestamp: string | null) {
  if (!timestamp) return 'sin actualizaciones exitosas todavía';
  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Santiago',
  }).format(new Date(timestamp));
}

export function StatusBanner({ status, lastSuccessfulAt }: Props) {
  if (status === 'riot_api_key_invalid') {
    return (
      <div className="status">
        ⚠ La API key de Riot venció o no es válida
        Actualiza `RIOT_API_KEY` en Vercel y vuelve a desplegar.
        Se están mostrando los últimos datos guardados ({formattedTimestamp(lastSuccessfulAt)}).
      </div>
    );
  }

  if (status === 'temporary_error') {
    return <div className="status">No se pudo actualizar ahora. Mostramos los últimos datos guardados.</div>;
  }

  if (status === 'refreshing') {
    return <div className="status">Actualizando datos de Riot… La tabla seguirá disponible durante el proceso.</div>;
  }

  return null;
}