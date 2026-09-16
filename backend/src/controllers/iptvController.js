const iptvService = require('../services/iptvService');

/**
 * Listar canales IPTV (con filtro opcional por categoría o búsqueda)
 * GET /api/iptv/channels
 */
async function getChannels(req, res) {
  try {
    const { category, q, refresh } = req.query;
    let channels = await iptvService.getChannels(refresh === 'true');

    if (category) {
      channels = channels.filter(c => c.category.toLowerCase() === category.toLowerCase());
    }

    if (q) {
      const query = q.toLowerCase();
      channels = channels.filter(c => 
        c.name.toLowerCase().includes(query) || 
        c.category.toLowerCase().includes(query)
      );
    }

    return res.json({
      success: true,
      total: channels.length,
      data: channels
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Error al consultar canales IPTV: ' + err.message
    });
  }
}

/**
 * Obtener categorías de IPTV
 * GET /api/iptv/categories
 */
async function getCategories(req, res) {
  try {
    const categories = await iptvService.getCategories();
    return res.json({
      success: true,
      data: categories
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Error al obtener categorías de IPTV: ' + err.message
    });
  }
}

module.exports = {
  getChannels,
  getCategories
};
