/**
 * PureShield - Main World Injected Scriptlet
 * Provides aggressive popup interception, anti-redirect & tab-under defense,
 * telemetry beacon defusing, canvas & audio fingerprint spoofing, and anti-adblock defusing.
 */
(() => {
  'use strict';

  if (window.__pureshield_injected__) return;
  window.__pureshield_injected__ = true;

  const hostname = window.location.hostname;
  if (['mail.google.com', 'accounts.google.com', 'docs.google.com', 'drive.google.com'].some(d => hostname === d || hostname.endsWith('.' + d))) {
    return; // Never inject into critical Google Workspace apps
  }

  // Active configuration received from content script
  const config = {
    blockPopups: true,
    blockTrackers: true,
    blockRedirects: true,
    blockFingerprinting: true,
    defuseAntiAdblock: true,
    stripParams: true,
    whitelisted: false
  };

  // Known tracker and malicious redirect signatures
  const TRACKER_KEYWORDS = [
    'google-analytics.com',
    'googletagmanager.com/gtm.js',
    'doubleclick.net',
    'connect.facebook.net',
    'facebook.com/tr',
    'analytics.tiktok.com',
    'criteo.com',
    'criteo.net',
    'hotjar.com',
    'clarity.ms',
    'taboola.com',
    'outbrain.com',
    'scorecardresearch.com',
    'mixpanel.com',
    'segment.io',
    'amplitude.com',
    'quantserve.com',
    'yandex.ru/metrika',
    'mc.yandex.ru',
    'ads-twitter.com',
    'tr.snapchat.com',
    'matomo.org',
    'nr-data.net',
    'crazyegg.com',
    'ct.pinterest.com',
    'popads.net',
    'popcash.net',
    'propellerads.com',
    'onclickads.net',
    'adcash.com',
    'exoclick.com',
    'adsterra.com',
    'admaven.com',
    'zeroredirect.com',
    'popunder.net',
    'monetag.com',
    'richpush.co',
    'tarklot.com',
    'goodstatorone.com',
    'auhubsm.com',
    'kadam.net',
    'kadam.ru',
    'kadampn.com',
    'clickadu.com',
    'hilltopads.com',
    'trafficstars.com',
    'whitetraf.com',
    'whitetrafsa.com',
    'magsrv.com',
    'tsyndicate.com'
  ];

  const SUSPICIOUS_QUERY_PATTERNS = [
    'rotator=',
    'click.php',
    '/news/prl/',
    'ext_click_id=',
    'subsource=',
    'prelanding=',
    'landing=',
    'subid_',
    'track='
  ];

  function isTrackerOrRedirectUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const lower = url.toLowerCase();
    return TRACKER_KEYWORDS.some(k => lower.includes(k)) || SUSPICIOUS_QUERY_PATTERNS.some(p => lower.includes(p));
  }

  function isSameDomainOrSubdomain(targetUrl) {
    try {
      if (!targetUrl || targetUrl === 'about:blank' || targetUrl.startsWith('/') || targetUrl.startsWith('#') || targetUrl.startsWith('javascript:')) return true;
      const u = new URL(targetUrl, window.location.href);
      const currentHost = window.location.hostname;
      return u.hostname === currentHost || u.hostname.endsWith('.' + currentHost) || currentHost.endsWith('.' + u.hostname);
    } catch (_) {
      return false;
    }
  }

  const ALLOWED_POPUP_HOSTS = [
    'accounts.google.com',
    'facebook.com',
    'appleid.apple.com',
    'github.com',
    'twitter.com',
    'x.com',
    'paypal.com',
    'stripe.com'
  ];

  function isAllowedPopupDomain(targetUrl) {
    try {
      if (!targetUrl) return false;
      const u = new URL(targetUrl, window.location.href);
      return ALLOWED_POPUP_HOSTS.some(h => u.hostname === h || u.hostname.endsWith('.' + h));
    } catch (_) {
      return false;
    }
  }

  function createDummyWindow(urlStr) {
    return {
      closed: true,
      focus: () => {},
      blur: () => {},
      close: () => {},
      postMessage: () => {},
      location: {
        href: urlStr || 'about:blank',
        replace: () => {},
        assign: () => {}
      },
      document: {
        write: () => {},
        writeln: () => {},
        open: () => {},
        close: () => {}
      }
    };
  }

  // Listen for config sync from content.js
  window.addEventListener('pureshield-config-sync', (e) => {
    if (e.detail) {
      Object.assign(config, e.detail);
    }
  });

  // Helper to notify content script
  function notifyBlocked(type, detail) {
    window.dispatchEvent(new CustomEvent('pureshield-event', {
      detail: { type, ...detail, timestamp: Date.now() }
    }));
  }

  /* ==========================================================================
     1. USER INTERACTION TRACKER
     ========================================================================== */
  let lastUserInteractionTime = 0;

  ['pointerdown', 'keydown', 'touchstart'].forEach(eventType => {
    window.addEventListener(eventType, (e) => {
      if (e.isTrusted) {
        lastUserInteractionTime = Date.now();
      }
    }, { capture: true, passive: true });
  });

  function isRecentUserAction() {
    return (Date.now() - lastUserInteractionTime) < 800;
  }

  /* ==========================================================================
     2. AGGRESSIVE POPUP & POPUNDER DEFUSER
     ========================================================================== */
  const originalOpen = window.open;

  try {
    window.open = function (url, target, features) {
      if (config.whitelisted || !config.blockPopups) {
        return originalOpen.apply(this, arguments);
      }

      const urlStr = String(url || '').trim();
      const hasRecentAction = isRecentUserAction();

      // 1. Direct Tracker / Ad-network / Redirect pattern detection
      if (isTrackerOrRedirectUrl(urlStr)) {
        console.warn('[ExtremeShield] Blocked ad/redirect window.open:', urlStr);
        notifyBlocked('popup', { url: urlStr, target: String(target || '_blank') });
        return createDummyWindow(urlStr);
      }

      // 2. Unsolicited / Timer / Video-ended popups without recent user interaction: Strictly block
      if (!hasRecentAction) {
        console.warn('[ExtremeShield] Blocked background/unsolicited window.open:', urlStr || 'about:blank');
        notifyBlocked('popup', { url: urlStr || 'about:blank', target: String(target || '_blank') });
        return createDummyWindow(urlStr);
      }

      // 3. Tab-Under Protection: Block window.open cloning the exact current page
      // Tube ad scripts clone the current URL into a new tab, then redirect the original tab to an ad.
      const isCurrentPageUrl = Boolean(
        urlStr && (
          urlStr === window.location.href ||
          urlStr === window.location.pathname ||
          urlStr === (window.location.origin + window.location.pathname) ||
          urlStr === (window.location.origin + window.location.pathname + window.location.search)
        )
      );
      if (isCurrentPageUrl) {
        console.warn('[ExtremeShield] Blocked tab-under clone window.open:', urlStr);
        notifyBlocked('popup', { url: urlStr, target: String(target || '_blank') });
        return createDummyWindow(urlStr);
      }

      // 4. Popups triggered during clicks: Block if cross-domain unless OAuth whitelist
      const isSameHost = isSameDomainOrSubdomain(urlStr);
      const isOAuth = isAllowedPopupDomain(urlStr);

      if (!isSameHost && !isOAuth && (urlStr.startsWith('http') || urlStr.startsWith('//'))) {
        console.warn('[ExtremeShield] Blocked cross-domain popup on click:', urlStr);
        notifyBlocked('popup', { url: urlStr, target: String(target || '_blank') });
        return createDummyWindow(urlStr);
      }

      // 5. Blank window handler: prevent delayed ad redirect on opened window
      const openedWin = originalOpen.apply(this, arguments);
      if (openedWin && (!urlStr || urlStr === 'about:blank')) {
        try {
          const timer = setInterval(() => {
            try {
              if (openedWin.closed) {
                clearInterval(timer);
                return;
              }
              const childUrl = openedWin.location.href;
              if (isTrackerOrRedirectUrl(childUrl)) {
                console.warn('[ExtremeShield] Closed child window navigated to ad:', childUrl);
                openedWin.close();
                clearInterval(timer);
              }
            } catch (_) {
              clearInterval(timer);
            }
          }, 50);
          setTimeout(() => clearInterval(timer), 3000);
        } catch (_) {}
      }

      return openedWin;
    };
  } catch (err) {
    console.error('[ExtremeShield] Error wrapping window.open:', err);
  }

  // Intercept synthetic click exploits on dynamically generated links
  try {
    const originalClick = HTMLElement.prototype.click;
    HTMLElement.prototype.click = function () {
      if (this.tagName === 'A' && config.blockPopups && !config.whitelisted) {
        const target = this.getAttribute('target');
        const href = this.getAttribute('href') || '';
        const isCrossDomain = !isSameDomainOrSubdomain(href);
        const isOAuth = isAllowedPopupDomain(href);

        if (!isRecentUserAction() || isTrackerOrRedirectUrl(href) || (isCrossDomain && !isOAuth)) {
          console.warn('[ExtremeShield] Intercepted synthetic/unsolicited anchor click exploit:', href);
          notifyBlocked('popup', { url: href, target: target || '_self' });
          return;
        }
      }
      return originalClick.apply(this, arguments);
    };
  } catch (err) {
    console.error('[ExtremeShield] Error wrapping HTMLElement.click:', err);
  }

  // Intercept synthetic dispatchEvent click exploits
  try {
    const originalDispatch = EventTarget.prototype.dispatchEvent;
    EventTarget.prototype.dispatchEvent = function (event) {
      if (config.blockPopups && !config.whitelisted && event && event.type === 'click' && this instanceof HTMLElement) {
        if (this.tagName === 'A') {
          const href = this.getAttribute('href') || '';
          if (isTrackerOrRedirectUrl(href) || (!isSameDomainOrSubdomain(href) && !isAllowedPopupDomain(href) && !isRecentUserAction())) {
            console.warn('[ExtremeShield] Intercepted dispatchEvent click exploit:', href);
            notifyBlocked('popup', { url: href });
            return false;
          }
        }
      }
      return originalDispatch.apply(this, arguments);
    };
  } catch (_) {}

  // Intercept hidden form submit exploits
  try {
    const originalSubmit = HTMLFormElement.prototype.submit;
    HTMLFormElement.prototype.submit = function () {
      if (config.blockPopups && !config.whitelisted) {
        const action = this.getAttribute('action') || '';
        if (isTrackerOrRedirectUrl(action) || (!isSameDomainOrSubdomain(action) && !isAllowedPopupDomain(action) && !isRecentUserAction())) {
          console.warn('[ExtremeShield] Intercepted unrequested form.submit popunder:', action);
          notifyBlocked('popup', { url: action });
          return;
        }
      }
      return originalSubmit.apply(this, arguments);
    };
  } catch (_) {}

  // Neutralize popunder focus/blur manipulation
  try {
    const originalBlur = window.blur;
    const originalFocus = window.focus;
    window.blur = function () {
      if (!isRecentUserAction() && config.blockPopups && !config.whitelisted) {
        return;
      }
      return originalBlur.apply(this, arguments);
    };
    window.focus = function () {
      return originalFocus.apply(this, arguments);
    };
  } catch (_) {}

  /* ==========================================================================
     3. ANTI-REDIRECT & TAB-UNDER HIJACK SHIELD
     ========================================================================== */
  try {
    // Intercept Location.prototype.href setter (Blocks window.location = 'ad_url' & location.href = 'ad_url')
    const hrefDesc = Object.getOwnPropertyDescriptor(Location.prototype, 'href');
    if (hrefDesc && hrefDesc.set) {
      const origHrefSet = hrefDesc.set;
      Object.defineProperty(Location.prototype, 'href', {
        set: function (url) {
          const urlStr = String(url || '').trim();
          if (!config.whitelisted && config.blockRedirects) {
            if (isTrackerOrRedirectUrl(urlStr) || (!isSameDomainOrSubdomain(urlStr) && !isAllowedPopupDomain(urlStr) && !isRecentUserAction())) {
              console.warn('[ExtremeShield] Intercepted suspicious location.href redirect:', urlStr);
              notifyBlocked('popup', { url: urlStr, detail: 'Tab-under/redirect hijack blocked' });
              return;
            }
          }
          return origHrefSet.call(this, url);
        },
        get: hrefDesc.get,
        configurable: true
      });
    }

    // Intercept location.replace
    const origLocationReplace = Location.prototype.replace;
    Location.prototype.replace = function (url) {
      if (!config.whitelisted && config.blockRedirects) {
        const urlStr = String(url || '').trim();
        if (isTrackerOrRedirectUrl(urlStr) || (!isSameDomainOrSubdomain(urlStr) && !isAllowedPopupDomain(urlStr) && !isRecentUserAction())) {
          console.warn('[ExtremeShield] Intercepted suspicious location.replace redirect:', urlStr);
          notifyBlocked('popup', { url: urlStr, detail: 'Auto-redirect hijack blocked' });
          return;
        }
      }
      return origLocationReplace.apply(this, arguments);
    };

    // Intercept location.assign
    const origLocationAssign = Location.prototype.assign;
    Location.prototype.assign = function (url) {
      if (!config.whitelisted && config.blockRedirects) {
        const urlStr = String(url || '').trim();
        if (isTrackerOrRedirectUrl(urlStr) || (!isSameDomainOrSubdomain(urlStr) && !isAllowedPopupDomain(urlStr) && !isRecentUserAction())) {
          console.warn('[ExtremeShield] Intercepted suspicious location.assign redirect:', urlStr);
          notifyBlocked('popup', { url: urlStr, detail: 'Auto-redirect hijack blocked' });
          return;
        }
      }
      return origLocationAssign.apply(this, arguments);
    };
  } catch (_) {}

  // Defuse infinite alert/confirm/prompt spam
  let lastPromptTime = 0;
  let promptSpamCount = 0;
  const originalAlert = window.alert;
  const originalConfirm = window.confirm;
  const originalPrompt = window.prompt;

  function checkPromptSpam() {
    const now = Date.now();
    if (now - lastPromptTime < 500) {
      promptSpamCount++;
      if (promptSpamCount > 3) {
        console.warn('[PureShield] Suppressed modal prompt flood');
        notifyBlocked('annoyance', { detail: 'Suppressed dialogue loop spam' });
        return false;
      }
    } else {
      promptSpamCount = 0;
    }
    lastPromptTime = now;
    return true;
  }

  window.alert = function () {
    if (checkPromptSpam()) originalAlert.apply(this, arguments);
  };
  window.confirm = function () {
    return checkPromptSpam() ? originalConfirm.apply(this, arguments) : false;
  };
  window.prompt = function () {
    return checkPromptSpam() ? originalPrompt.apply(this, arguments) : null;
  };

  /* ==========================================================================
     3B. KVS & TUBE PLAYER PRE-ROLL VAST DEFUSER
     ========================================================================== */
  try {
    function sanitizeFlashvars(vars) {
      if (!vars || typeof vars !== 'object') return vars;
      for (const k of Object.keys(vars)) {
        if (
          k.startsWith('adv_') ||
          k.startsWith('vast_') ||
          k.includes('preroll') ||
          k.includes('postroll') ||
          k.includes('popunder')
        ) {
          try {
            delete vars[k];
          } catch (_) {
            vars[k] = '';
          }
        }
      }
      return vars;
    }

    let _ktPlayer = window.kt_player;
    Object.defineProperty(window, 'kt_player', {
      get: () => function (container, swf, width, height, flashvars) {
        sanitizeFlashvars(flashvars);
        const player = _ktPlayer ? _ktPlayer.apply(this, arguments) : null;
        if (player && typeof player.skip_preroll === 'function') {
          setTimeout(() => {
            try { player.skip_preroll(); } catch (_) {}
          }, 20);
        }
        return player;
      },
      set: (fn) => { _ktPlayer = fn; },
      configurable: true
    });

    let _flashvars = window.flashvars;
    if (_flashvars) sanitizeFlashvars(_flashvars);
    Object.defineProperty(window, 'flashvars', {
      get: () => _flashvars,
      set: (val) => {
        _flashvars = sanitizeFlashvars(val);
      },
      configurable: true
    });

    // Continually auto-skip any active KVS preroll / postroll if player was already initialized
    setInterval(() => {
      try {
        if (window.kvsplayer && typeof window.kvsplayer === 'object') {
          for (const id in window.kvsplayer) {
            const p = window.kvsplayer[id];
            if (p) {
              if (typeof p.skip_preroll === 'function') p.skip_preroll();
              if (typeof p.skip_postroll === 'function') p.skip_postroll();
            }
          }
        }
      } catch (_) {}
    }, 300);
  } catch (_) {}

  /* ==========================================================================
     3C. TUBE & SPACES CLICKUNDER DEFUSER (Neutralizes ama1k3r & ads/clickunder)
     ========================================================================== */
  try {
    function sanitizeTubeModules(arr) {
      if (!arr || !Array.isArray(arr) || arr.__pureshield_hooked__) return;
      arr.__pureshield_hooked__ = true;
      const origPush = arr.push;
      arr.push = function (...items) {
        for (const item of items) {
          if (Array.isArray(item) && typeof item[0] === 'string') {
            const name = item[0].toLowerCase();
            if (name.includes('clickunder') || name.includes('popunder') || name.includes('ama1k3r') || name.includes('ad-provider')) {
              console.warn('[ExtremeShield] Neutralized tube clickunder registration:', item[0]);
              if (typeof item[1] === 'function') {
                const origCb = item[1];
                item[1] = function (m) {
                  if (m && typeof m === 'object') {
                    m.initOnPlay = () => {};
                    m.init = () => {};
                  }
                  try { origCb.apply(this, arguments); } catch (_) {}
                  if (m && typeof m === 'object') {
                    m.initOnPlay = () => {};
                    m.init = () => {};
                  }
                };
              }
              if (typeof item[2] === 'function') {
                const origFactory = item[2];
                item[2] = function (deps, exports) {
                  if (exports && typeof exports === 'object') {
                    exports.initOnPlay = () => {};
                    exports.init = () => {};
                  }
                  try { origFactory.apply(this, arguments); } catch (_) {}
                  if (exports && typeof exports === 'object') {
                    exports.initOnPlay = () => {};
                    exports.init = () => {};
                  }
                };
              }
            }
          }
        }
        return origPush.apply(this, items);
      };
    }

    if (window.__require) sanitizeTubeModules(window.__require);
    if (window.__define) sanitizeTubeModules(window.__define);

    let _requireArr = window.__require;
    Object.defineProperty(window, '__require', {
      get: () => _requireArr,
      set: (v) => {
        _requireArr = v;
        sanitizeTubeModules(_requireArr);
      },
      configurable: true
    });

    let _defineArr = window.__define;
    Object.defineProperty(window, '__define', {
      get: () => _defineArr,
      set: (v) => {
        _defineArr = v;
        sanitizeTubeModules(_defineArr);
      },
      configurable: true
    });

    // Neutralize Spaces.api clickunder endpoints if Spaces framework is used
    function wrapSpaces(sp) {
      if (!sp || typeof sp !== 'object' || sp.__pureshield_wrapped__) return sp;
      sp.__pureshield_wrapped__ = true;
      const origApi = sp.api;
      if (typeof origApi === 'function') {
        sp.api = function (endpoint, params, callback, options) {
          if (typeof endpoint === 'string' && (endpoint.includes('ama1k3r') || endpoint.includes('Cl1ckCU') || endpoint.includes('Need2Go'))) {
            console.warn('[ExtremeShield] Blocked Spaces clickunder API call:', endpoint);
            if (typeof callback === 'function') callback({ code: -1, error: 'blocked' });
            return;
          }
          return origApi.apply(this, arguments);
        };
      }
      return sp;
    }

    if (window.Spaces) wrapSpaces(window.Spaces);
    let _spacesObj = window.Spaces;
    Object.defineProperty(window, 'Spaces', {
      get: () => _spacesObj,
      set: (v) => {
        _spacesObj = wrapSpaces(v);
      },
      configurable: true
    });
  } catch (_) {}

  /* ==========================================================================
     4. TELEMETRY & BEACON DEFUSER
     ========================================================================== */
  if (navigator.sendBeacon) {
    const origSendBeacon = navigator.sendBeacon;
    navigator.sendBeacon = function (url, data) {
      if (!config.whitelisted && config.blockTrackers && isTrackerOrRedirectUrl(String(url))) {
        notifyBlocked('tracker', { url: String(url) });
        return true;
      }
      return origSendBeacon.apply(this, arguments);
    };
  }

  /* ==========================================================================
     5. CANVAS & AUDIO FINGERPRINTING SPOOFING
     ========================================================================== */
  if (config.blockFingerprinting) {
    const sessionSalt = Math.floor(Math.random() * 255) + 1;

    try {
      const origGetImageData = CanvasRenderingContext2D.prototype.getImageData;
      CanvasRenderingContext2D.prototype.getImageData = function (x, y, w, h) {
        const imgData = origGetImageData.apply(this, arguments);
        if (config.whitelisted || !config.blockFingerprinting) return imgData;

        if (imgData.data.length >= 4) {
          const index = (sessionSalt % (imgData.data.length / 4)) * 4;
          imgData.data[index] = (imgData.data[index] ^ 1);
        }
        return imgData;
      };

      const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function () {
        if (config.whitelisted || !config.blockFingerprinting) {
          return origToDataURL.apply(this, arguments);
        }
        try {
          const ctx = this.getContext('2d');
          if (ctx && this.width > 0 && this.height > 0) {
            const px = ctx.getImageData(0, 0, 1, 1);
            px.data[0] = (px.data[0] ^ 1);
            ctx.putImageData(px, 0, 0);
          }
        } catch (_) {}
        return origToDataURL.apply(this, arguments);
      };
    } catch (_) {}

    try {
      if (window.AudioBuffer) {
        const origGetChannelData = AudioBuffer.prototype.getChannelData;
        AudioBuffer.prototype.getChannelData = function () {
          const buffer = origGetChannelData.apply(this, arguments);
          if (config.whitelisted || !config.blockFingerprinting) return buffer;
          
          if (buffer && buffer.length > 0) {
            const idx = sessionSalt % buffer.length;
            buffer[idx] += 0.0000001 * (sessionSalt % 2 === 0 ? 1 : -1);
          }
          return buffer;
        };
      }

      if (window.AnalyserNode) {
        const origGetFloatFreq = AnalyserNode.prototype.getFloatFrequencyData;
        AnalyserNode.prototype.getFloatFrequencyData = function (arr) {
          origGetFloatFreq.apply(this, arguments);
          if (!config.whitelisted && config.blockFingerprinting && arr && arr.length > 0) {
            arr[0] += 0.00001;
          }
        };
      }
    } catch (_) {}

    try {
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => 8,
        configurable: true
      });
      if ('deviceMemory' in navigator) {
        Object.defineProperty(navigator, 'deviceMemory', {
          get: () => 8,
          configurable: true
        });
      }
    } catch (_) {}

    try {
      if (navigator.getBattery) {
        navigator.getBattery = () => Promise.resolve({
          charging: true,
          chargingTime: 0,
          dischargingTime: Infinity,
          level: 1.0,
          addEventListener: () => {},
          removeEventListener: () => {}
        });
      }
    } catch (_) {}
  }

  /* ==========================================================================
     6. ANTI-ADBLOCK DEFUSERS & NO-OP STUBS
     ========================================================================== */
  if (config.defuseAntiAdblock) {
    try {
      window.canRunAds = true;
      window.isAdBlockActive = false;
      window.adblock = false;
    } catch (_) {}
  }

  console.log('[ExtremeShield] Protection engine active.');
})();
