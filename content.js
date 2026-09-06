/**
 * StreamGrabber - DOM & Media Sniffer Content Script
 * Extracts video crop rectangles & provides in-page fetch bridge to bypass HTTP 412 / CORS / auth issues.
 */

(function () {
  // Chrome Web Store Compliance: Completely bypass YouTube
  if (location.hostname.includes('youtube.com') || location.hostname.includes('youtu.be')) {
    return;
  }

  // Filter out ad iframes from polluting detected media
  if (window.self !== window.top) {
    const loc = (window.location.href || '').toLowerCase();
    const docTitle = (document.title || '').toLowerCase();
    if (isAdOrAnnounceUrl(loc) || loc.includes('about:blank') || loc.includes('banner') || loc.includes('sponsor') || loc.includes('ads') || docTitle.includes('ad')) {
      return; // Do not run sniffer inside ad iframes
    }
  }

  if (window.__STREAMGRABBER_INITIALIZED__) return;
  window.__STREAMGRABBER_INITIALIZED__ = true;

  const detectedUrls = new Set();
  let cachedPoster = null;

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
    'vast', 'vpaid', 'popunder', 'ad_banner', 'preview.mp4',
    'trailer.mp4', 'teaser.mp4', 'promo_video', 'ad_video',
    'interstitial', '/ads/video/', '/sponsor/'
  ];

  function isAdOrAnnounceUrl(url) {
    if (!url || typeof url !== 'string') return true;
    const lower = url.toLowerCase();
    if (KNOWN_AD_DOMAINS.some(d => lower.includes(d))) return true;
    if (AD_URL_PATTERNS.some(p => lower.includes(p))) return true;
    return false;
  }

  function detectQualityFromUrl(url, defaultQuality = 'Auto HD') {
    if (!url) return defaultQuality;
    const match = url.match(/(\d{3,4})p/i) || url.match(/(\d{3,4})x(\d{3,4})/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= 1080) return `${num}p Full HD`;
      if (num >= 720) return `${num}p HD`;
      return `${num}p SD`;
    }
    return defaultQuality;
  }

  function getPageTitle() {
    try {
      const fullHtml = document.documentElement ? document.documentElement.innerHTML : '';
      const scriptTitleMatch = fullHtml.match(/setVideoTitle\s*\(\s*['"]([^'"]+)['"]\s*\)/i) ||
                               fullHtml.match(/video_title\s*=\s*['"]([^'"]+)['"]/i);
      if (scriptTitleMatch && scriptTitleMatch[1]) {
        let clean = scriptTitleMatch[1].replace(/\\/g, '').replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim();
        if (clean && clean.length > 2) return clean;
      }
    } catch (e) {}

    const ogTitle = document.querySelector('meta[property="og:title"]')?.content;
    const twitterTitle = document.querySelector('meta[name="twitter:title"]')?.content;
    const h1 = document.querySelector('h1.page-title, h1')?.innerText;
    let raw = ogTitle || twitterTitle || h1 || document.title || 'Video';
    let clean = raw.replace(/\s*-\s*(XVIDEOS\.COM|Pornhub\.com|RedTube|YouPorn|XVideos|XNXX)/gi, '')
                   .replace(/[\\/:*?"<>|]/g, ' ')
                   .replace(/\s+/g, ' ')
                   .trim();
    return clean || 'Video';
  }

  /**
   * Find video bounding rectangle for cropping tab screenshots to ONLY the video
   */
  function getVideoBoundingRect() {
    const video = document.querySelector('video');
    if (video) {
      const rect = video.getBoundingClientRect();
      // Ensure it's a visible video element on screen
      if (rect.width > 120 && rect.height > 80 && rect.top >= 0 && rect.bottom <= window.innerHeight + 100) {
        return {
          x: Math.max(0, Math.round(rect.left)),
          y: Math.max(0, Math.round(rect.top)),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight
        };
      }
    }

    return null;
  }

  function findVideoPoster() {
    if (cachedPoster) return cachedPoster;

    // 1. Direct poster attribute on video element
    const video = document.querySelector('video');
    if (video && video.poster && video.poster.startsWith('http')) {
      cachedPoster = video.poster;
      return cachedPoster;
    }

    // 2. OpenGraph / Twitter / Link image_src video cover image
    const ogImage = document.querySelector('meta[property="og:image"]')?.content ||
                    document.querySelector('meta[property="og:image:secure_url"]')?.content ||
                    document.querySelector('meta[name="twitter:image"]')?.content ||
                    document.querySelector('link[rel="image_src"]')?.href;
    if (ogImage && ogImage.startsWith('http')) {
      cachedPoster = ogImage;
      return cachedPoster;
    }

    // 3. Scan <noscript> tags (e.g. xhamster and other players render fallback video/img inside noscript)
    try {
      const noscripts = document.querySelectorAll('noscript');
      for (const ns of noscripts) {
        const text = ns.textContent || ns.innerHTML || '';
        const match = text.match(/poster=["']([^"']+)["']/i) ||
                      text.match(/src=["']([^"']+\.(?:jpg|jpeg|webp|png)[^"']*)["']/i);
        if (match && match[1] && match[1].startsWith('http')) {
          cachedPoster = match[1];
          return cachedPoster;
        }
      }
    } catch (e) {}

    // 4. Scan player container preview images
    try {
      const previewImg = document.querySelector(
        '.player-container img, [class*="player"] img, [class*="thumb-preview"] img, [class*="thumb-image"] img, img[data-role="thumb-preview-img"], img[alt*="preview" i], img[alt*="vista previa" i]'
      );
      if (previewImg) {
        const src = previewImg.currentSrc || previewImg.src || previewImg.getAttribute('data-src');
        if (src && src.startsWith('http') && !src.includes('avatar') && !src.includes('logo')) {
          cachedPoster = src;
          return cachedPoster;
        }
      }
    } catch (e) {}

    // 5. Scan inline player scripts for thumbUrl or poster JSON
    try {
      const scripts = document.querySelectorAll('script:not([src])');
      for (const s of scripts) {
        const txt = s.textContent || '';
        if (txt.includes('thumbUrl') || txt.includes('xplayerSettings') || txt.includes('initials')) {
          const match = txt.match(/["']thumbUrl["']\s*:\s*["']([^"']+)["']/i) ||
                        txt.match(/["']poster["']\s*:\s*["']([^"']+)["']/i);
          if (match && match[1] && match[1].startsWith('http')) {
            cachedPoster = match[1].replace(/\\/g, '');
            return cachedPoster;
          }
        }
      }
    } catch (e) {}

    // 6. YouTube thumbnail
    const ytMatch = window.location.href.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
    if (ytMatch && ytMatch[1]) {
      cachedPoster = `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
      return cachedPoster;
    }

    // 7. Direct canvas frame extraction from video as final fallback
    if (video) {
      try {
        if (video.readyState >= 2 && video.videoWidth > 50) {
          const c = document.createElement('canvas');
          c.width = Math.min(video.videoWidth, 480);
          c.height = Math.min(video.videoHeight, 270);
          const ctx = c.getContext('2d');
          ctx.drawImage(video, 0, 0, c.width, c.height);
          const data = c.toDataURL('image/jpeg', 0.8);
          if (data && data.startsWith('data:image')) {
            cachedPoster = data;
            return cachedPoster;
          }
        }
      } catch (e) {}
    }

    return null;
  }

  function isExcludedUrl(url) {
    if (!url) return true;
    const lower = url.toLowerCase();

    if (lower.match(/\.(html|htm|php|asp|aspx|jsp|shtml|cgi)(\?.*)?$/)) return true;
    if (lower.startsWith('data:') || lower.startsWith('javascript:')) return true;

    // Filter out isolated fragment chunks (.ts / .m4s / .aac)
    if (lower.match(/\.(ts|m4s)(\?.*)?$/) || lower.includes('/segment') || lower.includes('/seg-') || lower.includes('/fragment-')) {
      return true;
    }

    // Filter out ad / announce / teaser video URLs
    if (isAdOrAnnounceUrl(lower)) {
      return true;
    }

    return false;
  }

  function reportMedia(mediaItem) {
    if (!mediaItem.url || isExcludedUrl(mediaItem.url) || isAdOrAnnounceUrl(mediaItem.url) || detectedUrls.has(mediaItem.url)) return;

    detectedUrls.add(mediaItem.url);

    const fullItem = {
      id: 'dom_' + Math.random().toString(36).substr(2, 9),
      url: mediaItem.url,
      title: mediaItem.title || getPageTitle(),
      type: mediaItem.type || detectTypeFromUrl(mediaItem.url),
      quality: mediaItem.quality || 'Auto HD',
      size: mediaItem.size || null,
      poster: mediaItem.poster || findVideoPoster(),
      source: 'DOM',
      pageUrl: window.location.href,
      pageTitle: document.title,
      timestamp: Date.now()
    };

    try {
      chrome.runtime.sendMessage({
        action: 'MEDIA_DETECTED',
        data: fullItem,
        poster: fullItem.poster
      }, () => {
        if (chrome.runtime.lastError) {
          // Handled: suppresses unchecked runtime.lastError
        }
      });
    } catch (e) {}
  }

  function detectTypeFromUrl(url) {
    const lower = url.toLowerCase();
    if (lower.includes('.m3u8') || lower.includes('mpegurl')) return 'HLS';
    if (lower.includes('.mpd') || lower.includes('dash+xml')) return 'DASH';
    if (lower.includes('.mp3') || lower.includes('.aac') || lower.includes('.ogg') || lower.includes('.wav') || lower.includes('.m4a')) return 'Audio';
    if (lower.includes('.webm')) return 'WebM';
    if (lower.includes('.flv')) return 'FLV';
    return 'MP4';
  }

  function scanMediaElements() {
    const poster = findVideoPoster();

    const videoElements = document.querySelectorAll('video');
    videoElements.forEach(video => {
      // Check if video element is inside an ad wrapper or banner
      const closestAd = video.closest(
        '[class*="ad-"], [class*="ads-"], [id*="ad-"], [id*="ads-"], [class*="preroll"], [class*="sponsor"], [class*="banner"], [id*="vast"], [class*="exo_"]'
      );
      if (closestAd) return; // Skip ad videos!

      const quality = video.videoWidth ? `${video.videoWidth}x${video.videoHeight}` : 'Auto HD';
      const videoPoster = (video.poster && video.poster.startsWith('http')) ? video.poster : poster;

      const src = video.src || '';
      const currentSrc = video.currentSrc || '';

      if (src && !src.startsWith('blob:') && !isExcludedUrl(src) && !isAdOrAnnounceUrl(src)) {
        reportMedia({
          url: src,
          quality: quality,
          type: detectTypeFromUrl(src),
          poster: videoPoster
        });
      }
      if (currentSrc && !currentSrc.startsWith('blob:') && !isExcludedUrl(currentSrc) && !isAdOrAnnounceUrl(currentSrc)) {
        reportMedia({
          url: currentSrc,
          quality: quality,
          type: detectTypeFromUrl(currentSrc),
          poster: videoPoster
        });
      }

      const sources = video.querySelectorAll('source');
      sources.forEach(srcEl => {
        const sUrl = srcEl.src || '';
        if (sUrl && !sUrl.startsWith('blob:') && !isExcludedUrl(sUrl) && !isAdOrAnnounceUrl(sUrl)) {
          reportMedia({
            url: sUrl,
            quality: srcEl.getAttribute('res') || quality,
            type: detectTypeFromUrl(sUrl),
            poster: videoPoster
          });
        }
      });
    });
  }

  function scanInlinePlayerScripts() {
    try {
      const fullHtml = document.documentElement ? document.documentElement.innerHTML : '';
      if (!fullHtml || fullHtml.length < 20) return;

      const poster = findVideoPoster();

      // 1. XVideos / XNXX HTML5Player declarations
      const hlsMatch = fullHtml.match(/setVideoHLS\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/i);
      if (hlsMatch && hlsMatch[1] && !isExcludedUrl(hlsMatch[1])) {
        reportMedia({
          url: hlsMatch[1].replace(/\\/g, ''),
          quality: 'HD Stream',
          type: 'HLS',
          poster: poster
        });
      }

      const highMatch = fullHtml.match(/setVideoUrlHigh\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/i);
      if (highMatch && highMatch[1] && !isExcludedUrl(highMatch[1])) {
        const u = highMatch[1].replace(/\\/g, '');
        reportMedia({
          url: u,
          quality: detectQualityFromUrl(u, '1080p Full HD'),
          type: 'MP4',
          poster: poster
        });
      }

      const lowMatch = fullHtml.match(/setVideoUrlLow\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/i);
      if (lowMatch && lowMatch[1] && !isExcludedUrl(lowMatch[1])) {
        const u = lowMatch[1].replace(/\\/g, '');
        reportMedia({
          url: u,
          quality: detectQualityFromUrl(u, '480p SD'),
          type: 'MP4',
          poster: poster
        });
      }

      // 2. Generic Tube / KVS / Player Variables (flashvars, video_url, video_url_high, hls_url, video_alt_url...)
      const m3u8Match = fullHtml.match(/["']?(?:hls_url|video_hls|m3u8_url)["']?\s*[:=]\s*["']([^"']+\.m3u8[^"']*)["']/i) ||
                        fullHtml.match(/["'](https?:\/\/[^"'<>\s]+\.m3u8[^"'<>\s]*)["']/i);
      if (m3u8Match && m3u8Match[1] && !isExcludedUrl(m3u8Match[1])) {
        reportMedia({
          url: m3u8Match[1].replace(/\\/g, ''),
          quality: 'HD Stream',
          type: 'HLS',
          poster: poster
        });
      }

      // High Resolution MP4 (1080p, 720p, HQ)
      const highMp4Match = fullHtml.match(/["']?(?:video_url_high|video_url_hq|video_url_1080p|video_url_720p|video_alt_url|video_alt_url2)["']?\s*[:=]\s*["']([^"']+\.mp4[^"']*)["']/i);
      if (highMp4Match && highMp4Match[1] && !isExcludedUrl(highMp4Match[1])) {
        const u = highMp4Match[1].replace(/\\/g, '');
        reportMedia({
          url: u,
          quality: detectQualityFromUrl(u, '1080p Full HD'),
          type: 'MP4',
          poster: poster
        });
      }

      // Standard MP4
      const stdMp4Match = fullHtml.match(/["']?(?:video_url|video_alt_url3|video_alt_url4|video_url_text)["']?\s*[:=]\s*["']([^"']+\.mp4[^"']*)["']/i) ||
                          fullHtml.match(/sources\s*:\s*\[\s*\{[^}]*file\s*:\s*["']([^"']+\.mp4[^"']*)["']/i);
      if (stdMp4Match && stdMp4Match[1] && !isExcludedUrl(stdMp4Match[1])) {
        const u = stdMp4Match[1].replace(/\\/g, '');
        reportMedia({
          url: u,
          quality: detectQualityFromUrl(u, 'Auto HD'),
          type: 'MP4',
          poster: poster
        });
      }

      // Base64 Encoded video URLs (common anti-leech obfuscation on tube sites)
      const b64Match = fullHtml.match(/["'](aHR0c[A-Za-z0-9+/=]{16,})["']/g);
      if (b64Match) {
        for (const item of b64Match) {
          try {
            const cleanB64 = item.replace(/["']/g, '');
            const decoded = atob(cleanB64);
            if (decoded && decoded.startsWith('http') && (decoded.includes('.mp4') || decoded.includes('.m3u8')) && !isExcludedUrl(decoded)) {
              reportMedia({
                url: decoded,
                quality: detectQualityFromUrl(decoded, 'Auto HD'),
                type: detectTypeFromUrl(decoded),
                poster: poster
              });
            }
          } catch (e) {}
        }
      }

      // 3. Schema.org JSON-LD contentUrl
      const ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const s of ldScripts) {
        const txt = s.textContent || '';
        if (txt.includes('contentUrl')) {
          try {
            const data = JSON.parse(txt);
            const contentUrl = data.contentUrl || data.video?.contentUrl;
            if (contentUrl && typeof contentUrl === 'string' && !isExcludedUrl(contentUrl)) {
              reportMedia({
                url: contentUrl,
                quality: detectQualityFromUrl(contentUrl, 'Auto HD'),
                type: detectTypeFromUrl(contentUrl),
                poster: data.thumbnailUrl ? (Array.isArray(data.thumbnailUrl) ? data.thumbnailUrl[0] : data.thumbnailUrl) : poster
              });
            }
          } catch (e) {}
        }
      }
    } catch (e) {}
  }

  function scanMetaTags() {
    try {
      const ogVideo = document.querySelector('meta[property="og:video"]')?.content ||
                      document.querySelector('meta[property="og:video:url"]')?.content ||
                      document.querySelector('meta[property="og:video:secure_url"]')?.content;
      if (ogVideo && ogVideo.startsWith('http') && !isExcludedUrl(ogVideo)) {
        reportMedia({
          url: ogVideo,
          quality: detectQualityFromUrl(ogVideo, 'Auto HD'),
          type: detectTypeFromUrl(ogVideo),
          poster: findVideoPoster()
        });
      }
    } catch (e) {}
  }

  function scanPerformanceResources() {
    try {
      const resources = window.performance.getEntriesByType('resource');
      resources.forEach(r => {
        const name = r.name;
        if (name && (name.includes('.m3u8') || name.includes('.mpd'))) {
          if (!isExcludedUrl(name)) {
            reportMedia({
              url: name,
              quality: 'HD Stream',
              type: detectTypeFromUrl(name),
              poster: findVideoPoster()
            });
          }
        }
      });
    } catch (e) {}
  }

  function scanNoscriptMedia() {
    try {
      const noscripts = document.querySelectorAll('noscript');
      for (const ns of noscripts) {
        const text = ns.textContent || ns.innerHTML || '';
        const videoSrcMatch = text.match(/<video[^>]+src=["']([^"']+)["']/i) ||
                              text.match(/<source[^>]+src=["']([^"']+)["']/i) ||
                              text.match(/src=["'](https?:\/\/[^"']+\.(?:mp4|webm|m3u8)[^"']*)["']/i);
        if (videoSrcMatch && videoSrcMatch[1] && !isExcludedUrl(videoSrcMatch[1])) {
          const posterMatch = text.match(/poster=["']([^"']+)["']/i);
          reportMedia({
            url: videoSrcMatch[1],
            quality: detectQualityFromUrl(videoSrcMatch[1], 'Auto HD'),
            type: detectTypeFromUrl(videoSrcMatch[1]),
            poster: (posterMatch && posterMatch[1]) ? posterMatch[1] : findVideoPoster()
          });
        }
      }
    } catch (e) {}
  }

  function runScan() {
    scanInlinePlayerScripts();
    scanMetaTags();
    scanMediaElements();
    scanNoscriptMedia();
    scanPerformanceResources();

    // Only the top frame reports page title & poster to avoid ad iframe overrides
    if (window.self === window.top) {
      try {
        chrome.runtime.sendMessage({
          action: 'TAB_INFO_UPDATE',
          title: getPageTitle(),
          poster: findVideoPoster()
        }, () => {
          if (chrome.runtime.lastError) {
            // Handled: suppresses unchecked runtime.lastError
          }
        });
      } catch (e) {}
    }
  }

  runScan();
  setTimeout(runScan, 1000);
  setTimeout(runScan, 2500);
  setTimeout(runScan, 5000);

  // 3B. SPA Single-Page Navigation & Dynamic Player Observer
  let lastLocationHref = location.href;
  function handleUrlChange() {
    if (location.href !== lastLocationHref) {
      lastLocationHref = location.href;
      detectedUrls.clear();
      cachedPoster = null;

      try {
        chrome.runtime.sendMessage({
          action: 'PAGE_NAVIGATED',
          url: location.href,
          title: getPageTitle()
        }, () => {
          if (chrome.runtime.lastError) {}
        });
      } catch (e) {}

      runScan();
      setTimeout(runScan, 600);
      setTimeout(runScan, 1800);
      setTimeout(runScan, 3500);
    }
  }

  try {
    const origPush = history.pushState;
    if (origPush) {
      history.pushState = function () {
        origPush.apply(this, arguments);
        handleUrlChange();
      };
    }
    const origReplace = history.replaceState;
    if (origReplace) {
      history.replaceState = function () {
        origReplace.apply(this, arguments);
        handleUrlChange();
      };
    }
  } catch (e) {}

  window.addEventListener('popstate', handleUrlChange);
  window.addEventListener('hashchange', handleUrlChange);
  setInterval(handleUrlChange, 1200);

  let mutationDebounceTimer = null;
  const domObserver = new MutationObserver((mutations) => {
    let shouldScan = false;
    for (const m of mutations) {
      if (m.addedNodes && m.addedNodes.length > 0) {
        for (const node of m.addedNodes) {
          if (node.nodeType === 1) {
            const tag = node.tagName;
            if (tag === 'VIDEO' || tag === 'SOURCE' || tag === 'SCRIPT' || tag === 'IFRAME') {
              shouldScan = true;
              break;
            }
          }
        }
      }
      if (shouldScan) break;
    }
    if (shouldScan) {
      clearTimeout(mutationDebounceTimer);
      mutationDebounceTimer = setTimeout(runScan, 400);
    }
  });

  if (document.body) {
    domObserver.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      if (document.body) domObserver.observe(document.body, { childList: true, subtree: true });
    });
  }

  // 4. In-page Message Listener: Handles Crop Rect, Scan Requests & In-Page Fetch to prevent HTTP 412
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Request Instant Media Scan from Popup / Rescan button
    if (request.action === 'SCAN_MEDIA_NOW') {
      runScan();
      sendResponse({ success: true, count: detectedUrls.size });
      return true;
    }

    // Request Video Bounding Box for crop
    if (request.action === 'GET_VIDEO_CROP_RECT') {
      const rect = getVideoBoundingRect();
      sendResponse({ found: Boolean(rect), rect });
      return true;
    }


    // In-Page Manifest Fetch (Runs with page's cookies, origin & headers -> Bypasses HTTP 412)
    if (request.action === 'PAGE_FETCH_TEXT') {
      fetch(request.url, {
        credentials: 'include',
        headers: {
          'Accept': '*/*',
          ...(request.headers || {})
        }
      })
      .then(resp => {
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return resp.text();
      })
      .then(text => sendResponse({ success: true, text }))
      .catch(err => sendResponse({ success: false, error: err.message }));
      return true;
    }

    // In-Page ArrayBuffer Segment Fetch
    if (request.action === 'PAGE_FETCH_BUFFER') {
      fetch(request.url, {
        credentials: 'include',
        headers: {
          'Accept': '*/*',
          ...(request.headers || {})
        }
      })
      .then(resp => {
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return resp.arrayBuffer();
      })
      .then(buffer => {
        // Convert buffer to binary string / base64 for message passing
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        sendResponse({ success: true, base64, size: buffer.byteLength });
      })
      .catch(err => sendResponse({ success: false, error: err.message }));
      return true;
    }
  });

  // 5. In-Page Floating Video Download Button (Featuring StreamGrabber App Icon)
  let floatingBtn = null;
  let activeVideo = null;
  let isFloatingBtnEnabled = true;
  let isMouseOverBtn = false;

  const appIconUrl = chrome.runtime.getURL('icon48.png');

  chrome.storage.sync.get({ showFloatingBtn: true }, (res) => {
    isFloatingBtnEnabled = Boolean(res?.showFloatingBtn ?? true);
    if (isFloatingBtnEnabled) {
      initFloatingButton();
    }
  });

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.showFloatingBtn) {
      isFloatingBtnEnabled = Boolean(changes.showFloatingBtn.newValue);
      if (!isFloatingBtnEnabled && floatingBtn) {
        floatingBtn.style.display = 'none';
      } else if (isFloatingBtnEnabled) {
        initFloatingButton();
      }
    }
  });

  function createFloatingButton() {
    if (floatingBtn) return floatingBtn;

    const btn = document.createElement('div');
    btn.id = 'streamgrabber-floating-btn';
    btn.className = 'streamgrabber-floating-btn';
    btn.setAttribute('data-streamgrabber', 'true');
    btn.title = 'StreamGrabber - Click to download this video';
    btn.innerHTML = `
      <img src="${appIconUrl}" class="streamgrabber-app-icon" alt="StreamGrabber" style="width: 24px; height: 24px; border-radius: 6px; display: block; flex-shrink: 0; pointer-events: none; box-shadow: 0 1px 4px rgba(0,0,0,0.3);" />
      <span class="streamgrabber-btn-text" style="font-weight: 700; font-size: 12px; color: #ffffff; pointer-events: none; white-space: nowrap; line-height: 1;">Download</span>
    `;

    Object.assign(btn.style, {
      position: 'fixed',
      zIndex: '2147483647',
      display: 'none',
      alignItems: 'center',
      gap: '7px',
      background: 'rgba(15, 23, 42, 0.94)',
      color: '#ffffff',
      border: '1.5px solid #0087cd',
      borderRadius: '24px',
      padding: '5px 12px 5px 6px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '12px',
      fontWeight: '700',
      cursor: 'pointer',
      boxShadow: '0 4px 18px rgba(0, 135, 205, 0.45)',
      backdropFilter: 'blur(8px)',
      userSelect: 'none',
      pointerEvents: 'auto',
      transition: 'opacity 0.2s ease, transform 0.2s ease, background 0.2s ease, border-color 0.2s ease',
      opacity: '0.9'
    });

    btn.addEventListener('mouseenter', () => {
      isMouseOverBtn = true;
      btn.style.opacity = '1';
      btn.style.transform = 'scale(1.06)';
      btn.style.background = '#0087cd';
      btn.style.borderColor = '#38bdf8';
    });

    btn.addEventListener('mouseleave', () => {
      isMouseOverBtn = false;
      btn.style.opacity = '0.9';
      btn.style.transform = 'scale(1)';
      btn.style.background = 'rgba(15, 23, 42, 0.94)';
      btn.style.borderColor = '#0087cd';
    });

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      handleFloatingDownload();
    }, true);

    const targetRoot = document.fullscreenElement || document.body || document.documentElement;
    targetRoot.appendChild(btn);
    floatingBtn = btn;
    return btn;
  }

  function positionFloatingButton(video) {
    if (!video || !isFloatingBtnEnabled) return;
    const btn = floatingBtn || createFloatingButton();
    const rect = video.getBoundingClientRect();

    if (rect.width < 140 || rect.height < 90) {
      if (!isMouseOverBtn) btn.style.display = 'none';
      return;
    }

    if (rect.bottom < 40 || rect.top > window.innerHeight - 40 || rect.right < 40 || rect.left > window.innerWidth - 40) {
      if (!isMouseOverBtn) btn.style.display = 'none';
      return;
    }

    const btnWidth = btn.offsetWidth || 116;
    const btnHeight = btn.offsetHeight || 36;

    const left = Math.max(10, Math.min(window.innerWidth - btnWidth - 10, rect.right - btnWidth - 12));
    const top = Math.max(10, Math.min(window.innerHeight - btnHeight - 10, rect.top + 12));

    btn.style.left = `${Math.round(left)}px`;
    btn.style.top = `${Math.round(top)}px`;
    btn.style.display = 'flex';

    if (document.fullscreenElement && btn.parentElement !== document.fullscreenElement) {
      document.fullscreenElement.appendChild(btn);
    } else if (!document.fullscreenElement && btn.parentElement !== (document.body || document.documentElement)) {
      (document.body || document.documentElement).appendChild(btn);
    }
  }

  function findVideoUnderCursor(e) {
    if (!e || !e.clientX) return null;
    try {
      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      if (elements) {
        for (const el of elements) {
          if (el === floatingBtn || floatingBtn?.contains(el)) continue;
          if (el.tagName === 'VIDEO') return el;
          if (el.querySelector) {
            const v = el.querySelector('video');
            if (v) return v;
          }
        }
      }
    } catch (err) {}
    return null;
  }

  function findMostVisibleVideo() {
    const videos = Array.from(document.querySelectorAll('video'));
    if (videos.length === 0) return null;

    const playing = videos.find(v => !v.paused && v.readyState >= 1);
    if (playing) {
      const r = playing.getBoundingClientRect();
      if (r.width >= 140 && r.height >= 90 && r.bottom > 40 && r.top < window.innerHeight - 40) {
        return playing;
      }
    }

    let best = null;
    let maxArea = 0;
    for (const v of videos) {
      const r = v.getBoundingClientRect();
      if (r.width >= 140 && r.height >= 90 && r.bottom > 40 && r.top < window.innerHeight - 40) {
        const area = r.width * r.height;
        if (area > maxArea) {
          maxArea = area;
          best = v;
        }
      }
    }
    return best;
  }

  function updateTracker() {
    if (!isFloatingBtnEnabled) {
      if (floatingBtn) floatingBtn.style.display = 'none';
      return;
    }

    if (isMouseOverBtn) return;

    const targetVideo = activeVideo || findMostVisibleVideo();
    if (targetVideo) {
      positionFloatingButton(targetVideo);
    } else if (floatingBtn) {
      floatingBtn.style.display = 'none';
    }
  }

  function handleFloatingDownload() {
    if (!floatingBtn) return;
    const textEl = floatingBtn.querySelector('.streamgrabber-btn-text');
    const originalText = 'Download';
    const video = activeVideo || findMostVisibleVideo();

    if (textEl) textEl.textContent = '⏳ Starting...';
    floatingBtn.style.background = '#0284c7';

    const videoSrc = video ? (video.currentSrc || video.src || '') : '';

    chrome.runtime.sendMessage({
      action: 'START_FLOATING_DOWNLOAD',
      videoSrc: videoSrc
    }, (response) => {
      if (chrome.runtime.lastError || !response || !response.success) {
        if (textEl) textEl.textContent = '⚠️ Play video 1st';
        floatingBtn.style.background = '#e11d48';
      } else {
        if (textEl) textEl.textContent = '✅ Downloading!';
        floatingBtn.style.background = '#16a34a';
      }

      setTimeout(() => {
        if (textEl) textEl.textContent = originalText;
        floatingBtn.style.background = 'rgba(15, 23, 42, 0.94)';
      }, 2500);
    });
  }

  function initFloatingButton() {
    createFloatingButton();

    document.addEventListener('mousemove', (e) => {
      if (!isFloatingBtnEnabled) return;
      if (isMouseOverBtn) return;

      const video = findVideoUnderCursor(e);
      if (video) {
        activeVideo = video;
        positionFloatingButton(video);
      }
    }, { passive: true });

    window.addEventListener('scroll', updateTracker, { passive: true });
    window.addEventListener('resize', updateTracker, { passive: true });

    document.addEventListener('play', (e) => {
      if (e.target && e.target.tagName === 'VIDEO') {
        activeVideo = e.target;
        positionFloatingButton(e.target);
      }
    }, true);

    setInterval(updateTracker, 1500);
    setTimeout(updateTracker, 500);
    setTimeout(updateTracker, 1500);
  }

  const observer = new MutationObserver(() => scanMediaElements());
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
