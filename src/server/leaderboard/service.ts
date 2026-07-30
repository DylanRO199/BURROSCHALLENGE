import 'server-only';
import type { AppConfig } from '@/server/config';
import type { DrizzleLeaderboardRepository } from '@/server/db/repository';
import type { LeaderboardDto } from '@/domain/leaderboard';
import type { Rank } from '@/domain/types';

function tierOrderIndex(tier: string) {
	const order = [
		'CHALLENGER',
		'GRANDMASTER',
		'MASTER',
		'DIAMOND',
		'EMERALD',
		'PLATINUM',
		'GOLD',
		'SILVER',
		'BRONZE',
		'IRON',
		'UNRANKED',
	];
	const idx = order.indexOf(tier as any);
	return idx === -1 ? order.length : idx;
}

function divisionIndex(div: string | null) {
	if (div === 'I') return 4;
	if (div === 'II') return 3;
	if (div === 'III') return 2;
	if (div === 'IV') return 1;
	return 0;
}

export function createLeaderboardService({
	repository,
	config,
	now,
	getIconVersion,
}: {
	repository: DrizzleLeaderboardRepository;
	config: AppConfig['tournament'];
	now: () => Date;
	getIconVersion: () => Promise<string> | string;
}) {
	return {
		async getLeaderboard(): Promise<LeaderboardDto> {
			const tournament = await repository.getTournament();
			const players = await repository.getPlayers();

			const lastSuccessfulAt = tournament?.lastSuccessfulAt
				? new Date(tournament.lastSuccessfulAt).toISOString()
				: null;

			const refreshStatus = (tournament?.refreshStatus as any) || 'idle';
			const refreshTtl = tournament?.refreshTtlSeconds ?? config.refreshTtlSeconds;
			const stale = !lastSuccessfulAt || now().getTime() - new Date(lastSuccessfulAt).getTime() > refreshTtl * 1000;

			const iconVersion = typeof getIconVersion === 'function' ? await getIconVersion() : (getIconVersion as string);

			const playerDtos = await Promise.all(
				players.map(async (p: any) => {
					const snapshot = await repository.getLatestRankSnapshot(p.id);
					const matches = await repository.getMatches(p.id, 20);

					const recentResults = matches.map((m: any) => (m.win ? 'W' : 'L')) as Array<'W' | 'L'>;

					const games = matches.length;
					const wins = matches.filter((m: any) => m.win).length;
					const losses = games - wins;
					const winRate = games > 0 ? Math.round((wins / games) * 100) : 0;

					const totalKills = matches.reduce((s: number, m: any) => s + (m.kills || 0), 0);
					const totalDeaths = matches.reduce((s: number, m: any) => s + (m.deaths || 0), 0);
					const totalAssists = matches.reduce((s: number, m: any) => s + (m.assists || 0), 0);
					const kda = games > 0 ? (totalKills + totalAssists) / Math.max(1, totalDeaths) : 0;

					// streak calculation
					let streak = 0;
					let streakType: 'W' | 'L' | null = null;
					for (const m of matches) {
						const result = m.win ? 'W' : 'L';
						if (streakType === null) {
							streakType = result;
							streak = 1;
						} else if (streakType === result) {
							streak += 1;
						} else break;
					}

					const topChampionsMap: Record<string, number> = {};
					for (const m of matches) {
						topChampionsMap[m.championName] = (topChampionsMap[m.championName] || 0) + 1;
					}
					const topChampions = Object.entries(topChampionsMap)
						.map(([name, games]) => ({ name, games }))
						.sort((a, b) => b.games - a.games)
						.slice(0, 3);

					const rank: Rank = snapshot
						? {
								tier: (snapshot.tier as Rank['tier']) || 'UNRANKED',
								division: (snapshot.division as Rank['division']) || null,
								leaguePoints: snapshot.leaguePoints ?? 0,
							}
						: ({ tier: 'UNRANKED', division: null, leaguePoints: 0 } as Rank);

					const profileIconId = snapshot?.profileIconId ?? p.profileIconId ?? null;
					const profileIconUrl = profileIconId ? `https://ddragon.leagueoflegends.com/cdn/${iconVersion}/img/profileicon/${profileIconId}.png` : null;

					return {
						riotId: p.riotId,
						profileIconUrl,
						rank,
						stats: {
							games,
							wins,
							losses,
							winRate,
							streak,
							streakType,
							kda,
							averageKills: games > 0 ? totalKills / games : 0,
							averageDeaths: games > 0 ? totalDeaths / games : 0,
							averageAssists: games > 0 ? totalAssists / games : 0,
							recentResults,
							topChampions,
						},
						error:null,
					};
				})
			);

			// Sort and assign positions
			playerDtos.sort((a, b) => {
				const aTier = tierOrderIndex(a.rank.tier);
				const bTier = tierOrderIndex(b.rank.tier);
				if (aTier !== bTier) return aTier - bTier;
				const aDiv = divisionIndex(a.rank.division);
				const bDiv = divisionIndex(b.rank.division);
				if (aDiv !== bDiv) return bDiv - aDiv; // I (4) before IV (1)
				return b.rank.leaguePoints - a.rank.leaguePoints;
			});

			const playersWithPosition = playerDtos.map((p, idx) => ({ ...p, position: idx + 1 }));

			const dto: LeaderboardDto = {
				tournament: {
					name: config.name,
					startsAt: config.startsAt ?? null,
				},
				refresh: {
					status: refreshStatus,
					lastSuccessfulAt,
					stale,
				},
				players: playersWithPosition,
			};

			return dto;
		},
	};
}
