class EpisodeItem {
  final int id;
  final int episodeNumber;
  final String title;
  final String overview;
  final int durationMinutes;
  final String? streamUrl;

  EpisodeItem({
    required this.id,
    required this.episodeNumber,
    required this.title,
    required this.overview,
    required this.durationMinutes,
    this.streamUrl,
  });

  factory EpisodeItem.fromJson(Map<String, dynamic> json) {
    return EpisodeItem(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id'].toString()) ?? 0,
      episodeNumber: json['episodeNumber'] ?? 1,
      title: json['title'] ?? 'Episodio',
      overview: json['overview'] ?? '',
      durationMinutes: json['durationMinutes'] ?? 45,
      streamUrl: json['streamUrl'],
    );
  }
}

class SeasonItem {
  final int seasonNumber;
  final String name;
  final List<EpisodeItem> episodes;

  SeasonItem({
    required this.seasonNumber,
    required this.name,
    required this.episodes,
  });

  factory SeasonItem.fromJson(Map<String, dynamic> json) {
    return SeasonItem(
      seasonNumber: json['seasonNumber'] ?? 1,
      name: json['name'] ?? 'Temporada 1',
      episodes: (json['episodes'] as List<dynamic>?)
              ?.map((e) => EpisodeItem.fromJson(e))
              .toList() ??
          [],
    );
  }
}

class MediaItem {
  final int id;
  final int? tmdbId;
  final String type; // 'movie' o 'series'
  final String title;
  final String originalTitle;
  final String overview;
  final String poster;
  final String backdrop;
  final String releaseDate;
  final String year;
  final double rating;
  final int durationMinutes;
  final List<String> genres;
  final String category;
  final bool isFeatured;
  final String? streamUrl;
  final List<SeasonItem>? seasons;

  MediaItem({
    required this.id,
    this.tmdbId,
    required this.type,
    required this.title,
    required this.originalTitle,
    required this.overview,
    required this.poster,
    required this.backdrop,
    required this.releaseDate,
    required this.year,
    required this.rating,
    required this.durationMinutes,
    required this.genres,
    required this.category,
    required this.isFeatured,
    this.streamUrl,
    this.seasons,
  });

  bool get isMovie => type == 'movie';

  factory MediaItem.fromJson(Map<String, dynamic> json) {
    return MediaItem(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id'].toString()) ?? 0,
      tmdbId: json['tmdbId'],
      type: json['type'] ?? 'movie',
      title: json['title'] ?? 'Sin título',
      originalTitle: json['originalTitle'] ?? '',
      overview: json['overview'] ?? 'Sin descripción.',
      poster: json['poster'] ?? '',
      backdrop: json['backdrop'] ?? '',
      releaseDate: json['releaseDate'] ?? '',
      year: json['year']?.toString() ?? '',
      rating: (json['rating'] is num) ? (json['rating'] as num).toDouble() : 0.0,
      durationMinutes: json['durationMinutes'] ?? 120,
      genres: (json['genres'] as List<dynamic>?)?.map((g) => g.toString()).toList() ?? [],
      category: json['category'] ?? 'movies',
      isFeatured: json['isFeatured'] ?? false,
      streamUrl: json['streamUrl'] as String?,
      seasons: (json['seasons'] as List<dynamic>?)
          ?.map((s) => SeasonItem.fromJson(s))
          .toList(),
    );
  }
}

class HomeCategory {
  final String id;
  final String title;
  final List<MediaItem> items;

  HomeCategory({
    required this.id,
    required this.title,
    required this.items,
  });

  factory HomeCategory.fromJson(Map<String, dynamic> json) {
    return HomeCategory(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      items: (json['items'] as List<dynamic>?)
              ?.map((item) => MediaItem.fromJson(item))
              .toList() ??
          [],
    );
  }
}

class IptvChannel {
  final String id;
  final String name;
  final String category;
  final String logo;
  final String streamUrl;

  IptvChannel({
    required this.id,
    required this.name,
    required this.category,
    required this.logo,
    required this.streamUrl,
  });

  factory IptvChannel.fromJson(Map<String, dynamic> json) {
    return IptvChannel(
      id: json['id']?.toString() ?? '',
      name: json['name'] ?? 'Canal en Vivo',
      category: json['category'] ?? 'General',
      logo: json['logo'] ?? '',
      streamUrl: json['streamUrl'] ?? '',
    );
  }
}
