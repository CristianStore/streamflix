const axios = require('axios');
const express = require('express');
const { proxyHls } = require('../src/controllers/streamController');

const app = express();
app.get('/api/stream/proxy-hls', proxyHls);

const server = app.listen(3098, async () => {
  try {
    const { getMovieServers } = require('../src/services/streamProviderService');
    const r = await getMovieServers({ tmdbId: 533535, title: 'Deadpool & Wolverine', type: 'movie' });
    const srv1 = r.servers[0];

    const testUrl = `http://127.0.0.1:3098${srv1.url}`;
    const masterResp = await axios.get(testUrl);
    const lines = masterResp.data.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    console.log('Sub-playlist URL line:', lines[0]);

    // Fetch the sub-playlist
    const subUrl = `http://127.0.0.1:3098${lines[0]}`;
    console.log('Fetching sub-playlist:', subUrl);
    const subResp = await axios.get(subUrl);
    console.log('Sub-playlist status:', subResp.status);
    console.log('Sub-playlist first 200 chars:\n', subResp.data.slice(0, 200));

    // Get the first segment (.ts)
    const segLines = subResp.data.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    console.log('Segment line:', segLines[0]);

    const segUrl = `http://127.0.0.1:3098${segLines[0]}`;
    console.log('Fetching first segment chunk from proxy...');
    const segResp = await axios.get(segUrl, { responseType: 'arraybuffer' });
    console.log('Segment status:', segResp.status);
    console.log('Segment size (bytes):', segResp.data.length);
    console.log('Segment content-type:', segResp.headers['content-type']);
  } catch (err) {
    console.error('Error during HLS pipeline test:', err.message);
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', err.response.data);
    }
  } finally {
    server.close();
  }
});
