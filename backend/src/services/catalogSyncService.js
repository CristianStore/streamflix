const tmdbService = require('./tmdbService');
const db = require('../models/database');

const DEFAULT_MOVIE_STREAM = 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8';
let lastSyncResult = {
  timestamp: new Date().toISOString(),
  importedMovies: 0,
  importedSeries: 0,
  totalMovies: 0,
  totalSeries: 0
};

function prioritizeLatinTitles(items = []) {
  return [...items].sort((a, b) => {
    const scoreA = (
      (a.original_language === 'es' ? 10 : 0) +
      (Array.isArray(a.spoken_languages) && a.spoken_languages.some(lang => String(lang.iso_639_1 || lang.name || '').toLowerCase() === 'es') ? 8 : 0) +
      ((a.popularity || 0) / 10)
    );
    const scoreB = (
      (b.original_language === 'es' ? 10 : 0) +
      (Array.isArray(b.spoken_languages) && b.spoken_languages.some(lang => String(lang.iso_639_1 || lang.name || '').toLowerCase() === 'es') ? 8 : 0) +
      ((b.popularity || 0) / 10)
    );
    return scoreB - scoreA;
  });
}

/**
 * Reemplaza o complementa el catálogo de películas con estrenos populares de TMDb en español
 */
async function syncMovies({ pages = 3 } = {}) {
  const imported = [];
  const existingByTmdbId = new Map(
    db.raw.movies
      .filter(movie => movie.tmdbId)
      .map(movie => [Number(movie.tmdbId), movie])
  );

  for (let page = 1; page <= pages; page += 1) {
    const movies = prioritizeLatinTitles(await tmdbService.getPopularMovies(page));
    for (const tmdbMovie of movies) {
      const tmdbId = Number(tmdbMovie.id);
      if (!tmdbId) continue;

      const existing = existingByTmdbId.get(tmdbId);
      const normalized = tmdbService.normalizeTMDbItem(
        tmdbMovie,
        existing?.streamUrl || DEFAULT_MOVIE_STREAM
      );

      normalized.audioOptions = ['Original', 'Latino'];
      normalized.audioLanguage = tmdbMovie.original_language || 'es';
      normalized.language = 'es-MX';

      if (existing) {
        Object.assign(existing, normalized, {
          id: existing.id,
          streamUrl: existing.streamUrl || DEFAULT_MOVIE_STREAM,
          createdAt: existing.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        continue;
      }

      const nextId = db.raw.movies.length > 0
        ? Math.max(...db.raw.movies.map(movie => Number(movie.id) || 0)) + 1
        : 1;
      normalized.id = nextId;
      normalized.category = 'movies';
      normalized.createdAt = new Date().toISOString();
      db.raw.movies.push(normalized);
      existingByTmdbId.set(tmdbId, normalized);
      imported.push(normalized);
    }
  }

  return { pages, imported: imported.length, totalMovies: db.raw.movies.length };
}

/**
 * Sincroniza series populares en emisión
 */
async function syncSeries({ pages = 2 } = {}) {
  const imported = [];
  const existingByTmdbId = new Map(
    (db.raw.series || [])
      .filter(s => s.tmdbId)
      .map(s => [Number(s.tmdbId), s])
  );

  for (let page = 1; page <= pages; page += 1) {
    try {
      const seriesList = prioritizeLatinTitles(await tmdbService.getPopularSeries(page));
      for (const tmdbSeries of seriesList) {
        const tmdbId = Number(tmdbSeries.id);
        if (!tmdbId) continue;

        const existing = existingByTmdbId.get(tmdbId);
        const normalized = tmdbService.normalizeTMDbItem(
          tmdbSeries,
          existing?.streamUrl || DEFAULT_MOVIE_STREAM
        );

        normalized.type = 'series';
        normalized.category = 'series';

        if (existing) {
          Object.assign(existing, normalized, {
            id: existing.id,
            updatedAt: new Date().toISOString()
          });
          continue;
        }

        const nextId = db.raw.series.length > 0
          ? Math.max(...db.raw.series.map(s => Number(s.id) || 0)) + 1
          : 1;
        normalized.id = nextId;
        normalized.createdAt = new Date().toISOString();
        db.raw.series.push(normalized);
        existingByTmdbId.set(tmdbId, normalized);
        imported.push(normalized);
      }
    } catch (_) {}
  }

  return { imported: imported.length, totalSeries: db.raw.series.length };
}

async function syncWeeklyCatalog() {
  try {
    const movieRes = await syncMovies({ pages: 3 });
    const seriesRes = await syncSeries({ pages: 2 });
    
    lastSyncResult = {
      timestamp: new Date().toISOString(),
      importedMovies: movieRes.imported,
      importedSeries: seriesRes.imported,
      totalMovies: movieRes.totalMovies,
      totalSeries: seriesRes.totalSeries
    };

    console.log(`[CatalogSync] Actualización semanal completada: ${movieRes.imported} películas y ${seriesRes.imported} series nuevas sincronizadas.`);
    return { success: true, ...lastSyncResult };
  } catch (error) {
    console.warn(`[CatalogSync] No se pudo actualizar el catálogo: ${error.message}`);
    return { success: false, error: error.message };
  }
}

function getLastSyncStatus() {
  return lastSyncResult;
}

module.exports = {
  syncMovies,
  syncSeries,
  syncWeeklyCatalog,
  getLastSyncStatus
};
