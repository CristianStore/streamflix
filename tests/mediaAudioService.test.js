const assert = require('assert');
const { resolveAudioPreference, buildPlaybackUrl } = require('../src/services/mediaAudioService');

const media = {
  type: 'movie',
  title: 'The Batman',
  originalTitle: 'The Batman',
  audioOptions: ['Original', 'Latino']
};

const preferred = resolveAudioPreference(media, 'latino');
assert.strictEqual(preferred, 'latino', 'Debe preferir audio latino cuando existe la opción');

const url = buildPlaybackUrl({
  media,
  serverIndex: 0,
  audioMode: 'latino'
});

assert.ok(url.includes('audio=latino') || url.includes('audio_lang=es-MX') || url.includes('es-MX'), 'Debe construir una URL con parámetros de audio latino');

const originalUrl = buildPlaybackUrl({
  media,
  serverIndex: 1,
  audioMode: 'original'
});

assert.ok(originalUrl.includes('audio=original') || originalUrl.includes('audio_lang=en'), 'Debe construir una URL para audio original');

console.log('✅ Prueba de audio latino/inglés superada');
