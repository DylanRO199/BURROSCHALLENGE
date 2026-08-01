const response = await fetch('http://localhost:3000/');
const html = await response.text();

function findOccurrences(str, word) {
  let idx = 0;
  while ((idx = str.toLowerCase().indexOf(word, idx)) !== -1) {
    const start = Math.max(0, idx - 50);
    const end = Math.min(str.length, idx + 100);
    console.log(`Match for "${word}" at ${idx}: ...${str.substring(start, end)}...`);
    idx += word.length;
  }
}

findOccurrences(html, 'error');
findOccurrences(html, 'fail');
findOccurrences(html, 'exception');
findOccurrences(html, 'temporary_error');
findOccurrences(html, 'riot_api_key_invalid');
