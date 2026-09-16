import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../constants/app_theme.dart';
import '../models/media_item.dart';
import '../providers/auth_provider.dart';
import '../providers/media_provider.dart';
import '../widgets/hero_banner.dart';
import '../widgets/media_carousel.dart';
import 'detail_screen.dart';
import 'player_screen.dart';
import 'iptv_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String _selectedTab = 'home'; // 'home', 'movies', 'series'

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<MediaProvider>().loadHomeFeed();
    });
  }

  void _navigateToDetail(MediaItem item) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => DetailScreen(item: item),
      ),
    );
  }

  void _playMedia(MediaItem item) {
    if (item.type == 'series') {
      _navigateToDetail(item);
      return;
    }

    // El flujo seguro de reproducción se resuelve en la pantalla de detalle
    // para mantener el token JWT y la validación del backend.
    _navigateToDetail(item);
  }

  @override
  Widget build(BuildContext context) {
    final media = context.watch<MediaProvider>();
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        title: Row(
          children: [
            const Icon(Icons.movie_filter_rounded, color: AppTheme.primaryRed, size: 28),
            const SizedBox(width: 8),
            Text(
              'STREAMFLIX',
              style: TextStyle(
                color: AppTheme.primaryRed,
                fontWeight: FontWeight.w900,
                fontSize: 22,
                letterSpacing: 1.5,
              ),
            ),
            const SizedBox(width: 20),
            // Pestaña Inicio
            TextButton(
              style: TextButton.styleFrom(
                foregroundColor: _selectedTab == 'home' ? Colors.white : Colors.white60,
              ),
              child: Text(
                'Inicio',
                style: TextStyle(
                  fontWeight: _selectedTab == 'home' ? FontWeight.bold : FontWeight.normal,
                  decoration: _selectedTab == 'home' ? TextDecoration.underline : TextDecoration.none,
                ),
              ),
              onPressed: () => setState(() => _selectedTab = 'home'),
            ),
            // Pestaña Películas
            TextButton(
              style: TextButton.styleFrom(
                foregroundColor: _selectedTab == 'movies' ? Colors.white : Colors.white60,
              ),
              child: Text(
                'Películas',
                style: TextStyle(
                  fontWeight: _selectedTab == 'movies' ? FontWeight.bold : FontWeight.normal,
                  decoration: _selectedTab == 'movies' ? TextDecoration.underline : TextDecoration.none,
                ),
              ),
              onPressed: () => setState(() => _selectedTab = 'movies'),
            ),
            // Pestaña Series
            TextButton(
              style: TextButton.styleFrom(
                foregroundColor: _selectedTab == 'series' ? Colors.white : Colors.white60,
              ),
              child: Text(
                'Series',
                style: TextStyle(
                  fontWeight: _selectedTab == 'series' ? FontWeight.bold : FontWeight.normal,
                  decoration: _selectedTab == 'series' ? TextDecoration.underline : TextDecoration.none,
                ),
              ),
              onPressed: () => setState(() => _selectedTab = 'series'),
            ),
          ],
        ),
        actions: [
          // Botón de TV en Vivo (IPTV)
          TextButton.icon(
            style: TextButton.styleFrom(foregroundColor: Colors.white),
            icon: const Icon(Icons.live_tv_rounded, color: AppTheme.primaryRed, size: 20),
            label: const Text('TV EN VIVO', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => IptvScreen(apiService: media.apiService),
                ),
              );
            },
          ),
          const SizedBox(width: 8),
          if (auth.user != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: Colors.white12,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.account_circle, size: 18, color: Colors.white70),
                      const SizedBox(width: 6),
                      Text(
                        auth.user!.username,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          IconButton(
            tooltip: 'Cerrar Sesión',
            icon: const Icon(Icons.logout, color: Colors.white70),
            onPressed: () async {
              await auth.logout();
              if (mounted) {
                Navigator.of(context).pushReplacementNamed('/login');
              }
            },
          ),
          const SizedBox(width: 12),
        ],
      ),
      body: media.isLoading
          ? const Center(
              child: CircularProgressIndicator(
                color: AppTheme.primaryRed,
              ),
            )
          : media.errorMessage != null
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.error_outline, size: 48, color: Colors.redAccent),
                      const SizedBox(height: 12),
                      Text(
                        'Error: ${media.errorMessage}',
                        style: const TextStyle(color: Colors.white70),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: () => media.loadHomeFeed(),
                        child: const Text('Reintentar'),
                      ),
                    ],
                  ),
                )
              : SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Banner Hero Destacado (solo en Inicio)
                      if (_selectedTab == 'home' && media.heroItem != null)
                        HeroBanner(
                          item: media.heroItem!,
                          onPlay: () => _playMedia(media.heroItem!),
                          onDetails: () => _navigateToDetail(media.heroItem!),
                        ),

                      const SizedBox(height: 12),

                      // Vista de Pestaña: Películas
                      if (_selectedTab == 'movies') ...[
                        const SizedBox(height: 70),
                        MediaCarousel(
                          title: '🎬 Todas las Películas Populares (TMDb)',
                          items: media.popularMovies,
                          onItemTap: (item) => _navigateToDetail(item),
                        ),
                      ]
                      // Vista de Pestaña: Series
                      else if (_selectedTab == 'series') ...[
                        const SizedBox(height: 70),
                        MediaCarousel(
                          title: '📺 Todas las Series Populares (TMDb)',
                          items: media.popularSeries,
                          onItemTap: (item) => _navigateToDetail(item),
                        ),
                      ]
                      // Vista de Pestaña: Inicio (Todos los carruseles)
                      else ...[
                        ...media.categories.map((category) {
                          return MediaCarousel(
                            title: category.title,
                            items: category.items,
                            onItemTap: (item) => _navigateToDetail(item),
                          );
                        }).toList(),
                      ],

                      const SizedBox(height: 40),
                    ],
                  ),
                ),
    );
  }
}
