/**
 * StreamGrabber - Background Service Worker
 * Smart Media Sniffer, Chunk/Range Filter, Anti-404 Intact Downloader, and In-Page Bridge
 */

import { hlsEngine, saveBlobToDB, ensureOffscreenDocument, applyMp4Rotation } from './hlsEngine.js';

// Media storage by tab ID: tabId -> Map(url -> mediaItem)
const tabMediaStore = new Map();
// Poster/thumbnail storage by tab ID: tabId -> posterUrl
const tabPosters = new Map();
// Page/Video title storage by tab ID: tabId -> cleanTitle
const tabTitles = new Map();
// Current tab URL storage by tab ID: tabId -> tabUrl
const tabUrls = new Map();
// Active downloads: id -> downloadState
const activeDownloadsMap = new Map();
// Chrome download item ID -> extension downloadId
const chromeDlMap = new Map();
// downloadId -> { downloadItemId, lastBytes, lastTime, title, filename }
const directDlMeta = new Map();
let directDlPollInterval = null;

// Master extension enabled state
let isExtensionGloballyEnabled = true;

// Excluded websites/domains list (e.g. voyeurok.com to prevent Error 224003)
let excludedSitesList = ['voyeurok.com'];

function isSiteExcluded(urlOrHostname) {
  if (!urlOrHostname || typeof urlOrHostname !== 'string') return false;
  let host = urlOrHostname.toLowerCase();
  try {
    if (host.includes('://')) {
      host = new URL(urlOrHostname).hostname.toLowerCase();
    }
  } catch (_) {}
  return excludedSitesList.some(site => {
    const s = site.toLowerCase().trim();
    return s && (host === s || host.endsWith('.' + s));
  });
}

function syncExcludedCookies() {
  if (!chrome.cookies) return;
  for (const site of excludedSitesList) {
    const domain = site.toLowerCase().trim();
    if (!domain) continue;
    try {
      chrome.cookies.set({
        url: `https://${domain}/`,
        name: '__xg_excluded__',
        value: '1',
        path: '/',
        secure: true,
        sameSite: 'lax'
      }, () => { if (chrome.runtime.lastError) {} });
    } catch (_) {}
  }
}

function removeExcludedCookie(domain) {
  if (!chrome.cookies || !domain) return;
  try {
    chrome.cookies.remove({
      url: `https://${domain}/`,
      name: '__xg_excluded__'
    }, () => { if (chrome.runtime.lastError) {} });
  } catch (_) {}
}

chrome.storage.local.get({ extensionEnabled: true, excludedSites: ['voyeurok.com'] }, (res) => {
  isExtensionGloballyEnabled = res.extensionEnabled !== false;
  excludedSitesList = Array.isArray(res.excludedSites) ? res.excludedSites : ['voyeurok.com'];
  if (!res.excludedSites) {
    chrome.storage.local.set({ excludedSites: excludedSitesList });
  }
  syncExcludedCookies();
  updateAllBadges();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    if (changes.extensionEnabled !== undefined) {
      isExtensionGloballyEnabled = changes.extensionEnabled.newValue !== false;
      updateAllBadges();
    }
    if (changes.excludedSites !== undefined) {
      excludedSitesList = Array.isArray(changes.excludedSites.newValue) ? changes.excludedSites.newValue : [];
      syncExcludedCookies();
      updateAllBadges();
    }
  }
});

function updateAllBadges() {
  chrome.tabs.query({}, (tabs) => {
    if (!tabs) return;
    for (const t of tabs) {
      if (t.id) updateBadge(t.id);
    }
  });
}

function handleDownloadItemComplete(downloadItemId, downloadId, item) {
  chromeDlMap.delete(downloadItemId);
  directDlMeta.delete(downloadId);

  const state = activeDownloadsMap.get(downloadId);
  const baseName = item.filename ? item.filename.split(/[\\/]/).pop() : (state ? state.title : 'Video');

  // Check for anti-hotlinking text body (e.g. 15 bytes "Missing referer")
  if (item.fileSize > 0 && item.fileSize < 1024) {
    console.warn('[StreamGrabber] Erasing corrupted short download (anti-hotlink block):', item.fileSize, 'bytes');
    try {
      chrome.downloads.removeFile(item.id, () => { if (chrome.runtime.lastError) {} });
      chrome.downloads.erase({ id: item.id }, () => { if (chrome.runtime.lastError) {} });
    } catch (e) {}

    if (state) {
      state.status = 'error';
      state.error = 'Download failed (Blocked by server hotlink protection)';
      activeDownloadsMap.set(downloadId, state);
      chrome.runtime.sendMessage({ action: 'DOWNLOAD_STATUS', state }, () => {
        if (chrome.runtime.lastError) {}
      });
      setTimeout(() => activeDownloadsMap.delete(downloadId), 5000);
    }
    return;
  }

  if (state) {
    state.progress = 100;
    state.status = 'complete';
    state.completedAt = Date.now();
    if (item.fileSize) state.downloadedBytes = item.fileSize;
    activeDownloadsMap.set(downloadId, state);
    chrome.runtime.sendMessage({ action: 'DOWNLOAD_STATUS', state }, () => {
      if (chrome.runtime.lastError) {}
    });
    notifyDownloadComplete(state.title || baseName, baseName);
    setTimeout(() => activeDownloadsMap.delete(downloadId), 3000);
  } else {
    notifyDownloadComplete(baseName, baseName);
  }
}

function handleDownloadItemError(downloadItemId, downloadId, errorMsg) {
  chromeDlMap.delete(downloadItemId);
  directDlMeta.delete(downloadId);

  const state = activeDownloadsMap.get(downloadId);
  if (state) {
    state.status = 'error';
    state.error = errorMsg || 'Download interrupted';
    activeDownloadsMap.set(downloadId, state);
    chrome.runtime.sendMessage({ action: 'DOWNLOAD_STATUS', state }, () => {
      if (chrome.runtime.lastError) {}
    });
    setTimeout(() => activeDownloadsMap.delete(downloadId), 5000);
  }
}

function ensureDirectDlPolling() {
  if (directDlPollInterval) return;
  directDlPollInterval = setInterval(() => {
    if (chromeDlMap.size === 0) {
      clearInterval(directDlPollInterval);
      directDlPollInterval = null;
      return;
    }
    for (const [downloadItemId, downloadId] of chromeDlMap.entries()) {
      chrome.downloads.search({ id: downloadItemId }, (items) => {
        if (!items || items.length === 0) return;
        const item = items[0];
        const state = activeDownloadsMap.get(downloadId);
        const meta = directDlMeta.get(downloadId);
        if (!state || !meta) return;

        // 1. Completion check
        if (item.state === 'complete') {
          handleDownloadItemComplete(downloadItemId, downloadId, item);
          return;
        }

        // 2. Interruption check
        if (item.state === 'interrupted') {
          handleDownloadItemError(downloadItemId, downloadId, item.error);
          return;
        }

        if (state.status !== 'downloading') return;

        // 3. Progress tracking
        const currentBytes = item.bytesReceived || 0;
        const totalBytes = item.totalBytes > 0 ? item.totalBytes : (state.totalBytes || 0);
        const now = Date.now();
        const elapsed = (now - meta.lastTime) / 1000;
        let speedBps = state.speedBps || 0;
        if (elapsed >= 0.4) {
          speedBps = Math.max(0, (currentBytes - meta.lastBytes) / elapsed);
          meta.lastBytes = currentBytes;
          meta.lastTime = now;
        }

        let progress = totalBytes > 0 ? Math.round((currentBytes / totalBytes) * 100) : (state.progress || 0);
        if (progress >= 100 && item.state !== 'complete') {
          progress = 99; // Scanning/flushing to disk
        }

        state.progress = progress;
        state.downloadedBytes = currentBytes;
        if (totalBytes > 0) state.totalBytes = totalBytes;
        state.speedBps = speedBps;
        activeDownloadsMap.set(downloadId, state);
        chrome.runtime.sendMessage({ action: 'DOWNLOAD_PROGRESS', state }, () => {
          if (chrome.runtime.lastError) {}
        });
      });
    }
  }, 350);
}

function formatBytes(bytes) {
  if (!bytes || isNaN(bytes)) return 'Full Video';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

function parseMediaInfo(url, contentType, contentLength) {
  const lowerUrl = url.toLowerCase();
  const lowerType = (contentType || '').toLowerCase();

  let type = 'MP4';
  let isStream = false;

  if (lowerType.includes('mpegurl') || lowerUrl.includes('.m3u8')) {
    type = 'HLS';
    isStream = true;
  } else if (lowerType.includes('dash+xml') || lowerUrl.includes('.mpd')) {
    type = 'DASH';
    isStream = true;
  } else if (lowerType.includes('audio') || lowerUrl.match(/\.(mp3|aac|m4a|ogg|wav)$/)) {
    type = 'Audio';
  } else if (lowerType.includes('webm') || lowerUrl.includes('.webm')) {
    type = 'WebM';
  } else if (lowerType.includes('flv') || lowerUrl.includes('.flv')) {
    type = 'FLV';
  } else if (lowerType.includes('video/mp4') || lowerUrl.includes('.mp4')) {
    type = 'MP4';
  }

  let quality = 'Auto HD';
  const resMatch = url.match(/(\d{3,4})p/i) || url.match(/(\d{3,4})x(\d{3,4})/i);
  if (resMatch) {
    const num = parseInt(resMatch[1], 10);
    if (num >= 1080) quality = `${num}p Full HD`;
    else if (num >= 720) quality = `${num}p HD`;
    else quality = `${num}p SD`;
  } else if (lowerUrl.includes('_hq') || lowerUrl.includes('hq.mp4') || lowerUrl.includes('_hd') || lowerUrl.includes('hd.mp4') || lowerUrl.includes('1080')) {
    quality = '1080p Full HD';
  } else if (lowerUrl.includes('720')) {
    quality = '720p HD';
  } else if (lowerUrl.includes('_lq') || lowerUrl.includes('lq.mp4') || lowerUrl.includes('_sd') || lowerUrl.includes('sd.mp4') || lowerUrl.includes('480')) {
    quality = '480p SD';
  } else if (isStream) {
    quality = 'HD Stream';
  }

  return {
    type,
    isStream,
    quality,
    sizeFormatted: contentLength ? formatBytes(parseInt(contentLength, 10)) : 'Full Video'
  };
}

const KNOWN_AD_DOMAINS = [
  'trafficstars.com', 'tsyndicate.com', 'magsrv.com', 'exoclick.com',
  'traffichaus.com', 'trafficfactory.biz', 'ero-advertising.com',
  'adnxs.com', 'doubleclick.net', 'ad-delivery.net', 'adcash.com',
  'adsterra.com', 'monetag.com', 'propellerads.com', 'hilltopads.com',
  'clickadu.com', 'popads.net', 'popcash.net', 'twinred.com',
  'twinrdsrv.com', 'juicyads.com', 'adxxx.com', 'plugrush.com',
  'trafficjunky.com', 'trafficjunky.net', 'adtng.com', 'goodstatorone.com',
  'tarklot.com', 'auhubsm.com', 'bbangads.b-cdn.net', 'buddhabangxxx.com',
  'dtipvw.com', 'rtb-demand', 'adnium.com', 'adx.adform.net'
];

const AD_URL_PATTERNS = [
  '/announce', '/anuncio', 'preroll', 'pre-roll', 'midroll', 'postroll',
  'vast', 'vpaid', 'popunder', 'ad_banner',
  'trailer.mp4', 'teaser.mp4', 'promo_video', 'ad_video',
  '_tr.mp4', '_preview.mp4', '_trailer.mp4', '/preview.mp4',
  'interstitial', '/ads/video/', '/sponsor/',
  'video-preview.s3.yandex', 'video-preview'
];

function isAdOrAnnounceUrl(url) {
  if (!url || typeof url !== 'string') return true;
  const lower = url.toLowerCase();
  if (KNOWN_AD_DOMAINS.some(d => lower.includes(d))) return true;
  if (AD_URL_PATTERNS.some(p => lower.includes(p))) return true;
  return false;
}

/**
 * Filter out HTML web pages, scripts, and fragmented short video chunks
 * Prevents capturing pre-roll ads, announce clips, or fragmented chunks!
 */
function isExcludedNetworkUrl(url, contentType) {
  const lowerUrl = url.toLowerCase();
  const lowerType = (contentType || '').toLowerCase();

  // 0. Chrome Web Store Compliance: Strictly exclude YouTube domains
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be') || lowerUrl.includes('googlevideo.com')) {
    return true;
  }

  // 0B. Filter out Ad Networks & Pre-roll Announcement video URLs
  if (isAdOrAnnounceUrl(lowerUrl)) {
    return true;
  }

  // 1. Exclude HTML web pages & scripts
  if (lowerType.includes('text/html') || lowerType.includes('xhtml+xml')) return true;
  if (lowerUrl.match(/\.(html|htm|php|asp|aspx|jsp|js|css|json)(\?.*)?$/)) return true;

  // 1B. Validate that URL is an actual media file, stream, or media route
  const isMediaMime = lowerType.includes('video/') ||
                      lowerType.includes('audio/') ||
                      lowerType.includes('mpegurl') ||
                      lowerType.includes('dash+xml');

  const hasMediaExtOrEndpoint = lowerUrl.startsWith('blob:') ||
                                lowerUrl.match(/\.(mp4|m3u8|webm|mpd|flv|mp3|m4a|aac|ogg|wav)(\/|\?.*)?$/i) ||
                                lowerUrl.includes('/get_file/') ||
                                lowerUrl.includes('/get_video') ||
                                lowerUrl.includes('/videofile.php') ||
                                lowerUrl.includes('strm.yandex.') ||
                                lowerUrl.includes('ott-stream.yandex.');

  // If neither media MIME nor media URL signature, reject (prevents web page URLs from being treated as media)
  if (!isMediaMime && !hasMediaExtOrEndpoint) {
    return true;
  }

  // 2. Exclude range-based chunks (e.g. range=0-1000000, bytestart=1000)
  if (lowerUrl.match(/[?&](range|bytestart|byteend)=\d+/i)) return true;

  // 3. Exclude segment indices (e.g. sq/1, sq=1, seg-1, chunk_2, frag-3, part4)
  if (lowerUrl.match(/[?&/](seg|segment|chunk|frag|fragment|part)[-_]?\d+/i)) return true;
  if (lowerUrl.match(/\/sq\/\d+/i) || lowerUrl.match(/[?&]sq=\d+/i)) return true;

  // 4. Exclude TS / M4S / init segments
  if (lowerUrl.match(/\.(ts|m4s)(\?.*)?$/i)) return true;
  if (lowerUrl.includes('init.mp4') || lowerUrl.includes('init.m4s')) return true;

  // 5. Exclude tiny audio chunks or ad beacons
  if (lowerUrl.includes('/audio/') && lowerUrl.match(/\d+\.(mp4|m4a|webm)/i)) return true;

  return false;
}

/**
 * Identify if a title is empty, generic, or technical CDN garbage (e.g. tpl..., seg_..., hash, 1080p)
 */
function isGenericOrTechnicalTitle(title) {
  if (!title) return true;
  const clean = title.toLowerCase().trim();
  if (!clean || clean.length <= 2) return true;

  // 1. Common generic names
  const genericList = [
    'master', 'index', 'playlist', 'video', 'manifest', 'stream',
    'video_completo', 'video_stream', 'full_video', 'full video',
    'media', 'videoplayback', 'playback', 'output', 'file', 'source',
    'untitled', 'default', 'null', 'undefined', 'movie', 'clip',
    'watch', 'play', 'download', 'streaming'
  ];
  if (genericList.includes(clean)) return true;

  // 2. Technical CDN template / profile patterns: e.g. "tpl...", "tpl_1080p", "tpl-720p", "tpl_sd", "tpl"
  if (/^tpl[-_]?/i.test(clean) || /^tpl\d+/i.test(clean) || clean === 'tpl' || clean.startsWith('tpl')) return true;

  // 3. Technical stream / chunk / segment prefixes
  if (/^(hls|dash|seg|segment|chunk|frag|fragment|part)[-_]?\d*/i.test(clean)) return true;
  if (/^(video|stream|track|aud|audio)[-_]?\d+/i.test(clean)) return true;

  // 4. Resolution only: e.g. "1080p", "720p", "480p", "1920x1080", "1280x720", "mp4"
  if (/^(\d{3,4}p|\d{3,4}x\d{3,4}|mp4|webm|m3u8|ts|m4s)$/i.test(clean)) return true;

  // 5. Pure hex hashes / tokens: e.g. "a1b2c3d4e5f6..." (12+ hex characters)
  if (/^[0-9a-f]{12,}$/i.test(clean)) return true;

  return false;
}

function addMediaItem(tabId, item) {
  if (!isExtensionGloballyEnabled) return;
  if (!tabId || tabId < 0) return;
  if (!item || !item.url) return;
  const currentTabUrl = tabUrls.get(tabId);
  if (currentTabUrl && isSiteExcluded(currentTabUrl)) return;
  if (item.pageUrl && isSiteExcluded(item.pageUrl)) return;
  if (item.url.includes('function/')) return; // Discard raw un-decoded KVS obfuscation placeholders
  if (isExcludedNetworkUrl(item.url, '')) return;
  if (isAdOrAnnounceUrl(item.url)) return;

  if (!tabMediaStore.has(tabId)) {
    tabMediaStore.set(tabId, new Map());
  }

  const tabStore = tabMediaStore.get(tabId);

  // If item is HLS (.m3u8), it is top priority: clear out any low-priority short clips
  if (item.type === 'HLS') {
    for (const [url, existing] of tabStore.entries()) {
      if (existing.type !== 'HLS' && existing.source !== 'VK Video' && existing.source !== 'Mail.ru Player' && (!existing.size || existing.size < 10 * 1024 * 1024)) {
        tabStore.delete(url);
      }
    }
  }

  // If item already exists, enrich it with newer/better data
  if (tabStore.has(item.url)) {
    const existing = tabStore.get(item.url);
    if (!existing.id) {
      existing.id = item.id || ('media_' + Math.random().toString(36).substr(2, 9));
    }
    if (!existing.poster && (item.poster || tabPosters.has(tabId))) {
      existing.poster = item.poster || tabPosters.get(tabId);
    }
    if (isGenericOrTechnicalTitle(existing.title) && item.title && !isGenericOrTechnicalTitle(item.title)) {
      existing.title = item.title;
    }
    if ((!existing.variants || existing.variants.length === 0) && item.variants && item.variants.length > 0) {
      existing.variants = item.variants;
      existing.quality = item.quality;
    }
    chrome.runtime.sendMessage({ action: 'MEDIA_UPDATED', tabId, item: existing }, () => {
      if (chrome.runtime.lastError) {}
    });
    return;
  }

  if (!item.poster && tabPosters.has(tabId)) {
    item.poster = tabPosters.get(tabId);
  }

  // Ensure title consistency:
  const knownTitle = tabTitles.get(tabId);
  if (knownTitle && !isGenericOrTechnicalTitle(knownTitle)) {
    if (isGenericOrTechnicalTitle(item.title)) {
      item.title = knownTitle;
    }
  } else if (item.title && !isGenericOrTechnicalTitle(item.title)) {
    tabTitles.set(tabId, item.title);
    // Retroactively update earlier items in this tab that had generic titles
    for (const existing of tabStore.values()) {
      if (isGenericOrTechnicalTitle(existing.title)) {
        existing.title = item.title;
      }
    }
  }

  if (!item.id) {
    item.id = 'media_' + Math.random().toString(36).substr(2, 9);
  }

  tabStore.set(item.url, item);
  updateBadge(tabId);
  chrome.runtime.sendMessage({ action: 'MEDIA_UPDATED', tabId, item }, () => {
    if (chrome.runtime.lastError) {}
  });

  // Asynchronously inspect and parse HLS stream variants for master playlists
  if (item.type === 'HLS' && !item._variantsEnriched) {
    enrichHlsVariants(item, tabId);
  }
}

async function enrichHlsVariants(item, tabId) {
  item._variantsEnriched = true;
  try {
    const text = await hlsEngine.fetchPlaylistText(item.url, tabId);
    if (!text) return;
    const parsed = hlsEngine.parseM3U8(text, item.url);
    if (parsed.isMaster && parsed.variants && parsed.variants.length > 0) {
      item.variants = parsed.variants;
      const top = parsed.variants[0];
      if (top && top.resolution) {
        const h = top.resolution.split('x')[1] || top.resolution;
        item.quality = `${h}p (${parsed.variants.length} Qualities)`;
      }
      chrome.runtime.sendMessage({ action: 'MEDIA_UPDATED', tabId, item }, () => {
        if (chrome.runtime.lastError) {}
      });
    }
  } catch (e) {}
}

async function resolveEmbedMedia(embedData, tabId) {
  const embedUrl = embedData?.embedUrl || '';
  if (!embedUrl || !tabId) return;

  const pageTitle = embedData.title || tabTitles.get(tabId) || 'Video';
  const pagePoster = embedData.poster || tabPosters.get(tabId) || null;

  try {
    // 1. Mail.ru Embeds (/video/embed/, /item/, etc.)
    if (embedUrl.includes('mail.ru')) {
      const idMatch = embedUrl.match(/(?:embed|meta|\/video\/|\/video\/embed\/|\/item\/)(\d{15,22})/i) ||
                      embedUrl.match(/item(?:Id)?=(\d{15,22})/i);
      if (idMatch && idMatch[1]) {
        const metaUrl = `https://my.mail.ru/+/video/meta/${idMatch[1]}`;
        const res = await fetch(metaUrl, {
          headers: { 'Referer': embedUrl }
        });
        if (res.ok) {
          const json = await res.json();
          const title = json.meta?.title || pageTitle;
          const poster = json.meta?.poster ? (json.meta.poster.startsWith('//') ? 'https:' + json.meta.poster : json.meta.poster) : pagePoster;
          if (title && !isGenericOrTechnicalTitle(title)) {
            tabTitles.set(tabId, title);
          }
          if (poster) tabPosters.set(tabId, poster);

          const videos = json.videos || [];
          for (const v of videos) {
            if (v.url) {
              const streamUrl = v.url.startsWith('//') ? 'https:' + v.url : v.url;
              const qualityKey = (v.key || '').toLowerCase();
              let quality = 'Auto HD';
              if (qualityKey.includes('1080')) quality = '1080p Full HD';
              else if (qualityKey.includes('720')) quality = '720p HD';
              else if (qualityKey.includes('480')) quality = '480p SD';
              else if (qualityKey.includes('360')) quality = '360p SD';
              else if (qualityKey.includes('240')) quality = '240p SD';

              addMediaItem(tabId, {
                id: 'mailru_' + Math.random().toString(36).substr(2, 9),
                url: streamUrl,
                title: title,
                type: 'MP4',
                quality: quality,
                poster: poster,
                source: 'Mail.ru Player',
                timestamp: Date.now()
              });
            }
          }
          return;
        }
      }
    }

    // 2. Yandex Video Hub (VH) JSON API
    if (embedUrl.includes('frontend.vh.yandex.ru') || embedUrl.includes('ya-video')) {
      const res = await fetch(embedUrl);
      if (res.ok) {
        const json = await res.json();
        const title = json.title || pageTitle;
        const poster = json.thumbnail || pagePoster;
        if (title && !isGenericOrTechnicalTitle(title)) tabTitles.set(tabId, title);
        if (poster) tabPosters.set(tabId, poster);

        const streams = json.streams || [];
        for (const s of streams) {
          if (s.url) {
            const isHls = s.stream_type === 'hls' || s.url.includes('.m3u8');
            addMediaItem(tabId, {
              id: 'yandex_vh_' + Math.random().toString(36).substr(2, 9),
              url: s.url,
              title: title,
              type: isHls ? 'HLS' : 'MP4',
              quality: s.quality || (isHls ? 'HD Stream' : 'Auto HD'),
              isStream: isHls,
              poster: poster,
              source: 'Yandex VH',
              timestamp: Date.now()
            });
          }
        }
        return;
      }
    }

function extractVkVideoId(url) {
  if (!url || typeof url !== 'string') return null;
  const directMatch = url.match(/video(-?\d+_\d+)/i);
  if (directMatch) return directMatch[1];
  const clipMatch = url.match(/clip(-?\d+_\d+)/i);
  if (clipMatch) return clipMatch[1];
  const zMatch = url.match(/[?&]z=video(-?\d+_\d+)/i);
  if (zMatch) return zMatch[1];

  const oidMatch = url.match(/[?&]oid=(-?\d+)/i);
  const idMatch = url.match(/[?&]id=(-?\d+)/i);
  if (oidMatch && idMatch) {
    return `${oidMatch[1]}_${idMatch[1]}`;
  }
  return null;
}

    // 3. VK Video Embeds (/video_ext.php, /video{oid}_{id}, etc.)
    if (embedUrl.includes('vk.com') || embedUrl.includes('vkvideo.ru')) {
      const videoId = extractVkVideoId(embedUrl);
      if (videoId) {
        const domain = embedUrl.includes('vkvideo.ru') ? 'vkvideo.ru' : 'vk.com';
        await resolveVkVideo({ videoId, domain, pageUrl: embedUrl, title: pageTitle, poster: pagePoster }, tabId);
        return;
      }
    }

    // 4. Generic Embedded Players (nmcorp.video, embed-player.space, Rutube, etc.)
    const pageRes = await fetch(embedUrl, {
      headers: { 'Referer': embedData.pageUrl || 'https://gs.yandex.com.tr/' }
    });
    if (pageRes.ok) {
      const html = await pageRes.text();
      const mediaUrls = html.match(/https?:\/\/[^"'`\s<>]+\.(?:mp4|m3u8)(?:\?[^"'`\s<>]*)?/gi) || [];
      const seen = new Set();
      for (const m of mediaUrls) {
        if (seen.has(m) || isAdOrAnnounceUrl(m)) continue;
        seen.add(m);
        const isHls = m.includes('.m3u8');
        const qualityMatch = m.match(/(\d{3,4})p/i);
        let quality = isHls ? 'HD Stream' : 'Auto HD';
        if (qualityMatch) {
          const p = parseInt(qualityMatch[1], 10);
          quality = `${p}p ${p >= 720 ? 'HD' : 'SD'}`;
        }
        addMediaItem(tabId, {
          id: 'embed_' + Math.random().toString(36).substr(2, 9),
          url: m,
          title: pageTitle,
          type: isHls ? 'HLS' : 'MP4',
          quality: quality,
          isStream: isHls,
          poster: pagePoster,
          source: 'Embedded Player',
          timestamp: Date.now()
        });
      }
    }
  } catch (err) {
    console.warn('[StreamGrabber] resolveEmbedMedia error:', err);
  }
}

function getEffectiveReferer(url, originalReferer) {
  let ref = originalReferer || '';
  const lowerUrl = (url || '').toLowerCase();
  const lowerRef = (ref || '').toLowerCase();

  // VoyeurHit / VoyeurOK CDN anti-hotlinking handling
  if (lowerUrl.includes('voyeur') || lowerRef.includes('voyeur') ||
      lowerUrl.includes('nv7s.com') ||
      (lowerUrl.includes('ahcdn.com') && (lowerUrl.includes('/vh/') || lowerRef.includes('voyeur')))) {
    return 'https://voyeurhit.com/';
  }

  // xHamster CDN handling
  if (lowerUrl.includes('xhcdn.com') || lowerRef.includes('xhamster') || (lowerUrl.includes('ahcdn.com') && lowerRef.includes('xhamster'))) {
    return 'https://xhamster.com/';
  }

  // ThisVid handling
  if (lowerUrl.includes('thisvid.com') || lowerRef.includes('thisvid.com')) {
    return 'https://thisvid.com/';
  }

  return ref;
}

function decodeVoyeurHitPath(str) {
  if (!str || typeof str !== 'string') return '';
  try {
    const alphabet = "АВСDЕFGHIJKLМNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,~";
    let out = "", idx = 0;
    str = str.replace(/[^АВСЕМA-Za-z0-9\.\,\~]/g, "");
    do {
      let r = alphabet.indexOf(str.charAt(idx++)), o = alphabet.indexOf(str.charAt(idx++)), a = alphabet.indexOf(str.charAt(idx++)), s = alphabet.indexOf(str.charAt(idx++));
      r = r << 2 | o >> 4;
      o = (15 & o) << 4 | a >> 2;
      let l = (3 & a) << 6 | s;
      out += String.fromCharCode(r);
      if (64 != a) out += String.fromCharCode(o);
      if (64 != s) out += String.fromCharCode(l);
    } while (idx < str.length);
    return unescape(out);
  } catch (_) {
    return '';
  }
}

async function resolveVoyeurHitStream(videoId, tabId, pageTitle, poster, pageUrl) {
  if (!videoId || !tabId) return;
  const targetTitle = pageTitle || tabTitles.get(tabId) || 'Video';
  const targetPoster = poster || tabPosters.get(tabId) || null;
  if (targetTitle && !isGenericOrTechnicalTitle(targetTitle)) {
    tabTitles.set(tabId, targetTitle);
  }
  if (targetPoster) {
    tabPosters.set(tabId, targetPoster);
  }

  try {
    let effectiveVideoId = videoId;
    // Check if on a voyeurok.com page with an aggregator embed
    if (pageUrl && pageUrl.includes('voyeurok.com')) {
      try {
        const pageRes = await fetch(pageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (pageRes.ok) {
          const pageHtml = await pageRes.text();
          const embedM = pageHtml.match(/(?:videovoyeurhit|voyeurhit)\.com\/embed\/(\d+)/i);
          if (embedM && embedM[1]) {
            effectiveVideoId = embedM[1];
          }
        }
      } catch (_) {}
    }

    let res = await fetch(`https://voyeurhit.com/api/videofile.php?video_id=${effectiveVideoId}&lifetime=8640000`, {
      headers: { 'Referer': `https://voyeurhit.com/embed/${effectiveVideoId}/` }
    });
    if (!res.ok) return;
    let files = await res.json();

    if ((!Array.isArray(files) || files.length === 0 || files.error) && pageUrl) {
      try {
        const pageRes = await fetch(pageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (pageRes.ok) {
          const pageHtml = await pageRes.text();
          const embedM = pageHtml.match(/(?:videovoyeurhit|voyeurhit)\.com\/embed\/(\d+)/i);
          if (embedM && embedM[1]) {
            effectiveVideoId = embedM[1];
            res = await fetch(`https://voyeurhit.com/api/videofile.php?video_id=${effectiveVideoId}&lifetime=8640000`, {
              headers: { 'Referer': `https://voyeurhit.com/embed/${effectiveVideoId}/` }
            });
            if (res.ok) files = await res.json();
          }
        }
      } catch (_) {}
    }

    if (Array.isArray(files) && files.length > 0 && files[0].video_url) {
      const decodedPath = decodeVoyeurHitPath(files[0].video_url);
      if (decodedPath && decodedPath.startsWith('/')) {
        const rawStream = 'https://voyeurhit.com' + decodedPath;
        // Make sure DNR rules are active so CDN redirects negotiate 200 OK Content-Length
        await setDownloadRefererRules(rawStream, 'https://voyeurhit.com/');
        const resolved = await resolveFinalDirectUrl(rawStream, 'https://voyeurhit.com/');
        const finalUrl = (typeof resolved === 'object' && resolved.url) ? resolved.url : (typeof resolved === 'string' ? resolved : rawStream);
        const resolvedSize = (typeof resolved === 'object' && resolved.size) ? resolved.size : null;

        addMediaItem(tabId, {
          id: 'voyeur_' + effectiveVideoId,
          url: finalUrl,
          title: targetTitle,
          type: 'MP4',
          quality: detectQualityFromUrl(decodedPath, '1080p Full HD'),
          size: resolvedSize,
          isStream: false,
          poster: targetPoster,
          pageUrl: pageUrl || '',
          source: 'VoyeurHit Stream',
          timestamp: Date.now()
        });
        updateBadge(tabId);
      }
    }
  } catch (err) {
    console.warn('[XtremeGrbr] resolveVoyeurHitStream error:', err);
  }
}

async function resolveVkVideo(vkData, tabId) {
  const videoId = vkData?.videoId;
  if (!videoId || !tabId) return;

  const domain = vkData.domain || 'vkvideo.ru';
  const postUrl = `https://${domain}/al_video.php`;
  const postBody = `act=show&al=1&video=${encodeURIComponent(videoId)}`;

  try {
    const res = await fetch(postUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': vkData.pageUrl || `https://${domain}/video${videoId}`,
        'Origin': `https://${domain}`
      },
      body: postBody
    });

    if (!res.ok) return;

    const arrayBuffer = await res.arrayBuffer();
    const text = new TextDecoder('windows-1251').decode(arrayBuffer);
    const json = JSON.parse(text);

    let player = null;
    if (Array.isArray(json.payload)) {
      for (const part of json.payload) {
        if (Array.isArray(part)) {
          const found = part.find(x => x && x.player?.params?.[0]);
          if (found) {
            player = found.player.params[0];
            break;
          }
        }
      }
    }

    if (!player) return;

    const title = player.md_title || vkData.title || tabTitles.get(tabId) || 'VK Video';
    if (title && !isGenericOrTechnicalTitle(title)) {
      tabTitles.set(tabId, title);
    }

    const poster = player.jpg || vkData.poster || tabPosters.get(tabId) || null;
    if (poster) {
      tabPosters.set(tabId, poster);
    }

    // 1. Register HLS Master Stream First
    if (player.hls) {
      addMediaItem(tabId, {
        id: `vk_${videoId}_hls`,
        url: player.hls,
        title: title,
        type: 'HLS',
        quality: 'Auto HD',
        isStream: true,
        poster: poster,
        source: 'VK Video',
        timestamp: Date.now()
      });
    }

    // 2. Direct MP4 Resolutions
    const qualityMap = {
      url2160: '4K 2160p',
      url1440: '2K 1440p',
      url1080: '1080p Full HD',
      url720: '720p HD',
      url480: '480p SD',
      url360: '360p SD',
      url240: '240p SD',
      url144: '144p SD'
    };

    for (const [key, qLabel] of Object.entries(qualityMap)) {
      if (player[key]) {
        addMediaItem(tabId, {
          id: `vk_${videoId}_${key}`,
          url: player[key],
          title: title,
          type: 'MP4',
          quality: qLabel,
          poster: poster,
          source: 'VK Video',
          timestamp: Date.now()
        });
      }
    }

    updateBadge(tabId);
  } catch (err) {
    console.warn('[StreamGrabber] resolveVkVideo error:', err);
  }
}

function updateBadge(tabId) {
  if (!tabId || tabId < 0) return;
  if (!isExtensionGloballyEnabled) {
    chrome.action.setBadgeText({ tabId, text: 'OFF' });
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#64748b' });
    return;
  }
  const tabUrl = tabUrls.get(tabId);
  if (tabUrl && isSiteExcluded(tabUrl)) {
    chrome.action.setBadgeText({ tabId, text: '' });
    return;
  }
  const tabStore = tabMediaStore.get(tabId);
  const count = tabStore ? tabStore.size : 0;

  if (count > 0) {
    chrome.action.setBadgeText({ tabId, text: count.toString() });
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#00a63d' });
  } else {
    chrome.action.setBadgeText({ tabId, text: '' });
  }
}

/**
 * Crop tab screenshot to ONLY the video element coordinates
 */
async function cropToVideoElement(fullDataUrl, rect) {
  try {
    const resp = await fetch(fullDataUrl);
    const blob = await resp.blob();
    const bitmap = await createImageBitmap(blob);

    const scaleX = bitmap.width / (rect.viewportWidth || 1920);
    const scaleY = bitmap.height / (rect.viewportHeight || 1080);

    const cropX = Math.round(rect.x * scaleX);
    const cropY = Math.round(rect.y * scaleY);
    const cropW = Math.round(rect.width * scaleX);
    const cropH = Math.round(rect.height * scaleY);

    const sx = Math.max(0, Math.min(cropX, bitmap.width - 20));
    const sy = Math.max(0, Math.min(cropY, bitmap.height - 20));
    const sw = Math.min(cropW, bitmap.width - sx);
    const sh = Math.min(cropH, bitmap.height - sy);

    if (sw <= 50 || sh <= 50) return null;

    const canvas = new OffscreenCanvas(sw, sh);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh);

    const croppedBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(croppedBlob);
    });
  } catch (e) {
    return null;
  }
}

// 1. Network Sniffer via webRequest
chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    if (!isExtensionGloballyEnabled) return;
    if (!details.tabId || details.tabId < 0) return;
    if (details.initiator && isSiteExcluded(details.initiator)) return;
    const currentTabUrl = tabUrls.get(details.tabId);
    if (currentTabUrl && isSiteExcluded(currentTabUrl)) return;

    const url = details.url;
    let contentType = '';
    let contentLength = 0;

    if (details.responseHeaders) {
      for (const header of details.responseHeaders) {
        const name = header.name.toLowerCase();
        if (name === 'content-type') contentType = header.value;
        if (name === 'content-length') contentLength = parseInt(header.value, 10);
      }
    }

    if (isExcludedNetworkUrl(url, contentType)) return;

    const isMediaContent = contentType.includes('video/') ||
      contentType.includes('audio/') ||
      contentType.includes('application/x-mpegURL') ||
      contentType.includes('application/vnd.apple.mpegurl') ||
      contentType.includes('application/dash+xml');

    const isMediaUrl = url.match(/\.(m3u8|mp4|webm|mpd|flv|mp3|aac|m4a)(\/|\?.*)?$/i) ||
      url.includes('/get_file/') ||
      url.includes('/get_video');

    if (isMediaContent || isMediaUrl) {
      // Ignore tiny fragments under 100KB unless it's an m3u8 playlist
      if (contentLength > 0 && contentLength < 100 * 1024 && !url.includes('.m3u8')) {
        return;
      }

      const mediaInfo = parseMediaInfo(url, contentType, contentLength);

      let videoTitle = tabTitles.get(details.tabId) || '';

      // If we don't have an authentic page title yet, query the tab immediately
      if (!videoTitle || isGenericOrTechnicalTitle(videoTitle)) {
        if (details.tabId) {
          chrome.tabs.get(details.tabId, (tab) => {
            if (tab && tab.title) {
              const clean = tab.title.replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim();
              if (clean && !isGenericOrTechnicalTitle(clean)) {
                tabTitles.set(details.tabId, clean);
                item.title = clean;
                const tabStore = tabMediaStore.get(details.tabId);
                if (tabStore) {
                  for (const m of tabStore.values()) {
                    if (isGenericOrTechnicalTitle(m.title)) {
                      m.title = clean;
                    }
                  }
                }
                chrome.runtime.sendMessage({ action: 'MEDIA_UPDATED', tabId: details.tabId, item }, () => {
                  if (chrome.runtime.lastError) {}
                });
              }
            }
          });
        }
        videoTitle = 'Video';
      }

      const item = {
        id: 'net_' + Math.random().toString(36).substr(2, 9),
        url: url, // Kept intact with original signature params to avoid HTTP 404!
        title: videoTitle,
        type: mediaInfo.type,
        quality: mediaInfo.quality,
        size: contentLength || null,
        sizeFormatted: mediaInfo.sizeFormatted,
        isStream: mediaInfo.isStream,
        poster: tabPosters.get(details.tabId) || null,
        source: 'Network',
        initiator: details.initiator || '',
        timestamp: Date.now()
      };

      addMediaItem(details.tabId, item);
    }
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders']
);

// Clear expired media tokens when user navigates or reloads the tab (Prevents HTTP 404 from expired tokens)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab && tab.url) {
    tabUrls.set(tabId, tab.url);
    if (isSiteExcluded(tab.url)) {
      tabMediaStore.delete(tabId);
      tabPosters.delete(tabId);
    }
  }
  if (changeInfo.status === 'loading') {
    tabMediaStore.delete(tabId);
    tabPosters.delete(tabId);
    updateBadge(tabId);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabMediaStore.delete(tabId);
  tabPosters.delete(tabId);
  tabTitles.delete(tabId);
  tabUrls.delete(tabId);
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  updateBadge(activeInfo.tabId);
});

// 2. Message Dispatcher
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab ? sender.tab.id : message.tabId;

  if (message.action === 'TAB_INFO_UPDATE') {
    if (tabId && message.title) {
      const cleanTitle = message.title.replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleanTitle && !isGenericOrTechnicalTitle(cleanTitle)) {
        tabTitles.set(tabId, cleanTitle);
        const tabStore = tabMediaStore.get(tabId);
        if (tabStore) {
          for (const item of tabStore.values()) {
            if (isGenericOrTechnicalTitle(item.title)) {
              item.title = cleanTitle;
            }
          }
        }
      }
    }
    if (tabId && message.poster) {
      tabPosters.set(tabId, message.poster);
      const tabStore = tabMediaStore.get(tabId);
      if (tabStore) {
        for (const item of tabStore.values()) {
          if (!item.poster) {
            item.poster = message.poster;
          }
        }
      }
    }
    return true;
  }

  if (message.action === 'MEDIA_DETECTED') {
    if (tabId) {
      if (message.poster) {
        tabPosters.set(tabId, message.poster);
        const tabStore = tabMediaStore.get(tabId);
        if (tabStore) {
          for (const item of tabStore.values()) {
            if (!item.poster) item.poster = message.poster;
          }
        }
      }
      addMediaItem(tabId, message.data);
    }
    return true;
  }

  if (message.action === 'RESOLVE_EMBED_MEDIA') {
    const targetTabId = tabId || message.tabId;
    if (targetTabId && message.embedUrl) {
      resolveEmbedMedia(message, targetTabId);
    }
    return true;
  }

  if (message.action === 'RESOLVE_VK_VIDEO') {
    const targetTabId = tabId || message.tabId;
    if (targetTabId && message.videoId) {
      resolveVkVideo(message, targetTabId);
    }
    return true;
  }

  if (message.action === 'RESOLVE_VOYEUR_STREAM') {
    const targetTabId = tabId || message.tabId;
    if (targetTabId && message.videoId) {
      resolveVoyeurHitStream(message.videoId, targetTabId, message.pageTitle, message.poster, message.pageUrl);
    }
    return true;
  }

  if (message.action === 'PREPARE_PREVIEW_RULES') {
    (async () => {
      try {
        let finalUrl = message.url;
        if (message.url) {
          const effectiveReferer = getEffectiveReferer(message.url, message.pageUrl || '');
          const resolved = await resolveFinalDirectUrl(message.url, effectiveReferer);
          finalUrl = (typeof resolved === 'object' && resolved.url) ? resolved.url : (resolved || message.url);
          await setDownloadRefererRules(finalUrl, effectiveReferer);
        }
        sendResponse({ success: true, finalUrl: finalUrl });
      } catch (e) {
        sendResponse({ success: false, error: e.message, finalUrl: message.url });
      }
    })();
    return true;
  }

  if (message.action === 'GET_EXTENSION_STATUS') {
    sendResponse({ enabled: isExtensionGloballyEnabled });
    return true;
  }

  if (message.action === 'SET_EXTENSION_ENABLED') {
    isExtensionGloballyEnabled = message.enabled !== false;
    chrome.storage.local.set({ extensionEnabled: isExtensionGloballyEnabled }, async () => {
      if (!isExtensionGloballyEnabled) {
        await purgeAllDnrRules();
        tabMediaStore.clear();
        tabPosters.clear();
      }
      updateAllBadges();
      chrome.tabs.query({}, (tabs) => {
        if (!tabs) return;
        for (const t of tabs) {
          if (t.id) {
            chrome.tabs.sendMessage(t.id, {
              action: 'EXTENSION_STATUS_CHANGED',
              enabled: isExtensionGloballyEnabled
            }, () => { if (chrome.runtime.lastError) {} });
          }
        }
      });
      sendResponse({ success: true, enabled: isExtensionGloballyEnabled });
    });
    return true;
  }

  if (message.action === 'TOGGLE_SITE_EXCLUSION') {
    const domain = (message.domain || '').toLowerCase().trim();
    if (!domain) {
      sendResponse({ success: false });
      return true;
    }
    const shouldExclude = message.exclude !== undefined ? message.exclude : !isSiteExcluded(domain);
    chrome.storage.local.get({ excludedSites: ['voyeurok.com'] }, (res) => {
      let sites = Array.isArray(res.excludedSites) ? [...res.excludedSites] : ['voyeurok.com'];
      if (shouldExclude) {
        if (!sites.some(s => s.toLowerCase() === domain)) {
          sites.push(domain);
        }
      } else {
        sites = sites.filter(s => s.toLowerCase() !== domain);
        removeExcludedCookie(domain);
      }
      chrome.storage.local.set({ excludedSites: sites }, () => {
        excludedSitesList = sites;
        syncExcludedCookies();
        if (message.tabId) {
          if (shouldExclude) {
            tabMediaStore.delete(message.tabId);
            tabPosters.delete(message.tabId);
          }
          updateBadge(message.tabId);
          chrome.tabs.sendMessage(message.tabId, {
            action: 'SITE_EXCLUSION_CHANGED',
            domain,
            excluded: shouldExclude
          }, () => { if (chrome.runtime.lastError) {} });
        }
        sendResponse({ success: true, excluded: shouldExclude, excludedSites: sites });
      });
    });
    return true;
  }

  if (message.action === 'GET_SITE_EXCLUSION') {
    const domain = (message.domain || '').toLowerCase().trim();
    sendResponse({
      excluded: isSiteExcluded(domain),
      excludedSites: excludedSitesList
    });
    return true;
  }

  if (message.action === 'GET_TAB_MEDIA') {
    const tabUrl = tabUrls.get(message.tabId);
    if (tabUrl && isSiteExcluded(tabUrl)) {
      sendResponse({
        mediaList: [],
        activeDownloads: [],
        isSiteExcluded: true,
        siteDomain: (function() {
          try { return new URL(tabUrl).hostname; } catch(_) { return ''; }
        })()
      });
      return true;
    }
    const tabStore = tabMediaStore.get(message.tabId);
    let mediaList = tabStore ? Array.from(tabStore.values()) : [];

    // 1. Resolve authentic title: from tabTitles or from any DOM-detected item that has a good title
    let knownTitle = tabTitles.get(message.tabId);
    if (!knownTitle || isGenericOrTechnicalTitle(knownTitle)) {
      const goodItem = mediaList.find(m => m.title && !isGenericOrTechnicalTitle(m.title));
      if (goodItem) {
        knownTitle = goodItem.title;
        tabTitles.set(message.tabId, knownTitle);
      }
    }

    // Filter out any ad/announcement URLs and sort media items with main stream first
    mediaList = mediaList.filter(m => !isAdOrAnnounceUrl(m.url));
    mediaList.sort((a, b) => {
      if (a.type === 'HLS' && b.type !== 'HLS') return -1;
      if (b.type === 'HLS' && a.type !== 'HLS') return 1;
      const aIsHD = (a.quality || '').includes('1080') || (a.quality || '').includes('720') || (a.quality || '').includes('HD');
      const bIsHD = (b.quality || '').includes('1080') || (b.quality || '').includes('720') || (b.quality || '').includes('HD');
      if (aIsHD && !bIsHD) return -1;
      if (bIsHD && !aIsHD) return 1;
      return (b.size || 0) - (a.size || 0);
    });

    // 2. Ensure ALL items in this tab (including top streams) receive the authentic title
    if (knownTitle && !isGenericOrTechnicalTitle(knownTitle)) {
      mediaList.forEach(m => {
        if (isGenericOrTechnicalTitle(m.title)) {
          m.title = knownTitle;
        }
      });
    }

    function getSanitizedActiveDownloads() {
      const now = Date.now();
      const list = [];
      for (const [id, dl] of activeDownloadsMap.entries()) {
        if (dl.status === 'complete' && dl.completedAt && (now - dl.completedAt > 3000)) {
          activeDownloadsMap.delete(id);
          continue;
        }
        list.push(dl);
      }
      return list;
    }

    if (message.tabId) {
      // 1. Check if we already have an authentic video poster
      const existingPoster = tabPosters.get(message.tabId) || mediaList.find(m => m.poster)?.poster;

      if (existingPoster && (existingPoster.startsWith('http') || existingPoster.startsWith('data:image'))) {
        mediaList.forEach(m => {
          if (!m.poster) m.poster = existingPoster;
        });
        sendResponse({ mediaList, activeDownloads: getSanitizedActiveDownloads() });
        return true;
      }

      // 2. Only if no poster exists, crop video rect from screenshot
      chrome.tabs.sendMessage(message.tabId, { action: 'GET_VIDEO_CROP_RECT' }, (rectRes) => {
        if (chrome.runtime.lastError) {
          // Tab does not have content script (or is protected) -> return mediaList cleanly
          sendResponse({ mediaList, activeDownloads: getSanitizedActiveDownloads() });
          return;
        }

        if (rectRes && rectRes.found && rectRes.rect) {
          chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 75 }, async (fullDataUrl) => {
            if (!chrome.runtime.lastError && fullDataUrl) {
              const croppedPoster = await cropToVideoElement(fullDataUrl, rectRes.rect);
              if (croppedPoster) {
                tabPosters.set(message.tabId, croppedPoster);
                mediaList.forEach(m => {
                  if (!m.poster) m.poster = croppedPoster;
                });
              }
            }
            sendResponse({ mediaList, activeDownloads: getSanitizedActiveDownloads() });
          });
        } else {
          sendResponse({ mediaList, activeDownloads: getSanitizedActiveDownloads() });
        }
      });
      return true;
    }

    sendResponse({ mediaList, activeDownloads: getSanitizedActiveDownloads() });
    return true;
  }

function handleStartDownload({ item, referer, downloadTabId, format, downloadId: passedDownloadId }, callback) {
  if (!item || !item.url) {
    if (callback) callback({ success: false, error: 'Invalid media item' });
    return;
  }

  // Strict check: Never download HTML / Web pages as video files
  const lowerUrl = item.url.toLowerCase();
  if (lowerUrl.match(/\.(html|htm|php|asp|aspx|jsp|shtml)(\?.*)?$/) || isAdOrAnnounceUrl(lowerUrl)) {
    if (callback) callback({ success: false, error: 'Target URL is an HTML page or ad, not a valid video stream' });
    return;
  }

  const chosenFormat = (format || 'mp4').toLowerCase();
  const effectiveReferer = getEffectiveReferer(item.url, referer || item.pageUrl || '');

  chrome.storage.sync.get({ askFilename: false, maxThreads: 8 }, async (settings) => {
    const askFilename = Boolean(settings.askFilename);

    const sanitizedTitle = (item.title || 'video_completo')
      .replace(/[/\\?%*:|"<>]/g, '_')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100);

    const downloadId = passedDownloadId || ('dl_' + Date.now());

    // Mark this video as watched / seen in persistent history
    try {
      const pageKey = item.pageUrl ? cleanVideoUrlKey(item.pageUrl) : '';
      const streamKey = item.url ? cleanVideoUrlKey(item.url) : '';
      chrome.storage.local.get({ seenVideosMap: {} }, (res) => {
        const seenMap = res.seenVideosMap || {};
        const meta = { title: item.title || sanitizedTitle, seenAt: Date.now() };
        if (pageKey) seenMap[pageKey] = meta;
        if (streamKey) seenMap[streamKey] = meta;
        chrome.storage.local.set({ seenVideosMap: seenMap });
      });
    } catch (_) {}

    // Immediately unblock caller with success and downloadId
    if (callback) callback({ success: true, downloadId });

    // If a non-HLS variant was selected (e.g. direct MP4 from VK or other multi-quality source), route to direct downloader
    if (item.selectedVariantUrl) {
      const isVariantHls = item.selectedVariantUrl.includes('.m3u8') || item.selectedVariantUrl.includes('mpegurl');
      if (!isVariantHls) {
        item.url = item.selectedVariantUrl;
        item.type = 'MP4';
        delete item.selectedVariantUrl;
      }
    }

    if (item.type === 'HLS' || item.url.includes('.m3u8')) {
      const initialState = {
        id: downloadId,
        title: item.title,
        type: 'HLS',
        format: chosenFormat,
        progress: 1,
        speedBps: 0,
        status: 'downloading',
        downloadedBytes: 0
      };
      activeDownloadsMap.set(downloadId, initialState);
      chrome.runtime.sendMessage({ action: 'DOWNLOAD_PROGRESS', state: initialState }, () => {
        if (chrome.runtime.lastError) {}
      });

      hlsEngine.maxParallel = settings.maxThreads || 8;
      hlsEngine.startDownload({
        id: downloadId,
        url: item.url,
        selectedVariantUrl: item.selectedVariantUrl,
        title: item.title,
        tabId: downloadTabId,
        referer: effectiveReferer,
        format: chosenFormat,
        saveAs: askFilename,
        rotation: item.rotation || 0,
        onProgress: (state) => {
          activeDownloadsMap.set(downloadId, state);
          chrome.runtime.sendMessage({ action: 'DOWNLOAD_PROGRESS', state }, () => {
            if (chrome.runtime.lastError) {}
          });
        },
        onStatusChange: (state) => {
          if (state.status === 'complete') {
            state.completedAt = Date.now();
            notifyDownloadComplete(item.title, `${sanitizedTitle}.${chosenFormat}`);
            setTimeout(() => activeDownloadsMap.delete(downloadId), 3000);
          }
          activeDownloadsMap.set(downloadId, state);
          chrome.runtime.sendMessage({ action: 'DOWNLOAD_STATUS', state }, () => {
            if (chrome.runtime.lastError) {}
          });
        }
      }).catch(err => {
        console.error('HLS Download Error:', err);
      });
    } else {
      // Direct Media File Downloader with intact URL (avoids HTTP 404 from signature invalidation)
      let ext = chosenFormat ? `.${chosenFormat}` : '.mp4';
      if (item.type === 'Audio') ext = '.mp3';
      else if (item.type === 'WebM' && !chosenFormat) ext = '.webm';
      else if (item.type === 'FLV' && !chosenFormat) ext = '.flv';

      let cleanBaseTitle = sanitizedTitle.replace(/\.(html|htm|php|asp|aspx|jsp|shtml)$/i, '').trim();
      if (!cleanBaseTitle) cleanBaseTitle = 'video_completo';

      const filename = `${cleanBaseTitle}${ext}`;
      const pageReferer = effectiveReferer;

      const initialState = {
        id: downloadId,
        title: item.title || sanitizedTitle,
        type: item.type || 'MP4',
        format: chosenFormat,
        progress: 1,
        speedBps: 0,
        status: 'downloading',
        downloadedBytes: 0,
        totalBytes: item.size || 0
      };
      activeDownloadsMap.set(downloadId, initialState);
      chrome.runtime.sendMessage({ action: 'DOWNLOAD_PROGRESS', state: initialState }, () => {
        if (chrome.runtime.lastError) {}
      });

      if (item.rotation && item.rotation !== 0 && ext === '.mp4') {
        startRotatedDirectDownload(item.url, filename, pageReferer, downloadId, askFilename, null, item.title, item.rotation, downloadTabId);
      } else {
        startDirectDownload(item.url, filename, pageReferer, downloadId, askFilename, null, item.title, item.size, downloadTabId);
      }
    }
  });
}

async function startRotatedDirectDownload(url, filename, referer, downloadId, saveAs, callback, title, rotation, tabId) {
  try {
    const updateState = (patch) => {
      const cur = activeDownloadsMap.get(downloadId);
      if (cur) {
        Object.assign(cur, patch);
        activeDownloadsMap.set(downloadId, cur);
        chrome.runtime.sendMessage({ action: 'DOWNLOAD_PROGRESS', state: cur }, () => {
          if (chrome.runtime.lastError) {}
        });
      }
    };

    updateState({ status: 'downloading', progress: 15 });
    let arrayBuffer = await hlsEngine.fetchSegmentBuffer(url, tabId, referer);
    updateState({ progress: 80 });

    if (rotation && rotation !== 0) {
      arrayBuffer = applyMp4Rotation(arrayBuffer, rotation);
    }
    updateState({ progress: 95 });

    const rotatedBlob = new Blob([arrayBuffer], { type: 'video/mp4' });
    const blobKey = 'rot_' + Date.now();
    await saveBlobToDB(blobKey, rotatedBlob);
    await ensureOffscreenDocument();

    const createRes = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: 'CREATE_BLOB_URL', key: blobKey }, (res) => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else if (res && res.success && res.blobUrl) resolve(res);
        else reject(new Error(res?.error || 'Blob URL failed'));
      });
    });

    const blobUrl = createRes.blobUrl;
    chrome.downloads.download({
      url: blobUrl,
      filename: filename,
      saveAs: Boolean(saveAs)
    }, (downloadItemId) => {
      if (chrome.runtime.lastError) {
        handleDownloadItemError(null, downloadId, chrome.runtime.lastError.message);
      } else {
        const state = activeDownloadsMap.get(downloadId);
        if (state) {
          state.status = 'complete';
          state.progress = 100;
          state.completedAt = Date.now();
          activeDownloadsMap.set(downloadId, state);
          chrome.runtime.sendMessage({ action: 'DOWNLOAD_STATUS', state }, () => {
            if (chrome.runtime.lastError) {}
          });
          notifyDownloadComplete(title || filename, filename);
          setTimeout(() => activeDownloadsMap.delete(downloadId), 3000);
        }
      }
    });

    if (callback) callback({ success: true, downloadId });
  } catch (err) {
    handleDownloadItemError(null, downloadId, err.message);
    if (callback) callback({ success: false, error: err.message });
  }
}

  if (message.action === 'START_DOWNLOAD') {
    handleStartDownload({
      downloadId: message.downloadId,
      item: message.item,
      referer: message.referer,
      downloadTabId: message.tabId || sender.tab?.id,
      format: message.format
    }, sendResponse);
    return true;
  }

  if (message.action === 'START_FLOATING_DOWNLOAD') {
    const targetTabId = message.tabId || sender.tab?.id;
    let tabStore = tabMediaStore.get(targetTabId);
    let itemToDownload = null;

    console.log('[XtremeGrbr] START_FLOATING_DOWNLOAD received:', {
      targetTabId,
      videoSrc: message.videoSrc,
      streamUrl: message.streamUrl,
      fallbackItem: message.fallbackItem,
      tabStoreCount: tabStore ? tabStore.size : 0
    });

    if (tabStore && tabStore.size > 0) {
      // 1. Try matching explicit streamUrl passed from content script
      if (message.streamUrl && !message.streamUrl.startsWith('blob:') && !isAdOrAnnounceUrl(message.streamUrl)) {
        for (const item of tabStore.values()) {
          if (item.url === message.streamUrl) {
            itemToDownload = item;
            break;
          }
        }
      }
      // 2. Try matching exact videoSrc if provided and not a blob or ad URL
      if (!itemToDownload && message.videoSrc && !message.videoSrc.startsWith('blob:') && !isAdOrAnnounceUrl(message.videoSrc)) {
        for (const item of tabStore.values()) {
          if (item.url === message.videoSrc) {
            itemToDownload = item;
            break;
          }
        }
      }
      // 3. Prioritize HLS (.m3u8) streams or largest non-ad, non-blob video in the tab store
      if (!itemToDownload) {
        const items = Array.from(tabStore.values()).filter(i => !isAdOrAnnounceUrl(i.url) && !i.url.startsWith('blob:'));
        itemToDownload = items.find(i => i.type === 'HLS') || items.sort((a, b) => (b.size || 0) - (a.size || 0))[0] || items[0];
      }
    }

    // 4. Fallback: Use direct stream candidate passed from content script or videoSrc (if not blob)
    if (!itemToDownload && message.fallbackItem && message.fallbackItem.url && !message.fallbackItem.url.startsWith('blob:') && !isAdOrAnnounceUrl(message.fallbackItem.url)) {
      itemToDownload = message.fallbackItem;
      if (targetTabId) addMediaItem(targetTabId, itemToDownload);
    } else if (!itemToDownload && message.streamUrl && !message.streamUrl.startsWith('blob:') && !isAdOrAnnounceUrl(message.streamUrl)) {
      itemToDownload = {
        id: 'direct_' + Date.now(),
        url: message.streamUrl,
        title: tabTitles.get(targetTabId) || sender.tab?.title || 'Video',
        type: message.streamUrl.includes('.m3u8') ? 'HLS' : 'MP4',
        quality: 'Auto HD',
        poster: tabPosters.get(targetTabId) || null
      };
      if (targetTabId) addMediaItem(targetTabId, itemToDownload);
    } else if (!itemToDownload && message.videoSrc && !message.videoSrc.startsWith('blob:') && !isAdOrAnnounceUrl(message.videoSrc)) {
      itemToDownload = {
        id: 'direct_' + Date.now(),
        url: message.videoSrc,
        title: tabTitles.get(targetTabId) || sender.tab?.title || 'Video',
        type: message.videoSrc.includes('.m3u8') ? 'HLS' : 'MP4',
        quality: 'Auto HD',
        poster: tabPosters.get(targetTabId) || null
      };
      if (targetTabId) addMediaItem(targetTabId, itemToDownload);
    }

    if (itemToDownload) {
      console.log('[XtremeGrbr] Starting download for stream:', itemToDownload.title, itemToDownload.url);
      handleStartDownload({
        item: itemToDownload,
        referer: sender.tab?.url || '',
        downloadTabId: targetTabId,
        format: 'mp4'
      }, (res) => {
        sendResponse({ success: true, title: itemToDownload.title, downloadId: res?.downloadId });
      });
    } else {
      console.warn('[XtremeGrbr] No downloadable stream found in tab store or message payload.');
      sendResponse({ success: false, error: 'No video stream detected yet. Try playing the video.' });
    }
    return true;
  }

  if (message.action === 'CANCEL_DOWNLOAD') {
    if (message.downloadId) {
      hlsEngine.cancelDownload(message.downloadId);
      const meta = directDlMeta.get(message.downloadId);
      if (meta) {
        if (meta.abortController) {
          try { meta.abortController.abort(); } catch (e) {}
        }
        if (meta.targetTabId) {
          chrome.tabs.sendMessage(meta.targetTabId, {
            action: 'CANCEL_IN_PAGE_DOWNLOAD',
            downloadId: message.downloadId
          }, () => { if (chrome.runtime.lastError) {} });
        }
        if (meta.downloadItemId) {
          try {
            chrome.downloads.cancel(meta.downloadItemId, () => {
              if (chrome.runtime.lastError) {}
            });
            chrome.downloads.erase({ id: meta.downloadItemId }, () => {
              if (chrome.runtime.lastError) {}
            });
            chromeDlMap.delete(meta.downloadItemId);
          } catch (e) {}
        }
        directDlMeta.delete(message.downloadId);
      }
      activeDownloadsMap.delete(message.downloadId);
      chrome.runtime.sendMessage({ action: 'DOWNLOAD_CANCELLED', id: message.downloadId }, () => {
        if (chrome.runtime.lastError) {}
      });
      sendResponse({ success: true });
    }
    return true;
  }

  if (message.action === 'CLEAR_TAB_MEDIA') {
    if (message.tabId) {
      tabMediaStore.delete(message.tabId);
      updateBadge(message.tabId);
      sendResponse({ success: true });
    }
    return true;
  }

  if (message.action === 'MARK_VIDEO_SEEN') {
    const key = message.key || (message.url ? cleanVideoUrlKey(message.url) : null);
    if (key) {
      chrome.storage.local.get({ seenVideosMap: {} }, (res) => {
        const seenMap = res.seenVideosMap || {};
        seenMap[key] = {
          title: message.title || 'Video',
          seenAt: Date.now()
        };
        // Cap map size to last 5,000 entries
        const keys = Object.keys(seenMap);
        if (keys.length > 5000) {
          const sorted = keys.sort((a, b) => (seenMap[a].seenAt || 0) - (seenMap[b].seenAt || 0));
          for (let i = 0; i < keys.length - 5000; i++) {
            delete seenMap[sorted[i]];
          }
        }
        chrome.storage.local.set({ seenVideosMap: seenMap }, () => {
          sendResponse({ success: true, key });
        });
      });
    } else {
      sendResponse({ success: false });
    }
    return true;
  }

  if (message.action === 'GET_SEEN_VIDEOS') {
    chrome.storage.local.get({ seenVideosMap: {} }, (res) => {
      sendResponse({ seenVideosMap: res.seenVideosMap || {} });
    });
    return true;
  }

  if (message.action === 'CLEAR_SEEN_VIDEOS') {
    chrome.storage.local.set({ seenVideosMap: {} }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

function cleanVideoUrlKey(url) {
  if (!url || typeof url !== 'string') return '';
  try {
    const u = new URL(url);
    // Remove query params and hash to get the pure resource path key
    return (u.origin + u.pathname).toLowerCase().replace(/\/+$/, '');
  } catch (e) {
    return url.split('?')[0].split('#')[0].toLowerCase().replace(/\/+$/, '');
  }
}

/**
 * Sets up DeclarativeNetRequest dynamic rules to bypass anti-hotlinking protections.
 * Injects required Referer and Origin headers at the network layer.
 */
async function setDownloadRefererRules(mediaUrl, refererUrl) {
  if (!chrome.declarativeNetRequest || !isExtensionGloballyEnabled) return;
  if (isSiteExcluded(refererUrl || '') || isSiteExcluded(mediaUrl || '')) return;
  refererUrl = getEffectiveReferer(mediaUrl, refererUrl);
  try {
    let refererOrigin = '';
    if (refererUrl) {
      try {
        refererOrigin = new URL(refererUrl).origin;
      } catch (e) {}
    }
    const mediaHost = new URL(mediaUrl).hostname;
    const parts = mediaHost.split('.');
    const baseDomain = parts.length >= 2 ? parts.slice(-2).join('.') : mediaHost;

    const rules = [
      {
        id: 9900,
        priority: 25,
        action: {
          type: 'modifyHeaders',
          requestHeaders: [
            ...(refererUrl ? [
              { header: 'Referer', operation: 'set', value: refererUrl },
              { header: 'Origin', operation: 'set', value: refererOrigin }
            ] : [])
          ]
        },
        condition: {
          initiatorDomains: [chrome.runtime.id],
          urlFilter: '*://*/*'
        }
      },
      {
        id: 9901,
        priority: 20,
        action: {
          type: 'modifyHeaders',
          requestHeaders: [
            ...(refererUrl ? [
              { header: 'Referer', operation: 'set', value: refererUrl },
              { header: 'Origin', operation: 'set', value: refererOrigin }
            ] : [])
          ]
        },
        condition: {
          urlFilter: `*://${mediaHost}/*`
        }
      },
      {
        id: 9902,
        priority: 20,
        action: {
          type: 'modifyHeaders',
          requestHeaders: [
            ...(refererUrl ? [
              { header: 'Referer', operation: 'set', value: refererUrl },
              { header: 'Origin', operation: 'set', value: refererOrigin }
            ] : [])
          ]
        },
        condition: {
          urlFilter: `*://*.${baseDomain}/*`
        }
      },
      {
        id: 9903,
        priority: 30,
        action: {
          type: 'modifyHeaders',
          requestHeaders: [
            {
              header: 'Referer',
              operation: 'set',
              value: (mediaUrl && mediaUrl.includes('/vh/') || refererUrl && refererUrl.includes('voyeur'))
                ? 'https://voyeurhit.com/'
                : ((mediaUrl && mediaUrl.includes('thisvid') || refererUrl && refererUrl.includes('thisvid'))
                  ? 'https://thisvid.com/'
                  : (refererUrl || 'https://xhamster.com/'))
            }
          ]
        },
        condition: {
          urlFilter: `*://*.ahcdn.com/*`
        }
      },
      {
        id: 9904,
        priority: 20,
        action: {
          type: 'modifyHeaders',
          requestHeaders: [
            { header: 'Referer', operation: 'set', value: refererUrl || 'https://xhamster.com/' }
          ]
        },
        condition: {
          urlFilter: `*://*.xhcdn.com/*`
        }
      },
      {
        id: 9905,
        priority: 30,
        action: {
          type: 'modifyHeaders',
          requestHeaders: [
            { header: 'Referer', operation: 'set', value: 'https://voyeurhit.com/' }
          ]
        },
        condition: {
          urlFilter: `*://*.nv7s.com/*`
        }
      },
      {
        id: 9906,
        priority: 30,
        action: {
          type: 'modifyHeaders',
          requestHeaders: [
            { header: 'Referer', operation: 'set', value: 'https://thisvid.com/' },
            { header: 'Origin', operation: 'set', value: 'https://thisvid.com' }
          ]
        },
        condition: {
          urlFilter: `*://*.thisvid.com/*`
        }
      },
      {
        id: 9907,
        priority: 30,
        action: {
          type: 'modifyHeaders',
          responseHeaders: [
            { header: 'Access-Control-Allow-Origin', operation: 'set', value: '*' },
            { header: 'Access-Control-Allow-Methods', operation: 'set', value: 'GET, HEAD, OPTIONS' },
            { header: 'Access-Control-Allow-Headers', operation: 'set', value: '*' }
          ]
        },
        condition: {
          urlFilter: '*://*/*',
          resourceTypes: ['media', 'xmlhttprequest', 'sub_frame', 'other']
        }
      }
    ];

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [9900, 9901, 9902, 9903, 9904, 9905, 9906, 9907],
      addRules: rules
    });
  } catch (e) {
    console.warn('[XtremeGrbr] DNR error:', e);
  }
}

async function purgeAllDnrRules() {
  if (!chrome.declarativeNetRequest) return;
  try {
    const existingDynamic = await chrome.declarativeNetRequest.getDynamicRules();
    const dynamicIds = existingDynamic.map(r => r.id);
    const hardcodedIds = [9900, 9901, 9902, 9903, 9904, 9905, 9906, 9907, 9910, 9911, 9912, 9913, 9914, 9915];
    const allIds = Array.from(new Set([...dynamicIds, ...hardcodedIds]));
    if (allIds.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: allIds
      });
    }
    if (chrome.declarativeNetRequest.getSessionRules) {
      const existingSession = await chrome.declarativeNetRequest.getSessionRules();
      const sessionIds = existingSession.map(r => r.id);
      if (sessionIds.length > 0) {
        await chrome.declarativeNetRequest.updateSessionRules({
          removeRuleIds: sessionIds
        });
      }
    }
  } catch (e) {
    console.warn('[XtremeGrbr] purgeAllDnrRules notice:', e);
  }
}
// Clean up any stale standing rules immediately on service worker startup
purgeAllDnrRules();

/**
 * Resolves HTTP redirects (302, 301, 307) upfront before calling chrome.downloads.download.
 * This prevents Chrome from stripping Referer headers on cross-origin redirects
 * (e.g. xHamster xhcdn.com -> ahcdn.com or VoyeurHit voyeurhit.com -> ahcdn.com).
 */
async function resolveFinalDirectUrl(rawUrl, referer) {
  const effectiveRef = getEffectiveReferer(rawUrl, referer);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    try {
      // 1-byte range request with redirect: 'follow'.
      // Browser automatically follows 301/302 redirects to the final media server.
      // res.url is guaranteed to be the final direct CDN URL!
      const res = await fetch(rawUrl, {
        method: 'GET',
        headers: {
          ...(effectiveRef ? { 'Referer': effectiveRef } : {}),
          'Range': 'bytes=0-0'
        },
        signal: controller.signal
      });
      clearTimeout(timer);
      if (res && res.url && res.url.startsWith('http')) {
        let size = null;
        const cr = res.headers.get('content-range');
        if (cr && cr.includes('/')) {
          const parsed = parseInt(cr.split('/')[1], 10);
          if (parsed > 0) size = parsed;
        } else {
          const cl = res.headers.get('content-length');
          if (cl && parseInt(cl, 10) > 1000) size = parseInt(cl, 10);
        }
        return { url: res.url, size };
      }
    } finally {
      clearTimeout(timer);
    }
  } catch (e) {
    console.warn('[XtremeGrbr] Redirect resolution notice:', e.message);
  }
  return { url: rawUrl, size: null };
}

async function startDirectDownload(rawUrl, filename, referer, downloadId, saveAs, sendResponse, itemTitle, expectedSize, downloadTabId) {
  try {
    const effectiveReferer = getEffectiveReferer(rawUrl, referer);

    // 1. Resolve redirect so Chrome connects directly to the final media server with the Referer header
    const resolved = await resolveFinalDirectUrl(rawUrl, effectiveReferer);
    const finalUrl = (typeof resolved === 'object' && resolved.url) ? resolved.url : (resolved || rawUrl);
    if (!expectedSize && typeof resolved === 'object' && resolved.size) {
      expectedSize = resolved.size;
    }

    // 2. Set declarativeNetRequest rules for the final host and original host
    if (effectiveReferer) {
      await setDownloadRefererRules(finalUrl, effectiveReferer);
    }

    const downloadOptions = {
      url: finalUrl,
      filename: filename,
      saveAs: Boolean(saveAs)
    };

    if (effectiveReferer) {
      try {
        downloadOptions.headers = [{ name: 'Referer', value: effectiveReferer }];
      } catch (e) {}
    }

    chrome.downloads.download(downloadOptions, (downloadItemId) => {
      if (!chrome.runtime.lastError && downloadItemId) {
        chromeDlMap.set(downloadItemId, downloadId);
        directDlMeta.set(downloadId, {
          downloadItemId,
          lastBytes: 0,
          lastTime: Date.now(),
          title: itemTitle || filename,
          filename: filename
        });
        ensureDirectDlPolling();
        if (sendResponse) sendResponse({ success: true, downloadId, downloadItemId });
      } else {
        const err = chrome.runtime.lastError?.message || 'Direct download failed';
        console.warn('[XtremeGrbr] chrome.downloads.download failed, trying fallback fetch:', err);
        fetchFallbackDownload(finalUrl, filename, effectiveReferer, downloadId, saveAs, sendResponse, itemTitle, downloadTabId);
      }
    });
  } catch (err) {
    console.error('[XtremeGrbr] Error starting download:', err);
    fetchFallbackDownload(rawUrl, filename, effectiveReferer, downloadId, saveAs, sendResponse, itemTitle, downloadTabId);
  }
}

async function fetchFallbackDownload(url, filename, referer, downloadId, saveAs, sendResponse, itemTitle, tabId) {
  try {
    let blob = null;
    const effectiveReferer = getEffectiveReferer(url, referer);
    try {
      const headers = effectiveReferer ? { 'Referer': effectiveReferer } : {};
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const contentLengthHeader = res.headers.get('content-length');
      const totalBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;
      const reader = res.body.getReader();
      const chunks = [];
      let receivedBytes = 0;
      let lastTime = Date.now();
      let lastBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        receivedBytes += value.byteLength;

        const now = Date.now();
        const elapsed = (now - lastTime) / 1000;
        if (elapsed >= 0.4) {
          const speedBps = Math.max(0, (receivedBytes - lastBytes) / elapsed);
          lastBytes = receivedBytes;
          lastTime = now;
          const progress = totalBytes > 0 ? Math.min(99, Math.round((receivedBytes / totalBytes) * 100)) : 50;

          const curState = activeDownloadsMap.get(downloadId);
          if (curState) {
            curState.progress = progress;
            curState.downloadedBytes = receivedBytes;
            if (totalBytes > 0) curState.totalBytes = totalBytes;
            curState.speedBps = speedBps;
            activeDownloadsMap.set(downloadId, curState);
            chrome.runtime.sendMessage({ action: 'DOWNLOAD_PROGRESS', state: curState }, () => {
              if (chrome.runtime.lastError) {}
            });
          }
        }
      }

      blob = new Blob(chunks, { type: 'video/mp4' });
    } catch (bgErr) {
      // If background fetch returns HTTP 503 or CORS error, delegate to in-page content script
      if (tabId) {
        const curState = activeDownloadsMap.get(downloadId);
        if (curState) {
          curState.status = 'downloading';
          curState.progress = 30;
          activeDownloadsMap.set(downloadId, curState);
          chrome.runtime.sendMessage({ action: 'DOWNLOAD_PROGRESS', state: curState }, () => {
            if (chrome.runtime.lastError) {}
          });
        }

        const inPageRes = await new Promise((resolve) => {
          chrome.tabs.sendMessage(tabId, { action: 'PAGE_FETCH_BUFFER', url }, (r) => {
            if (chrome.runtime.lastError || !r || !r.success || !r.base64) {
              resolve(null);
            } else {
              resolve(r);
            }
          });
        });
        if (inPageRes && inPageRes.base64) {
          const binary = atob(inPageRes.base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          blob = new Blob([bytes], { type: 'video/mp4' });
          if (curState) {
            curState.progress = 90;
            activeDownloadsMap.set(downloadId, curState);
            chrome.runtime.sendMessage({ action: 'DOWNLOAD_PROGRESS', state: curState }, () => {
              if (chrome.runtime.lastError) {}
            });
          }
        } else {
          throw bgErr;
        }
      } else {
        throw bgErr;
      }
    }
    const blobKey = 'fallback_' + Date.now();
    await saveBlobToDB(blobKey, blob);
    await ensureOffscreenDocument();

    const createRes = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'CREATE_BLOB_URL',
        key: blobKey
      }, (r) => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else if (r && r.success && r.blobUrl) resolve(r);
        else reject(new Error(r?.error || 'Failed to create Blob URL in offscreen doc'));
      });
    });

    const blobUrl = createRes.blobUrl;
    chrome.downloads.download({
      url: blobUrl,
      filename: filename,
      saveAs: Boolean(saveAs)
    }, (downloadItemId) => {
      if (chrome.runtime.lastError) {
        handleDownloadItemError(null, downloadId, chrome.runtime.lastError.message);
        if (sendResponse) sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        const state = activeDownloadsMap.get(downloadId);
        if (state) {
          state.progress = 100;
          state.status = 'complete';
          state.completedAt = Date.now();
          state.downloadedBytes = blob.size;
          state.downloadItemId = downloadItemId;
          activeDownloadsMap.set(downloadId, state);
          chrome.runtime.sendMessage({ action: 'DOWNLOAD_STATUS', state }, () => {
            if (chrome.runtime.lastError) {}
          });
          notifyDownloadComplete(state.title || itemTitle, filename);
          setTimeout(() => activeDownloadsMap.delete(downloadId), 3000);
        }
        setTimeout(() => {
          chrome.runtime.sendMessage({ action: 'REVOKE_BLOB_URL', blobUrl }, () => {
            if (chrome.runtime.lastError) {}
          });
        }, 120000);
        if (sendResponse) sendResponse({ success: true, downloadItemId });
      }
    });
  } catch (err) {
    handleDownloadItemError(null, downloadId, err.message);
    if (sendResponse) sendResponse({ success: false, error: err.message });
  }
}

/**
 * System Desktop Notification upon download completion
 */
function notifyDownloadComplete(title, filename) {
  try {
    const cleanTitle = (title || 'Video').substring(0, 50);
    const cleanFile = (filename || 'file').substring(0, 40);
    chrome.notifications.create('dl_' + Date.now(), {
      type: 'basic',
      iconUrl: 'icon128.png',
      title: 'StreamGrabber 2 - Download Complete ⚡',
      message: `"${cleanTitle}" was successfully saved as ${cleanFile}. Click to open folder.`,
      priority: 2
    });
  } catch (e) {}
}

// Click on desktop notification opens downloads folder in Windows Explorer
chrome.notifications.onClicked.addListener(() => {
  try {
    chrome.downloads.showDefaultFolder();
  } catch (e) {}
});

// Track direct downloads to update progress, trigger notification when complete, and purge anti-hotlink blocks
chrome.downloads.onChanged.addListener((delta) => {
  const downloadId = chromeDlMap.get(delta.id);
  if (!downloadId) return;

  // 1. Live Progress & Speed Tracking from Chrome Downloads API
  if (delta.bytesReceived && activeDownloadsMap.has(downloadId)) {
    const state = activeDownloadsMap.get(downloadId);
    const meta = directDlMeta.get(downloadId);
    if (state && meta && state.status === 'downloading') {
      const currentBytes = delta.bytesReceived.current || 0;
      const totalBytes = (delta.totalBytes && delta.totalBytes.current > 0)
        ? delta.totalBytes.current
        : (state.totalBytes || 0);

      const now = Date.now();
      const elapsed = (now - meta.lastTime) / 1000;
      let speedBps = state.speedBps || 0;
      if (elapsed >= 0.4) {
        speedBps = Math.max(0, (currentBytes - meta.lastBytes) / elapsed);
        meta.lastBytes = currentBytes;
        meta.lastTime = now;
      }

      let progress = totalBytes > 0 ? Math.round((currentBytes / totalBytes) * 100) : (state.progress || 0);
      if (progress >= 100) progress = 99; // Cap at 99 only while Chrome is writing/scanning

      state.progress = progress;
      state.downloadedBytes = currentBytes;
      if (totalBytes > 0) state.totalBytes = totalBytes;
      state.speedBps = speedBps;
      activeDownloadsMap.set(downloadId, state);
      chrome.runtime.sendMessage({ action: 'DOWNLOAD_PROGRESS', state }, () => {
        if (chrome.runtime.lastError) {}
      });
    }
  }

  // 2. Download Completion Handling
  if (delta.state && delta.state.current === 'complete') {
    chrome.downloads.search({ id: delta.id }, (items) => {
      if (items && items.length > 0) {
        handleDownloadItemComplete(delta.id, downloadId, items[0]);
      }
    });
  }

  // 3. Download Interrupted / Error Handling
  if (delta.state && delta.state.current === 'interrupted') {
    handleDownloadItemError(delta.id, downloadId, delta.error?.current || 'Download interrupted');
  }
});
