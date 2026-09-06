/**
 * PureShield - Main World Injected Scriptlet
 * Provides aggressive popup interception, popunder neutralization,
 * telemetry beacon defusing, canvas & audio fingerprint spoofing, and anti-adblock defusing.
 */
(() => {
  'use strict';

  if (window.__pureshield_injected__) return;
  window.__pureshield_injected__ = true;

  // Active configuration received from content script
  const config = {
    blockPopups: true,
    blockTrackers: true,
    blockFingerprinting: true,
    defuseAntiAdblock: true,
    stripParams: true,
    whitelisted: false
  };

  // Known tracker signatures for client-side interception
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
    'admaven.com'
  ];

  function isTrackerUrl(url) {
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
     1. AGGRESSIVE POPUP & POPUNDER DEFUSER
     ========================================================================== */
  const originalOpen = window.open;
  let lastUserInteractionTime = 0;

  // Track genuine user interactions
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

  // Intercept window.open
  try {
    window.open = function (url, target, features) {
      if (config.whitelisted || !config.blockPopups) {
        return originalOpen.apply(this, arguments);
      }

      const urlStr = String(url || '');
      const isSuspicious = !isRecentUserAction() || (target && target.toString().toLowerCase() === '_blank' && !isRecentUserAction());

      // If called without recent user gesture, or target is popunder/spam
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
     2. TELEMETRY & BEACON DEFUSER
     ========================================================================== */
  if (navigator.sendBeacon) {
    const origSendBeacon = navigator.sendBeacon;
    navigator.sendBeacon = function (url, data) {
      if (!config.whitelisted && config.blockTrackers && isTrackerUrl(String(url))) {
        console.log('[PureShield] Blocked telemetry beacon:', url);
        notifyBlocked('tracker', { url: String(url) });
        return true;
      }
      return origSendBeacon.apply(this, arguments);
    };
  }

  /* ==========================================================================
     3. CANVAS & AUDIO FINGERPRINTING SPOOFING
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
     4. ANTI-ADBLOCK DEFUSERS & NO-OP STUBS
     ========================================================================== */
  if (config.defuseAntiAdblock) {
    try {
      window.canRunAds = true;
      window.isAdBlockActive = false;
      window.adblock = false;
      window.google_ad_client = true;

      if (!window.ga) {
        window.ga = function () {};
        window.ga.q = [];
        window.ga.loaded = true;
      }
      if (!window.gtag) {
        window.gtag = function () {};
      }
    } catch (_) {}
  }

  console.log('[PureShield] Protection engine active.');
})();
