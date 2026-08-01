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
  console.log(`Found ${check.rows[0].count} matches with duration under 240 seconds.`);

  const res = await client.query(
    'UPDATE player_matches SET win = NULL WHERE duration_seconds < 240 RETURNING *'
  );
  console.log('Updated matches to NULL win state:', res.rows.map(r => ({ id: r.id, matchId: r.match_id, duration: r.duration_seconds, win: r.win })));

  await client.end();
}

main().catch(console.error);
