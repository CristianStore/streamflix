const axios = require('axios');
const config = require('../config/config');

const TMDB_LANGUAGE = 'es-MX';
const TMDB_REGION = 'MX';

const client = axios.create({
  baseURL: config.tmdb.baseUrl,
  timeout: 10000,
  params: {
    api_key: config.tmdb.apiKey,
    language: TMDB_LANGUAGE,
    region: TMDB_REGION
  }
});

// Mock data en caso de que no haya API key de TMDb configurada aún
const MOCK_TMDB_TRENDING = [
  {
    id: 101,
    title: "Sintel",
    original_title: "Sintel",
    overview: "Una solitaria guerrera busca a un bebé dragón huérfano con el que forjó un vínculo indestructible antes de que se lo arrebataran.",
    poster_path: "/mX3O3O1yE11C4g3.jpg",
    backdrop_path: "/bOGkgRGdhrBYJSLpXaxhXVstddV.jpg",
    release_date: "2010-09-27",
    vote_average: 7.8,
    media_type: "movie",
    genre_ids: [16, 14, 28]
  },
  {
    id: 102,
    title: "Tears of Steel",
    original_title: "Tears of Steel",
    overview: "En un futuro distópico cyberpunk en Ámsterdam, un grupo de científicos y soldados intentan salvar el planeta de una amenaza robótica.",
    poster_path: "/9z4I5vA42gH9vJ3kP.jpg",
    backdrop_path: "/d5NXSklXo0qyIYkgV94XAg1C7qU.jpg",
    release_date: "2012-09-12",
    vote_average: 7.2,
    media_type: "movie",
    genre_ids: [878, 28]
  },
  {
    id: 103,
    title: "Big Buck Bunny",
    original_title: "Big Buck Bunny",
    overview: "Un gran conejo pacífico del bosque decide tomar la justicia por su mano contra tres molestos roedores que atormentan a las criaturas indefensas.",
    poster_path: "/7WsyChvg8v0qgqX3jP.jpg",
    backdrop_path: "/7WsyChvg8v0qgqX3jP_bg.jpg",
    release_date: "2008-04-10",
    vote_average: 7.5,
    media_type: "movie",
    genre_ids: [16, 35, 10751]
  },
  {
    id: 104,
    title: "Cosmos: Crónicas Estelares",
    original_name: "Cosmos",
    overview: "Una asombrosa aventura científica a través de las estrellas y los orígenes del universo conocido.",
    poster_path: "/cosmos_poster.jpg",
    backdrop_path: "/cosmos_backdrop.jpg",
    first_air_date: "2020-03-09",
    vote_average: 8.9,
    media_type: "tv",
    genre_ids: [99]
  },
  {
    id: 105,
    title: "Interestelar",
    original_title: "Interstellar",
    overview: "Un grupo de exploradores viaja a través de un agujero de gusano en el espacio en un intento por asegurar la supervivencia de la humanidad.",
    poster_path: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    backdrop_path: "/xJHokMbljvjADYdit5fK5VQsXEG.jpg",
    release_date: "2014-11-05",
    vote_average: 8.6,
    media_type: "movie",
    genre_ids: [12, 18, 878]
  }
];

function hasValidKey() {
  const key = (config.tmdb.apiKey || '').trim();
  return Boolean(key) && key !== 'your_tmdb_api_key_here' && key.length > 10;
}

/**
 * Busca títulos por texto en TMDb
 */
async function search(query, type = 'multi', page = 1) {
  if (!hasValidKey()) {
    const q = query.toLowerCase();
    return MOCK_TMDB_TRENDING.filter(item => 
      (item.title || item.name || '').toLowerCase().includes(q) ||
      (item.overview || '').toLowerCase().includes(q)
    );
  }

  try {
    const endpoint = type === 'multi' ? '/search/multi' : `/search/${type}`;
    const response = await client.get(endpoint, {
      params: {
        api_key: config.tmdb.apiKey,
        query,
        page,
        language: TMDB_LANGUAGE,
        region: TMDB_REGION,
        include_adult: false
      }
    });
    return response.data.results || [];
  } catch (err) {
    console.warn('[TMDb Service] Error en búsqueda externa (usando respaldo):', err.message);
    const q = (query || '').toLowerCase();
    return MOCK_TMDB_TRENDING.filter(item => 
      (item.title || item.name || '').toLowerCase().includes(q) ||
      (item.overview || '').toLowerCase().includes(q)
    );
  }
}

/**
 * Obtiene el contenido en tendencia
 */
async function getTrending(type = 'all', timeWindow = 'week', page = 1) {
  if (!hasValidKey()) {
    if (type === 'movie') return MOCK_TMDB_TRENDING.filter(m => m.media_type === 'movie');
    if (type === 'tv') return MOCK_TMDB_TRENDING.filter(m => m.media_type === 'tv');
    return MOCK_TMDB_TRENDING;
  }

  try {
    const response = await client.get(`/trending/${type}/${timeWindow}`, {
      params: {
        api_key: config.tmdb.apiKey,
        page,
        language: TMDB_LANGUAGE,
        region: TMDB_REGION
      }
    });
    return response.data.results || [];
  } catch (err) {
    console.warn('[TMDb Service] Error en tendencias (usando respaldo):', err.message);
    return MOCK_TMDB_TRENDING;
  }
}

/**
 * Obtiene películas populares masivas
 */
async function getPopularMovies(page = 1) {
  if (!hasValidKey()) {
    return MOCK_TMDB_TRENDING.filter(m => m.media_type === 'movie' || !m.media_type);
  }

  try {
    const response = await client.get('/movie/popular', {
      params: {
        api_key: config.tmdb.apiKey,
        page,
        language: TMDB_LANGUAGE,
        region: TMDB_REGION
      }
    });
    return response.data.results || [];
  } catch (err) {
    console.warn('[TMDb Service] Error en películas populares (usando respaldo):', err.message);
    return MOCK_TMDB_TRENDING.filter(m => m.media_type === 'movie' || !m.media_type);
  }
}

/**
 * Obtiene series populares de televisión
 */
async function getPopularSeries(page = 1) {
  if (!hasValidKey()) {
    return MOCK_TMDB_TRENDING.filter(m => m.media_type === 'tv');
  }

  try {
    const response = await client.get('/tv/popular', {
      params: {
        api_key: config.tmdb.apiKey,
        page,
        language: TMDB_LANGUAGE,
        region: TMDB_REGION
      }
    });
    return response.data.results || [];
  } catch (err) {
    console.warn('[TMDb Service] Error en series populares (usando respaldo):', err.message);
    return MOCK_TMDB_TRENDING.filter(m => m.media_type === 'tv');
  }
}

/**
 * Obtiene detalles completos de un título (con reparto y videos/tráiler)
 */
async function getDetails(tmdbId, type = 'movie') {
  if (!hasValidKey()) {
    const found = MOCK_TMDB_TRENDING.find(item => item.id === parseInt(tmdbId, 10));
    if (found) {
      return {
        ...found,
        genres: [{ id: 1, name: 'Aventura' }, { id: 2, name: 'Ciencia Ficción' }],
        runtime: 15,
        status: 'Released'
      };
    }
  }

  const response = await client.get(`/${type}/${tmdbId}`, {
    params: {
      api_key: config.tmdb.apiKey,
      language: TMDB_LANGUAGE,
      region: TMDB_REGION,
      append_to_response: 'credits,videos'
    }
  });

  return response.data;
}

/**
 * Normaliza un objeto TMDb al esquema interno del catálogo
 */
function normalizeTMDbItem(tmdbData, defaultStreamUrl) {
  const isMovie = tmdbData.title !== undefined || tmdbData.media_type === 'movie';
  const posterPath = tmdbData.poster_path 
    ? (tmdbData.poster_path.startsWith('http') ? tmdbData.poster_path : `${config.tmdb.imageBaseUrl}/w500${tmdbData.poster_path}`)
    : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80';
    
  const backdropPath = tmdbData.backdrop_path 
    ? (tmdbData.backdrop_path.startsWith('http') ? tmdbData.backdrop_path : `${config.tmdb.imageBaseUrl}/original${tmdbData.backdrop_path}`)
    : 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1280&q=80';

  return {
    tmdbId: tmdbData.id,
    type: isMovie ? 'movie' : 'series',
    title: tmdbData.title || tmdbData.name || 'Sin título',
    originalTitle: tmdbData.original_title || tmdbData.original_name || '',
    overview: tmdbData.overview || 'Sin descripción disponible.',
    poster: posterPath,
    backdrop: backdropPath,
    releaseDate: tmdbData.release_date || tmdbData.first_air_date || new Date().toISOString().split('T')[0],
    rating: tmdbData.vote_average ? Math.round(tmdbData.vote_average * 10) / 10 : 0.0,
    genres: tmdbData.genres ? tmdbData.genres.map(g => g.name) : ['Acción', 'Streaming'],
    durationMinutes: tmdbData.runtime || 120,
    streamUrl: defaultStreamUrl || "https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8",
    isFeatured: true
  };
}

module.exports = {
  search,
  getTrending,
  getPopularMovies,
  getPopularSeries,
  getDetails,
  normalizeTMDbItem
};
