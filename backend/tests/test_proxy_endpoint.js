const axios = require('axios');
const http = require('http');
const express = require('express');
const { proxyHls } = require('../src/controllers/streamController');

const app = express();
app.get('/api/stream/proxy-hls', proxyHls);

const server = app.listen(3099, async () => {
  try {
    const { getMovieServers } = require('../src/services/streamProviderService');
    const r = await getMovieServers({ tmdbId: 533535, title: 'Deadpool & Wolverine', type: 'movie' });
    const srv1 = r.servers[0];
    console.log('Server 1:', srv1.name);
    console.log('Server 1 URL:', srv1.url);

    // Call proxy-hls on test port
    const testUrl = `http://127.0.0.1:3099${srv1.url}`;
    console.log('Testing proxy-hls call to:', testUrl);
    
    const resp = await axios.get(testUrl);
    console.log('proxy-hls status:', resp.status);
    console.log('Content-Type:', resp.headers['content-type']);
    console.log('First 200 chars of body:\n', resp.data.slice(0, 200));
  } catch (err) {
    console.error('Error testing proxy-hls:', err.message);
    if (err.response) {
      console.error('Response status:', err.response.status);
      console.error('Response data:', err.response.data);
    }
  } finally {
    server.close();
  }
});
