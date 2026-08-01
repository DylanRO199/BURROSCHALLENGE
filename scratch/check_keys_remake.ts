import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const apiKey = process.env.RIOT_API_KEY || '';
  const matchId = 'LA2_1613397637'; // 71s remake
  const url = `https://americas.api.riotgames.com/lol/match/v5/matches/${matchId}`;
  
  const response = await fetch(url, {
    headers: {
      'X-Riot-Token': apiKey,
      Accept: 'application/json',
    }
  });
  const matchData = await response.json();
  const p = matchData.info.participants[0];
  
  console.log('--- Participant Keys and Values for standard remake ---');
  for (const [key, val] of Object.entries(p)) {
    if (key.toLowerCase().includes('end') || key.toLowerCase().includes('surrender') || key.toLowerCase().includes('void') || key.toLowerCase().includes('remake') || key.toLowerCase().includes('win')) {
      console.log(`${key}:`, val);
    }
  }
}

main().catch(console.error);
