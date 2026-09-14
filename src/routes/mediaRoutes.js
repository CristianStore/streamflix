const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/mediaController');
const streamController = require('../controllers/streamController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Feed completo para pantalla Home
router.get('/home', mediaController.getHomeFeed);

// 1. Películas Populares y Recientes (TMDb /api/movies/popular)
router.get('/movies/popular', async (req, res) => {
  try {
    const tmdbService = require('../services/tmdbService');
    const { page } = req.query;
    const results = await tmdbService.getPopularMovies(page ? parseInt(page, 10) : 1);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar TMDb' });
  }
});

// 2. Series Populares y Recientes (TMDb /api/series/popular)
router.get('/series/popular', async (req, res) => {
  try {
    const tmdbService = require('../services/tmdbService');
    const { page } = req.query;
    const results = await tmdbService.getPopularSeries(page ? parseInt(page, 10) : 1);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar series en TMDb' });
  }
});

// 3. Buscador Global (/api/search?query=...)
router.get('/search', async (req, res) => {
  const query = req.query.query || req.query.q;
  if (!query) {
    return res.status(400).json({ error: 'Parámetro query requerido' });
  }
  try {
    const tmdbService = require('../services/tmdbService');
    const results = await tmdbService.search(query, 'multi');
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Error en la búsqueda' });
  }
});

// Películas
router.get('/movies', mediaController.getMovies);
router.get('/movies/:id', mediaController.getMovieById);
router.post('/movies', authenticateToken, requireAdmin, mediaController.createMovie);
router.put('/movies/:id', authenticateToken, requireAdmin, mediaController.updateMovie);
router.delete('/movies/:id', authenticateToken, requireAdmin, mediaController.deleteMovie);

// Endpoint directo compatible con especificación rápida del usuario
router.get('/movies/:id/stream', authenticateToken, streamController.getDirectMovieStream);

// Series
router.get('/series', mediaController.getSeries);
router.get('/series/:id', mediaController.getSeriesById);
router.post('/series', authenticateToken, requireAdmin, mediaController.createSeries);
router.delete('/series/:id', authenticateToken, requireAdmin, mediaController.deleteSeries);

// Sincronización semanal del catálogo
router.post('/catalog/sync', async (req, res) => {
  const catalogSyncService = require('../services/catalogSyncService');
  const result = await catalogSyncService.syncWeeklyCatalog();
  return res.json({ success: true, ...result });
});

router.get('/catalog/sync-status', (req, res) => {
  const catalogSyncService = require('../services/catalogSyncService');
  return res.json({ success: true, status: catalogSyncService.getLastSyncStatus() });
});

module.exports = router;
