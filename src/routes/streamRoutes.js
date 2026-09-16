const express = require('express');
const router = express.Router();
const streamController = require('../controllers/streamController');
const cuevanaController = require('../controllers/cuevanaController');
const { authenticateToken } = require('../middleware/auth');

// 1. Solicitar ticket temporal cifrado (requiere usuario autenticado con JWT)
router.post('/ticket', authenticateToken, streamController.requestStreamTicket);

// 1.1. Obtener lista de servidores disponibles para un contenido con tokens cifrados
router.get('/servers', streamController.getMovieServers);

// 2. Obtener manifiesto .m3u8 (requiere ticket temporal válido en la query o header)
router.get('/manifest', streamController.getManifest);

// Resolver dinámico para manifiestos HLS directos de hosts autorizados
router.post('/direct', authenticateToken, streamController.getDirectHlsSource);

// Consulta local/personal de enlaces de Cuevana (prioriza latino)
router.get('/cuevana/search', cuevanaController.searchCuevana);
router.get('/cuevana/extract', cuevanaController.extractStream);

// Proxy simple para recuperar páginas embed cuando el cliente no puede resolver el dominio
router.get('/proxy', (req, res, next) => {
  if (typeof streamController.proxyEmbed === 'function') {
    return streamController.proxyEmbed(req, res, next);
  }
  return res.status(500).json({ error: 'proxyEmbed handler missing' });
});

router.get('/proxy-hls', (req, res, next) => {
  if (typeof streamController.proxyHls === 'function') {
    return streamController.proxyHls(req, res, next);
  }
  return res.status(500).json({ error: 'proxyHls handler missing' });
});

module.exports = router;
