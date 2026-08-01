import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import pg from 'pg';

async function main() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  const check = await client.query('SELECT count(*) FROM player_matches WHERE duration_seconds < 240');
  console.log(`Found ${check.rows[0].count} historical remake matches.`);

  if (parseInt(check.rows[0].count, 10) > 0) {
    const del = await client.query('DELETE FROM player_matches WHERE duration_seconds < 240 RETURNING *');
    console.log('Deleted matches:', del.rows.map(r => ({ id: r.id, matchId: r.match_id, duration: r.duration_seconds })));
  }

  await client.end();
}

main().catch(console.error);
