import { config } from 'dotenv';
config({ path: '.env.local' });

const apiKey = process.env.RIOT_API_KEY;
const platform = 'la2';
const puuid = '4enFLXcLygKzpmWGcgswm7T-owksulM7ROlELeMsWmAe84MONeY2eaP7YDtyhwGaLMd54VxooeDZRg'; // NevivPerriard puuid

async function testUrl(name: string, url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        'X-Riot-Token': apiKey || '',
        Accept: 'application/json',
      },
    });
    console.log(`${name} - Status:`, response.status);
    const json = await response.json().catch(() => null);
    console.log(`${name} - Full Object:`, json);
    return json;
  } catch (error: any) {
    console.error(`${name} - Fetch failed:`, error.message);
  }
}

// Let's test the active-games spectator-v5 endpoints
// Endpoint A: by-puuid
await testUrl('SpectatorV5-by-puuid', `https://${platform}.api.riotgames.com/lol/spectator/v5/active-games/by-puuid/${puuid}`);

// Endpoint B: by-summoner
await testUrl('SpectatorV5-by-summoner', `https://${platform}.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${puuid}`);
