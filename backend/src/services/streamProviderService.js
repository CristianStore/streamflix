const axios = require('axios');
const crypto = require('crypto');
const config = require('../config/config');
const cuevanaService = require('./cuevanaService');

const LATIN_AUDIO_CODES = ['es-MX', 'es-LAT', 'es-419', 'spa', 'es'];

function buildEncryptionKey() {
  const base = String(config.streamEncryptionKey || '0123456789abcdef0123456789abcdef');
  return Buffer.from(base.padEnd(32, '0').slice(0, 32), 'utf-8');
}

function encryptStreamUrl(rawUrl) {
  const iv = crypto.randomBytes(16);
  const key = buildEncryptionKey();
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

  let encrypted = cipher.update(rawUrl, 'utf-8', 'hex');
  encrypted += cipher.final('hex');

  return {
    iv: iv.toString('hex'),
    token: encrypted,
    expiresAt: Math.floor(Date.now() / 1000) + config.streamTokenExpirationSeconds
  };
}

function getConfiguredProviders() {
  const configured = (process.env.AUTHORIZED_STREAM_PROVIDERS || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
    .map((template, index) => ({
      id: `configured-${index + 1}`,
      name: `Proveedor autorizado ${index + 1}`,
      template
    }));

  const publicTests = (process.env.PUBLIC_TEST_HLS_SOURCES || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
    .map((url, index) => ({
      id: `public-test-${index + 1}`,
      name: `HLS público de prueba ${index + 1}`,
      template: url
    }));

  return [...configured, ...publicTests];
}

function expandTemplate(template, media) {
  const values = {
    tmdbId: media.tmdbId || media.id,
    mediaId: media.id,
    type: media.type === 'series' ? 'tv' : 'movie',
    season: media.season || 1,
    episode: media.episode || 1
  };

  return template.replace(/\{(tmdbId|mediaId|type|season|episode)\}/g, (_, key) => encodeURIComponent(values[key]));
}

function isHlsUrl(url) {
  return /\.m3u8(?:$|[?#])/i.test(url);
}

function isAllowedUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

async function probeSource(source) {
  if (!isAllowedUrl(source.url)) return { ...source, available: false, reason: 'invalid-url' };

  try {
    const response = await axios.get(source.url, {
      responseType: 'text',
      timeout: 5000,
      maxContentLength: 512 * 1024,
      headers: { Accept: 'application/vnd.apple.mpegurl, text/html;q=0.9' },
      validateStatus: status => status >= 200 && status < 400
    });
    const contentType = String(response.headers['content-type'] || '').toLowerCase();
    const hls = isHlsUrl(source.url) || contentType.includes('mpegurl') || String(response.data).includes('#EXTM3U');
    return {
      ...source,
      available: true,
      kind: hls ? 'hls' : 'embed',
      audioLanguage: hls ? findLatinAudioLanguage(String(response.data)) : null
    };
  } catch (error) {
    return { ...source, available: false, reason: error.code || error.message };
  }
}

function findLatinAudioLanguage(manifest) {
  const audioLines = manifest.split(/^#EXT-X-MEDIA:/m).slice(1);
  for (const line of audioLines) {
    const match = line.match(/LANGUAGE="([^"]+)"|NAME="([^"]+)"/i);
    const value = match && (match[1] || match[2]);
    if (value && LATIN_AUDIO_CODES.some(code => value.toLowerCase().includes(code.toLowerCase()))) {
      return value;
    }
  }
  return null;
}

async function resolveStreamSources(media) {
  const sources = [];
  if (media.streamUrl) {
    sources.push({ id: 'catalog', name: 'Fuente del catálogo', url: media.streamUrl, priority: 0 });
  }

  for (const provider of getConfiguredProviders()) {
    sources.push({
      id: provider.id,
      name: provider.name,
      url: expandTemplate(provider.template, media),
      priority: sources.length
    });
  }

  const results = [];
  for (const source of sources) {
    const result = await probeSource(source);
    if (result.available) {
      results.push(result);
    } else if (source.id === 'catalog' && isHlsUrl(source.url)) {
      // Preserve the configured catalog URL as a last-resort response. The
      // client can still move to configured fallbacks if this source fails.
      results.push({
        ...source,
        kind: 'hls',
        available: false,
        stale: true,
        reason: result.reason
      });
    }
  }
  return results;
}

async function selectStreamSource(media) {
  const sources = await resolveStreamSources(media);
  return sources.find(source => source.kind === 'hls' && source.audioLanguage)
    || sources.find(source => source.id !== 'catalog' && source.available)
    || sources.find(source => source.id === 'catalog')
    || sources[0]
    || null;
}

async function getMovieServers({ tmdbId, type = 'movie', season = 1, episode = 1, title = '', originalTitle = '' } = {}) {
  const normalizedType = type === 'series' || type === 'tv' ? 'tv' : 'movie';
  const safeTmdbId = Number(tmdbId ?? 0);
  const resolvedSeason = Number(season) || 1;
  const resolvedEpisode = Number(episode) || 1;

  const servers = [];

  // 1. Intentar resolver servidores en vivo desde Cuevana3 (Español Latino garantizado)
  try {
    const cuevanaLinks = await cuevanaService.resolveCuevanaStreamLinks({
      title,
      originalTitle,
      tmdbId: safeTmdbId,
      type: normalizedType === 'tv' ? 'series' : 'movie',
      season: resolvedSeason,
      episode: resolvedEpisode
    });

    if (Array.isArray(cuevanaLinks) && cuevanaLinks.length > 0) {
      cuevanaLinks.forEach((item, idx) => {
        servers.push({
          id: item.id || `cuevana-${idx + 1}`,
          name: item.name || `🇲🇽 Servidor Latino ${idx + 1} (${item.server})`,
          quality: 'HD 1080p',
          language: item.language || 'Español Latino',
          isDirect: Boolean(item.isDirect),
          format: item.format || 'embed',
          url: item.url || item.embedUrl,
          directEmbedUrl: item.directEmbedUrl || item.embedUrl,
          streamData: encryptStreamUrl(item.url || item.embedUrl)
        });
      });
    }
  } catch (err) {
    console.warn('[streamProviderService] Error resolviendo fuentes de Cuevana:', err.message);
  }

  // 2. Servidor VSEmbed con parámetro forzado de Español Latino (ds_lang=es)
  if (safeTmdbId > 0) {
    const vsembedUrl = normalizedType === 'tv'
      ? `https://vsembed.ru/embed/tv?tmdb=${safeTmdbId}&season=${resolvedSeason}&episode=${resolvedEpisode}&ds_lang=es`
      : `https://vsembed.ru/embed/movie?tmdb=${safeTmdbId}&ds_lang=es`;

    servers.push({
      id: 'server-vsembed-latino',
      name: '🇲🇽 Servidor Latino Alternativo (VSEmbed)',
      quality: 'HD 1080p',
      language: 'Español Latino',
      isDirect: false,
      format: 'embed',
      url: vsembedUrl,
      streamData: encryptStreamUrl(vsembedUrl)
    });

    // 3. Servidores internacionales de respaldo (VidLink y Autoembed)
    const vidlinkUrl = normalizedType === 'tv'
      ? `https://vidlink.pro/tv/${safeTmdbId}/${resolvedSeason}/${resolvedEpisode}?primaryColor=e50914&lang=es`
      : `https://vidlink.pro/movie/${safeTmdbId}?primaryColor=e50914&lang=es`;

    servers.push({
      id: 'server-vidlink-pro',
      name: '🌐 Servidor Multilenguaje / VO (VidLink)',
      quality: 'HD 1080p',
      language: 'Multilenguaje / Audio Original',
      isDirect: false,
      format: 'embed',
      url: vidlinkUrl,
      streamData: encryptStreamUrl(vidlinkUrl)
    });

    const autoembedUrl = normalizedType === 'tv'
      ? `https://player.autoembed.cc/embed/tv/${safeTmdbId}/${resolvedSeason}/${resolvedEpisode}?lang=es`
      : `https://player.autoembed.cc/embed/movie/${safeTmdbId}?lang=es`;

    servers.push({
      id: 'server-autoembed',
      name: '🌐 Servidor Respaldo (Autoembed)',
      quality: 'HD 720p',
      language: 'Multilenguaje / Audio Original',
      isDirect: false,
      format: 'embed',
      url: autoembedUrl,
      streamData: encryptStreamUrl(autoembedUrl)
    });
  }

  const configuredProviders = (process.env.AUTHORIZED_STREAM_PROVIDERS || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);

  if (configuredProviders.length > 0 && safeTmdbId > 0) {
    const rawTemplate = configuredProviders[0];
    const originalHlsUrl = rawTemplate
      .replace('{type}', normalizedType)
      .replace('{tmdbId}', String(safeTmdbId))
      .replace('{season}', String(resolvedSeason))
      .replace('{episode}', String(resolvedEpisode));

    servers.push({
      id: 'server-official-hls',
      name: 'Servidor Principal (HLS Nativo)',
      quality: '4K / 1080p',
      language: 'Audio Original / Latino',
      isDirect: true,
      format: 'm3u8',
      url: originalHlsUrl,
      streamData: encryptStreamUrl(originalHlsUrl)
    });
  }

  return {
    tmdbId: safeTmdbId,
    type: normalizedType,
    serversCount: servers.length,
    servers
  };
}

module.exports = {
  LATIN_AUDIO_CODES,
  isHlsUrl,
  isAllowedUrl,
  probeSource,
  resolveStreamSources,
  selectStreamSource,
  encryptStreamUrl,
  getMovieServers
};