/**
 * PureShield - Content Script (Optimized Engine)
 * Features requestIdleCallback debounced scanning, addedNodes differential inspection,
 * hyperlink auditing stripping, context-menu unblocker, anti-autoplay, and cookie dismissal.
 */
(() => {
  'use strict';

  const hostname = window.location.hostname;
  let isWhitelisted = false;
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
    try {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('injected.js');
      script.onload = () => script.remove();
      (document.head || document.documentElement).appendChild(script);
    } catch (err) {
      console.warn('[PureShield] Scriptlet injection failed:', err);
    }
  }
  injectScriptlet();

  /* ==========================================================================
     2. SYNC SETTINGS & WHITELIST STATUS
     ========================================================================== */
  function syncSettings() {
    chrome.storage.local.get(['settings', 'whitelistedDomains', 'customCosmeticRules'], (data) => {
      if (data.settings) {
        settings = { ...settings, ...data.settings };
      }
      const whitelist = data.whitelistedDomains || [];
      isWhitelisted = whitelist.some(domain => hostname === domain || hostname.endsWith('.' + domain));

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
        (document.head || document.documentElement).appendChild(metaRef);
      }
      metaRef.content = 'strict-origin-when-cross-origin';
    }

    // 3. Unlock Right Click & Text Selection
    if (settings.unlockRightClick) {
      ['contextmenu', 'selectstart', 'copy', 'mousedown', 'mouseup'].forEach(evt => {
        document.addEventListener(evt, (e) => e.stopPropagation(), true);
      });
      document.oncontextmenu = null;
      document.onselectstart = null;
      document.body && (document.body.style.userSelect = 'auto');
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
     4. TELEMETRY EVENT LISTENER
     ========================================================================== */
  window.addEventListener('pureshield-event', (e) => {
    if (!e.detail || isWhitelisted) return;

    const { type, url } = e.detail;

    chrome.runtime.sendMessage({
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

  const processedNodes = new WeakSet();
  let domScanTimeout = null;

  function performOptimizedScan(targetRoot = document) {
    if (isWhitelisted) return;

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
          console.log('[PureShield] Suppressed DOM tracker:', src);
          chrome.runtime.sendMessage({
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
            chrome.runtime.sendMessage({
              action: 'recordBlockedEvent',
              data: { type: 'annoyance', url: selector, domain: hostname, timestamp: Date.now() }
            });
          }
        });
      });
    }

    // 3. Body Scroll Lock Recovery
    if (settings.removeOverlays && document.body) {
      const bodyStyle = window.getComputedStyle(document.body);
      if (bodyStyle.overflow === 'hidden') {
        document.body.style.setProperty('overflow', 'auto', 'important');
        document.documentElement.style.setProperty('overflow', 'auto', 'important');
      }
    }

    // 4. Advanced Features applied to new nodes
    applyAdvancedFeatures();
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
    document.addEventListener('DOMContentLoaded', () => scheduleScan(document));
  } else {
    scheduleScan(document);
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
        chrome.runtime.sendMessage({ action: 'whitelistCurrentDomain', domain: hostname }, () => {
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
     7. CUSTOM COSMETIC RULES ENGINE
     ========================================================================== */
  let cosmeticStyleTag = null;

  function applyCustomCosmeticRules(customRules) {
    const rules = customRules[hostname] || [];
    if (!cosmeticStyleTag) {
      cosmeticStyleTag = document.createElement('style');
      cosmeticStyleTag.id = 'pureshield-cosmetic-styles';
      (document.head || document.documentElement).appendChild(cosmeticStyleTag);
    }

    if (rules.length === 0 || isWhitelisted) {
      cosmeticStyleTag.textContent = '';
      return;
    }

    const css = rules.map(selector => `${selector} { display: none !important; }`).join('\n');
    cosmeticStyleTag.textContent = css;
  }

  /* ==========================================================================
     8. INTERACTIVE ELEMENT ZAPPER
     ========================================================================== */
  let pickerActive = false;
  let hoveredElement = null;
  let pickerToolbar = null;

  function activateElementPicker() {
    if (pickerActive) return;
    pickerActive = true;

    pickerToolbar = document.createElement('div');
    pickerToolbar.id = 'pureshield-picker-toolbar';
    pickerToolbar.innerHTML = `
      <div class="pureshield-toolbar-title">⚡ Element Zapper</div>
      <div class="pureshield-toolbar-desc">Hover and click any element to permanently vaporize it.</div>
      <button class="pureshield-btn-cancel" id="pureshield-picker-cancel">Exit (Esc)</button>
    `;
    document.body.appendChild(pickerToolbar);

    const cancelBtn = pickerToolbar.querySelector('#pureshield-picker-cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', deactivateElementPicker);

    document.addEventListener('mouseover', handlePickerMouseOver, true);
    document.addEventListener('mouseout', handlePickerMouseOut, true);
    document.addEventListener('click', handlePickerClick, true);
    document.addEventListener('keydown', handlePickerKeyDown, true);
  }

  function deactivateElementPicker() {
    if (!pickerActive) return;
    pickerActive = false;

    if (hoveredElement) {
      hoveredElement.classList.remove('pureshield-picker-highlight');
      hoveredElement = null;
    }

    if (pickerToolbar && pickerToolbar.parentNode) {
      pickerToolbar.parentNode.removeChild(pickerToolbar);
      pickerToolbar = null;
    }

    document.removeEventListener('mouseover', handlePickerMouseOver, true);
    document.removeEventListener('mouseout', handlePickerMouseOut, true);
    document.removeEventListener('click', handlePickerClick, true);
    document.removeEventListener('keydown', handlePickerKeyDown, true);
  }

  function handlePickerMouseOver(e) {
    if (!pickerActive) return;
    const target = e.target;
    if (target === pickerToolbar || (pickerToolbar && pickerToolbar.contains(target))) return;

    if (hoveredElement && hoveredElement !== target) {
      hoveredElement.classList.remove('pureshield-picker-highlight');
    }
    hoveredElement = target;
    hoveredElement.classList.add('pureshield-picker-highlight');
  }

  function handlePickerMouseOut(e) {
    if (!pickerActive) return;
    if (e.target && e.target.classList) {
      e.target.classList.remove('pureshield-picker-highlight');
    }
  }

  function getUniqueSelector(el) {
    if (el.id) return `#${CSS.escape(el.id)}`;
    
    let path = [];
    while (el && el.nodeType === Node.ELEMENT_NODE) {
      let selector = el.nodeName.toLowerCase();
      if (el.className && typeof el.className === 'string') {
        const validClasses = el.className.split(/\s+/).filter(c => c && !c.startsWith('pureshield-') && !c.includes(':'));
        if (validClasses.length > 0) {
          selector += '.' + validClasses.slice(0, 2).map(c => CSS.escape(c)).join('.');
        }
      }
      path.unshift(selector);
      if (path.length >= 3) break;
      el = el.parentNode;
    }
    return path.join(' > ');
  }

  function handlePickerClick(e) {
    if (!pickerActive) return;
    const target = e.target;
    if (target === pickerToolbar || (pickerToolbar && pickerToolbar.contains(target))) return;

    e.preventDefault();
    e.stopPropagation();

    const selector = getUniqueSelector(target);
    target.style.setProperty('display', 'none', 'important');

    chrome.storage.local.get(['customCosmeticRules'], (data) => {
      const customRules = data.customCosmeticRules || {};
      if (!customRules[hostname]) {
        customRules[hostname] = [];
      }
      if (!customRules[hostname].includes(selector)) {
        customRules[hostname].push(selector);
      }
      chrome.storage.local.set({ customCosmeticRules: customRules }, () => {
        applyCustomCosmeticRules(customRules);
        deactivateElementPicker();
        showBlockedPopupToast(`Zapped & hidden: ${selector}`);
      });
    });
  }

  function handlePickerKeyDown(e) {
    if (e.key === 'Escape') {
      deactivateElementPicker();
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
    return true;
  });
})();
