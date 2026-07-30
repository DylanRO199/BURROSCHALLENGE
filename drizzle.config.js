/** @type {import('drizzle-kit').Config} */

require('dotenv').config({
  path: '.env.local',
});

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL es obligatorio para ejecutar las migraciones de Drizzle.'
  );
}

module.exports = {
  dialect: 'postgresql',
  schema: './src/server/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: databaseUrl,
  },
};