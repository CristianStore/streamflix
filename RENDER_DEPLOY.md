# 🚀 Guía de Despliegue en la Nube: StreamFlix (Render.com + MongoDB Atlas)

Esta guía te explica paso a paso cómo desplegar el backend y la base de datos de StreamFlix en la nube completamente gratis en menos de 5 minutos.

---

## Paso 1: Crear Base de Datos Gratuita en MongoDB Atlas

1. Ingresa a [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) y regístrate gratis.
2. Crea un clúster gratuito (**M0 Free Tier**).
3. En la sección **Security -> Database Access**:
   - Crea un usuario de base de datos (ej. `streamadmin`) y una contraseña segura.
4. En **Security -> Network Access**:
   - Haz clic en **Add IP Address** y selecciona **Allow Access from Anywhere** (`0.0.0.0/0`) para que Render pueda conectarse.
5. En la sección **Clusters**, haz clic en **Connect** -> **Drivers** (Node.js):
   - Copia la cadena de conexión URI. Se verá similar a:
     `mongodb+srv://streamadmin:<password>@cluster0.abcde.mongodb.net/streamflix?retryWrites=true&w=majority`
   - Reemplaza `<password>` con tu contraseña.

---

## Paso 2: Desplegar el Backend en Render.com

1. Sube tu proyecto a un repositorio de GitHub (o GitLab).
2. Ve a [Render.com](https://render.com/) e inicia sesión con tu cuenta de GitHub.
3. Haz clic en **New +** y selecciona **Web Service**.
4. Conecta tu repositorio de StreamFlix.
5. Configura los siguientes campos:
   - **Name**: `streamflix-api`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node src/server.js`
   - **Instance Type**: `Free`
6. En la sección **Environment Variables**, añade las siguientes variables:
   - `TMDB_API_KEY`: Tu clave API de [The Movie Database](https://www.themoviedb.org/settings/api).
   - `JWT_SECRET`: Una clave secreta (ej. `streamflix_jwt_secret_2026`).
   - `STREAM_ENCRYPTION_KEY`: `0123456789abcdef0123456789abcdef` (32 caracteres).
   - `MONGO_URI` *(Opcional)*: Si deseas base de datos en Atlas. Si lo dejas vacío, StreamFlix usará la base de datos interna automática.
7. Haz clic en **Create Web Service**.

¡Listo! Render generará una URL pública segura con HTTPS (ej. `https://streamflix-cdarcksoul.onrender.com`). Con esta URL podrás entrar desde cualquier Smart TV, celular con datos móviles o computadora fuera de tu casa.

---

## Paso 3: Verificar los Servicios en la Nube

Una vez desplegado:
- **Catálogo y App Web/TV**: `https://streamflix-api.onrender.com/`
- **Panel de Control Admin**: `https://streamflix-api.onrender.com/admin`
- **Canales en Vivo (IPTV)**: `https://streamflix-api.onrender.com/api/iptv/channels`
- **Películas Populares TMDb**: `https://streamflix-api.onrender.com/api/tmdb/popular`
- **Diagnóstico (Health Check)**: `https://streamflix-api.onrender.com/api/health`

---

## Paso 4: Conectar la Aplicación Flutter a la Nube

En el proyecto Flutter (`frontend/lib/constants/app_constants.dart`):
Cambia la URL base por tu dominio de Render:

```dart
class AppConstants {
  // Reemplaza por tu URL de Render:
  static const String defaultBaseUrl = 'https://streamflix-api.onrender.com/api';
  ...
}
```
Y compila el APK con `flutter build apk --release` o usando el archivo `COMPILAR_APK_FLUTTER.bat`.
