const axios = require('axios');

const PRIMARY_BASE_URL = 'https://cuevana3l.pro';
const FALLBACK_BASE_URL = 'https://cuevana3l.biz';

const XOR_KEY = 'a45f04ce-2394-47c3-b718-0ecd97ce51d6';
const SERVER_PREFIXES = {
  1: 'https://morencius.com/v/',
  2: 'https://filemoon.sx/e/',
  3: 'https://awish.pro/e/',
  4: 'https://dood.li/e/'
};

/**
 * Extrae el flujo HLS (.m3u8) directo y libre de anuncios desde un embed de VidHide
 */
async function extractVidhideStream(embedUrl) {
  if (!embedUrl || (!embedUrl.includes('morencius.com') && !embedUrl.includes('vidhide'))) {
    return null;
  }
  try {
    const res = await axios.get(embedUrl, {
      timeout: 7000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': PRIMARY_BASE_URL + '/'
      }
    });
    const html = res.data || '';
    const idx = html.indexOf('eval(function(p,a,c,k,e,d)');
    if (idx === -1) return null;
    const end = html.indexOf('</script>', idx);
    const evalCode = html.slice(idx, end).trim();
    const codeToRun = evalCode.replace(/^eval\(/, '(');
    const unpacked = eval(codeToRun);
    const m3u8Match = unpacked.match(/https?:\/\/[^\s"',\\]+\.m3u8[^\s"',\\]*/i);
    return m3u8Match ? m3u8Match[0] : null;
  } catch (err) {
    return null;
  }
}

// Caché en memoria: TTL de 12 horas para acelerar respuestas instantáneas
const cache = new Map();
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

function getCacheKey({ title, originalTitle, tmdbId, type = 'movie', season = 1, episode = 1 }) {
  const normTitle = String(title || originalTitle || tmdbId || '').toLowerCase().trim();
  return `${normTitle}:${type}:${season}:${episode}`;
}

function cleanText(str = '') {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Descifra el token de reproducción utilizado por la infraestructura Cuevana
 */
function decryptToken(token) {
  if (!token || typeof token !== 'string') return '';
  try {
    const serverPrefix = SERVER_PREFIXES[token[0]] || 'https://morencius.com/v/';
    const decoded = Buffer.from(token.slice(1), 'base64').toString('binary');
    let decrypted = '';
    for (let i = 0; i < decoded.length; i++) {
      decrypted += String.fromCharCode(decoded.charCodeAt(i) ^ XOR_KEY.charCodeAt(i % XOR_KEY.length));
    }
    return serverPrefix + decrypted;
  } catch (err) {
    return '';
  }
}

function getServerNameFromUrl(url = '') {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes('morencius') || hostname.includes('vidhide')) return 'VidHide';
    if (hostname.includes('martinshop') || hostname.includes('streamwish') || hostname.includes('awish')) return 'StreamWish';
    if (hostname.includes('filemoon')) return 'FileMoon';
    if (hostname.includes('dood')) return 'DoodStream';
    if (hostname.includes('vsembed')) return 'VSEmbed';
    if (hostname.includes('vidlink')) return 'VidLink';
    if (hostname.includes('videasy')) return 'Videasy';
    if (hostname.includes('autoembed')) return 'Autoembed';
    if (hostname.includes('fembed')) return 'Fembed';
    if (hostname.includes('voe')) return 'Voe';
    return hostname.replace(/^www\./, '').split('.')[0] || 'Servidor';
  } catch (_) {
    return 'Servidor';
  }
}

function isLatinoLabel(label = '') {
  const text = String(label || '').toLowerCase();
  return /latino|es-mx|es-419|lat\.png/i.test(text);
}

/**
 * Realiza búsqueda interna en Cuevana
 */
async function searchCuevana(query, baseUrl = PRIMARY_BASE_URL) {
  if (!query) return [];
  try {
    const searchUrl = `${baseUrl}/explorar?s=${encodeURIComponent(query)}`;
    const response = await axios.get(searchUrl, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9'
      }
    });

    const html = response.data || '';
    const hrefMatches = html.match(/href="([^"]+)"/gi) || [];
    const hrefs = [...new Set(hrefMatches.map(m => m.replace(/^href="|"/gi, '')))];

    return hrefs.filter(link => link.includes('/pelicula/') || link.includes('/serie/'));
  } catch (error) {
    if (baseUrl === PRIMARY_BASE_URL) {
      return searchCuevana(query, FALLBACK_BASE_URL);
    }
    return [];
  }
}

/**
 * Extrae y descifra los servidores de una página de detalle de Cuevana
 */
async function fetchCuevanaDetailByUrl(detailUrl) {
  try {
    const response = await axios.get(detailUrl, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9',
        'Referer': PRIMARY_BASE_URL
      }
    });

    const html = response.data || '';
    const tabItems = html.match(/<li class="tab-video-item">[\s\S]*?<\/li>\s*(?=<li class="tab-video-item">|<\/ul>)/gi) || [];
    const results = [];

    for (const tab of tabItems) {
      let language = 'Subtitulado';
      let isLatino = false;
      let isCastellano = false;
      let priority = 5;

      if (tab.includes('lat.png') || /latino/i.test(tab)) {
        language = 'Español Latino';
        isLatino = true;
        priority = 1;
      } else if (tab.includes('cas.png') || /castellano/i.test(tab)) {
        language = 'Español Castellano';
        isCastellano = true;
        priority = 3;
      } else if (tab.includes('sub.png') || /subtitulado/i.test(tab)) {
        language = 'Subtitulado / VO';
        priority = 4;
      }

      const serverTags = tab.match(/data-server="([^"]+)"/gi) || [];
      for (let i = 0; i < serverTags.length; i++) {
        const rawUrl = serverTags[i].replace(/^data-server="|"/gi, '');
        let embedUrl = rawUrl;
        let serverName = getServerNameFromUrl(rawUrl);

        if (rawUrl.includes('token=')) {
          const token = rawUrl.split('token=')[1].split('&')[0];
          const decrypted = decryptToken(token);
          if (decrypted) {
            embedUrl = decrypted;
            serverName = getServerNameFromUrl(decrypted);
          }
        } else if (rawUrl.includes('?v=')) {
          try {
            const b64 = rawUrl.split('?v=')[1].split('&')[0];
            const decoded = Buffer.from(b64, 'base64').toString('utf-8');
            if (/^https?:\/\//i.test(decoded)) {
              embedUrl = decoded;
              serverName = getServerNameFromUrl(decoded);
            }
          } catch (_) {}
        }

        if (embedUrl) {
          // Normalizar martinshop.xyz a awish.pro para evitar problemas con certificado SSL caducado
          if (embedUrl.includes('martinshop.xyz')) {
            embedUrl = embedUrl.replace('martinshop.xyz', 'awish.pro');
            serverName = 'StreamWish';
          }

          results.push({
            id: `cuevana-${isLatino ? 'lat' : isCastellano ? 'cas' : 'sub'}-${results.length + 1}`,
            server: serverName,
            name: `${isLatino ? '🇲🇽' : isCastellano ? '🇪🇸' : '🌐'} ${serverName} (${language})`,
            language: language,
            audio: isLatino ? 'Latino' : isCastellano ? 'Castellano' : 'Original',
            embedUrl: embedUrl,
            directEmbedUrl: rawUrl.includes('token=') ? rawUrl : embedUrl,
            isLatino: isLatino,
            priority: priority + (i * 0.1)
          });
        }
      }
    }

    // Deduplicar por URL de embed
    const unique = new Map();
    for (const item of results) {
      if (!unique.has(item.embedUrl)) {
        unique.set(item.embedUrl, item);
      }
    }

    return [...unique.values()].sort((a, b) => a.priority - b.priority);
  } catch (error) {
    return [];
  }
}

/**
 * Resuelve enlaces de streaming en Español Latino para películas y series
 */
async function resolveCuevanaStreamLinks({ title, originalTitle, tmdbId, imdbId, type = 'movie', season = 1, episode = 1 } = {}) {
  const cacheKey = getCacheKey({ title, originalTitle, tmdbId, type, season, episode });
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const isMovie = type === 'movie';
  // Generar variantes de búsqueda para maximizar probabilidades de coincidencia (ej: IntensaMente -> Intensa Mente)
  const spacedTitle = title ? title.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/(\D)(\d)/g, '$1 $2') : '';
  const queryCandidates = [
    title,
    originalTitle,
    spacedTitle,
    cleanText(title),
    cleanText(originalTitle)
  ].filter(Boolean);

  const uniqueQueries = [...new Set(queryCandidates)];
  const allResults = [];

  for (const q of uniqueQueries) {
    if (allResults.length > 0) break;
    try {
      const links = await searchCuevana(q);
      const targetPrefix = isMovie ? '/pelicula/' : '/serie/';
      const matchingLinks = links.filter(l => l.includes(targetPrefix));

      if (!matchingLinks.length) continue;

      let targetDetailUrl = matchingLinks[0];
      if (!isMovie) {
        // En series: Cuevana estructura como /serie/{slug}/episodio-{temporada}x{episodio}
        const slug = targetDetailUrl.split('/serie/')[1].replace(/\/.*$/, '');
        targetDetailUrl = `${PRIMARY_BASE_URL}/serie/${slug}/episodio-${season}x${episode}`;
      }

      const entries = await fetchCuevanaDetailByUrl(targetDetailUrl);
      if (entries.length > 0) {
        allResults.push(...entries);
      }
    } catch (_) {
      // Intentar con siguiente consulta candidata
    }
  }

  // Si encontramos servidores Latino, intentar extraer el flujo HLS nativo (.m3u8 directo) de VidHide
  const latVidhide = allResults.find(s => s.isLatino && (s.server === 'VidHide' || s.embedUrl.includes('morencius') || s.embedUrl.includes('vidhide')));
  if (latVidhide && latVidhide.embedUrl) {
    try {
      const directM3u8 = await extractVidhideStream(latVidhide.embedUrl);
      if (directM3u8) {
        allResults.unshift({
          id: 'cuevana-lat-direct-1',
          server: 'HLS Nativo',
          name: '🇲🇽 Servidor Latino Nativo (1080p Sin Anuncios)',
          quality: 'HD 1080p',
          language: 'Español Latino',
          audio: 'Latino',
          format: 'm3u8',
          isDirect: true,
          url: directM3u8,
          embedUrl: directM3u8,
          directEmbedUrl: directM3u8,
          isLatino: true,
          priority: 0.1
        });
      }
    } catch (_) {}
  }

  // Guardar en caché si se obtuvieron resultados
  if (allResults.length > 0) {
    cache.set(cacheKey, { timestamp: Date.now(), data: allResults });
  }

  return allResults;
}

module.exports = {
  BASE_URL: PRIMARY_BASE_URL,
  decryptToken,
  getServerNameFromUrl,
  isLatinoLabel,
  searchCuevana,
  fetchCuevanaDetailByUrl,
  extractVidhideStream,
  resolveCuevanaStreamLinks
};
