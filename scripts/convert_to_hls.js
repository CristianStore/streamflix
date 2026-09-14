/**
 * Utilidad de conversión de video MP4 a formato HLS (.m3u8 + .ts)
 * 
 * Uso:
 *   node scripts/convert_to_hls.js <archivo_origen.mp4> [directorio_destino]
 * 
 * Ejemplo:
 *   node scripts/convert_to_hls.js mi_pelicula.mp4 ./public/streams/mi_pelicula
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const inputFile = process.argv[2];
const outputDir = process.argv[3] || path.join(__dirname, '../public/streams', path.basename(inputFile || 'stream', path.extname(inputFile || 'stream')));

if (!inputFile) {
  console.log(`
========================================================================
🎬 Herramienta de Conversión HLS (HTTP Live Streaming) para StreamFlix
========================================================================
Convierte videos MP4 a listas maestras HLS (.m3u8) y segmentos .ts para 
reproducción instantánea sin buffer largo estilo Netflix / Stremio.

Uso:
  node scripts/convert_to_hls.js <archivo_video.mp4> [directorio_salida]

Ejemplo:
  node scripts/convert_to_hls.js C:\\videos\\pelicula.mp4 .\\public\\streams\\pelicula1
========================================================================
  `);
  process.exit(1);
}

if (!fs.existsSync(inputFile)) {
  console.error(`❌ Error: El archivo de origen "${inputFile}" no existe.`);
  process.exit(1);
}

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const playlistPath = path.join(outputDir, 'playlist.m3u8');
const segmentPattern = path.join(outputDir, 'segmento_%03d.ts');

console.log(`\n🚀 Iniciando conversión a HLS:`);
console.log(`   📹 Origen:  ${inputFile}`);
console.log(`   📁 Destino: ${outputDir}`);
console.log(`   📄 Lista:   ${playlistPath}\n`);

const ffmpegArgs = [
  '-i', inputFile,
  '-codec:v', 'libx264',
  '-preset', 'veryfast',
  '-codec:a', 'aac',
  '-b:a', '128k',
  '-hls_time', '10',
  '-hls_playlist_type', 'vod',
  '-hls_segment_filename', segmentPattern,
  playlistPath
];

const ffmpeg = spawn('ffmpeg', ffmpegArgs);

ffmpeg.stdout.on('data', (data) => {
  // ffmpeg envía progreso en stderr
});

ffmpeg.stderr.on('data', (data) => {
  const line = data.toString();
  if (line.includes('time=')) {
    const timeMatch = line.match(/time=(\d+:\d+:\d+\.\d+)/);
    if (timeMatch) {
      process.stdout.write(`\r⏳ Codificando segmentos HLS... Tiempo actual: ${timeMatch[1]}`);
    }
  }
});

ffmpeg.on('close', (code) => {
  if (code === 0) {
    console.log(`\n\n🎉 ¡Conversión completada con éxito!`);
    console.log(`Manifiesto generado: ${playlistPath}`);
    console.log(`Ahora puedes servir esta carpeta estática o subirla a tu CDN / servidor.`);
  } else {
    console.error(`\n❌ La conversión finalizó con código de error ${code}. Verifica que 'ffmpeg' esté instalado en tu sistema.`);
  }
});
