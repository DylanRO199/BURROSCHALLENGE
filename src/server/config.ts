import { z } from 'zod';
import playersJson from '../../config/players.json';
import tournamentJson from '../../config/tournament.json';
import { parseRiotId } from '@/domain/riot-id';

const playerSchema = z.object({
  riotId: z.string(),
  platform: z.literal('la2'),
});

const tournamentSchema = z.object({
  name: z.string().min(1),
  startsAt: z.string().datetime({ offset: true }).nullable(),
  endsAt: z.string().datetime({ offset: true }).nullable(),
  timezone: z.literal('America/Santiago'),
  refreshTtlSeconds: z.number().int().min(60).max(3600),
});

export type AppConfig = {
  players: Array<z.infer<typeof playerSchema>>;
  tournament: z.infer<typeof tournamentSchema>;
};

export function loadConfig(): AppConfig {
  const players = z.array(playerSchema).min(1).max(30).parse(playersJson);
  for (const player of players) {
    parseRiotId(player.riotId);
  }
  return {
    players,
    tournament: tournamentSchema.parse(tournamentJson),
  };
}