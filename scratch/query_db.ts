import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import pg from 'pg';

async function main() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  const res = await client.query(
    `SELECT pm.match_id, pm.duration_seconds, pm.win, pm.champion_name, pm.played_at, p.riot_id 
     FROM player_matches pm
     JOIN players p ON pm.player_id = p.id
     ORDER BY pm.played_at DESC 
     LIMIT 20`
  );
  console.log('--- RECENT MATCHES IN DB ---');
  console.log(JSON.stringify(res.rows, null, 2));

  await client.end();
}

main().catch(console.error);
