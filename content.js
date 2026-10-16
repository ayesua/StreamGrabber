/**
 * XtremeShld - Content Script (Optimized Engine)
 * Fast DOM scanning, deep text-focus awareness, Shadow DOM traversal,
 * heuristic popup/overlay traps, element zapper, and cosmetic filter injection.
 */
(() => {
  'use strict';

  const hostname = window.location.hostname;
  const normalizedDomain = hostname.replace(/^www\./i, '');

  // Protect critical web applications (Google Workspace, accounts) from invasive scriptlet alterations
  const PROTECTED_SYSTEM_DOMAINS = [
    'mail.google.com',
    'accounts.google.com',
    'docs.google.com',
    'drive.google.com',
    'calendar.google.com',
    'meet.google.com'
  ];
  const isProtectedDomain = PROTECTED_SYSTEM_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d) || (normalizedDomain && (normalizedDomain === d || normalizedDomain.endsWith('.' + d))));

  let isWhitelisted = isProtectedDomain;
  let settings = {
    blockPopups: true,
    blockRedirects: true,
    blockTrackers: true,
    blockFingerprinting: true,
    defuseAntiAdblock: true,
    dismissCookieBanners: true,
    removeOverlays: true,
    stripParams: true,
    showToastNotifications: true,
    blockWebRTCLeaks: true,
    blockMediaPrerolls: true,
    historyTrapDefense: true,
    fullscreenDefense: true,
    shadowDomScanner: true,
    tabWatchdog: true,
    // Advanced Optional Shields
    stripPingAttributes: false,
    trimReferrers: false,
    unlockRightClick: false,
    blockAutoplay: false
  };

  /* ==========================================================================
     COSMETIC FILTERING STATE (Declared early to eliminate TDZ ReferenceErrors)
     ========================================================================== */
  let cosmeticStyleTag = null;
  const BUILTIN_COSMETIC_SELECTORS = [
    '.adsbyexoclick',
    '.exo-native-widget',
    'ins.eas6a97888e2',
    'ins.eas6a97888e20',
    'ins.adsbyjuicy',
    '[id^="div-gpt-ad"]',
    'ins.adsbygoogle',
    '.taboola-widget',
    '.OUTBRAIN',
    '.bottom-spots',
    '.spot > iframe[src*="zone="]',
    '.spot:has(iframe)',
    '.happy-under-player',
    'iframe[src*="exoclick.com"]',
    'iframe[src*="magsrv.com"]',
    'iframe[src*="tsyndicate.com"]',
    'iframe[src*="trafficstars.com"]',
    'iframe[src*="juicyads.com"]',
    'iframe[src*="realsrv.com"]',
    'iframe[src*="clickadu.com"]',
    'iframe[src*="adsterra.com"]'
  ];
  let activeCosmeticSelectors = [];

  /* ==========================================================================
     ACTIVE INPUT & SHADOW DOM INSPECTION (Prevents Focus Stealing)
     ========================================================================== */
  function getDeepActiveElement(root = document) {
    try {
      let el = root.activeElement;
      while (el && el.shadowRoot && el.shadowRoot.activeElement) {
        el = el.shadowRoot.activeElement;
      }
      return el;
    } catch (_) {
      return null;
    }
  }

  function isTextInputActive() {
    try {
      const el = getDeepActiveElement();
      if (!el) return false;
      const tag = el.tagName ? el.tagName.toLowerCase() : '';
      if (tag === 'input') {
        const type = (el.type || 'text').toLowerCase();
        return !['button', 'submit', 'reset', 'checkbox', 'radio', 'image', 'range', 'color', 'file'].includes(type);
      }
      if (tag === 'textarea' || tag === 'select') return true;
      if (el.isContentEditable || el.getAttribute('contenteditable') === 'true' || el.getAttribute('contenteditable') === '') return true;
      if (el.closest && el.closest('[contenteditable="true"], [role="textbox"], [role="searchbox"], [role="combobox"]')) return true;
      return false;
    } catch (_) {
      return false;
    }
  }

  /* ==========================================================================
     1. INJECT MAIN WORLD SCRIPTLET
     ========================================================================== */
  function injectScriptlet() {
    if (isProtectedDomain) return; // Never inject scriptlet overrides into protected apps like Gmail
    try {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('injected.js');
      script.onload = () => script.remove();
      (document.head || document.documentElement)?.appendChild(script);
    } catch (err) {
      console.warn('[XtremeShld] Scriptlet injection bypassed:', err);
    }
  }
  injectScriptlet();

  /* ==========================================================================
     HELPER: SAFE RUNTIME MESSAGING (Prevents unhandled connection errors)
     ========================================================================== */
  function safeSendMessage(message, callback) {
    try {
      if (!chrome.runtime?.id) return;
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          // Suppress harmless port closure/background idle errors
          return;
        }
        if (callback && typeof callback === 'function') {
          callback(response);
        }
      });
    } catch (_) {}
  }

  /* ==========================================================================
     2. SYNC SETTINGS & WHITELIST STATUS
     ========================================================================== */
  function syncSettings() {
    chrome.storage.local.get(['masterEnabled', 'pauseUntil', 'settings', 'whitelistedDomains', 'customCosmeticRules'], (data) => {
      if (chrome.runtime.lastError) return;
      if (data.settings) {
        settings = { ...settings, ...data.settings };
      }
      const isMasterOff = data.masterEnabled === false;
      const isPaused = Boolean(data.pauseUntil && Date.now() < data.pauseUntil);
      const whitelist = data.whitelistedDomains || [];
      const isDomainWhitelisted = whitelist.some(domain => {
        return hostname === domain || hostname.endsWith('.' + domain) ||
               (normalizedDomain && (normalizedDomain === domain || normalizedDomain.endsWith('.' + domain)));
      });

      isWhitelisted = isProtectedDomain || isMasterOff || isPaused || isDomainWhitelisted;

      if (isWhitelisted) {
        document.documentElement?.setAttribute('data-extremeshield-whitelisted', 'true');
        // Dismiss any existing toast notifications immediately
        if (toastContainer) {
          toastContainer.remove();
          toastContainer = null;
        }
      } else {
        document.documentElement?.removeAttribute('data-extremeshield-whitelisted');
      }

      // Broadcast config to injected.js
      window.dispatchEvent(new CustomEvent('pureshield-config-sync', {
        detail: {
          blockPopups: settings.blockPopups,
          blockRedirects: settings.blockRedirects,
          blockTrackers: settings.blockTrackers,
          blockFingerprinting: settings.blockFingerprinting,
          defuseAntiAdblock: settings.defuseAntiAdblock,
          blockMediaPrerolls: settings.blockMediaPrerolls !== false,
          historyTrapDefense: settings.historyTrapDefense !== false,
          fullscreenDefense: settings.fullscreenDefense !== false,
          whitelisted: isWhitelisted
        }
      }));

      // Apply custom cosmetic hiding rules
      if (!isWhitelisted) {
        applyCustomCosmeticRules(data.customCosmeticRules || {});
        applyAdvancedFeatures();
      } else {
        const el = document.getElementById('pureshield-cosmetic-styles');
        if (el) el.remove();
        cosmeticStyleTag = null;
        activeCosmeticSelectors = [];
      }
    });
  }
  syncSettings();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      syncSettings();
    }
  });

  /* ==========================================================================
     3. ADVANCED OPTIONAL SHIELDS
     ========================================================================== */
  function applyAdvancedFeatures() {
    if (isWhitelisted) return;

    // 1. Hyperlink Auditing Stripper (<a ping="...">)
    if (settings.stripPingAttributes) {
      document.querySelectorAll('a[ping]').forEach(a => {
        a.removeAttribute('ping');
      });
    }

    // 2. Referrer Trimming Policy
    if (settings.trimReferrers) {
      let metaRef = document.querySelector('meta[name="referrer"]');
      if (!metaRef) {
        metaRef = document.createElement('meta');
        metaRef.name = 'referrer';
        (document.head || document.documentElement)?.appendChild(metaRef);
      }
      metaRef.content = 'strict-origin-when-cross-origin';
    }

    // 3. Unlock Right Click & Text Selection (SAFE: Never intercept mousedown/mouseup!)
    if (settings.unlockRightClick) {
      ['contextmenu', 'copy'].forEach(evt => {
        document.addEventListener(evt, (e) => e.stopPropagation(), true);
      });
      document.oncontextmenu = null;
      document.onselectstart = null;
      if (document.body) document.body.style.userSelect = 'auto';
    }

    // 4. Anti-Autoplay Video Shield
    if (settings.blockAutoplay) {
      document.querySelectorAll('video[autoplay]').forEach(v => {
        if (!v.paused && !v.ended) {
          v.pause();
          v.autoplay = false;
        }
      });
    }
  }

  /* ==========================================================================
     3B. CLICK-JACKING & MALICIOUS LINK DEFUSER (Isolated World)
     ========================================================================== */
  const SUSPICIOUS_AD_HREFS = [
    'tarklot.com',
    'goodstatorone.com',
    'auhubsm.com',
    'rotator=',
    'click.php',
    '/news/prl/',
    'popads.net',
    'popcash.net',
    'propellerads.com',
    'onclickads.net',
    'exoclick.com',
    'adcash.com',
    'adsterra.com',
    'monetag.com',
    'kadam.net',
    'kadam.ru',
    'clickadu.com',
    'trafficstars.com',
    'whitetrafsa.com',
    'whitetraf.com',
    'magsrv.com',
    'tsyndicate.com',
    'twinrdsrv.com',
    'twinred.com',
    'twinredsrv.com',
    'ctjdwm.com',
    'bbangads.b-cdn.net',
    'buddhabangxxx.com',
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
    'stripchat.org',
    'svradv.com',
    'go.svradv.com',
    'svradv',
    'amateurok.net',
    'cherrytale',
    'ero-labs',
    'mybid',
    'ero-labs.art',
    'kartela.ink',
    'kartel69'
  ];

  function isSearchOrAdRedirect(href) {
    if (!href || typeof href !== 'string') return false;
    const lower = href.toLowerCase();
    return SUSPICIOUS_AD_HREFS.some(p => lower.includes(p));
  }

  function isMediaTarget(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
    const tag = el.tagName.toLowerCase();
    if (tag === 'video' || tag === 'audio' || tag === 'canvas' || tag === 'embed') return true;
    if (tag === 'iframe' && (el.src && (el.src.includes('embed') || el.src.includes('video') || el.src.includes('player')))) return true;
    return Boolean(el.closest('video, audio, [class*="player" i], [id*="player" i], .video-js, .jwplayer, .plyr, .html5-video-player, [class*="video-container" i], [class*="media-player" i], #video-player'));
  }

  ['click', 'auxclick', 'mousedown'].forEach(eventType => {
    window.addEventListener(eventType, (e) => {
      if (isWhitelisted || !settings.blockPopups) return;
      let target = e.target;

      // 1. Check if clicking on an overlay placed directly above a media element
      if (target && target !== document.body && target !== document.documentElement) {
        const inMedia = isMediaTarget(target);
        if (inMedia && (target.tagName === 'A' || target.getAttribute('target') === '_blank' || target.classList?.contains('overlay') || target.classList?.contains('click-trap'))) {
          const href = target.getAttribute('href') || target.href || '';
          if (href && !href.startsWith('#') && !href.startsWith('javascript:') && isSearchOrAdRedirect(href)) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            console.warn('[XtremeShld] Defused media click-jacking overlay link:', href);
            try { target.remove(); } catch (_) {}
            safeSendMessage({
              action: 'recordBlockedEvent',
              data: { type: 'popup', url: href, domain: hostname, timestamp: Date.now() }
            });
            if (settings.showToastNotifications && !isWhitelisted && settings.blockPopups) {
              showBlockedPopupToast(href);
            }
            return;
          }
        }
      }

      // 2. Check general anchor targets
      while (target && target !== document) {
        if (target.tagName === 'A' || target.tagName === 'AREA') {
          const href = target.getAttribute('href') || target.href || '';
          if (isSearchOrAdRedirect(href)) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            console.warn('[XtremeShld] Intercepted malicious ad / search hijack link click:', href);
            safeSendMessage({
              action: 'recordBlockedEvent',
              data: { type: 'popup', url: href, domain: hostname, timestamp: Date.now() }
            });
            if (settings.showToastNotifications && !isWhitelisted && settings.blockPopups) {
              showBlockedPopupToast(href);
            }
            return;
          }
        }
        target = target.parentNode;
      }
    }, true);
  });

  /* ==========================================================================
     4. TELEMETRY EVENT LISTENER
     ========================================================================== */
  window.addEventListener('pureshield-event', (e) => {
    if (!e.detail || isWhitelisted) return;

    const { type, url } = e.detail;
    if (type === 'popup' && !settings.blockPopups) return;

    safeSendMessage({
      action: 'recordBlockedEvent',
      data: {
        type: type || 'tracker',
        url: url || 'Blocked Resource',
        domain: hostname,
        timestamp: Date.now()
      }
    });

    if (type === 'popup' && settings.showToastNotifications && settings.blockPopups && !isWhitelisted) {
      showBlockedPopupToast(url);
    }
  });

  /* ==========================================================================
     5. MEMORY-OPTIMIZED DOM SCANNER (Lightweight & Debounced)
     ========================================================================== */
  const TRACKER_DOM_PATTERNS = [
    'google-analytics',
    'gtm.js',
    'fbevents.js',
    'facebook.com/tr',
    'criteo',
    'hotjar',
    'clarity.ms',
    'taboola',
    'outbrain',
    'scorecardresearch',
    'doubleclick',
    'analytics.tiktok',
    'mc.yandex'
  ];

  const COOKIE_BANNER_SELECTORS = [
    '#onetrust-consent-sdk',
    '#CookiebotWidget',
    '#didomi-host',
    '.qc-cmp2-container',
    '.cmplz-cookiebanner',
    '#CybotCookiebotDialog',
    '#usercentrics-root',
    '.evidon-banner',
    '#cookie-notice',
    '.cc-window',
    '#klaro',
    '.cookie-consent',
    '#truste-consent-track',
    '.cookie-privacy-modal',
    '.cookies-message',
    '.cookie-message',
    '#accept-cookies-btn',
    '#pianoOfferContainer .tp-modal',
    '#pianoOfferContainer .tp-backdrop',
    '.piano_wrapper .tp-modal',
    '.piano_wrapper .tp-backdrop',
    '#piano-experience .tp-modal',
    '.tp-iframe-wrapper[id*="piano"]',
    '#pianoOfferContainer',
    '.pianoOfferContainer',
    '.piano_wrapper',
    '#piano-experience',
    '.sp-carton-expand__overlay',
    '#webpushBanner-eluniversal',
    '.fc-consent-root',
    '.fc-dialog-overlay',
    '.privacy-modal',
    'iframe[id*="interstitial" i]',
    'iframe[id^="tr-"]',
    'div[id*="interstitial" i]',
    '[class*="interstitial" i]',
    '[id*="interstitial" i]',
    '#tr-interstitial',
    '[id^="tr-interstitial"]'
  ];

  const processedNodes = new WeakSet();
  let domScanTimeout = null;
  const pendingScanRoots = new Set();

  function performOptimizedScan(targetRoot = document) {
    if (isWhitelisted || !targetRoot || document.hidden) return;

    // 1. Strip popunder trigger classes like .popito
    if (settings.blockPopups && targetRoot.querySelectorAll) {
      if (targetRoot.classList && targetRoot.classList.contains('popito')) {
        targetRoot.classList.remove('popito');
      }
      const popitos = targetRoot.querySelectorAll('.popito');
      for (let i = 0; i < popitos.length; i++) {
        popitos[i].classList.remove('popito');
      }
    }

    // 2. Scan for Tracker elements (Inspect target root and direct descendants)
    if (settings.blockTrackers && targetRoot.querySelectorAll) {
      const elements = [];
      if (targetRoot.matches && targetRoot.matches('script[src], img[src], iframe[src]')) {
        elements.push(targetRoot);
      }
      const children = targetRoot.querySelectorAll('script[src], img[src], iframe[src]');
      for (let j = 0; j < children.length; j++) elements.push(children[j]);

      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        if (processedNodes.has(el)) continue;
        processedNodes.add(el);

        const src = el.src || '';
        if (!src) continue;

        const srcLower = src.toLowerCase();
        if (TRACKER_DOM_PATTERNS.some(pat => srcLower.includes(pat))) {
          safeSendMessage({
            action: 'recordBlockedEvent',
            data: { type: 'tracker', url: src, domain: hostname, timestamp: Date.now() }
          });
        }
      }
    }

    // 3. Auto-dismiss Cookie Banners and Auto-Accept
    if (settings.dismissCookieBanners && targetRoot.querySelector) {
      // Auto-click accept buttons on cookie consent banners if present (NEVER while user is typing)
      if (!isTextInputActive()) {
        const acceptBtn = targetRoot.querySelector('#accept-cookies-btn, .cookie-message__btn');
        if (acceptBtn && typeof acceptBtn.click === 'function') {
          try { acceptBtn.click(); } catch (_) {}
        }
      }

      // Pre-set consent cookies on known sites to prevent banner initialization
      if (hostname.includes('eluniversal.com.mx') && !document.cookie.includes('cookies_accepted=1')) {
        try { document.cookie = 'cookies_accepted=1; path=/; max-age=31536000'; } catch (_) {}
      }

      for (const selector of COOKIE_BANNER_SELECTORS) {
        const banner = targetRoot.querySelector(selector);
        if (banner && banner.style.display !== 'none') {
          banner.style.setProperty('display', 'none', 'important');
          banner.setAttribute('aria-hidden', 'true');
          safeSendMessage({
            action: 'recordBlockedEvent',
            data: { type: 'annoyance', url: selector, domain: hostname, timestamp: Date.now() }
          });
        }
      }
    }

    // 3B. Shadow DOM Deep Scanner (Inspects open shadow roots recursively up to depth 3)
    function scanShadowRoots(root, depth = 0) {
      if (!root || depth > 2 || !root.querySelectorAll) return;
      try {
        const potentialHosts = root.querySelectorAll('*');
        for (let i = 0; i < potentialHosts.length; i++) {
          const host = potentialHosts[i];
          const shadow = host.shadowRoot;
          if (shadow && !processedNodes.has(shadow)) {
            processedNodes.add(shadow);

            // Scan trackers inside shadow root
            if (settings.blockTrackers) {
              const shadowTrackers = shadow.querySelectorAll('script[src], img[src], iframe[src]');
              for (let j = 0; j < shadowTrackers.length; j++) {
                const el = shadowTrackers[j];
                if (processedNodes.has(el)) continue;
                processedNodes.add(el);
                const src = el.src || '';
                if (src && TRACKER_DOM_PATTERNS.some(pat => src.toLowerCase().includes(pat))) {
                  safeSendMessage({
                    action: 'recordBlockedEvent',
                    data: { type: 'tracker', url: src, domain: hostname, timestamp: Date.now() }
                  });
                }
              }
            }

            // Scan cookie/overlay banners inside shadow root
            if (settings.dismissCookieBanners) {
              for (const selector of COOKIE_BANNER_SELECTORS) {
                const banner = shadow.querySelector(selector);
                if (banner && banner.style.display !== 'none') {
                  banner.style.setProperty('display', 'none', 'important');
                  banner.setAttribute('aria-hidden', 'true');
                  safeSendMessage({
                    action: 'recordBlockedEvent',
                    data: { type: 'annoyance', url: selector, domain: hostname, timestamp: Date.now() }
                  });
                }
              }
            }

            // Recurse deeper if needed
            scanShadowRoots(shadow, depth + 1);
          }
        }
      } catch (_) {}
    }

    if (settings.shadowDomScanner !== false) {
      scanShadowRoots(targetRoot, 0);
    }

    // 3C. Dynamic Cosmetic Filtering Enforcement
    if (!isWhitelisted && activeCosmeticSelectors.length > 0 && targetRoot.querySelectorAll) {
      for (let s = 0; s < activeCosmeticSelectors.length; s++) {
        try {
          const matches = targetRoot.querySelectorAll(activeCosmeticSelectors[s]);
          for (let m = 0; m < matches.length; m++) {
            const el = matches[m];
            if (el.style.display !== 'none') {
              el.style.setProperty('display', 'none', 'important');
              el.style.setProperty('visibility', 'hidden', 'important');
              el.style.setProperty('pointer-events', 'none', 'important');
              el.setAttribute('data-pureshield-zapped', 'true');
            }
          }
        } catch (_) {}
      }
    }



    // 4. Scroll Lock Recovery (Unlocks html and body overflow - suppressed during active typing)
    if (!isTextInputActive()) {
      unlockScroll();
    }
  }

  /* ==========================================================================
     IN-STREAM VIDEO AD DEFUSER & AUTO-SKIPPER (Safe & Context-Aware)
     ========================================================================== */
  function setupVideoAdSkipper() {
    if (isWhitelisted) return;

    // Strict video ad skip selectors (Strictly excludes generic "skip" accessibility links!)
    const SKIP_BUTTON_SELECTORS = [
      '.ytp-skip-ad-button',
      '.ytp-ad-skip-button',
      '.ytp-ad-skip-button-modern',
      'button.ytp-ad-skip-button-text',
      '.video-ad-skip',
      '.video-ad-skip-button',
      '.ad-skip-button',
      '.ad-skip',
      '.skip-ad',
      '[class*="video-ad-skip"]',
      '[class*="ad-skip"]',
      '[class*="kt-player-advertising"] [class*="skip"]',
      '#anc-tst-skip_ad-btn',
      '[id*="skip_ad"]',
      '.video-overlay-skip-txt',
      '.video-overlay-skip',
      '[class*="video-overlay-skip"]',
      'button[aria-label*="skip ad" i]',
      'button[aria-label*="saltar anuncio" i]',
      'button[aria-label*="saltar publicidad" i]'
    ];

    // Filter out standard website accessibility navigation buttons (e.g. "Skip navigation")
    function isAccessibilitySkip(el) {
      if (!el) return false;
      const aria = (el.getAttribute('aria-label') || '').toLowerCase();
      const id = (el.id || '').toLowerCase();
      const cls = (el.className || '').toLowerCase();
      if (aria.includes('navigation') || aria.includes('content') || aria.includes('search') || aria.includes('menu') || aria.includes('header')) return true;
      if (id.includes('nav') || id.includes('content') || id.includes('skip-to') || id.includes('skip_to')) return true;
      if (cls.includes('nav') || cls.includes('content') || cls.includes('skip-link') || cls.includes('skip_link')) return true;
      if (el.closest && el.closest('#skip-navigation, #skip-to-content, .skip-to-content, [id*="skip-nav" i], [class*="skip-nav" i]')) return true;
      return false;
    }

    function checkVideoAds() {
      // Zero CPU overhead if page is hidden, or if user is actively typing in ANY text field
      if (isWhitelisted || document.hidden || isTextInputActive()) return;

      const video = document.querySelector('video');
      if (!video) return;

      // 1. Auto-click visible Skip button strictly within recognized video players
      for (const sel of SKIP_BUTTON_SELECTORS) {
        const btns = document.querySelectorAll(sel);
        for (let i = 0; i < btns.length; i++) {
          const btn = btns[i];
          if (!btn || btn.offsetParent === null || typeof btn.click !== 'function') continue;
          if (isAccessibilitySkip(btn)) continue;

          // Must be inside a recognized video player or video ad overlay
          const player = btn.closest('.html5-video-player, .video-js, .jwplayer, .plyr, .video-ads, .ytp-ad-player-overlay, .ad-container, [class*="player" i], [id*="player" i], [class*="video-overlay" i], [class*="kt-player-advertising"]');
          if (!player) continue;

          // On YouTube (.html5-video-player), verify an ad is actually active before clicking
          if (player.classList.contains('html5-video-player') || player.id === 'movie_player') {
            const isAdShowing = player.classList.contains('ad-showing') ||
                                player.classList.contains('ad-interrupting') ||
                                Boolean(player.querySelector('.ytp-ad-player-overlay, .ytp-ad-text, .ytp-ad-preview-container'));
            if (!isAdShowing) continue;
          }

          // Preserve activeElement focus across click execution
          const prevFocus = getDeepActiveElement();
          try {
            btn.click();
          } catch (_) {}
          if (prevFocus && prevFocus !== getDeepActiveElement() && typeof prevFocus.focus === 'function') {
            try { prevFocus.focus({ preventScroll: true }); } catch (_) {}
          }
          break;
        }
      }

      // 2. Fast-forward video commercial if detected inside ad containers
      const videos = document.querySelectorAll('video');
      for (let i = 0; i < videos.length; i++) {
        const v = videos[i];
        const src = (v.src || v.currentSrc || '').toLowerCase();
        
        // Never accelerate genuine main video content (> 30s or on legitimate video players)
        if (v.duration && !isNaN(v.duration) && v.duration > 35) {
          // Reset playbackRate if it was previously set high
          if (v.playbackRate > 2.0) {
            try { v.playbackRate = 1.0; } catch (_) {}
          }
          continue;
        }

        const isAdSource = src.includes('/ad/') ||
                           src.includes('vast') ||
                           src.includes('preroll') ||
                           src.includes('trafficjunky') ||
                           src.includes('magsrv') ||
                           src.includes('whitetraf') ||
                           src.includes('tsyndicate') ||
                           src.includes('exosrv') ||
                           src.includes('exoclick') ||
                           src.includes('trafficstars');

        // Never tamper with main player video engines unless it's an explicit ad stream URL
        const isLegitPlayerEngine = v.classList.contains('fp-engine') ||
                                    v.classList.contains('jw-video') ||
                                    Boolean(v.closest('#kt_player, .flowplayer, .video-holder, .plyr, .jwplayer, [class*="jwplayer" i]'));
        if (isLegitPlayerEngine && !isAdSource) {
          if (v.playbackRate > 2.0) {
            try { v.playbackRate = 1.0; } catch (_) {}
          }
          continue;
        }

        const isAdContainer = v.closest('.ad-container, [class*="ad-container" i], [class*="preroll" i], [id*="preroll" i], .video-ads, .vjs-ad-playing, [id*="videoads" i], .kt-player-advertising');

        if (isAdContainer || isAdSource) {
          try {
            if (v.duration && !isNaN(v.duration) && v.duration > 0 && v.currentTime < v.duration) {
              v.muted = true;
              v.playbackRate = 16.0;
              v.currentTime = v.duration - 0.1;
            }
          } catch (_) {}
        }
      }
    }

    // Check once per second only when active
    setInterval(checkVideoAds, 1000);
  }

  // Schedule scan with requestIdleCallback and 300ms debounce
  function scheduleScan(root = document) {
    if (root) pendingScanRoots.add(root);
    if (domScanTimeout) clearTimeout(domScanTimeout);
    domScanTimeout = setTimeout(() => {
      const run = () => {
        if (pendingScanRoots.has(document)) {
          pendingScanRoots.clear();
          performOptimizedScan(document);
        } else {
          pendingScanRoots.forEach(r => performOptimizedScan(r));
          pendingScanRoots.clear();
        }
      };

      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(run, { timeout: 500 });
      } else {
        run();
      }
    }, 300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      scheduleScan(document);
      setupVideoAdSkipper();
    });
  } else {
    scheduleScan(document);
    setupVideoAdSkipper();
  }

  function unlockScroll() {
    if (isWhitelisted || !settings.removeOverlays || isTextInputActive()) return;
    const docEl = document.documentElement;
    const body = document.body;
    // Exclude tp-modal-open to prevent collision with Tangram Polymer on YouTube / Google apps
    const lockClasses = ['modal-open', 'no-scroll', 'overflow-hidden', 'scroll-locked', 'disable-scroll', 'fancybox-active', 'has-modal'];

    if (docEl) {
      if (docEl.style.overflow === 'hidden' || docEl.style.overflowY === 'hidden') {
        docEl.style.setProperty('overflow', 'auto', 'important');
        docEl.style.setProperty('overflow-y', 'auto', 'important');
      }
      for (const cls of lockClasses) {
        if (docEl.classList.contains(cls)) docEl.classList.remove(cls);
      }
    }

    if (body) {
      if (body.style.overflow === 'hidden' || body.style.overflowY === 'hidden') {
        body.style.setProperty('overflow', 'auto', 'important');
        body.style.setProperty('overflow-y', 'auto', 'important');
      }
      if (body.style.position === 'fixed') {
        body.style.removeProperty('position');
      }
      for (const cls of lockClasses) {
        if (body.classList.contains(cls)) body.classList.remove(cls);
      }
    }
  }

  // MutationObserver only scans newly added subtrees and watches scroll locks on html/body
  const observer = new MutationObserver((mutations) => {
    if (isWhitelisted || document.hidden) return;
    for (let i = 0; i < mutations.length; i++) {
      const m = mutations[i];
      if (m.type === 'attributes' && (m.target === document.documentElement || m.target === document.body)) {
        if (!isTextInputActive()) {
          unlockScroll();
        }
        continue;
      }
      const added = m.addedNodes;
      if (added && added.length > 0) {
        for (let j = 0; j < added.length; j++) {
          const n = added[j];
          if (n.nodeType === Node.ELEMENT_NODE) {
            const nid = (n.id || '').toLowerCase();
            const ncls = (n.className || '').toString().toLowerCase();
            if (nid.includes('interstitial') || nid.startsWith('tr-') || ncls.includes('interstitial')) {
              console.warn('[XtremeShld] Instantly eliminated interstitial overlay:', n.id || n.className);
              try { n.remove(); } catch (_) {}
              unlockScroll();
              continue;
            }
            if (n.matches && n.matches('iframe[id*="interstitial" i], iframe[id^="tr-"], [class*="interstitial" i]')) {
              console.warn('[XtremeShld] Instantly eliminated matching interstitial:', n.id || n.className);
              try { n.remove(); } catch (_) {}
              unlockScroll();
              continue;
            }
            scheduleScan(n);
          }
        }
      }
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !isWhitelisted) {
      scheduleScan(document);
      unlockScroll();
    }
  });

  /* ==========================================================================
     6. DISCREET TOAST NOTIFICATION
     ========================================================================== */
  let toastContainer = null;

  function ensureToastContainer() {
    if (!toastContainer || !document.body.contains(toastContainer)) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'pureshield-toast-container';
      (document.body || document.documentElement).appendChild(toastContainer);
    }
    return toastContainer;
  }

  function showBlockedPopupToast(popupUrl) {
    if (isWhitelisted || !settings.blockPopups || !settings.showToastNotifications) return;
    if (!document.body) return;
    const container = ensureToastContainer();

    // Prevent toast flooding & memory accumulation
    while (container.children.length >= 3) {
      container.removeChild(container.firstChild);
    }

    const toast = document.createElement('div');
    toast.className = 'pureshield-toast';

    let displayUrl = popupUrl || 'Unrequested Window';
    try {
      if (popupUrl && popupUrl.startsWith('http')) {
        displayUrl = new URL(popupUrl).hostname;
      }
    } catch (_) {}

    toast.innerHTML = `
      <div class="pureshield-toast-info">
        <div class="pureshield-toast-title">🛡️ Popup Blocked</div>
        <div class="pureshield-toast-url" title="${displayUrl}">${displayUrl}</div>
      </div>
      <div class="pureshield-toast-actions">
        <button class="pureshield-toast-btn" id="ps-btn-allow-once">Allow Once</button>
        <button class="pureshield-toast-btn" id="ps-btn-whitelist">Whitelist</button>
        <button class="pureshield-toast-close" title="Close">&times;</button>
      </div>
    `;

    const allowBtn = toast.querySelector('#ps-btn-allow-once');
    const whitelistBtn = toast.querySelector('#ps-btn-whitelist');
    const closeBtn = toast.querySelector('.pureshield-toast-close');

    if (allowBtn) {
      allowBtn.addEventListener('click', () => {
        if (popupUrl && popupUrl.startsWith('http')) {
          window.open(popupUrl, '_blank');
        }
        dismissToast(toast);
      });
    }

    if (whitelistBtn) {
      whitelistBtn.addEventListener('click', () => {
        safeSendMessage({ action: 'whitelistCurrentDomain', domain: hostname }, () => {
          syncSettings();
          dismissToast(toast);
        });
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => dismissToast(toast));
    }

    container.appendChild(toast);
    const timer = setTimeout(() => dismissToast(toast), 4500);
    toast.addEventListener('mouseenter', () => clearTimeout(timer));
  }

  function dismissToast(toast) {
    if (!toast) return;
    toast.classList.add('pureshield-toast-fadeout');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }

  /* ==========================================================================
     6B. DEDICATED ZAPPER TOAST NOTIFICATION
     ========================================================================== */
  function showZapperToast(title, subtitle, onUndo) {
    if (!settings.showToastNotifications || !document.body) return;
    const container = ensureToastContainer();

    while (container.children.length >= 3) {
      container.removeChild(container.firstChild);
    }

    const toast = document.createElement('div');
    toast.className = 'pureshield-toast pureshield-zapper-toast';

    let displaySub = subtitle || '';
    if (displaySub.length > 50) {
      displaySub = displaySub.slice(0, 47) + '...';
    }

    toast.innerHTML = `
      <div class="pureshield-toast-info">
        <div class="pureshield-toast-title">${title}</div>
        <div class="pureshield-toast-url" title="${subtitle}">${displaySub}</div>
      </div>
      <div class="pureshield-toast-actions">
        ${onUndo ? '<button class="pureshield-toast-btn" id="ps-zapper-undo-btn">Undo</button>' : ''}
        <button class="pureshield-toast-close" title="Close">&times;</button>
      </div>
    `;

    const undoBtn = toast.querySelector('#ps-zapper-undo-btn');
    if (undoBtn && onUndo) {
      undoBtn.addEventListener('click', () => {
        onUndo();
        dismissToast(toast);
      });
    }

    const closeBtn = toast.querySelector('.pureshield-toast-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => dismissToast(toast));
    }

    container.appendChild(toast);
    const timer = setTimeout(() => dismissToast(toast), 5000);
    toast.addEventListener('mouseenter', () => clearTimeout(timer));
  }

  /* ==========================================================================
     7. COSMETIC FILTERING ENGINE (Built-in & Custom Rules)
     ========================================================================== */
  function ensureCosmeticStyles() {
    if (!cosmeticStyleTag || !document.contains(cosmeticStyleTag)) {
      cosmeticStyleTag = document.getElementById('pureshield-cosmetic-styles');
      if (!cosmeticStyleTag) {
        cosmeticStyleTag = document.createElement('style');
        cosmeticStyleTag.id = 'pureshield-cosmetic-styles';
        (document.head || document.documentElement).appendChild(cosmeticStyleTag);
      }
    }
    return cosmeticStyleTag;
  }

  function applyCustomCosmeticRules(customRules) {
    const styleEl = ensureCosmeticStyles();

    if (isWhitelisted) {
      if (styleEl) styleEl.textContent = '';
      activeCosmeticSelectors = [];
      return;
    }

    const globalRules = (customRules && customRules['*']) || [];
    const hostRules = (customRules && customRules[hostname]) || [];
    const normRules = (customRules && normalizedDomain !== hostname && customRules[normalizedDomain]) || [];
    const userRules = Array.from(new Set([...globalRules, ...hostRules, ...normRules]));
    const allRules = Array.from(new Set([...BUILTIN_COSMETIC_SELECTORS, ...userRules]));
    activeCosmeticSelectors = allRules;

    if (allRules.length === 0) {
      if (styleEl) styleEl.textContent = '';
      return;
    }

    const css = allRules.map(selector => {
      return `${selector} { display: none !important; visibility: hidden !important; pointer-events: none !important; height: 0 !important; width: 0 !important; opacity: 0 !important; }`;
    }).join('\n');
    styleEl.textContent = css;

    // Immediately enforce display: none on any matching elements already in the DOM
    allRules.forEach(selector => {
      try {
        const els = document.querySelectorAll(selector);
        for (let i = 0; i < els.length; i++) {
          els[i].style.setProperty('display', 'none', 'important');
          els[i].style.setProperty('visibility', 'hidden', 'important');
          els[i].style.setProperty('pointer-events', 'none', 'important');
          els[i].setAttribute('data-pureshield-zapped', 'true');
        }
      } catch (_) {}
    });
  }
  applyCustomCosmeticRules({});

  /* ==========================================================================
     8. INTERACTIVE ELEMENT ZAPPER (Smart/Exact Mode, Lever, Preview & Undo)
     ========================================================================== */
  let pickerActive = false;
  let isLocked = false;
  let pickerSmartMode = true; // Default: Smart/Similar cross-page selector generation
  let customEditedSelector = '';
  let hoveredElement = null;
  let selectedElement = null;
  let ancestryChain = [];
  let selectedIndex = 0;
  let previewActive = false;
  let pickerToolbar = null;
  let highlightedMatches = [];
  const sessionZapHistory = [];

  const GENERIC_LAYOUT_CLASSES = new Set([
    'wrapper', 'main', 'container', 'content', 'row', 'col', 'column', 'columns',
    'inner', 'outer', 'clearfix', 'clear', 'block', 'box', 'section', 'layout',
    'page', 'site', 'body', 'grid', 'flex', 'wrap', 'holder', 'panel', 'frame'
  ]);

  const AD_WRAPPER_CLASS_REGEX = /(^|[-_])(spot|spots|bottom-spots|ad|ads|adv|advert|advertisement|banner|banners|sponsor|sponsored|promo|exo|juicy|outbrain|taboola|widget-ad|happy-under-player)($|[-_])/i;

  function isExtensionElement(el) {
    if (!el) return false;
    return el.id?.startsWith('pureshield-') ||
           el.classList?.contains('pureshield-toast') ||
           el.closest?.('#pureshield-picker-toolbar, #pureshield-toast-container, #pureshield-cosmetic-styles');
  }

  function isDedicatedAdWrapper(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
    if (el === document.body || el === document.documentElement) return false;
    const cls = typeof el.className === 'string' ? el.className : '';
    const id = el.id || '';
    if (AD_WRAPPER_CLASS_REGEX.test(cls) || AD_WRAPPER_CLASS_REGEX.test(id)) {
      // Ensure it is not wrapping the entire page or main video player
      if (el.querySelector && el.querySelector('video, #video, .video-player, .player-holder')) return false;
      const rect = el.getBoundingClientRect();
      if (rect.width > window.innerWidth * 0.95 && rect.height > window.innerHeight * 0.85) return false;
      return true;
    }
    return false;
  }

  function buildAncestryChain(el) {
    const chain = [];
    let curr = el;
    while (curr && curr.nodeType === Node.ELEMENT_NODE && curr !== document.body && curr !== document.documentElement) {
      if (isExtensionElement(curr)) break;
      chain.push(curr);
      curr = curr.parentElement;
    }
    if (chain.length === 0 && el && !isExtensionElement(el)) {
      chain.push(el);
    }
    return chain;
  }

  function getInitialChainIndex(chain) {
    if (!chain || chain.length <= 1) return 0;
    // If user clicked an inner iframe/img/ins/a inside a dedicated ad wrapper (e.g. div.spot),
    // automatically select the dedicated ad wrapper so the entire ad slot is zapped cleanly.
    for (let i = 1; i < Math.min(chain.length, 4); i++) {
      if (isDedicatedAdWrapper(chain[i])) {
        return i;
      }
    }
    return 0;
  }

  function getValidElementClasses(el) {
    if (!el || !el.className || typeof el.className !== 'string') return [];
    return el.className.split(/\s+/).filter(c =>
      c && !c.startsWith('pureshield-') && !c.includes(':') && !c.includes('[') &&
      !/^(is-|has-|active|open|hover|focus|playing|paused|mouseover|splash|clearfix)/i.test(c)
    );
  }

  function getUniqueSelector(el, smartMode = pickerSmartMode) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return '';
    const tag = el.nodeName.toLowerCase();

    // 1. Stable, non-dynamic ID check
    if (el.id && !el.id.startsWith('pureshield-')) {
      const isDynamicId = /[a-f0-9]{10,}|[0-9]{5,}|interstitial|overlay/i.test(el.id);
      if (!isDynamicId) {
        try {
          const idSel = '#' + CSS.escape(el.id);
          if (document.querySelectorAll(idSel).length === 1) {
            return idSel;
          }
        } catch (_) {}
      }
    }

    // 2. Meaningful custom ad/widget attributes (data-ad-slot, data-zone-id, data-widget-id, name)
    const distinctAttrs = ['data-ad-slot', 'data-zone-id', 'data-widget-id', 'name'];
    for (const attr of distinctAttrs) {
      const val = el.getAttribute(attr);
      if (val && !val.includes('"') && !val.includes("'")) {
        try {
          if (smartMode && (attr === 'data-ad-slot' || attr === 'data-zone-id')) {
            return `${tag}[${attr}]`;
          }
          const attrSel = `${tag}[${attr}="${CSS.escape(val)}"]`;
          if (document.querySelectorAll(attrSel).length >= 1) {
            return attrSel;
          }
        } catch (_) {}
      }
    }

    // 3. High-specificity attributes for iframes
    if (tag === 'iframe' && el.getAttribute('src')) {
      const src = el.getAttribute('src').trim();
      if (src && src !== 'about:blank') {
        try {
          const url = new URL(src, window.location.href);
          if (smartMode) {
            if (url.hostname && url.hostname !== hostname) {
              const hostParts = url.hostname.split('.');
              const baseDomain = hostParts.length >= 2 ? hostParts.slice(-2).join('.') : url.hostname;
              return `iframe[src*="${CSS.escape(baseDomain)}"]`;
            }
            if (url.search.includes('zone=')) {
              return 'iframe[src*="zone="]';
            }
            if (url.pathname && url.pathname.length > 1) {
              return `iframe[src*="${CSS.escape(url.pathname)}"]`;
            }
          } else {
            const zoneMatch = url.search.match(/zone=([0-9]+)/);
            if (zoneMatch) {
              return 'iframe[src*="zone=' + zoneMatch[1] + '"]';
            }
            if (url.hostname) {
              return `iframe[src*="${CSS.escape(url.hostname)}"]`;
            }
          }
        } catch (_) {}
      }
    }

    // 4. High-specificity attributes for links (href)
    if (tag === 'a' && el.getAttribute('href')) {
      const href = el.getAttribute('href').trim();
      if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
        try {
          const url = new URL(href, window.location.href);
          if (smartMode && url.hostname && url.hostname !== hostname) {
            const hostParts = url.hostname.split('.');
            const baseDomain = hostParts.length >= 2 ? hostParts.slice(-2).join('.') : url.hostname;
            return `a[href*="${CSS.escape(baseDomain)}"]`;
          }
          const pathPart = url.pathname.replace(/\/$/, '').split('/').pop();
          if (pathPart && pathPart.length > 3) {
            const hrefSel = 'a[href*="' + CSS.escape(pathPart) + '"]';
            if (!smartMode && document.querySelectorAll(hrefSel).length === 1) {
              return hrefSel;
            }
          }
        } catch (_) {}
      }
    }

    // 5. SMART MODE: Cross-page reusable semantic selector (avoids div.wrapper > div.main > div.container chains)
    if (smartMode) {
      const classes = getValidElementClasses(el);
      const semanticClasses = classes.filter(c => !GENERIC_LAYOUT_CLASSES.has(c.toLowerCase()));

      if (semanticClasses.length > 0) {
        const classSel = tag + '.' + semanticClasses.slice(0, 2).map(c => CSS.escape(c)).join('.');
        try {
          const matches = document.querySelectorAll(classSel);
          if (matches.length >= 1 && matches.length <= 25) {
            return classSel;
          }
        } catch (_) {}
      }

      // Check if this element has a parent with a semantic class (1-2 levels up)
      let parent = el.parentElement;
      let hop = 0;
      while (parent && parent !== document.body && parent !== document.documentElement && hop < 2) {
        const pClasses = getValidElementClasses(parent).filter(c => !GENERIC_LAYOUT_CLASSES.has(c.toLowerCase()));
        if (pClasses.length > 0) {
          const pTag = parent.nodeName.toLowerCase();
          const pSel = pTag + '.' + pClasses.slice(0, 2).map(c => CSS.escape(c)).join('.');
          const childPart = classes.length > 0 ? `${tag}.${CSS.escape(classes[0])}` : tag;
          const combined = hop === 0 ? `${pSel} > ${childPart}` : `${pSel} ${childPart}`;
          try {
            const matches = document.querySelectorAll(combined);
            if (matches.length >= 1 && matches.length <= 25) {
              return combined;
            }
          } catch (_) {}
        }
        parent = parent.parentElement;
        hop++;
      }

      // If container holds an ad iframe, generate a structural :has() selector
      try {
        const innerIframe = el.querySelector && el.querySelector('iframe');
        if (innerIframe) {
          const basePart = classes.length > 0 ? `${tag}.${CSS.escape(classes[0])}` : tag;
          const src = innerIframe.getAttribute('src') || '';
          if (src.includes('zone=')) {
            const hasSel = `${basePart}:has(iframe[src*="zone="])`;
            if (document.querySelectorAll(hasSel).length >= 1) return hasSel;
          }
          const hasGeneric = `${basePart}:has(iframe)`;
          const matches = document.querySelectorAll(hasGeneric);
          if (matches.length >= 1 && matches.length <= 15) return hasGeneric;
        }
      } catch (_) {}
    }

    // 6. EXACT MODE (or fallback): Hierarchical traversal with true :nth-child() disambiguation
    let path = [];
    let curr = el;
    while (curr && curr.nodeType === Node.ELEMENT_NODE && curr !== document.body && curr !== document.documentElement) {
      if (curr.id && !curr.id.startsWith('pureshield-')) {
        const isDyn = /[a-f0-9]{10,}|[0-9]{5,}|interstitial|overlay/i.test(curr.id);
        if (!isDyn) {
          try {
            const idSel = '#' + CSS.escape(curr.id);
            if (document.querySelectorAll(idSel).length === 1) {
              path.unshift(idSel);
              break;
            }
          } catch (_) {}
        }
      }

      let selector = curr.nodeName.toLowerCase();
      const validClasses = getValidElementClasses(curr);
      if (validClasses.length > 0) {
        selector += '.' + validClasses.slice(0, 2).map(c => CSS.escape(c)).join('.');
      }

      // True DOM child index disambiguation with :nth-child(N)
      if (curr.parentElement) {
        try {
          const allChildren = Array.from(curr.parentElement.children);
          const sameSelectorSiblings = allChildren.filter(child => {
            if (child.nodeName.toLowerCase() !== curr.nodeName.toLowerCase()) return false;
            if (validClasses.length > 0) {
              return validClasses.slice(0, 2).every(cls => child.classList.contains(cls));
            }
            return true;
          });
          if (sameSelectorSiblings.length > 1) {
            const actualIndex = allChildren.indexOf(curr) + 1;
            if (actualIndex > 0) {
              selector += ':nth-child(' + actualIndex + ')';
            }
          }
        } catch (_) {}
      }

      path.unshift(selector);
      if (path.length >= 4) break;

      // Early stop if partial path already uniquely matches this element
      try {
        const partial = path.join(' > ');
        const matches = document.querySelectorAll(partial);
        if (matches.length === 1 && matches[0] === el) {
          return partial;
        }
      } catch (_) {}

      curr = curr.parentElement;
    }

    const fullSelector = path.join(' > ');
    return fullSelector || (el.nodeName ? el.nodeName.toLowerCase() : '');
  }

  function getActiveSelector() {
    if (customEditedSelector && customEditedSelector.trim()) {
      return customEditedSelector.trim();
    }
    const currEl = ancestryChain[selectedIndex] || selectedElement || hoveredElement;
    if (!currEl || currEl.nodeType !== Node.ELEMENT_NODE) return '';
    return getUniqueSelector(currEl, pickerSmartMode);
  }

  function activateElementPicker() {
    if (window !== window.top) return;
    if (pickerActive) return;
    pickerActive = true;
    isLocked = false;
    pickerSmartMode = true;
    customEditedSelector = '';
    previewActive = false;
    selectedIndex = 0;
    ancestryChain = [];

    document.documentElement.classList.add('pureshield-picking-active');

    if (!pickerToolbar) {
      pickerToolbar = document.createElement('div');
      pickerToolbar.id = 'pureshield-picker-toolbar';
      (document.body || document.documentElement).appendChild(pickerToolbar);
    }

    buildToolbarHTML();
    updateToolbarUI();

    document.addEventListener('mouseover', handlePickerMouseOver, true);
    document.addEventListener('mouseout', handlePickerMouseOut, true);
    document.addEventListener('click', handlePickerClick, true);
    document.addEventListener('keydown', handlePickerKeyDown, true);
  }

  function deactivateElementPicker() {
    if (!pickerActive) return;
    pickerActive = false;
    isLocked = false;
    previewActive = false;
    customEditedSelector = '';

    document.documentElement.classList.remove('pureshield-picking-active');
    clearHighlightsAndPreviews();

    if (pickerToolbar && pickerToolbar.parentNode) {
      pickerToolbar.parentNode.removeChild(pickerToolbar);
    }
    pickerToolbar = null;
    hoveredElement = null;
    selectedElement = null;
    ancestryChain = [];

    document.removeEventListener('mouseover', handlePickerMouseOver, true);
    document.removeEventListener('mouseout', handlePickerMouseOut, true);
    document.removeEventListener('click', handlePickerClick, true);
    document.removeEventListener('keydown', handlePickerKeyDown, true);
  }

  function clearMatchedElementStyles() {
    if (highlightedMatches.length > 0) {
      highlightedMatches.forEach(el => {
        if (el && el.classList && typeof el.classList.remove === 'function') {
          el.classList.remove('pureshield-picker-highlight');
          el.classList.remove('pureshield-preview-hidden');
        }
      });
      highlightedMatches = [];
    }
  }

  function clearHighlightsAndPreviews() {
    clearMatchedElementStyles();
    if (hoveredElement && hoveredElement.classList && typeof hoveredElement.classList.remove === 'function') {
      hoveredElement.classList.remove('pureshield-picker-highlight');
      hoveredElement = null;
    }
    if (ancestryChain.length > 0) {
      ancestryChain.forEach(el => {
        if (el && el.classList && typeof el.classList.remove === 'function') {
          el.classList.remove('pureshield-picker-highlight');
          el.classList.remove('pureshield-preview-hidden');
        }
      });
      ancestryChain = [];
    }
    selectedElement = null;
    selectedIndex = 0;
    previewActive = false;
  }

  function buildToolbarHTML() {
    if (!pickerToolbar) return;

    pickerToolbar.innerHTML = `
      <div class="pureshield-toolbar-left">
        <div class="pureshield-toolbar-title-row">
          <span class="pureshield-toolbar-title">⚡ Element Zapper</span>
          <span class="pureshield-status-pill live" id="pureshield-status-pill">Click Element</span>
        </div>
        <div class="pureshield-depth-badge" id="pureshield-depth-badge">Select an element</div>
      </div>

      <div class="pureshield-toolbar-middle" id="pureshield-toolbar-middle">
        <div class="pureshield-lever-container">
          <button class="pureshield-btn-step" id="pureshield-btn-narrow" title="Narrow selection to child element (←)">➖</button>
          <input type="range" class="pureshield-lever" id="pureshield-picker-lever" min="0" max="1" step="1" value="0" title="Slide to adjust selection scope / container depth">
          <button class="pureshield-btn-step" id="pureshield-btn-expand" title="Expand selection to parent container (→)">➕</button>
          <button class="pureshield-btn-mode smart" id="pureshield-picker-mode" title="Toggle between Smart (blocks similar ad slots across all pages) and Exact (only this exact position) mode (M)">
            🧠 Smart Mode
          </button>
        </div>
        <div class="pureshield-selector-row">
          <input type="text" class="pureshield-selector-badge" id="pureshield-selector-badge" value="" placeholder="Click any element on page" title="Editable CSS Selector">
          <span class="pureshield-match-badge" id="pureshield-match-badge" title="Number of elements matched on this page">0 matches</span>
        </div>
      </div>

      <div class="pureshield-toolbar-actions">
        <button class="pureshield-btn-preview" id="pureshield-picker-preview" title="Preview page with matched elements hidden (P)">
          👁️ Preview
        </button>
        <button class="pureshield-btn-zap" id="pureshield-picker-zap" title="Permanently vaporize matched elements (Enter)">
          ⚡ Vaporize (Enter)
        </button>
        <button class="pureshield-btn-repick" id="pureshield-picker-repick" style="display:none;" title="Unlock and pick another element">
          ↺ Pick Other
        </button>
        <button class="pureshield-btn-undo" id="pureshield-picker-undo" title="Undo last zapped element on this site (Ctrl+Z)">
          ↩ Undo
        </button>
        <button class="pureshield-btn-cancel" id="pureshield-picker-cancel" title="Exit Element Zapper (Esc)">
          ✕ Exit
        </button>
      </div>
    `;

    const lever = pickerToolbar.querySelector('#pureshield-picker-lever');
    if (lever) {
      lever.addEventListener('input', (e) => {
        handleLeverChange(parseInt(e.target.value, 10));
      });
    }

    const btnNarrow = pickerToolbar.querySelector('#pureshield-btn-narrow');
    if (btnNarrow) {
      btnNarrow.addEventListener('click', () => {
        handleLeverChange(Math.max(0, selectedIndex - 1));
      });
    }

    const btnExpand = pickerToolbar.querySelector('#pureshield-btn-expand');
    if (btnExpand) {
      btnExpand.addEventListener('click', () => {
        handleLeverChange(Math.min(Math.max(0, ancestryChain.length - 1), selectedIndex + 1));
      });
    }

    const modeBtn = pickerToolbar.querySelector('#pureshield-picker-mode');
    if (modeBtn) {
      modeBtn.addEventListener('click', togglePickerMode);
    }

    const selectorInput = pickerToolbar.querySelector('#pureshield-selector-badge');
    if (selectorInput) {
      selectorInput.addEventListener('input', (e) => {
        isLocked = true;
        customEditedSelector = e.target.value;
        updateHighlightAndPreview();
        updateToolbarUI(true);
      });
      selectorInput.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
          e.preventDefault();
          handleAcceptZap();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          selectorInput.blur();
        }
      });
    }

    const previewBtn = pickerToolbar.querySelector('#pureshield-picker-preview');
    if (previewBtn) {
      previewBtn.addEventListener('click', togglePreview);
    }

    const zapBtn = pickerToolbar.querySelector('#pureshield-picker-zap');
    if (zapBtn) {
      zapBtn.addEventListener('click', handleAcceptZap);
    }

    const repickBtn = pickerToolbar.querySelector('#pureshield-picker-repick');
    if (repickBtn) {
      repickBtn.addEventListener('click', handleUnlockSelection);
    }

    const undoBtn = pickerToolbar.querySelector('#pureshield-picker-undo');
    if (undoBtn) {
      undoBtn.addEventListener('click', handleUndoZap);
    }

    const cancelBtn = pickerToolbar.querySelector('#pureshield-picker-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', deactivateElementPicker);
    }
  }

  function togglePickerMode() {
    pickerSmartMode = !pickerSmartMode;
    customEditedSelector = '';
    updateHighlightAndPreview();
    updateToolbarUI();
  }

  function updateToolbarUI(skipSelectorInputUpdate = false) {
    if (!pickerToolbar) return;

    const statusPill = pickerToolbar.querySelector('#pureshield-status-pill');
    const depthBadge = pickerToolbar.querySelector('#pureshield-depth-badge');
    const selectorBadge = pickerToolbar.querySelector('#pureshield-selector-badge');
    const matchBadge = pickerToolbar.querySelector('#pureshield-match-badge');
    const modeBtn = pickerToolbar.querySelector('#pureshield-picker-mode');
    const lever = pickerToolbar.querySelector('#pureshield-picker-lever');
    const btnNarrow = pickerToolbar.querySelector('#pureshield-btn-narrow');
    const btnExpand = pickerToolbar.querySelector('#pureshield-btn-expand');
    const previewBtn = pickerToolbar.querySelector('#pureshield-picker-preview');
    const repickBtn = pickerToolbar.querySelector('#pureshield-picker-repick');
    const undoBtn = pickerToolbar.querySelector('#pureshield-picker-undo');

    // Update Lock & Status Pill
    if (statusPill) {
      if (isLocked) {
        statusPill.className = 'pureshield-status-pill locked';
        statusPill.textContent = '🔒 Locked (Tuning)';
      } else {
        statusPill.className = 'pureshield-status-pill live';
        statusPill.textContent = '🎯 Live Hover';
      }
    }

    if (modeBtn) {
      if (pickerSmartMode) {
        modeBtn.className = 'pureshield-btn-mode smart';
        modeBtn.innerHTML = '🧠 Smart (All Similar)';
      } else {
        modeBtn.className = 'pureshield-btn-mode exact';
        modeBtn.innerHTML = '🎯 Exact (Single)';
      }
    }

    if (repickBtn) {
      repickBtn.style.display = isLocked ? 'inline-flex' : 'none';
    }

    // Update active element details
    const currEl = ancestryChain[selectedIndex] || selectedElement || hoveredElement;
    const selector = getActiveSelector();

    if ((currEl && currEl.nodeType === Node.ELEMENT_NODE) || selector) {
      const tag = currEl ? currEl.tagName.toLowerCase() : 'custom';
      const totalLevels = Math.max(1, ancestryChain.length);

      if (depthBadge) {
        depthBadge.textContent = currEl ? `Level ${selectedIndex + 1}/${totalLevels} <${tag}>` : 'Custom Selector';
      }
      if (selectorBadge && !skipSelectorInputUpdate) {
        selectorBadge.value = selector;
        selectorBadge.title = selector;
      }
      if (matchBadge) {
        let count = 0;
        if (selector) {
          try {
            count = document.querySelectorAll(selector).length;
          } catch (_) {
            count = -1;
          }
        }
        if (count === -1) {
          matchBadge.textContent = 'Invalid CSS';
          matchBadge.className = 'pureshield-match-badge invalid';
        } else {
          matchBadge.textContent = count === 1 ? '1 match' : `${count} matches`;
          matchBadge.className = count > 1 ? 'pureshield-match-badge multi' : 'pureshield-match-badge';
        }
      }
      if (lever) {
        lever.max = Math.max(0, ancestryChain.length - 1);
        lever.value = selectedIndex;
      }
      if (btnNarrow) btnNarrow.disabled = (selectedIndex <= 0);
      if (btnExpand) btnExpand.disabled = (selectedIndex >= ancestryChain.length - 1 || ancestryChain.length <= 1);
    } else {
      if (depthBadge) depthBadge.textContent = 'Click an element to adjust';
      if (selectorBadge && !skipSelectorInputUpdate) {
        selectorBadge.value = '';
        selectorBadge.placeholder = 'Click any element to tune size';
      }
      if (matchBadge) {
        matchBadge.textContent = '0 matches';
        matchBadge.className = 'pureshield-match-badge';
      }
      if (lever) {
        lever.max = 0;
        lever.value = 0;
      }
      if (btnNarrow) btnNarrow.disabled = true;
      if (btnExpand) btnExpand.disabled = true;
    }

    // Update Preview Button
    if (previewBtn) {
      if (previewActive) {
        previewBtn.classList.add('pureshield-btn-preview-active');
        previewBtn.innerHTML = '👁️ Preview: Hidden';
      } else {
        previewBtn.classList.remove('pureshield-btn-preview-active');
        previewBtn.innerHTML = '👁️ Preview';
      }
    }

    // Update Undo Button with rules count
    chrome.storage.local.get(['customCosmeticRules'], (data) => {
      const customRules = data.customCosmeticRules || {};
      const domainRules = customRules[hostname] || [];
      const totalUndoable = domainRules.length;

      if (undoBtn) {
        if (totalUndoable > 0) {
          undoBtn.innerHTML = `↩ Undo (${totalUndoable})`;
          undoBtn.classList.remove('disabled');
          undoBtn.disabled = false;
        } else {
          undoBtn.innerHTML = `↩ Undo`;
          undoBtn.classList.add('disabled');
        }
      }
    });
  }

  function handlePickerMouseOver(e) {
    if (!pickerActive || isLocked) return;
    const target = e.target;
    if (isExtensionElement(target) || target === document.body || target === document.documentElement) return;

    if (hoveredElement && hoveredElement !== target) {
      hoveredElement.classList.remove('pureshield-picker-highlight');
    }

    hoveredElement = target;
    customEditedSelector = '';
    ancestryChain = buildAncestryChain(target);
    selectedIndex = getInitialChainIndex(ancestryChain);
    selectedElement = ancestryChain[selectedIndex] || ancestryChain[0];

    updateHighlightAndPreview();
    updateToolbarUI();
  }

  function handlePickerMouseOut(e) {
    if (!pickerActive || isLocked) return;
    if (e.target && e.target.classList) {
      e.target.classList.remove('pureshield-picker-highlight');
    }
  }

  function handlePickerClick(e) {
    if (!pickerActive) return;
    const target = e.target;
    if (isExtensionElement(target)) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    // Lock onto the clicked element and open adjustment controls
    if (hoveredElement) {
      hoveredElement.classList.remove('pureshield-picker-highlight');
      hoveredElement = null;
    }

    customEditedSelector = '';
    ancestryChain = buildAncestryChain(target);
    selectedIndex = getInitialChainIndex(ancestryChain);
    selectedElement = ancestryChain[selectedIndex] || ancestryChain[0];
    isLocked = true;
    previewActive = false;

    updateHighlightAndPreview();
    updateToolbarUI();
  }

  function handleLeverChange(newIndex) {
    if (newIndex < 0 || newIndex >= ancestryChain.length) return;
    selectedIndex = newIndex;
    selectedElement = ancestryChain[selectedIndex];
    customEditedSelector = '';
    isLocked = true; // Lock onto element so user can tune depth smoothly

    updateHighlightAndPreview();
    updateToolbarUI();
  }

  function togglePreview() {
    previewActive = !previewActive;
    updateHighlightAndPreview();
    updateToolbarUI();
  }

  function updateHighlightAndPreview() {
    clearMatchedElementStyles();
    ancestryChain.forEach(el => {
      if (el && el.classList && typeof el.classList.remove === 'function') {
        el.classList.remove('pureshield-picker-highlight');
        el.classList.remove('pureshield-preview-hidden');
      }
    });

    const activeEl = ancestryChain[selectedIndex] || selectedElement || hoveredElement;
    const selector = getActiveSelector();
    const classToAdd = previewActive ? 'pureshield-preview-hidden' : 'pureshield-picker-highlight';

    if (selector) {
      try {
        const matches = Array.from(document.querySelectorAll(selector)).filter(el => !isExtensionElement(el));
        if (matches.length > 0 && matches.length <= 50) {
          matches.forEach(el => {
            if (el.classList) {
              el.classList.add(classToAdd);
              highlightedMatches.push(el);
            }
          });
          return;
        }
      } catch (_) {}
    }

    if (activeEl && activeEl.classList && typeof activeEl.classList.add === 'function') {
      activeEl.classList.add(classToAdd);
      highlightedMatches.push(activeEl);
    }
  }

  function handleUnlockSelection() {
    isLocked = false;
    previewActive = false;
    customEditedSelector = '';
    updateHighlightAndPreview();
    updateToolbarUI();
  }

  function handleAcceptZap() {
    const targetEl = ancestryChain[selectedIndex] || selectedElement || hoveredElement;
    const selector = getActiveSelector();
    if (!selector) return;

    // Validate CSS selector before saving
    try {
      document.querySelectorAll(selector);
    } catch (_) {
      showZapperToast('⚠️ Invalid Selector', 'Please enter a valid CSS selector.');
      return;
    }

    // 1. Immediately hide the target element & matching elements in the DOM
    const hideNode = (node) => {
      if (!node || node.nodeType !== Node.ELEMENT_NODE || isExtensionElement(node)) return;
      node.style.setProperty('display', 'none', 'important');
      node.style.setProperty('visibility', 'hidden', 'important');
      node.style.setProperty('pointer-events', 'none', 'important');
      node.style.setProperty('height', '0', 'important');
      node.style.setProperty('width', '0', 'important');
      node.style.setProperty('opacity', '0', 'important');
      node.setAttribute('data-pureshield-zapped', 'true');
    };

    if (targetEl) hideNode(targetEl);
    let matchCount = 0;
    try {
      const matchedNodes = document.querySelectorAll(selector);
      matchCount = matchedNodes.length;
      matchedNodes.forEach(hideNode);
    } catch (_) {}

    // 2. Synchronously append rule to cosmetic style sheet
    const styleEl = ensureCosmeticStyles();
    const zapRule = `${selector} { display: none !important; visibility: hidden !important; pointer-events: none !important; height: 0 !important; width: 0 !important; opacity: 0 !important; }`;
    styleEl.textContent += '\n' + zapRule;
    if (!activeCosmeticSelectors.includes(selector)) {
      activeCosmeticSelectors.push(selector);
    }

    // 3. Deactivate picker immediately so user exits selection mode cleanly
    deactivateElementPicker();

    // 4. Show friendly feedback toast with immediate undo
    const toastTitle = matchCount > 1 ? `⚡ ${matchCount} Elements Vaporized` : '⚡ Element Vaporized';
    showZapperToast(toastTitle, selector, () => {
      handleUndoZap();
    });

    // 5. Persist the rule under both hostname and normalized domain
    chrome.storage.local.get(['customCosmeticRules'], (data) => {
      const customRules = data.customCosmeticRules || {};
      const canonical = hostname.replace(/^www\./i, '');
      const domainsToUpdate = [hostname];
      if (canonical !== hostname) {
        domainsToUpdate.push(canonical);
      }
      domainsToUpdate.forEach(d => {
        if (!customRules[d]) customRules[d] = [];
        if (!customRules[d].includes(selector)) {
          customRules[d].push(selector);
        }
      });

      sessionZapHistory.push(selector);
      if (sessionZapHistory.length > 50) sessionZapHistory.shift();

      chrome.storage.local.set({ customCosmeticRules: customRules });
    });
  }

  function handleUndoZap() {
    chrome.storage.local.get(['customCosmeticRules'], (data) => {
      const customRules = data.customCosmeticRules || {};
      const hostRules = customRules[hostname] || [];
      const normRules = (normalizedDomain !== hostname && customRules[normalizedDomain]) || [];
      const domainRules = Array.from(new Set([...hostRules, ...normRules]));

      if (domainRules.length === 0 && sessionZapHistory.length === 0) {
        showZapperToast('Notice', 'No zapped items to undo on this site.');
        return;
      }

      let removedSelector = sessionZapHistory.pop();
      if (!removedSelector && domainRules.length > 0) {
        removedSelector = domainRules.pop();
      }

      if (removedSelector) {
        const canonical = hostname.replace(/^www\./i, '');
        const domainsToUpdate = [hostname];
        if (canonical !== hostname) {
          domainsToUpdate.push(canonical);
        }
        domainsToUpdate.forEach(d => {
          if (customRules[d]) {
            const idx = customRules[d].indexOf(removedSelector);
            if (idx !== -1) customRules[d].splice(idx, 1);
          }
        });
      }

      chrome.storage.local.set({ customCosmeticRules: customRules }, () => {
        applyCustomCosmeticRules(customRules);

        // Restore any elements previously hidden inline with this selector
        if (removedSelector) {
          try {
            document.querySelectorAll(removedSelector).forEach(el => {
              if (el.getAttribute('data-pureshield-zapped') === 'true') {
                el.removeAttribute('data-pureshield-zapped');
                el.style.removeProperty('display');
                el.style.removeProperty('visibility');
                el.style.removeProperty('pointer-events');
                el.style.removeProperty('height');
                el.style.removeProperty('width');
                el.style.removeProperty('opacity');
              }
            });
          } catch (_) {}
        }

        showZapperToast('↩️ Element Restored', removedSelector || 'Selector restored');
        if (pickerActive) {
          isLocked = false;
          clearHighlightsAndPreviews();
          updateToolbarUI();
        }
      });
    });
  }

  function handlePickerKeyDown(e) {
    if (e.target && e.target.id === 'pureshield-selector-badge') return;
    if (e.key === 'Escape') {
      if (isLocked) {
        handleUnlockSelection();
      } else {
        deactivateElementPicker();
      }
    } else {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAcceptZap();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        const newIdx = Math.max(0, selectedIndex - 1);
        handleLeverChange(newIdx);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        const newIdx = Math.min(Math.max(0, ancestryChain.length - 1), selectedIndex + 1);
        handleLeverChange(newIdx);
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        togglePreview();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        togglePickerMode();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        handleUndoZap();
      }
    }
  }

  /* ==========================================================================
     9. MESSAGE HANDLERS
     ========================================================================== */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'startElementPicker') {
      if (window !== window.top) return false;
      activateElementPicker();
      sendResponse({ status: 'picker_started' });
    } else if (message.action === 'syncSettings') {
      syncSettings();
      sendResponse({ status: 'synced' });
    }
    return false; // Responses sent synchronously
  });
})();
