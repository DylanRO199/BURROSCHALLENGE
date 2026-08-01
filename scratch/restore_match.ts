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
    `UPDATE player_matches 
     SET win = true 
     WHERE match_id = 'LA2_1613400332'`
  );
  console.log('Restored Peraltone win state for LA2_1613400332 to true:', res.rowCount);

  await client.end();
}

main().catch(console.error);
