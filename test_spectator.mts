import { config } from 'dotenv';
config({ path: '.env.local' });

const apiKey = process.env.RIOT_API_KEY;
const platform = 'la2';
const summonerId = '8UPrq4lJeF8ZemdrAd3dDNKLhrx8SmWpYmuq3vrAGByW7OF-dhEb-u4t21G0gQ_-UNVhs-prlhxi8w'; // just an example summonerId or let's find the correct one

// Let's run a check on active-games/by-summoner/
const url = `https://${platform}.api.riotgames.com/lol/spectator/v4/active-games/by-summoner/${summonerId}`;
console.log('Testing spectator v4 URL:', url);

try {
  const response = await fetch(url, {
    headers: {
      'X-Riot-Token': apiKey || '',
      Accept: 'application/json',
    },
  });
  console.log('Response Status:', response.status);
  const text = await response.text();
  console.log('Response:', text.substring(0, 300));
} catch (error) {
  console.error('Fetch failed:', error);
}
