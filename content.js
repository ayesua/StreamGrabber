/**
 * StreamGrabber - DOM & Media Sniffer Content Script
 * Extracts video crop rectangles & provides in-page fetch bridge to bypass HTTP 412 / CORS / auth issues.
 */

(function () {
  // Chrome Web Store Compliance: Completely bypass YouTube
  if (location.hostname.includes('youtube.com') || location.hostname.includes('youtu.be')) {
    return;
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

  // Filter out ad iframes from polluting detected media
  if (window.self !== window.top) {
    const loc = (window.location.href || '').toLowerCase();
    const docTitle = (document.title || '').toLowerCase();
    if (isAdOrAnnounceUrl(loc) || loc.includes('about:blank') || loc.includes('banner') || loc.includes('sponsor') || loc.includes('/ads/') || docTitle === 'ad' || docTitle.includes('advertisement') || docTitle.includes('anuncio')) {
      return; // Do not run sniffer inside ad iframes
    }
  }

  if (window.__STREAMGRABBER_INITIALIZED__) return;
  window.__STREAMGRABBER_INITIALIZED__ = true;

  const detectedUrls = new Set();
  let cachedPoster = null;

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

  // Listen for direct authentic stream broadcasts from MAIN world pageHook.js
  document.addEventListener('__STREAMGRABBER_MEDIA_EVENT__', (e) => {
    try {
      if (!e.detail) return;
      const data = typeof e.detail === 'string' ? JSON.parse(e.detail) : e.detail;
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
          if (lower.includes('.m3u8') || lower.includes('.mpd') || lower.includes('.mp4') || lower.includes('.webm') || lower.includes('/video/') || lower.includes('get-video') || lower.includes('strm.yandex')) {
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
    scanYandexVideoPlayer();
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
          // Remove custom pointer-events overlays if present
          v.style.pointerEvents = 'auto';
        });
        sendResponse({ success: true, count: videos.length, enabled: enabledState });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
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
          if (el.tagName === 'IFRAME' && (el.classList.contains('VideoPlayer-Sandbox') || (el.className && typeof el.className === 'string' && el.className.includes('VideoPlayer')) || (el.src && (el.src.includes('video') || el.src.includes('embed'))))) {
            return el;
          }
          if (el.classList && (el.classList.contains('VideoPlayer') || el.classList.contains('VideoViewer-EmbedPlayer') || el.classList.contains('video-player-container'))) {
            return el;
          }
          if (el.querySelector) {
            const v = el.querySelector('video');
            if (v) return v;
          }
        }
      }
    } catch (err) {}
    return null;
  }

  function isAdVideoElement(v) {
    if (!v) return true;
    const closestAd = v.closest(
      '[class*="ad-"], [class*="ads-"], [id*="ad-"], [id*="ads-"], [class*="preroll"], [class*="sponsor"], [class*="banner"], [id*="vast"], [class*="exo_"], [class*="outstream"]'
    );
    if (closestAd) return true;
    // Pre-roll ads are usually short (< 30 seconds)
    if (v.duration && v.duration > 0 && v.duration < 30) return true;
    const src = (v.currentSrc || v.src || '').toLowerCase();
    if (isAdOrAnnounceUrl(src) || src.includes('video-preview.s3.yandex') || src.includes('.s3.yandex.net')) return true;
    return false;
  }

  function findMostVisibleVideo() {
    // 1. Check for primary player iframe or container (Yandex, VK, and embedded players)
    const playerContainers = Array.from(document.querySelectorAll(
      'iframe.VideoPlayer-Sandbox, iframe[class*="VideoPlayer"], .VideoPlayer, .VideoViewer-EmbedPlayer, .video-player-container, [data-bem*="player"], iframe[src*="video-player"]'
    ));
    for (const el of playerContainers) {
      const r = el.getBoundingClientRect();
      if (r.width >= 300 && r.height >= 180 && r.top >= -50 && r.bottom <= window.innerHeight + 150) {
        return el;
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

  const observer = new MutationObserver(() => {
    scanMediaElements();
    scanYandexVideoPlayer();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
