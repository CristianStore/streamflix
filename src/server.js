// Forwarder para despliegue en Render y entornos de nube
// Permite que 'node src/server.js' funcione tanto desde la raíz como dentro de backend
const path = require('path');
const backendServer = require(path.join(__dirname, '../backend/src/server.js'));

if (backendServer && typeof backendServer.startServer === 'function') {
  backendServer.startServer();
}

module.exports = backendServer;
