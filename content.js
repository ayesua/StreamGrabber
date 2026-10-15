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

  const detectedUrls = new Set();
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
      if (highMp4Match && highMp4Match[1]) {
        let u = highMp4Match[1].replace(/\\/g, '').replace(/^function\/\d+\//i, '');
        if (u.startsWith('http') && !isExcludedUrl(u)) {
          reportMedia({
            url: u,
            quality: detectQualityFromUrl(u, '1080p Full HD'),
            type: 'MP4',
            poster: poster
          });
        }
      }

      // Standard MP4
      const stdMp4Match = fullHtml.match(/["']?(?:video_url|video_alt_url3|video_alt_url4|video_url_text)["']?\s*[:=]\s*["']([^"']+\.mp4[^"']*)["']/i) ||
                          fullHtml.match(/sources\s*:\s*\[\s*\{[^}]*file\s*:\s*["']([^"']+\.mp4[^"']*)["']/i);
      if (stdMp4Match && stdMp4Match[1]) {
        let u = stdMp4Match[1].replace(/\\/g, '').replace(/^function\/\d+\//i, '');
        if (u.startsWith('http') && !isExcludedUrl(u)) {
          reportMedia({
            url: u,
            quality: detectQualityFromUrl(u, 'Auto HD'),
            type: 'MP4',
            poster: poster
          });
        }
      }

      // VoyeurOK / VoyeurHit / VideoVoyeurHit Direct Stream Resolver
      const voyeurMatch = fullHtml.match(/data-src=["']https?:\/\/[^"']*(?:voyeurhit|videovoyeurhit)[^"']*\/embed\/(\d+)\/?["']/i) ||
                          fullHtml.match(/["']embedUrl["']\s*:\s*["']https?:\/\/[^"']*(?:voyeurhit|videovoyeurhit)[^"']*\/embed\/(\d+)\/?["']/i) ||
                          location.href.match(/voyeurhit\.tube\/embed\/(\d+)/i) ||
                          location.href.match(/voyeurok\.com\/watch\/(\d+)/i);
      if (voyeurMatch && voyeurMatch[1]) {
        const vidId = voyeurMatch[1];
        fetch(`https://voyeurhit.tube/api/videofile.php?video_id=${vidId}&lifetime=8640000`, {
          headers: { 'Referer': `https://voyeurhit.tube/embed/${vidId}/` }
        }).then(r => r.json()).then(files => {
          if (Array.isArray(files) && files.length > 0 && files[0].video_url) {
            function b164_dec(str) {
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
            }
            const path = b164_dec(files[0].video_url);
            if (path && path.startsWith('/')) {
              const fullStream = 'https://voyeurhit.tube' + path;
              reportMedia({
                url: fullStream,
                quality: detectQualityFromUrl(path, '1080p Full HD'),
                type: 'MP4',
                poster: poster
              });
            }
          }
        }).catch(() => {});
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
    btn.title = 'StreamGrabber 2 - Click to download this video';
    btn.innerHTML = `
      <img src="${appIconUrl}" class="streamgrabber-app-icon" alt="StreamGrabber 2" style="width: 24px !important; height: 24px !important; border-radius: 6px !important; display: block !important; flex-shrink: 0 !important; pointer-events: none !important; box-shadow: 0 1px 4px rgba(0,0,0,0.3) !important;" />
      <span class="streamgrabber-btn-text" style="font-weight: 700 !important; font-size: 12px !important; color: #ffffff !important; pointer-events: none !important; white-space: nowrap !important; line-height: 1 !important;">Download</span>
    `;

    // Apply strict styles via setProperty with 'important' to prevent any page CSS (e.g. body > * { width: 100%; height: 100% }) from hijacking the button!
    const strictStyles = {
      'position': 'fixed',
      'z-index': '2147483647',
      'display': 'none',
      'align-items': 'center',
      'gap': '7px',
      'background': 'rgba(15, 23, 42, 0.94)',
      'color': '#ffffff',
      'border': '1.5px solid #0087cd',
      'border-radius': '24px',
      'padding': '5px 12px 5px 6px',
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
      'min-width': '100px',
      'max-width': '160px',
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
      btn.style.setProperty('transform', 'scale(1.06)', 'important');
      btn.style.setProperty('background', '#0087cd', 'important');
      btn.style.setProperty('border-color', '#38bdf8', 'important');
    });

    btn.addEventListener('mouseleave', () => {
      isMouseOverBtn = false;
      btn.style.setProperty('opacity', '0.9', 'important');
      btn.style.setProperty('transform', 'none', 'important');
      btn.style.setProperty('background', 'rgba(15, 23, 42, 0.94)', 'important');
      btn.style.setProperty('border-color', '#0087cd', 'important');
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

    window.addEventListener('popstate', checkUrlChange);
    window.addEventListener('hashchange', checkUrlChange);

    setInterval(updateTracker, 1500);
    setTimeout(updateTracker, 500);
    setTimeout(updateTracker, 1500);
  }

  // Defuse interstitials and unhide player display icons (e.g. TrafficStars on thisvid, JWPlayer on voyeurhit)
  function cleanupInterstitialsAndFixPlayers() {
    try {
      const badSelectors = [
        '#tr-interstitial',
        '[id^="tr-interstitial"]',
        '[class*="interstitial-overlay"]',
        '[id^="tr-"][style*="z-index"]',
        '.fp-ad',
        '.fp-preroll',
        '.video-overlay-advertisement'
      ];
      for (const sel of badSelectors) {
        const els = document.querySelectorAll(sel);
        for (const el of els) {
          if (el && el.parentNode) {
            el.remove();
          }
        }
      }

      // Ensure Flowplayer / JWPlayer elements have proper pointer-events and visibility
      const players = document.querySelectorAll('.fp-player, #kt_player, .jwplayer, .video__player');
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
      .jw-display-icon-container { display: flex !important; opacity: 1 !important; visibility: visible !important; pointer-events: auto !important; }
      .jw-state-idle .jw-display-icon-container { display: flex !important; }
      .fp-player { pointer-events: auto !important; }
      #kt_player { pointer-events: auto !important; }
    `;
    (document.head || document.documentElement).appendChild(style);
  } catch (e) {}

  setInterval(cleanupInterstitialsAndFixPlayers, 800);

  const observer = new MutationObserver(() => {
    scanMediaElements();
    scanYandexVideoPlayer();
    scanVkVideoPlayer();
    cleanupInterstitialsAndFixPlayers();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
