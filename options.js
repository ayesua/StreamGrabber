/**
 * PureShield - Options & Control Center Controller
 * Manages protection toggles, domain whitelists, custom cosmetic filters,
 * live activity logs, configuration import/export, and donation settings.
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
    blockTrackers: document.getElementById('opt-blockTrackers'),
    stripParams: document.getElementById('opt-stripParams'),
    blockFingerprinting: document.getElementById('opt-blockFingerprinting'),
    blockWebRTCLeaks: document.getElementById('opt-blockWebRTCLeaks'),
    dismissCookieBanners: document.getElementById('opt-dismissCookieBanners'),
    defuseAntiAdblock: document.getElementById('opt-defuseAntiAdblock'),
    showToastNotifications: document.getElementById('opt-showToastNotifications')
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

  /* ==========================================================================
     1. LOAD SETTINGS & INITIALIZE UI
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
        toggles[key].checked = settings[key] !== false;
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
     2. TOGGLE EVENT LISTENERS
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
     3. WHITELIST MANAGER
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
     4. CUSTOM COSMETIC RULES MANAGER
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
     5. ACTIVITY LOGS
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
     6. BACKUP & RESTORE
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
