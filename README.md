# SoloQ Challenge — Vercel + Riot API

Leaderboard de League of Legends inspirado en la estructura de SoloQ Challenge.

## Requisitos

- Node.js 20.9+ (recomendado Node 24+).
- Una base de datos PostgreSQL compatible con Neon.
- Una Riot API Key válida.

## Configuración local

1. El ZIP incluye `.env.local` para desarrollo local con las credenciales proporcionadas.
2. Si necesitas reemplazarlas, edita `.env.local`:

```env
DATABASE_URL=tu_conexion_postgresql
RIOT_API_KEY=tu_riot_api_key
```

3. Instala dependencias:

```bash
npm install
```

4. Para ejecutar migraciones, Drizzle Kit leerá `DATABASE_URL` desde `.env.local`:

```powershell
npm run db:migrate
```

5. Inicia la web:

```bash
npm run dev
```

Abre `http://localhost:3000`.

## Vercel

No necesitas `vercel.json`: Vercel detecta Next.js automáticamente.

En **Project Settings → Environment Variables** agrega:

- `DATABASE_URL`
- `RIOT_API_KEY`

Después despliega de nuevo.

La clave de Riot es exclusivamente server-side: nunca uses `NEXT_PUBLIC_RIOT_API_KEY`.

Antes del primer despliegue, asegúrate de que la base de datos tenga la migración `drizzle/0000_overrated_aaron_stack.sql` aplicada. La aplicación crea automáticamente el registro base del torneo cuando accede a la base de datos.

## Participantes

Edita `config/players.json`. Para LAS usa `platform: "la2"`.

## Comandos

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
npm run start
npm run db:migrate
```


## Seguridad

`.env.local` está incluido únicamente para facilitar el arranque local y está excluido de Git mediante `.gitignore`.
No subas `.env.local` a GitHub ni lo compartas públicamente. En Vercel configura `DATABASE_URL` y `RIOT_API_KEY` en **Project Settings → Environment Variables**.
