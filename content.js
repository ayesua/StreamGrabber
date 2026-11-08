/**
 * StreamGrabber - DOM & Media Sniffer Content Script
 * Extracts video crop rectangles & provides in-page fetch bridge to bypass HTTP 412 / CORS / auth issues.
 */

(function () {
  // Chrome Web Store Compliance: Completely bypass YouTube
  const host = (location.hostname || '').toLowerCase();
  const href = (location.href || '').toLowerCase();
  if (host.includes('youtube.com') || host.includes('youtu.be') || host.includes('googlevideo.com') ||
      href.includes('youtube.com') || href.includes('youtu.be') || href.includes('googlevideo.com')) {
    return;
  }
  try {
    if (window.top && window.top !== window) {
      const topHost = (window.top.location.hostname || '').toLowerCase();
      if (topHost.includes('youtube.com') || topHost.includes('youtu.be') || topHost.includes('googlevideo.com')) {
        return;
      }
    }
  } catch (_) {}

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
    'interstitial', '/ads/video/', '/sponsor/', 'exo_ad', 'ad_media',
    'video-preview.s3.yandex', 'video-preview'
  ];

  function isAdOrAnnounceUrl(url) {
    if (!url || typeof url !== 'string') return true;
    const lower = url.toLowerCase();
    if (KNOWN_AD_DOMAINS.some(d => lower.includes(d))) return true;
    if (AD_URL_PATTERNS.some(p => lower.includes(p))) return true;
    return false;
  }

  // Filter out ad iframes and intermediary sandbox proxy wrappers
  if (window.self !== window.top) {
    const loc = (window.location.href || '').toLowerCase();
    const docTitle = (document.title || '').toLowerCase();
    if (loc.includes('yastatic.net/video-player') || loc.includes('pages-common') ||
        isAdOrAnnounceUrl(loc) || loc.includes('about:blank') || loc.includes('banner') ||
        loc.includes('sponsor') || loc.includes('/ads/') || docTitle === 'ad' ||
        docTitle.includes('advertisement') || docTitle.includes('anuncio')) {
      return; // Do not run sniffer or floating button inside intermediary sandbox wrappers or ad frames
    }
  }

  if (window.__STREAMGRABBER_INITIALIZED__) return;
  window.__STREAMGRABBER_INITIALIZED__ = true;

  let isExtensionEnabled = true;
  let isSiteExcluded = false;
  const currentHost = (location.hostname || '').toLowerCase();

  // Voyeur domains default excluded from sniffer to prevent any interference
  if (currentHost.includes('voyeurok.com') || currentHost.includes('voyeurhit.com') || currentHost.includes('videovoyeurhit.com')) {
    isSiteExcluded = true;
  }

  function checkSiteExcluded(excludedSites) {
    if (!Array.isArray(excludedSites)) return false;
    return excludedSites.some(site => {
      const s = site.toLowerCase().trim();
      return s && (currentHost === s || currentHost.endsWith('.' + s));
    });
  }

  function syncLocalStorageExclusion(excluded) {
    try {
      if (excluded) {
        localStorage.setItem('__xg_excluded__', 'true');
        localStorage.removeItem('__xg_unexcluded__');
      } else {
        localStorage.removeItem('__xg_excluded__');
        localStorage.setItem('__xg_unexcluded__', 'true');
      }
    } catch (_) {}
  }

  function syncExtensionEnabledState(enabled) {
    try {
      if (!enabled) {
        sessionStorage.setItem('__xg_off__', '1');
        localStorage.setItem('__xg_disabled__', '1');
      } else {
        sessionStorage.removeItem('__xg_off__');
        localStorage.removeItem('__xg_disabled__');
      }
    } catch (_) {}
  }

  chrome.storage.local.get({ extensionEnabled: true, excludedSites: ['voyeurok.com', 'voyeurhit.com', 'videovoyeurhit.com'] }, (res) => {
    isExtensionEnabled = res.extensionEnabled !== false;
    isSiteExcluded = isSiteExcluded || checkSiteExcluded(res.excludedSites);
    syncLocalStorageExclusion(isSiteExcluded);
    syncExtensionEnabledState(isExtensionEnabled);
    if ((!isExtensionEnabled || isSiteExcluded) && typeof floatingBtn !== 'undefined' && floatingBtn) {
      floatingBtn.style.display = 'none';
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      if (changes.extensionEnabled !== undefined) {
        isExtensionEnabled = changes.extensionEnabled.newValue !== false;
        syncExtensionEnabledState(isExtensionEnabled);
      }
      if (changes.excludedSites !== undefined) {
        isSiteExcluded = checkSiteExcluded(changes.excludedSites.newValue);
        syncLocalStorageExclusion(isSiteExcluded);
      }
      if ((!isExtensionEnabled || isSiteExcluded) && typeof floatingBtn !== 'undefined' && floatingBtn) {
        floatingBtn.style.display = 'none';
      } else if (isExtensionEnabled && !isSiteExcluded && typeof runScan === 'function') {
        runScan();
      }
    }
  });

  const detectedUrls = new Set();
  let latestDetectedStream = null;
  let cachedPoster = null;

  function detectQualityFromUrl(url, defaultQuality = 'Auto HD') {
    if (!url || typeof url !== 'string') return defaultQuality;
    const lower = url.toLowerCase();
    const match = url.match(/(\d{3,4})p/i) || url.match(/(\d{3,4})x(\d{3,4})/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= 1080) return `${num}p Full HD`;
      if (num >= 720) return `${num}p HD`;
      return `${num}p SD`;
    }
    if (lower.includes('_hq') || lower.includes('hq.mp4') || lower.includes('_hd') || lower.includes('hd.mp4') || lower.includes('1080')) return '1080p Full HD';
    if (lower.includes('720')) return '720p HD';
    if (lower.includes('_lq') || lower.includes('lq.mp4') || lower.includes('_sd') || lower.includes('sd.mp4') || lower.includes('480')) return '480p SD';
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
    if (!url || typeof url !== 'string') return true;
    const lower = url.toLowerCase();

    if (lower.startsWith('data:') || lower.startsWith('javascript:')) return true;

    // Exclude static web assets and HTML extensions
    if (lower.match(/\.(html|htm|php|asp|aspx|jsp|shtml|cgi|json|css|js)(\?.*)?$/)) return true;

    // Filter out isolated fragment chunks (.ts / .m4s / .aac)
    if (lower.match(/\.(ts|m4s)(\?.*)?$/) || lower.includes('/segment') || lower.includes('/seg-') || lower.includes('/fragment-')) {
      return true;
    }

    // Filter out ad / announce / teaser video URLs
    if (isAdOrAnnounceUrl(lower)) {
      return true;
    }

    // A valid media item MUST be a stream, media file, or dynamic media route
    const isStreamOrMedia = lower.startsWith('blob:') ||
                            lower.match(/\.(mp4|m3u8|webm|mpd|flv|mp3|m4a|aac|ogg|wav)(\/|\?.*)?$/i) ||
                            lower.includes('/get_file/') ||
                            lower.includes('/get_video') ||
                            lower.includes('/videofile.php') ||
                            lower.includes('strm.yandex.') ||
                            lower.includes('ott-stream.yandex.');

    if (!isStreamOrMedia) return true;

    // Never report the page's own HTML URL as a media item!
    try {
      const pageLoc = (window.location.href || '').split('?')[0].split('#')[0].replace(/\/+$/, '');
      const testLoc = url.split('?')[0].split('#')[0].replace(/\/+$/, '');
      if (pageLoc && testLoc === pageLoc) return true;
    } catch (e) {}

    return false;
  }

  function reportMedia(mediaItem) {
    if (!isExtensionEnabled || isSiteExcluded) return;
    if (!mediaItem.url || mediaItem.url.startsWith('blob:') || isExcludedUrl(mediaItem.url) || isAdOrAnnounceUrl(mediaItem.url) || detectedUrls.has(mediaItem.url)) return;

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

    latestDetectedStream = fullItem;
    console.log('[XtremeGrbr] reportMedia registered stream:', fullItem);

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

  // Listen for direct authentic stream broadcasts from MAIN world pageHook.js
  document.addEventListener('__STREAMGRABBER_MEDIA_EVENT__', (e) => {
    try {
      if (!e.detail) return;
      const data = typeof e.detail === 'string' ? JSON.parse(e.detail) : e.detail;
      console.log('[XtremeGrbr] Received __STREAMGRABBER_MEDIA_EVENT__:', data);
      if (data && data.url && !isExcludedUrl(data.url) && !isAdOrAnnounceUrl(data.url)) {
        reportMedia({
          url: data.url,
          quality: data.quality || 'Auto HD',
          type: data.type || detectTypeFromUrl(data.url),
          poster: data.poster || findVideoPoster(),
          title: data.title || getPageTitle()
        });
      }
    } catch (err) {}
  });

  const AD_CONTAINER_SELECTOR = [
    '.video-ads',
    '.ad-container',
    '.ads-container',
    '.ad-overlay',
    '.preroll-container',
    '.video-ad-overlay',
    '[id^="ad-slot"]',
    '[id^="google_ads"]',
    '[class*="vast-"]',
    '[class*="exo_ad"]',
    '[class*="outstream"]',
    '[class^="ad-"]',
    '[class*=" ad-"]',
    '[class^="ads-"]',
    '[class*=" ads-"]',
    '[id^="ad-"]',
    '[id^="ads-"]'
  ].join(', ');

  const PLAYER_CONTAINER_SELECTORS = [
    'iframe.VideoPlayer-Sandbox',
    'iframe[class*="VideoPlayer"]',
    'iframe[src*="video-player"]',
    'iframe[src*="video_ext"]',
    'iframe[src*="vk.com"]',
    'iframe[src*="vkvideo.ru"]',
    '.VideoPlayer',
    '.VideoViewer-EmbedPlayer',
    '.video-player-container',
    '[class*="VideoPlayer"]',
    '[class*="video_player"]',
    '[class*="videoplayer"]',
    '[class*="PlayerContainer"]',
    '[class*="VideoLayer"]',
    '[class*="VideoViewer"]',
    '[id*="video_box_wrap"]',
    '[id*="video_player"]',
    '[data-testid*="player"]',
    'div.video_box',
    'div.video_player',
    '[data-bem*="player"]'
  ].join(', ');

  function scanMediaElements() {
    const poster = findVideoPoster();

    const videoElements = document.querySelectorAll('video');
    videoElements.forEach(video => {
      // Check if video element is inside an ad wrapper or banner
      const closestAd = video.closest(AD_CONTAINER_SELECTOR);
      if (closestAd) {
        const cls = (closestAd.className || '').toLowerCase();
        const isPlayer = cls.includes('player') || cls.includes('video') || cls.includes('viewer');
        if (!isPlayer) return; // Skip genuine ad containers!
      }

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

  function kvsGetLicenseToken(licenseCode) {
    if (!licenseCode || typeof licenseCode !== 'string') return [];
    licenseCode = licenseCode.replace(/\$/g, '');
    const licenseValues = licenseCode.split('').map(c => parseInt(c, 10));

    const modlicense = licenseCode.replace(/0/g, '1');
    const center = Math.floor(modlicense.length / 2);
    const fronthalf = parseInt(modlicense.slice(0, center + 1), 10);
    const backhalf = parseInt(modlicense.slice(center), 10);
    const derived = String(4 * Math.abs(fronthalf - backhalf)).slice(0, center + 1);

    const tokens = [];
    for (let index = 0; index < derived.length; index++) {
      const current = parseInt(derived[index], 10);
      for (let offset = 0; offset < 4; offset++) {
        tokens.push((licenseValues[index + offset] + current) % 10);
      }
    }
    return tokens;
  }

  function kvsGetRealUrl(videoUrl, licenseCode) {
    if (!videoUrl || typeof videoUrl !== 'string') return videoUrl;
    if (!videoUrl.startsWith('function/0/')) {
      return videoUrl.replace(/^function\/\d+\//i, '');
    }
    if (!licenseCode) {
      return videoUrl.replace(/^function\/\d+\//i, '');
    }

    try {
      const rawUrl = videoUrl.slice('function/0/'.length);
      const u = new URL(rawUrl.startsWith('//') ? location.protocol + rawUrl : (rawUrl.startsWith('/') ? location.origin + rawUrl : rawUrl));
      const licenseToken = kvsGetLicenseToken(licenseCode);
      if (!licenseToken.length) return rawUrl;
      const urlparts = u.pathname.split('/');

      // Path format: /get_file/<storage_id>/<hash>/<dir1>/<dir2>/<filename>.mp4/
      const hashIdx = urlparts.findIndex(p => p.length >= 32 && /^[0-9a-f]+$/i.test(p));
      if (hashIdx === -1) return rawUrl;

      const HASH_LENGTH = 32;
      const hash_ = urlparts[hashIdx].slice(0, HASH_LENGTH);
      const indices = [];
      for (let i = 0; i < HASH_LENGTH; i++) indices.push(i);

      let accum = 0;
      for (let src = HASH_LENGTH - 1; src >= 0; src--) {
        accum += (licenseToken[src] || 0);
        const dest = (src + accum) % HASH_LENGTH;
        const temp = indices[src];
        indices[src] = indices[dest];
        indices[dest] = temp;
      }

      let unscrambled = '';
      for (let i = 0; i < indices.length; i++) {
        unscrambled += hash_[indices[i]];
      }
      urlparts[hashIdx] = unscrambled + urlparts[hashIdx].slice(HASH_LENGTH);
      u.pathname = urlparts.join('/');
      return u.toString();
    } catch (e) {
      return videoUrl.replace(/^function\/\d+\//i, '');
    }
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

      // 2. Dedicated KVS / Flashvars / Tube Player Extractor (ThisVid, Tube sites)
      const flashvarsMatch = fullHtml.match(/(?:var\s+|window\.)?flashvars\s*=\s*\{([\s\S]*?)\}(?:;|\s*<\/script>|\s*\n)/i) ||
                             fullHtml.match(/flashvars\s*=\s*\{([\s\S]*?)\}/i);
      if (flashvarsMatch && flashvarsMatch[1]) {
        const fvBlock = flashvarsMatch[1];
        const videoTitle = (fvBlock.match(/video_title\s*:\s*['"]([^'"]+)['"]/i)?.[1]) || getPageTitle();
        const fvPoster = (fvBlock.match(/preview_url\s*:\s*['"]([^'"]+)['"]/i)?.[1]) || poster;
        const licenseCode = (fvBlock.match(/license_code\s*:\s*['"]([^'"]+)['"]/i)?.[1]) || '';

        // Primary video_url (HQ / 1080p / 720p)
        const mainVideoMatch = fvBlock.match(/video_url\s*:\s*['"]([^'"]+)['"]/i);
        const mainTextMatch = fvBlock.match(/video_url_text\s*:\s*['"]([^'"]+)['"]/i);
        if (mainVideoMatch && mainVideoMatch[1]) {
          let mainUrl = mainVideoMatch[1].replace(/\\/g, '');
          if (mainUrl.startsWith('function/0/')) {
            mainUrl = kvsGetRealUrl(mainUrl, licenseCode);
          } else if (mainUrl.startsWith('function/')) {
            mainUrl = ''; // Wait for runtime deobfuscation
          }
          if (mainUrl) {
            if (mainUrl.startsWith('//')) mainUrl = location.protocol + mainUrl;
            else if (mainUrl.startsWith('/')) mainUrl = location.origin + mainUrl;
            if (mainUrl.startsWith('http') && !isExcludedUrl(mainUrl)) {
              reportMedia({
                url: mainUrl,
                quality: mainTextMatch?.[1] || detectQualityFromUrl(mainUrl, '1080p Full HD'),
                type: mainUrl.includes('.m3u8') ? 'HLS' : 'MP4',
                title: videoTitle,
                poster: fvPoster
              });
            }
          }
        }

        // Alternative qualities (video_alt_url, video_alt_url1, video_alt_url2...)
        const altRegex = /(video_alt_url\d*)\s*:\s*['"]([^'"]+)['"]/gi;
        let altM;
        while ((altM = altRegex.exec(fvBlock)) !== null) {
          const key = altM[1];
          const rawAltUrl = altM[2];
          const labelMatch = fvBlock.match(new RegExp(key + '_text\\s*:\\s*[\'"]([^\'"]+)[\'"]', 'i'));
          let altUrl = rawAltUrl.replace(/\\/g, '');
          if (altUrl.startsWith('function/0/')) {
            altUrl = kvsGetRealUrl(altUrl, licenseCode);
          } else if (altUrl.startsWith('function/')) {
            altUrl = '';
          }
          if (altUrl) {
            if (altUrl.startsWith('//')) altUrl = location.protocol + altUrl;
            else if (altUrl.startsWith('/')) altUrl = location.origin + altUrl;
            if (altUrl.startsWith('http') && !isExcludedUrl(altUrl)) {
              reportMedia({
                url: altUrl,
                quality: labelMatch?.[1] || detectQualityFromUrl(altUrl, 'Auto SD'),
                type: altUrl.includes('.m3u8') ? 'HLS' : 'MP4',
                title: videoTitle,
                poster: fvPoster
              });
            }
          }
        }
      }

      // 3. Fallback High Resolution & Standard MP4 regexes
      const highMp4Match = fullHtml.match(/["']?(?:video_url_high|video_url_hq|video_url_1080p|video_url_720p)["']?\s*[:=]\s*["']([^"']+\.mp4[^"']*)["']/i);
      if (highMp4Match && highMp4Match[1]) {
        let u = highMp4Match[1].replace(/\\/g, '');
        if (u.startsWith('function/0/')) {
          const lic = fullHtml.match(/license_code\s*:\s*['"]([^'"]+)['"]/i)?.[1] || '';
          u = kvsGetRealUrl(u, lic);
        } else if (u.startsWith('function/')) {
          u = '';
        }
        if (u) {
          if (u.startsWith('//')) u = location.protocol + u;
          else if (u.startsWith('/')) u = location.origin + u;
          if (u.startsWith('http') && !isExcludedUrl(u)) {
            reportMedia({
              url: u,
              quality: detectQualityFromUrl(u, '1080p Full HD'),
              type: 'MP4',
              poster: poster
            });
          }
        }
      }

      const stdMp4Match = fullHtml.match(/["']?(?:video_url|video_alt_url3|video_alt_url4)["']?\s*[:=]\s*["']([^"']+\.mp4[^"']*)["']/i) ||
                          fullHtml.match(/sources\s*:\s*\[\s*\{[^}]*file\s*:\s*["']([^"']+\.mp4[^"']*)["']/i);
      if (stdMp4Match && stdMp4Match[1]) {
        let u = stdMp4Match[1].replace(/\\/g, '');
        if (u.startsWith('function/0/')) {
          const lic = fullHtml.match(/license_code\s*:\s*['"]([^'"]+)['"]/i)?.[1] || '';
          u = kvsGetRealUrl(u, lic);
        } else if (u.startsWith('function/')) {
          u = '';
        }
        if (u) {
          if (u.startsWith('//')) u = location.protocol + u;
          else if (u.startsWith('/')) u = location.origin + u;
          if (u.startsWith('http') && !isExcludedUrl(u)) {
            reportMedia({
              url: u,
              quality: detectQualityFromUrl(u, 'Auto HD'),
              type: 'MP4',
              poster: poster
            });
          }
        }
      }

      // VoyeurOK / VoyeurHit / VideoVoyeurHit Direct Stream Resolver
      let voyeurVidId = null;
      const voyeurEl = document.querySelector('#player[data-src], .video__player[data-src], iframe[src*="voyeurhit"], iframe[data-src*="voyeurhit"], iframe[src*="videovoyeurhit"], iframe[data-src*="videovoyeurhit"], [data-remote*="videovoyeurhit"]');
      if (voyeurEl) {
        const elSrc = voyeurEl.src || voyeurEl.getAttribute('data-src') || voyeurEl.getAttribute('data-remote') || '';
        const m = elSrc.match(/(?:embed|videos)\/(\d+)/i);
        if (m && m[1]) voyeurVidId = m[1];
      }
      if (!voyeurVidId) {
        const voyeurMatch = fullHtml.match(/https?:\/\/[^"']*(?:voyeurhit|videovoyeurhit)[^"']*\/(?:embed|videos)\/(\d+)/i) ||
                            location.href.match(/(?:voyeurhit|videovoyeurhit)[^"']*\/(?:embed|videos)\/(\d+)/i) ||
                            fullHtml.match(/data-src=["']https?:\/\/[^"']*(?:voyeurhit|videovoyeurhit)[^"']*\/embed\/(\d+)\/?["']/i) ||
                            fullHtml.match(/["']embedUrl["']\s*:\s*["']https?:\/\/[^"']*(?:voyeurhit|videovoyeurhit)[^"']*\/embed\/(\d+)\/?["']/i) ||
                            fullHtml.match(/["']embedUrl["']\s*:\s*["']([^"']+)["']/i);
        if (voyeurMatch) {
          const rawEmbed = voyeurMatch[1];
          const embedIdMatch = rawEmbed.match(/(?:embed|videos)\/(\d+)/i);
          if (embedIdMatch) voyeurVidId = embedIdMatch[1];
          else if (/^\d+$/.test(rawEmbed)) voyeurVidId = rawEmbed;
        }
      }
      if (!voyeurVidId && typeof window.vpage_data === 'object' && window.vpage_data?.vid) {
        const embedCheck = fullHtml.match(/videovoyeurhit\.com\/embed\/(\d+)/i) || fullHtml.match(/voyeurhit\.com\/embed\/(\d+)/i);
        if (embedCheck && embedCheck[1]) voyeurVidId = embedCheck[1];
      }
      if (voyeurVidId) {
        chrome.runtime.sendMessage({
          action: 'RESOLVE_VOYEUR_STREAM',
          videoId: voyeurVidId,
          pageTitle: getPageTitle(),
          pageUrl: window.location.href,
          poster: poster
        }, () => {
          if (chrome.runtime.lastError) {}
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

      // 4. React Router / Remix Context / FileBoom & Embedded video JSON payloads
      const fboomMatch = fullHtml.match(/["'](https?:\/\/(?:www\.)?fboom\.me\/file\/[a-zA-Z0-9]+)["']/i) ||
                         fullHtml.match(/["']file["']\s*:\s*["'](https?:\/\/[^"']+)["']/i);
      if (fboomMatch && fboomMatch[1] && !isExcludedUrl(fboomMatch[1])) {
        reportMedia({
          url: fboomMatch[1],
          quality: 'External Link (FileBoom)',
          type: 'File Link',
          poster: poster
        });
      }

      // Yandex Video / VK / OK / Generic JSON payload stream extraction
      const yandexStreams = fullHtml.match(/["']?(?:hlsUrl|manifestUrl|video_src|stream_url|content_url|playback_url|fileUrl|src|url)["']?\s*[:=]\s*["']([^"']+(?:yandex|vh-video|strm)[^"']*\.(?:m3u8|mp4|webm)[^"']*)["']/gi) ||
                            fullHtml.match(/["'](https?:\/\/[^"']*(?:yandex|vh-video|strm)[^"']*\.(?:m3u8|mp4|webm)[^"']*)["']/gi) ||
                            fullHtml.match(/["'](https?:\/\/[^"']*\.(?:m3u8|mp4)[^"']*)["']/gi);
      if (yandexStreams) {
        for (const str of yandexStreams) {
          const match = str.match(/["']([^"']+\.(?:m3u8|mp4|webm)[^"']*)["']/i);
          if (match && match[1]) {
            let u = match[1].replace(/\\/g, '');
            if (u.startsWith('//')) u = location.protocol + u;
            if (!isExcludedUrl(u) && !isAdOrAnnounceUrl(u)) {
              reportMedia({
                url: u,
                quality: detectQualityFromUrl(u, u.includes('.m3u8') ? 'HD Stream' : 'Auto HD'),
                type: detectTypeFromUrl(u),
                poster: poster
              });
            }
          }
        }
      }

      // Scan dynamic iframe src attributes for video embed players
      const iframes = document.querySelectorAll('iframe[src*="video"], iframe[src*="embed"], iframe[src*="player"], iframe[src*="yandex"], iframe[src*="mail.ru"]');
      iframes.forEach(iframe => {
        const src = iframe.src || iframe.getAttribute('data-src') || iframe.getAttribute('src');
        if (src && src.startsWith('http') && !isExcludedUrl(src) && !isAdOrAnnounceUrl(src)) {
          chrome.runtime.sendMessage({
            action: 'RESOLVE_EMBED_MEDIA',
            embedUrl: src,
            pageUrl: window.location.href,
            title: getPageTitle(),
            poster: findVideoPoster()
          }, () => { if (chrome.runtime.lastError) {} });
        }
      });
    } catch (e) {}
  }

  function scanYandexVideoPlayer() {
    const isYandex = location.hostname.includes('yandex.') || location.hostname.includes('ya.ru');
    if (!isYandex) return;

    try {
      const pageHtml = document.documentElement ? document.documentElement.innerHTML : '';
      const embedsToResolve = new Set();

      // 1. Scan iframes (VideoPlayer-Sandbox or iframe-default or mailru or other player iframes)
      const iframes = document.querySelectorAll(
        'iframe.VideoPlayer-Sandbox, iframe[class*="VideoPlayer"], iframe[src*="video-player"], iframe[src*="pages-common"], iframe[src*="mailru"], iframe[src*="iframe-default"]'
      );
      iframes.forEach(iframe => {
        const src = iframe.getAttribute('src') || iframe.src || '';
        if (src) {
          // Check hash #html=
          if (src.includes('#html=')) {
            try {
              const rawHtml = decodeURIComponent(src.split('#html=')[1] || '');
              const innerSrcMatch = rawHtml.match(/src=["']([^"']+)["']/i);
              if (innerSrcMatch && innerSrcMatch[1]) {
                let u = innerSrcMatch[1];
                if (u.startsWith('//')) u = 'https:' + u;
                embedsToResolve.add(u);
              }
            } catch (e) {}
          }
          // Direct embed iframe
          if (src.startsWith('http') && !src.includes('yastatic.net') && (src.includes('embed') || src.includes('player') || src.includes('video'))) {
            embedsToResolve.add(src);
          }
        }
      });

      // 2. Scan inline JSON / state for player configs (embedUrl, videoUrl)
      const embedUrlMatches = pageHtml.matchAll(/"embedUrl"\s*:\s*"([^"]+)"/g);
      for (const m of embedUrlMatches) {
        if (m[1]) {
          let u = m[1].replace(/\\/g, '');
          if (u.startsWith('//')) u = 'https:' + u;
          embedsToResolve.add(u);
        }
      }

      const videoUrlMatches = pageHtml.matchAll(/"videoUrl"\s*:\s*"([^"]+)"/g);
      for (const m of videoUrlMatches) {
        if (m[1]) {
          let u = m[1].replace(/\\/g, '');
          if (u.startsWith('//')) u = 'https:' + u;
          if (u.includes('mail.ru') || u.includes('vk.com') || u.includes('rutube') || u.includes('player')) {
            embedsToResolve.add(u);
          }
        }
      }

      // 3. Scan for Yandex VH content_id or stream_url
      const vhMatch = pageHtml.match(/"content_id"\s*:\s*"([^"]+)"/) || pageHtml.match(/frontend\.vh\.yandex\.ru\/v\d+\/player\/([^"'\s]+)\.json/);
      if (vhMatch && vhMatch[1]) {
        embedsToResolve.add(`https://frontend.vh.yandex.ru/v23/player/${vhMatch[1]}.json?service=ya-video`);
      }

      const strmMatch = pageHtml.match(/(https?:\/\/(?:strm|ott-stream)\.yandex\.(?:ru|net)\/[^\s"']+\.m3u8[^\s"']*)/i);
      if (strmMatch && strmMatch[1]) {
        reportMedia({
          url: strmMatch[1],
          quality: 'Auto HD',
          type: 'HLS',
          title: getPageTitle(),
          source: 'Yandex HLS'
        });
      }

      // Send detected embeds to background for full resolution
      for (const embedUrl of embedsToResolve) {
        if (!detectedUrls.has(embedUrl)) {
          detectedUrls.add(embedUrl);
          chrome.runtime.sendMessage({
            action: 'RESOLVE_EMBED_MEDIA',
            embedUrl: embedUrl,
            pageUrl: window.location.href,
            title: getPageTitle(),
            poster: findVideoPoster()
          }, () => {
            if (chrome.runtime.lastError) {}
          });
        }
      }
    } catch (e) {}
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

  function scanVkVideoPlayer() {
    try {
      const host = (window.location.hostname || '').toLowerCase();
      const isVk = host.includes('vkvideo.ru') || host.includes('vk.com');

      // 1. Direct page URL on VK: vkvideo.ru/video{oid}_{id} or vk.com/video{oid}_{id} or vk.com/...z=video{oid}_{id}
      let videoId = isVk ? extractVkVideoId(window.location.href) : null;

      // 2. Scan iframes or embed links on any page for VK embeds
      if (!videoId) {
        const vkIframes = document.querySelectorAll('iframe[src*="vk.com"], iframe[src*="vkvideo.ru"]');
        for (const ifr of vkIframes) {
          const src = ifr.getAttribute('src') || ifr.src || '';
          const m = extractVkVideoId(src);
          if (m) {
            videoId = m;
            break;
          }
        }
      }

      // 3. Scan page HTML for data-video, video_id, or video-oid_id attributes
      if (!videoId && isVk) {
        const el = document.querySelector('[data-video], [data-video-id], [id*="video_box_wrap"]');
        if (el) {
          const vAttr = el.getAttribute('data-video') || el.getAttribute('data-video-id') || el.id;
          const vm = vAttr ? vAttr.match(/(-?\d+_\d+)/) : null;
          if (vm) videoId = vm[1];
        }
      }

      if (videoId) {
        const cacheKey = `vk_${videoId}`;
        if (!detectedUrls.has(cacheKey)) {
          detectedUrls.add(cacheKey);
          chrome.runtime.sendMessage({
            action: 'RESOLVE_VK_VIDEO',
            videoId: videoId,
            domain: isVk ? host : 'vkvideo.ru',
            pageUrl: window.location.href,
            title: getPageTitle(),
            poster: findVideoPoster()
          }, () => {
            if (chrome.runtime.lastError) {}
          });
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
        if (name && typeof name === 'string') {
          const lower = name.toLowerCase();
          if (lower.match(/\.(m3u8|mpd|mp4|webm|flv|mp3|m4a)(\/|\?.*)?$/i) || lower.includes('/get_file/') || lower.includes('get-video') || lower.includes('strm.yandex') || lower.includes('ott-stream.yandex')) {
            if (!isExcludedUrl(name) && !isAdOrAnnounceUrl(name)) {
              reportMedia({
                url: name,
                quality: detectQualityFromUrl(name, lower.includes('.m3u8') ? 'HD Stream' : 'Auto HD'),
                type: detectTypeFromUrl(name),
                poster: findVideoPoster()
              });
            }
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
    if (!isExtensionEnabled || isSiteExcluded) return;
    scanYandexVideoPlayer();
    scanVkVideoPlayer();
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
    // Handle global extension status changes dynamically
    if (request.action === 'EXTENSION_STATUS_CHANGED') {
      isExtensionEnabled = Boolean(request.enabled);
      syncExtensionEnabledState(isExtensionEnabled);
      if (typeof floatingBtn !== 'undefined' && floatingBtn) {
        floatingBtn.style.display = (!isExtensionEnabled || isSiteExcluded) ? 'none' : 'flex';
      }
      if (isExtensionEnabled && !isSiteExcluded) {
        runScan();
      }
      sendResponse({ success: true, isExtensionEnabled });
      return true;
    }

    // Handle site exclusion changes dynamically
    if (request.action === 'SITE_EXCLUSION_CHANGED') {
      const match = checkSiteExcluded([request.domain]);
      if (match) {
        isSiteExcluded = Boolean(request.excluded);
        syncLocalStorageExclusion(isSiteExcluded);
        if (typeof floatingBtn !== 'undefined' && floatingBtn) {
          floatingBtn.style.display = isSiteExcluded ? 'none' : 'flex';
        }
        if (!isSiteExcluded) {
          runScan();
        }
      }
      sendResponse({ success: true, isSiteExcluded });
      return true;
    }

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

  // Helper to remove invisible clickthrough ad blockers and unlock video timeline controls
  function cleanVideoPlayerOverlays() {
    const blockers = document.querySelectorAll(
      '.vast_clickthrough_layer, .fluid_vpaid_slot, .fluid_ad_container, .fluid_ad_playing, ' +
      '[id^="fluid_nonLinear"], [id^="fluid_vpaidNonLinear"], .ad-iframe-clip, #unmute_tap'
    );
    blockers.forEach(el => {
      try {
        el.style.setProperty('pointer-events', 'none', 'important');
        el.style.setProperty('display', 'none', 'important');
      } catch (_) {}
    });

    const controlBars = document.querySelectorAll(
      '.fluid_controls_container, .fluid_controls_progress_container, .fluid_controls_progress, ' +
      '.jw-controlbar, .vjs-control-bar, .plyr__controls'
    );
    controlBars.forEach(cb => {
      try {
        cb.style.setProperty('pointer-events', 'auto', 'important');
        cb.style.setProperty('z-index', '2147483640', 'important');
      } catch (_) {}
    });

    const videos = document.querySelectorAll('video');
    videos.forEach(v => {
      try {
        v.style.setProperty('pointer-events', 'auto', 'important');
      } catch (_) {}
    });
  }

  // Toggle / Force HTML5 Video Player Controls
  if (request.action === 'TOGGLE_VIDEO_CONTROLS') {
    try {
      const videos = document.querySelectorAll('video');
      let enabledState = false;
      videos.forEach(v => {
        if (request.enable !== undefined) {
          v.controls = Boolean(request.enable);
          enabledState = Boolean(request.enable);
        } else {
          v.controls = !v.controls;
          enabledState = v.controls;
        }
        v.style.setProperty('pointer-events', 'auto', 'important');
        if (enabledState) {
          v.style.setProperty('z-index', '2147483640', 'important');
          v.setAttribute('controlsList', 'nodownload');
        }
      });
      cleanVideoPlayerOverlays();
      sendResponse({ success: true, count: videos.length, enabled: enabledState });
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
    return true;
  }


    // In-Page Manifest Fetch (Runs with page's cookies, origin & headers -> Bypasses HTTP 412)
    if (request.action === 'PAGE_FETCH_TEXT') {
      if (window.self !== window.top) return false;
      (async () => {
        const fetchTextWithMode = async (credentialsMode) => {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 8000);
          try {
            const resp = await fetch(request.url, {
              credentials: credentialsMode,
              headers: {
                'Accept': '*/*',
                ...(request.headers || {})
              },
              signal: controller.signal
            });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            return await resp.text();
          } finally {
            clearTimeout(timer);
          }
        };

        try {
          let text;
          try {
            text = await fetchTextWithMode('include');
          } catch (_) {
            // Retry with 'omit' when cross-origin CDN returns Access-Control-Allow-Origin: *
            text = await fetchTextWithMode('omit');
          }
          sendResponse({ success: true, text });
        } catch (err) {
          sendResponse({ success: false, error: err.message });
        }
      })();
      return true;
    }

    // In-Page ArrayBuffer Segment Fetch
    if (request.action === 'PAGE_FETCH_BUFFER') {
      if (window.self !== window.top) return false;
      (async () => {
        const fetchBufferWithMode = async (credentialsMode) => {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 18000);
          try {
            const resp = await fetch(request.url, {
              credentials: credentialsMode,
              headers: {
                'Accept': '*/*',
                ...(request.headers || {})
              },
              signal: controller.signal
            });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            return await resp.arrayBuffer();
          } finally {
            clearTimeout(timer);
          }
        };

        try {
          let buffer;
          try {
            buffer = await fetchBufferWithMode('include');
          } catch (_) {
            // Retry with 'omit' when cross-origin CDN returns Access-Control-Allow-Origin: *
            buffer = await fetchBufferWithMode('omit');
          }
          // Convert buffer to base64 safely without stack overflow for large files
          const bytes = new Uint8Array(buffer);
          const CHUNK_SIZE = 0x8000; // 32KB chunks
          let binary = '';
          for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
            const chunk = bytes.subarray(i, i + CHUNK_SIZE);
            binary += String.fromCharCode.apply(null, chunk);
          }
          const base64 = btoa(binary);
          sendResponse({ success: true, base64, size: buffer.byteLength });
        } catch (err) {
          sendResponse({ success: false, error: err.message });
        }
      })();
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

  function handleToggleControls(targetVideo) {
    const video = targetVideo || activeVideo || findMostVisibleVideo();
    if (!video) return;

    const newState = !video.controls;
    video.controls = newState;
    video.style.setProperty('pointer-events', 'auto', 'important');
    if (newState) {
      video.style.setProperty('z-index', '2147483640', 'important');
      video.setAttribute('controlsList', 'nodownload');
    }
    cleanVideoPlayerOverlays();

    const textEl = floatingBtn?.querySelector('.streamgrabber-controls-text');
    if (textEl) {
      textEl.textContent = newState ? 'Controls: ON' : 'Controls: OFF';
      textEl.style.color = newState ? '#4ade80' : '#94a3b8';
      setTimeout(() => {
        if (textEl) {
          textEl.textContent = 'Controls';
          textEl.style.color = '#7dd3fc';
        }
      }, 2000);
    }
  }

  function createFloatingButton() {
    if (floatingBtn) return floatingBtn;

    const btn = document.createElement('div');
    btn.id = 'streamgrabber-floating-btn';
    btn.className = 'streamgrabber-floating-btn';
    btn.setAttribute('data-streamgrabber', 'true');
    btn.innerHTML = `
      <div class="streamgrabber-dl-action" title="StreamGrabber - Click to download this video" style="display: flex !important; align-items: center !important; gap: 6px !important; cursor: pointer !important; padding: 2px 6px !important; border-radius: 14px !important;">
        <img src="${appIconUrl}" class="streamgrabber-app-icon" alt="StreamGrabber" style="width: 22px !important; height: 22px !important; border-radius: 5px !important; display: block !important; flex-shrink: 0 !important; pointer-events: none !important; box-shadow: 0 1px 4px rgba(0,0,0,0.3) !important;" />
        <span class="streamgrabber-btn-text" style="font-weight: 700 !important; font-size: 12px !important; color: #ffffff !important; pointer-events: none !important; white-space: nowrap !important; line-height: 1 !important;">Download</span>
      </div>
      <div style="width: 1px !important; height: 16px !important; background: rgba(255, 255, 255, 0.25) !important; flex-shrink: 0 !important; margin: 0 1px !important;"></div>
      <div class="streamgrabber-controls-action" title="Toggle native HTML5 video player controls (or press Alt+C) to seek/advance with mouse pointer" style="display: flex !important; align-items: center !important; gap: 4px !important; cursor: pointer !important; padding: 3px 8px !important; border-radius: 14px !important; background: rgba(255, 255, 255, 0.1) !important;">
        <span style="font-size: 11px !important; pointer-events: none !important; line-height: 1 !important;">⏯️</span>
        <span class="streamgrabber-controls-text" style="font-weight: 700 !important; font-size: 11px !important; color: #7dd3fc !important; pointer-events: none !important; white-space: nowrap !important; line-height: 1 !important;">Controls</span>
      </div>
    `;

    // Apply strict styles via setProperty with 'important' to prevent any page CSS (e.g. body > * { width: 100%; height: 100% }) from hijacking the button!
    const strictStyles = {
      'position': 'fixed',
      'z-index': '2147483647',
      'display': 'none',
      'align-items': 'center',
      'gap': '5px',
      'background': 'rgba(15, 23, 42, 0.94)',
      'color': '#ffffff',
      'border': '1.5px solid #0087cd',
      'border-radius': '24px',
      'padding': '4px 8px 4px 5px',
      'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      'font-size': '12px',
      'font-weight': '700',
      'cursor': 'pointer',
      'box-shadow': '0 4px 18px rgba(0, 135, 205, 0.45)',
      'backdrop-filter': 'blur(8px)',
      'user-select': 'none',
      'pointer-events': 'auto',
      'transition': 'opacity 0.2s ease, transform 0.2s ease, background 0.2s ease, border-color 0.2s ease',
      'opacity': '0.9',
      'width': 'auto',
      'height': 'auto',
      'min-width': '180px',
      'max-width': '270px',
      'min-height': '32px',
      'max-height': '40px',
      'bottom': 'auto',
      'right': 'auto',
      'margin': '0',
      'box-sizing': 'border-box',
      'overflow': 'hidden',
      'transform': 'none'
    };

    for (const [prop, val] of Object.entries(strictStyles)) {
      btn.style.setProperty(prop, val, 'important');
    }

    btn.addEventListener('mouseenter', () => {
      isMouseOverBtn = true;
      btn.style.setProperty('opacity', '1', 'important');
      btn.style.setProperty('transform', 'scale(1.04)', 'important');
      btn.style.setProperty('border-color', '#38bdf8', 'important');
    });

    btn.addEventListener('mouseleave', () => {
      isMouseOverBtn = false;
      btn.style.setProperty('opacity', '0.9', 'important');
      btn.style.setProperty('transform', 'none', 'important');
      btn.style.setProperty('border-color', '#0087cd', 'important');
    });

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const controlsBtn = e.target.closest('.streamgrabber-controls-action');
      if (controlsBtn) {
        handleToggleControls();
      } else {
        handleFloatingDownload();
      }
    }, true);

    const targetRoot = document.fullscreenElement || document.body || document.documentElement;
    targetRoot.appendChild(btn);
    floatingBtn = btn;
    return btn;
  }

  function positionFloatingButton(video) {
    if (!video || !isFloatingBtnEnabled) return;
    // In subframes, only show button if target is an actual HTMLMediaElement (<video>), never over iframes!
    if (window.self !== window.top && !(video instanceof HTMLMediaElement)) {
      if (floatingBtn) floatingBtn.style.setProperty('display', 'none', 'important');
      return;
    }

    const btn = floatingBtn || createFloatingButton();
    const rect = video.getBoundingClientRect();

    if (rect.width < 140 || rect.height < 90) {
      if (!isMouseOverBtn) btn.style.setProperty('display', 'none', 'important');
      return;
    }

    if (rect.bottom < 40 || rect.top > window.innerHeight - 40 || rect.right < 40 || rect.left > window.innerWidth - 40) {
      if (!isMouseOverBtn) btn.style.setProperty('display', 'none', 'important');
      return;
    }

    const btnWidth = btn.offsetWidth || 116;
    const btnHeight = btn.offsetHeight || 36;

    const left = Math.max(10, Math.min(window.innerWidth - btnWidth - 10, rect.right - btnWidth - 12));
    const top = Math.max(10, Math.min(window.innerHeight - btnHeight - 10, rect.top + 12));

    btn.style.setProperty('left', `${Math.round(left)}px`, 'important');
    btn.style.setProperty('top', `${Math.round(top)}px`, 'important');
    btn.style.setProperty('width', 'auto', 'important');
    btn.style.setProperty('height', 'auto', 'important');
    btn.style.setProperty('bottom', 'auto', 'important');
    btn.style.setProperty('right', 'auto', 'important');
    btn.style.setProperty('max-width', '160px', 'important');
    btn.style.setProperty('max-height', '40px', 'important');
    btn.style.setProperty('display', 'flex', 'important');

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
          if (el.tagName === 'IFRAME' && (el.classList.contains('VideoPlayer-Sandbox') || (el.className && typeof el.className === 'string' && el.className.includes('VideoPlayer')) || (el.src && (el.src.includes('video') || el.src.includes('embed'))))) {
            return el;
          }
          if (el.closest && window.self === window.top) {
            const pc = el.closest(PLAYER_CONTAINER_SELECTORS);
            if (pc) {
              const innerVideo = pc.querySelector('video');
              if (innerVideo && !isAdVideoElement(innerVideo)) return innerVideo;
              return pc;
            }
          }
          if (el.querySelector) {
            const v = el.querySelector('video');
            if (v && !isAdVideoElement(v)) return v;
          }
        }
      }
    } catch (err) {}
    return null;
  }

  function isAdVideoElement(v) {
    if (!v) return true;
    const closestAd = v.closest(AD_CONTAINER_SELECTOR);
    if (closestAd) {
      const cls = (closestAd.className || '').toLowerCase();
      const isPlayer = cls.includes('player') || cls.includes('video') || cls.includes('viewer');
      if (!isPlayer) return true;
    }
    // Pre-roll ads are usually short (< 30 seconds)
    if (v.duration && v.duration > 0 && v.duration < 30) return true;
    const src = (v.currentSrc || v.src || '').toLowerCase();
    if (isAdOrAnnounceUrl(src) || src.includes('video-preview.s3.yandex') || src.includes('.s3.yandex.net')) return true;
    return false;
  }

  function findMostVisibleVideo() {
    // 1. In the top window only, check for primary player iframe or container (Yandex, VK, Mail.ru, and embedded players)
    if (window.self === window.top) {
      const playerContainers = Array.from(document.querySelectorAll(PLAYER_CONTAINER_SELECTORS));
      for (const el of playerContainers) {
        const r = el.getBoundingClientRect();
        if (r.width >= 300 && r.height >= 180 && r.top >= -50 && r.bottom <= window.innerHeight + 150) {
          const innerVideo = el.querySelector('video');
          if (innerVideo && !isAdVideoElement(innerVideo)) {
            const vr = innerVideo.getBoundingClientRect();
            if (vr.width >= 300 && vr.height >= 180) return innerVideo;
          }
          return el;
        }
      }
    }

    const rawVideos = Array.from(document.querySelectorAll('video'));
    // Filter out hover preview clips (e.g. s3.yandex.net/vo-*.mp4)
    let videos = rawVideos.filter(v => {
      if (isAdVideoElement(v)) return false;
      const src = (v.currentSrc || v.src || '').toLowerCase();
      if (src.includes('video-preview') || src.includes('.s3.yandex.net')) return false;
      return true;
    });
    if (videos.length === 0) videos = rawVideos;
    if (videos.length === 0) return null;

    // Filter out small side previews (width < 220px or height < 140px) if larger videos exist on page
    const mainCandidateVideos = videos.filter(v => {
      const r = v.getBoundingClientRect();
      return r.width >= 220 && r.height >= 140;
    });

    const targetPool = mainCandidateVideos.length > 0 ? mainCandidateVideos : videos;

    const playing = targetPool.find(v => !v.paused && v.readyState >= 1);
    if (playing) {
      return playing;
    }

    let best = null;
    let maxArea = 0;
    for (const v of targetPool) {
      const r = v.getBoundingClientRect();
      const area = r.width * r.height;
      if (area > maxArea) {
        maxArea = area;
        best = v;
      }
    }
    return best;
  }

  let lastTrackedUrl = window.location.href;
  function checkUrlChange() {
    if (window.location.href !== lastTrackedUrl) {
      lastTrackedUrl = window.location.href;
      scanVkVideoPlayer();
      scanYandexVideoPlayer();
      runScan();
    }
  }

  function updateTracker() {
    checkUrlChange();
    if (!isExtensionEnabled || !isFloatingBtnEnabled) {
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

  function promptInPageFilename(defaultTitle, callback) {
    const existing = document.getElementById('streamgrabber-filename-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'streamgrabber-filename-modal';
    overlay.setAttribute('data-streamgrabber', 'true');
    overlay.style.cssText = [
      'position: fixed !important',
      'top: 0 !important',
      'left: 0 !important',
      'width: 100vw !important',
      'height: 100vh !important',
      'background: rgba(0, 0, 0, 0.72) !important',
      'backdrop-filter: blur(5px) !important',
      '-webkit-backdrop-filter: blur(5px) !important',
      'z-index: 2147483647 !important',
      'display: flex !important',
      'align-items: center !important',
      'justify-content: center !important',
      'box-sizing: border-box !important',
      'margin: 0 !important',
      'padding: 16px !important',
      'opacity: 1 !important',
      'pointer-events: auto !important'
    ].join(';');

    const card = document.createElement('div');
    card.style.cssText = [
      'background: #0f172a !important',
      'border: 1px solid #334155 !important',
      'border-radius: 12px !important',
      'box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.6) !important',
      'padding: 22px 24px !important',
      'width: 440px !important',
      'max-width: 92vw !important',
      'box-sizing: border-box !important',
      'color: #f8fafc !important',
      'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important',
      'text-align: left !important'
    ].join(';');

    card.innerHTML = `
      <div style="display: flex !important; align-items: center !important; justify-content: space-between !important; margin-bottom: 8px !important;">
        <div style="display: flex !important; align-items: center !important; gap: 8px !important; font-size: 16px !important; font-weight: 700 !important; color: #f8fafc !important;">
          <span style="font-size: 18px !important; line-height: 1 !important;">💾</span>
          <span>Save Video As</span>
        </div>
        <button type="button" class="xg-modal-close" style="background: none !important; border: none !important; color: #94a3b8 !important; font-size: 18px !important; cursor: pointer !important; padding: 4px !important; line-height: 1 !important; border-radius: 4px !important;">✕</button>
      </div>
      <div style="font-size: 13px !important; color: #94a3b8 !important; margin-bottom: 14px !important; line-height: 1.4 !important;">
        Choose a file name for this video before download begins:
      </div>
      <input type="text" class="xg-filename-input" style="width: 100% !important; box-sizing: border-box !important; background: #1e293b !important; border: 1.5px solid #475569 !important; border-radius: 8px !important; padding: 10px 14px !important; font-size: 14px !important; color: #ffffff !important; outline: none !important; margin-bottom: 18px !important; font-family: inherit !important;" />
      <div style="display: flex !important; justify-content: flex-end !important; gap: 10px !important;">
        <button type="button" class="xg-btn-cancel" style="background: #334155 !important; color: #cbd5e1 !important; border: none !important; border-radius: 8px !important; padding: 8px 16px !important; font-size: 13px !important; font-weight: 600 !important; cursor: pointer !important;">Cancel</button>
        <button type="button" class="xg-btn-download" style="background: #0284c7 !important; color: #ffffff !important; border: none !important; border-radius: 8px !important; padding: 8px 20px !important; font-size: 13px !important; font-weight: 700 !important; cursor: pointer !important; display: inline-flex !important; align-items: center !important; gap: 6px !important; box-shadow: 0 4px 6px -1px rgba(2, 132, 199, 0.3) !important;">⬇️ Download</button>
      </div>
    `;

    overlay.appendChild(card);
    const targetRoot = document.fullscreenElement || document.body || document.documentElement;
    targetRoot.appendChild(overlay);

    const input = card.querySelector('.xg-filename-input');
    const btnCancel = card.querySelector('.xg-btn-cancel');
    const btnDownload = card.querySelector('.xg-btn-download');
    const btnClose = card.querySelector('.xg-modal-close');

    input.value = defaultTitle || 'video';

    setTimeout(() => {
      try {
        input.focus();
        input.select();
      } catch (_) {}
    }, 50);

    const cleanup = () => {
      overlay.remove();
    };

    let resolved = false;
    const confirm = () => {
      if (resolved) return;
      resolved = true;
      const cleanVal = input.value.trim().replace(/[/\\?%*:|"<>]/g, '_') || defaultTitle || 'video';
      cleanup();
      callback(cleanVal);
    };

    const cancel = () => {
      if (resolved) return;
      resolved = true;
      cleanup();
      callback(null);
    };

    btnDownload.addEventListener('click', (e) => {
      e.stopPropagation();
      confirm();
    });

    btnCancel.addEventListener('click', (e) => {
      e.stopPropagation();
      cancel();
    });

    btnClose.addEventListener('click', (e) => {
      e.stopPropagation();
      cancel();
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cancel();
      }
    });

    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault();
        confirm();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancel();
      }
    });

    input.addEventListener('focus', () => {
      input.style.borderColor = '#0284c7';
      input.style.boxShadow = '0 0 0 3px rgba(2, 132, 199, 0.25)';
    });
    input.addEventListener('blur', () => {
      input.style.borderColor = '#475569';
      input.style.boxShadow = 'none';
    });
  }

  function formatBytesShort(bytes) {
    if (!bytes || isNaN(bytes)) return '';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function formatSpeedShort(bps) {
    if (!bps || isNaN(bps) || bps <= 0) return '';
    if (bps < 1024 * 1024) return (bps / 1024).toFixed(0) + ' KB/s';
    return (bps / (1024 * 1024)).toFixed(1) + ' MB/s';
  }

  function escapeHtmlStr(str) {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  let inPageToastEl = null;

  function showInPageToast(state) {
    if (!isExtensionEnabled) return;

    if (!inPageToastEl) {
      const toast = document.createElement('div');
      toast.id = 'streamgrabber-inpage-toast';
      toast.setAttribute('data-streamgrabber', 'true');
      toast.style.cssText = [
        'position: fixed !important',
        'bottom: 24px !important',
        'right: 24px !important',
        'width: 320px !important',
        'max-width: calc(100vw - 48px) !important',
        'background: #0f172a !important',
        'border: 1px solid #334155 !important',
        'border-radius: 12px !important',
        'box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5) !important',
        'padding: 14px 16px !important',
        'z-index: 2147483647 !important',
        'box-sizing: border-box !important',
        'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important',
        'color: #f8fafc !important',
        'transition: opacity 0.3s, transform 0.3s !important',
        'opacity: 1 !important',
        'transform: translateY(0) !important',
        'pointer-events: auto !important'
      ].join(';');

      const targetRoot = document.fullscreenElement || document.body || document.documentElement;
      targetRoot.appendChild(toast);
      inPageToastEl = toast;
    }

    const isComplete = state.status === 'complete';
    const isError = state.status === 'error';
    const isConnecting = state.status === 'connecting' || state.status === 'starting' || state.status === 'analyzing';
    const pct = Math.max(0, Math.min(100, Math.round(state.progress || 0)));

    let statusText = `${pct}%`;
    if (state.downloadedBytes) statusText += ` (${formatBytesShort(state.downloadedBytes)})`;
    let speedText = state.speedBps ? `⚡ ${formatSpeedShort(state.speedBps)}` : (isConnecting ? '⏳ Connecting...' : '');

    let headerIcon = '⬇️';
    let headerTitle = 'Downloading Video...';
    let barColor = '#0284c7';

    if (isComplete) {
      headerIcon = '✅';
      headerTitle = 'Download Complete!';
      barColor = '#16a34a';
      statusText = 'Saved to Downloads folder';
      speedText = '100%';
    } else if (isError) {
      headerIcon = '⚠️';
      headerTitle = 'Download Error';
      barColor = '#e11d48';
      statusText = state.error || 'Failed to download stream';
      speedText = '';
    }

    inPageToastEl.innerHTML = `
      <div style="display: flex !important; align-items: center !important; justify-content: space-between !important; margin-bottom: 4px !important;">
        <div style="display: flex !important; align-items: center !important; gap: 6px !important; font-size: 13px !important; font-weight: 700 !important; color: ${isError ? '#f87171' : isComplete ? '#4ade80' : '#f8fafc'} !important;">
          <span>${headerIcon}</span>
          <span>${headerTitle}</span>
        </div>
        <button type="button" class="xg-toast-close" style="background: none !important; border: none !important; color: #94a3b8 !important; font-size: 16px !important; cursor: pointer !important; padding: 2px 4px !important; line-height: 1 !important;">✕</button>
      </div>
      <div style="font-size: 11px !important; color: #94a3b8 !important; margin-bottom: 8px !important; overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important;" title="${escapeHtmlStr(state.title || 'Video')}">
        ${escapeHtmlStr(state.title || 'Video')}
      </div>
      <div style="width: 100% !important; height: 5px !important; background: #334155 !important; border-radius: 3px !important; overflow: hidden !important;">
        <div style="width: ${isComplete ? 100 : (isConnecting && pct === 0 ? 15 : pct)}% !important; height: 100% !important; background: ${barColor} !important; transition: width 0.3s ease !important;"></div>
      </div>
      <div style="display: flex !important; justify-content: space-between !important; font-size: 11px !important; color: #cbd5e1 !important; margin-top: 5px !important;">
        <span>${statusText}</span>
        <span>${speedText}</span>
      </div>
    `;

    const btnClose = inPageToastEl.querySelector('.xg-toast-close');
    if (btnClose) {
      btnClose.addEventListener('click', (e) => {
        e.stopPropagation();
        if (inPageToastEl) {
          inPageToastEl.remove();
          inPageToastEl = null;
        }
      });
    }

    if (isComplete || isError) {
      setTimeout(() => {
        if (inPageToastEl) {
          inPageToastEl.style.opacity = '0';
          inPageToastEl.style.transform = 'translateY(10px)';
          setTimeout(() => {
            if (inPageToastEl) {
              inPageToastEl.remove();
              inPageToastEl = null;
            }
          }, 300);
        }
      }, 4500);
    }
  }

  // Real-time listener for download progress and completion from background!
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'DOWNLOAD_PROGRESS' || message.action === 'DOWNLOAD_STATUS') {
      const state = message.state;
      if (!state) return;

      // 1. Update in-page floating toast
      showInPageToast(state);

      // 2. Update floating download button on the video player in real-time
      if (floatingBtn) {
        const textEl = floatingBtn.querySelector('.streamgrabber-btn-text');
        if (textEl) {
          if (state.status === 'downloading') {
            textEl.textContent = `⏳ ${state.progress || 0}%`;
            floatingBtn.style.background = '#0284c7';
          } else if (state.status === 'complete') {
            textEl.textContent = '✅ Downloaded!';
            floatingBtn.style.background = '#16a34a';
            setTimeout(() => {
              textEl.textContent = 'Download';
              floatingBtn.style.background = 'rgba(15, 23, 42, 0.94)';
            }, 3500);
          } else if (state.status === 'error') {
            textEl.textContent = '⚠️ Failed';
            floatingBtn.style.background = '#e11d48';
            setTimeout(() => {
              textEl.textContent = 'Download';
              floatingBtn.style.background = 'rgba(15, 23, 42, 0.94)';
            }, 4000);
          }
        }
      }
    }
  });

  function handleFloatingDownload() {
    if (!floatingBtn) return;
    const textEl = floatingBtn.querySelector('.streamgrabber-btn-text');
    const originalText = 'Download';

    if (textEl) textEl.textContent = '⏳ Analyzing...';
    floatingBtn.style.background = '#0284c7';

    // Query exact media items from background store (identical to popup widget!)
    chrome.runtime.sendMessage({ action: 'GET_TAB_MEDIA' }, (res) => {
      let candidate = null;
      if (res && res.mediaList && res.mediaList.length > 0) {
        candidate = res.mediaList[0];
      }
      if (!candidate && latestDetectedStream) {
        candidate = latestDetectedStream;
      }

      const video = activeVideo || findMostVisibleVideo();
      const videoSrc = video ? (video.currentSrc || video.src || '') : '';

      if (!candidate && !videoSrc) {
        if (textEl) textEl.textContent = '⚠️ Play video 1st';
        floatingBtn.style.background = '#e11d48';
        setTimeout(() => {
          if (textEl) textEl.textContent = originalText;
          floatingBtn.style.background = 'rgba(15, 23, 42, 0.94)';
        }, 2500);
        return;
      }

      let candidateTitle = (candidate && candidate.title) || getPageTitle() || 'video';
      candidateTitle = candidateTitle.replace(/[/\\?%*:|"<>]/g, '_').trim();

      chrome.storage.sync.get({ askFilename: false }, (settings) => {
        const ask = settings && settings.askFilename;
        if (ask) {
          promptInPageFilename(candidateTitle, (chosenTitle) => {
            if (!chosenTitle) {
              if (textEl) textEl.textContent = originalText;
              floatingBtn.style.background = 'rgba(15, 23, 42, 0.94)';
              return;
            }
            startDownloadProcess(chosenTitle, videoSrc, candidate, textEl, originalText, true);
          });
        } else {
          startDownloadProcess(candidateTitle, videoSrc, candidate, textEl, originalText, false);
        }
      });
    });
  }

  function startDownloadProcess(title, videoSrc, candidate, textEl, originalText, skipSaveAsPrompt) {
    if (textEl) textEl.textContent = '⏳ Connecting...';
    floatingBtn.style.background = '#0284c7';

    // Show initial in-page toast immediately for instant user feedback!
    showInPageToast({
      title: title,
      progress: 1,
      status: 'connecting',
      speedBps: 0,
      downloadedBytes: 0
    });

    if (candidate && candidate.url) {
      const updatedItem = {
        ...candidate,
        title: title,
        customTitle: title
      };

      chrome.runtime.sendMessage({
        action: 'START_DOWNLOAD',
        downloadId: 'dl_' + Date.now(),
        item: updatedItem,
        format: 'mp4',
        referer: window.location.href,
        skipSaveAsPrompt: skipSaveAsPrompt
      }, (response) => {
        if (chrome.runtime.lastError || !response || !response.success) {
          if (textEl) textEl.textContent = '⚠️ Failed';
          floatingBtn.style.background = '#e11d48';
          showInPageToast({
            title: title,
            status: 'error',
            error: response?.error || 'Failed to start download'
          });
          setTimeout(() => {
            if (textEl) textEl.textContent = originalText;
            floatingBtn.style.background = 'rgba(15, 23, 42, 0.94)';
          }, 3500);
        }
      });
    } else {
      chrome.runtime.sendMessage({
        action: 'START_FLOATING_DOWNLOAD',
        videoSrc: videoSrc,
        streamUrl: candidate ? candidate.url : null,
        fallbackItem: candidate || null,
        customTitle: title,
        skipSaveAsPrompt: skipSaveAsPrompt
      }, (response) => {
        if (chrome.runtime.lastError || !response || !response.success) {
          if (textEl) textEl.textContent = '⚠️ Play video 1st';
          floatingBtn.style.background = '#e11d48';
          showInPageToast({
            title: title,
            status: 'error',
            error: 'No video stream detected yet. Try playing the video.'
          });
          setTimeout(() => {
            if (textEl) textEl.textContent = originalText;
            floatingBtn.style.background = 'rgba(15, 23, 42, 0.94)';
          }, 3500);
        }
      });
    }
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

    window.addEventListener('popstate', checkUrlChange);
    window.addEventListener('hashchange', checkUrlChange);

    document.addEventListener('keydown', (e) => {
      if (e.altKey && (e.key === 'c' || e.key === 'C')) {
        handleToggleControls();
      }
    }, { capture: true });

    setInterval(updateTracker, 1500);
    setInterval(cleanVideoPlayerOverlays, 1500);
    setTimeout(updateTracker, 500);
    setTimeout(updateTracker, 1500);
  }

  // Defuse interstitials and unhide player display icons (e.g. TrafficStars on thisvid, FluidPlayer on anysex)
  function cleanupInterstitialsAndFixPlayers() {
    try {
      cleanVideoPlayerOverlays();
      const badSelectors = [
        '#tr-interstitial',
        '[id^="tr-interstitial"]',
        '[class*="interstitial-overlay"]',
        '[id^="tr-"][style*="z-index"]',
        '.fp-ad',
        '.fp-preroll',
        '.video-overlay-advertisement',
        '.vast_clickthrough_layer',
        '.fluid_ad_container'
      ];
      for (const sel of badSelectors) {
        const els = document.querySelectorAll(sel);
        for (const el of els) {
          if (el && el.parentNode) {
            el.remove();
          }
        }
      }

      // Ensure Flowplayer / JWPlayer / FluidPlayer elements have proper pointer-events and visibility
      const players = document.querySelectorAll('.fp-player, #kt_player, .jwplayer, .video__player, .fluid_video_wrapper');
      for (const p of players) {
        if (p) {
          p.style.pointerEvents = 'auto';
        }
      }
    } catch (e) {}
  }

  try {
    const style = document.createElement('style');
    style.id = '__xg_player_fix_css__';
    style.textContent = `
      .vast_clickthrough_layer, .fluid_vpaid_slot, .fluid_ad_container, .fluid_ad_playing {
        display: none !important;
        pointer-events: none !important;
        width: 0 !important;
        height: 0 !important;
      }
      .fluid_controls_container, .fluid_controls_progress_container, .fluid_controls_progress {
        pointer-events: auto !important;
        z-index: 2147483640 !important;
      }
      .jw-display-icon-container { display: flex !important; opacity: 1 !important; visibility: visible !important; pointer-events: auto !important; }
      .jw-state-idle .jw-display-icon-container { display: flex !important; }
      .fp-player { pointer-events: auto !important; }
      #kt_player { pointer-events: auto !important; }

      .xg-video-seen {
        position: relative !important;
        transition: opacity 0.25s ease, filter 0.25s ease !important;
      }
      .xg-video-seen img {
        opacity: 0.28 !important;
        filter: grayscale(90%) contrast(75%) brightness(65%) !important;
        transition: opacity 0.25s ease, filter 0.25s ease !important;
      }
      .xg-video-seen:hover img {
        opacity: 0.85 !important;
        filter: grayscale(15%) contrast(95%) brightness(95%) !important;
      }
      .xg-video-seen-overlay {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        background: rgba(15, 23, 42, 0.58) !important;
        pointer-events: none !important;
        z-index: 10 !important;
        border-radius: inherit !important;
        transition: opacity 0.25s ease !important;
      }
      .xg-video-seen:hover .xg-video-seen-overlay {
        opacity: 0.15 !important;
      }
      .xg-video-seen-badge {
        position: absolute !important;
        top: 8px !important;
        left: 8px !important;
        z-index: 99999 !important;
        background: linear-gradient(135deg, #f59e0b, #d97706) !important;
        color: #ffffff !important;
        border: 1.5px solid #ffffff !important;
        outline: 2px solid rgba(0, 0, 0, 0.85) !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
        font-size: 11px !important;
        font-weight: 900 !important;
        letter-spacing: 0.8px !important;
        padding: 3px 8px !important;
        border-radius: 5px !important;
        box-shadow: 0 3px 10px rgba(0, 0, 0, 0.65), 0 0 8px rgba(245, 158, 11, 0.5) !important;
        pointer-events: none !important;
        text-transform: uppercase !important;
        display: inline-flex !important;
        align-items: center !important;
        gap: 4px !important;
        line-height: 1.2 !important;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5) !important;
      }
      .xg-video-seen-badge .xg-badge-icon {
        font-size: 11px !important;
        font-weight: 900 !important;
        color: #ffffff !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  } catch (e) {}

  setInterval(cleanupInterstitialsAndFixPlayers, 800);

  /* ==========================================================================
     Watched / Seen Videos Dimmer Module
     Dims thumbnails of videos that have already been played or downloaded
     ========================================================================== */

  let isDimSeenVideosEnabled = true;
  let seenVideosMap = {};

  function normalizeUrlKey(raw) {
    if (!raw || typeof raw !== 'string') return '';
    try {
      const u = new URL(raw, location.href);
      return (u.origin + u.pathname).toLowerCase().replace(/\/+$/, '');
    } catch (_) {
      return raw.split('?')[0].split('#')[0].toLowerCase().replace(/\/+$/, '');
    }
  }

  function markCurrentPageAsSeen() {
    if (!isDimSeenVideosEnabled) return;
    const pageKey = normalizeUrlKey(location.href);
    if (!pageKey) return;

    chrome.runtime.sendMessage({
      action: 'MARK_VIDEO_SEEN',
      key: pageKey,
      title: getPageTitle()
    }, () => {
      if (chrome.runtime.lastError) {}
    });

    // Also mark in local cache
    seenVideosMap[pageKey] = { title: getPageTitle(), seenAt: Date.now() };
  }

  function applyDimmedSeenVideos() {
    if (!isDimSeenVideosEnabled || !seenVideosMap || Object.keys(seenVideosMap).length === 0) {
      // Remove any previously applied dimming classes if disabled
      if (!isDimSeenVideosEnabled) {
        document.querySelectorAll('.xg-video-seen').forEach(el => {
          el.classList.remove('xg-video-seen');
          const badge = el.querySelector('.xg-video-seen-badge');
          if (badge) badge.remove();
          const overlay = el.querySelector('.xg-video-seen-overlay');
          if (overlay) overlay.remove();
        });
      }
      return;
    }

    const seenKeys = Object.keys(seenVideosMap);
    if (seenKeys.length === 0) return;

    // Fast check: scan all video thumb cards and links
    const candidateLinks = document.querySelectorAll(
      'a[href*="/watch/"], a[href*="/video/"], a[href*="/videos/"], a[href*="view_video.php"], ' +
      'article.thumb, div.thumb, .item-video, .video-card, .video-thumb, .thumb-block'
    );

    candidateLinks.forEach(el => {
      let href = el.tagName === 'A' ? el.getAttribute('href') : '';
      if (!href) {
        const innerLink = el.querySelector('a[href]');
        if (innerLink) href = innerLink.getAttribute('href');
      }
      if (!href || href === '#' || href.startsWith('javascript:')) return;

      const normKey = normalizeUrlKey(href);
      if (!normKey) return;

      // Extract video ID (e.g. /watch/1181863/ or /videos/218441/)
      const idMatch = normKey.match(/(?:watch|video|videos|embed)\/(\d+)/i) || normKey.match(/viewkey=([a-z0-9]+)/i);
      const vidId = idMatch ? idMatch[1] : null;

      const isSeen = Boolean(seenVideosMap[normKey]) || (vidId && seenKeys.some(k => k.includes(vidId)));

      if (isSeen) {
        const targetContainer = el.closest('article, .thumb, .item-video, .video-card, .video-thumb') || el;
        const imgWrap = targetContainer.querySelector('.thumb__img, .thumb-image, .video-thumb-img, .thumbnail, a.thumb__img') || targetContainer.querySelector('a') || targetContainer;

        if (!targetContainer.classList.contains('xg-video-seen')) {
          targetContainer.classList.add('xg-video-seen');

          if (imgWrap && getComputedStyle(imgWrap).position === 'static') {
            imgWrap.style.position = 'relative';
          }

          // 1. Add semi-transparent dark dimming overlay directly over thumbnail image
          if (imgWrap && !imgWrap.querySelector('.xg-video-seen-overlay')) {
            const overlay = document.createElement('div');
            overlay.className = 'xg-video-seen-overlay';
            imgWrap.appendChild(overlay);
          }

          // 2. Add high-visibility, contoured "SEEN" badge
          if (imgWrap && !imgWrap.querySelector('.xg-video-seen-badge')) {
            const badge = document.createElement('div');
            badge.className = 'xg-video-seen-badge';
            badge.innerHTML = '<span class="xg-badge-icon">✓</span><span>SEEN</span>';
            badge.title = 'You have already watched or downloaded this video';
            imgWrap.appendChild(badge);
          }
        }
      }
    });
  }

  // Load seen videos map and preference
  chrome.storage.sync.get({ dimSeenVideos: true }, (syncRes) => {
    isDimSeenVideosEnabled = syncRes.dimSeenVideos !== false;
    if (isDimSeenVideosEnabled) {
      chrome.storage.local.get({ seenVideosMap: {} }, (localRes) => {
        seenVideosMap = localRes.seenVideosMap || {};
        applyDimmedSeenVideos();
      });
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.dimSeenVideos !== undefined) {
      isDimSeenVideosEnabled = changes.dimSeenVideos.newValue !== false;
      applyDimmedSeenVideos();
    }
    if (area === 'local' && changes.seenVideosMap !== undefined) {
      seenVideosMap = changes.seenVideosMap.newValue || {};
      applyDimmedSeenVideos();
    }
  });

  // Track video plays on the active page
  document.addEventListener('play', (e) => {
    if (e.target && e.target.tagName === 'VIDEO' && !isAdVideoElement(e.target)) {
      markCurrentPageAsSeen();
    }
  }, true);

  // Periodically check and apply dimming as dynamic gallery items lazy-load
  setInterval(applyDimmedSeenVideos, 1200);

  const observer = new MutationObserver(() => {
    scanMediaElements();
    scanYandexVideoPlayer();
    scanVkVideoPlayer();
    cleanupInterstitialsAndFixPlayers();
    applyDimmedSeenVideos();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
