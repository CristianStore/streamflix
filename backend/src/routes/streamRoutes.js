const express = require('express');
const router = express.Router();
const streamController = require('../controllers/streamController');
const cuevanaController = require('../controllers/cuevanaController');
const { authenticateToken } = require('../middleware/auth');

function wrap(fn) {
  return (req, res, next) => {
    if (typeof fn === 'function') {
      return fn(req, res, next);
    }
    return res.status(404).json({ success: false, error: 'Route handler not implemented' });
  };
}

// 1. Solicitar ticket temporal cifrado (requiere usuario autenticado con JWT)
router.post('/ticket', authenticateToken, wrap(streamController.requestStreamTicket));

// 1.1. Obtener lista de servidores disponibles para un contenido con tokens cifrados
router.get('/servers', wrap(streamController.getMovieServers));

// 2. Obtener manifiesto .m3u8 (requiere ticket temporal válido en la query o header)
router.get('/manifest', wrap(streamController.getManifest));

// Resolver dinámico para manifiestos HLS directos de hosts autorizados
router.post('/direct', authenticateToken, wrap(streamController.getDirectHlsSource));

// Consulta local/personal de enlaces de Cuevana (prioriza latino)
router.get('/cuevana/search', wrap(cuevanaController.searchCuevana));
router.get('/cuevana/extract', wrap(cuevanaController.extractStream));

// Proxy simple para recuperar páginas embed cuando el cliente no puede resolver el dominio
router.get('/proxy', wrap(streamController.proxyEmbed));
router.get('/proxy-hls', wrap(streamController.proxyHls));

module.exports = router;
