const streamService = require('../services/streamService');
const db = require('../models/database');
const config = require('../config/config');
const axios = require('axios');
const { URL } = require('url');
const streamProviderService = require('../services/streamProviderService');

/**
 * Busca el streamUrl y título de un elemento (película o episodio de serie)
 */
function findMediaStream(mediaId, type = 'movie', episodeId = null) {
  const id = parseInt(mediaId, 10);
  if (type === 'movie') {
    const movie = db.movies.find(m => m.id === id);
    if (!movie) return null;
    return {
      id: movie.id,
      tmdbId: movie.tmdbId,
      title: movie.title,
      streamUrl: movie.streamUrl,
      type: 'movie'
    };
  } else if (type === 'series' || type === 'episode') {
    for (const serie of db.series) {
      if (serie.id === id && serie.seasons) {
        for (const season of serie.seasons) {
          if (season.episodes) {
            const ep = episodeId 
              ? season.episodes.find(e => e.id === parseInt(episodeId, 10))
              : season.episodes[0];
            if (ep) {
              return {
                id: ep.id,
                tmdbId: serie.tmdbId,
                title: `${serie.title} - ${ep.title}`,
                streamUrl: ep.streamUrl,
                type: 'series'
              };
            }
          }
        }
      }
    }
  }
  return null;
}

/**
 * Genera un ticket temporal cifrado para reproducción HLS
 * Requiere autenticación JWT
 */
function requestStreamTicket(req, res) {
  const { mediaId, type, episodeId } = req.body;
  const userId = req.user.id;

  if (!mediaId) {
    return res.status(400).json({
      success: false,
      error: 'Debe indicar el "mediaId" a reproducir'
    });
  }

  const media = findMediaStream(mediaId, type || 'movie', episodeId);
  if (!media) {
    return res.status(404).json({
      success: false,
      error: 'Contenido no encontrado o no tiene stream disponible'
    });
  }

  // Generamos ticket cifrado con tiempo de expiración
  const ticket = streamService.generateStreamTicket(userId, mediaId);
  const expiresAt = new Date(Date.now() + config.streamTokenExpirationSeconds * 1000).toISOString();

  return res.json({
    success: true,
    ticket,
    expiresAt,
    expiresInSeconds: config.streamTokenExpirationSeconds,
    streamEndpoint: `/api/stream/manifest?id=${mediaId}&ticket=${encodeURIComponent(ticket)}`
  });
}

async function getMovieServers(req, res) {
  const { tmdbId, type = 'movie', season = 1, episode = 1, title, originalTitle } = req.query;

  if (!tmdbId && !title && !originalTitle) {
    return res.status(400).json({
      success: false,
      error: 'Debe indicar el parámetro "tmdbId" o "title"'
    });
  }

  try {
    const response = await streamProviderService.getMovieServers({
      tmdbId: tmdbId ? Number(tmdbId) : 0,
      type,
      season: Number(season) || 1,
      episode: Number(episode) || 1,
      title: title || '',
      originalTitle: originalTitle || ''
    });

    return res.json({
      success: true,
      ...response
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Error al resolver servidores'
    });
  }
}

/**
 * Valida el ticket temporal y entrega la URL del manifiesto HLS (.m3u8)
 */
async function getManifest(req, res) {
  const { id, ticket, type, episodeId, redirect } = req.query;

  if (!id || !ticket) {
    return res.status(400).json({
      success: false,
      error: 'Parámetros "id" y "ticket" son obligatorios'
    });
  }

  const verification = streamService.verifyStreamTicket(ticket, id);
  if (!verification.valid) {
    return res.status(403).json({
      success: false,
      error: verification.error || 'Acceso denegado al stream'
    });
  }

  const media = findMediaStream(id, type || 'movie', episodeId);
  if (!media) {
    return res.status(404).json({
      success: false,
      error: 'El contenido multimedia ya no está disponible'
    });
  }

  const availableSources = await streamProviderService.resolveStreamSources(media);
  const selectedSource = availableSources.find(source => source.kind === 'hls' && source.audioLanguage)
    || availableSources.find(source => source.id !== 'catalog' && source.available)
    || availableSources.find(source => source.id === 'catalog')
    || availableSources[0];
  if (!selectedSource) {
    return res.status(503).json({
      success: false,
      error: 'No hay una fuente autorizada disponible para este contenido'
    });
  }

  // Si el cliente pide redirección directa (ej. reproductores nativos)
  if (redirect === 'true' || redirect === '1') {
    return res.redirect(302, selectedSource.url);
  }

  // Por defecto, se devuelve JSON seguro con la URL HLS
  return res.json({
    success: true,
    title: media.title,
    streamType: 'application/x-mpegURL',
    format: 'HLS (.m3u8)',
    url: selectedSource.url,
    provider: selectedSource.name,
    sourceType: selectedSource.kind,
    audioLanguage: selectedSource.audioLanguage || null,
    preferredAudioLanguages: streamProviderService.LATIN_AUDIO_CODES,
    fallbackSources: availableSources.map(source => ({
      url: source.url,
      type: source.kind,
      audioLanguage: source.audioLanguage || null,
      provider: source.name
    })),
    issuedTo: verification.payload.uid,
    expiresAt: new Date(verification.payload.exp).toISOString()
  });
}

/**
 * Endpoint directo protegido por JWT (compatibilidad con especificación del usuario)
 * GET /api/movies/:id/stream
 */
async function getDirectMovieStream(req, res) {
  const id = parseInt(req.params.id, 10);
  const movie = db.movies.find(m => m.id === id);

  if (!movie) {
    return res.status(404).json({
      success: false,
      error: 'Película no encontrada'
    });
  }

  // Genera ticket temporal además de devolver la URL protegida
  const ticket = streamService.generateStreamTicket(req.user.id, movie.id);

  const selectedSource = await streamProviderService.selectStreamSource(movie);
  if (!selectedSource) {
    return res.status(503).json({
      success: false,
      error: 'No hay una fuente autorizada disponible para esta película'
    });
  }

  return res.json({
    success: true,
    title: movie.title,
    url: selectedSource.url,
    ticket,
    format: selectedSource.kind === 'hls' ? 'm3u8' : 'embed',
    audioLanguage: selectedSource.audioLanguage || null,
    preferredAudioLanguages: streamProviderService.LATIN_AUDIO_CODES
  });
}

/**
 * Valida una URL HLS directa proporcionada por una fuente autorizada.
 * POST /api/stream/direct { url, fallbackUrls? }
 */
async function getDirectHlsSource(req, res) {
  const { url, fallbackUrls = [] } = req.body || {};
  const allowedHosts = (process.env.AUTHORIZED_HLS_HOSTS || '')
    .split(',')
    .map(host => host.trim().toLowerCase())
    .filter(Boolean);

  const isAuthorized = value => {
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'https:'
        && streamProviderService.isHlsUrl(parsed.toString())
        && allowedHosts.includes(parsed.hostname.toLowerCase());
    } catch (_) {
      return false;
    }
  };

  if (!isAuthorized(url)) {
    return res.status(400).json({
      success: false,
      error: 'La URL debe ser un manifiesto HTTPS .m3u8 de un host autorizado'
    });
  }

  const candidates = [url, ...(Array.isArray(fallbackUrls) ? fallbackUrls : [])]
    .filter(isAuthorized)
    .map((sourceUrl, index) => ({
      id: `direct-${index + 1}`,
      name: 'Fuente HLS autorizada',
      url: sourceUrl,
      priority: index
    }));
  const checked = [];

  for (const candidate of candidates) {
    const result = await streamProviderService.probeSource(candidate);
    if (result.available) checked.push(result);
  }

  const selected = checked.find(source => source.audioLanguage) || checked[0];
  if (!selected) {
    return res.status(502).json({ success: false, error: 'Ninguna fuente HLS autorizada está disponible' });
  }

  return res.json({
    success: true,
    url: selected.url,
    provider: selected.name,
    audioLanguage: selected.audioLanguage || null,
    preferredAudioLanguages: streamProviderService.LATIN_AUDIO_CODES,
    fallbackSources: checked.map(source => ({
      url: source.url,
      audioLanguage: source.audioLanguage || null,
      provider: source.name
    }))
  });
}

module.exports = {
  requestStreamTicket,
  getMovieServers,
  getManifest,
  getDirectMovieStream,
  getDirectHlsSource
};

// Proxy embebido: GET /api/stream/proxy?url=<encoded>
async function proxyEmbed(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ success: false, error: 'Missing url parameter' });

  let parsed;
  try {
    parsed = new URL(url);
  } catch (e) {
    return res.status(400).json({ success: false, error: 'Invalid URL' });
  }

  // Lista blanca de hosts permitidos para evitar abuso
  const ALLOWED_HOSTS = [
    'vidlink.pro',
    'player.autoembed.cc',
    'vsembed.ru',
    'morencius.com',
    'martinshop.xyz',
    'awish.pro',
    'streamwish.to',
    'streamwish.top',
    'filemoon.sx',
    'dood.li',
    'cuevana3l.pro',
    'cuevana3l.biz',
    'tungtungsahur.cuevana3l.pro',
    'nextgencloudfabric.com'
  ];
  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    return res.status(403).json({ success: false, error: 'Host not allowed' });
  }

  try {
    const resp = await axios.get(url, { responseType: 'text', timeout: 8000, headers: { 'User-Agent': 'StreamFlix-Proxy/1.0' } });
    res.set('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(resp.data);
  } catch (err) {
    return res.status(502).json({ success: false, error: 'Failed to fetch remote embed', details: err.message });
  }
}

module.exports.proxyEmbed = proxyEmbed;
