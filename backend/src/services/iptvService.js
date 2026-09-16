const axios = require('axios');
const config = require('../config/config');

// Canales precargados de alta disponibilidad (IPTV-org / HLS verificados)
const CURATED_IPTV_CHANNELS = [
  {
    id: 'iptv_rtve',
    name: 'RTVE 24h Noticias',
    category: 'Noticias',
    country: 'ES',
    logo: 'https://i.imgur.com/2YVp6vA.png',
    streamUrl: 'https://rtvelivestream.akamaized.net/rtvesec/24h/24h_main.m3u8'
  },
  {
    id: 'iptv_france24',
    name: 'France 24 Español',
    category: 'Noticias',
    country: 'FR',
    logo: 'https://i.imgur.com/dK0p8hE.png',
    streamUrl: 'https://f24hls-i.akamaihd.net/hls/live/221193/F24_ES_LO_HLS/master.m3u8'
  },
  {
    id: 'iptv_dw_es',
    name: 'DW Español',
    category: 'Noticias',
    country: 'DE',
    logo: 'https://i.imgur.com/W2hVn5H.png',
    streamUrl: 'https://dwstream4-lh.akamaihd.net/i/dwasia_es@123955/master.m3u8'
  },
  {
    id: 'iptv_redbull',
    name: 'Red Bull TV Deportes',
    category: 'Deportes',
    country: 'US',
    logo: 'https://i.imgur.com/z4b0B0x.png',
    streamUrl: 'https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8'
  },
  {
    id: 'iptv_pluto_cine',
    name: 'Pluto TV Cine Estelar',
    category: 'Cine',
    country: 'ES',
    logo: 'https://i.imgur.com/U3qUa4F.png',
    streamUrl: 'https://service-stitcher.clusters.pluto.tv/v1/stitch/hls/channel/5d8a572a17be21f153096057/master.m3u8?advertisingId=&appName=web&appVersion=unknown'
  },
  {
    id: 'iptv_nasa',
    name: 'NASA TV HD',
    category: 'Ciencia',
    country: 'US',
    logo: 'https://i.imgur.com/1B9R8mJ.png',
    streamUrl: 'https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8'
  },
  {
    id: 'iptv_rakuten_comedy',
    name: 'Rakuten Comedy',
    category: 'Entretenimiento',
    country: 'ES',
    logo: 'https://i.imgur.com/8QjZk2m.png',
    streamUrl: 'https://rakuten-comedy-1-es.samsung.wurl.tv/playlist.m3u8'
  },
  {
    id: 'iptv_clubbing_tv',
    name: 'Clubbing TV Música',
    category: 'Música',
    country: 'FR',
    logo: 'https://i.imgur.com/J3i7R2l.png',
    streamUrl: 'https://clubbingtv-hls.secure.footprint.net/live/master.m3u8'
  }
];

let cachedChannels = [...CURATED_IPTV_CHANNELS];
let lastFetchTime = 0;

/**
 * Parsea una lista de reproducción M3U de IPTV
 */
function parseM3U(m3uText) {
  const lines = m3uText.split('\n');
  const channels = [];
  let currentChannel = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('#EXTINF:')) {
      const nameMatch = line.match(/,(.+)$/);
      const name = nameMatch ? nameMatch[1].trim() : 'Canal en Vivo';

      const logoMatch = line.match(/tvg-logo="([^"]+)"/i);
      const logo = logoMatch ? logoMatch[1] : '';

      const groupMatch = line.match(/group-title="([^"]+)"/i);
      const category = groupMatch ? groupMatch[1] : 'General';

      const idMatch = line.match(/tvg-id="([^"]+)"/i);
      const id = idMatch ? idMatch[1] : `channel_${channels.length + 1}`;

      currentChannel = {
        id,
        name,
        category,
        logo: logo || 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=200',
        streamUrl: ''
      };
    } else if (line.startsWith('http') && currentChannel) {
      currentChannel.streamUrl = line;
      channels.push(currentChannel);
      currentChannel = null;
    }
  }

  return channels;
}

/**
 * Obtiene y cachea canales de IPTV-org
 */
async function getChannels(forceRefresh = false) {
  const now = Date.now();
  const cacheAge = (now - lastFetchTime) / (1000 * 60);

  if (!forceRefresh && cachedChannels.length > CURATED_IPTV_CHANNELS.length && cacheAge < config.iptv.cacheDurationMinutes) {
    return cachedChannels;
  }

  try {
    const response = await axios.get(config.iptv.sourceUrl, {
      timeout: 8000,
      headers: {
        'User-Agent': 'StreamFlix/1.0.0'
      }
    });

    if (response.data && typeof response.data === 'string') {
      const parsed = parseM3U(response.data);
      if (parsed.length > 0) {
        // Filtrar y combinar con canales curados
        cachedChannels = [...CURATED_IPTV_CHANNELS, ...parsed.slice(0, 100)];
        lastFetchTime = now;
        return cachedChannels;
      }
    }
  } catch (err) {
    console.warn(`[IPTV] Usando catálogo curado de respaldo: ${err.message}`);
  }

  return cachedChannels;
}

/**
 * Obtiene las categorías de canales disponibles
 */
async function getCategories() {
  const channels = await getChannels();
  const set = new Set();
  channels.forEach(c => {
    if (c.category) set.add(c.category);
  });
  return Array.from(set);
}

module.exports = {
  getChannels,
  getCategories
};
