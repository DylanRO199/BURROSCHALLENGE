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

  private async fetch(url: string) {
    const response = await fetch(url, {
      headers: {
        'X-Riot-Token': this.apiKey,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new RiotApiError(`Riot API error: ${response.status}`, response.status);
    }
    return response.json();
  }

  async getAccountByRiotId(riotId: string) {
    const { gameName, tagLine } = parseRiotId(riotId);
    const url = `https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
    return this.fetch(url);
  }

  async getSummonerByPuuid(puuid: string, platform: string) {
    const url = `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`;
    return this.fetch(url);
  }

  async getLeagueEntriesByPuuid(puuid: string, platform: string) {
    const url = `https://${platform}.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}`;
    return this.fetch(url);
  }

  async getMatchIdsByPuuid(puuid: string, queue: number, count: number) {
    const url = `https://americas.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?queue=${queue}&count=${count}`;
    return this.fetch(url);
  }

  async getMatch(matchId: string) {
    const url = `https://americas.api.riotgames.com/lol/match/v5/matches/${matchId}`;
    return this.fetch(url);
  }
}