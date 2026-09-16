import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:video_player/video_player.dart';
import 'package:chewie/chewie.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../constants/app_theme.dart';

class PlayerScreen extends StatefulWidget {
  final String streamUrl;
  final String title;
  final String audioMode;

  /// Callback para cambiar a otra fuente autorizada.
  final void Function(int nextServer)? onSwitchServer;
  final void Function(String)? onAudioModeChanged;
  final int activeServer;
  final int totalServers;
  final List<String>? serverNames;

  const PlayerScreen({
    Key? key,
    required this.streamUrl,
    required this.title,
    this.audioMode = 'latino',
    this.onSwitchServer,
    this.onAudioModeChanged,
    this.activeServer = 0,
    this.totalServers = 1,
    this.serverNames,
  }) : super(key: key);

  @override
  State<PlayerScreen> createState() => _PlayerScreenState();
}

class _PlayerScreenState extends State<PlayerScreen> {
  VideoPlayerController? _videoPlayerController;
  ChewieController? _chewieController;
  WebViewController? _webViewController;
  bool _hasError = false;
  String? _errorMessage;
  late String _audioMode = widget.audioMode;
  final FocusNode _keyboardFocusNode = FocusNode();

  // ── Inyección JS: bloquea popups y ventanas emergentes ──────────────────
  static const _popupGuardJs = '''
    window.open = function() { return null; };
    document.addEventListener('click', function(e) {
      var t = e.target;
      while (t && t.tagName !== 'A') t = t.parentElement;
      if (t && t.target === '_blank') { e.preventDefault(); e.stopPropagation(); }
      if (t && /^(javascript:|data:)/i.test(t.href || '')) { e.preventDefault(); e.stopPropagation(); }
    }, true);
  ''';

  // Nombres legibles para los servidores
  static const _serverNames = [
    '🇲🇽 Servidor 1 — VidLink (Forzar Latino)',
    '🔁 Servidor 2 — Autoembed',
  ];

  /// Detecta si la URL es de un reproductor embed (iframe) en vez de HLS directo
  bool get _isEmbedPlayer {
    final url = widget.streamUrl.toLowerCase();
    return url.contains('/embed') ||
        url.contains('vsembed') ||
        url.contains('vidlink') ||
        url.contains('autoembed') ||
        url.contains('morencius') ||
        url.contains('vidhide') ||
        url.contains('awish') ||
        url.contains('streamwish') ||
        url.contains('filemoon') ||
        url.contains('dood') ||
        url.contains('vidcore') ||
        url.contains('vidsrc') ||
        url.contains('superembed') ||
        url.contains('multiembed') ||
        url.contains('2embed');
  }

  bool get _isHlsPlayer => widget.streamUrl.toLowerCase().contains('.m3u8');

  @override
  void initState() {
    super.initState();
    if (_isEmbedPlayer) {
      _initializeWebView();
    } else if (_isHlsPlayer) {
      _initializeHlsWebView();
    } else {
      _initializePlayer();
    }
  }

  void _initializeHlsWebView() {
    late final WebViewController controller;
    final streamUrl = jsonEncode(widget.streamUrl);
    final html = '''
<!doctype html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body,video{margin:0;width:100%;height:100%;background:#000}video{object-fit:contain}</style>
</head><body><video id="video" controls autoplay playsinline></video>
<script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
<script>
window.open = function() { return null; };
const video = document.getElementById('video');
const url = $streamUrl;
const preferred = ['es-mx', 'es-lat', 'es-419', 'spa', 'es'];
function chooseAudio(hls) {
  const index = (hls.audioTracks || []).findIndex(track => {
    const value = ((track.lang || '') + ' ' + (track.name || '')).toLowerCase();
    return preferred.some(code => value.includes(code));
  });
  if (index >= 0) hls.audioTrack = index;
}
if (window.Hls && Hls.isSupported()) {
  const hls = new Hls({ capLevelToPlayerSize: true });
  hls.loadSource(url);
  hls.attachMedia(video);
  hls.on(Hls.Events.MANIFEST_PARSED, () => { chooseAudio(hls); video.play(); });
  hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, () => chooseAudio(hls));
} else {
  video.src = url;
  video.play();
}
</script></body></html>''';

    controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.black)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) => controller.runJavaScript(_popupGuardJs),
          onPageFinished: (_) => controller.runJavaScript(_popupGuardJs),
          onNavigationRequest: (request) {
            final url = request.url.toLowerCase();
            return url.startsWith('data:') || url.startsWith('javascript:')
                ? NavigationDecision.prevent
                : NavigationDecision.navigate;
          },
        ),
      )
      ..loadHtmlString(html, baseUrl: widget.streamUrl);

    setState(() => _webViewController = controller);
  }

  void _initializeWebView() {
    late final WebViewController controller;
    controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.black)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) {
            controller.runJavaScript(_popupGuardJs);
          },
          onPageFinished: (_) {
            controller.runJavaScript(_popupGuardJs);
          },
          onNavigationRequest: (request) {
            final url = request.url.toLowerCase();
            if (url.startsWith('blob:') || url.startsWith('data:') || url.startsWith('about:')) {
              return NavigationDecision.navigate;
            }

            final isAllowedHost =
                url.contains('vsembed') ||
                url.contains('vidlink') ||
                url.contains('autoembed') ||
                url.contains('morencius') ||
                url.contains('vidhide') ||
                url.contains('awish') ||
                url.contains('streamwish') ||
                url.contains('filemoon') ||
                url.contains('dood') ||
                url.contains('vidsrc') ||
                url.contains('videasy') ||
                url.contains('multiembed') ||
                url.contains('vidcore') ||
                url.contains('cuevana');

            if (isAllowedHost) {
              return NavigationDecision.navigate;
            }

            if (request.isMainFrame) {
              final initialHost = Uri.tryParse(widget.streamUrl)?.host.toLowerCase() ?? '';
              final reqHost = Uri.tryParse(request.url)?.host.toLowerCase() ?? '';
              if (initialHost.isNotEmpty && reqHost.isNotEmpty && (reqHost.endsWith(initialHost) || initialHost.endsWith(reqHost))) {
                return NavigationDecision.navigate;
              }
              return NavigationDecision.prevent;
            }
            return NavigationDecision.navigate;
          },
        ),
      )
      ..loadRequest(Uri.parse(widget.streamUrl));

    setState(() {
      _webViewController = controller;
    });
  }

  Future<void> _initializePlayer() async {
    try {
      _videoPlayerController = VideoPlayerController.networkUrl(
        Uri.parse(widget.streamUrl),
      );

      await _videoPlayerController!.initialize();

      _chewieController = ChewieController(
        videoPlayerController: _videoPlayerController!,
        autoPlay: true,
        looping: false,
        aspectRatio: _videoPlayerController!.value.aspectRatio > 0
            ? _videoPlayerController!.value.aspectRatio
            : 16 / 9,
        allowFullScreen: true,
        fullScreenByDefault: true,
        showControls: true,
        materialProgressColors: ChewieProgressColors(
          playedColor: AppTheme.primaryRed,
          handleColor: AppTheme.primaryRed,
          backgroundColor: Colors.white24,
          bufferedColor: Colors.white54,
        ),
        errorBuilder: (context, errorMessage) {
          return Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline, color: Colors.redAccent, size: 50),
                const SizedBox(height: 12),
                Text(
                  errorMessage,
                  style: const TextStyle(color: Colors.white),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          );
        },
      );

      setState(() {});
    } catch (err) {
      setState(() {
        _hasError = true;
        _errorMessage = 'Error al reproducir manifiesto HLS: $err';
      });
    }
  }

  void _handleKeyEvent(RawKeyEvent event) {
    if (event is! RawKeyDownEvent) return;

    final key = event.logicalKey;
    final video = _videoPlayerController;
    if (video == null) {
      if (key == LogicalKeyboardKey.escape || key == LogicalKeyboardKey.backspace) {
        Navigator.of(context).pop();
      }
      return;
    }

    if (key == LogicalKeyboardKey.select ||
        key == LogicalKeyboardKey.enter ||
        key == LogicalKeyboardKey.space ||
        key == LogicalKeyboardKey.mediaPlayPause) {
      if (video.value.isPlaying) {
        video.pause();
      } else {
        video.play();
      }
    } else if (key == LogicalKeyboardKey.arrowLeft ||
        key == LogicalKeyboardKey.mediaRewind) {
      final currentPos = video.value.position;
      final newPos = currentPos - const Duration(seconds: 10);
      video.seekTo(newPos > Duration.zero ? newPos : Duration.zero);
    } else if (key == LogicalKeyboardKey.arrowRight ||
        key == LogicalKeyboardKey.mediaFastForward) {
      final currentPos = video.value.position;
      final maxDuration = video.value.duration;
      final newPos = currentPos + const Duration(seconds: 10);
      video.seekTo(newPos < maxDuration ? newPos : maxDuration);
    } else if (key == LogicalKeyboardKey.escape ||
        key == LogicalKeyboardKey.backspace) {
      Navigator.of(context).pop();
    }
  }

  /// Cambia al siguiente servidor disponible
  void _switchToNextServer() {
    if (widget.onSwitchServer == null) return;
    final next = (widget.activeServer + 1) % widget.totalServers;
    Navigator.of(context).pop(); // Cerrar reproductor actual
    widget.onSwitchServer!(next); // Abrir con el nuevo servidor
  }

  @override
  void dispose() {
    _keyboardFocusNode.dispose();
    _videoPlayerController?.dispose();
    _chewieController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final String serverLabel;
    if (widget.serverNames != null &&
        widget.activeServer >= 0 &&
        widget.activeServer < widget.serverNames!.length) {
      serverLabel = widget.serverNames![widget.activeServer];
    } else if (widget.activeServer < _serverNames.length) {
      serverLabel = _serverNames[widget.activeServer];
    } else {
      serverLabel = 'Servidor ${widget.activeServer + 1}';
    }

    return RawKeyboardListener(
      focusNode: _keyboardFocusNode,
      autofocus: true,
      onKey: _handleKeyEvent,
      child: Scaffold(
        backgroundColor: Colors.black,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back, color: Colors.white),
            onPressed: () => Navigator.of(context).pop(),
          ),
          title: Text(
            widget.title,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 18,
            ),
          ),
          actions: [
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white12,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.language, color: Colors.white70, size: 16),
                    const SizedBox(width: 6),
                    DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _audioMode,
                        dropdownColor: Colors.black87,
                        style: const TextStyle(color: Colors.white, fontSize: 12),
                        iconEnabledColor: Colors.white,
                        items: const [
                          DropdownMenuItem(value: 'latino', child: Text('Latino')),
                          DropdownMenuItem(value: 'original', child: Text('Original')),
                        ],
                        onChanged: (value) {
                          if (value == null) return;
                          setState(() => _audioMode = value);
                          widget.onAudioModeChanged?.call(value);
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ),
            if (widget.onSwitchServer != null)
              Padding(
                padding: const EdgeInsets.only(right: 8),
                child: TextButton.icon(
                  onPressed: _switchToNextServer,
                  icon: const Icon(Icons.swap_horiz, color: Colors.white70, size: 20),
                  label: Text(
                    serverLabel,
                    style: const TextStyle(color: Colors.white70, fontSize: 12),
                  ),
                  style: TextButton.styleFrom(
                    backgroundColor: Colors.white12,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  ),
                ),
              ),
          ],
        ),
        body: Center(child: _buildBody()),
      ),
    );
  }

  Widget _buildBody() {
    if (_isEmbedPlayer || _isHlsPlayer) {
      if (_webViewController == null) {
        return const CircularProgressIndicator(color: AppTheme.primaryRed);
      }
      return WebViewWidget(controller: _webViewController!);
    }

    if (_hasError) {
      return Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.wifi_off_rounded, color: Colors.redAccent, size: 56),
            const SizedBox(height: 16),
            Text(
              _errorMessage ?? 'No fue posible conectar con el flujo HLS.',
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.white70, fontSize: 16),
            ),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              onPressed: () {
                setState(() {
                  _hasError = false;
                  _errorMessage = null;
                });
                _initializePlayer();
              },
              icon: const Icon(Icons.refresh),
              label: const Text('Reintentar conexión'),
            ),
          ],
        ),
      );
    }

    if (_chewieController != null &&
        _chewieController!.videoPlayerController.value.isInitialized) {
      return Chewie(controller: _chewieController!);
    }

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: const [
        CircularProgressIndicator(
          color: AppTheme.primaryRed,
          strokeWidth: 3,
        ),
        SizedBox(height: 16),
        Text(
          'Sintonizando flujo HLS (.m3u8)...',
          style: TextStyle(color: Colors.white70, fontSize: 14),
        ),
      ],
    );
  }
}
