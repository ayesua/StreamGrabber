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
    '#truste-consent-track'
  ];

  const processedNodes = new WeakSet();
  let domScanTimeout = null;

  function performOptimizedScan(targetRoot = document) {
    if (isWhitelisted || !targetRoot) return;

    // 1. Strip popunder trigger classes like .popito
    if (settings.blockPopups && targetRoot.querySelectorAll) {
      const popitos = targetRoot.querySelectorAll('.popito');
      for (let i = 0; i < popitos.length; i++) {
        popitos[i].classList.remove('popito');
      }
    }

    // 2. Scan for Tracker elements (Only inspect direct script/img/iframe nodes)
    if (settings.blockTrackers && targetRoot.querySelectorAll) {
      const elements = targetRoot.querySelectorAll('script[src], img[src], iframe[src]');
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

    // 3. Auto-dismiss Cookie Banners
    if (settings.dismissCookieBanners && targetRoot.querySelector) {
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

    // 4. Body Scroll Lock Recovery (if modal blocked)
    if (settings.removeOverlays && document.body) {
      if (document.body.style.overflow === 'hidden') {
        document.body.style.setProperty('overflow', 'auto', 'important');
      }
    }

    // 5. Apply advanced features if enabled
    applyAdvancedFeatures();
  }

  /* ==========================================================================
     IN-STREAM VIDEO AD DEFUSER & AUTO-SKIPPER (High-Performance)
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

      // Only execute if a video element is present on the page (Zero CPU/memory overhead on text/article sites)
      const video = document.querySelector('video');
      if (!video) return;

      // 1. Auto-click visible Skip button by specific class
      for (const sel of SKIP_BUTTON_SELECTORS) {
        const btn = document.querySelector(sel);
        if (btn && btn.offsetParent !== null && typeof btn.click === 'function') {
          btn.click();
          break;
        }
      }

      // 2. Fast-forward video commercial if detected inside ad containers
      const videos = document.querySelectorAll('video');
      for (let i = 0; i < videos.length; i++) {
        const v = videos[i];
        const src = (v.src || v.currentSrc || '').toLowerCase();
        const isAdContainer = v.closest('.ad-container, [class*="ad-container"], [class*="preroll"], [id*="preroll"], .video-ads, .vjs-ad-playing, .is-advertising, [class*="advertising"], [class*="video-overlay"], [id*="videoads"]');
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

    // Check once per second only when videos are active
    setInterval(checkVideoAds, 1000);
  }

  // Schedule scan with requestIdleCallback and 300ms debounce
  function scheduleScan(root) {
    if (domScanTimeout) clearTimeout(domScanTimeout);
    domScanTimeout = setTimeout(() => {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => performOptimizedScan(root), { timeout: 500 });
      } else {
        performOptimizedScan(root);
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

  // MutationObserver throttled with childList filter
  const observer = new MutationObserver((mutations) => {
    if (isWhitelisted) return;
    for (let i = 0; i < mutations.length; i++) {
      if (mutations[i].addedNodes && mutations[i].addedNodes.length > 0) {
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
     8. INTERACTIVE ELEMENT ZAPPER (Always-Visible Lever, Preview & Undo)
     ========================================================================== */
  let pickerActive = false;
  let isLocked = false;
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
    if (window !== window.top) return;
    if (pickerActive) return;
    pickerActive = true;
    isLocked = false;
    previewActive = false;
    selectedIndex = 0;
    ancestryChain = [];

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
        </div>
        <div class="pureshield-selector-row">
          <code class="pureshield-selector-badge" id="pureshield-selector-badge" title="CSS Selector">Click any element on page</code>
        </div>
      </div>

      <div class="pureshield-toolbar-actions">
        <button class="pureshield-btn-preview" id="pureshield-picker-preview" title="Preview page with element hidden (P)">
          👁️ Preview
        </button>
        <button class="pureshield-btn-zap" id="pureshield-picker-zap" title="Permanently vaporize this element (Enter)">
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

  function updateToolbarUI() {
    if (!pickerToolbar) return;

    const statusPill = pickerToolbar.querySelector('#pureshield-status-pill');
    const depthBadge = pickerToolbar.querySelector('#pureshield-depth-badge');
    const selectorBadge = pickerToolbar.querySelector('#pureshield-selector-badge');
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

    if (repickBtn) {
      repickBtn.style.display = isLocked ? 'inline-flex' : 'none';
    }

    // Update active element details
    const currEl = ancestryChain[selectedIndex] || selectedElement || hoveredElement;
    if (currEl && currEl.nodeType === Node.ELEMENT_NODE) {
      const tag = currEl.tagName.toLowerCase();
      const selector = getUniqueSelector(currEl);
      const totalLevels = Math.max(1, ancestryChain.length);

      if (depthBadge) {
        depthBadge.textContent = `Level ${selectedIndex + 1}/${totalLevels} <${tag}>`;
      }
      if (selectorBadge) {
        selectorBadge.textContent = selector;
        selectorBadge.title = selector;
      }
      if (lever) {
        lever.max = Math.max(0, ancestryChain.length - 1);
        lever.value = selectedIndex;
      }
      if (btnNarrow) btnNarrow.disabled = (selectedIndex <= 0);
      if (btnExpand) btnExpand.disabled = (selectedIndex >= ancestryChain.length - 1 || ancestryChain.length <= 1);
    } else {
      if (depthBadge) depthBadge.textContent = 'Click an element to adjust';
      if (selectorBadge) selectorBadge.textContent = 'Click any element to tune size';
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
    ancestryChain = buildAncestryChain(target);
    selectedIndex = 0;
    selectedElement = ancestryChain[0];

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

    ancestryChain = buildAncestryChain(target);
    selectedIndex = 0;
    selectedElement = ancestryChain[0];
    isLocked = true;
    previewActive = false;

    updateHighlightAndPreview();
    updateToolbarUI();
  }

  function handleLeverChange(newIndex) {
    if (newIndex < 0 || newIndex >= ancestryChain.length) return;
    selectedIndex = newIndex;
    selectedElement = ancestryChain[selectedIndex];
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
    // Clear previous highlights and preview styles on chain
    ancestryChain.forEach(el => {
      el.classList.remove('pureshield-picker-highlight');
      el.classList.remove('pureshield-preview-hidden');
    });

    const activeEl = ancestryChain[selectedIndex] || selectedElement || hoveredElement;
    if (!activeEl) return;

    if (previewActive) {
      activeEl.classList.add('pureshield-preview-hidden');
    } else {
      activeEl.classList.add('pureshield-picker-highlight');
    }
  }

  function handleUnlockSelection() {
    isLocked = false;
    previewActive = false;
    updateHighlightAndPreview();
    updateToolbarUI();
  }

  function handleAcceptZap() {
    const targetEl = ancestryChain[selectedIndex] || selectedElement || hoveredElement;
    if (!targetEl) return;

    const selector = getUniqueSelector(targetEl);
    if (!selector) return;

    clearHighlightsAndPreviews();
    isLocked = false;

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
        updateToolbarUI();
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
        isLocked = false;
        clearHighlightsAndPreviews();
        updateToolbarUI();
      });
    });
  }

  function handlePickerKeyDown(e) {
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
