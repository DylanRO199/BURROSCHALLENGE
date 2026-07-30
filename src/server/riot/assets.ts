import 'server-only';

let cachedVersion: string | null = null;

export async function getDataDragonVersion() {
  if (cachedVersion) return cachedVersion;
  const response = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
  const data = await response.json();
  const version = data[0];
  if (typeof version !== 'string' || !version) throw new Error('No se pudo obtener la versión de Data Dragon');
  cachedVersion = version;
  return version;
}

export function getProfileIconUrl(iconId: number) {
  return `https://ddragon.leagueoflegends.com/cdn/${getDataDragonVersion()}/img/profileicon/${iconId}.png`;
}