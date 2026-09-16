import 'package:flutter/material.dart';
import '../models/media_item.dart';
import 'tv_focusable_card.dart';

class MediaCarousel extends StatelessWidget {
  final String title;
  final List<MediaItem> items;
  final Function(MediaItem) onItemTap;

  const MediaCarousel({
    Key? key,
    required this.title,
    required this.items,
    required this.onItemTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
          child: Text(
            title,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.bold,
              letterSpacing: 0.5,
            ),
          ),
        ),
        SizedBox(
          height: 235,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: items.length,
            itemBuilder: (context, index) {
              final item = items[index];
              return TvFocusableCard(
                item: item,
                onTap: () => onItemTap(item),
              );
            },
          ),
        ),
        const SizedBox(height: 12),
      ],
    );
  }
}
