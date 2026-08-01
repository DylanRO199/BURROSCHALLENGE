import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const apiKey = process.env.RIOT_API_KEY || '';
  const matchId = 'LA2_1613400332';
  const url = `https://americas.api.riotgames.com/lol/match/v5/matches/${matchId}`;
  
  const response = await fetch(url, {
    headers: {
      'X-Riot-Token': apiKey,
      Accept: 'application/json',
    }
  });
  
  if (!response.ok) {
    throw new Error(`Riot API error: ${response.status}`);
  }
  
  const matchData = await response.json();
  console.log('Match info:', {
    gameDuration: matchData.info.gameDuration,
    gameCreation: matchData.info.gameCreation,
  });
  
  const participantsInfo = matchData.info.participants.map((p: any) => ({
    riotId: `${p.riotIdGameName || p.summonerName}#${p.riotIdTagline}`,
    win: p.win,
    gameEndedInVoid: p.gameEndedInVoid,
    gameEndedInEarlySurrender: p.gameEndedInEarlySurrender,
    teamPosition: p.teamPosition,
  }));
  console.log('Participants:', participantsInfo);
}

main().catch(console.error);
