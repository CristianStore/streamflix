import 'dart:convert';
import 'package:http/http.dart' as http;
import '../constants/app_constants.dart';
import '../models/media_item.dart';
import '../models/stream_ticket_model.dart';

class ApiService {
  String baseUrl;
  String? _authToken;

  ApiService({this.baseUrl = AppConstants.defaultBaseUrl});

  void setAuthToken(String? token) {
    _authToken = token;
  }

  void updateBaseUrl(String newUrl) {
    baseUrl = newUrl;
  }

  Map<String, String> _headers() {
    final map = <String, String>{
      'Content-Type': 'application/json',
    };
    if (_authToken != null && _authToken!.isNotEmpty) {
      map['Authorization'] = 'Bearer $_authToken';
    }
    return map;
  }

  Map<String, String> _catalogParams({Map<String, String> extra = const {}}) {
    return {
      'language': 'es-MX',
      'region': 'MX',
      ...extra,
    };
  }

  /// Obtiene el feed completo de Home (Hero + Categorías)
  Future<Map<String, dynamic>> getHomeFeed() async {
    final uri = Uri.parse('$baseUrl/home').replace(queryParameters: _catalogParams());
    final response = await http.get(
      uri,
      headers: _headers(),
    );

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      final hero = json['hero'] != null ? MediaItem.fromJson(json['hero']) : null;
      final categories = (json['categories'] as List<dynamic>?)
              ?.map((c) => HomeCategory.fromJson(c))
              .toList() ??
          [];
      return {'hero': hero, 'categories': categories};
    } else {
      throw Exception('Error al cargar feed de Home: ${response.statusCode}');
    }
  }

  /// Obtiene listado de películas
  Future<List<MediaItem>> getMovies({String? category, String? query}) async {
    final uri = Uri.parse('$baseUrl/movies').replace(queryParameters: {
      ..._catalogParams(),
      if (category != null) 'category': category,
      if (query != null) 'q': query,
    });

    final response = await http.get(uri, headers: _headers());
    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      return (json['data'] as List<dynamic>)
          .map((item) => MediaItem.fromJson(item))
          .toList();
    } else {
      throw Exception('Error al obtener películas');
    }
  }

  /// Obtiene detalle de película por ID
  Future<MediaItem> getMovieDetail(int id) async {
    final uri = Uri.parse('$baseUrl/movies/$id').replace(queryParameters: _catalogParams());
    final response = await http.get(
      uri,
      headers: _headers(),
    );

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      return MediaItem.fromJson(json['data']);
    } else {
      throw Exception('Error al obtener detalle de la película');
    }
  }

  /// Obtiene detalle de serie por ID
  Future<MediaItem> getSeriesDetail(int id) async {
    final uri = Uri.parse('$baseUrl/series/$id').replace(queryParameters: _catalogParams());
    final response = await http.get(
      uri,
      headers: _headers(),
    );

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      return MediaItem.fromJson(json['data']);
    } else {
      throw Exception('Error al obtener detalle de la serie');
    }
  }

  /// Paso 1: Solicita un ticket temporal cifrado para acceder al stream
  Future<StreamTicketModel> requestStreamTicket({
    required int mediaId,
    String type = 'movie',
    int? episodeId,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/stream/ticket'),
      headers: _headers(),
      body: jsonEncode({
        'mediaId': mediaId,
        'type': type,
        if (episodeId != null) 'episodeId': episodeId,
      }),
    );

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      return StreamTicketModel.fromJson(json);
    } else {
      final json = jsonDecode(response.body);
      throw Exception(json['error'] ?? 'Error al solicitar ticket de reproducción');
    }
  }

  /// Paso 2: Con el ticket temporal válido, obtiene la URL del manifiesto HLS (.m3u8)
  Future<StreamManifestResponse> getStreamManifest({
    required int mediaId,
    required String ticket,
    String type = 'movie',
    int? episodeId,
  }) async {
    final uri = Uri.parse('$baseUrl/stream/manifest').replace(queryParameters: {
      'id': mediaId.toString(),
      'ticket': ticket,
      'type': type,
      if (episodeId != null) 'episodeId': episodeId.toString(),
    });

    final response = await http.get(uri);
    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      return StreamManifestResponse.fromJson(json);
    } else {
      final json = jsonDecode(response.body);
      throw Exception(json['error'] ?? 'Acceso denegado al stream HLS');
    }
  }

  /// Valida una fuente HLS directa autorizada y devuelve sus fallbacks.
  Future<StreamManifestResponse> resolveDirectHlsSource({
    required String url,
    List<String> fallbackUrls = const [],
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/stream/direct'),
      headers: _headers(),
      body: jsonEncode({
        'url': url,
        'fallbackUrls': fallbackUrls,
      }),
    );
    final json = jsonDecode(response.body);
    if (response.statusCode == 200) {
      return StreamManifestResponse.fromJson(json);
    }
    throw Exception(json['error'] ?? 'No hay una fuente HLS disponible');
  }

  /// Obtiene los canales de TV en vivo (IPTV)
  Future<List<IptvChannel>> getIptvChannels({String? category}) async {
    final uri = Uri.parse('$baseUrl/iptv/channels').replace(queryParameters: {
      ..._catalogParams(),
      if (category != null) 'category': category,
    });

    final response = await http.get(uri);
    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      return (json['data'] as List<dynamic>)
          .map((c) => IptvChannel.fromJson(c))
          .toList();
    } else {
      throw Exception('Error al cargar canales IPTV');
    }
  }

  /// Consulta de servidores Cuevana priorizando contenido Latino
  Future<List<Map<String, dynamic>>> searchCuevana({required String title}) async {
    final uri = Uri.parse('$baseUrl/stream/cuevana/search').replace(queryParameters: {
      'title': title,
    });

    final response = await http.get(uri, headers: _headers());
    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      final data = json['data'];
      if (data is List) {
        return data.cast<Map<String, dynamic>>();
      }
    }
    return [];
  }

  /// Obtiene la lista completa de servidores disponibles desde el backend
  Future<List<Map<String, dynamic>>> getMovieServers({
    required int tmdbId,
    String type = 'movie',
    int season = 1,
    int episode = 1,
    String title = '',
    String originalTitle = '',
  }) async {
    final uri = Uri.parse('$baseUrl/stream/servers').replace(queryParameters: {
      'tmdbId': tmdbId.toString(),
      'type': type,
      'season': season.toString(),
      'episode': episode.toString(),
      if (title.isNotEmpty) 'title': title,
      if (originalTitle.isNotEmpty) 'originalTitle': originalTitle,
    });

    try {
      final response = await http.get(uri, headers: _headers()).timeout(const Duration(seconds: 8));
      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        if (json['success'] == true && json['servers'] is List) {
          return List<Map<String, dynamic>>.from(json['servers']);
        }
      }
    } catch (_) {}
    return [];
  }

  /// Películas populares en tiempo real desde TMDb
  Future<List<MediaItem>> getPopularMoviesTmdb({int page = 1}) async {
    final uri = Uri.parse('$baseUrl/movies/popular').replace(queryParameters: _catalogParams(extra: {
      'page': page.toString(),
    }));
    final response = await http.get(uri);
    if (response.statusCode == 200) {
      final List<dynamic> list = jsonDecode(response.body);
      return list.map((m) => MediaItem(
        id: m['id'] is int ? m['id'] : int.tryParse(m['id'].toString()) ?? 0,
        title: m['title'] ?? m['name'] ?? 'Película',
        overview: m['overview'] ?? '',
        poster: m['poster_path'] != null ? 'https://image.tmdb.org/t/p/w500${m['poster_path']}' : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500',
        backdrop: m['backdrop_path'] != null ? 'https://image.tmdb.org/t/p/original${m['backdrop_path']}' : null,
        rating: (m['vote_average'] is num) ? (m['vote_average'] as num).toDouble() : 7.0,
        year: (m['release_date'] ?? '').toString().split('-').first,
        type: 'movie',
      )).toList();
    }
    return [];
  }

  /// Series populares en tiempo real desde TMDb
  Future<List<MediaItem>> getPopularSeriesTmdb({int page = 1}) async {
    final uri = Uri.parse('$baseUrl/series/popular').replace(queryParameters: _catalogParams(extra: {
      'page': page.toString(),
    }));
    final response = await http.get(uri);
    if (response.statusCode == 200) {
      final List<dynamic> list = jsonDecode(response.body);
      return list.map((m) => MediaItem(
        id: m['id'] is int ? m['id'] : int.tryParse(m['id'].toString()) ?? 0,
        title: m['name'] ?? m['title'] ?? 'Serie',
        overview: m['overview'] ?? '',
        poster: m['poster_path'] != null ? 'https://image.tmdb.org/t/p/w500${m['poster_path']}' : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500',
        backdrop: m['backdrop_path'] != null ? 'https://image.tmdb.org/t/p/original${m['backdrop_path']}' : null,
        rating: (m['vote_average'] is num) ? (m['vote_average'] as num).toDouble() : 7.0,
        year: (m['first_air_date'] ?? '').toString().split('-').first,
        type: 'series',
      )).toList();
    }
    return [];
  }

  /// Buscador global TMDb
  Future<List<MediaItem>> searchTmdb(String query) async {
    final uri = Uri.parse('$baseUrl/search').replace(queryParameters: _catalogParams(extra: {
      'query': query,
    }));
    final response = await http.get(uri);
    if (response.statusCode == 200) {
      final List<dynamic> list = jsonDecode(response.body);
      return list.map((m) => MediaItem(
        id: m['id'] is int ? m['id'] : int.tryParse(m['id'].toString()) ?? 0,
        title: m['title'] ?? m['name'] ?? 'Título',
        overview: m['overview'] ?? '',
        poster: m['poster_path'] != null ? 'https://image.tmdb.org/t/p/w500${m['poster_path']}' : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500',
        backdrop: m['backdrop_path'] != null ? 'https://image.tmdb.org/t/p/original${m['backdrop_path']}' : null,
        rating: (m['vote_average'] is num) ? (m['vote_average'] as num).toDouble() : 7.0,
        year: ((m['release_date'] ?? m['first_air_date'] ?? '') as String).split('-').first,
        type: m['media_type'] ?? (m['title'] != null ? 'movie' : 'series'),
      )).toList();
    }
    return [];
  }
}
