/**
 * StreamVault — Premium IPTV Player
 * Main Application Logic — v2.0
 *
 * Changelog v2:
 *  - Loads local M3U files (aynaott.m3u, Sports-138.m3u) directly via fetch
 *  - Group-title → country mapper (Bangla→BD, Hindi/Indian Bangla→IN, etc.)
 *  - Flag emoji parser for channels that embed flags in name (e.g. "TSports 🇧🇩")
 *  - Fixed country filter to work with mapped countries, not just tvg-country
 *  - Sports-138.m3u: auto-tags all as Sports + detects country from flag emoji
 *  - Merged all sources: local files + remote fallback + embedded fallback
 */

'use strict';

/* ============================================================
   CONFIGURATION
   ============================================================ */
const CONFIG = {
  // Local M3U files (same-origin — no CORS issues at all)
  LOCAL_PLAYLISTS: [
    { file: './aynaott.m3u',    label: 'AynaOTT Channels' },
    { file: './Sports-138.m3u', label: 'Sports Pack',  defaultGroup: 'Sports' },
  ],

  // Remote M3U sources (tried only after local files)
  REMOTE_SOURCES: [
    'https://iptv-org.github.io/iptv/index.m3u',
  ],

  // CORS Proxy chain for remote sources
  CORS_PROXIES: [
    'https://corsproxy.io/?',
    'https://api.allorigins.win/raw?url=',
    'https://cors-anywhere.herokuapp.com/',
  ],

  // Embedded fallback playlist — always works, curated global streams
  FALLBACK_PLAYLIST: `#EXTM3U
#EXTINF:-1 tvg-logo="https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/BBC_News_2019.svg/240px-BBC_News_2019.svg.png" group-title="News" tvg-country="GB",BBC News
https://vs-hls-push-ww-live.akamaized.net/x=4/i=urn:bbc:pips:service:bbc_news_channel_hd/t=3840/v=pv14/b=5070016/main.m3u8
#EXTINF:-1 tvg-logo="" group-title="News" tvg-country="QA",Al Jazeera English
https://live-hls-apps-aje-fa.getaj.net/AJE/index.m3u8
#EXTINF:-1 tvg-logo="https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Deutsche_Welle_symbol_2012.svg/240px-Deutsche_Welle_symbol_2012.svg.png" group-title="News" tvg-country="DE",DW News English
https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/master.m3u8
#EXTINF:-1 tvg-logo="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/France24_2021.svg/200px-France24_2021.svg.png" group-title="News" tvg-country="FR",France 24 English
https://stream.france24.com/hls/live/2037163/F24_EN_LO_HLS/master.m3u8
#EXTINF:-1 tvg-logo="https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/TRT_World_logo.svg/240px-TRT_World_logo.svg.png" group-title="News" tvg-country="TR",TRT World
https://tv-trtworld.medya.trt.com.tr/master.m3u8
#EXTINF:-1 tvg-logo="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/NASA_logo.svg/240px-NASA_logo.svg.png" group-title="Science" tvg-country="US",NASA TV
https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8
#EXTINF:-1 tvg-logo="" group-title="Sports" tvg-country="AT",Red Bull TV
https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT-AVC-HLS/master_1628.m3u8
#EXTINF:-1 tvg-logo="https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/NHK_World-Japan_Logo.svg/240px-NHK_World-Japan_Logo.svg.png" group-title="News" tvg-country="JP",NHK World Japan
https://nhkworld3gb-i.akamaihd.net/hls/live/252886/nhkworld3gb/index.m3u8
#EXTINF:-1 tvg-logo="" group-title="Entertainment" tvg-country="KR",Arirang TV
https://amdlive-ch01.akamaized.net/cmaf/live/2003399/arirang_worldtv/index.m3u8
#EXTINF:-1 tvg-logo="" group-title="Weather" tvg-country="US",AccuWeather
https://cdn-ue1-prod.tsv2.amagi.tv/linear/amg00684-accuweather-accuweather-plex/playlist.m3u8
#EXTINF:-1 tvg-logo="" group-title="Weather" tvg-country="US",Fox Weather
https://247wlive.foxweather.com/stream/index.m3u8
`,

  CHANNELS_PER_PAGE: 48,
  STATUS_CHECK_BATCH: 6,
  STATUS_CHECK_DELAY: 300,
  STATUS_PROBE_TIMEOUT: 6000,
  VIEWER_UPDATE_INTERVAL: 4000,
  BASE_VIEWERS: 3241,
};

/* ============================================================
   GROUP → COUNTRY + CATEGORY MAPPINGS
   These fix the aynaott.m3u groups that have no tvg-country
   ============================================================ */
const GROUP_MAP = {
  // group-title → { country, category }
  // 'Bangla' from aynaott.m3u = BD Bangla channels → own 'Bangla' category
  'bangla':         { country: 'BD', category: 'Bangla' },
  'news':           { country: null, category: 'News' },
  'sports':         { country: null, category: 'Sports' },
  // Hindi / Indian Bangla = Indian channels
  'hindi':          { country: 'IN', category: 'Entertainment' },
  'indian bangla':  { country: 'IN', category: 'Entertainment' },
  // 'English' group in aynaott = mixed international — no forced country
  'english':        { country: null, category: 'Entertainment' },
  'channels':       { country: null, category: 'Entertainment' },
  'kids':           { country: null, category: 'Kids' },
  // Religious group = no forced country (channels are from many countries)
  'religious':      { country: null, category: 'Religious' },
  'latest':         { country: null, category: 'Entertainment' },
  'urdhu':          { country: 'PK', category: 'Entertainment' },
  'weather':        { country: null, category: 'Weather' },
  'movie':          { country: null, category: 'Movies' },
  'movies':         { country: null, category: 'Movies' },
  'music':          { country: null, category: 'Music' },
  'documentary':    { country: null, category: 'Documentary' },
  'science':        { country: null, category: 'Documentary' },
  'entertainment':  { country: null, category: 'Entertainment' },
};

// Flag emoji → ISO country code
const FLAG_TO_COUNTRY = {
  '🇧🇩': 'BD', '🇮🇳': 'IN', '🇺🇸': 'US', '🇬🇧': 'GB', '🇦🇺': 'AU',
  '🇨🇦': 'CA', '🇫🇷': 'FR', '🇩🇪': 'DE', '🇯🇵': 'JP', '🇨🇳': 'CN',
  '🇰🇷': 'KR', '🇵🇰': 'PK', '🇹🇷': 'TR', '🇸🇦': 'SA', '🇦🇪': 'AE',
  '🇮🇹': 'IT', '🇪🇸': 'ES', '🇧🇷': 'BR', '🇲🇽': 'MX', '🇷🇺': 'RU',
  '🇶🇦': 'QA', '🇸🇬': 'SG', '🇮🇩': 'ID', '🇦🇹': 'AT', '🇳🇱': 'NL',
  '🇵🇹': 'PT', '🇳🇴': 'NO', '🇵🇱': 'PL', '🇨🇿': 'CZ', '🇷🇴': 'RO',
  '🇧🇬': 'BG', '🇺🇦': 'UA', '🇭🇺': 'HU', '🇧🇾': 'BY', '🇦🇱': 'AL',
  '🇽🇰': 'XK', '🇮🇱': 'IL', '🇨🇱': 'CL', '🇦🇷': 'AR', '🇨🇴': 'CO',
  '🇬🇹': 'GT', '🇹🇲': 'TM', '🇲🇴': 'MO', '🇻🇳': 'VN', '🇭🇰': 'HK',
};

/* ============================================================
   STATE
   ============================================================ */
const STATE = {
  allChannels: [],
  filteredChannels: [],
  currentFilter: 'all',
  currentSearch: '',
  currentSort: 'default',
  currentPage: 1,
  isListView: false,
  playerInstance: null,
  currentChannel: null,
  viewerCount: CONFIG.BASE_VIEWERS,
  workingCount: 0,
  checkingQueue: [],
  statusMap: {},
  categoryCounts: {},
  countryCounts: {},
  sourceCounts: {},
  loadingPlaylist: false,
  viewerInterval: null,
};

/* ============================================================
   DOM REFERENCES
   ============================================================ */
const $ = id => document.getElementById(id);
const DOM = {
  sidebar: $('sidebar'),
  sidebarOverlay: $('sidebarOverlay'),
  hamburger: $('hamburger'),
  searchInput: $('searchInput'),
  channelsGrid: $('channelsGrid'),
  loadingContainer: $('loadingContainer'),
  errorContainer: $('errorContainer'),
  errorMessage: $('errorMessage'),
  playerSection: $('playerSection'),
  nowPlayingTitle: $('nowPlayingTitle'),
  nowPlayingCategory: $('nowPlayingCategory'),
  playerQuality: $('playerQuality'),
  playerOverlay: $('playerOverlay'),
  toastContainer: $('toastContainer'),
  totalChannels: $('totalChannels'),
  workingChannels: $('workingChannels'),
  liveViewers: $('liveViewers'),
  totalCountries: $('totalCountries'),
  channelsHeading: $('channelsHeading'),
  channelsCount: $('channelsCount'),
  paginationWrap: $('paginationWrap'),
  prevPageBtn: $('prevPageBtn'),
  nextPageBtn: $('nextPageBtn'),
  pageNumbers: $('pageNumbers'),
  gridViewBtn: $('gridViewBtn'),
  listViewBtn: $('listViewBtn'),
  sortSelect: $('sortSelect'),
  pipBtn: $('pipBtn'),
  refreshBtn: $('refreshBtn'),
  retryBtn: $('retryBtn'),
  closePlayerBtn: $('closePlayerBtn'),
  loadingText: $('loadingText'),
  badgeAll: $('badge-all'),
  badgeBangla: $('badge-bangla'),
  badgeLocal: $('badge-local'),
  badgeSports: $('badge-sports'),
  badgeNews: $('badge-news'),
  badgeMovies: $('badge-movies'),
  badgeEntertainment: $('badge-entertainment'),
  badgeKids: $('badge-kids'),
  badgeReligious: $('badge-religious'),
  badgeBd: $('badge-bd'),
  badgeIn: $('badge-in'),
  badgeUs: $('badge-us'),
  badgeGb: $('badge-gb'),
  badgePk: $('badge-pk'),
  badgeOther: $('badge-other'),
};

/* ============================================================
   TOAST NOTIFICATION SYSTEM
   ============================================================ */
const Toast = {
  show(type, title, body, duration = 4000) {
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `
      <div class="toast-icon">${icons[type] || 'ℹ️'}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        ${body ? `<div class="toast-body">${body}</div>` : ''}
      </div>`;
    DOM.toastContainer.appendChild(el);
    setTimeout(() => {
      el.classList.add('removing');
      setTimeout(() => el.remove(), 350);
    }, duration);
  },
  success: (title, body) => Toast.show('success', title, body),
  error:   (title, body) => Toast.show('error',   title, body, 6000),
  info:    (title, body) => Toast.show('info',     title, body),
  warning: (title, body) => Toast.show('warning',  title, body),
};

/* ============================================================
   FLAG EMOJI PARSER
   Extracts ISO country code from flag emojis embedded in channel names
   e.g. "TSports HD 🇧🇩" → 'BD'
   ============================================================ */
function extractFlagCountry(text) {
  for (const [emoji, code] of Object.entries(FLAG_TO_COUNTRY)) {
    if (text.includes(emoji)) return code;
  }
  return null;
}

function stripFlags(text) {
  return text.replace(/[\u{1F1E0}-\u{1F1FF}]{2}/gu, '').trim();
}

/* ============================================================
   GROUP → CATEGORY / COUNTRY RESOLVER
   ============================================================ */
function resolveGroupMeta(groupTitle, channelName, tvgCountry) {
  const key = (groupTitle || '').toLowerCase().trim();
  const mapped = GROUP_MAP[key];

  let category = mapped?.category || classifyByName(channelName) || 'Entertainment';
  let country  = tvgCountry || mapped?.country || extractFlagCountry(channelName) || null;

  // Clean up the group label for display
  let displayGroup = groupTitle || category;

  return { category, country, displayGroup };
}

function classifyByName(name) {
  const lower = name.toLowerCase();
  if (/sport|football|cricket|soccer|nba|nfl|espn|tennis|golf|f1|moto|racing|olympic|bein|laliga/.test(lower)) return 'Sports';
  if (/news|headline|breaking|current|press|samachar/.test(lower)) return 'News';
  if (/movie|film|cinema|cine|flick|bollywood|jalsha|hallmark/.test(lower)) return 'Movies';
  if (/music|hits|mtv|songs|radio|sangeet/.test(lower)) return 'Music';
  if (/kid|cartoon|nickelodeon|disney|baby|junior|moonbug/.test(lower)) return 'Kids';
  if (/docu|national geo|discovery|animal|planet|history|adventure/.test(lower)) return 'Documentary';
  if (/islam|quran|madani|deen|eman|religious|church|god|pray/.test(lower)) return 'Religious';
  if (/weather|accuweather/.test(lower)) return 'Weather';
  return 'Entertainment';
}

/* ============================================================
   M3U PARSER
   ============================================================ */
function parseM3U(text, defaultGroup = null) {
  // Normalize line endings
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    .split('\n').map(l => l.trim()).filter(Boolean);

  const channels = [];
  let pendingMeta = null;

  for (const line of lines) {
    if (line.startsWith('#EXTINF')) {
      pendingMeta = parseExtinf(line, defaultGroup);
    } else if (pendingMeta && !line.startsWith('#') && (line.startsWith('http') || line.startsWith('rtmp') || line.startsWith('rtsp'))) {
      pendingMeta.url = line;
      channels.push(pendingMeta);
      pendingMeta = null;
    } else if (!line.startsWith('#')) {
      pendingMeta = null; // orphan URL without EXTINF
    }
  }
  return channels;
}

function parseExtinf(line, defaultGroup = null) {
  const extract = (attr) => {
    const m = line.match(new RegExp(`${attr}="([^"]*)"`, 'i'));
    return m ? m[1].trim() : '';
  };

  const nameMatch = line.match(/,(.+)$/);
  const rawName = nameMatch ? nameMatch[1].trim() : 'Unknown Channel';

  const tvgCountry = extract('tvg-country').toUpperCase() || null;
  const rawGroup   = extract('group-title') || defaultGroup || '';
  const logo       = extract('tvg-logo');
  const id         = extract('tvg-id');

  // Clean channel name (remove flag emojis from display name)
  const cleanName = stripFlags(rawName);

  // Resolve category and country
  const { category, country, displayGroup } = resolveGroupMeta(rawGroup, rawName, tvgCountry || '');

  return {
    name:       cleanName || rawName,
    rawName,
    groupTitle: displayGroup,
    category,
    country:    country || '',
    logo,
    id,
    url: '',
    source: 'unknown',   // will be set by loadPlaylist()
  };
}

/* ============================================================
   PLAYLIST LOADING
   ============================================================ */
async function loadPlaylist(customUrl = null) {
  if (STATE.loadingPlaylist) return;
  STATE.loadingPlaylist = true;

  setLoading(true);
  STATE.allChannels  = [];
  STATE.statusMap    = {};
  STATE.workingCount = 0;

  const allParsed = [];

  // ── 1. Custom URL (if provided) ──
  if (customUrl) {
    try {
      DOM.loadingText.textContent = 'Fetching custom playlist…';
      const text = await fetchWithCorsProxy(customUrl);
      const parsed = parseM3U(text);
      parsed.forEach(ch => ch.source = 'custom');
      if (parsed.length > 0) {
        allParsed.push(...parsed);
        Toast.success('Custom playlist loaded', `${parsed.length} channels added`);
      }
    } catch (err) {
      Toast.warning('Custom playlist failed', 'Could not fetch the URL');
    }
  }

  // ── 2. Local M3U files ──
  // Try multiple path formats for compatibility with both file:// and http://
  for (const src of CONFIG.LOCAL_PLAYLISTS) {
    const pathVariants = [
      src.file,
      src.file.replace('./', ''),
      './' + src.file.replace('./', ''),
    ];
    let loaded = false;
    for (const path of pathVariants) {
      try {
        DOM.loadingText.textContent = `Loading ${src.label}…`;
        const res = await fetch(path, { cache: 'no-cache' });
        if (res.ok) {
          const text = await res.text();
          // Validate it's actually an M3U
          if (text.includes('#EXTINF') || text.includes('#EXTM3U')) {
            const parsed = parseM3U(text, src.defaultGroup || null);
            parsed.forEach(ch => ch.source = 'local');
            if (parsed.length > 0) {
              allParsed.push(...parsed);
              console.log(`[StreamVault] ✓ Loaded ${parsed.length} channels from ${path}`);
              loaded = true;
              break;
            }
          }
        }
      } catch (err) {
        // Try next path variant
      }
    }
    if (!loaded) console.warn(`[StreamVault] ✗ Could not load: ${src.file}`);
  }

  // ── 3. Remote sources (Always attempt to load global channels) ──
  for (const source of CONFIG.REMOTE_SOURCES) {
    try {
      DOM.loadingText.textContent = 'Connecting to remote source…';
      const text = await fetchWithCorsProxy(source);
      const parsed = parseM3U(text);
      parsed.forEach(ch => ch.source = 'remote');
      if (parsed.length > 0) {
        allParsed.push(...parsed);
        Toast.success('Remote playlist loaded!', `${parsed.length} channels fetched`);
        break;
      }
    } catch (_) {
      console.warn(`[StreamVault] Remote source failed: ${source}`);
    }
  }

  // ── 4. Embedded fallback (always append curated channels) ──
  const fallbackParsed = parseM3U(CONFIG.FALLBACK_PLAYLIST);
  fallbackParsed.forEach(ch => ch.source = 'fallback');
  allParsed.push(...fallbackParsed);

  if (allParsed.length <= fallbackParsed.length) {
    Toast.info('Using built-in channels', 'Local files not found. Showing curated channels.');
  }

  // ── Deduplicate by URL ──
  const seen = new Set();
  STATE.allChannels = allParsed.filter(ch => {
    if (!ch.url || seen.has(ch.url)) return false;
    seen.add(ch.url);
    return true;
  });

  STATE.loadingPlaylist = false;
  buildCounts();
  setLoading(false);
  applyFilters();
  updateStats();
  updateNavBadges();
  startStatusChecks();
  if (!STATE.viewerInterval) startViewerSimulation();

  const localCount = STATE.allChannels.filter(ch => ch.source === 'local').length;
  Toast.success(
    `${STATE.allChannels.length} channels loaded`,
    `Local: ${localCount} · BD: ${STATE.countryCounts['BD']||0} · Sports: ${STATE.categoryCounts['Sports']||0}`
  );
}

/* ============================================================
   CORS PROXY FETCHING (for remote URLs only)
   ============================================================ */
async function fetchWithCorsProxy(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (res.ok) return await res.text();
  } catch (_) {}

  for (const proxy of CONFIG.CORS_PROXIES) {
    try {
      const res = await fetch(proxy + encodeURIComponent(url), { signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        const text = await res.text();
        if (text.includes('#EXTM3U') || text.includes('#EXTINF')) return text;
      }
    } catch (_) {}
  }

  throw new Error(`All fetch attempts failed for: ${url}`);
}

/* ============================================================
   ANALYTICS & COUNTS
   ============================================================ */
function buildCounts() {
  STATE.categoryCounts = {};
  STATE.countryCounts  = {};
  STATE.sourceCounts   = {};
  for (const ch of STATE.allChannels) {
    const cat  = ch.category || 'Other';
    const ctry = ch.country  || 'Other';
    const src  = ch.source   || 'other';
    STATE.categoryCounts[cat]  = (STATE.categoryCounts[cat]  || 0) + 1;
    STATE.countryCounts[ctry]  = (STATE.countryCounts[ctry]  || 0) + 1;
    STATE.sourceCounts[src]    = (STATE.sourceCounts[src]    || 0) + 1;
  }
}

function updateStats() {
  animateCounter(DOM.totalChannels,   STATE.allChannels.length);
  animateCounter(DOM.workingChannels, STATE.workingCount);
  animateCounter(DOM.totalCountries,  Object.keys(STATE.countryCounts).filter(c => c !== 'Other' && c !== '').length);
}

function animateCounter(el, target) {
  const current = parseInt(el.textContent.replace(/,/g, '')) || 0;
  if (current === target) return;
  const step = (target - current) / 25;
  let count = current;
  const timer = setInterval(() => {
    count += step;
    const done = step > 0 ? count >= target : count <= target;
    if (done) { el.textContent = target.toLocaleString(); clearInterval(timer); }
    else        el.textContent = Math.round(count).toLocaleString();
  }, 30);
}

/* Safe badge update — never crashes even if element is missing */
function setBadge(el, value) {
  if (el) el.textContent = value;
}

function updateNavBadges() {
  const cats = STATE.categoryCounts || {};
  const c    = STATE.countryCounts  || {};
  const src  = STATE.sourceCounts   || {};

  setBadge(DOM.badgeAll,           STATE.allChannels.length);
  setBadge(DOM.badgeBangla,        cats['Bangla']       || 0);
  setBadge(DOM.badgeLocal,         (src['local'] || 0) + (src['custom'] || 0));
  setBadge(DOM.badgeSports,        cats['Sports']        || 0);
  setBadge(DOM.badgeNews,          cats['News']          || 0);
  setBadge(DOM.badgeMovies,        cats['Movies']        || 0);
  setBadge(DOM.badgeEntertainment, cats['Entertainment'] || 0);
  setBadge(DOM.badgeKids,          cats['Kids']          || 0);
  setBadge(DOM.badgeReligious,     cats['Religious']     || 0);
  setBadge(DOM.badgeBd,            c['BD']  || 0);
  setBadge(DOM.badgeIn,            c['IN']  || 0);
  setBadge(DOM.badgeUs,            c['US']  || 0);
  setBadge(DOM.badgeGb,            c['GB']  || 0);
  setBadge(DOM.badgePk,            c['PK']  || 0);

  const mainCountries = new Set(['BD', 'IN', 'US', 'GB', 'PK', 'Other', '']);
  const intl = Object.entries(c)
    .filter(([k]) => !mainCountries.has(k))
    .reduce((acc, [, v]) => acc + v, 0);
  setBadge(DOM.badgeOther, intl);
}

/* ============================================================
   VIEWER SIMULATION
   ============================================================ */
function startViewerSimulation() {
  DOM.liveViewers.textContent = STATE.viewerCount.toLocaleString();
  STATE.viewerInterval = setInterval(() => {
    const delta = Math.floor(Math.random() * 80) - 30;
    STATE.viewerCount = Math.max(800, STATE.viewerCount + delta);
    DOM.liveViewers.textContent = STATE.viewerCount.toLocaleString();
  }, CONFIG.VIEWER_UPDATE_INTERVAL);
}

/* ============================================================
   CHANNEL STATUS MONITORING
   ============================================================ */
function startStatusChecks() {
  // Mark all as 'checking'
  for (const ch of STATE.allChannels) STATE.statusMap[ch.url] = 'checking';

  // Put currently visible channels at the FRONT of the queue
  const start = (STATE.currentPage - 1) * CONFIG.CHANNELS_PER_PAGE;
  const visible = STATE.filteredChannels.slice(start, start + CONFIG.CHANNELS_PER_PAGE);
  const visibleUrls = new Set(visible.map(ch => ch.url));
  const visibleFirst = STATE.allChannels.filter(ch => visibleUrls.has(ch.url));
  const rest         = STATE.allChannels.filter(ch => !visibleUrls.has(ch.url));
  STATE.checkingQueue = [...visibleFirst, ...rest];

  processBatch();
}

/**
 * Whenever the visible page changes (filter / search / pagination),
 * promote still-unchecked visible channels to the front of the queue.
 */
function prioritizeVisibleChannels() {
  if (STATE.checkingQueue.length === 0) return;
  const start = (STATE.currentPage - 1) * CONFIG.CHANNELS_PER_PAGE;
  const visible = STATE.filteredChannels.slice(start, start + CONFIG.CHANNELS_PER_PAGE);
  const visibleUrls = new Set(visible.map(ch => ch.url));
  const priority = STATE.checkingQueue.filter(ch => visibleUrls.has(ch.url));
  const rest     = STATE.checkingQueue.filter(ch => !visibleUrls.has(ch.url));
  STATE.checkingQueue = [...priority, ...rest];
}

async function processBatch() {
  if (STATE.checkingQueue.length === 0) return;
  const batch = STATE.checkingQueue.splice(0, CONFIG.STATUS_CHECK_BATCH);
  await Promise.allSettled(batch.map(ch => probeChannel(ch)));
  setTimeout(processBatch, CONFIG.STATUS_CHECK_DELAY);
}

async function probeChannel(channel) {
  const { url } = channel;
  if (!url) { markChannel(url, 'down'); return; }

  try {
    const isHls = url.includes('.m3u8') || url.includes('/hls/');
    if (isHls && typeof Hls !== 'undefined' && Hls.isSupported()) {
      await probeWithHls(url);
    } else {
      await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(CONFIG.STATUS_PROBE_TIMEOUT),
        mode: 'no-cors',
      });
    }
    markChannel(url, 'working');
    STATE.workingCount++;
  } catch (_) {
    markChannel(url, 'down');
  }

  DOM.workingChannels.textContent = STATE.workingCount.toLocaleString();
}

function probeWithHls(url) {
  return new Promise((resolve, reject) => {
    const hls   = new Hls({ enableWorker: false, maxBufferLength: 1, manifestLoadingTimeOut: CONFIG.STATUS_PROBE_TIMEOUT });
    const video = document.createElement('video');
    hls.loadSource(url);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => { hls.destroy(); resolve(); });
    hls.on(Hls.Events.ERROR, (_, data) => { if (data.fatal) { hls.destroy(); reject(); } });
    setTimeout(() => { hls.destroy(); reject(); }, CONFIG.STATUS_PROBE_TIMEOUT);
  });
}

function markChannel(url, status) {
  STATE.statusMap[url] = status;
  updateChannelCard(url, status);
}

function updateChannelCard(url, status) {
  // Use attribute selector but escape special chars
  let card;
  try {
    card = document.querySelector(`[data-url="${CSS.escape(url)}"]`);
  } catch (_) {
    card = null;
  }
  if (!card) return;
  const badge = card.querySelector('.status-badge');
  if (!badge) return;
  badge.className = `status-badge ${status}`;
  badge.innerHTML = `<span class="status-dot"></span>${status === 'working' ? 'Live' : status === 'down' ? 'Down' : 'Checking'}`;
}

/* ============================================================
   FILTERING & SORTING
   ============================================================ */
function applyFilters() {
  const search = STATE.currentSearch.toLowerCase().trim();
  const filter = STATE.currentFilter;
  const COUNTRY_FILTERS = new Set(['BD', 'IN', 'US', 'GB', 'PK']);

  // ── Filter step ──
  let results = STATE.allChannels.filter(ch => {
    // Search: match name, category, group, or country
    const matchSearch = !search ||
      ch.name.toLowerCase().includes(search) ||
      (ch.category  || '').toLowerCase().includes(search) ||
      (ch.groupTitle|| '').toLowerCase().includes(search) ||
      (ch.country   || '').toLowerCase().includes(search);

    // Category / country filter
    let matchFilter;
    if (filter === 'all') {
      matchFilter = true;
    } else if (filter === 'Local') {
      matchFilter = ch.source === 'local' || ch.source === 'custom';
    } else if (COUNTRY_FILTERS.has(filter)) {
      matchFilter = ch.country === filter;
    } else if (filter === 'Other') {
      const main = new Set(['BD', 'IN', 'US', 'GB', 'PK', '']);
      matchFilter = !main.has(ch.country || '');
    } else {
      matchFilter = ch.category === filter;
    }

    return matchSearch && matchFilter;
  });

  // ── Sort step ──
  if (STATE.currentSort === 'name') {
    results.sort((a, b) => a.name.localeCompare(b.name));
  } else if (STATE.currentSort === 'status') {
    const order = { working: 0, checking: 1, down: 2 };
    results.sort((a, b) => {
      const sA = order[STATE.statusMap[a.url]] ?? 1;
      const sB = order[STATE.statusMap[b.url]] ?? 1;
      if (sA !== sB) return sA - sB;
      return a.name.localeCompare(b.name);
    });
  } else if (search) {
    // ── Search priority scoring ──
    // Score: 3 = exact match, 2 = name starts with, 1 = name contains, 0 = other field match
    results.sort((a, b) => {
      const scoreChannel = (ch) => {
        const n = ch.name.toLowerCase();
        if (n === search) return 3;                    // exact
        if (n.startsWith(search)) return 2;           // prefix
        if (n.includes(search)) return 1;             // contains
        return 0;                                      // matched category/country
      };
      return scoreChannel(b) - scoreChannel(a);       // higher score = earlier
    });
  }

  STATE.filteredChannels = results;
  STATE.currentPage = 1;
  renderChannels();
  updateHeading();

  // Give visible channels verification priority
  prioritizeVisibleChannels();
}

function updateHeading() {
  const labels = {
    all:           'All Channels',
    Local:         '📁 Local Channels',
    Bangla:        '🇧🇩 Bangla Channels',
    Sports:        '🏆 Sports',
    News:          '📰 News',
    Movies:        '🎬 Movies',
    Entertainment: '🎭 Entertainment',
    Kids:          '🧒 Kids',
    Religious:     '🕌 Religious',
    BD:            '🇧🇩 Bangladesh',
    IN:            '🇮🇳 India',
    US:            '🇺🇸 United States',
    GB:            '🇬🇧 United Kingdom',
    PK:            '🇵🇰 Pakistan',
    Other:         '🌍 International',
  };
  DOM.channelsHeading.textContent = labels[STATE.currentFilter] || STATE.currentFilter;
  DOM.channelsCount.textContent   = `${STATE.filteredChannels.length} channels`;
}

/* ============================================================
   RENDERING
   ============================================================ */
function renderChannels() {
  const start = (STATE.currentPage - 1) * CONFIG.CHANNELS_PER_PAGE;
  const page  = STATE.filteredChannels.slice(start, start + CONFIG.CHANNELS_PER_PAGE);

  if (STATE.filteredChannels.length === 0) {
    DOM.channelsGrid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:80px 24px;color:var(--text-muted)">
        <div style="font-size:3rem;margin-bottom:16px">📺</div>
        <h3 style="color:var(--text-secondary);margin-bottom:8px">No channels found</h3>
        <p>Try a different search or category</p>
      </div>`;
    DOM.paginationWrap.style.display = 'none';
    return;
  }

  DOM.channelsGrid.className = `channels-grid${STATE.isListView ? ' list-view' : ''}`;
  DOM.channelsGrid.innerHTML = '';

  page.forEach((ch, i) => DOM.channelsGrid.appendChild(createChannelCard(ch, i)));
  renderPagination();
}

const FLAG_DISPLAY = {
  BD:'🇧🇩', IN:'🇮🇳', US:'🇺🇸', GB:'🇬🇧', AU:'🇦🇺',
  CA:'🇨🇦', FR:'🇫🇷', DE:'🇩🇪', JP:'🇯🇵', CN:'🇨🇳',
  KR:'🇰🇷', PK:'🇵🇰', TR:'🇹🇷', SA:'🇸🇦', AE:'🇦🇪',
  IT:'🇮🇹', ES:'🇪🇸', BR:'🇧🇷', MX:'🇲🇽', RU:'🇷🇺',
  QA:'🇶🇦', SG:'🇸🇬', ID:'🇮🇩', AT:'🇦🇹', NL:'🇳🇱',
  PT:'🇵🇹', NO:'🇳🇴', PL:'🇵🇱', CZ:'🇨🇿', RO:'🇷🇴',
  BG:'🇧🇬', UA:'🇺🇦', HU:'🇭🇺', IL:'🇮🇱', AR:'🇦🇷',
  CO:'🇨🇴', CL:'🇨🇱', VN:'🇻🇳', HK:'🇭🇰',
};

function createChannelCard(ch, index) {
  const card = document.createElement('div');
  card.className = 'channel-card';
  card.dataset.url = ch.url;
  card.style.animationDelay = `${Math.min(index * 18, 280)}ms`;
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `Play ${ch.name}`);

  const status      = STATE.statusMap[ch.url] || 'checking';
  const statusLabel = status === 'working' ? 'Live' : status === 'down' ? 'Down' : 'Checking';
  const flag        = FLAG_DISPLAY[ch.country] || (ch.country ? '🌍' : '');

  const thumbContent = ch.logo
    ? `<img src="${ch.logo}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
       <span class="channel-initial" style="display:none">${getInitials(ch.name)}</span>`
    : `<span class="channel-initial">${getInitials(ch.name)}</span>`;

  card.innerHTML = `
    <div class="status-badge ${status}">
      <span class="status-dot"></span>${statusLabel}
    </div>
    <div class="channel-thumb">${thumbContent}</div>
    <div class="channel-info">
      <div class="channel-name" title="${escHtml(ch.name)}">${escHtml(ch.name)}</div>
      <div class="channel-meta">
        <span class="channel-category">${escHtml(ch.category || ch.groupTitle || 'General')}</span>
        ${flag ? `<span class="channel-flag" title="${ch.country}">${flag}</span>` : ''}
      </div>
    </div>`;

  card.addEventListener('click', () => playChannel(ch));
  card.addEventListener('keypress', e => { if (e.key === 'Enter' || e.key === ' ') playChannel(ch); });
  return card;
}

function getInitials(name) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase().replace(/[^A-Z0-9]/g, '') || '?';
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ============================================================
   PAGINATION
   ============================================================ */
function renderPagination() {
  const totalPages = Math.ceil(STATE.filteredChannels.length / CONFIG.CHANNELS_PER_PAGE);
  if (totalPages <= 1) { DOM.paginationWrap.style.display = 'none'; return; }

  DOM.paginationWrap.style.display  = 'flex';
  DOM.prevPageBtn.disabled = STATE.currentPage === 1;
  DOM.nextPageBtn.disabled = STATE.currentPage === totalPages;

  DOM.pageNumbers.innerHTML = '';
  for (const p of getPageRange(STATE.currentPage, totalPages)) {
    if (p === '...') {
      const el = document.createElement('span');
      el.textContent = '…';
      el.style.cssText = 'padding:0 6px;color:var(--text-muted);line-height:36px';
      DOM.pageNumbers.appendChild(el);
    } else {
      const btn = document.createElement('button');
      btn.className = `page-num${p === STATE.currentPage ? ' active' : ''}`;
      btn.textContent = p;
      btn.addEventListener('click', () => {
        STATE.currentPage = p;
        renderChannels();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      DOM.pageNumbers.appendChild(btn);
    }
  }
}

function getPageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
}

/* ============================================================
   VIDEO PLAYER
   ============================================================ */
async function playChannel(channel) {
  STATE.currentChannel = channel;
  const url = channel.url;

  // ── Pre-play stream verification ──
  const currentStatus = STATE.statusMap[url];
  if (currentStatus === 'down') {
    // Already known down — warn but still attempt
    Toast.warning('Stream may be offline', `${channel.name} was marked as down. Attempting anyway…`);
  } else if (currentStatus === 'checking' || currentStatus === undefined) {
    // Unknown status — quick verify first (3s timeout)
    DOM.playerSection.style.display = 'block';
    DOM.nowPlayingTitle.textContent  = channel.name;
    DOM.nowPlayingCategory.textContent = `${channel.category || 'General'} • ${channel.country || 'Global'}`;
    DOM.playerQuality.textContent = 'Verifying…';
    showPlayerOverlay(true);
    DOM.playerSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const isLive = await quickVerify(url);
    if (!isLive) {
      showPlayerOverlay(false);
      DOM.playerSection.style.display = 'none';
      markChannel(url, 'down');
      Toast.error('Stream unavailable', `${channel.name} did not respond. Try another channel.`);
      return;
    }
    markChannel(url, 'working');
    STATE.workingCount++;
    DOM.workingChannels.textContent = STATE.workingCount.toLocaleString();
  }

  // ── Open / reset player ──
  DOM.playerSection.style.display = 'block';
  DOM.nowPlayingTitle.textContent  = channel.name;
  DOM.nowPlayingCategory.textContent = `${channel.category || 'General'} • ${channel.country || 'Global'}`;
  showPlayerOverlay(true);

  if (STATE.playerInstance) {
    try { STATE.playerInstance.dispose(); } catch (_) {}
    STATE.playerInstance = null;
    rebuildVideoEl();
  }

  const isHls = url.includes('.m3u8') || url.includes('/hls/');
  if (isHls && typeof Hls !== 'undefined' && Hls.isSupported()) {
    initHlsPlayer(url);
  } else if (isHls && document.createElement('video').canPlayType('application/vnd.apple.mpegurl')) {
    initVideoJs(url, 'application/x-mpegURL');
  } else {
    initVideoJs(url, 'video/mp4');
  }

  DOM.playerSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* Quick 3-second stream reachability check */
async function quickVerify(url) {
  try {
    const isHls = url.includes('.m3u8') || url.includes('/hls/');
    if (isHls && typeof Hls !== 'undefined' && Hls.isSupported()) {
      return await new Promise(resolve => {
        const hls   = new Hls({ enableWorker: false, maxBufferLength: 1, manifestLoadingTimeOut: 3000 });
        const video = document.createElement('video');
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => { hls.destroy(); resolve(true); });
        hls.on(Hls.Events.ERROR, (_, d) => { if (d.fatal) { hls.destroy(); resolve(false); } });
        setTimeout(() => { hls.destroy(); resolve(false); }, 3500);
      });
    } else {
      // HEAD with no-cors — if it doesn't throw, stream is reachable
      await fetch(url, { method: 'HEAD', mode: 'no-cors', signal: AbortSignal.timeout(3000) });
      return true;
    }
  } catch (_) { return false; }
}

function rebuildVideoEl() {
  const container = document.querySelector('.video-container');
  if (!container) return;
  const old = container.querySelector('video, .video-js');
  if (old) old.remove();
  const video = document.createElement('video');
  video.id = 'streamPlayer';
  video.className = 'video-js vjs-theme-fantasy';
  video.controls = true;
  video.preload  = 'auto';
  video.setAttribute('playsinline', '');
  video.setAttribute('autoPictureInPicture', 'true');
  container.insertBefore(video, DOM.playerOverlay);
}

function initHlsPlayer(url) {
  const video = $('streamPlayer');
  if (!video) return;

  const player = videojs(video, { controls: true, autoplay: true, preload: 'auto', fluid: true });
  STATE.playerInstance = player;

  const hls = new Hls({ maxBufferLength: 30, enableWorker: true });
  hls.loadSource(url);
  hls.attachMedia(video);

  hls.on(Hls.Events.MANIFEST_PARSED, () => {
    showPlayerOverlay(false);
    video.play().catch(() => {});
    DOM.playerQuality.textContent = 'HLS Live';
    markChannel(url, 'working');
    STATE.workingCount++;
    DOM.workingChannels.textContent = STATE.workingCount.toLocaleString();
  });

  hls.on(Hls.Events.ERROR, (_, data) => {
    if (data.fatal) {
      showPlayerOverlay(false);
      Toast.error('Stream unavailable', data.type === Hls.ErrorTypes.NETWORK_ERROR
        ? 'Network error — stream may be offline' : 'Playback error occurred');
      markChannel(url, 'down');
    }
  });

  player.on('dispose', () => hls.destroy());
}

function initVideoJs(url, type) {
  const video = $('streamPlayer');
  if (!video) return;

  const player = videojs(video, { controls: true, autoplay: true, preload: 'auto', fluid: true, sources: [{ src: url, type }] });
  STATE.playerInstance = player;

  player.on('ready',   () => { showPlayerOverlay(false); DOM.playerQuality.textContent = type.includes('mpegURL') ? 'HLS' : 'MP4'; });
  player.on('error',   () => { showPlayerOverlay(false); Toast.error('Playback Error', 'Stream may be offline or geo-restricted'); markChannel(url, 'down'); });
  player.on('playing', () => showPlayerOverlay(false));
  player.on('waiting', () => showPlayerOverlay(true));
  player.on('canplay', () => showPlayerOverlay(false));
}

function showPlayerOverlay(show) {
  DOM.playerOverlay.classList.toggle('visible', show);
}

function closePlayer() {
  // Exit PIP if active before destroying player
  if (document.pictureInPictureElement) {
    document.exitPictureInPicture().catch(() => {});
  }
  if (STATE.playerInstance) {
    try { STATE.playerInstance.dispose(); } catch (_) {}
    STATE.playerInstance = null;
  }
  DOM.playerSection.style.display = 'none';
  STATE.currentChannel = null;
  rebuildVideoEl();
}

/* ============================================================
   PICTURE-IN-PICTURE (AUTO PIP)
   Activates when user switches tab or minimises the window.
   Deactivates when user returns to the tab.
   ============================================================ */
function initPipMode() {
  // Helper: get the live <video> element (may be recreated)
  const getVideo = () => document.getElementById('streamPlayer');

  const tryEnterPip = async () => {
    if (!STATE.currentChannel || document.pictureInPictureElement || !document.pictureInPictureEnabled) return;
    
    const video = getVideo();
    // Video.js might wrap the element, ensure we have the actual video tag
    const target = video.tagName === 'VIDEO' ? video : video.querySelector('video');
    if (!target || target.paused || target.readyState < 2) return;

    try {
      await target.requestPictureInPicture();
    } catch (err) { console.warn('[StreamVault] Auto-PiP failed:', err); }
  };

  const tryExitPip = async () => {
    if (document.pictureInPictureElement && !document.hidden) {
      try { await document.exitPictureInPicture(); } catch (_) {}
    }
  };

  // Tab switching (most reliable cross-browser trigger)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) tryEnterPip();
    else tryExitPip();
  });

  // Window blur = minimise or switch app (fallback)
  window.addEventListener('blur', () => {
    // Small delay to let visibilitychange fire first (avoid double-trigger)
    setTimeout(tryEnterPip, 300);
  });
  window.addEventListener('focus', () => tryExitPip());

  // When user manually exits PIP via the PIP window controls, just sync state
  document.addEventListener('leavepictureinpicture', () => {
    // Nothing special needed — video continues in the page
  });
}

/* ============================================================
   UI STATE HELPERS
   ============================================================ */
function setLoading(show) {
  DOM.loadingContainer.style.display = show ? 'flex' : 'none';
  DOM.errorContainer.style.display   = 'none';
  DOM.channelsGrid.style.display      = show ? 'none' : 'grid';
}

/* ============================================================
   EVENT LISTENERS
   ============================================================ */
function initEventListeners() {
  // Hamburger
  DOM.hamburger.addEventListener('click', () => {
    DOM.sidebar.classList.toggle('open');
    DOM.sidebarOverlay.classList.toggle('active');
  });
  DOM.sidebarOverlay.addEventListener('click', () => {
    DOM.sidebar.classList.remove('open');
    DOM.sidebarOverlay.classList.remove('active');
  });

  // Search — instant, no debounce
  DOM.searchInput.addEventListener('input', e => {
    STATE.currentSearch = e.target.value;
    applyFilters();
  });

  // Keyboard: Cmd/Ctrl+K = focus search, Esc = close player
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); DOM.searchInput.focus(); }
    if (e.key === 'Escape') { DOM.searchInput.blur(); closePlayer(); }
  });

  // Nav filters
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      STATE.currentFilter = item.dataset.filter;
      STATE.currentSearch = '';
      DOM.searchInput.value = '';
      applyFilters();
      DOM.sidebar.classList.remove('open');
      DOM.sidebarOverlay.classList.remove('active');
    });
  });

  // View toggle
  DOM.gridViewBtn.addEventListener('click', () => {
    STATE.isListView = false;
    DOM.gridViewBtn.classList.add('active');
    DOM.listViewBtn.classList.remove('active');
    renderChannels();
  });
  DOM.listViewBtn.addEventListener('click', () => {
    STATE.isListView = true;
    DOM.listViewBtn.classList.add('active');
    DOM.gridViewBtn.classList.remove('active');
    renderChannels();
  });

  // Sort
  DOM.sortSelect.addEventListener('change', e => {
    STATE.currentSort = e.target.value;
    applyFilters();
  });

  // Refresh
  DOM.refreshBtn.addEventListener('click', () => {
    DOM.refreshBtn.classList.add('spinning');
    loadPlaylist().finally(() => setTimeout(() => DOM.refreshBtn.classList.remove('spinning'), 1000));
  });

  // Retry
  DOM.retryBtn.addEventListener('click', () => loadPlaylist());

  // Close player
  DOM.closePlayerBtn.addEventListener('click', closePlayer);

  // Manual PiP Toggle
  if (DOM.pipBtn) {
    DOM.pipBtn.addEventListener('click', () => {
      const video = document.getElementById('streamPlayer');
      if (!video) return;
      if (!document.pictureInPictureElement) video.requestPictureInPicture().catch(e => Toast.warning('PiP Error', e.message));
      else document.exitPictureInPicture();
    });
  }

  // Pagination
  DOM.prevPageBtn.addEventListener('click', () => {
    if (STATE.currentPage > 1) {
      STATE.currentPage--;
      renderChannels();
      scrollTo({ top: 0, behavior: 'smooth' });
      prioritizeVisibleChannels();   // re-prioritize new page's channels
    }
  });
  DOM.nextPageBtn.addEventListener('click', () => {
    const total = Math.ceil(STATE.filteredChannels.length / CONFIG.CHANNELS_PER_PAGE);
    if (STATE.currentPage < total) {
      STATE.currentPage++;
      renderChannels();
      scrollTo({ top: 0, behavior: 'smooth' });
      prioritizeVisibleChannels();   // re-prioritize new page's channels
    }
  });

  // Custom playlist modal
  const modalOverlay = $('modalOverlay');
  $('closeModalBtn').addEventListener('click',  () => modalOverlay.style.display = 'none');
  $('cancelModalBtn').addEventListener('click', () => modalOverlay.style.display = 'none');
  $('loadCustomBtn').addEventListener('click',  () => {
    const url = $('customPlaylistUrl').value.trim();
    if (!url) { Toast.warning('No URL', 'Please enter a valid M3U playlist URL'); return; }
    modalOverlay.style.display = 'none';
    loadPlaylist(url);
  });
  modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) modalOverlay.style.display = 'none'; });

  // Fullscreen
  $('fullscreenBtn').addEventListener('click', () => {
    const c = document.querySelector('.video-container');
    if (!c) return;
    if (!document.fullscreenElement) c.requestFullscreen().catch(err => Toast.warning('Fullscreen', err.message));
    else document.exitFullscreen();
  });
}

/* ============================================================
   INITIALIZATION
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  initPipMode();        // Auto Picture-in-Picture
  loadPlaylist();
  setTimeout(() => Toast.info('StreamVault v2', 'Loading your channels…'), 600);
});
