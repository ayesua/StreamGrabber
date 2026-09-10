/**
 * PureShield - Popup Controller
 * Manages UI interactions, live tab telemetry, master shield switch,
 * quick protection toggles, tracker inspector, and donation modal.
 */

document.addEventListener('DOMContentLoaded', async () => {
  let currentTab = null;
  let currentHostname = '';
  let isWhitelisted = false;
  let masterEnabled = true;
  let settings = {};

  // DOM Elements
  const masterPowerToggle = document.getElementById('master-power-toggle');
  const shieldBtn = document.getElementById('shield-toggle-btn');
  const heroSection = document.querySelector('.hero-section');
  const currentDomainEl = document.getElementById('current-domain');
  const statusPill = document.getElementById('status-pill');
  const statusText = document.getElementById('status-text');

  const statPopups = document.getElementById('stat-popups');
  const statPopupsTotal = document.getElementById('stat-popups-total');
  const statTrackers = document.getElementById('stat-trackers');
  const statTrackersTotal = document.getElementById('stat-trackers-total');
  const statAnnoyances = document.getElementById('stat-annoyances');
  const statAnnoyancesTotal = document.getElementById('stat-annoyances-total');
  const statSaved = document.getElementById('stat-saved');
  const statTimeSaved = document.getElementById('stat-time-saved');

  const btnCoreZap = document.getElementById('btn-core-zap');
  const btnTogglePopups = document.getElementById('btn-toggle-popups');
  const btnToggleRedirect = document.getElementById('btn-toggle-redirect');
  const btnToggleCookies = document.getElementById('btn-toggle-cookies');
  const btnToggleAdblock = document.getElementById('btn-toggle-adblock-defuse');
  const btnToggleFingerprint = document.getElementById('btn-toggle-fingerprint');
  const btnTogglePrerolls = document.getElementById('btn-toggle-prerolls');
  const btnTogglePause = document.getElementById('btn-toggle-pause');

  const accordionToggle = document.getElementById('accordion-toggle');
  const accordionBody = document.getElementById('accordion-body');
  const trackerCountBadge = document.getElementById('tracker-count-badge');
  const trackerListItems = document.getElementById('tracker-list-items');

  const btnQuickZap = document.getElementById('btn-quick-zap');
  const btnOpenOptions = document.getElementById('btn-open-options');
  const btnOpenDonation = document.getElementById('btn-open-donation');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const donationModal = document.getElementById('donation-modal');

  // 1. Get Current Tab
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;

    if (currentTab && currentTab.url) {
      try {
        const url = new URL(currentTab.url);
        currentHostname = url.hostname;
        currentDomainEl.textContent = currentHostname || 'Internal Page';
      } catch (_) {
        currentDomainEl.textContent = 'Browser System';
      }
    }
  } catch (err) {
    console.warn('[PureShield] Error querying active tab:', err);
  }

  // 2. Load Persisted State & Tab Telemetry
  async function loadState() {
    const data = await chrome.storage.local.get([
      'masterEnabled',
      'settings',
      'whitelistedDomains',
      'stats',
      'donationSettings'
    ]);

    masterEnabled = data.masterEnabled !== false;
    if (masterPowerToggle) {
      masterPowerToggle.checked = masterEnabled;
    }

    settings = data.settings || {};
    const whitelist = data.whitelistedDomains || [];
    isWhitelisted = whitelist.some(d => currentHostname === d || currentHostname.endsWith('.' + d));

    // Update Shield Status
    updateShieldUI();

    // Update Lifetime Stats
    const stats = data.stats || {};
    statPopupsTotal.textContent = `Total: ${stats.totalPopupsBlocked || 0}`;
    statTrackersTotal.textContent = `Total: ${stats.totalTrackersBlocked || 0}`;
    statAnnoyancesTotal.textContent = `Total: ${stats.totalAnnoyancesBlocked || 0}`;

    const totalKB = stats.totalDataSavedKB || 0;
    statSaved.textContent = totalKB > 1024 ? `${(totalKB / 1024).toFixed(1)} MB` : `${totalKB} KB`;
    statTimeSaved.textContent = `${(stats.totalTimeSavedSec || 0).toFixed(1)}s faster`;

    // Update Quick Toggles
    updateToolBtn(btnTogglePopups, settings.blockPopups !== false);
    if (btnToggleRedirect) updateToolBtn(btnToggleRedirect, settings.blockRedirects !== false);
    updateToolBtn(btnToggleCookies, settings.dismissCookieBanners !== false);
    updateToolBtn(btnToggleAdblock, settings.defuseAntiAdblock !== false);
    updateToolBtn(btnToggleFingerprint, settings.blockFingerprinting !== false);
    if (btnTogglePrerolls) updateToolBtn(btnTogglePrerolls, settings.blockMediaPrerolls === true);

    // Update Donation Handles
    const ds = data.donationSettings || { kofi: 'yesuag' };
    const kofiUrl = ds.kofi ? (ds.kofi.startsWith('http') ? ds.kofi : `https://ko-fi.com/${ds.kofi}`) : 'https://ko-fi.com/yesuag';
    const kofiLinkEl = document.getElementById('link-kofi');
    if (kofiLinkEl) kofiLinkEl.href = kofiUrl;

    if (ds.btc) {
      const btcEl = document.getElementById('addr-btc');
      if (btcEl) btcEl.textContent = ds.btc;
    }
    if (ds.eth) {
      const ethEl = document.getElementById('addr-eth');
      if (ethEl) ethEl.textContent = ds.eth;
    }
    if (ds.sol) {
      const solEl = document.getElementById('addr-sol');
      if (solEl) solEl.textContent = ds.sol;
    }

    // Load Live Tab Telemetry from Background
    if (currentTab && currentTab.id) {
      chrome.runtime.sendMessage({ action: 'getTabStatus', tabId: currentTab.id }, (tabStatus) => {
        if (tabStatus) {
          statPopups.textContent = tabStatus.popups || 0;
          statTrackers.textContent = tabStatus.trackers || 0;
          statAnnoyances.textContent = tabStatus.annoyances || 0;

          renderTrackerList(tabStatus.items || []);
        }
      });
    }
  }

  function updateShieldUI() {
    const isProtected = masterEnabled && !isWhitelisted && !currentTab?.url?.startsWith('chrome://');
    
    if (isProtected) {
      heroSection.classList.add('shield-active');
      statusPill.className = 'status-indicator';
      statusText.textContent = 'Protected';
    } else if (isWhitelisted) {
      heroSection.classList.remove('shield-active');
      statusPill.className = 'status-indicator paused';
      statusText.textContent = 'Whitelisted';
    } else {
      heroSection.classList.remove('shield-active');
      statusPill.className = 'status-indicator disabled';
      statusText.textContent = 'Shield Disabled';
    }
  }

  function updateToolBtn(btn, isActive) {
    if (isActive) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  }

  function renderTrackerList(items) {
    trackerCountBadge.textContent = `${items.length} detected`;
    if (items.length === 0) {
      trackerListItems.innerHTML = `<div style="color: var(--text-muted); font-size: 11px; text-align: center; padding: 8px 0;">No trackers detected on this page.</div>`;
      return;
    }

    trackerListItems.innerHTML = items.slice(0, 25).map(item => {
      let displayName = item.url || item.domain || 'Resource';
      try {
        if (displayName.startsWith('http')) {
          displayName = new URL(displayName).hostname;
        }
      } catch (_) {}

      return `
        <div class="tracker-item">
          <span class="tracker-name" title="${item.url}">${displayName}</span>
          <span class="tracker-badge">${item.category || item.type}</span>
        </div>
      `;
    }).join('');
  }

  // Live real-time updates when storage changes
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      loadState();
    }
  });

  // 3. Global Master Power Toggle
  if (masterPowerToggle) {
    masterPowerToggle.addEventListener('change', async () => {
      masterEnabled = masterPowerToggle.checked;
      await chrome.runtime.sendMessage({ action: 'toggleGlobalProtection', enabled: masterEnabled });
      updateShieldUI();

      if (currentTab && currentTab.id) {
        chrome.tabs.reload(currentTab.id);
      }
    });
  }

  // 4. Toggle Shield on Click (Per-Site Whitelist)
  shieldBtn.addEventListener('click', async () => {
    if (!masterEnabled) {
      if (masterPowerToggle) {
        masterPowerToggle.checked = true;
        masterEnabled = true;
        await chrome.runtime.sendMessage({ action: 'toggleGlobalProtection', enabled: true });
        updateShieldUI();
        if (currentTab && currentTab.id) chrome.tabs.reload(currentTab.id);
      }
      return;
    }

    if (!currentHostname) return;

    if (isWhitelisted) {
      await chrome.runtime.sendMessage({ action: 'removeWhitelistedDomain', domain: currentHostname });
      isWhitelisted = false;
    } else {
      await chrome.runtime.sendMessage({ action: 'whitelistCurrentDomain', domain: currentHostname });
      isWhitelisted = true;
    }
    updateShieldUI();

    if (currentTab && currentTab.id) {
      chrome.tabs.reload(currentTab.id);
    }
  });

  // 5. Quick Tool Toggles
  async function toggleSetting(key, btn) {
    const current = settings[key] !== false;
    settings[key] = !current;
    updateToolBtn(btn, settings[key]);
    await chrome.storage.local.set({ settings });
  }

  btnTogglePopups?.addEventListener('click', () => toggleSetting('blockPopups', btnTogglePopups));
  btnToggleRedirect?.addEventListener('click', () => toggleSetting('blockRedirects', btnToggleRedirect));
  btnToggleCookies?.addEventListener('click', () => toggleSetting('dismissCookieBanners', btnToggleCookies));
  btnToggleAdblock?.addEventListener('click', () => toggleSetting('defuseAntiAdblock', btnToggleAdblock));
  btnToggleFingerprint?.addEventListener('click', () => toggleSetting('blockFingerprinting', btnToggleFingerprint));
  btnTogglePrerolls?.addEventListener('click', () => toggleSetting('blockMediaPrerolls', btnTogglePrerolls));

  btnTogglePause?.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ action: 'pauseProtection', minutes: 15 });
    updateShieldUI();
    if (currentTab && currentTab.id) chrome.tabs.reload(currentTab.id);
    window.close();
  });

  // 6. Core Zap Button & Header Zap Action
  const triggerElementPicker = () => {
    if (currentTab && currentTab.id) {
      chrome.tabs.sendMessage(currentTab.id, { action: 'startElementPicker' }, (res) => {
        if (chrome.runtime.lastError || !res) {
          chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            files: ['content.js']
          }).then(() => {
            chrome.scripting.insertCSS({
              target: { tabId: currentTab.id },
              files: ['element-picker.css']
            }).then(() => {
              chrome.tabs.sendMessage(currentTab.id, { action: 'startElementPicker' });
            });
          }).catch(() => {});
        }
      });
      window.close();
    }
  };

  btnCoreZap?.addEventListener('click', triggerElementPicker);
  btnQuickZap?.addEventListener('click', triggerElementPicker);

  // 7. Accordion Toggle
  accordionToggle?.addEventListener('click', () => {
    accordionBody.classList.toggle('open');
  });

  btnOpenOptions?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // 7. Donation Modal Triggers
  const openDonationModal = () => donationModal.classList.add('active');

  btnOpenDonation?.addEventListener('click', openDonationModal);
  document.getElementById('btn-header-donate')?.addEventListener('click', openDonationModal);
  document.getElementById('btn-main-donate')?.addEventListener('click', openDonationModal);

  btnCloseModal.addEventListener('click', () => {
    donationModal.classList.remove('active');
  });

  donationModal.addEventListener('click', (e) => {
    if (e.target === donationModal) {
      donationModal.classList.remove('active');
    }
  });

  // Crypto Copy-to-Clipboard Buttons
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
  loadState();
});
