const mongoose = require('mongoose');
const config = require('./config');

let isConnected = false;

async function connectDatabase() {
  if (!config.mongoUri) {
    console.log('ℹ️ [DB] No se detectó MONGO_URI. Usando base de datos persistente en memoria local.');
    return false;
  }

  try {
    console.log('⏳ [DB] Conectando a MongoDB...');
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log('✅ [DB] Conexión establecida exitosamente con MongoDB.');
    return true;
  } catch (err) {
    console.warn(`⚠️ [DB] No se pudo conectar a MongoDB (${err.message}). Utilizando almacenamiento en memoria de respaldo.`);
    isConnected = false;
    return false;
  }
}

function isDbConnected() {
  return isConnected;
}

module.exports = {
  connectDatabase,
  isDbConnected
};
