class AppConstants {
  // URL de tu Backend en la Nube (Render.com)
  // Reemplaza 'streamflix-api' con el nombre exacto de tu servicio en Render.com
  static const String defaultBaseUrl = 'https://streamflix-api.onrender.com/api';
  static const String localHostUrl = 'http://10.0.2.2:3000/api';

  // Configuración de almacenamiento local
  static const String tokenKey = 'auth_token';
  static const String userKey = 'auth_user';

  // TMDb Image CDN
  static const String tmdbImageBaseW500 = 'https://image.tmdb.org/t/p/w500';
  static const String tmdbImageBaseOriginal = 'https://image.tmdb.org/t/p/original';

  // Título de la aplicación
  static const String appName = 'StreamFlix';
}
