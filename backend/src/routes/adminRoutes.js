const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Todas las rutas de administración requieren autenticación y rol de 'admin'
router.use(authenticateToken, requireAdmin);

// Gestión de usuarios
router.get('/users', adminController.getUsers);
router.patch('/users/:id/status', adminController.toggleUserStatus);

// Gestión del catálogo (Películas y Canales)
router.post('/movies', adminController.upsertMovie);
router.delete('/movies/:id', adminController.deleteMovie);

// Configuración del sistema (banner, versión mínima)
router.get('/config', adminController.getConfig);
router.post('/config', adminController.updateConfig);

module.exports = router;
