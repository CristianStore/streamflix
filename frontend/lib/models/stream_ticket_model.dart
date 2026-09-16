class StreamTicketModel {
  final String ticket;
  final String expiresAt;
  final int expiresInSeconds;
  final String streamEndpoint;

  StreamTicketModel({
    required this.ticket,
    required this.expiresAt,
    required this.expiresInSeconds,
    required this.streamEndpoint,
  });

  factory StreamTicketModel.fromJson(Map<String, dynamic> json) {
    return StreamTicketModel(
      ticket: json['ticket'] ?? '',
      expiresAt: json['expiresAt'] ?? '',
      expiresInSeconds: json['expiresInSeconds'] ?? 900,
      streamEndpoint: json['streamEndpoint'] ?? '',
    );
  }
}

class StreamManifestResponse {
  final String title;
  final String format;
  final String url;
  final String? expiresAt;
  final String? audioLanguage;
  final List<String> fallbackUrls;

  StreamManifestResponse({
    required this.title,
    required this.format,
    required this.url,
    this.expiresAt,
    this.audioLanguage,
    this.fallbackUrls = const [],
  });

  factory StreamManifestResponse.fromJson(Map<String, dynamic> json) {
    return StreamManifestResponse(
      title: json['title'] ?? 'Video',
      format: json['format'] ?? 'HLS (.m3u8)',
      url: json['url'] ?? '',
      expiresAt: json['expiresAt'],
        audioLanguage: json['audioLanguage'],
          fallbackUrls: (json['fallbackSources'] as List<dynamic>? ?? [])
            .whereType<Map<String, dynamic>>()
            .map((source) => source['url']?.toString() ?? '')
          .where((url) => url.isNotEmpty)
          .toList(),
    );
  }
}
