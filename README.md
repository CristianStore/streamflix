# 🎬 Plataforma de Streaming de Video (Estilo Netflix / Stremio)

Proyecto completo con arquitectura cliente-servidor para streaming de películas y series con reproducción HLS (`.m3u8`), soporte para Android TV (control remoto D-pad) y protección de flujos mediante tickets temporales cifrados.

---

## 📁 Estructura del Repositorio

```
streaming_app/
├── backend/                  # Servidor Node.js + Express
│   ├── src/
│   │   ├── config/           # Variables de entorno y configuración
│   │   ├── controllers/      # Controladores (Auth, Media, TMDb, Stream)
│   │   ├── middleware/       # Autenticación JWT y roles
│   │   ├── models/           # Base de datos en memoria y semillas
│   │   ├── routes/           # Rutas Express (/auth, /movies, /series, /stream, /tmdb)
│   │   ├── services/         # Servicios de TMDb y cifrado AES de tickets
│   │   └── server.js         # Entrada principal del servidor Express
│   ├── scripts/              # Utilidades de conversión FFmpeg a HLS (.m3u8)
│   ├── tests/                # Pruebas automatizadas (13/13 tests)
│   ├── package.json
│   └── .env
│
└── frontend/                 # Aplicación Flutter (Android TV & Móvil)
    ├── android/              # Configuración Android TV (Leanback, Remote, Banner)
    ├── lib/
    │   ├── constants/        # Tema oscuro cinematográfico y constantes
    │   ├── models/           # Modelos de medios, usuario y streams
    │   ├── providers/        # Gestión de estado (AuthProvider, MediaProvider)
    │   ├── screens/          # Login, Home, Detalle y Reproductor HLS
    │   ├── services/         # Clientes HTTP y autenticación
    │   ├── widgets/          # Tarjetas TV focuseables, Hero banner, Carruseles
    │   └── main.dart         # Arranque de Flutter y multi-provider
    └── pubspec.yaml
```

---

## 🚀 Puesta en Marcha

### 1. Backend (Node.js & Express)

```bash
cd backend
npm install
npm test       # Ejecuta la suite de 13 pruebas automatizadas
npm start      # Inicia el servidor en http://localhost:3000
```

#### Credenciales de Prueba Preconfiguradas:
- **Administrador**: `admin` / `1234` (permiso para crear y modificar títulos)
- **Usuario estándar**: `demo` / `demo123`

#### Endpoints Principales:
- `POST /api/auth/login`: Autenticación y entrega de token JWT.
- `POST /api/auth/register`: Registro de nuevos usuarios.
- `GET /api/home`: Feed completo para Home (Hero banner + categorías).
- `GET /api/movies`: Catálogo de películas.
- `GET /api/series`: Catálogo de series con temporadas y episodios.
- `POST /api/stream/ticket`: Genera un ticket temporal cifrado (AES-256) válido por 15 minutos para usuarios autenticados.
- `GET /api/stream/manifest?id=...&ticket=...`: Valida el ticket y entrega la URL segura del manifiesto HLS (`.m3u8`).
- `POST /api/stream/direct`: Valida y selecciona una URL HLS directa autorizada, incluyendo fallbacks y la pista de audio detectada.
- `GET /api/movies/:id/stream`: Endpoint protegido directo (compatible con la especificación rápida).
- `GET /api/tmdb/trending` & `GET /api/tmdb/search`: Integración con The Movie Database.

#### Proveedores de reproducción autorizados

El backend prueba primero la fuente HLS configurada en el catálogo y después los proveedores autorizados definidos en `AUTHORIZED_STREAM_PROVIDERS`, separados por comas. Usa plantillas con `{tmdbId}`, `{mediaId}`, `{type}`, `{season}` y `{episode}`:

```env
AUTHORIZED_STREAM_PROVIDERS=https://media.example.com/{type}/{tmdbId}/master.m3u8
```

Solo se aceptan URLs HTTPS configuradas por el operador. El backend devuelve las fuentes disponibles en orden y el frontend HLS selecciona preferentemente `es-MX`, `es-LAT`, `es-419` o `spa`. No se realiza scraping de sitios de terceros ni se incluyen proveedores de contenido no autorizado.

---

### 2. Conversión de Video a HLS con FFmpeg

Para que los videos carguen de forma instantánea mediante fragmentación:

```bash
# Mediante el script automatizado:
node backend/scripts/convert_to_hls.js pelicula.mp4 ./public/streams/pelicula

# O directamente mediante el comando FFmpeg:
ffmpeg -i pelicula.mp4 \
  -codec:v libx264 -codec:a aac \
  -hls_time 10 -hls_playlist_type vod \
  -hls_segment_filename "segmento_%03d.ts" playlist.m3u8
```

---

### 3. Frontend (Flutter)

```bash
cd frontend
flutter pub get
flutter run
```

#### Características para Android TV:
- **Navegación por Control Remoto (D-Pad)**: Las tarjetas y botones reaccionan visualmente con animación de escala (`1.08x`), borde brillante y brillo de sombra.
- **Acceso con Botón de Selección (D-Pad Center / Enter / Espacio)**: Abre el contenido o inicia la reproducción.
- **Reproductor Chewie / HLS**:
  - D-Pad Centro / Enter: Pausar / Reanudar.
  - D-Pad Izquierda: Rebobinar 10 segundos.
  - D-Pad Derecha: Avanzar 10 segundos.
  - Tecla Atrás / Escape: Salir del reproductor.
- **Manifiesto Android TV**: Compatible con pantallas táctiles, televisores y cajas Android TV (`LEANBACK_LAUNCHER`).
