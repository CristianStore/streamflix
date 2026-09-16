const tmdbService = require('../services/tmdbService');
const db = require('../models/database');

/**
 * Búsqueda global por nombre
 * GET /api/tmdb/search?q=...
 */
async function search(req, res) {
  try {
    const { q, type, page } = req.query;
    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'El parámetro de búsqueda "q" es obligatorio'
      });
    }

    const results = await tmdbService.search(q, type || 'multi', page ? parseInt(page, 10) : 1);
    return res.json({
      success: true,
      total: results.length,
      data: results
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Error al consultar TMDb: ' + err.message
    });
  }
}

/**
 * Tendencias de la semana/día
 * GET /api/tmdb/trending
 */
async function getTrending(req, res) {
  try {
    const { type, timeWindow, page } = req.query;
    const results = await tmdbService.getTrending(
      type || 'all',
      timeWindow || 'week',
      page ? parseInt(page, 10) : 1
    );
    return res.json({
      success: true,
      total: results.length,
      data: results
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Error al obtener tendencias de TMDb: ' + err.message
    });
  }
}

/**
 * Películas populares masivas
 * GET /api/tmdb/popular
 */
async function getPopular(req, res) {
  try {
    const { page } = req.query;
    const results = await tmdbService.getPopularMovies(page ? parseInt(page, 10) : 1);
    return res.json({
      success: true,
      total: results.length,
      data: results
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Error al obtener películas populares de TMDb: ' + err.message
    });
  }
}

/**
 * Series populares
 * GET /api/tmdb/series
 */
async function getSeries(req, res) {
  try {
    const { page } = req.query;
    const results = await tmdbService.getPopularSeries(page ? parseInt(page, 10) : 1);
    return res.json({
      success: true,
      total: results.length,
      data: results
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Error al obtener series populares de TMDb: ' + err.message
    });
  }
}

/**
 * Ficha técnica y detalles completos
 * GET /api/tmdb/details/:type/:id
 */
async function getDetails(req, res) {
  try {
    const { type, id } = req.params;
    const details = await tmdbService.getDetails(id, type || 'movie');
    if (!details) {
      return res.status(404).json({
        success: false,
        error: 'Título no encontrado en TMDb'
      });
    }

    return res.json({
      success: true,
      data: details
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Error al obtener detalles: ' + err.message
    });
  }
}

/**
 * Importar título de TMDb a la base de datos local
 * POST /api/tmdb/import
 */
async function importFromTMDb(req, res) {
  try {
    const { tmdbId, type, streamUrl, category } = req.body;

    if (!tmdbId) {
      return res.status(400).json({
        success: false,
        error: 'El identificador "tmdbId" es obligatorio'
      });
    }

    const mediaType = type === 'tv' ? 'tv' : 'movie';
    const tmdbData = await tmdbService.getDetails(tmdbId, mediaType);

    if (!tmdbData) {
      return res.status(404).json({
        success: false,
        error: 'No se encontró el título en TMDb'
      });
    }

    const collection = mediaType === 'movie' ? db.raw.movies : db.raw.series;
    const alreadyExists = collection.some(item => item.tmdbId === parseInt(tmdbId, 10));

    if (alreadyExists) {
      return res.status(409).json({
        success: false,
        error: 'El título ya se encuentra registrado en el catálogo'
      });
    }

    const normalized = tmdbService.normalizeTMDbItem(tmdbData, streamUrl);
    if (category) normalized.category = category;

    const nextId = collection.length > 0 ? Math.max(...collection.map(m => m.id)) + 1 : 1;
    normalized.id = nextId;

    if (mediaType === 'movie') {
      db.raw.movies.push(normalized);
    } else {
      normalized.totalSeasons = tmdbData.number_of_seasons || 1;
      normalized.seasons = [
        {
          seasonNumber: 1,
          name: 'Temporada 1',
          episodes: [
            {
              id: Number(`${nextId}01`),
              episodeNumber: 1,
              title: 'Episodio 1',
              overview: normalized.overview,
              durationMinutes: 45,
              streamUrl: streamUrl || 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8'
            }
          ]
        }
      ];
      db.raw.series.push(normalized);
    }

    return res.status(201).json({
      success: true,
      message: `${mediaType === 'movie' ? 'Película' : 'Serie'} importada correctamente`,
      data: normalized
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Error al importar título: ' + err.message
    });
  }
}

module.exports = {
  search,
  getTrending,
  getPopular,
  getSeries,
  getDetails,
  importFromTMDb
};
