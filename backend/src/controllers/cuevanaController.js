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

async function extractStream(req, res) {
  try {
    const { embedUrl } = req.query;
    if (!embedUrl) {
      return res.status(400).json({ success: false, error: 'embedUrl requerido' });
    }
    const streamUrl = await cuevanaService.extractVidhideStream(embedUrl);
    if (!streamUrl) {
      return res.status(404).json({ success: false, error: 'No se pudo extraer el flujo HLS' });
    }
    return res.json({ success: true, url: streamUrl });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  searchCuevana,
  extractStream
};

