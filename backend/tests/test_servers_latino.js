const axios = require('axios');

// Extended test including providers known to have Spanish/Latino audio
async function testServer(name, url) {
  try {
    const res = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      timeout: 5000
    });
    console.log(`[PASS] ${name} -> 200 OK`);
    return true;
  } catch (err) {
    console.log(`[FAIL] ${name} -> ${err.message}`);
    return false;
  }
}

async function run() {
  console.log('Interstellar (157336) and El Corrido de Los Santos (Nuevo titulo):');

  // Providers with known Spanish/multi-audio support
  await testServer('NontonGo/Sflix', 'https://sflix.to/movie/free-157336');
  await testServer('Flixhq.to', 'https://flixhq.to/movie/watch-interstellar-2014-157336');
  await testServer('FlixEmbed', 'https://player.flixembed.net/embed/movie/157336');
  await testServer('VidSrc.to embed', 'https://vidsrc.to/embed/movie/157336');
  await testServer('SmashyStream', 'https://embed.smashystream.com/playere.php?tmdb=157336');
  await testServer('2embed.biz', 'https://www.2embed.biz/embed/157336');
  await testServer('2embed.cc movie', 'https://2embed.cc/embed/157336');
  await testServer('wovie embed', 'https://wovie.movizplay.net/embed/movie/157336');
  await testServer('Primewire embed', 'https://www.primewire.tf/embed/movie/157336');
  await testServer('StreamFR', 'https://streamfr.onl/embed/movie/157336');
  await testServer('NontonGo', 'https://nontongo.in/embed/movie/157336');
  await testServer('RemoteStream', 'https://remotestream.cc/e/movie/157336');
  await testServer('AsianLoad embed', 'https://asianload.io/embed/movie/157336');
  await testServer('iofilm', 'https://www.iofilm.co.uk/embed/movie/157336');
}

run();
