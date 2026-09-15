/**
 * ExtremeShield - Options & Control Center Controller
 * Manages protection toggles, advanced optional shields, interactive info modals,
 * domain whitelists, custom cosmetic filters, activity logs, and backup/restore.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Tab Navigation
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-tab');
      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(target)?.classList.add('active');
    });
  });

  // Checkbox Elements
  const toggles = {
    blockPopups: document.getElementById('opt-blockPopups'),
    blockRedirects: document.getElementById('opt-blockRedirects'),
    historyTrapDefense: document.getElementById('opt-historyTrapDefense'),
    fullscreenDefense: document.getElementById('opt-fullscreenDefense'),
    tabWatchdog: document.getElementById('opt-tabWatchdog'),
    blockTrackers: document.getElementById('opt-blockTrackers'),
    shadowDomScanner: document.getElementById('opt-shadowDomScanner'),
    stripParams: document.getElementById('opt-stripParams'),
    blockFingerprinting: document.getElementById('opt-blockFingerprinting'),
    blockWebRTCLeaks: document.getElementById('opt-blockWebRTCLeaks'),
    dismissCookieBanners: document.getElementById('opt-dismissCookieBanners'),
    removeOverlays: document.getElementById('opt-removeOverlays'),
    defuseAntiAdblock: document.getElementById('opt-defuseAntiAdblock'),
    blockMediaPrerolls: document.getElementById('opt-blockMediaPrerolls'),
    showToastNotifications: document.getElementById('opt-showToastNotifications'),
    // Advanced Optional Shields
    stripPingAttributes: document.getElementById('opt-stripPingAttributes'),
    trimReferrers: document.getElementById('opt-trimReferrers'),
    unlockRightClick: document.getElementById('opt-unlockRightClick'),
    blockAutoplay: document.getElementById('opt-blockAutoplay')
  };

  // Whitelist Elements
  const inputWhitelist = document.getElementById('input-whitelist');
  const btnAddWhitelist = document.getElementById('btn-add-whitelist');
  const whitelistContainer = document.getElementById('whitelist-container');

  // Cosmetic Rules Element
  const cosmeticContainer = document.getElementById('cosmetic-container');

  // Logs Element
  const logsContainer = document.getElementById('logs-container');
  const btnClearLogs = document.getElementById('btn-clear-logs');

  // Backup & Restore
  const btnExportJson = document.getElementById('btn-export-json');
  const btnImportTrigger = document.getElementById('btn-import-json-trigger');
  const fileImportJson = document.getElementById('file-import-json');
  const btnResetDefaults = document.getElementById('btn-reset-defaults');

  // Info Modal Elements
  const infoModal = document.getElementById('feature-info-modal');
  const infoModalTitle = document.getElementById('info-modal-title');
  const infoModalContent = document.getElementById('info-modal-content');
  const btnCloseInfoModal = document.getElementById('btn-close-info-modal');
  const btnInfoModalOk = document.getElementById('btn-info-modal-ok');

  /* ==========================================================================
     1. DETAILED EXPLANATION DICTIONARY FOR INFO BUTTONS (ℹ️)
     ========================================================================== */
  const FEATURE_DESCRIPTIONS = {
    'popups': {
      title: '🚫 Aggressive Popup & Popunder Blocker',
      whatItDoes: 'Intercepts window.open, synthetic anchor click triggers, popunders, and zero-click background spawn attempts before new browser contexts can open.',
      benefit: 'Eliminates 100% of deceptive ads, malicious casino/scam spawns, and unwanted browser tab storms.',
      compat: 'Legitimate user-intended popups (such as "Sign in with Google" or OAuth authorization dialogs) are permitted seamlessly.'
    },
    'redirect': {
      title: '🔀 Anti-Redirect & Tab-Under Hijack Shield',
      whatItDoes: 'Intercepts timer-based location changes (location.replace, location.href, and location.assign) and cross-domain navigations triggered without trusted user interaction.',
      benefit: 'Prevents download, tube, and streaming sites from stealthily navigating your active tab away to phishing or ad networks.',
      compat: 'Standard web browsing, Single Page Applications (YouTube, GitHub, X), and direct link clicks work with zero lag.'
    },
    'history-trap': {
      title: '⏪ Anti-History Trapping & Back-Button Hijack Defense',
      whatItDoes: 'Enforces strict rate-limiting on rapid history.pushState and replaceState bursts that abuse the HTML5 History API to flood browser history.',
      benefit: 'Ensures clicking the browser\'s "Back" button always returns you to the previous page instead of trapping you in an endless ad loop.',
      compat: 'Legitimate client-side routers (React, Vue, Next.js) continue functioning normally without interruption.'
    },
    'fullscreen': {
      title: '🖥️ Deceptive Fullscreen Hijack Defense',
      whatItDoes: 'Blocks unauthorized requestFullscreen calls on fake system warnings or page overlays that lack genuine user video interaction gestures.',
      benefit: 'Protects against tech-support lockout scams, fake browser update screens, and fullscreen phishing overlays.',
      compat: 'Full-screen video playback on YouTube, Netflix, and HTML5 video players works smoothly upon clicking full-screen controls.'
    },
    'tab-watchdog': {
      title: '🐕 Background Ad Tab Watchdog',
      whatItDoes: 'Monitors browser tab creation and navigation events in the service worker, immediately terminating ad networks and popunder destinations.',
      benefit: 'Instantly destroys unwanted tabs before they consume system memory, download payloads, or execute tracking scripts.',
      compat: 'Bypassed when protection is disabled, paused, or when initiated from whitelisted domains.'
    },
    'trackers': {
      title: '🛡️ Tracking & Telemetry Armor',
      whatItDoes: 'Blocks network requests and DOM elements associated with cross-site tracking pixels, analytics beacons, heatmaps, and advertising profiling scripts.',
      benefit: 'Stops corporations from harvesting your browsing history and speeds up page load times by up to 40%.',
      compat: 'Recommended to keep permanently enabled.'
    },
    'shadow-dom': {
      title: '🔍 Deep Shadow DOM Tracker Scanner',
      whatItDoes: 'Recursively traverses open Web Component Shadow DOM roots to uncover and remove tracking scripts, tracking pixels, and stealth ad banners.',
      benefit: 'Extends ad and tracking neutralization into modern modular web applications that hide ad elements within isolated Shadow DOM boundaries.',
      compat: 'Optimized with node caching to ensure zero CPU overhead during page scrolling.'
    },
    'url-params': {
      title: '🧹 URL Tracking Parameter Stripper',
      whatItDoes: 'Automatically cleans query tracking tokens (such as utm_source, fbclid, gclid, mc_cid, and msclkid) from clicked links and web addresses.',
      benefit: 'Prevents cross-site behavioral correlation, preserves your privacy when sharing links with friends, and keeps URLs clean.',
      compat: 'Does not alter essential parameters required for site navigation or checkout processes.'
    },
    'fingerprint': {
      title: '🕵️ Canvas & Audio Fingerprint Randomizer',
      whatItDoes: 'Injects imperceptible deterministic microscopic noise into HTML5 Canvas 2D and Web Audio API buffer calculations.',
      benefit: 'Frustrates device fingerprinting scripts by ensuring your browser presents a distinct, untrackable hardware signature on each session.',
      compat: 'Completely imperceptible to human senses; does not distort images, games, or audio playback.'
    },
    'webrtc': {
      title: '🔒 WebRTC IP Leak Defense',
      whatItDoes: 'Restricts WebRTC media routing to default public internet interfaces, preventing local private IP address disclosure on non-proxied UDP connections.',
      benefit: 'Keeps your real internal and VPN-shielded IP addresses concealed from snooping websites.',
      compat: 'Fully compatible with Google Meet, Zoom, Discord, and browser video conferencing tools.'
    },
    'cookies': {
      title: '🍪 Cookie Consent Banner Auto-Dismissal',
      whatItDoes: 'Detects intrusive GDPR and CCPA cookie consent banners (OneTrust, Cookiebot, Didomi, etc.) and auto-dismisses or rejects them without accepting tracking.',
      benefit: 'Clean, unobstructed browsing experience without clicking through annoying consent popups on every site.',
      compat: 'Automatically restores page scrolling if a cookie overlay had locked the document body.'
    },
    'overlays': {
      title: '🪟 Overlay, Backdrop & Scroll Lock Defense',
      whatItDoes: 'Detects transparent click-trap overlays, deceptive paywall backdrops, and restores scrolling when websites freeze overflow.',
      benefit: 'Allows seamless reading and navigation on pages that attempt to lock content behind intrusive sign-up or paywall modals.',
      compat: 'Safe for standard dialogs; only unlocks pages when scrolling has been artificially frozen.'
    },
    'adblock-defuse': {
      title: '🛠️ Anti-Adblock Defuser',
      whatItDoes: 'Neutralizes scripts designed to detect ad blockers and provides safe dummy variables to avert page breakage.',
      benefit: 'Bypasses "Disable your ad blocker to continue" paywalls and nag screens on news and utility portals.',
      compat: 'Recommended to keep enabled for uninterrupted browsing.'
    },
    'media-prerolls': {
      title: '🎬 Video Pre-roll & VAST Defuser (Fix Error 224003)',
      whatItDoes: 'Neutralizes broken video prerolls, skips VAST ad crashes (Error Code 224003), and provides empty compliant VAST XML to video players.',
      benefit: 'Eliminates "This video file cannot be played (Error Code: 224003)" failures and allows immediate video playback without commercials.',
      compat: 'Highly recommended for JWPlayer, Video.js, and HTML5 video streaming websites.'
    },
    'toasts': {
      title: '💬 Popup Blocked Toast Notifications',
      whatItDoes: 'Displays a sleek, discrete floating notification at the bottom corner of the viewport whenever a popup is neutralized, offering 1-click allow or whitelist.',
      benefit: 'Provides transparent real-time feedback on what ExtremeShield is blocking, with instant unblock controls.',
      compat: 'Can be toggled off if you prefer completely silent, background-only blocking.'
    },
    'ping-audit': {
      title: '🔗 Hyperlink Auditing Stripper (<a ping>)',
      whatItDoes: 'Strips ping attributes from HTML hyperlinks embedded by search engines and social networks.',
      benefit: 'Prevents background telemetry beacons from dispatching click-telemetry payloads to analytics servers when you click a search result.',
      compat: 'Optional. Highly recommended for users prioritizing maximum click privacy.'
    },
    'referrer': {
      title: '🌐 Strict Referrer Policy Enforcement',
      whatItDoes: 'Trims cross-origin HTTP Referer headers so external destination websites cannot inspect the exact article or query path you arrived from.',
      benefit: 'Prevents destination servers from learning your specific search queries or internal browsing paths.',
      compat: 'Optional. In rare instances, legacy authentication gateways may require full referrer URLs.'
    },
    'unlock-rightclick': {
      title: '🔓 Unlock Right-Click & Text Selection',
      whatItDoes: 'Restores the browser context menu, text highlighting, and clipboard copy operations on websites that attempt to disable them with event listeners.',
      benefit: 'Restores complete browser control, allowing you to freely copy text, inspect elements, and open links in new tabs.',
      compat: 'Optional. Useful when visiting recipe, academic, or news sites that restrict selection.'
    },
    'autoplay': {
      title: '🔇 Anti-Autoplay Video Shield',
      whatItDoes: 'Prevents unprompted floating or background video players from starting playback with audio upon page load.',
      benefit: 'Saves laptop battery life, reduces network bandwidth consumption, and prevents unexpected loud noise.',
      compat: 'Optional. Media you explicitly start via play buttons will play normally.'
    }
  };

  function showFeatureInfo(key) {
    const info = FEATURE_DESCRIPTIONS[key];
    if (!info) return;

    infoModalTitle.textContent = info.title;
    infoModalContent.innerHTML = `
      <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 12px; margin-bottom: 4px;">
        <div style="font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">🔍 What it does</div>
        <div>${info.whatItDoes}</div>
      </div>
      <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: var(--radius-md); padding: 12px; margin-bottom: 4px;">
        <div style="font-weight: 700; color: var(--accent-emerald); margin-bottom: 4px;">🛡️ Privacy &amp; Security Benefit</div>
        <div>${info.benefit}</div>
      </div>
      <div style="background: rgba(6, 182, 212, 0.1); border: 1px solid rgba(6, 182, 212, 0.3); border-radius: var(--radius-md); padding: 12px;">
        <div style="font-weight: 700; color: var(--accent-cyan); margin-bottom: 4px;">⚙️ Compatibility &amp; Experience</div>
        <div>${info.compat}</div>
      </div>
    `;

    infoModal.classList.add('active');
  }

  // Attach info button listeners
  document.querySelectorAll('.info-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const key = btn.getAttribute('data-info');
      showFeatureInfo(key);
    });
  });

  const closeInfoModal = () => infoModal.classList.remove('active');
  btnCloseInfoModal?.addEventListener('click', closeInfoModal);
  btnInfoModalOk?.addEventListener('click', closeInfoModal);
  infoModal?.addEventListener('click', (e) => {
    if (e.target === infoModal) closeInfoModal();
  });

  /* ==========================================================================
     2. LOAD SETTINGS & INITIALIZE UI
     ========================================================================== */
  async function loadAllSettings() {
    const data = await chrome.storage.local.get([
      'settings',
      'whitelistedDomains',
      'customCosmeticRules',
      'trackerLogs'
    ]);

    const settings = data.settings || {};

    // Populate toggles
    Object.keys(toggles).forEach(key => {
      if (toggles[key]) {
        toggles[key].checked = settings[key] === true || (settings[key] !== false && !['stripPingAttributes', 'trimReferrers', 'unlockRightClick', 'blockAutoplay'].includes(key));
      }
    });

    // Populate Whitelist
    renderWhitelist(data.whitelistedDomains || []);

    // Populate Custom Cosmetic Rules
    renderCosmeticRules(data.customCosmeticRules || {});

    // Populate Activity Logs
    renderLogs(data.trackerLogs || []);
  }

  /* ==========================================================================
     3. TOGGLE EVENT LISTENERS
     ========================================================================== */
  Object.keys(toggles).forEach(key => {
    const el = toggles[key];
    if (el) {
      el.addEventListener('change', async () => {
        const data = await chrome.storage.local.get(['settings']);
        const updated = data.settings || {};
        updated[key] = el.checked;
        await chrome.storage.local.set({ settings: updated });

        if (key === 'blockWebRTCLeaks') {
          chrome.runtime.sendMessage({ action: 'updateWebRTC', enabled: el.checked });
        }
      });
    }
  });

  /* ==========================================================================
     4. WHITELIST MANAGER
     ========================================================================== */
  function renderWhitelist(list) {
    if (list.length === 0) {
      whitelistContainer.innerHTML = `<div style="color: var(--text-muted); font-size: 12px;">No whitelisted domains yet.</div>`;
      return;
    }

    whitelistContainer.innerHTML = list.map(domain => `
      <div class="list-item">
        <span>${domain}</span>
        <button class="btn-delete" data-domain="${domain}" title="Remove domain">&times; Remove</button>
      </div>
    `).join('');

    whitelistContainer.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        const domain = btn.getAttribute('data-domain');
        await chrome.runtime.sendMessage({ action: 'removeWhitelistedDomain', domain });
        const data = await chrome.storage.local.get(['whitelistedDomains']);
        renderWhitelist(data.whitelistedDomains || []);
      });
    });
  }

  btnAddWhitelist.addEventListener('click', async () => {
    let domain = inputWhitelist.value.trim().toLowerCase();
    if (!domain) return;

    try {
      if (domain.startsWith('http://') || domain.startsWith('https://')) {
        domain = new URL(domain).hostname;
      }
    } catch (_) {}

    await chrome.runtime.sendMessage({ action: 'whitelistCurrentDomain', domain });
    inputWhitelist.value = '';
    const data = await chrome.storage.local.get(['whitelistedDomains']);
    renderWhitelist(data.whitelistedDomains || []);
  });

  /* ==========================================================================
     5. CUSTOM COSMETIC RULES MANAGER
     ========================================================================== */
  function renderCosmeticRules(rulesMap) {
    const domains = Object.keys(rulesMap);
    if (domains.length === 0) {
      cosmeticContainer.innerHTML = `<div style="color: var(--text-muted); font-size: 12px;">No custom hidden elements saved yet.</div>`;
      return;
    }

    let html = '';
    domains.forEach(domain => {
      const selectors = rulesMap[domain] || [];
      selectors.forEach(sel => {
        html += `
          <div class="list-item">
            <div>
              <span style="color: var(--accent-emerald); font-weight: 600;">${domain}</span>
              <span style="color: var(--text-secondary); margin-left: 8px;">${sel}</span>
            </div>
            <button class="btn-delete" data-cosmetic-domain="${domain}" data-cosmetic-sel="${sel}">&times; Remove</button>
          </div>
        `;
      });
    });

    cosmeticContainer.innerHTML = html;

    cosmeticContainer.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        const domain = btn.getAttribute('data-cosmetic-domain');
        const selector = btn.getAttribute('data-cosmetic-sel');

        const data = await chrome.storage.local.get(['customCosmeticRules']);
        const customRules = data.customCosmeticRules || {};
        if (customRules[domain]) {
          customRules[domain] = customRules[domain].filter(s => s !== selector);
          if (customRules[domain].length === 0) delete customRules[domain];
        }
        await chrome.storage.local.set({ customCosmeticRules: customRules });
        renderCosmeticRules(customRules);
      });
    });
  }

  /* ==========================================================================
     6. ACTIVITY LOGS
     ========================================================================== */
  function renderLogs(logs) {
    if (logs.length === 0) {
      logsContainer.innerHTML = `<div style="color: var(--text-muted); font-size: 12px; text-align: center; padding: 20px;">No events recorded in this session.</div>`;
      return;
    }

    logsContainer.innerHTML = logs.map(item => {
      const date = new Date(item.timestamp).toLocaleTimeString();
      let displayUrl = item.url || item.domain || 'Resource';
      return `
        <div class="list-item" style="font-size: 12px;">
          <div>
            <span style="color: var(--text-muted); font-size: 11px;">[${date}]</span>
            <span class="tracker-badge" style="margin: 0 6px;">${item.type.toUpperCase()}</span>
            <span style="color: var(--text-primary); font-weight: 500;">${item.domain || ''}</span>
            <span style="color: var(--text-secondary); margin-left: 6px; font-size: 11px;" title="${item.url}">${displayUrl.slice(0, 50)}</span>
          </div>
          <span style="color: var(--accent-cyan); font-size: 11px;">${item.category || ''}</span>
        </div>
      `;
    }).join('');
  }

  btnClearLogs.addEventListener('click', async () => {
    await chrome.storage.local.set({ trackerLogs: [] });
    renderLogs([]);
  });

  /* ==========================================================================
     7. BACKUP & RESTORE
     ========================================================================== */
  btnExportJson.addEventListener('click', async () => {
    const data = await chrome.storage.local.get([
      'settings',
      'whitelistedDomains',
      'customCosmeticRules',
      'donationSettings'
    ]);

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pureshield_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  btnImportTrigger.addEventListener('click', () => {
    fileImportJson.click();
  });

  fileImportJson.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const imported = JSON.parse(evt.target.result);
        if (typeof imported === 'object') {
          await chrome.storage.local.set(imported);
          alert('PureShield configuration successfully imported!');
          loadAllSettings();
        }
      } catch (err) {
        alert('Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
  });

  btnResetDefaults.addEventListener('click', async () => {
    if (confirm('Are you sure you want to reset all PureShield settings to defaults? This will clear custom rules and whitelists.')) {
      await chrome.storage.local.clear();
      chrome.runtime.reload();
    }
  });

  // Copy to Clipboard buttons
  document.querySelectorAll('.btn-copy').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-copy');
      const text = document.getElementById(targetId)?.textContent;
      if (text) {
        navigator.clipboard.writeText(text);
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        btn.style.background = '#10b981';
        btn.style.color = '#000';
        setTimeout(() => {
          btn.textContent = originalText;
          btn.style.background = '';
          btn.style.color = '';
        }, 1500);
      }
    });
  });

  // Initial Load
  loadAllSettings();
});
