const LATIN_AUDIO_ALIASES = ['latino', 'español latino', 'espanol latino', 'es-lat', 'es-mx', 'es-419', 'es', 'spa'];

function normalizeAudioValue(value = '') {
  return String(value).trim().toLowerCase();
}

function matchesLatinAudio(value = '') {
  const normalized = normalizeAudioValue(value);
  if (!normalized) return false;
  return LATIN_AUDIO_ALIASES.some(alias => normalized.includes(alias));
}

function resolveAudioPreference(media = {}, requestedMode = 'auto') {
  const normalizedMode = normalizeAudioValue(requestedMode);
  if (['latino', 'espanol', 'es-lat', 'es-mx', 'es'].includes(normalizedMode)) {
    return 'latino';
  }
  if (['original', 'ingles', 'en', 'english'].includes(normalizedMode)) {
    return 'original';
  }

  const explicitOptions = Array.isArray(media.audioOptions) ? media.audioOptions : [];
  const explicitList = explicitOptions.map(option => String(option));
  if (explicitList.some(option => matchesLatinAudio(option))) {
    return 'latino';
  }

  const languageText = [media.audioLanguage, media.language, media.originalLanguage]
    .filter(Boolean)
    .map(value => String(value));
  if (languageText.some(value => matchesLatinAudio(value))) {
    return 'latino';
  }

  return 'original';
}

function getAudioOptions(media = {}) {
  const explicitOptions = Array.isArray(media.audioOptions) ? media.audioOptions : [];
  const fallback = ['Original', 'Latino'];
  const values = explicitOptions.length ? explicitOptions : fallback;

  return values.map((label, index) => ({
    id: String(label).toLowerCase().replace(/\s+/g, '-'),
    label: String(label),
    value: matchesLatinAudio(label) ? 'latino' : 'original',
    priority: index
  }));
}

function buildPlaybackUrl({
  media = {},
  serverIndex = 0,
  audioMode = 'original',
  season = 1,
  episode = 1,
  type = media.type || 'movie'
} = {}) {
  const id = media.tmdbId ?? media.id ?? 0;
  const resolvedMode = resolveAudioPreference(media, audioMode);
  const audioQuery = resolvedMode === 'latino'
    ? 'audio=latino&audio_lang=es-MX'
    : 'audio=original&audio_lang=en';

  const serverTemplates = [
    {
      // Servidor 1 — VidLink (Forzar Español Latino)
      movie: `https://vidlink.pro/movie/${id}?multiLang=true&lang=es`,
      tv: `https://vidlink.pro/tv/${id}/${season}/${episode}?multiLang=true&lang=es`
    },
    {
      // Servidor 2 — Autoembed (lang=es)
      movie: `https://player.autoembed.cc/embed/movie/${id}?lang=es`,
      tv: `https://player.autoembed.cc/embed/tv/${id}/${season}/${episode}?lang=es`
    }
  ];

  const selected = serverTemplates[Math.min(Math.max(serverIndex, 0), serverTemplates.length - 1)] || serverTemplates[0];
  const url = type === 'series' ? selected.tv : selected.movie;
  return `${url}${url.includes('?') ? '&' : '?'}${audioQuery}`;
}

module.exports = {
  LATIN_AUDIO_ALIASES,
  normalizeAudioValue,
  matchesLatinAudio,
  resolveAudioPreference,
  getAudioOptions,
  buildPlaybackUrl
};
