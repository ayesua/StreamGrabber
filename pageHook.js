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

  // Prevent multiple executions per frame
  if (window.__STREAMGRABBER_PAGE_HOOK__) return;
  window.__STREAMGRABBER_PAGE_HOOK__ = true;

  function broadcastStreamData(data) {
    try {
      if (!data || !data.url) return;
      document.dispatchEvent(new CustomEvent('__STREAMGRABBER_MEDIA_EVENT__', {
        detail: JSON.stringify(data)
      }));
    } catch (e) {}
  }

  // 1. XVideos & XNXX HTML5Player Ad-Disabling & Stream Sniffer Hook
  function hookXvideosPlayer(player) {
    if (!player) return;
    try {
      // Disable internal video ad engine safely using the player's native flags
      player.disableVideoAds = true;
      player.has_adblocker = true;

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

      // Sniff and broadcast stream data when setVideoHLS / setVideoUrlHigh is called
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
