const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config/config');
const { connectDatabase } = require('./config/database');

// Enrutadores
const authRoutes = require('./routes/authRoutes');
const mediaRoutes = require('./routes/mediaRoutes');
const tmdbRoutes = require('./routes/tmdbRoutes');
const streamRoutes = require('./routes/streamRoutes');
const iptvRoutes = require('./routes/iptvRoutes');
const adminRoutes = require('./routes/adminRoutes');
const authController = require('./controllers/authController');
const catalogSyncService = require('./services/catalogSyncService');

const app = express();

const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;

function scheduleWeeklyCatalogSync() {
  const runSync = () => catalogSyncService.syncWeeklyCatalog();
  const initialSync = setTimeout(runSync, 1000);
  const weeklySync = setInterval(runSync, WEEK_IN_MS);

  // No mantener vivo el proceso solo por los temporizadores durante tests o apagados.
  initialSync.unref();
  weeklySync.unref();
  return { initialSync, weeklySync };
}

// Middlewares globales
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
// Configuración de archivos estáticos sin caché para actualización instantánea en TV
app.use(express.static(path.join(__dirname, '../public'), {
  etag: false,
  maxAge: 0,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') || filePath.endsWith('.js')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    }
  }
}));

// Servir la aplicación web principal StreamFlix en la raíz y /index.html sin caché
app.get(['/', '/index.html'], (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Ruta para el Panel de Administración visual
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

// Logger simple para peticiones
app.use((req, res, next) => {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
});

// Diagnóstico / Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'StreamFlix Cloud API',
    version: '2.0.0',
    port: config.port
  });
});

// Alias directo para compatibilidad
app.post('/api/login', authController.login);

// Registro de endpoints de la API
app.use('/api/auth', authRoutes);
app.use('/api', mediaRoutes);
app.use('/api/tmdb', tmdbRoutes);
app.use('/api/stream', streamRoutes);
app.use('/api/iptv', iptvRoutes);
app.use('/api/admin', adminRoutes);

// Manejador de rutas no encontradas (404)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Ruta ${req.method} ${req.originalUrl} no encontrada`
  });
});

// Manejador central de errores
app.use((err, req, res, next) => {
  console.error('Error interno no controlado:', err);
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor'
  });
});

// Inicio del servidor solo cuando se ejecuta directamente
if (require.main === module) {
  // Inicializar conexión a base de datos (MongoDB o fallback)
  connectDatabase().then(() => {
    app.listen(config.port, () => {
      const tmdbReady = Boolean(config.tmdb.apiKey) && config.tmdb.apiKey.length > 10;
      console.log(`====================================================`);
      console.log(`🚀 StreamFlix Cloud API corriendo en el puerto: ${config.port}`);
      console.log(`📡 URL Local:      http://localhost:${config.port}`);
      console.log(`📡 Panel Admin:    http://localhost:${config.port}/admin`);
      console.log(`📡 Canales IPTV:   http://localhost:${config.port}/api/iptv/channels`);
      console.log(`📡 TMDb Masivo:    http://localhost:${config.port}/api/tmdb/popular`);
      console.log(`🔑 TMDb API Key:   ${tmdbReady ? 'activa' : 'NO CONFIGURADA (usando respaldo mock)'}`);
      console.log(`====================================================`);
      scheduleWeeklyCatalogSync();
    });
  });
}

module.exports = app;
