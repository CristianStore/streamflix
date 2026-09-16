const axios = require('axios');

async function testServer(name, url) {
  try {
    const res = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      timeout: 5000
    });
    console.log(`[PASS] ${name} -> 200 OK (${res.data.length} bytes)`);
    return true;
  } catch (err) {
    console.log(`[FAIL] ${name} -> ${err.message}`);
    return false;
  }
}

async function run() {
  console.log('Testing servers for movie 157336 (Interstellar):');
  await testServer('vidsrc.pm (User approved)', 'https://vidsrc.pm/embed/movie/157336');
  await testServer('vidsrc.net', 'https://vidsrc.net/embed/movie/157336');
  await testServer('vidsrc.in', 'https://vidsrc.in/embed/movie/157336');
  await testServer('vidsrc.me', 'https://vidsrc.me/embed/movie/157336');
  await testServer('vidsrc.to', 'https://vidsrc.to/embed/movie/157336');
  await testServer('autoembed.co', 'https://autoembed.co/movie/tmdb/157336');
  await testServer('autoembed.to', 'https://autoembed.to/movie/tmdb/157336');
  await testServer('player.autoembed.cc', 'https://player.autoembed.cc/embed/movie/157336');
  await testServer('embed.smashystream.com', 'https://embed.smashystream.com/playere.php?tmdb=157336');
  await testServer('2embed.skin', 'https://www.2embed.skin/embed/157336');
  await testServer('2embed.cc', 'https://www.2embed.cc/embed/157336');
  await testServer('superembed.stream', 'https://superembed.stream/embed/157336');
  await testServer('rive.stream', 'https://rive.stream/embed?type=movie&id=157336');
  await testServer('embed.su', 'https://embed.su/embed/movie/157336');
}

run();
