import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../constants/app_theme.dart';
import '../models/media_item.dart';

class HeroBanner extends StatefulWidget {
  final MediaItem item;
  final VoidCallback onPlay;
  final VoidCallback onDetails;

  const HeroBanner({
    Key? key,
    required this.item,
    required this.onPlay,
    required this.onDetails,
  }) : super(key: key);

  @override
  State<HeroBanner> createState() => _HeroBannerState();
}

class _HeroBannerState extends State<HeroBanner> {
  final FocusNode _playFocusNode = FocusNode();
  final FocusNode _infoFocusNode = FocusNode();

  bool _isPlayFocused = false;
  bool _isInfoFocused = false;

  @override
  void initState() {
    super.initState();
    _playFocusNode.addListener(() {
      setState(() => _isPlayFocused = _playFocusNode.hasFocus);
    });
    _infoFocusNode.addListener(() {
      setState(() => _isInfoFocused = _infoFocusNode.hasFocus);
    });
  }

  @override
  void dispose() {
    _playFocusNode.dispose();
    _infoFocusNode.dispose();
    super.dispose();
  }

  Widget _buildTvButton({
    required FocusNode focusNode,
    required bool isFocused,
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    required Color baseColor,
    required Color textColor,
  }) {
    return RawKeyboardListener(
      focusNode: focusNode,
      onKey: (event) {
        if (event is RawKeyDownEvent &&
            (event.logicalKey == LogicalKeyboardKey.select ||
             event.logicalKey == LogicalKeyboardKey.enter ||
             event.logicalKey == LogicalKeyboardKey.space)) {
          onTap();
        }
      },
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 12),
          decoration: BoxDecoration(
            color: isFocused ? Colors.white : baseColor,
            borderRadius: BorderRadius.circular(6),
            border: Border.all(
              color: isFocused ? AppTheme.primaryRed : Colors.transparent,
              width: isFocused ? 2.5 : 0,
            ),
            boxShadow: isFocused
                ? [
                    BoxShadow(
                      color: AppTheme.primaryRed.withOpacity(0.7),
                      blurRadius: 12,
                      spreadRadius: 2,
                    )
                  ]
                : [],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                icon,
                color: isFocused ? Colors.black : textColor,
                size: 20,
              ),
              const SizedBox(width: 8),
              Text(
                label,
                style: TextStyle(
                  color: isFocused ? Colors.black : textColor,
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final height = MediaQuery.of(context).size.height * 0.58;

    return Stack(
      children: [
        // Imagen de Fondo Backdrop
        SizedBox(
          height: height,
          width: double.infinity,
          child: Image.network(
            widget.item.backdrop.isNotEmpty ? widget.item.backdrop : widget.item.poster,
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => Container(
              color: AppTheme.surface,
              child: const Icon(Icons.movie, size: 80, color: Colors.white24),
            ),
          ),
        ),

        // Gradientes Cinemáticos (Oscurecimiento lateral e inferior)
        Positioned.fill(
          child: Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.black.withOpacity(0.3),
                  Colors.transparent,
                  AppTheme.background.withOpacity(0.85),
                  AppTheme.background,
                ],
                stops: const [0.0, 0.3, 0.8, 1.0],
              ),
            ),
          ),
        ),
        Positioned.fill(
          child: Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.centerLeft,
                end: Alignment.centerRight,
                colors: [
                  Colors.black.withOpacity(0.9),
                  Colors.black.withOpacity(0.6),
                  Colors.transparent,
                ],
                stops: const [0.0, 0.45, 0.8],
              ),
            ),
          ),
        ),

        // Contenido textual y botones de acción
        Positioned(
          left: 24,
          bottom: 24,
          right: 24,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              // Badge de tipo y rating
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryRed,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text(
                      'DESTACADO HOY',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.8,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  const Icon(Icons.star, color: Colors.amber, size: 16),
                  const SizedBox(width: 4),
                  Text(
                    '${widget.item.rating.toStringAsFixed(1)} / 10',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              // Título
              Text(
                widget.item.title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 32,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.5,
                  shadows: [
                    Shadow(color: Colors.black, blurRadius: 10, offset: Offset(2, 2)),
                  ],
                ),
              ),
              const SizedBox(height: 8),

              // Sinopsis breve
              SizedBox(
                width: MediaQuery.of(context).size.width * 0.55,
                child: Text(
                  widget.item.overview,
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Colors.white70,
                    fontSize: 14,
                    height: 1.4,
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Botones de acción accesibles con control remoto
              Row(
                children: [
                  _buildTvButton(
                    focusNode: _playFocusNode,
                    isFocused: _isPlayFocused,
                    icon: Icons.play_arrow_rounded,
                    label: 'Reproducir',
                    onTap: widget.onPlay,
                    baseColor: Colors.white,
                    textColor: Colors.black,
                  ),
                  const SizedBox(width: 14),
                  _buildTvButton(
                    focusNode: _infoFocusNode,
                    isFocused: _isInfoFocused,
                    icon: Icons.info_outline,
                    label: 'Más información',
                    onTap: widget.onDetails,
                    baseColor: Colors.white.withOpacity(0.2),
                    textColor: Colors.white,
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}
