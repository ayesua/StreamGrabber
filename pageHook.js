/**
 * StreamGrabber - Main World Page Hook
 * Runs at document_start in the MAIN execution context to passively sniff
 * and broadcast authentic video stream URLs to the content script.
 */

(function () {
  // Chrome Web Store Compliance: Strictly bypass YouTube
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

  // 0. Master Switch & Exclusion Checks: If extension is OFF or site is excluded, exit immediately!
  try {
    if (window.sessionStorage && window.sessionStorage.getItem('__xg_off__') === '1') {
      return;
    }
  } catch (e) {}

  try {
    if (window.localStorage && (window.localStorage.getItem('__xg_disabled__') === '1' || window.localStorage.getItem('__xg_excluded__') === 'true' || window.localStorage.getItem('__xg_excluded__') === '1')) {
      return;
    }
  } catch (e) {}

  try {
    if (document.cookie && (document.cookie.includes('__xg_excluded__=1') || document.cookie.includes('__xg_off__=1'))) {
      return;
    }
  } catch (e) {}

  // Known default excluded sites (e.g. voyeur sites)
  if (host.includes('voyeurok.com') || host.includes('voyeurhit.com') || host.includes('videovoyeurhit.com')) {
    return;
  }

  // Prevent multiple executions per frame
  if (window.__STREAMGRABBER_PAGE_HOOK__) return;
  window.__STREAMGRABBER_PAGE_HOOK__ = true;

  function detectQualityFromUrl(url) {
    if (!url || typeof url !== 'string') return 'Auto HD';
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
    return 'Auto HD';
  }

  function broadcastStreamData(data) {
    try {
      if (!data || !data.url) return;
      const lowerUrl = String(data.url).toLowerCase();
      if (lowerUrl.includes('fozekikikiminu.com') || lowerUrl.includes('growcdnssedge.com') ||
          lowerUrl.includes('sacdnssedge.com') || lowerUrl.includes('/zvrk/')) {
        return;
      }
      document.dispatchEvent(new CustomEvent('__STREAMGRABBER_MEDIA_EVENT__', {
        detail: JSON.stringify(data)
      }));
    } catch (e) {}
  }

  // Intercept HTMLMediaElement.prototype.src to catch dynamic video sources loaded via JS (Yandex, VK, HLS.js, etc.)
  try {
    const origSrcDesc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
    if (origSrcDesc && origSrcDesc.set) {
      Object.defineProperty(HTMLMediaElement.prototype, 'src', {
        configurable: true,
        enumerable: true,
        get: origSrcDesc.get,
        set: function (val) {
          if (val && typeof val === 'string' && !val.startsWith('function/')) {
            let cleanVal = val;
            if (cleanVal.startsWith('//')) cleanVal = location.protocol + cleanVal;
            else if (cleanVal.startsWith('/')) cleanVal = location.origin + cleanVal;
            if (cleanVal.startsWith('http') && !cleanVal.includes('blob:') && !cleanVal.match(/\.(html|htm|php|js|css)(\?.*)?$/i)) {
              broadcastStreamData({
                url: cleanVal,
                type: cleanVal.includes('.m3u8') ? 'HLS' : 'MP4',
                quality: detectQualityFromUrl(cleanVal),
                title: document.title
              });
            }
          }
          return origSrcDesc.set.call(this, val);
        }
      });
    }
  } catch (e) {}

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

  // Intercept window.fetch to sniff dynamic Yandex/VK/VoyeurHit stream API responses
  try {
    const origFetch = window.fetch;
    if (origFetch) {
      window.fetch = function (input, init) {
        const url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
        if (url && typeof url === 'string') {
          const lower = url.toLowerCase();
          const isRealStream = lower.includes('.m3u8') || lower.includes('.mpd') || lower.includes('strm.yandex') || lower.includes('ott-stream.yandex') || (lower.includes('.mp4') && !lower.includes('trailer') && !lower.includes('video-preview'));
          if (isRealStream) {
            broadcastStreamData({
              url: url,
              type: (lower.includes('.m3u8') || lower.includes('strm.yandex')) ? 'HLS' : 'MP4',
              quality: detectQualityFromUrl(url),
              title: document.title
            });
          }
        }

        const promise = origFetch.apply(this, arguments);

        if (url && typeof url === 'string') {
          if (url.includes('videofile.php')) {
            promise.then(res => {
              try {
                const clone = res.clone();
                clone.json().then(files => {
                  if (Array.isArray(files) && files.length > 0 && files[0].video_url) {
                    const decoded = decodeVoyeurHitPath(files[0].video_url);
                    if (decoded && decoded.startsWith('/')) {
                      const origin = (location.origin.includes('voyeur') ? location.origin : 'https://voyeurhit.com');
                      broadcastStreamData({
                        url: origin + decoded,
                        type: 'MP4',
                        quality: detectQualityFromUrl(decoded, '1080p Full HD'),
                        title: document.title,
                        poster: null
                      });
                    }
                  }
                }).catch(() => {});
              } catch (err) {}
            }).catch(() => {});
          }

          if (url.includes('/api/stream')) {
            promise.then(res => {
              try {
                const clone = res.clone();
                clone.json().then(data => {
                  if (data && data.streaming_url && typeof data.streaming_url === 'string') {
                    broadcastStreamData({
                      url: data.streaming_url,
                      type: data.streaming_url.includes('.m3u8') ? 'HLS' : 'MP4',
                      quality: detectQualityFromUrl(data.streaming_url, 'Auto HD'),
                      title: data.title || document.title,
                      poster: data.thumbnail || null
                    });
                  }
                }).catch(() => {});
              } catch (err) {}
            }).catch(() => {});
          }

          if (url.includes('al_video.php')) {
            promise.then(res => {
              try {
                const clone = res.clone();
                clone.text().then(text => {
                  if (text && text.includes('player')) {
                    const json = JSON.parse(text);
                    let player = null;
                    if (Array.isArray(json?.payload)) {
                      for (const part of json.payload) {
                        if (Array.isArray(part)) {
                          const found = part.find(x => x && x.player?.params?.[0]);
                          if (found) { player = found.player.params[0]; break; }
                        }
                      }
                    }
                    if (player) {
                      const title = player.md_title || document.title;
                      const poster = player.jpg || null;
                      if (player.hls) {
                        broadcastStreamData({ url: player.hls, type: 'HLS', quality: 'Auto HD', title, poster });
                      }
                      const qMap = { url2160: '4K 2160p', url1440: '2K 1440p', url1080: '1080p Full HD', url720: '720p HD', url480: '480p SD', url360: '360p SD', url240: '240p SD' };
                      for (const [k, q] of Object.entries(qMap)) {
                        if (player[k]) {
                          broadcastStreamData({ url: player[k], type: 'MP4', quality: q, title, poster });
                        }
                      }
                    }
                  }
                }).catch(() => {});
              } catch (err) {}
            }).catch(() => {});
          }
        }

        return promise;
      };
    }
  } catch (e) {}

  // Intercept XMLHttpRequest to sniff video stream URLs
  try {
    const origOpen = XMLHttpRequest.prototype.open;
    if (origOpen) {
      XMLHttpRequest.prototype.open = function (method, url) {
        this.__xg_url = typeof url === 'string' ? url : (url ? url.toString() : '');

        if (this.__xg_url) {
          const lower = this.__xg_url.toLowerCase();
          const isRealStream = lower.includes('.m3u8') || lower.includes('.mpd') || lower.includes('strm.yandex') || lower.includes('ott-stream.yandex') || (lower.includes('.mp4') && !lower.includes('trailer') && !lower.includes('video-preview'));
          if (isRealStream) {
            broadcastStreamData({
              url: this.__xg_url,
              type: (lower.includes('.m3u8') || lower.includes('strm.yandex')) ? 'HLS' : 'MP4',
              quality: detectQualityFromUrl(this.__xg_url),
              title: document.title
            });
          }

          if (lower.includes('videofile.php')) {
            this.addEventListener('load', function () {
              try {
                if (this.responseText) {
                  const files = JSON.parse(this.responseText);
                  if (Array.isArray(files) && files.length > 0 && files[0].video_url) {
                    const decoded = decodeVoyeurHitPath(files[0].video_url);
                    if (decoded && decoded.startsWith('/')) {
                      const origin = (location.origin.includes('voyeur') ? location.origin : 'https://voyeurhit.com');
                      broadcastStreamData({
                        url: origin + decoded,
                        type: 'MP4',
                        quality: detectQualityFromUrl(decoded, '1080p Full HD'),
                        title: document.title,
                        poster: null
                      });
                    }
                  }
                }
              } catch (err) {}
            });
          }

          if (lower.includes('al_video.php')) {
            this.addEventListener('load', function () {
              try {
                if (this.responseText && this.responseText.includes('player')) {
                  const json = JSON.parse(this.responseText);
                  let player = null;
                  if (Array.isArray(json?.payload)) {
                    for (const part of json.payload) {
                      if (Array.isArray(part)) {
                        const found = part.find(x => x && x.player?.params?.[0]);
                        if (found) { player = found.player.params[0]; break; }
                      }
                    }
                  }
                  if (player) {
                    const title = player.md_title || document.title;
                    const poster = player.jpg || null;
                    if (player.hls) {
                      broadcastStreamData({ url: player.hls, type: 'HLS', quality: 'Auto HD', title, poster });
                    }
                    const qMap = { url2160: '4K 2160p', url1440: '2K 1440p', url1080: '1080p Full HD', url720: '720p HD', url480: '480p SD', url360: '360p SD', url240: '240p SD' };
                    for (const [k, q] of Object.entries(qMap)) {
                      if (player[k]) {
                        broadcastStreamData({ url: player[k], type: 'MP4', quality: q, title, poster });
                      }
                    }
                  }
                }
              } catch (err) {}
            });
          }
        }
        return origOpen.apply(this, arguments);
      };
    }
  } catch (e) {}

  // 1. XVideos & XNXX HTML5Player Stream Sniffer Hook (Read-Only)
  function hookXvideosPlayer(player) {
    if (!player) return;
    try {
      // Extract existing stream URLs if already populated on player initialization
      const playerTitle = player.sTitle || document.title;
      const playerThumb = player.sUrlThumb || null;
      if (player.url_high || player.sUrlHigh) {
        broadcastStreamData({
          url: player.url_high || player.sUrlHigh,
          type: 'MP4',
          quality: '1080p Full HD',
          title: playerTitle,
          poster: playerThumb
        });
      }
      if (player.url_low || player.sUrlLow) {
        broadcastStreamData({
          url: player.url_low || player.sUrlLow,
          type: 'MP4',
          quality: '360p SD',
          title: playerTitle,
          poster: playerThumb
        });
      }
      if (player.url_hls || player.sUrlHls) {
        broadcastStreamData({
          url: player.url_hls || player.sUrlHls,
          type: 'HLS',
          quality: 'HD Stream',
          title: playerTitle,
          poster: playerThumb
        });
      }

      // Sniff and broadcast stream data when setVideoHLS / setVideoUrlHigh / setVideoUrlLow is called
      const origSetHLS = player.setVideoHLS;
      if (origSetHLS) {
        player.setVideoHLS = function (url) {
          if (url && typeof url === 'string') {
            broadcastStreamData({
              url: url,
              type: 'HLS',
              quality: 'HD Stream',
              title: player.sTitle || document.title,
              poster: player.sUrlThumb || null
            });
          }
          return origSetHLS.apply(this, arguments);
        };
      }

      const origSetHigh = player.setVideoUrlHigh;
      if (origSetHigh) {
        player.setVideoUrlHigh = function (url) {
          if (url && typeof url === 'string') {
            broadcastStreamData({
              url: url,
              type: 'MP4',
              quality: '1080p Full HD',
              title: player.sTitle || document.title,
              poster: player.sUrlThumb || null
            });
          }
          return origSetHigh.apply(this, arguments);
        };
      }

      const origSetLow = player.setVideoUrlLow;
      if (origSetLow) {
        player.setVideoUrlLow = function (url) {
          if (url && typeof url === 'string') {
            broadcastStreamData({
              url: url,
              type: 'MP4',
              quality: '360p SD',
              title: player.sTitle || document.title,
              poster: player.sUrlThumb || null
            });
          }
          return origSetLow.apply(this, arguments);
        };
      }
    } catch (e) {}
  }

  // Intercept window.html5player assignments (chaining any existing setter)
  const _prevHtml5Desc = Object.getOwnPropertyDescriptor(window, 'html5player');
  let _html5player = window.html5player;
  try {
    Object.defineProperty(window, 'html5player', {
      configurable: true,
      enumerable: true,
      get: function () {
        return (_prevHtml5Desc && _prevHtml5Desc.get) ? _prevHtml5Desc.get.call(this) : _html5player;
      },
      set: function (val) {
        if (_prevHtml5Desc && _prevHtml5Desc.set) {
          try {
            _prevHtml5Desc.set.call(this, val);
            if (_prevHtml5Desc.get) val = _prevHtml5Desc.get.call(this);
          } catch (e) {}
        }
        _html5player = val;
        hookXvideosPlayer(_html5player);
      }
    });
    if (_html5player) hookXvideosPlayer(_html5player);
  } catch (e) {}

  // 1B. JWPlayer Interceptor (Passive Sniffer Only: Never modifies ads, never breaks player)
  function hookJWPlayerConfig(config) {
    if (!config || typeof config !== 'object') return;
    try {
      const sources = Array.isArray(config.sources) ? config.sources :
        (Array.isArray(config.playlist) && config.playlist[0] && Array.isArray(config.playlist[0].sources) ? config.playlist[0].sources : null);
      if (sources) {
        sources.forEach(srcItem => {
          if (srcItem && srcItem.file) {
            const fullUrl = srcItem.file.startsWith('/') ? location.origin + srcItem.file : srcItem.file;
            broadcastStreamData({
              url: fullUrl,
              type: (srcItem.type === 'hls' || fullUrl.includes('.m3u8')) ? 'HLS' : 'MP4',
              quality: srcItem.label || detectQualityFromUrl(fullUrl),
              title: config.title || (config.playlist && config.playlist[0] && config.playlist[0].title) || document.title,
              poster: config.image || (config.playlist && config.playlist[0] && config.playlist[0].image) || null
            });
          }
        });
      }
    } catch (e) {}
  }

  function wrapJWPlayerInstance(player) {
    if (!player || player.__xg_hooked__) return player;
    player.__xg_hooked__ = true;

    function sniffJWItem(item) {
      if (!item) return;
      try {
        const sources = Array.isArray(item.sources) ? item.sources : (item.file ? [item] : []);
        sources.forEach(s => {
          if (s && s.file && typeof s.file === 'string' && !s.file.startsWith('blob:')) {
            const fullUrl = s.file.startsWith('/') ? location.origin + s.file : s.file;
            console.log('[XtremeGrbr] JWPlayer stream detected:', fullUrl);
            broadcastStreamData({
              url: fullUrl,
              type: (s.type === 'hls' || fullUrl.includes('.m3u8')) ? 'HLS' : 'MP4',
              quality: s.label || detectQualityFromUrl(fullUrl),
              title: item.title || document.title,
              poster: item.image || null
            });
          }
        });
      } catch (err) {}
    }

    const origSetup = player.setup;
    if (origSetup) {
      player.setup = function (config) {
        hookJWPlayerConfig(config);
        const res = origSetup.apply(this, arguments);
        try {
          if (typeof player.getPlaylistItem === 'function') {
            sniffJWItem(player.getPlaylistItem());
          }
        } catch (_) {}
        return res;
      };
    }

    if (typeof player.on === 'function') {
      const handleEvent = function (e) {
        sniffJWItem(e && e.item);
        try {
          if (typeof player.getPlaylistItem === 'function') {
            sniffJWItem(player.getPlaylistItem());
          }
        } catch (_) {}
      };

      player.on('playlistItem', handleEvent);
      player.on('play', handleEvent);
      player.on('firstFrame', handleEvent);
      player.on('beforePlay', handleEvent);
    }

    return player;
  }

  function hookJWPlayerGlobal(jwFn) {
    if (typeof jwFn !== 'function') return jwFn;
    if (jwFn.__xg_proxy__) return jwFn;
    try {
      return new Proxy(jwFn, {
        apply(target, thisArg, args) {
          const player = Reflect.apply(target, thisArg, args);
          return wrapJWPlayerInstance(player);
        },
        get(target, prop, receiver) {
          if (prop === '__xg_proxy__') return true;
          return Reflect.get(target, prop, receiver);
        },
        set(target, prop, val, receiver) {
          return Reflect.set(target, prop, val, target);
        }
      });
    } catch (_) {
      return jwFn;
    }
  }

  let _jwplayer = window.jwplayer;
  try {
    Object.defineProperty(window, 'jwplayer', {
      configurable: true,
      enumerable: true,
      get: function () { return _jwplayer; },
      set: function (val) {
        _jwplayer = hookJWPlayerGlobal(val);
      }
    });
    if (_jwplayer) _jwplayer = hookJWPlayerGlobal(_jwplayer);
  } catch (e) {}

  // Fail-safe: When any video element plays on the page, check for JWPlayer playlist items
  try {
    document.addEventListener('play', (e) => {
      try {
        if (typeof window.jwplayer === 'function') {
          const jw = window.jwplayer();
          if (jw && typeof jw.getPlaylistItem === 'function') {
            const item = jw.getPlaylistItem();
            if (item) {
              const sources = Array.isArray(item.sources) ? item.sources : (item.file ? [item] : []);
              sources.forEach(s => {
                if (s && s.file && typeof s.file === 'string' && !s.file.startsWith('blob:')) {
                  const fullUrl = s.file.startsWith('/') ? location.origin + s.file : s.file;
                  console.log('[XtremeGrbr] JWPlayer stream detected on native play event:', fullUrl);
                  broadcastStreamData({
                    url: fullUrl,
                    type: (s.type === 'hls' || fullUrl.includes('.m3u8')) ? 'HLS' : 'MP4',
                    quality: s.label || detectQualityFromUrl(fullUrl),
                    title: item.title || document.title,
                    poster: item.image || null
                  });
                }
              });
            }
          }
        }
      } catch (_) {}
    }, true);
  } catch (_) {}

  // 1B-2. FluidPlayer Interceptor (Passive Sniffer Only)
  function hookFluidPlayerGlobal(origFP) {
    if (typeof origFP !== 'function' || origFP.__xg_hooked__) return origFP;
    const wrappedFP = function (target, config) {
      const instance = origFP.apply(this, arguments);

      // Sniff media sources from target video element or instance
      try {
        const v = typeof target === 'string' ? document.getElementById(target) : target;
        if (v && v.querySelectorAll) {
          const sources = v.querySelectorAll('source');
          sources.forEach(srcItem => {
            if (srcItem.src) {
              const fullUrl = srcItem.src.startsWith('/') ? location.origin + srcItem.src : srcItem.src;
              broadcastStreamData({
                url: fullUrl,
                type: fullUrl.includes('.m3u8') ? 'HLS' : 'MP4',
                quality: srcItem.title || (srcItem.getAttribute && srcItem.getAttribute('data-fluid-hd') ? 'HD' : detectQualityFromUrl(fullUrl)),
                title: document.title
              });
            }
          });
          if (v.src) {
            const fullUrl = v.src.startsWith('/') ? location.origin + v.src : v.src;
            broadcastStreamData({
              url: fullUrl,
              type: fullUrl.includes('.m3u8') ? 'HLS' : 'MP4',
              quality: detectQualityFromUrl(fullUrl),
              title: document.title
            });
          }
        }
      } catch (_) {}

      return instance;
    };

    wrappedFP.__xg_hooked__ = true;
    for (const k in origFP) {
      try { wrappedFP[k] = origFP[k]; } catch (_) {}
    }
    return wrappedFP;
  }

  const _prevFluidDesc = Object.getOwnPropertyDescriptor(window, 'fluidPlayer');
  let _fluidPlayer = window.fluidPlayer;
  try {
    Object.defineProperty(window, 'fluidPlayer', {
      configurable: true,
      enumerable: true,
      get: function () { return _fluidPlayer; },
      set: function (val) {
        if (_prevFluidDesc && _prevFluidDesc.set) {
          try {
            _prevFluidDesc.set.call(this, val);
            if (_prevFluidDesc.get) val = _prevFluidDesc.get.call(this);
          } catch (e) {}
        }
        _fluidPlayer = hookFluidPlayerGlobal(val);
      }
    });
    if (_fluidPlayer) _fluidPlayer = hookFluidPlayerGlobal(_fluidPlayer);
  } catch (e) {}

  // 1C. KVS / Flashvars / kt_player Interceptor (Passive Read-Only Stream Sniffer)
  function sniffFlashvars(flashvars) {
    if (!flashvars || typeof flashvars !== 'object') return;
    const licenseCode = flashvars.license_code || '';
    const sniffUrl = (urlStr, quality) => {
      if (!urlStr || typeof urlStr !== 'string') return;
      let clean = urlStr;
      if (clean.startsWith('function/0/')) {
        clean = kvsGetRealUrl(clean, licenseCode);
      } else if (clean.startsWith('function/')) {
        return; // Wait for runtime deobfuscation
      }
      if (clean.startsWith('//')) clean = location.protocol + clean;
      else if (clean.startsWith('/')) clean = location.origin + clean;
      if (clean.startsWith('http') && !clean.match(/\.(html|htm|php|js|css)(\?.*)?$/i)) {
        broadcastStreamData({
          url: clean,
          type: clean.includes('.m3u8') ? 'HLS' : 'MP4',
          quality: quality || detectQualityFromUrl(clean),
          title: flashvars.video_title || document.title,
          poster: flashvars.preview_url || null
        });
      }
    };

    if (flashvars.video_url) sniffUrl(flashvars.video_url, flashvars.video_url_text || 'HQ');
    if (flashvars.video_alt_url) sniffUrl(flashvars.video_alt_url, flashvars.video_alt_url_text || '240p');
    for (let i = 1; i <= 7; i++) {
      if (flashvars['video_alt_url' + i]) {
        sniffUrl(flashvars['video_alt_url' + i], flashvars['video_alt_url' + i + '_text'] || 'SD');
      }
    }

    // Define reactive setter on flashvars.video_url for asynchronous KVS deobfuscator
    let currentVideoUrl = flashvars.video_url;
    try {
      Object.defineProperty(flashvars, 'video_url', {
        configurable: true,
        enumerable: true,
        get: function () { return currentVideoUrl; },
        set: function (newVal) {
          currentVideoUrl = newVal;
          if (newVal && typeof newVal === 'string') {
            sniffUrl(newVal, flashvars.video_url_text || 'HQ');
          }
        }
      });
    } catch (e) {}

    // Fallback polling for asynchronous KVS deobfuscator
    [50, 100, 200, 400, 800, 1500, 3000].forEach(delay => {
      setTimeout(() => {
        if (flashvars.video_url) sniffUrl(flashvars.video_url, flashvars.video_url_text || 'HQ');
        if (flashvars.video_alt_url) sniffUrl(flashvars.video_alt_url, flashvars.video_alt_url_text || '240p');
      }, delay);
    });
  }

  // Hook global window.flashvars directly (chaining any existing setter)
  const _prevFlashvarsDesc = Object.getOwnPropertyDescriptor(window, 'flashvars');
  let _flashvars = window.flashvars;
  try {
    Object.defineProperty(window, 'flashvars', {
      configurable: true,
      enumerable: true,
      get: function () {
        return (_prevFlashvarsDesc && _prevFlashvarsDesc.get) ? _prevFlashvarsDesc.get.call(this) : _flashvars;
      },
      set: function (fv) {
        if (_prevFlashvarsDesc && _prevFlashvarsDesc.set) {
          try { _prevFlashvarsDesc.set.call(this, fv); } catch (e) {}
        }
        _flashvars = fv;
        sniffFlashvars(fv);
      }
    });
    if (_flashvars && typeof _flashvars === 'object') {
      sniffFlashvars(_flashvars);
    }
  } catch (e) {}

  function hookKtPlayerGlobal(fn) {
    if (typeof fn !== 'function' || fn.__xg_kt_hooked__) return fn;
    const wrapped = function (id, swf, w, h, flashvars) {
      if (flashvars && typeof flashvars === 'object') {
        sniffFlashvars(flashvars);
      }
      return fn.apply(this, arguments);
    };
    wrapped.__xg_kt_hooked__ = true;
    try {
      for (const k of Object.getOwnPropertyNames(fn)) {
        if (k !== 'length' && k !== 'name' && k !== 'prototype') {
          wrapped[k] = fn[k];
        }
      }
    } catch (e) {}
    for (const k in fn) {
      try { wrapped[k] = fn[k]; } catch (e) {}
    }
    return wrapped;
  }

  const _prevKtDesc = Object.getOwnPropertyDescriptor(window, 'kt_player');
  let _kt_player = window.kt_player;
  try {
    Object.defineProperty(window, 'kt_player', {
      configurable: true,
      enumerable: true,
      get: function () {
        return _kt_player;
      },
      set: function (val) {
        if (_prevKtDesc && _prevKtDesc.set) {
          try {
            _prevKtDesc.set.call(this, val);
            if (_prevKtDesc.get) val = _prevKtDesc.get.call(this);
          } catch (e) {}
        }
        _kt_player = hookKtPlayerGlobal(val);
      }
    });
    if (_kt_player) _kt_player = hookKtPlayerGlobal(_kt_player);
  } catch (e) {}

  // 1D. Flowplayer Interceptor
  function hookFlowplayerGlobal(fn) {
    if (typeof fn !== 'function' || fn.__xg_fp_hooked__) return fn;
    const wrapped = function (target, config) {
      if (config && typeof config === 'object') {
        if (config.clip && Array.isArray(config.clip.sources)) {
          config.clip.sources.forEach(s => {
            if (s && s.src && typeof s.src === 'string' && s.src.startsWith('http')) {
              broadcastStreamData({
                url: s.src,
                type: (s.type && s.type.includes('mpegurl')) || s.src.includes('.m3u8') ? 'HLS' : 'MP4',
                quality: detectQualityFromUrl(s.src),
                title: document.title
              });
            }
          });
        }
      }
      const player = fn.apply(this, arguments);
      if (player && typeof player.load === 'function' && !player.__xg_load_hooked__) {
        player.__xg_load_hooked__ = true;
        const origLoad = player.load;
        const wrappedLoad = function (source) {
          try {
            if (source && typeof source === 'object') {
              const srcList = Array.isArray(source.sources) ? source.sources : (source.src ? [source] : []);
              srcList.forEach(s => {
                if (s && s.src && typeof s.src === 'string' && s.src.startsWith('http')) {
                  broadcastStreamData({
                    url: s.src,
                    type: (s.type && s.type.includes('mpegurl')) || s.src.includes('.m3u8') ? 'HLS' : 'MP4',
                    quality: detectQualityFromUrl(s.src),
                    title: document.title
                  });
                }
              });
            } else if (typeof source === 'string' && source.startsWith('http')) {
              broadcastStreamData({
                url: source,
                type: source.includes('.m3u8') ? 'HLS' : 'MP4',
                quality: detectQualityFromUrl(source),
                title: document.title
              });
            }
          } catch (e) {}
          const res = origLoad.apply(this, arguments);
          wrappedLoad.ed = origLoad.ed !== undefined ? origLoad.ed : 1;
          return res;
        };
        try {
          for (const k of Object.getOwnPropertyNames(origLoad)) {
            if (k !== 'length' && k !== 'name' && k !== 'prototype') {
              wrappedLoad[k] = origLoad[k];
            }
          }
        } catch (e) {}
        for (const k in origLoad) {
          try { wrappedLoad[k] = origLoad[k]; } catch (e) {}
        }
        // Preserve Flowplayer Unlimited license verification flag (.ed = 1) so T.load.ed || T.pause() never pauses playback
        wrappedLoad.ed = origLoad.ed !== undefined ? origLoad.ed : 1;
        player.load = wrappedLoad;
      }
      return player;
    };
    wrapped.__xg_fp_hooked__ = true;
    try {
      for (const k of Object.getOwnPropertyNames(fn)) {
        if (k !== 'length' && k !== 'name' && k !== 'prototype') {
          wrapped[k] = fn[k];
        }
      }
    } catch (e) {}
    for (const k in fn) {
      try { wrapped[k] = fn[k]; } catch (e) {}
    }
    return wrapped;
  }

  const _prevFpDesc = Object.getOwnPropertyDescriptor(window, 'flowplayer');
  let _flowplayer = window.flowplayer;
  try {
    Object.defineProperty(window, 'flowplayer', {
      configurable: true,
      enumerable: true,
      get: function () { return _flowplayer; },
      set: function (val) {
        if (_prevFpDesc && _prevFpDesc.set) {
          try {
            _prevFpDesc.set.call(this, val);
            if (_prevFpDesc.get) val = _prevFpDesc.get.call(this);
          } catch (e) {}
        }
        _flowplayer = hookFlowplayerGlobal(val);
      }
    });
    if (_flowplayer) _flowplayer = hookFlowplayerGlobal(_flowplayer);
  } catch (e) {}
})();
