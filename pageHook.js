/**
 * StreamGrabber - Main World Page Hook
 * Runs at document_start in the MAIN execution context to disable pre-roll announcements,
 * skip video ads cleanly without Error 224003, and broadcast authentic video stream URLs.
 */

(function () {
  // Chrome Web Store Compliance: Strictly bypass YouTube
  const host = (location.hostname || '').toLowerCase();
  if (host.includes('youtube.com') || host.includes('youtu.be')) {
    return;
  }

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

  const EMPTY_VAST_XML = '<?xml version="1.0" encoding="UTF-8"?><VAST version="4.0"/>';
  function isVastAdUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const lower = url.toLowerCase();
    if (lower.includes('.mp4') || lower.includes('.m3u8') || lower.includes('.mpd') ||
        lower.includes('.ts') || lower.includes('.webm') || lower.includes('.key')) return false;
    return (
      lower.includes('/vast') || lower.includes('vast.xml') || lower.includes('vast=') ||
      lower.includes('format=vast') || lower.includes('output=vast') || lower.includes('type=vast') ||
      lower.includes('/vpaid') || lower.includes('in_stream_ad') || lower.includes('jwpreroll') ||
      lower.includes('vstserv.com') || lower.includes('vstvstsa.com') || lower.includes('katds_ep') ||
      lower.includes('tsyndicate.com/do2/') || lower.includes('magsrv.com/splash') ||
      lower.includes('twinrdengine.com/adraw')
    );
  }

  function broadcastStreamData(data) {
    try {
      if (!data || !data.url) return;
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

  // Intercept window.fetch to sniff dynamic Yandex/VK/VoyeurHit stream API responses & defuse VAST ads
  try {
    const origFetch = window.fetch;
    if (origFetch) {
      window.fetch = function (input, init) {
        const url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
          if (url.includes('vast.yomeno.xyz')) {
            if (url.includes('/vast') || url.includes('.xml')) {
              return Promise.resolve(new Response(EMPTY_VAST_XML, {
                status: 200, headers: { 'Content-Type': 'application/xml; charset=utf-8' }
              }));
            }
            return Promise.resolve(new Response(JSON.stringify({ campaign: null }), {
              status: 200, headers: { 'Content-Type': 'application/json' }
            }));
          }
          if (isVastAdUrl(url)) {
            return Promise.resolve(new Response(EMPTY_VAST_XML, {
              status: 200, headers: { 'Content-Type': 'application/xml; charset=utf-8' }
            }));
          }

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

  // Intercept XMLHttpRequest to sniff video stream URLs & defuse VAST ad calls
  try {
    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;
    if (origOpen && origSend) {
      XMLHttpRequest.prototype.open = function (method, url) {
        this.__xg_url = typeof url === 'string' ? url : (url ? url.toString() : '');
        if (this.__xg_url && isVastAdUrl(this.__xg_url)) {
          this.__xg_is_vast = true;
        }

        if (this.__xg_url && !this.__xg_is_vast) {
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

      XMLHttpRequest.prototype.send = function (body) {
        if (this.__xg_is_vast) {
          try {
            Object.defineProperty(this, 'status', { writable: true, value: 200 });
            Object.defineProperty(this, 'readyState', { writable: true, value: 4 });
            Object.defineProperty(this, 'responseText', { writable: true, value: EMPTY_VAST_XML });
            Object.defineProperty(this, 'response', { writable: true, value: EMPTY_VAST_XML });
            setTimeout(() => {
              try {
                if (typeof this.onreadystatechange === 'function') this.onreadystatechange(new Event('readystatechange'));
                if (typeof this.onload === 'function') this.onload(new Event('load'));
              } catch (e) {}
            }, 10);
            return;
          } catch (e) {}
        }
        return origSend.apply(this, arguments);
      };
    }
  } catch (e) {}

  // 1. XVideos & XNXX HTML5Player Ad-Disabling & Stream Sniffer Hook
  function hookXvideosPlayer(player) {
    if (!player) return;
    try {
      // Disable internal video ad engine safely using the player's native flags
      player.disableVideoAds = true;
      player.has_adblocker = true;
      if (player.id_ad) player.id_ad = 0;
      if (player.ad_id) player.ad_id = 0;

      if (typeof player.enableVideoPreRollAds === 'function') {
        player.enableVideoPreRollAds = function () {};
      }
      if (typeof player.enableVideoPostRollAds === 'function') {
        player.enableVideoPostRollAds = function () {};
      }
      if (typeof player.loadVideoPreRollAds === 'function') {
        player.loadVideoPreRollAds = function () { return false; };
      }
      if (typeof player.loadVideoPostRollAds === 'function') {
        player.loadVideoPostRollAds = function () { return false; };
      }
      if (typeof player.setSponsors === 'function') {
        player.setSponsors(false);
      }

      if (player.videos) {
        if (player.videos.preroll) player.videos.preroll.bEnabled = false;
        if (player.videos.postroll) player.videos.postroll.bEnabled = false;
      }

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

  // Intercept window.html5player assignments
  let _html5player = window.html5player;
  try {
    Object.defineProperty(window, 'html5player', {
      configurable: true,
      enumerable: true,
      get: function () {
        return _html5player;
      },
      set: function (val) {
        _html5player = val;
        hookXvideosPlayer(_html5player);
      }
    });
    if (_html5player) hookXvideosPlayer(_html5player);
  } catch (e) {}

  // Intercept window.HTML5Player class prototype
  let _HTML5Player = window.HTML5Player;
  try {
    Object.defineProperty(window, 'HTML5Player', {
      configurable: true,
      enumerable: true,
      get: function () {
        return _HTML5Player;
      },
      set: function (val) {
        _HTML5Player = val;
        if (_HTML5Player && _HTML5Player.prototype) {
          try {
            _HTML5Player.prototype.enableVideoPreRollAds = function () {};
            _HTML5Player.prototype.enableVideoPostRollAds = function () {};
            _HTML5Player.prototype.loadVideoPreRollAds = function () { return false; };
            _HTML5Player.prototype.loadVideoPostRollAds = function () { return false; };
          } catch (pe) {}
        }
      }
    });
    if (_HTML5Player && _HTML5Player.prototype) {
      _HTML5Player.prototype.enableVideoPreRollAds = function () {};
      _HTML5Player.prototype.enableVideoPostRollAds = function () {};
      _HTML5Player.prototype.loadVideoPreRollAds = function () { return false; };
      _HTML5Player.prototype.loadVideoPostRollAds = function () { return false; };
    }
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

    const origSetup = player.setup;
    if (origSetup) {
      player.setup = function (config) {
        hookJWPlayerConfig(config);
        return origSetup.apply(this, arguments);
      };
    }

    if (typeof player.on === 'function') {
      player.on('playlistItem', function (e) {
        try {
          if (e && e.item && Array.isArray(e.item.sources)) {
            e.item.sources.forEach(s => {
              if (s && s.file) {
                const fullUrl = s.file.startsWith('/') ? location.origin + s.file : s.file;
                broadcastStreamData({
                  url: fullUrl,
                  type: (s.type === 'hls' || fullUrl.includes('.m3u8')) ? 'HLS' : 'MP4',
                  quality: s.label || detectQualityFromUrl(fullUrl),
                  title: e.item.title || document.title,
                  poster: e.item.image || null
                });
              }
            });
          }
        } catch (err) {}
      });
    }

    return player;
  }

  function hookJWPlayerGlobal(jwFn) {
    if (typeof jwFn !== 'function') return jwFn;
    const wrapped = function () {
      const player = jwFn.apply(this, arguments);
      return wrapJWPlayerInstance(player);
    };
    for (const k in jwFn) {
      try { wrapped[k] = jwFn[k]; } catch (e) {}
    }
    return wrapped;
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

  // 1C. KVS / Flashvars / kt_player Interceptor for thisvid.com & Tube Players (Sniffs HQ streams)
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

  // Hook global window.flashvars directly
  let _flashvars = window.flashvars;
  try {
    Object.defineProperty(window, 'flashvars', {
      configurable: true,
      enumerable: true,
      get: function () { return _flashvars; },
      set: function (fv) {
        _flashvars = fv;
        sniffFlashvars(fv);
      }
    });
    if (_flashvars && typeof _flashvars === 'object') {
      sniffFlashvars(_flashvars);
    }
  } catch (e) {}

  function hookKtPlayerGlobal(fn) {
    if (typeof fn !== 'function') return fn;
    const wrapped = function (id, swf, w, h, flashvars) {
      if (flashvars && typeof flashvars === 'object') {
        sniffFlashvars(flashvars);
      }
      return fn.apply(this, arguments);
    };
    for (const k in fn) {
      try { wrapped[k] = fn[k]; } catch (e) {}
    }
    return wrapped;
  }

  let _kt_player = window.kt_player;
  try {
    Object.defineProperty(window, 'kt_player', {
      configurable: true,
      enumerable: true,
      get: function () { return _kt_player; },
      set: function (val) {
        _kt_player = hookKtPlayerGlobal(val);
      }
    });
    if (_kt_player) _kt_player = hookKtPlayerGlobal(_kt_player);
  } catch (e) {}

  // 1D. Flowplayer Interceptor
  function hookFlowplayerGlobal(fn) {
    if (typeof fn !== 'function') return fn;
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
        player.load = function (source) {
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
          return origLoad.apply(this, arguments);
        };
      }
      return player;
    };
    for (const k in fn) {
      try { wrapped[k] = fn[k]; } catch (e) {}
    }
    return wrapped;
  }

  let _flowplayer = window.flowplayer;
  try {
    Object.defineProperty(window, 'flowplayer', {
      configurable: true,
      enumerable: true,
      get: function () { return _flowplayer; },
      set: function (val) {
        _flowplayer = hookFlowplayerGlobal(val);
      }
    });
    if (_flowplayer) _flowplayer = hookFlowplayerGlobal(_flowplayer);
  } catch (e) {}

  // 2. Generic In-Page Pre-Roll Video Ad Fast-Forward & Skip Button Clicker
  function skipGenericAdVideos() {
    try {
      // 2A. Click in-video skip buttons
      const skipSelectors = [
        '.video-ad-skip-btn',
        '.skip-button',
        '.ad-skip',
        '[id*="skip-ad"]',
        '.exo-skip-button',
        '[class*="skip-btn"]',
        '.ytp-ad-skip-button',
        '.videoAdUiSkipButton',
        '[aria-label*="skip" i]'
      ];
      for (const sel of skipSelectors) {
        const btns = document.querySelectorAll(sel);
        for (const btn of btns) {
          if (btn && btn.offsetParent !== null) {
            btn.click();
          }
        }
      }

      // 2B. Fast-forward short ad clips in ad containers
      const videos = document.querySelectorAll('video');
      for (const v of videos) {
        const closestAd = v.closest(
          '[class*="ad-"], [class*="ads-"], [id*="ad-"], [id*="ads-"], [class*="preroll"], [class*="sponsor"], [class*="banner"], [id*="vast"], [class*="exo_"]'
        );
        if (closestAd && !v.ended && v.duration && v.duration > 0 && v.duration < 60) {
          v.muted = true;
          v.currentTime = v.duration;
        }
      }
    } catch (e) {}
  }

  // Periodic check for dynamic players
  setInterval(skipGenericAdVideos, 500);
})();
