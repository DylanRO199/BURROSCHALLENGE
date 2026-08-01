import { Pool } from 'pg';
import { config } from 'dotenv';
config({ path: '.env.local' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const r = await pool.query("SELECT * FROM tournaments");
console.log(r.rows);
await pool.end();
