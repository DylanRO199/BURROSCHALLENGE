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
					const snapshots = await repository.getRankSnapshots(p.id, 2);
					const snapshot = snapshots[0] || null;
					const prevSnapshot = snapshots[1] || null;

					const matches = await repository.getMatches(p.id, 20);

					const recentResults = matches.map((m: any) => ({
						result: (m.win === null ? 'R' : m.win ? 'W' : 'L') as 'W' | 'L' | 'R',
						championName: m.championName,
						kills: m.kills ?? 0,
						deaths: m.deaths ?? 0,
						assists: m.assists ?? 0,
					}));

					const validMatches = matches.filter((m: any) => m.win !== null);
					const games = validMatches.length;
					const wins = validMatches.filter((m: any) => m.win).length;
					const losses = games - wins;
					const winRate = games > 0 ? Math.round((wins / games) * 100) : 0;

					const totalKills = validMatches.reduce((s: number, m: any) => s + (m.kills || 0), 0);
					const totalDeaths = validMatches.reduce((s: number, m: any) => s + (m.deaths || 0), 0);
					const totalAssists = validMatches.reduce((s: number, m: any) => s + (m.assists || 0), 0);
					const kda = games > 0 ? (totalKills + totalAssists) / Math.max(1, totalDeaths) : 0;

					// streak calculation
					let streak = 0;
					let streakType: 'W' | 'L' | null = null;
					for (const m of matches) {
						if (m.win === null) continue; // Skip remakes
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

					// Most played lane
					const laneMap: Record<string, number> = {};
					for (const m of matches) {
						const l = (m as any).lane;
						if (l && l !== '' && l !== 'Invalid') laneMap[l] = (laneMap[l] || 0) + 1;
					}
					const topLane = Object.keys(laneMap).length > 0
						? Object.entries(laneMap).sort((a, b) => b[1] - a[1])[0][0]
						: null;

					const rank: Rank = snapshot
						? {
								tier: (snapshot.tier as Rank['tier']) || 'UNRANKED',
								division: (snapshot.division as Rank['division']) || null,
								leaguePoints: snapshot.leaguePoints ?? 0,
							}
						: ({ tier: 'UNRANKED', division: null, leaguePoints: 0 } as Rank);

					const prevRank = prevSnapshot
						? {
								tier: (prevSnapshot.tier as Rank['tier']) || 'UNRANKED',
								division: (prevSnapshot.division as Rank['division']) || null,
								leaguePoints: prevSnapshot.leaguePoints ?? 0,
							}
						: null;

					const profileIconId = snapshot?.profileIconId ?? p.profileIconId ?? null;
					const profileIconUrl = profileIconId ? `https://ddragon.leagueoflegends.com/cdn/${iconVersion}/img/profileicon/${profileIconId}.png` : null;

					return {
						riotId: p.riotId,
						profileIconUrl,
						rank,
						prevRank,
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
							topLane,
							seasonWins: snapshot?.seasonWins ?? 0,
							seasonLosses: snapshot?.seasonLosses ?? 0,
						},
						error:null,
						isOnline: p.isOnline || false,
						activeGameStartTime: p.activeGameStartTime ? p.activeGameStartTime.toISOString() : null,
						activeGameQueueId: p.activeGameQueueId ?? null,
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

			// Sort previous ranks to find previous positions
			const prevSorted = [...playerDtos].sort((a, b) => {
				const aRank = a.prevRank || { tier: 'UNRANKED', division: null, leaguePoints: 0 };
				const bRank = b.prevRank || { tier: 'UNRANKED', division: null, leaguePoints: 0 };

				const aTier = tierOrderIndex(aRank.tier);
				const bTier = tierOrderIndex(bRank.tier);
				if (aTier !== bTier) return aTier - bTier;

				const aDiv = divisionIndex(aRank.division);
				const bDiv = divisionIndex(bRank.division);
				if (aDiv !== bDiv) return bDiv - aDiv;

				return bRank.leaguePoints - aRank.leaguePoints;
			});

			const playersWithPosition = playerDtos.map((p, idx) => {
				const currentPosition = idx + 1;
				let positionChange = 0;
				if (p.prevRank) {
					const previousPosition = prevSorted.findIndex((x) => x.riotId === p.riotId) + 1;
					positionChange = previousPosition - currentPosition;
				}
				return {
					position: currentPosition,
					positionChange,
					riotId: p.riotId,
					profileIconUrl: p.profileIconUrl,
					rank: p.rank,
					stats: p.stats,
					error: p.error,
					isOnline: p.isOnline,
					activeGameStartTime: p.activeGameStartTime ?? null,
					activeGameQueueId: p.activeGameQueueId ?? null,
				};
			});

			const dto: LeaderboardDto = {
				tournament: {
					name: config.name,
					startsAt: config.startsAt ?? null,
					endsAt: config.endsAt ?? null,
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
