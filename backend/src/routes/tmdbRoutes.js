const express = require('express');
const router = express.Router();
const tmdbController = require('../controllers/tmdbController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Consultas públicas masivas
router.get('/popular', tmdbController.getPopular);
router.get('/series', tmdbController.getSeries);
router.get('/trending', tmdbController.getTrending);
router.get('/search', tmdbController.search);
router.get('/details/:type/:id', tmdbController.getDetails);

// Importar título al catálogo local (requiere admin)
router.post('/import', authenticateToken, requireAdmin, tmdbController.importFromTMDb);

module.exports = router;
