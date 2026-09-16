import 'package:flutter/material.dart';
import '../models/media_item.dart';
import '../models/stream_ticket_model.dart';
import '../services/api_service.dart';

class MediaProvider extends ChangeNotifier {
  final ApiService _apiService;

  MediaItem? _heroItem;
  List<HomeCategory> _categories = [];
  List<MediaItem> _popularMovies = [];
  List<MediaItem> _popularSeries = [];
  bool _isLoading = false;
  String? _errorMessage;

  // Estado del stream activo
  bool _isResolvingStream = false;
  String? _activeStreamUrl;
  String? _activeStreamTitle;

  MediaProvider(this._apiService);

  ApiService get apiService => _apiService;
  MediaItem? get heroItem => _heroItem;
  List<HomeCategory> get categories => _categories;
  List<MediaItem> get popularMovies => _popularMovies;
  List<MediaItem> get popularSeries => _popularSeries;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  bool get isResolvingStream => _isResolvingStream;
  String? get activeStreamUrl => _activeStreamUrl;
  String? get activeStreamTitle => _activeStreamTitle;

  Future<void> loadHomeFeed() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final feed = await _apiService.getHomeFeed();
      _heroItem = feed['hero'] as MediaItem?;
      _categories = feed['categories'] as List<HomeCategory>;

      // Extraer películas y series populares
      final movieCat = _categories.firstWhere(
        (c) => c.id == 'movies',
        orElse: () => HomeCategory(id: '', title: '', items: []),
      );
      final seriesCat = _categories.firstWhere(
        (c) => c.id == 'series',
        orElse: () => HomeCategory(id: '', title: '', items: []),
      );

      _popularMovies = movieCat.items;
      _popularSeries = seriesCat.items;

      // Si el feed inicial no traía items, consultar endpoints directos de TMDb
      if (_popularMovies.isEmpty) {
        _popularMovies = await _apiService.getPopularMoviesTmdb();
      }
      if (_popularSeries.isEmpty) {
        _popularSeries = await _apiService.getPopularSeriesTmdb();
      }

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      notifyListeners();
    }
  }

  /// Proceso en 2 pasos de seguridad:
  /// 1. Solicita ticket cifrado con el JWT del usuario
  /// 2. Con el ticket, resuelve la URL del manifiesto HLS (.m3u8)
  Future<String?> resolveHlsStream({
    required int mediaId,
    String type = 'movie',
    int? episodeId,
  }) async {
    _isResolvingStream = true;
    _errorMessage = null;
    notifyListeners();

    try {
      // Paso 1: Obtener ticket temporal seguro
      final ticketResponse = await _apiService.requestStreamTicket(
        mediaId: mediaId,
        type: type,
        episodeId: episodeId,
      );

      // Paso 2: Obtener enlace del manifiesto .m3u8 usando el ticket
      final manifestResponse = await _apiService.getStreamManifest(
        mediaId: mediaId,
        ticket: ticketResponse.ticket,
        type: type,
        episodeId: episodeId,
      );

      _activeStreamUrl = manifestResponse.url;
      _activeStreamTitle = manifestResponse.title;
      _isResolvingStream = false;
      notifyListeners();
      return _activeStreamUrl;
    } catch (e) {
      _isResolvingStream = false;
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      notifyListeners();
      return null;
    }
  }

  void clearActiveStream() {
    _activeStreamUrl = null;
    _activeStreamTitle = null;
    notifyListeners();
  }
}
