/**
 * XtremeShld - Options & Control Center Controller (v1.0.31)
 * Manages protection toggles, advanced optional shields, interactive info modals,
 * domain whitelists, custom cosmetic filters, activity logs, backup/restore,
 * multi-language localization (EN, ES, ZH, RU), Light/Dark tone theme, and extension update checks.
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

  // Theme, Language & Update Elements
  const themeSelector = document.getElementById('theme-selector');
  const languageSelector = document.getElementById('language-selector');
  const btnUpdateNow = document.getElementById('btn-update-now');
  const updateBtnIcon = document.getElementById('update-btn-icon');
  const updateBtnText = document.getElementById('update-btn-text');

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
     1. INTERNATIONALIZATION & LOCALIZATION CONTROLLER
     ========================================================================== */
  let currentLanguage = 'en';

  function getTranslation(key) {
    const dict = window.TRANSLATIONS?.[currentLanguage] || window.TRANSLATIONS?.['en'] || {};
    return dict[key] || window.TRANSLATIONS?.['en']?.[key] || key;
  }

  function applyLanguage(lang) {
    if (!window.TRANSLATIONS || !window.TRANSLATIONS[lang]) lang = 'en';
    currentLanguage = lang;
    const dict = window.TRANSLATIONS[lang];

    // Update document language
    document.documentElement.lang = lang;

    // Update static data-i18n elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) {
        if (dict[key].includes('<') && dict[key].includes('>')) {
          el.innerHTML = dict[key];
        } else {
          el.textContent = dict[key];
        }
      }
    });

    // Update placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (dict[key]) {
        el.placeholder = dict[key];
      }
    });

    // Update all 19 feature toggles' titles and descriptions
    Object.keys(toggles).forEach(key => {
      const el = toggles[key];
      if (!el) return;
      const row = el.closest('.setting-row');
      if (!row) return;

      const titleSpan = row.querySelector('.setting-title');
      const descSpan = row.querySelector('.setting-desc');

      if (titleSpan && dict.features?.[key]?.title) {
        const infoBtn = titleSpan.querySelector('.info-btn');
        if (titleSpan.firstChild && titleSpan.firstChild !== infoBtn) {
          titleSpan.firstChild.textContent = dict.features[key].title + ' ';
        } else {
          titleSpan.insertBefore(document.createTextNode(dict.features[key].title + ' '), infoBtn);
        }
        if (infoBtn) {
          infoBtn.title = dict.info_button_title || 'Detailed Information';
        }
      }

      if (descSpan && dict.features?.[key]?.desc) {
        descSpan.textContent = dict.features[key].desc;
      }
    });

    // Re-render empty states if containers are empty
    const currentEmptyWhitelist = whitelistContainer.querySelector('[data-i18n="whitelist_empty"]');
    if (currentEmptyWhitelist) {
      currentEmptyWhitelist.textContent = dict.whitelist_empty;
    }

    const currentEmptyCosmetic = cosmeticContainer.querySelector('[data-i18n="zapped_empty"]');
    if (currentEmptyCosmetic) {
      currentEmptyCosmetic.textContent = dict.zapped_empty;
    }

    const currentEmptyLogs = logsContainer.querySelector('[data-i18n="logs_empty"]');
    if (currentEmptyLogs) {
      currentEmptyLogs.textContent = dict.logs_empty;
    }
  }

  // Language selector listener
  languageSelector?.addEventListener('change', async (e) => {
    const selected = e.target.value;
    applyLanguage(selected);
    await chrome.storage.local.set({ language: selected });
  });

  /* ==========================================================================
     THEME (LIGHT / DARK TONE) CONTROLLER
     ========================================================================== */
  function applyTheme(theme) {
    const t = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
    if (themeSelector) themeSelector.value = t;
  }

  themeSelector?.addEventListener('change', async (e) => {
    const newTheme = e.target.value;
    applyTheme(newTheme);
    await chrome.storage.local.set({ theme: newTheme });
  });

  // Cross-context synchronization (sync if changed from popup)
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      if (changes.theme) {
        applyTheme(changes.theme.newValue);
      }
      if (changes.language && changes.language.newValue !== currentLanguage) {
        applyLanguage(changes.language.newValue);
        if (languageSelector) languageSelector.value = changes.language.newValue;
      }
    }
  });

  /* ==========================================================================
     2. UPDATE NOW BUTTON (Live Chrome Web Store / Extension Check)
     ========================================================================== */
  let isCheckingUpdate = false;

  btnUpdateNow?.addEventListener('click', () => {
    if (isCheckingUpdate) return;
    isCheckingUpdate = true;
    btnUpdateNow.classList.add('is-checking');
    updateBtnIcon?.classList.add('spin');
    if (updateBtnText) updateBtnText.textContent = getTranslation('checking_update');

    try {
      if (typeof chrome.runtime.requestUpdateCheck === 'function') {
        chrome.runtime.requestUpdateCheck((status, details) => {
          updateBtnIcon?.classList.remove('spin');
          btnUpdateNow.classList.remove('is-checking');

          if (status === 'update_available') {
            btnUpdateNow.classList.add('is-success');
            if (updateBtnText) updateBtnText.textContent = getTranslation('update_available');
            setTimeout(() => {
              chrome.runtime.reload();
            }, 1200);
          } else if (status === 'throttled') {
            if (updateBtnText) updateBtnText.textContent = getTranslation('update_throttled');
            setTimeout(() => {
              if (updateBtnText) updateBtnText.textContent = getTranslation('btn_update_now');
              isCheckingUpdate = false;
            }, 2500);
          } else {
            // 'no_update'
            btnUpdateNow.classList.add('is-success');
            const ver = chrome.runtime.getManifest().version;
            if (updateBtnText) updateBtnText.textContent = getTranslation('update_latest') + ' (v' + ver + ')';
            setTimeout(() => {
              btnUpdateNow.classList.remove('is-success');
              if (updateBtnText) updateBtnText.textContent = getTranslation('btn_update_now');
              isCheckingUpdate = false;
            }, 3000);
          }
        });
      } else {
        throw new Error('requestUpdateCheck not supported');
      }
    } catch (err) {
      updateBtnIcon?.classList.remove('spin');
      btnUpdateNow.classList.remove('is-checking');
      const ver = chrome.runtime.getManifest().version;
      if (updateBtnText) updateBtnText.textContent = getTranslation('update_latest') + ' (v' + ver + ')';
      setTimeout(() => {
        if (updateBtnText) updateBtnText.textContent = getTranslation('btn_update_now');
        isCheckingUpdate = false;
      }, 2500);
    }
  });

  /* ==========================================================================
     3. DETAILED EXPLANATION MODAL FOR INFO BUTTONS (ℹ️)
     ========================================================================== */
  function showFeatureInfo(key) {
    const langDict = window.TRANSLATIONS?.[currentLanguage] || window.TRANSLATIONS?.['en'] || {};
    const details = langDict.feature_details?.[key] || window.TRANSLATIONS?.['en']?.feature_details?.[key];
    if (!details) return;

    infoModalTitle.textContent = details.title;
    infoModalContent.innerHTML = `
      <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 12px; margin-bottom: 4px;">
        <div style="font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">${langDict.modal_what || '🔍 What it does'}</div>
        <div>${details.whatItDoes}</div>
      </div>
      <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: var(--radius-md); padding: 12px; margin-bottom: 4px;">
        <div style="font-weight: 700; color: var(--accent-emerald); margin-bottom: 4px;">${langDict.modal_benefit || '🛡️ Privacy & Security Benefit'}</div>
        <div>${details.benefit}</div>
      </div>
      <div style="background: rgba(6, 182, 212, 0.1); border: 1px solid rgba(6, 182, 212, 0.3); border-radius: var(--radius-md); padding: 12px;">
        <div style="font-weight: 700; color: var(--accent-cyan); margin-bottom: 4px;">${langDict.modal_compat || '⚙️ Compatibility & Experience'}</div>
        <div>${details.compat}</div>
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
     4. LOAD SETTINGS & INITIALIZE UI
     ========================================================================== */
  async function loadAllSettings() {
    const data = await chrome.storage.local.get([
      'theme',
      'language',
      'settings',
      'whitelistedDomains',
      'customCosmeticRules',
      'trackerLogs'
    ]);

    // Apply saved theme (default to light)
    applyTheme(data.theme || 'light');

    // Determine initial language
    let lang = data.language;
    if (!lang) {
      const navLang = (navigator.language || '').toLowerCase();
      if (navLang.startsWith('es')) lang = 'es';
      else if (navLang.startsWith('zh')) lang = 'zh';
      else if (navLang.startsWith('ru')) lang = 'ru';
      else lang = 'en';
    }
    if (languageSelector) languageSelector.value = lang;
    applyLanguage(lang);

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
     5. TOGGLE EVENT LISTENERS
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
     6. WHITELIST MANAGER
     ========================================================================== */
  function renderWhitelist(list) {
    const dict = window.TRANSLATIONS?.[currentLanguage] || window.TRANSLATIONS?.['en'] || {};
    if (list.length === 0) {
      whitelistContainer.innerHTML = `<div style="color: var(--text-muted); font-size: 12px;" data-i18n="whitelist_empty">${dict.whitelist_empty || 'No whitelisted domains yet.'}</div>`;
      return;
    }

    const removeText = dict.btn_remove || 'Remove';
    whitelistContainer.innerHTML = list.map(domain => `
      <div class="list-item">
        <span>${domain}</span>
        <button class="btn-delete" data-domain="${domain}" title="Remove domain">&times; ${removeText}</button>
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

  btnAddWhitelist?.addEventListener('click', async () => {
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
     7. CUSTOM COSMETIC RULES MANAGER
     ========================================================================== */
  function renderCosmeticRules(rulesMap) {
    const dict = window.TRANSLATIONS?.[currentLanguage] || window.TRANSLATIONS?.['en'] || {};
    const domains = Object.keys(rulesMap);
    if (domains.length === 0) {
      cosmeticContainer.innerHTML = `<div style="color: var(--text-muted); font-size: 12px;" data-i18n="zapped_empty">${dict.zapped_empty || 'No custom hidden elements saved yet.'}</div>`;
      return;
    }

    const removeText = dict.btn_remove || 'Remove';
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
            <button class="btn-delete" data-cosmetic-domain="${domain}" data-cosmetic-sel="${sel}">&times; ${removeText}</button>
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
     8. ACTIVITY LOGS
     ========================================================================== */
  function renderLogs(logs) {
    const dict = window.TRANSLATIONS?.[currentLanguage] || window.TRANSLATIONS?.['en'] || {};
    if (logs.length === 0) {
      logsContainer.innerHTML = `<div style="color: var(--text-muted); font-size: 12px; text-align: center; padding: 20px;" data-i18n="logs_empty">${dict.logs_empty || 'No events recorded in this session.'}</div>`;
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

  btnClearLogs?.addEventListener('click', async () => {
    await chrome.storage.local.set({ trackerLogs: [] });
    renderLogs([]);
  });

  /* ==========================================================================
     9. BACKUP & RESTORE
     ========================================================================== */
  btnExportJson?.addEventListener('click', async () => {
    const data = await chrome.storage.local.get([
      'theme',
      'language',
      'settings',
      'whitelistedDomains',
      'customCosmeticRules',
      'donationSettings'
    ]);

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'xtremeshld_backup_' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  btnImportTrigger?.addEventListener('click', () => {
    fileImportJson?.click();
  });

  fileImportJson?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const imported = JSON.parse(evt.target.result);
        if (typeof imported === 'object') {
          await chrome.storage.local.set(imported);
          alert(getTranslation('import_success'));
          loadAllSettings();
        }
      } catch (err) {
        alert(getTranslation('import_error'));
      }
    };
    reader.readAsText(file);
  });

  btnResetDefaults?.addEventListener('click', async () => {
    if (confirm(getTranslation('reset_confirm'))) {
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
        btn.textContent = getTranslation('copied');
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