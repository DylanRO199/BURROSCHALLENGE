import 'server-only';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { readServerEnv } from '@/server/env';

const env = readServerEnv();

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export const db = drizzle(pool);