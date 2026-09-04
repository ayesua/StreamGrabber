/**
 * StreamGrabber - DOM & Media Sniffer Content Script
 * Extracts video crop rectangles & provides in-page fetch bridge to bypass HTTP 412 / CORS / auth issues.
 */

(function () {
  if (window.__STREAMGRABBER_INITIALIZED__) return;
  window.__STREAMGRABBER_INITIALIZED__ = true;

  const detectedUrls = new Set();
  let cachedPoster = null;

  function getPageTitle() {
    const ogTitle = document.querySelector('meta[property="og:title"]')?.content;
    const twitterTitle = document.querySelector('meta[name="twitter:title"]')?.content;
    const h1 = document.querySelector('h1')?.innerText;
    let raw = ogTitle || twitterTitle || h1 || document.title || 'Video';
    let clean = raw.replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim();
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

    return false;
  }

  function reportMedia(mediaItem) {
    if (!mediaItem.url || isExcludedUrl(mediaItem.url) || detectedUrls.has(mediaItem.url)) return;

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
      const quality = video.videoWidth ? `${video.videoWidth}x${video.videoHeight}` : 'Auto HD';
      const videoPoster = (video.poster && video.poster.startsWith('http')) ? video.poster : poster;

      if (video.src && !video.src.startsWith('blob:') && !isExcludedUrl(video.src)) {
        reportMedia({
          url: video.src,
          quality: quality,
          type: detectTypeFromUrl(video.src),
          poster: videoPoster
        });
      }
      if (video.currentSrc && !video.currentSrc.startsWith('blob:') && !isExcludedUrl(video.currentSrc)) {
        reportMedia({
          url: video.currentSrc,
          quality: quality,
          type: detectTypeFromUrl(video.currentSrc),
          poster: videoPoster
        });
      }

      const sources = video.querySelectorAll('source');
      sources.forEach(srcEl => {
        if (srcEl.src && !srcEl.src.startsWith('blob:') && !isExcludedUrl(srcEl.src)) {
          reportMedia({
            url: srcEl.src,
            quality: srcEl.getAttribute('res') || quality,
            type: detectTypeFromUrl(srcEl.src),
            poster: videoPoster
          });
        }
      });
    });
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
            quality: 'Auto HD',
            type: detectTypeFromUrl(videoSrcMatch[1]),
            poster: (posterMatch && posterMatch[1]) ? posterMatch[1] : findVideoPoster()
          });
        }
      }
    } catch (e) {}
  }

  function runScan() {
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
  setTimeout(runScan, 1500);
  setTimeout(runScan, 4000);

  // 4. In-page Message Listener: Handles Crop Rect & In-Page Fetch to prevent HTTP 412
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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

  const observer = new MutationObserver(() => scanMediaElements());
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
