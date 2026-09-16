import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../constants/app_theme.dart';
import '../models/media_item.dart';
import '../services/api_service.dart';
import 'player_screen.dart';

class IptvScreen extends StatefulWidget {
  final ApiService apiService;

  const IptvScreen({Key? key, required this.apiService}) : super(key: key);

  @override
  State<IptvScreen> createState() => _IptvScreenState();
}

class _IptvScreenState extends State<IptvScreen> {
  List<IptvChannel> _channels = [];
  bool _isLoading = true;
  String? _selectedCategory;
  List<String> _categories = [];

  @override
  void initState() {
    super.initState();
    _loadChannels();
  }

  Future<void> _loadChannels() async {
    setState(() => _isLoading = true);
    try {
      final channels = await widget.apiService.getIptvChannels();
      final cats = channels.map((c) => c.category).toSet().toList();
      setState(() {
        _channels = channels;
        _categories = ['Todos', ...cats];
        _selectedCategory = 'Todos';
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  void _playChannel(IptvChannel channel) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => PlayerScreen(
          streamUrl: channel.streamUrl,
          title: 'En Vivo: ${channel.name}',
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final filteredChannels = (_selectedCategory == null || _selectedCategory == 'Todos')
        ? _channels
        : _channels.where((c) => c.category == _selectedCategory).toList();

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: const [
            Icon(Icons.live_tv_rounded, color: AppTheme.primaryRed),
            SizedBox(width: 10),
            Text('TV EN VIVO (IPTV)', style: TextStyle(fontWeight: FontWeight.bold)),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryRed))
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Filtros de categoría
                if (_categories.isNotEmpty)
                  SizedBox(
                    height: 50,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: _categories.length,
                      itemBuilder: (context, index) {
                        final cat = _categories[index];
                        final isSelected = cat == _selectedCategory;
                        return Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: ChoiceChip(
                            label: Text(cat),
                            selected: isSelected,
                            selectedColor: AppTheme.primaryRed,
                            backgroundColor: Colors.white10,
                            labelStyle: TextStyle(
                              color: isSelected ? Colors.white : Colors.white70,
                              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                            ),
                            onSelected: (_) {
                              setState(() => _selectedCategory = cat);
                            },
                          ),
                        );
                      },
                    ),
                  ),

                // Cuadrícula de Canales
                Expanded(
                  child: GridView.builder(
                    padding: const EdgeInsets.all(20),
                    gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                      maxCrossAxisExtent: 220,
                      childAspectRatio: 1.1,
                      crossAxisSpacing: 16,
                      mainAxisSpacing: 16,
                    ),
                    itemCount: filteredChannels.length,
                    itemBuilder: (context, index) {
                      final ch = filteredChannels[index];
                      return _ChannelTvCard(
                        channel: ch,
                        onTap: () => _playChannel(ch),
                      );
                    },
                  ),
                ),
              ],
            ),
    );
  }
}

class _ChannelTvCard extends StatefulWidget {
  final IptvChannel channel;
  final VoidCallback onTap;

  const _ChannelTvCard({Key? key, required this.channel, required this.onTap})
      : super(key: key);

  @override
  State<_ChannelTvCard> createState() => _ChannelTvCardState();
}

class _ChannelTvCardState extends State<_ChannelTvCard> {
  final FocusNode _focusNode = FocusNode();
  bool _isFocused = false;

  @override
  void initState() {
    super.initState();
    _focusNode.addListener(() {
      setState(() => _isFocused = _focusNode.hasFocus);
      if (_focusNode.hasFocus) {
        Scrollable.ensureVisible(context, alignment: 0.5, duration: const Duration(milliseconds: 200));
      }
    });
  }

  @override
  void dispose() {
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return RawKeyboardListener(
      focusNode: _focusNode,
      onKey: (event) {
        if (event is RawKeyDownEvent &&
            (event.logicalKey == LogicalKeyboardKey.select ||
             event.logicalKey == LogicalKeyboardKey.enter ||
             event.logicalKey == LogicalKeyboardKey.space)) {
          widget.onTap();
        }
      },
      child: GestureDetector(
        onTap: widget.onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          decoration: BoxDecoration(
            color: AppTheme.cardBackground,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: _isFocused ? AppTheme.tvFocusBorder : Colors.transparent,
              width: _isFocused ? 3 : 1,
            ),
            boxShadow: _isFocused
                ? [
                    BoxShadow(
                      color: AppTheme.primaryRed.withOpacity(0.8),
                      blurRadius: 16,
                      spreadRadius: 2,
                    )
                  ]
                : [],
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (widget.channel.logo.isNotEmpty)
                Image.network(
                  widget.channel.logo,
                  height: 60,
                  width: 60,
                  fit: BoxFit.contain,
                  errorBuilder: (_, __, ___) => const Icon(
                    Icons.tv,
                    size: 40,
                    color: Colors.white54,
                  ),
                )
              else
                const Icon(Icons.tv, size: 40, color: Colors.white54),
              const SizedBox(height: 10),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: Text(
                  widget.channel.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                widget.channel.category,
                style: const TextStyle(color: AppTheme.primaryRed, fontSize: 11, fontWeight: FontWeight.w600),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
