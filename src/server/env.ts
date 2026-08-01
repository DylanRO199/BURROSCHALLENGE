import 'server-only';
import { z } from 'zod';

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  RIOT_API_KEY: z.string().min(20).transform((val) => val.replace(/^['"]|['"]$/g, '').trim()),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function readServerEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error('Configuración de servidor inválida');
  }
  return parsed.data;
}