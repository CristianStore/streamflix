const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

module.exports = {
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGO_URI || '',
  jwtSecret: process.env.JWT_SECRET || 'super_secret_jwt_key_netflix_streaming_2025',
  jwtExpiresIn: '7d',
  streamEncryptionKey: process.env.STREAM_ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef',
  streamTokenExpirationSeconds: parseInt(process.env.STREAM_TOKEN_EXPIRATION_SECONDS || '900', 10),
  tmdb: {
    apiKey: process.env.TMDB_API_KEY || '',
    baseUrl: process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3',
    imageBaseUrl: process.env.TMDB_IMAGE_BASE_URL || 'https://image.tmdb.org/t/p'
  },
  iptv: {
    sourceUrl: process.env.IPTV_SOURCE_URL || 'https://iptv-org.github.io/iptv/index.m3u',
    cacheDurationMinutes: 60
  },
  app: {
    minAppVersion: '1.0.0',
    name: 'StreamFlix'
  }
};
