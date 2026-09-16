import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../constants/app_theme.dart';
import '../models/media_item.dart';
import '../providers/media_provider.dart';
import '../services/api_service.dart';
import 'player_screen.dart';

class DetailScreen extends StatefulWidget {
  final MediaItem item;

  const DetailScreen({Key? key, required this.item}) : super(key: key);

  @override
  State<DetailScreen> createState() => _DetailScreenState();
}

class _DetailScreenState extends State<DetailScreen> {
  final FocusNode _playButtonFocusNode = FocusNode();
  bool _isPlayFocused = false;
  String _audioMode = 'latino';
  bool _isLoadingCuevana = false;
  List<Map<String, dynamic>> _cuevanaSources = [];

  @override
  void initState() {
    super.initState();
    _playButtonFocusNode.addListener(() {
      setState(() => _isPlayFocused = _playButtonFocusNode.hasFocus);
    });
    _loadCuevanaServers();
  }

  Future<void> _loadCuevanaServers() async {
    if (widget.item.title.trim().isEmpty) return;

    setState(() => _isLoadingCuevana = true);
    try {
      final api = ApiService();
      final sources = await api.searchCuevana(title: widget.item.title);
      if (!mounted) return;
      setState(() => _cuevanaSources = sources);
    } catch (_) {
      if (!mounted) return;
      setState(() => _cuevanaSources = const []);
    } finally {
      if (mounted) setState(() => _isLoadingCuevana = false);
    }
  }

  @override
  void dispose() {
    _playButtonFocusNode.dispose();
    super.dispose();
  }

  // ── Servidores limpios y parametrizados por idioma ──────────────────────
  List<Map<String, dynamic>> _buildCleanServerCatalog({
    required int tmdbId,
    required String type,
    required int season,
    required int episode,
  }) {
    final isMovie = type == 'movie';
    final isLatino = _audioMode == 'latino';
    final vidlinkLang = isLatino ? 'es' : 'en';

    return [
      {
        'id': 'vsembed-latino',
        'name': '🇲🇽 VSEmbed (Español Latino)',
        'url': isMovie
            ? 'https://vsembed.ru/embed/movie?tmdb=$tmdbId&ds_lang=es'
            : 'https://vsembed.ru/embed/tv?tmdb=$tmdbId&season=$season&episode=$episode&ds_lang=es',
      },
      {
        'id': 'vidlink-pro',
        'name': 'VidLink Español',
        'url': isMovie
            ? 'https://vidlink.pro/movie/$tmdbId?primaryColor=e50914&lang=$vidlinkLang'
            : 'https://vidlink.pro/tv/$tmdbId/$season/$episode?primaryColor=e50914&lang=$vidlinkLang',
      },
      {
        'id': 'autoembed-es',
        'name': 'Autoembed',
        'url': isMovie
            ? 'https://player.autoembed.cc/embed/movie/$tmdbId?lang=es'
            : 'https://player.autoembed.cc/embed/tv/$tmdbId/$season/$episode?lang=es',
      },
    ];
  }

  int _activeServer = 0;

  Future<void> _startPlayback({int season = 1, int episode = 1, int? episodeId, int? serverOverride}) async {
    final isMovie = widget.item.type == 'movie';
    final server = serverOverride ?? _activeServer;

    int resolvedSeason = season;
    int resolvedEpisode = episode;
    if (!isMovie && episodeId != null && widget.item.seasons != null) {
      for (final s in widget.item.seasons!) {
        for (final ep in s.episodes) {
          if (ep.id == episodeId) {
            resolvedSeason = s.seasonNumber;
            resolvedEpisode = ep.episodeNumber;
            break;
          }
        }
      }
    }

    List<Map<String, dynamic>> serverList = [];

    // 1. Priorizar servidores de Cuevana Latino cargados en el cliente
    if (_cuevanaSources.isNotEmpty) {
      serverList = _cuevanaSources.map((s) => {
        'name': (s['name'] ?? s['server'] ?? 'Servidor Latino').toString(),
        'url': (s['url'] ?? s['embedUrl'] ?? s['directEmbedUrl'] ?? '').toString(),
      }).toList();
    }

    // 2. Si no hay Cuevana, consultar /api/stream/servers al backend
    if (serverList.isEmpty) {
      try {
        final api = ApiService();
        final serversFromBackend = await api.getMovieServers(
          tmdbId: widget.item.id,
          type: isMovie ? 'movie' : 'tv',
          season: resolvedSeason,
          episode: resolvedEpisode,
          title: widget.item.title,
          originalTitle: widget.item.originalTitle,
        );
        if (serversFromBackend.isNotEmpty) {
          serverList = serversFromBackend.map((s) => {
            'name': (s['name'] ?? 'Servidor').toString(),
            'url': (s['url'] ?? s['embedUrl'] ?? '').toString(),
          }).toList();
        }
      } catch (_) {}
    }

    // 3. Fallback al catálogo limpio estático (VSEmbed Latino, VidLink, Autoembed)
    if (serverList.isEmpty) {
      serverList = _buildCleanServerCatalog(
        tmdbId: widget.item.id,
        type: isMovie ? 'movie' : 'series',
        season: resolvedSeason,
        episode: resolvedEpisode,
      );
    }

    // Seleccionar el objeto de servidor según el índice solicitado por el usuario
    final selectedIdx = server % serverList.length;
    final selectedServerObj = serverList[selectedIdx];
    String finalUrl = (selectedServerObj['url'] ?? '').toString();

    // Si por alguna razón la URL estuviera vacía, intentar HLS stream del backend
    if (finalUrl.isEmpty) {
      try {
        final mediaProvider = context.read<MediaProvider>();
        final resolved = await mediaProvider.resolveHlsStream(
          mediaId: widget.item.id,
          type: isMovie ? 'movie' : 'series',
          episodeId: episodeId,
        );
        if (resolved != null && resolved.isNotEmpty) {
          finalUrl = resolved;
        }
      } catch (_) {}
    }

    if (!mounted) return;

    final names = serverList.map((s) => (s['name'] ?? 'Servidor').toString()).toList();

    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => PlayerScreen(
          title: isMovie
              ? widget.item.title
              : '${widget.item.title} (T$resolvedSeason • Ep $resolvedEpisode)',
          streamUrl: finalUrl,
          audioMode: _audioMode,
          onAudioModeChanged: (nextMode) {
            setState(() => _audioMode = nextMode);
          },
          onSwitchServer: (nextServer) {
            setState(() => _activeServer = nextServer);
            _startPlayback(
              season: resolvedSeason,
              episode: resolvedEpisode,
              serverOverride: nextServer,
            );
          },
          activeServer: selectedIdx,
          totalServers: serverList.length,
          serverNames: names,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final item = widget.item;
    final mediaProvider = context.watch<MediaProvider>();

    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.of(context).pop(),
        ),
        backgroundColor: Colors.transparent,
      ),
      body: Stack(
        children: [
          // Imagen Backdrop de fondo
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: MediaQuery.of(context).size.height * 0.65,
            child: Image.network(
              item.backdrop.isNotEmpty ? item.backdrop : item.poster,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(color: AppTheme.surface),
            ),
          ),

          // Gradiente oscuro de fondo
          Positioned.fill(
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.black.withOpacity(0.4),
                    AppTheme.background.withOpacity(0.8),
                    AppTheme.background,
                  ],
                  stops: const [0.0, 0.5, 0.85],
                ),
              ),
            ),
          ),

          // Contenido desplazable
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 60),

                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Poster importado de TMDb
                      ClipRRect(
                        borderRadius: BorderRadius.circular(10),
                        child: Container(
                          width: 170,
                          height: 255,
                          color: AppTheme.surface,
                          child: Image.network(
                            item.poster,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => const Icon(
                              Icons.movie,
                              size: 60,
                              color: Colors.white30,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 28),

                      // Metadatos y título
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item.title,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 32,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                            if (item.originalTitle.isNotEmpty && item.originalTitle != item.title) ...[
                              const SizedBox(height: 4),
                              Text(
                                item.originalTitle,
                                style: const TextStyle(
                                  color: Colors.white54,
                                  fontSize: 14,
                                  fontStyle: FontStyle.italic,
                                ),
                              ),
                            ],
                            const SizedBox(height: 12),

                            // Fila de etiquetas (Año, Duración, Rating, Tipo)
                            Wrap(
                              spacing: 12,
                              runSpacing: 8,
                              crossAxisAlignment: WrapCrossAlignment.center,
                              children: [
                                if (item.year.isNotEmpty)
                                  Text(
                                    item.year,
                                    style: const TextStyle(color: Colors.white70, fontSize: 14),
                                  ),
                                if (item.isMovie && item.durationMinutes > 0)
                                  Text(
                                    '${item.durationMinutes} min',
                                    style: const TextStyle(color: Colors.white70, fontSize: 14),
                                  ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: Colors.amber.shade700,
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(Icons.star, color: Colors.white, size: 14),
                                      const SizedBox(width: 4),
                                      Text(
                                        item.rating.toStringAsFixed(1),
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 12,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(
                                    border: Border.all(color: Colors.white30),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    item.isMovie ? 'HD • HLS' : 'SERIE TV',
                                    style: const TextStyle(color: Colors.white70, fontSize: 11),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 14),

                            // Géneros
                            Wrap(
                              spacing: 8,
                              children: item.genres.map((g) {
                                return Chip(
                                  label: Text(g),
                                  backgroundColor: Colors.white10,
                                  labelStyle: const TextStyle(color: Colors.white, fontSize: 12),
                                  padding: const EdgeInsets.all(2),
                                );
                              }).toList(),
                            ),
                            const SizedBox(height: 20),

                            // Selector de audio
                            Container(
                              margin: const EdgeInsets.only(bottom: 12),
                              padding: const EdgeInsets.all(6),
                              decoration: BoxDecoration(
                                color: Colors.white10,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: ['original', 'latino'].map((mode) {
                                  final selected = _audioMode == mode;
                                  final label = mode == 'latino' ? 'Audio Latino' : 'Original';
                                  return Padding(
                                    padding: const EdgeInsets.only(right: 8),
                                    child: ChoiceChip(
                                      label: Text(label),
                                      selected: selected,
                                      onSelected: (_) => setState(() => _audioMode = mode),
                                      selectedColor: AppTheme.primaryRed,
                                      backgroundColor: Colors.white12,
                                      labelStyle: TextStyle(
                                        color: selected ? Colors.white : Colors.white70,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  );
                                }).toList(),
                              ),
                            ),

                            if (_cuevanaSources.isNotEmpty || _isLoadingCuevana) ...[
                              const SizedBox(height: 12),
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: Colors.black26,
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      _isLoadingCuevana ? 'Buscando servidores latino...' : 'Servidores Latino disponibles',
                                      style: const TextStyle(
                                        color: Colors.white70,
                                        fontSize: 12,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    Wrap(
                                      spacing: 8,
                                      runSpacing: 8,
                                      children: (_cuevanaSources.take(3)).map((source) {
                                        final label = (source['server'] ?? 'Servidor').toString();
                                        return Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                          decoration: BoxDecoration(
                                            color: AppTheme.primaryRed.withOpacity(0.2),
                                            borderRadius: BorderRadius.circular(999),
                                            border: Border.all(color: AppTheme.primaryRed.withOpacity(0.5)),
                                          ),
                                          child: Text(
                                            label,
                                            style: const TextStyle(color: Colors.white, fontSize: 11),
                                          ),
                                        );
                                      }).toList(),
                                    ),
                                  ],
                                ),
                              ),
                            ],

                            // Botón Reproducir (con soporte Android TV)
                            RawKeyboardListener(
                              focusNode: _playButtonFocusNode,
                              autofocus: true,
                              onKey: (event) {
                                if (event is RawKeyDownEvent &&
                                    (event.logicalKey == LogicalKeyboardKey.select ||
                                     event.logicalKey == LogicalKeyboardKey.enter ||
                                     event.logicalKey == LogicalKeyboardKey.space)) {
                                  _startPlayback();
                                }
                              },
                              child: ElevatedButton.icon(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: _isPlayFocused ? Colors.white : AppTheme.primaryRed,
                                  foregroundColor: _isPlayFocused ? Colors.black : Colors.white,
                                  padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(8),
                                    side: BorderSide(
                                      color: _isPlayFocused ? Colors.redAccent : Colors.transparent,
                                      width: _isPlayFocused ? 3 : 0,
                                    ),
                                  ),
                                  elevation: _isPlayFocused ? 12 : 4,
                                ),
                                onPressed: mediaProvider.isResolvingStream ? null : () => _startPlayback(),
                                icon: mediaProvider.isResolvingStream
                                    ? const SizedBox(
                                        width: 20,
                                        height: 20,
                                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                      )
                                    : const Icon(Icons.play_arrow_rounded, size: 28),
                                label: Text(
                                  mediaProvider.isResolvingStream ? 'Cargando stream...' : 'REPRODUCIR',
                                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 32),

                  // Sinopsis
                  const Text(
                    'Sinopsis',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    item.overview,
                    style: const TextStyle(
                      color: Colors.white70,
                      fontSize: 15,
                      height: 1.5,
                    ),
                  ),

                  // Si es serie: Listado de episodios
                  if (!item.isMovie && item.seasons != null && item.seasons!.isNotEmpty) ...[
                    const SizedBox(height: 32),
                    const Text(
                      'Episodios Disponibles',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 14),
                    ...item.seasons!.expand((season) => season.episodes).map((ep) {
                      return Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        decoration: BoxDecoration(
                          color: AppTheme.cardBackground,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: AppTheme.surface,
                            child: Text(
                              ep.episodeNumber.toString(),
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                            ),
                          ),
                          title: Text(ep.title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                          subtitle: Text(
                            '${ep.durationMinutes} min - ${ep.overview}',
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(color: Colors.white54, fontSize: 12),
                          ),
                          trailing: IconButton(
                            icon: const Icon(Icons.play_circle_fill, color: AppTheme.primaryRed, size: 32),
                            onPressed: () => _startPlayback(episodeId: ep.id),
                          ),
                          onTap: () => _startPlayback(episodeId: ep.id),
                        ),
                      );
                    }).toList(),
                  ],

                  const SizedBox(height: 40),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
