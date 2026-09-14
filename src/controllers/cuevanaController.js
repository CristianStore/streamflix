const cuevanaService = require('../services/cuevanaService');

async function searchCuevana(req, res) {
  try {
    const { title, originalTitle, tmdbId, imdbId, q, type, season, episode } = req.query;
    const query = title || q;

    if (!query && !originalTitle && !tmdbId) {
      return res.status(400).json({ success: false, error: 'Debe indicar un título o identificador' });
    }

    const links = await cuevanaService.resolveCuevanaStreamLinks({
      title: query,
      originalTitle,
      tmdbId: tmdbId ? Number(tmdbId) : undefined,
      type: type || 'movie',
      season: season ? Number(season) : 1,
      episode: episode ? Number(episode) : 1
    });

    return res.json({ success: true, data: Array.isArray(links) ? links : [] });
  } catch (error) {
    return res.json({
      success: true,
      data: [],
      error: error.message || 'Error buscando en Cuevana'
    });
  }
}

module.exports = {
  searchCuevana
};
