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
    'tsyndicate.com',
    'twinrdsrv.com',
    'twinred.com',
    'twinredsrv.com',
    'ctjdwm.com',
    'bbangads.b-cdn.net',
    'buddhabangxxx.com',
    'infinity.js',
    'stripchat.com',
    'stripcash.com',
    'chaturbate.com',
    'camsoda.com',
    'bongacams.com',
    'livejasmin.com',
    'cam4.com',
    'orbsrv.com',
    'pjs.js',
    'rtb-6.xgroovy.com',
    'rtb-4.xgroovy.com',
    'lazyload.io',
    'st.pussyspace.com',
    'strpchat.com',
    'xhamsterlive.com',
    'pornbaker.com/tag',
    'pornbaker.com/category',
    'stripchat.com',
    'stripcash.com',
    'strpchat.com',
    'stripchat.org',
    'cam4.com',
    'bongacams.com',
    'chaturbate.com',
    'livejasmin.com'
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
    'track=',
    'smartpopbucketid=',
    'gototheroom',
    'modelname=',
    'modelid='
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
  let lastClickedLinkHref = '';
  let lastClickedLinkTarget = '';
  let lastClickTime = 0;

  function recordClickedAnchor(e) {
    if (!e.isTrusted) return;
    lastUserInteractionTime = Date.now();
    let el = e.target;
    while (el && el !== document) {
      if (el.tagName === 'A' || el.tagName === 'AREA') {
        lastClickedLinkHref = el.href || el.getAttribute('href') || '';
        lastClickedLinkTarget = el.getAttribute('target') || el.target || '';
        lastClickTime = Date.now();
        break;
      }
      el = el.parentNode;
    }
  }

  ['pointerdown', 'mousedown', 'touchstart', 'click'].forEach(eventType => {
    window.addEventListener(eventType, recordClickedAnchor, { capture: true, passive: true });
  });

  window.addEventListener('keydown', (e) => {
    if (e.isTrusted) lastUserInteractionTime = Date.now();
  }, { capture: true, passive: true });

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

      // 3. Tab-Under Protection:
      // A. Block window.open cloning the exact current page
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

      // B. Block tab-under clone of clicked links:
      // When clicking a link that the user intended to follow, ad networks call window.open(clickedLink)
      // to open it in a new tab while hijacking the current tab with an ad.
      if (lastClickTime && (Date.now() - lastClickTime < 1200) && lastClickedLinkHref) {
        let isSameAsClicked = false;
        try {
          const clickedUrl = new URL(lastClickedLinkHref, window.location.href).href;
          const targetUrlObj = new URL(urlStr, window.location.href).href;
          isSameAsClicked = (clickedUrl === targetUrlObj);
        } catch (_) {
          isSameAsClicked = (urlStr === lastClickedLinkHref);
        }

        if (isSameAsClicked) {
          console.warn('[ExtremeShield] Blocked tab-under duplicate window.open of clicked link:', urlStr);
          notifyBlocked('popup', { url: urlStr, target: String(target || '_blank') });
          return createDummyWindow(urlStr);
        }
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
          let checkCount = 0;
          const timer = setInterval(() => {
            checkCount++;
            try {
              if (openedWin.closed) {
                clearInterval(timer);
                return;
              }
              const childUrl = openedWin.location.href;
              if (childUrl && childUrl !== 'about:blank') {
                if (isTrackerOrRedirectUrl(childUrl) || (!isSameDomainOrSubdomain(childUrl) && !isAllowedPopupDomain(childUrl))) {
                  console.warn('[ExtremeShield] Closed child window navigated to ad/cross-origin:', childUrl);
                  notifyBlocked('popup', { url: childUrl, detail: 'Closed blank popup navigated to cross-origin' });
                  try { openedWin.close(); } catch (_) {}
                  clearInterval(timer);
                }
              }
            } catch (_) {
              // DOMException thrown: blank window was navigated cross-origin to a 3rd-party domain (classic popunder)
              console.warn('[ExtremeShield] Closed child window that navigated cross-origin to ad');
              notifyBlocked('popup', { url: 'cross-origin popunder', detail: 'Blank window navigated to external domain' });
              try { openedWin.close(); } catch (_) {}
              clearInterval(timer);
            }
            if (checkCount > 60) {
              clearInterval(timer);
            }
          }, 50);
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
          if (isTrackerOrRedirectUrl(href) || (!isSameDomainOrSubdomain(href) && !isAllowedPopupDomain(href))) {
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
        if (isTrackerOrRedirectUrl(action) || (!isSameDomainOrSubdomain(action) && !isAllowedPopupDomain(action))) {
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

  // Defuse dynamic ad script injection (e.g. TwinRed infinity.js)
  try {
    const scriptSrcDesc = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
    if (scriptSrcDesc && scriptSrcDesc.set) {
      const origScriptSrcSet = scriptSrcDesc.set;
      Object.defineProperty(HTMLScriptElement.prototype, 'src', {
        set: function (url) {
          const urlStr = String(url || '').toLowerCase();
          if (config.blockPopups && !config.whitelisted && (urlStr.includes('twinrdsrv') || urlStr.includes('infinity.js') || isTrackerOrRedirectUrl(urlStr))) {
            console.warn('[ExtremeShield] Blocked ad script injection:', url);
            this.setAttribute('data-blocked-src', url);
            return;
          }
          return origScriptSrcSet.call(this, url);
        },
        get: scriptSrcDesc.get,
        configurable: true
      });
    }
  } catch (_) {}

  // Defuse ExoClick / Popunder 'rg' engine
  try {
    const dummyRg = {
      config: function () { return dummyRg; },
      add: function () { return dummyRg; },
      bindTo: function () { return dummyRg; },
      ignoreTo: function () { return dummyRg; },
      getStack: function () { return []; },
      fire: function () { return false; },
      remove: function () { return dummyRg; }
    };
    let _rg = dummyRg;
    Object.defineProperty(window, 'rg', {
      get: () => _rg,
      set: (val) => {
        console.warn('[ExtremeShield] Neutralized popunder engine (rg) assignment');
      },
      configurable: true
    });
  } catch (_) {}

  // Defuse PussySpace anti-adblock / ExoClick KLCsvkdwF engine
  try {
    const dummyKLC = {
      rollexzone: function () { return dummyKLC; },
      serve: function () { return dummyKLC; },
      getDetector: function () {
        return {
          dtCensorship: function (cb) { if (typeof cb === 'function') cb(false); }
        };
      },
      openLink: function () { return false; },
      setCookie: function () {},
      getCookie: function () { return null; }
    };
    let _klc = dummyKLC;
    Object.defineProperty(window, 'KLCsvkdwF', {
      get: () => _klc,
      set: (val) => {
        console.warn('[ExtremeShield] Neutralized KLCsvkdwF popunder engine assignment');
      },
      configurable: true
    });
  } catch (_) {}

  // Strip popunder triggers like .popito from element classes
  try {
    const origClassAdd = DOMTokenList.prototype.add;
    DOMTokenList.prototype.add = function (...tokens) {
      const filtered = tokens.filter(t => t !== 'popito');
      if (filtered.length > 0) {
        return origClassAdd.apply(this, filtered);
      }
    };
  } catch (_) {}

  /* ==========================================================================
     3. ANTI-REDIRECT & TAB-UNDER HIJACK SHIELD
     ========================================================================== */
  function isAllowedLocationChange(url) {
    const urlStr = String(url || '').trim();
    if (!urlStr || urlStr === 'about:blank' || urlStr.startsWith('javascript:') || urlStr.startsWith('#')) {
      return true;
    }

    // 1. Same-domain navigation is always allowed
    if (isSameDomainOrSubdomain(urlStr)) {
      return true;
    }

    // 2. Direct tracker or ad network URLs are NEVER allowed
    if (isTrackerOrRedirectUrl(urlStr)) {
      return false;
    }

    // 3. Known OAuth login providers are allowed
    if (isAllowedPopupDomain(urlStr)) {
      return true;
    }

    // 4. Tab-Under Protection:
    // If the user clicked a link on the current domain (e.g. video link on pussyspace.com),
    // a script attempting to navigate the current tab to a DIFFERENT domain is 100% a tab-under attack!
    if (lastClickTime && (Date.now() - lastClickTime < 1500) && lastClickedLinkHref) {
      try {
        const clickedOrigin = new URL(lastClickedLinkHref, window.location.href).origin;
        const targetOrigin = new URL(urlStr, window.location.href).origin;
        if (clickedOrigin === window.location.origin && targetOrigin !== window.location.origin) {
          console.warn('[ExtremeShield] Blocked tab-under cross-domain redirect attempt:', urlStr);
          return false;
        }
        // If the user explicitly clicked an external link with the same destination origin
        if (clickedOrigin === targetOrigin) {
          return true;
        }
      } catch (_) {}
    }

    // 5. Block unsolicited cross-domain programmatic redirects
    return false;
  }

  try {
    // Intercept Location.prototype.href setter (Blocks window.location = 'ad_url' & location.href = 'ad_url')
    const hrefDesc = Object.getOwnPropertyDescriptor(Location.prototype, 'href');
    if (hrefDesc && hrefDesc.set) {
      const origHrefSet = hrefDesc.set;
      Object.defineProperty(Location.prototype, 'href', {
        set: function (url) {
          if (!config.whitelisted && config.blockRedirects) {
            if (!isAllowedLocationChange(url)) {
              console.warn('[ExtremeShield] Intercepted suspicious location.href redirect:', url);
              notifyBlocked('popup', { url: String(url), detail: 'Tab-under/redirect hijack blocked' });
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
        if (!isAllowedLocationChange(url)) {
          console.warn('[ExtremeShield] Intercepted suspicious location.replace redirect:', url);
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
        if (!isAllowedLocationChange(url)) {
          console.warn('[ExtremeShield] Intercepted suspicious location.assign redirect:', url);
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
        // Protect core media player configs (license_key, video_url, etc.)
        if (k.includes('license') || k.includes('key') || k === 'video_url' || k === 'hls_url') continue;
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
     3D. XVIDEOS & XNXX HTML5 PLAYER PRE-ROLL DEFUSER
     ========================================================================== */
  try {
    function patchPlayerInstance(inst) {
      if (!inst || typeof inst !== 'object' || inst.__pureshield_inst_patched__) return inst;
      inst.__pureshield_inst_patched__ = true;
      try {
        inst.disableVideoAds = true;
        inst.enableVideoPreRollAds = () => false;
        inst.enableVideoPostRollAds = () => false;
        inst.loadVideoPreRollAds = () => false;
        inst.loadVideoPostRollAds = () => false;
        inst.callForVideoAds = (type, res, rej) => {
          if (typeof rej === 'function') rej();
          return false;
        };
        inst._checkVideoAdsCommon = () => false;
        if (typeof inst.setSponsors === 'function') {
          inst.setSponsors(false);
        }
      } catch (_) {}
      return inst;
    }

    let _HTML5Player = window.HTML5Player;
    function wrapHTML5Player(Orig) {
      if (!Orig || Orig.__pureshield_wrapped__) return Orig;

      const Wrapped = function () {
        const inst = new Orig(...arguments);
        return patchPlayerInstance(inst);
      };

      Wrapped.prototype = Orig.prototype;
      Wrapped.__pureshield_wrapped__ = true;

      if (Orig.prototype) {
        try {
          Orig.prototype.disableVideoAds = true;
          Orig.prototype.enableVideoPreRollAds = function () { return false; };
          Orig.prototype.enableVideoPostRollAds = function () { return false; };
          Orig.prototype.loadVideoPreRollAds = function () { return false; };
          Orig.prototype.loadVideoPostRollAds = function () { return false; };
          Orig.prototype.callForVideoAds = function (t, r, rej) {
            if (typeof rej === 'function') rej();
            return false;
          };
          Orig.prototype._checkVideoAdsCommon = function () { return false; };
        } catch (_) {}
      }

      return Wrapped;
    }

    if (window.HTML5Player) window.HTML5Player = wrapHTML5Player(window.HTML5Player);
    Object.defineProperty(window, 'HTML5Player', {
      get: () => _HTML5Player,
      set: (val) => {
        _HTML5Player = wrapHTML5Player(val);
      },
      configurable: true
    });

    let _html5player = window.html5player;
    if (_html5player) patchPlayerInstance(_html5player);
    Object.defineProperty(window, 'html5player', {
      get: () => _html5player,
      set: (inst) => {
        _html5player = patchPlayerInstance(inst);
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
