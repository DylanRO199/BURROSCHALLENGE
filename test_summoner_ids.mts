import { Pool } from 'pg';
import { config } from 'dotenv';
config({ path: '.env.local' });

const apiKey = process.env.RIOT_API_KEY;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const r = await pool.query("SELECT riot_id, puuid, platform FROM players WHERE puuid IS NOT NULL LIMIT 10");
await pool.end();

for (const row of r.rows) {
  const url = `https://${row.platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${row.puuid}`;
  const response = await fetch(url, {
    headers: {
      'X-Riot-Token': apiKey || '',
      Accept: 'application/json',
    },
  });
  const data = await response.json();
  console.log(`Player: ${row.riot_id} (${row.platform}) -> Status: ${response.status}`);
  console.log('Keys:', Object.keys(data));
  console.log('Values:', JSON.stringify(data).substring(0, 300));
  console.log('-------------------');
}
