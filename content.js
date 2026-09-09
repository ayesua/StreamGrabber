/**
 * PureShield - Content Script (Optimized Engine)
 * Features requestIdleCallback debounced scanning, addedNodes differential inspection,
 * hyperlink auditing stripping, context-menu unblocker, anti-autoplay, and cookie dismissal.
 */
(() => {
  'use strict';

  const hostname = window.location.hostname;

  // Protect critical web applications (Google Workspace, accounts) from invasive scriptlet alterations
  const PROTECTED_SYSTEM_DOMAINS = [
    'mail.google.com',
    'accounts.google.com',
    'docs.google.com',
    'drive.google.com',
    'calendar.google.com',
    'meet.google.com'
  ];
  const isProtectedDomain = PROTECTED_SYSTEM_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d));

  let isWhitelisted = isProtectedDomain;
  let settings = {
    blockPopups: true,
    blockRedirects: true,
    blockTrackers: true,
    blockFingerprinting: true,
    defuseAntiAdblock: true,
    dismissCookieBanners: true,
    removeOverlays: true,
    showToastNotifications: true,
    // Advanced Optional Shields
    stripPingAttributes: false,
    trimReferrers: false,
    unlockRightClick: false,
    blockAutoplay: false
  };

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
      console.warn('[ExtremeShield] Scriptlet injection bypassed:', err);
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
    chrome.storage.local.get(['settings', 'whitelistedDomains', 'customCosmeticRules'], (data) => {
      if (data.settings) {
        settings = { ...settings, ...data.settings };
      }
      const whitelist = data.whitelistedDomains || [];
      isWhitelisted = isProtectedDomain || whitelist.some(domain => hostname === domain || hostname.endsWith('.' + domain));

      if (isWhitelisted) {
        document.documentElement.setAttribute('data-extremeshield-whitelisted', 'true');
      } else {
        document.documentElement.removeAttribute('data-extremeshield-whitelisted');
      }

      // Broadcast config to injected.js
      window.dispatchEvent(new CustomEvent('pureshield-config-sync', {
        detail: {
          blockPopups: settings.blockPopups,
          blockRedirects: settings.blockRedirects,
          blockTrackers: settings.blockTrackers,
          blockFingerprinting: settings.blockFingerprinting,
          defuseAntiAdblock: settings.defuseAntiAdblock,
          whitelisted: isWhitelisted
        }
      }));

      // Apply custom cosmetic hiding rules
      applyCustomCosmeticRules(data.customCosmeticRules || {});

      // Apply Advanced Optional Features
      applyAdvancedFeatures();
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
    'stripchat.com',
    'stripcash.com',
    'strpchat.com',
    'stripchat.org',
    'cam4.com',
    'bongacams.com',
    'chaturbate.com',
    'livejasmin.com',
    'svradv.com',
    'go.svradv.com',
    'svradv',
    'amateurok.net',
    'cherrytale',
    'ero-labs',
    'mybid',
    'ero-labs.art'
  ];

  window.addEventListener('click', (e) => {
    if (isWhitelisted) return;
    let target = e.target;
    while (target && target !== document) {
      if (target.tagName === 'A' || target.tagName === 'AREA') {
        const href = target.getAttribute('href') || target.href || '';
        const hrefLower = String(href).toLowerCase();
        if (SUSPICIOUS_AD_HREFS.some(p => hrefLower.includes(p))) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          console.warn('[ExtremeShield] Intercepted malicious ad link click:', href);
          safeSendMessage({
            action: 'recordBlockedEvent',
            data: { type: 'popup', url: href, domain: hostname, timestamp: Date.now() }
          });
          if (settings.showToastNotifications) {
            showBlockedPopupToast(href);
          }
          return;
        }
      }
      target = target.parentNode;
    }
  }, true);

  /* ==========================================================================
     4. TELEMETRY EVENT LISTENER
     ========================================================================== */
  window.addEventListener('pureshield-event', (e) => {
    if (!e.detail || isWhitelisted) return;

    const { type, url } = e.detail;

    safeSendMessage({
      action: 'recordBlockedEvent',
      data: {
        type: type || 'tracker',
        url: url || 'Blocked Resource',
        domain: hostname,
        timestamp: Date.now()
      }
    });

    if (type === 'popup' && settings.showToastNotifications) {
      showBlockedPopupToast(url);
    }
  });

  /* ==========================================================================
     5. MEMORY-OPTIMIZED DOM SCANNER (requestIdleCallback + Debounce)
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
    '#truste-consent-track'
  ];

  const BUILTIN_COSMETIC_SELECTORS = [
    // ExoClick Overlays, In-Video Banners & Floating Frames
    '.ex-over-front',
    '.ex-over-front-iframe',
    '.ex-over-inner-container',
    '.ex-over-close',
    '.ex-over-background',
    '[class*="ex-over"]',
    '[id*="ex-over"]',
    '[class*="exo-overlay"]',
    '[class*="exo-sticky"]',
    '[class*="exo-float"]',
    '[id*="exo-"]',

    // Floating & Outstream Ad Overlays
    '[class*="floating-ad"]',
    '[class*="floating_ad"]',
    '[id*="floating-ad"]',
    '[class*="ad-floating"]',
    '[class*="ad-sticky"]',
    '[class*="sticky-ad"]',
    '[class*="video-overlay-ad"]',
    '[class*="ad-overlay"]',
    '[id*="ad-overlay"]',
    '[class*="trafficjunky-floating"]',
    '[id*="trafficjunky"]',
    '[class*="tsyndicate"]',
    '[id*="tsyndicate"]',
    '[class*="outstream-ad"]',
    '[id*="outstream"]',
    '.ad-container-floating',
    '.floating-banner-container',
    '.before-player-desktop--source-block',

    // Ad Network Embed IFrames
    'iframe[src*="exosrv.com"]',
    'iframe[src*="exoclick.com"]',
    'iframe[src*="syndication.exoclick.com"]',
    'iframe[src*="trafficjunky"]',
    'iframe[src*="tsyndicate"]',
    'iframe[src*="whitetrafsa"]',
    'iframe[src*="whitetraf.com"]',
    'iframe[src*="magsrv"]',
    'iframe[src*="ero-advertising"]',
    'iframe[src*="adxad.com"]',
    'iframe[src*="juicyads.com"]',
    'iframe[src*="tubecorporate.com"]',
    'iframe[src*="twinred"]',
    'iframe[src*="twinrdsrv"]',
    'iframe[src*="ctjdwm"]',
    '#infinity',
    'script[src*="twinrdsrv"]',
    'script[src*="infinity.js"]',
    'a[href*="ctjdwm.com"]',
    'a[href*="buddhabangxxx.com"]',
    'script[src*="pjs.js"]',
    'script[src*="orbsrv.com"]',
    'iframe[src*="rtb-6.xgroovy.com"]',
    'iframe[src*="rtb-4.xgroovy.com"]',
    '.show_sb',
    '.sb-AB',
    '.sb-A',
    '.sb-B',
    '.sb-title',
    '.sb-close-play',
    'iframe[src*="lazyload.io"]',
    'script[src*="st.pussyspace.com"]',
    '.datasetbox',
    '.exo__loader',
    '.q5425983VxbmVpSh',
    '.f443382VxbmVpSh',
    '.n84183VxbmVpSh'
  ];

  const processedNodes = new WeakSet();
  let domScanTimeout = null;

  function performOptimizedScan(targetRoot = document) {
    if (isWhitelisted) return;

    // 0. Strip popunder trigger classes like .popito
    if (settings.blockPopups && targetRoot.querySelectorAll) {
      const popitos = targetRoot.querySelectorAll('.popito');
      for (let i = 0; i < popitos.length; i++) {
        popitos[i].classList.remove('popito');
      }
    }

    // 1. Scan for Tracker elements
    if (settings.blockTrackers) {
      const elements = targetRoot.querySelectorAll ? targetRoot.querySelectorAll('script[src], img[src], iframe[src]') : [];
      elements.forEach(el => {
        if (processedNodes.has(el)) return;
        processedNodes.add(el);

        const src = el.src || '';
        if (!src) return;

        const isMatch = TRACKER_DOM_PATTERNS.some(pat => src.toLowerCase().includes(pat));
        if (isMatch) {
          console.log('[ExtremeShield] Suppressed DOM tracker:', src);
          safeSendMessage({
            action: 'recordBlockedEvent',
            data: { type: 'tracker', url: src, domain: hostname, timestamp: Date.now() }
          });
        }
      });
    }

    // 2. Auto-dismiss Cookie Banners
    if (settings.dismissCookieBanners) {
      COOKIE_BANNER_SELECTORS.forEach(selector => {
        const banners = document.querySelectorAll(selector);
        banners.forEach(banner => {
          if (banner.style.display !== 'none') {
            banner.style.setProperty('display', 'none', 'important');
            banner.setAttribute('aria-hidden', 'true');
            safeSendMessage({
              action: 'recordBlockedEvent',
              data: { type: 'annoyance', url: selector, domain: hostname, timestamp: Date.now() }
            });
          }
        });
      });
    }

    // 3. Intrusive Overlays & Floating Ad Frames Cleaner
    if (settings.blockPopups || settings.removeOverlays) {
      BUILTIN_COSMETIC_SELECTORS.forEach(selector => {
        try {
          const elements = targetRoot.querySelectorAll ? targetRoot.querySelectorAll(selector) : [];
          elements.forEach(el => {
            if (processedNodes.has(el)) return;
            processedNodes.add(el);

            // Neutralize any iframe within to stop CPU and video execution
            const iframes = el.tagName === 'IFRAME' ? [el] : el.querySelectorAll('iframe');
            iframes.forEach(f => {
              try { f.src = 'about:blank'; } catch (_) {}
            });

            el.style.setProperty('display', 'none', 'important');
            el.style.setProperty('visibility', 'hidden', 'important');
            el.style.setProperty('pointer-events', 'none', 'important');

            try { el.remove(); } catch (_) {}

            safeSendMessage({
              action: 'recordBlockedEvent',
              data: { type: 'annoyance', url: selector, domain: hostname, timestamp: Date.now() }
            });
          });
        } catch (_) {}
      });
    }

    // 4. Body Scroll Lock Recovery
    if (settings.removeOverlays && document.body) {
      const bodyStyle = window.getComputedStyle(document.body);
      if (bodyStyle.overflow === 'hidden') {
        document.body.style.setProperty('overflow', 'auto', 'important');
        document.documentElement.style.setProperty('overflow', 'auto', 'important');
      }
    }

    // 5. Advanced Features applied to new nodes
    applyAdvancedFeatures();
  }

  /* ==========================================================================
     IN-STREAM VIDEO AD DEFUSER & AUTO-SKIPPER
     ========================================================================== */
  function setupVideoAdSkipper() {
    if (isWhitelisted) return;

    const SKIP_BUTTON_SELECTORS = [
      '.skip-button',
      '.video-ad-skip',
      '.video-ad-skip-button',
      '.ad-skip-button',
      '.ad-skip',
      '.skip-ad',
      '.ytp-ad-skip-button',
      '.ytp-ad-skip-button-modern',
      '[class*="skip-button"]',
      '[class*="skip"][class*="ad"]',
      '[class*="ad-skip"]',
      '[class*="kt-player-advertising"] [class*="skip"]',
      '#anc-tst-skip_ad-btn',
      '[id*="skip_ad"]',
      '.video-overlay-skip-txt',
      '.video-overlay-skip',
      '[class*="video-overlay-skip"]',
      'button[aria-label*="skip" i]',
      'button[aria-label*="saltar" i]'
    ];

    function checkVideoAds() {
      if (isWhitelisted) return;

      // 1. Auto-click visible Skip button by selector
      for (const sel of SKIP_BUTTON_SELECTORS) {
        const btn = document.querySelector(sel);
        if (btn && btn.offsetParent !== null && typeof btn.click === 'function') {
          btn.click();
          break;
        }
      }

      // 2. Auto-click Skip buttons by text content (e.g. KVS / custom tube player buttons)
      const candidates = document.querySelectorAll('div, span, button, a, p');
      for (const el of candidates) {
        if (el.children.length === 0 && el.offsetParent !== null) {
          const txt = (el.textContent || '').trim().toUpperCase();
          if (txt === 'SKIP AD' || txt === 'SKIP' || txt === 'SALTAR' || txt === 'SALTAR ANUNCIO' || (txt.startsWith('SKIP IN') && txt.includes('0'))) {
            el.click();
            break;
          }
        }
      }

      // 3. Fast-forward video commercial if detected
      const videos = document.querySelectorAll('video');
      for (const video of videos) {
        const src = (video.src || video.currentSrc || '').toLowerCase();
        const isAdContainer = video.closest('.ad-container, [class*="ad-container"], [class*="preroll"], [id*="preroll"], .video-ads, .vjs-ad-playing, .is-advertising, [class*="advertising"], [class*="video-overlay"], [id*="videoads"]');
        const isAdSource = src.includes('/ad/') ||
                           src.includes('vast') ||
                           src.includes('preroll') ||
                           src.includes('delivery') ||
                           src.includes('trafficjunky') ||
                           src.includes('magsrv') ||
                           src.includes('whitetraf') ||
                           src.includes('tsyndicate') ||
                           src.includes('exosrv') ||
                           src.includes('exoclick') ||
                           src.includes('trafficstars');

        if (isAdContainer || isAdSource) {
          try {
            if (video.duration && !isNaN(video.duration) && video.duration > 0 && video.currentTime < video.duration) {
              video.muted = true;
              video.playbackRate = 16.0;
              video.currentTime = video.duration - 0.1;
            }
          } catch (_) {}
        }
      }
    }

    setInterval(checkVideoAds, 300);
  }

  // Schedule scan with requestIdleCallback and 150ms debounce
  function scheduleScan(root) {
    if (domScanTimeout) clearTimeout(domScanTimeout);
    domScanTimeout = setTimeout(() => {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => performOptimizedScan(root), { timeout: 300 });
      } else {
        performOptimizedScan(root);
      }
    }, 150);
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

  // MutationObserver with differential node processing
  const observer = new MutationObserver((mutations) => {
    if (isWhitelisted) return;
    for (const m of mutations) {
      if (m.addedNodes && m.addedNodes.length > 0) {
        scheduleScan(document);
        break;
      }
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

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
    if (!document.body) return;
    const container = ensureToastContainer();

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
     7. COSMETIC FILTERING ENGINE (Built-in & Custom Rules)
     ========================================================================== */
  let cosmeticStyleTag = null;

  function ensureCosmeticStyles() {
    if (!cosmeticStyleTag) {
      cosmeticStyleTag = document.createElement('style');
      cosmeticStyleTag.id = 'pureshield-cosmetic-styles';
      (document.head || document.documentElement).appendChild(cosmeticStyleTag);
    }
  }

  function applyCustomCosmeticRules(customRules) {
    ensureCosmeticStyles();

    if (isWhitelisted) {
      cosmeticStyleTag.textContent = '';
      return;
    }

    const userRules = (customRules && customRules[hostname]) || [];
    const allRules = [...BUILTIN_COSMETIC_SELECTORS, ...userRules];

    const css = allRules.map(selector => `${selector} { display: none !important; visibility: hidden !important; pointer-events: none !important; height: 0 !important; width: 0 !important; opacity: 0 !important; }`).join('\n');
    cosmeticStyleTag.textContent = css;
  }
  applyCustomCosmeticRules({});

  /* ==========================================================================
     8. INTERACTIVE ELEMENT ZAPPER (Lever, Preview & Undo)
     ========================================================================== */
  let pickerActive = false;
  let pickerState = 'picking'; // 'picking' | 'tuning'
  let hoveredElement = null;
  let selectedElement = null;
  let ancestryChain = [];
  let selectedIndex = 0;
  let previewActive = false;
  let pickerToolbar = null;
  const sessionZapHistory = [];

  function isExtensionElement(el) {
    if (!el) return false;
    return el.id?.startsWith('pureshield-') ||
           el.classList?.contains('pureshield-toast') ||
           el.closest?.('#pureshield-picker-toolbar, #pureshield-toast-container, #pureshield-cosmetic-styles');
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

  function getUniqueSelector(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return '';
    if (el.id && !el.id.startsWith('pureshield-')) {
      return `#${CSS.escape(el.id)}`;
    }

    let path = [];
    let curr = el;
    while (curr && curr.nodeType === Node.ELEMENT_NODE && curr !== document.body && curr !== document.documentElement) {
      if (curr.id && !curr.id.startsWith('pureshield-')) {
        path.unshift(`#${CSS.escape(curr.id)}`);
        break;
      }
      let selector = curr.nodeName.toLowerCase();
      if (curr.className && typeof curr.className === 'string') {
        const validClasses = curr.className.split(/\s+/).filter(c => c && !c.startsWith('pureshield-') && !c.includes(':') && !c.includes('['));
        if (validClasses.length > 0) {
          selector += '.' + validClasses.slice(0, 2).map(c => CSS.escape(c)).join('.');
        }
      }
      path.unshift(selector);
      if (path.length >= 4) break;
      curr = curr.parentElement;
    }
    return path.length > 0 ? path.join(' > ') : (el.nodeName ? el.nodeName.toLowerCase() : '');
  }

  function activateElementPicker() {
    if (pickerActive) return;
    pickerActive = true;
    pickerState = 'picking';

    if (!pickerToolbar) {
      pickerToolbar = document.createElement('div');
      pickerToolbar.id = 'pureshield-picker-toolbar';
      document.body.appendChild(pickerToolbar);
    }

    renderPickerToolbar();

    document.addEventListener('mouseover', handlePickerMouseOver, true);
    document.addEventListener('mouseout', handlePickerMouseOut, true);
    document.addEventListener('click', handlePickerClick, true);
    document.addEventListener('keydown', handlePickerKeyDown, true);
  }

  function deactivateElementPicker() {
    if (!pickerActive) return;
    pickerActive = false;
    pickerState = 'picking';

    clearHighlightsAndPreviews();

    if (pickerToolbar && pickerToolbar.parentNode) {
      pickerToolbar.parentNode.removeChild(pickerToolbar);
      pickerToolbar = null;
    }

    document.removeEventListener('mouseover', handlePickerMouseOver, true);
    document.removeEventListener('mouseout', handlePickerMouseOut, true);
    document.removeEventListener('click', handlePickerClick, true);
    document.removeEventListener('keydown', handlePickerKeyDown, true);
  }

  function clearHighlightsAndPreviews() {
    if (hoveredElement) {
      hoveredElement.classList.remove('pureshield-picker-highlight');
      hoveredElement = null;
    }
    if (ancestryChain.length > 0) {
      ancestryChain.forEach(el => {
        el.classList.remove('pureshield-picker-highlight');
        el.classList.remove('pureshield-preview-hidden');
      });
      ancestryChain = [];
    }
    selectedElement = null;
    selectedIndex = 0;
    previewActive = false;
  }

  function renderPickerToolbar() {
    if (!pickerToolbar) return;

    chrome.storage.local.get(['customCosmeticRules'], (data) => {
      const customRules = data.customCosmeticRules || {};
      const domainRules = customRules[hostname] || [];
      const hasUndoable = domainRules.length > 0 || sessionZapHistory.length > 0;

      if (pickerState === 'picking') {
        pickerToolbar.innerHTML = `
          <div class="pureshield-toolbar-section">
            <div class="pureshield-toolbar-title">⚡ Element Zapper</div>
            <div class="pureshield-toolbar-desc">Hover and click any element to select & tune it.</div>
          </div>
          <div class="pureshield-toolbar-actions">
            <button class="pureshield-btn-undo" id="pureshield-picker-undo" ${hasUndoable ? '' : 'disabled'} title="Undo last zapped item on this domain">
              ↩ Undo
            </button>
            <button class="pureshield-btn-cancel" id="pureshield-picker-cancel" title="Exit Element Zapper">
              ✕ Exit (Esc)
            </button>
          </div>
        `;
      } else if (pickerState === 'tuning') {
        const currEl = ancestryChain[selectedIndex] || selectedElement;
        const currentTag = currEl ? currEl.tagName.toLowerCase() : 'element';
        const currentSelector = getUniqueSelector(currEl);

        pickerToolbar.innerHTML = `
          <div class="pureshield-toolbar-section pureshield-tuning-main">
            <div class="pureshield-tuning-header">
              <span class="pureshield-toolbar-title">🎯 Adjust Selection</span>
              <span class="pureshield-depth-badge" id="pureshield-depth-badge">
                Level ${selectedIndex + 1}/${ancestryChain.length} &lt;${currentTag}&gt;
              </span>
            </div>
            <div class="pureshield-lever-container">
              <span class="pureshield-lever-label">🎯 Element</span>
              <input type="range" class="pureshield-lever" id="pureshield-picker-lever" min="0" max="${Math.max(0, ancestryChain.length - 1)}" step="1" value="${selectedIndex}">
              <span class="pureshield-lever-label">📦 Container</span>
            </div>
            <div class="pureshield-selector-row">
              <code class="pureshield-selector-badge" id="pureshield-selector-badge" title="${currentSelector}">${currentSelector}</code>
            </div>
          </div>
          <div class="pureshield-toolbar-actions">
            <button class="pureshield-btn-preview ${previewActive ? 'pureshield-btn-preview-active' : ''}" id="pureshield-picker-preview" title="Preview page with element hidden (P)">
              ${previewActive ? '👁️ Preview: Hidden' : '👁️ Preview'}
            </button>
            <button class="pureshield-btn-zap" id="pureshield-picker-zap" title="Permanently zap this element (Enter)">
              ⚡ Vaporize (Enter)
            </button>
            <button class="pureshield-btn-repick" id="pureshield-picker-repick" title="Deselect and pick another element">
              ↺ Re-pick
            </button>
            <button class="pureshield-btn-undo" id="pureshield-picker-undo" ${hasUndoable ? '' : 'disabled'} title="Undo last zapped item on this domain">
              ↩ Undo
            </button>
            <button class="pureshield-btn-cancel" id="pureshield-picker-cancel" title="Exit Element Zapper">
              ✕ Exit (Esc)
            </button>
          </div>
        `;

        const lever = pickerToolbar.querySelector('#pureshield-picker-lever');
        if (lever) {
          lever.addEventListener('input', (e) => {
            handleLeverChange(parseInt(e.target.value, 10));
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
          repickBtn.addEventListener('click', resetToPickMode);
        }
      }

      // Wire common action buttons
      const cancelBtn = pickerToolbar.querySelector('#pureshield-picker-cancel');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', deactivateElementPicker);
      }

      const undoBtn = pickerToolbar.querySelector('#pureshield-picker-undo');
      if (undoBtn) {
        undoBtn.addEventListener('click', handleUndoZap);
      }
    });
  }

  function handlePickerMouseOver(e) {
    if (!pickerActive || pickerState !== 'picking') return;
    const target = e.target;
    if (isExtensionElement(target) || target === document.body || target === document.documentElement) return;

    if (hoveredElement && hoveredElement !== target) {
      hoveredElement.classList.remove('pureshield-picker-highlight');
    }
    hoveredElement = target;
    hoveredElement.classList.add('pureshield-picker-highlight');
  }

  function handlePickerMouseOut(e) {
    if (!pickerActive || pickerState !== 'picking') return;
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

    if (pickerState === 'picking') {
      // Enter tuning mode
      if (hoveredElement) {
        hoveredElement.classList.remove('pureshield-picker-highlight');
        hoveredElement = null;
      }

      ancestryChain = buildAncestryChain(target);
      selectedIndex = 0;
      selectedElement = ancestryChain[0];
      pickerState = 'tuning';
      previewActive = false;

      updateHighlightAndPreview();
      renderPickerToolbar();
    }
  }

  function handleLeverChange(newIndex) {
    if (newIndex < 0 || newIndex >= ancestryChain.length) return;
    selectedIndex = newIndex;
    selectedElement = ancestryChain[selectedIndex];

    updateHighlightAndPreview();

    // Update depth badge and selector
    const depthBadge = pickerToolbar?.querySelector('#pureshield-depth-badge');
    const selectorBadge = pickerToolbar?.querySelector('#pureshield-selector-badge');
    if (selectedElement) {
      const tag = selectedElement.tagName.toLowerCase();
      const sel = getUniqueSelector(selectedElement);
      if (depthBadge) depthBadge.textContent = `Level ${selectedIndex + 1}/${ancestryChain.length} <${tag}>`;
      if (selectorBadge) {
        selectorBadge.textContent = sel;
        selectorBadge.title = sel;
      }
    }
  }

  function togglePreview() {
    previewActive = !previewActive;
    updateHighlightAndPreview();
    
    const previewBtn = pickerToolbar?.querySelector('#pureshield-picker-preview');
    if (previewBtn) {
      if (previewActive) {
        previewBtn.classList.add('pureshield-btn-preview-active');
        previewBtn.innerHTML = '👁️ Preview: Hidden';
      } else {
        previewBtn.classList.remove('pureshield-btn-preview-active');
        previewBtn.innerHTML = '👁️ Preview';
      }
    }
  }

  function updateHighlightAndPreview() {
    // Clear previous highlights and preview styles
    ancestryChain.forEach(el => {
      el.classList.remove('pureshield-picker-highlight');
      el.classList.remove('pureshield-preview-hidden');
    });

    const activeEl = ancestryChain[selectedIndex];
    if (!activeEl) return;

    if (previewActive) {
      activeEl.classList.add('pureshield-preview-hidden');
    } else {
      activeEl.classList.add('pureshield-picker-highlight');
    }
  }

  function handleAcceptZap() {
    const targetEl = ancestryChain[selectedIndex] || selectedElement;
    if (!targetEl) return;

    const selector = getUniqueSelector(targetEl);
    if (!selector) return;

    clearHighlightsAndPreviews();

    chrome.storage.local.get(['customCosmeticRules'], (data) => {
      const customRules = data.customCosmeticRules || {};
      if (!customRules[hostname]) {
        customRules[hostname] = [];
      }
      if (!customRules[hostname].includes(selector)) {
        customRules[hostname].push(selector);
      }
      sessionZapHistory.push(selector);

      chrome.storage.local.set({ customCosmeticRules: customRules }, () => {
        applyCustomCosmeticRules(customRules);
        showBlockedPopupToast(`⚡ Vaporized: ${selector}`);
        resetToPickMode();
      });
    });
  }

  function handleUndoZap() {
    chrome.storage.local.get(['customCosmeticRules'], (data) => {
      const customRules = data.customCosmeticRules || {};
      const domainRules = customRules[hostname] || [];

      if (domainRules.length === 0 && sessionZapHistory.length === 0) {
        showBlockedPopupToast('No zapped items to undo on this site.');
        return;
      }

      let removedSelector = sessionZapHistory.pop();
      if (!removedSelector && domainRules.length > 0) {
        removedSelector = domainRules.pop();
      } else if (removedSelector) {
        const idx = domainRules.indexOf(removedSelector);
        if (idx !== -1) domainRules.splice(idx, 1);
      }

      customRules[hostname] = domainRules;

      chrome.storage.local.set({ customCosmeticRules: customRules }, () => {
        applyCustomCosmeticRules(customRules);
        showBlockedPopupToast(`↩️ Restored: ${removedSelector || 'Element'}`);
        resetToPickMode();
      });
    });
  }

  function resetToPickMode() {
    clearHighlightsAndPreviews();
    pickerState = 'picking';
    renderPickerToolbar();
  }

  function handlePickerKeyDown(e) {
    if (e.key === 'Escape') {
      if (pickerState === 'tuning') {
        resetToPickMode();
      } else {
        deactivateElementPicker();
      }
    } else if (pickerState === 'tuning') {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAcceptZap();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        const newIdx = Math.max(0, selectedIndex - 1);
        const lever = pickerToolbar?.querySelector('#pureshield-picker-lever');
        if (lever) lever.value = newIdx;
        handleLeverChange(newIdx);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        const newIdx = Math.min(ancestryChain.length - 1, selectedIndex + 1);
        const lever = pickerToolbar?.querySelector('#pureshield-picker-lever');
        if (lever) lever.value = newIdx;
        handleLeverChange(newIdx);
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        togglePreview();
      }
    }
  }

  /* ==========================================================================
     9. MESSAGE HANDLERS
     ========================================================================== */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'startElementPicker') {
      activateElementPicker();
      sendResponse({ status: 'picker_started' });
    } else if (message.action === 'syncSettings') {
      syncSettings();
      sendResponse({ status: 'synced' });
    }
    return false; // Responses sent synchronously
  });
})();
