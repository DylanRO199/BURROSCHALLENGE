const { Client } = require('pg');

const DB_URL = 'postgresql://postgres.ugbcytunfcdlovbuymyw:Bastian010221.%40@aws-0-ca-central-1.pooler.supabase.com:6543/postgres';
const RIOT_API_KEY = 'RGAPI-f0e2b6a8-8bf2-47f3-b449-f6274993215a';

const tournament = {
  startsAt: new Date("2026-07-30T00:00:00-04:00"),
  endsAt: new Date("2026-08-30T23:59:59-04:00")
};

async function main() {
  const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log('🧹 Limpiando la tabla player_matches para repoblar con objetos...');
  await client.query('DELETE FROM player_matches');
  console.log('player_matches vaciada con éxito.');

  const res = await client.query('SELECT id, riot_id, platform, puuid FROM players WHERE active = true');
  const players = res.rows;
  console.log(`\nPoblando partidas para ${players.length} jugadores activos...`);

  const startSec = Math.floor(tournament.startsAt.getTime() / 1000);
  const endSec = Math.floor(tournament.endsAt.getTime() / 1000);

  for (const player of players) {
    console.log(`\n----------------------------------------`);
    console.log(`Procesando partidas para: ${player.riot_id}...`);
    
    if (!player.puuid) {
      console.log(`⚠️ Jugador ${player.riot_id} no tiene PUUID. Saltando...`);
      continue;
    }

    let matchIds = [];
    try {
      const url = `https://americas.api.riotgames.com/lol/match/v5/matches/by-puuid/${player.puuid}/ids?queue=420&count=100&startTime=${startSec}&endTime=${endSec}&api_key=${RIOT_API_KEY}`;
      const response = await fetch(url);
      if (response.ok) {
        matchIds = await response.json();
        console.log(`Encontradas ${matchIds.length} partidas en Riot para ${player.riot_id}`);
      } else {
        console.error(`❌ Error al obtener ids de partidas de Riot: ${response.status} ${response.statusText}`);
        if (response.status === 429) {
          console.log('Esperando 20 segundos por rate limit...');
          await new Promise(r => setTimeout(r, 20000));
        }
        continue;
      }
    } catch (e) {
      console.error(`Fallo de conexión al obtener ids para ${player.riot_id}:`, e.message);
      continue;
    }

    if (matchIds.length === 0) {
      console.log(`No hay partidas para ${player.riot_id}.`);
      continue;
    }

    console.log(`Poblando ${matchIds.length} partidas desde Riot...`);

    for (const matchId of matchIds) {
      try {
        const matchUrl = `https://americas.api.riotgames.com/lol/match/v5/matches/${matchId}?api_key=${RIOT_API_KEY}`;
        const matchResponse = await fetch(matchUrl);
        
        if (!matchResponse.ok) {
          console.error(`❌ Error al obtener partida ${matchId}: ${matchResponse.status}`);
          if (matchResponse.status === 429) {
            console.log('Rate limit (429) alcanzado, esperando 15 segundos...');
            await new Promise(r => setTimeout(r, 15000));
          }
          continue;
        }

        const matchData = await matchResponse.json();
        const participant = matchData.info.participants.find(p => p.puuid === player.puuid);
        
        if (participant) {
          const isRemake = (participant.gameEndedInEarlySurrender === true || participant.gameEndedInVoid === true) && matchData.info.gameDuration < 240;
          const playedAt = new Date(matchData.info.gameCreation);
          const queueId = matchData.info.queueId;
          const championName = participant.championName;
          const lane = participant.teamPosition || participant.individualPosition || null;
          const win = isRemake ? null : participant.win;
          const kills = participant.kills;
          const deaths = participant.deaths;
          const assists = participant.assists;
          const durationSeconds = matchData.info.gameDuration;

          await client.query(
            `INSERT INTO player_matches (
               player_id, match_id, played_at, queue_id, champion_name, lane, win, kills, deaths, assists, duration_seconds,
               item_0, item_1, item_2, item_3, item_4, item_5, item_6
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
             ON CONFLICT DO NOTHING`,
            [
              player.id, matchId, playedAt, queueId, championName, lane, win, kills, deaths, assists, durationSeconds,
              participant.item0, participant.item1, participant.item2, participant.item3, participant.item4, participant.item5, participant.item6
            ]
          );
          console.log(`  + Guardada partida ${matchId} (${championName} - ${lane}) con items: [${participant.item0}, ${participant.item1}, ${participant.item2}]`);
        }

        // Delay de 150ms entre partidas del mismo jugador para respetar los límites de la API
        await new Promise(r => setTimeout(r, 150));
      } catch (err) {
        console.error(`Error procesando partida ${matchId}:`, err.message);
      }
    }

    // Delay de 3 segundos entre jugadores
    console.log('Esperando 3 segundos para el próximo jugador...');
    await new Promise(r => setTimeout(r, 3000));
  }

  await client.end();
  console.log('\n✅ POBLAMIENTO COMPLETO DE PARTIDAS CON OBJETOS TERMINADO.');
}

main().catch(console.error);
