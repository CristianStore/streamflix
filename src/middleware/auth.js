const jwt = require('jsonwebtoken');
const config = require('../config/config');

/**
 * Middleware para proteger rutas mediante JWT
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: 'Cabecera Authorization no encontrada. Se requiere token Bearer'
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      success: false,
      error: 'Formato de cabecera inválido. Debe ser: Bearer <token>'
    });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'El token de sesión ha expirado. Inicia sesión nuevamente'
      });
    }
    return res.status(403).json({
      success: false,
      error: 'Token inválido o no autorizado'
    });
  }
}

/**
 * Middleware opcional para permitir acceso de lectura pública o identificar usuario autenticado
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return next();
  }

  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    try {
      req.user = jwt.verify(parts[1], config.jwtSecret);
    } catch {
      // Ignorar si es inválido y continuar como anónimo
    }
  }
  next();
}

/**
 * Middleware para requerir rol de administrador
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Se requieren permisos de administrador para esta acción'
    });
  }
  next();
}

module.exports = {
  authenticateToken,
  optionalAuth,
  requireAdmin
};
