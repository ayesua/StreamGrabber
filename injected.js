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
    'richpush.co'
  ];

  function isTrackerOrRedirectUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const lower = url.toLowerCase();
    return TRACKER_KEYWORDS.some(k => lower.includes(k));
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
    return (Date.now() - lastUserInteractionTime) < 1200;
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

      const urlStr = String(url || '');
      const isSuspicious = !isRecentUserAction() || (target && target.toString().toLowerCase() === '_blank' && !isRecentUserAction());

      if (isSuspicious || (urlStr && (urlStr.startsWith('http') || urlStr.startsWith('//')) && !isRecentUserAction())) {
        console.warn('[PureShield] Intercepted unrequested popup/popunder:', urlStr || 'about:blank');
        notifyBlocked('popup', { url: urlStr, target: String(target || '_blank') });
        
        return {
          closed: true,
          focus: () => {},
          blur: () => {},
          close: () => {},
          postMessage: () => {},
          location: { href: urlStr }
        };
      }

      return originalOpen.apply(this, arguments);
    };
  } catch (err) {
    console.error('[PureShield] Error wrapping window.open:', err);
  }

  // Intercept synthetic click exploits on dynamically generated links
  try {
    const originalClick = HTMLElement.prototype.click;
    HTMLElement.prototype.click = function () {
      if (this.tagName === 'A' && config.blockPopups && !config.whitelisted) {
        const target = this.getAttribute('target');
        const href = this.getAttribute('href') || '';
        
        if (!isRecentUserAction() && (target === '_blank' || href.startsWith('http') || href.startsWith('//'))) {
          console.warn('[PureShield] Intercepted synthetic anchor click exploit:', href);
          notifyBlocked('popup', { url: href, target: target || '_self' });
          return;
        }
      }
      return originalClick.apply(this, arguments);
    };
  } catch (err) {
    console.error('[PureShield] Error wrapping HTMLElement.click:', err);
  }

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
    // Intercept location.replace
    const origLocationReplace = Location.prototype.replace;
    Location.prototype.replace = function (url) {
      if (!config.whitelisted && config.blockRedirects) {
        if (!isRecentUserAction() && isTrackerOrRedirectUrl(String(url))) {
          console.warn('[PureShield] Intercepted suspicious location.replace redirect:', url);
          notifyBlocked('popup', { url: String(url), detail: 'Auto-redirect hijack blocked' });
          return;
        }
      }
      return origLocationReplace.apply(this, arguments);
    };

    // Intercept location.assign
    const origLocationAssign = Location.prototype.assign;
    Location.prototype.assign = function (url) {
      if (!config.whitelisted && config.blockRedirects) {
        if (!isRecentUserAction() && isTrackerOrRedirectUrl(String(url))) {
          console.warn('[PureShield] Intercepted suspicious location.assign redirect:', url);
          notifyBlocked('popup', { url: String(url), detail: 'Auto-redirect hijack blocked' });
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
