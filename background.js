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
// Active downloads: id -> downloadState
const activeDownloadsMap = new Map();
// Chrome download item ID -> extension downloadId
const chromeDlMap = new Map();
// downloadId -> { downloadItemId, lastBytes, lastTime, title, filename }
const directDlMeta = new Map();
let directDlPollInterval = null;

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
  }, 500);
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
    quality = resMatch[0];
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

/**
 * Filter out HTML web pages, scripts, and fragmented short video chunks
 * Prevents seeing 20 short video chunks for the same video!
 */
function isExcludedNetworkUrl(url, contentType) {
  const lowerUrl = url.toLowerCase();
  const lowerType = (contentType || '').toLowerCase();

  // 1. Exclude HTML web pages & scripts
  if (lowerType.includes('text/html') || lowerType.includes('xhtml+xml')) return true;
  if (lowerUrl.match(/\.(html|htm|php|asp|aspx|jsp|js|css|json)(\?.*)?$/)) return true;

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
  if (!tabId || tabId < 0) return;
  if (isExcludedNetworkUrl(item.url, '')) return;

  if (!tabMediaStore.has(tabId)) {
    tabMediaStore.set(tabId, new Map());
  }

  const tabStore = tabMediaStore.get(tabId);

  // If tab already has an HLS stream (.m3u8), don't clutter with low-priority sub-items
  const hasHls = Array.from(tabStore.values()).some(m => m.type === 'HLS');
  if (hasHls && item.type !== 'HLS') {
    return;
  }

  // Deduplicate by base path on same domain
  try {
    const parsed = new URL(item.url);
    const basePath = parsed.origin + parsed.pathname;
    for (const [existingUrl] of tabStore.entries()) {
      try {
        const existingParsed = new URL(existingUrl);
        if (existingParsed.origin + existingParsed.pathname === basePath) {
          return;
        }
      } catch (e) {}
    }
  } catch (e) {}

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
    // Retroactively update earlier items in this tab that had tpl... or generic titles
    for (const existing of tabStore.values()) {
      if (isGenericOrTechnicalTitle(existing.title)) {
        existing.title = item.title;
      }
    }
  }

  if (tabStore.has(item.url)) return;

  tabStore.set(item.url, item);
  updateBadge(tabId);

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

function updateBadge(tabId) {
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
    if (!details.tabId || details.tabId < 0) return;

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

    const isMediaUrl = url.match(/\.(m3u8|mp4|webm|mpd|flv|mp3|aac|m4a)(\?.*)?$/i);

    if (isMediaContent || isMediaUrl) {
      // Ignore tiny fragments under 250KB unless it's an m3u8 playlist
      if (contentLength > 0 && contentLength < 250 * 1024 && !url.includes('.m3u8')) {
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
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
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

  if (message.action === 'GET_TAB_MEDIA') {
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

function handleStartDownload({ item, referer, downloadTabId, format }, callback) {
  const chosenFormat = (format || 'mp4').toLowerCase();

  chrome.storage.sync.get({ askFilename: false }, async (settings) => {
    const askFilename = Boolean(settings.askFilename);

    const sanitizedTitle = (item.title || 'video_completo')
      .replace(/[/\\?%*:|"<>]/g, '_')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100);

    const downloadId = 'dl_' + Date.now();

    if (item.type === 'HLS' || item.url.includes('.m3u8')) {
      const initialState = {
        id: downloadId,
        title: item.title,
        type: 'HLS',
        format: chosenFormat,
        progress: 0,
        speedBps: 0,
        status: 'downloading',
        downloadedBytes: 0
      };
      activeDownloadsMap.set(downloadId, initialState);
      chrome.runtime.sendMessage({ action: 'DOWNLOAD_PROGRESS', state: initialState }, () => {
        if (chrome.runtime.lastError) {}
      });

      hlsEngine.startDownload({
        id: downloadId,
        url: item.url,
        selectedVariantUrl: item.selectedVariantUrl,
        title: item.title,
        tabId: downloadTabId,
        referer: referer || item.pageUrl || '',
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

      if (callback) callback({ success: true, downloadId });
    } else {
      // Direct Media File Downloader with intact URL (avoids HTTP 404 from signature invalidation)
      let ext = chosenFormat ? `.${chosenFormat}` : '.mp4';
      if (item.type === 'Audio') ext = '.mp3';
      else if (item.type === 'WebM' && !chosenFormat) ext = '.webm';
      else if (item.type === 'FLV' && !chosenFormat) ext = '.flv';

      const filename = `${sanitizedTitle}${ext}`;
      const pageReferer = referer || item.pageUrl || '';

      const initialState = {
        id: downloadId,
        title: item.title || sanitizedTitle,
        type: item.type || 'MP4',
        format: chosenFormat,
        progress: 0,
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
        startRotatedDirectDownload(item.url, filename, pageReferer, downloadId, askFilename, callback, item.title, item.rotation, downloadTabId);
      } else {
        startDirectDownload(item.url, filename, pageReferer, downloadId, askFilename, callback, item.title, item.size);
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
      item: message.item,
      referer: message.referer,
      downloadTabId: message.tabId || sender.tab?.id,
      format: message.format
    }, sendResponse);
    return true;
  }

  if (message.action === 'START_FLOATING_DOWNLOAD') {
    const targetTabId = message.tabId || sender.tab?.id;
    const tabStore = tabMediaStore.get(targetTabId);
    let itemToDownload = null;

    if (tabStore && tabStore.size > 0) {
      if (message.videoSrc) {
        for (const item of tabStore.values()) {
          if (item.url === message.videoSrc) {
            itemToDownload = item;
            break;
          }
        }
      }
      if (!itemToDownload) {
        const items = Array.from(tabStore.values());
        itemToDownload = items.find(i => i.type === 'HLS') || items[0];
      }
    }

    if (!itemToDownload && message.videoSrc && !message.videoSrc.startsWith('blob:')) {
      itemToDownload = {
        id: 'direct_' + Date.now(),
        url: message.videoSrc,
        title: tabTitles.get(targetTabId) || sender.tab?.title || 'Video',
        type: message.videoSrc.includes('.m3u8') ? 'HLS' : 'MP4',
        quality: 'Auto HD',
        poster: tabPosters.get(targetTabId) || null
      };
    }

    if (itemToDownload) {
      handleStartDownload({
        item: itemToDownload,
        referer: sender.tab?.url || '',
        downloadTabId: targetTabId,
        format: 'mp4'
      }, (res) => {
        sendResponse({ success: true, title: itemToDownload.title, downloadId: res?.downloadId });
      });
    } else {
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
});

/**
 * Sets up DeclarativeNetRequest dynamic rules to bypass anti-hotlinking protections.
 * Injects required Referer and Origin headers at the network layer.
 */
async function setDownloadRefererRules(mediaUrl, refererUrl) {
  if (!refererUrl || !chrome.declarativeNetRequest) return;
  try {
    const refererParsed = new URL(refererUrl);
    const refererOrigin = refererParsed.origin;
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
            { header: 'Referer', operation: 'set', value: refererUrl },
            { header: 'Origin', operation: 'set', value: refererOrigin }
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
            { header: 'Referer', operation: 'set', value: refererUrl },
            { header: 'Origin', operation: 'set', value: refererOrigin }
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
            { header: 'Referer', operation: 'set', value: refererUrl },
            { header: 'Origin', operation: 'set', value: refererOrigin }
          ]
        },
        condition: {
          urlFilter: `*://*.${baseDomain}/*`
        }
      },
      {
        id: 9903,
        priority: 20,
        action: {
          type: 'modifyHeaders',
          requestHeaders: [
            { header: 'Referer', operation: 'set', value: refererUrl },
            { header: 'Origin', operation: 'set', value: refererOrigin }
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
            { header: 'Referer', operation: 'set', value: refererUrl },
            { header: 'Origin', operation: 'set', value: refererOrigin }
          ]
        },
        condition: {
          urlFilter: `*://*.xhcdn.com/*`
        }
      }
    ];

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [9900, 9901, 9902, 9903, 9904],
      addRules: rules
    });
  } catch (e) {
    console.warn('[StreamGrabber] DNR error:', e);
  }
}

/**
 * Resolves HTTP redirects (302, 301, 307) upfront before calling chrome.downloads.download.
 * This prevents Chrome from stripping Referer headers on cross-origin redirects
 * (e.g. xHamster xhcdn.com -> ahcdn.com), fixing the 15-byte "Missing referer" corruption!
 */
async function resolveFinalDirectUrl(rawUrl, referer) {
  let targetUrl = rawUrl;
  try {
    for (let hop = 0; hop < 5; hop++) {
      const res = await fetch(targetUrl, {
        method: 'GET',
        headers: referer ? { 'Referer': referer } : {},
        redirect: 'manual'
      });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location');
        if (loc) {
          targetUrl = new URL(loc, targetUrl).href;
          continue;
        }
      }
      break;
    }
  } catch (e) {
    console.warn('[StreamGrabber] Redirect resolution notice:', e.message);
  }
  return targetUrl;
}

async function startDirectDownload(rawUrl, filename, referer, downloadId, saveAs, sendResponse, itemTitle, expectedSize) {
  try {
    // 1. Resolve redirect so Chrome connects directly to the final media server with the Referer header
    const finalUrl = await resolveFinalDirectUrl(rawUrl, referer);

    // 2. Set declarativeNetRequest rules for the final host and original host
    if (referer) {
      await setDownloadRefererRules(finalUrl, referer);
    }

    const downloadOptions = {
      url: finalUrl,
      filename: filename,
      saveAs: Boolean(saveAs)
    };

    if (referer) {
      try {
        downloadOptions.headers = [{ name: 'Referer', value: referer }];
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
        console.warn('[StreamGrabber] chrome.downloads.download failed, trying fallback fetch:', err);
        fetchFallbackDownload(finalUrl, filename, referer, downloadId, saveAs, sendResponse, itemTitle);
      }
    });
  } catch (err) {
    console.error('[StreamGrabber] Error starting download:', err);
    fetchFallbackDownload(rawUrl, filename, referer, downloadId, saveAs, sendResponse, itemTitle);
  }
}

async function fetchFallbackDownload(url, filename, referer, downloadId, saveAs, sendResponse, itemTitle) {
  try {
    const headers = referer ? { 'Referer': referer } : {};
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const blob = await res.blob();
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
      title: 'StreamGrabber - Download Complete ⚡',
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
