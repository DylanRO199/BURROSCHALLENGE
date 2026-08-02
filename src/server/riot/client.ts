import 'server-only';
import { parseRiotId } from '@/domain/riot-id';

export class RiotApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'RiotApiError';
  }
}

export class RiotClient {
  private readonly apiKey: string;

  constructor({ apiKey }: { apiKey: string }) {
    this.apiKey = apiKey;
  }

  private async fetch(url: string, attempt = 1, critical = true): Promise<any> {
    // Basic rate pacing: wait 50ms before any call to avoid blasting the API
    await new Promise((resolve) => setTimeout(resolve, 50));

    const response = await fetch(url, {
      headers: {
        'X-Riot-Token': this.apiKey,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (response.status === 429) {
      const retryAfterHeader = response.headers.get('Retry-After');
      const delaySeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 2;

      // Fail immediately if non-critical or if the delay is too long (prevents Vercel timeouts)
      if (!critical || delaySeconds > 5) {
        throw new RiotApiError(`Riot API rate limit: 429 (delay ${delaySeconds}s exceeds 5s threshold or non-critical)`, response.status);
      }

      if (attempt <= 3) {
        console.warn(`[Riot Rate Limit 429] URL: ${url}. Waiting ${delaySeconds}s before attempt ${attempt + 1}...`);
        await new Promise((resolve) => setTimeout(resolve, (delaySeconds * 1000) + 200));
        return this.fetch(url, attempt + 1, critical);
      }
    }

    if (!response.ok) {
      throw new RiotApiError(`Riot API error: ${response.status}`, response.status);
    }
    return response.json();
  }

  async getAccountByRiotId(riotId: string) {
    const { gameName, tagLine } = parseRiotId(riotId);
    const url = `https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
    return this.fetch(url, 1, true);
  }

  async getSummonerByPuuid(puuid: string, platform: string) {
    const url = `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`;
    return this.fetch(url, 1, true);
  }

  async getLeagueEntriesByPuuid(puuid: string, platform: string) {
    const url = `https://${platform}.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}`;
    return this.fetch(url, 1, true);
  }

  async getMatchIdsByPuuid(puuid: string, queue: number, count: number, startTime?: number, endTime?: number) {
    let url = `https://americas.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?queue=${queue}&count=${count}`;
    if (startTime !== undefined) {
      url += `&startTime=${startTime}`;
    }
    if (endTime !== undefined) {
      url += `&endTime=${endTime}`;
    }
    return this.fetch(url, 1, true);
  }

  async getMatch(matchId: string) {
    const url = `https://americas.api.riotgames.com/lol/match/v5/matches/${matchId}`;
    return this.fetch(url, 1, true);
  }

  async getActiveGameByPuuid(puuid: string, platform: string) {
    const url = `https://${platform}.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${encodeURIComponent(puuid)}`;
    return this.fetch(url, 1, false); // Spectator is non-critical, fail fast on 429
  }
}