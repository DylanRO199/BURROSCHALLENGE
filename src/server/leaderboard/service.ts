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

function getAbsoluteLp(tier: string, division: string | null, lp: number): number {
	const tierOrder = [
		'IRON',
		'BRONZE',
		'SILVER',
		'GOLD',
		'PLATINUM',
		'EMERALD',
		'DIAMOND',
		'MASTER',
		'GRANDMASTER',
		'CHALLENGER'
	];
	const tierIndex = tierOrder.indexOf(tier.toUpperCase());
	if (tierIndex === -1) return 0;

	// MASTER, GRANDMASTER, CHALLENGER don't have divisions. They start at Master level
	if (tierIndex >= tierOrder.indexOf('MASTER')) {
		return 2800 + lp;
	}

	const divOrder = ['IV', 'III', 'II', 'I'];
	const divIndex = division ? divOrder.indexOf(division.toUpperCase()) : 0;
	const divisionOffset = divIndex !== -1 ? divIndex * 100 : 0;

	return tierIndex * 400 + divisionOffset + lp;
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

					const matchesForStats = await repository.getMatches(p.id, 1000);
					const matchesForRecent = matchesForStats.slice(0, 20);

					const recentResults = matchesForRecent.map((m: any) => ({
						result: (m.win === null ? 'R' : m.win ? 'W' : 'L') as 'W' | 'L' | 'R',
						championName: m.championName,
						kills: m.kills ?? 0,
						deaths: m.deaths ?? 0,
						assists: m.assists ?? 0,
					}));

					const validMatches = matchesForStats.filter((m: any) => m.win !== null);
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
					for (const m of matchesForStats) {
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
					for (const m of matchesForStats) {
						topChampionsMap[m.championName] = (topChampionsMap[m.championName] || 0) + 1;
					}
					const topChampions = Object.entries(topChampionsMap)
						.map(([name, games]) => ({ name, games }))
						.sort((a, b) => b.games - a.games)
						.slice(0, 3);

					// Most played lane
					const laneMap: Record<string, number> = {};
					for (const m of matchesForStats) {
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

					// Calculate daily LP gains and losses from today's snapshots (America/Santiago timezone)
					const todaySantiago = new Date(now().toLocaleString('en-US', { timeZone: 'America/Santiago' }));
					todaySantiago.setHours(0, 0, 0, 0);

					const daySnapshots = await repository.getRankSnapshotsForDay(p.id, todaySantiago);
					const snapshotList = [];
					if (daySnapshots.lastSnapshotBeforeToday) {
						snapshotList.push(daySnapshots.lastSnapshotBeforeToday);
					}
					snapshotList.push(...daySnapshots.snapshotsToday);

					let dailyGainedLp = 0;
					let dailyLostLp = 0;

					for (let i = 1; i < snapshotList.length; i++) {
						const currentAbs = getAbsoluteLp(snapshotList[i].tier, snapshotList[i].division, snapshotList[i].leaguePoints);
						const prevAbs = getAbsoluteLp(snapshotList[i - 1].tier, snapshotList[i - 1].division, snapshotList[i - 1].leaguePoints);
						const diff = currentAbs - prevAbs;
						if (diff > 0) {
							dailyGainedLp += diff;
						} else if (diff < 0) {
							dailyLostLp += Math.abs(diff);
						}
					}

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
							dailyGainedLp,
							dailyLostLp,
						},
						error:null,
						isOnline: p.isOnline || false,
						activeGameStartTime: p.activeGameStartTime ? p.activeGameStartTime.toISOString() : null,
						activeGameQueueId: p.activeGameQueueId ?? null,
						hasBlueShell: p.hasBlueShell || false,
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
					hasBlueShell: p.hasBlueShell,
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
