const db = require('../models/database');

/**
 * Normaliza la respuesta para ocultar enlaces directos si no se requiere
 */
function sanitizeMedia(item) {
  const copy = { ...item };
  // Eliminamos o enmascaramos la URL directa del stream en listados generales
  // para forzar el uso del endpoint seguro /stream
  delete copy.streamUrl;
  return copy;
}

// -----------------------------------------------------------------------------
// PELÍCULAS
// -----------------------------------------------------------------------------

/**
 * Obtener listado de películas (con filtros por categoría, género o búsqueda)
 */
function getMovies(req, res) {
  const { category, genre, q, featured } = req.query;
  let results = [...db.movies];

  if (category) {
    results = results.filter(m => m.category === category);
  }

  if (genre) {
    results = results.filter(m => m.genres && m.genres.some(g => g.toLowerCase() === genre.toLowerCase()));
  }

  if (featured !== undefined) {
    const isFeatured = featured === 'true' || featured === '1';
    results = results.filter(m => m.isFeatured === isFeatured);
  }

  if (q) {
    const query = q.toLowerCase();
    results = results.filter(m => 
      m.title.toLowerCase().includes(query) || 
      (m.overview && m.overview.toLowerCase().includes(query))
    );
  }

  return res.json({
    success: true,
    total: results.length,
    data: results.map(sanitizeMedia)
  });
}

/**
 * Obtener detalle de película por ID
 */
function getMovieById(req, res) {
  const id = parseInt(req.params.id, 10);
  const movie = db.movies.find(m => m.id === id);

  if (!movie) {
    return res.status(404).json({
      success: false,
      error: 'Película no encontrada'
    });
  }

  return res.json({
    success: true,
    data: sanitizeMedia(movie)
  });
}

/**
 * Crear nueva película (Admin o usuario autorizado)
 */
function createMovie(req, res) {
  const { title, overview, poster, backdrop, releaseDate, year, rating, durationMinutes, genres, category, streamUrl, isFeatured } = req.body;

  if (!title || !streamUrl) {
    return res.status(400).json({
      success: false,
      error: 'El título y la URL del stream (.m3u8) son requeridos'
    });
  }

  const nextId = db.movies.length > 0 ? Math.max(...db.movies.map(m => m.id)) + 1 : 1;

  const newMovie = {
    id: nextId,
    type: 'movie',
    title: title.trim(),
    originalTitle: req.body.originalTitle || title.trim(),
    overview: overview || '',
    poster: poster || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80',
    backdrop: backdrop || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1280&q=80',
    releaseDate: releaseDate || new Date().toISOString().split('T')[0],
    year: year || (releaseDate ? releaseDate.split('-')[0] : new Date().getFullYear().toString()),
    rating: rating !== undefined ? Number(rating) : 0,
    durationMinutes: durationMinutes || 120,
    genres: Array.isArray(genres) ? genres : ['General'],
    category: category || 'movies',
    streamUrl: streamUrl.trim(),
    isFeatured: Boolean(isFeatured),
    createdAt: new Date().toISOString()
  };

  db.movies.push(newMovie);

  return res.status(201).json({
    success: true,
    message: 'Película creada exitosamente',
    data: sanitizeMedia(newMovie)
  });
}

/**
 * Actualizar película existente
 */
function updateMovie(req, res) {
  const id = parseInt(req.params.id, 10);
  const index = db.movies.findIndex(m => m.id === id);

  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: 'Película no encontrada'
    });
  }

  const existing = db.movies[index];
  const updated = {
    ...existing,
    ...req.body,
    id: existing.id, // ID inmutable
    updatedAt: new Date().toISOString()
  };

  db.movies[index] = updated;

  return res.json({
    success: true,
    message: 'Película actualizada correctamente',
    data: sanitizeMedia(updated)
  });
}

/**
 * Eliminar película
 */
function deleteMovie(req, res) {
  const id = parseInt(req.params.id, 10);
  const index = db.movies.findIndex(m => m.id === id);

  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: 'Película no encontrada'
    });
  }

  const [removed] = db.movies.splice(index, 1);

  return res.json({
    success: true,
    message: 'Película eliminada correctamente',
    data: { id: removed.id, title: removed.title }
  });
}

// -----------------------------------------------------------------------------
// SERIES
// -----------------------------------------------------------------------------

/**
 * Obtener listado de series
 */
function getSeries(req, res) {
  const { category, genre, q } = req.query;
  let results = [...db.series];

  if (category) {
    results = results.filter(s => s.category === category);
  }

  if (genre) {
    results = results.filter(s => s.genres && s.genres.some(g => g.toLowerCase() === genre.toLowerCase()));
  }

  if (q) {
    const query = q.toLowerCase();
    results = results.filter(s => 
      s.title.toLowerCase().includes(query) || 
      (s.overview && s.overview.toLowerCase().includes(query))
    );
  }

  // Ocultar streamUrls de episodios en listado
  const sanitized = results.map(s => {
    const copy = { ...s };
    if (copy.seasons) {
      copy.seasons = copy.seasons.map(season => ({
        ...season,
        episodes: season.episodes ? season.episodes.map(sanitizeMedia) : []
      }));
    }
    return copy;
  });

  return res.json({
    success: true,
    total: sanitized.length,
    data: sanitized
  });
}

/**
 * Obtener detalle de serie por ID
 */
function getSeriesById(req, res) {
  const id = parseInt(req.params.id, 10);
  const series = db.series.find(s => s.id === id);

  if (!series) {
    return res.status(404).json({
      success: false,
      error: 'Serie no encontrada'
    });
  }

  const copy = { ...series };
  if (copy.seasons) {
    copy.seasons = copy.seasons.map(season => ({
      ...season,
      episodes: season.episodes ? season.episodes.map(sanitizeMedia) : []
    }));
  }

  return res.json({
    success: true,
    data: copy
  });
}

/**
 * Crear nueva serie
 */
function createSeries(req, res) {
  const { title, overview, poster, backdrop, releaseDate, year, rating, genres, category, seasons } = req.body;

  if (!title) {
    return res.status(400).json({
      success: false,
      error: 'El título de la serie es requerido'
    });
  }

  const nextId = db.series.length > 0 ? Math.max(...db.series.map(s => s.id)) + 1 : 101;

  const newSeries = {
    id: nextId,
    type: 'series',
    title: title.trim(),
    originalTitle: req.body.originalTitle || title.trim(),
    overview: overview || '',
    poster: poster || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80',
    backdrop: backdrop || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1280&q=80',
    releaseDate: releaseDate || new Date().toISOString().split('T')[0],
    year: year || (releaseDate ? releaseDate.split('-')[0] : new Date().getFullYear().toString()),
    rating: rating !== undefined ? Number(rating) : 0,
    genres: Array.isArray(genres) ? genres : ['Drama'],
    category: category || 'series',
    isFeatured: Boolean(req.body.isFeatured),
    totalSeasons: seasons ? seasons.length : 1,
    seasons: seasons || [
      {
        seasonNumber: 1,
        name: 'Temporada 1',
        episodes: [
          {
            id: Number(`${nextId}01`),
            episodeNumber: 1,
            title: 'Episodio Piloto',
            overview: 'Primer episodio de la temporada.',
            durationMinutes: 45,
            streamUrl: 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8'
          }
        ]
      }
    ],
    createdAt: new Date().toISOString()
  };

  db.series.push(newSeries);

  return res.status(201).json({
    success: true,
    message: 'Serie creada exitosamente',
    data: newSeries
  });
}

/**
 * Eliminar serie
 */
function deleteSeries(req, res) {
  const id = parseInt(req.params.id, 10);
  const index = db.series.findIndex(s => s.id === id);

  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: 'Serie no encontrada'
    });
  }

  const [removed] = db.series.splice(index, 1);

  return res.json({
    success: true,
    message: 'Serie eliminada correctamente',
    data: { id: removed.id, title: removed.title }
  });
}

// -----------------------------------------------------------------------------
// FEED COMPLETO DE HOME (Categorías estilo Netflix/Stremio con datos reales de TMDb)
// -----------------------------------------------------------------------------
async function getHomeFeed(req, res) {
  try {
    let tmdbMovies = [];
    let tmdbSeries = [];
    let tmdbTrending = [];

    try {
      const tmdbService = require('../services/tmdbService');
      [tmdbMovies, tmdbSeries, tmdbTrending] = await Promise.all([
        tmdbService.getPopularMovies(1),
        tmdbService.getPopularSeries(1),
        tmdbService.getTrending('all', 'week', 1)
      ]);
    } catch (tmdbErr) {
      console.warn('Advertencia al consultar TMDb en feed:', tmdbErr.message);
    }

    function mapTmdb(item, forcedType) {
      const isMovie = forcedType ? forcedType === 'movie' : (item.media_type === 'movie' || !!item.title);
      return {
        id: item.id,
        title: isMovie ? (item.title || item.original_title || 'Película') : (item.name || item.original_name || 'Serie'),
        originalTitle: item.original_title || item.original_name || '',
        overview: item.overview || '',
        poster: item.poster_path ? ("https://image.tmdb.org/t/p/w500" + item.poster_path) : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500',
        backdrop: item.backdrop_path ? ("https://image.tmdb.org/t/p/original" + item.backdrop_path) : null,
        rating: typeof item.vote_average === 'number' ? item.vote_average : 7.0,
        year: ((item.release_date || item.first_air_date || '') + '').split('-')[0] || '2024',
        type: isMovie ? 'movie' : 'series',
        isTmdb: true
      };
    }

    const localTrending = db.movies.filter(m => m.category === 'trending' || m.isFeatured);
    const localMovies = db.movies.filter(m => m.type === 'movie');
    const localSeries = db.series;

    // Si TMDb tiene datos, usarlos con el formato exacto requerido
    const trendingItems = tmdbTrending.length > 0
      ? tmdbTrending.map(t => mapTmdb(t))
      : localTrending.map(sanitizeMedia);

    const movieItems = tmdbMovies.length > 0
      ? tmdbMovies.map(m => mapTmdb(m, 'movie'))
      : localMovies.map(sanitizeMedia);

    const seriesItems = tmdbSeries.length > 0
      ? tmdbSeries.map(s => mapTmdb(s, 'series'))
      : localSeries.map(s => { const copy = { ...s }; delete copy.seasons; return copy; });

    // Hero: el primer elemento de tendencias o el destacado local
    const heroItem = trendingItems[0] || (db.movies.find(m => m.isFeatured) || db.movies[0]);

    return res.json({
      success: true,
      hero: heroItem,
      categories: [
        {
          id: 'trending',
          title: '🔥 Tendencias Globales',
          items: trendingItems
        },
        {
          id: 'movies',
          title: '🎬 Películas Populares',
          items: movieItems
        },
        {
          id: 'series',
          title: '📺 Series Populares',
          items: seriesItems
        }
      ]
    });
  } catch (error) {
    console.error('Error en getHomeFeed:', error);
    return res.status(500).json({ success: false, error: 'Error al generar el feed' });
  }
}

module.exports = {
  getMovies,
  getMovieById,
  createMovie,
  updateMovie,
  deleteMovie,
  getSeries,
  getSeriesById,
  createSeries,
  deleteSeries,
  getHomeFeed
};
