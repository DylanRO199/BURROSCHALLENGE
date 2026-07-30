import 'server-only';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { readServerEnv } from '@/server/env';

const env = readServerEnv();

const sql = neon(env.DATABASE_URL);
export const db = drizzle(sql);