/**
 * PureShield - Background Service Worker (Manifest V3)
 * Manages DNR rulesets, onRuleMatchedDebug telemetry, dynamic whitelisting,
 * WebRTC IP leak defense, per-tab blocked counters, action badges, and context menus.
 */

const DEFAULT_SETTINGS = {
  blockPopups: true,
  blockTrackers: true,
  blockFingerprinting: true,
  defuseAntiAdblock: true,
  dismissCookieBanners: true,
  removeOverlays: true,
  stripParams: true,
  showToastNotifications: true,
  blockWebRTCLeaks: true
};

const DEFAULT_DONATION_SETTINGS = {
  kofi: 'yesuag',
  btc: 'bc1qc92qpkma6k5yvypa9xs6dy8g8ah34ceu83nger',
  eth: '0x1466a8eD548A9e39829e142431fff185b0C15dF4'
};

// In-memory per-tab stats
const tabStats = new Map();

/* ==========================================================================
   1. EXTENSION INITIALIZATION & LIFECYCLE
   ========================================================================== */
chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get([
    'masterEnabled',
    'settings',
    'whitelistedDomains',
    'customCosmeticRules',
    'stats',
    'trackerLogs',
    'donationSettings'
  ]);

  const initialData = {};
  if (data.masterEnabled === undefined) initialData.masterEnabled = true;
  if (!data.settings) initialData.settings = DEFAULT_SETTINGS;
  if (!data.whitelistedDomains) initialData.whitelistedDomains = [];
  if (!data.customCosmeticRules) initialData.customCosmeticRules = {};
  if (!data.stats) {
    initialData.stats = {
      totalPopupsBlocked: 0,
      totalTrackersBlocked: 0,
      totalAnnoyancesBlocked: 0,
      totalDataSavedKB: 0,
      totalTimeSavedSec: 0
    };
  }
  if (!data.trackerLogs) initialData.trackerLogs = [];
  if (!data.donationSettings) initialData.donationSettings = DEFAULT_DONATION_SETTINGS;

  if (Object.keys(initialData).length > 0) {
    await chrome.storage.local.set(initialData);
  }

  // Setup WebRTC IP Leak Defense
  applyWebRTCProtection(data.settings?.blockWebRTCLeaks ?? true);

  // Setup Context Menus
  setupContextMenus();

  console.log('[PureShield] Background Service Worker initialized.');
});

/* ==========================================================================
   2. DECLARATIVE NET REQUEST (DNR) RULE MATCHED TELEMETRY
   ========================================================================== */
if (chrome.declarativeNetRequest && chrome.declarativeNetRequest.onRuleMatchedDebug) {
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
    const tabId = info?.request?.tabId;
    const url = info?.request?.url || '';
    const rulesetId = info?.rule?.rulesetId || '';

    let type = 'tracker';
    if (rulesetId === 'ruleset_popups') {
      type = 'popup';
    } else if (rulesetId === 'ruleset_annoyances') {
      type = 'annoyance';
    }

    let domain = '';
    try {
      if (url.startsWith('http')) {
        domain = new URL(url).hostname;
      }
    } catch (_) {}

    recordBlockedItem(tabId && tabId > 0 ? tabId : null, {
      type,
      url,
      domain: domain || 'Network Request',
      timestamp: Date.now()
    });
  });
  console.log('[PureShield] DNR onRuleMatchedDebug listener registered.');
}

/* ==========================================================================
   3. WEBRTC IP LEAK DEFENSE
   ========================================================================== */
function applyWebRTCProtection(enable) {
  if (chrome.privacy && chrome.privacy.network && chrome.privacy.network.webRTCIPHandlingPolicy) {
    chrome.privacy.network.webRTCIPHandlingPolicy.set({
      value: enable ? 'default_public_interface_only' : 'default'
    }, () => {
      console.log(`[PureShield] WebRTC leak protection: ${enable ? 'ENABLED' : 'DISABLED'}`);
    });
  }
}

/* ==========================================================================
   4. CONTEXT MENUS
   ========================================================================== */
function setupContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'pureshield-zap-element',
      title: '⚡ Zap Element on this Page',
      contexts: ['all']
    });

    chrome.contextMenus.create({
      id: 'pureshield-whitelist-domain',
      title: '🛡️ Whitelist this Site',
      contexts: ['page']
    });

    chrome.contextMenus.create({
      id: 'pureshield-options',
      title: '⚙️ PureShield Settings',
      contexts: ['action']
    });
  });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab || !tab.id) return;

  if (info.menuItemId === 'pureshield-zap-element') {
    chrome.tabs.sendMessage(tab.id, { action: 'startElementPicker' });
  } else if (info.menuItemId === 'pureshield-whitelist-domain') {
    try {
      const url = new URL(tab.url);
      whitelistDomain(url.hostname);
    } catch (_) {}
  } else if (info.menuItemId === 'pureshield-options') {
    chrome.runtime.openOptionsPage();
  }
});

/* ==========================================================================
   5. TAB TRACKING & BADGE MANAGEMENT
   ========================================================================== */
function getTabInfo(tabId) {
  if (!tabStats.has(tabId)) {
    tabStats.set(tabId, {
      popups: 0,
      trackers: 0,
      annoyances: 0,
      items: []
    });
  }
  return tabStats.get(tabId);
}

function updateTabBadge(tabId) {
  const stats = tabStats.get(tabId);
  const total = stats ? (stats.popups + stats.trackers + stats.annoyances) : 0;

  if (total > 0) {
    chrome.action.setBadgeText({ tabId, text: total > 999 ? '999+' : String(total) });
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#10b981' });
  } else {
    chrome.action.setBadgeText({ tabId, text: '' });
  }
}

// Reset tab stats on new navigation
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    tabStats.set(tabId, { popups: 0, trackers: 0, annoyances: 0, items: [] });
    updateTabBadge(tabId);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabStats.delete(tabId);
});

/* ==========================================================================
   6. EVENT RECORDING & TELEMETRY
   ========================================================================== */
async function recordBlockedItem(senderTabId, eventData) {
  const { type, url, domain, timestamp } = eventData;

  // 1. Update In-Memory Tab Stats
  if (senderTabId) {
    const tStats = getTabInfo(senderTabId);
    if (type === 'popup') tStats.popups++;
    else if (type === 'annoyance') tStats.annoyances++;
    else tStats.trackers++;

    // Categorize domain/url
    const category = categorizeTracker(url || domain);
    tStats.items.unshift({
      type,
      url: url || 'Blocked Resource',
      domain: domain || '',
      category,
      timestamp: timestamp || Date.now()
    });

    if (tStats.items.length > 50) tStats.items.pop();
    updateTabBadge(senderTabId);
  }

  // 2. Update Persisted Lifetime Statistics
  const data = await chrome.storage.local.get(['stats', 'trackerLogs']);
  const stats = data.stats || {
    totalPopupsBlocked: 0,
    totalTrackersBlocked: 0,
    totalAnnoyancesBlocked: 0,
    totalDataSavedKB: 0,
    totalTimeSavedSec: 0
  };

  if (type === 'popup') {
    stats.totalPopupsBlocked++;
    stats.totalDataSavedKB += 120; // Avg popup page size
    stats.totalTimeSavedSec += 0.8;
  } else if (type === 'annoyance') {
    stats.totalAnnoyancesBlocked++;
    stats.totalDataSavedKB += 35;
    stats.totalTimeSavedSec += 0.2;
  } else {
    stats.totalTrackersBlocked++;
    stats.totalDataSavedKB += 45; // Avg tracking script weight
    stats.totalTimeSavedSec += 0.3;
  }

  const logs = data.trackerLogs || [];
  logs.unshift({
    type,
    url: url || 'Blocked Resource',
    domain: domain || '',
    category: categorizeTracker(url || domain),
    timestamp: timestamp || Date.now()
  });

  // Keep logs at a manageable size
  if (logs.length > 150) logs.pop();

  await chrome.storage.local.set({ stats, trackerLogs: logs });
}

function categorizeTracker(url) {
  const lower = String(url).toLowerCase();
  if (lower.includes('google-analytics') || lower.includes('gtm.js') || lower.includes('hotjar') || lower.includes('clarity') || lower.includes('mixpanel') || lower.includes('amplitude') || lower.includes('segment') || lower.includes('yandex') || lower.includes('matomo') || lower.includes('mouseflow') || lower.includes('chartbeat') || lower.includes('fullstory')) {
    return 'Analytics';
  }
  if (lower.includes('facebook') || lower.includes('tiktok') || lower.includes('twitter') || lower.includes('snapchat') || lower.includes('pinterest') || lower.includes('linkedin')) {
    return 'Social';
  }
  if (lower.includes('doubleclick') || lower.includes('criteo') || lower.includes('taboola') || lower.includes('outbrain') || lower.includes('adnxs') || lower.includes('rubicon') || lower.includes('pubmatic') || lower.includes('pagead') || lower.includes('smartad') || lower.includes('casale') || lower.includes('openx') || lower.includes('adroll') || lower.includes('googleadservices')) {
    return 'Advertising';
  }
  if (lower.includes('popads') || lower.includes('popcash') || lower.includes('propeller') || lower.includes('onclick') || lower.includes('adcash') || lower.includes('exoclick') || lower.includes('juicyads') || lower.includes('adsterra') || lower.includes('hilltop') || lower.includes('admaven')) {
    return 'Popups';
  }
  return 'Trackers & Annoyances';
}

/* ==========================================================================
   7. GLOBAL PROTECTION & WHITELISTS
   ========================================================================== */
const ALL_RULESETS = ['ruleset_trackers', 'ruleset_popups', 'ruleset_query_stripping', 'ruleset_annoyances'];

async function setGlobalProtection(enabled) {
  await chrome.storage.local.set({ masterEnabled: enabled });

  if (enabled) {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: ALL_RULESETS
    });
    applyWebRTCProtection(true);
    console.log('[PureShield] Global protection: ENABLED');
  } else {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      disableRulesetIds: ALL_RULESETS
    });
    applyWebRTCProtection(false);
    chrome.action.setBadgeText({ text: 'OFF' });
    chrome.action.setBadgeBackgroundColor({ color: '#64748b' });
    console.log('[PureShield] Global protection: DISABLED');
  }
}

async function whitelistDomain(domain) {
  if (!domain) return;
  const data = await chrome.storage.local.get(['whitelistedDomains']);
  const list = data.whitelistedDomains || [];
  if (!list.includes(domain)) {
    list.push(domain);
    await chrome.storage.local.set({ whitelistedDomains: list });
    console.log(`[PureShield] Whitelisted domain: ${domain}`);
  }
}

async function removeWhitelistedDomain(domain) {
  if (!domain) return;
  const data = await chrome.storage.local.get(['whitelistedDomains']);
  let list = data.whitelistedDomains || [];
  list = list.filter(d => d !== domain);
  await chrome.storage.local.set({ whitelistedDomains: list });
  console.log(`[PureShield] Removed whitelist for domain: ${domain}`);
}

/* ==========================================================================
   8. MESSAGE DISPATCHER
   ========================================================================== */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const senderTabId = sender?.tab?.id;

  if (message.action === 'toggleGlobalProtection') {
    setGlobalProtection(message.enabled).then(() => sendResponse({ status: 'ok' }));
    return true;
  } else if (message.action === 'recordBlockedEvent') {
    recordBlockedItem(senderTabId || message.tabId, message.data);
    sendResponse({ status: 'recorded' });
  } else if (message.action === 'getTabStatus') {
    const tabId = message.tabId || senderTabId;
    const info = tabStats.get(tabId) || { popups: 0, trackers: 0, annoyances: 0, items: [] };
    sendResponse(info);
  } else if (message.action === 'whitelistCurrentDomain') {
    whitelistDomain(message.domain).then(() => sendResponse({ status: 'ok' }));
    return true;
  } else if (message.action === 'removeWhitelistedDomain') {
    removeWhitelistedDomain(message.domain).then(() => sendResponse({ status: 'ok' }));
    return true;
  } else if (message.action === 'updateWebRTC') {
    applyWebRTCProtection(message.enabled);
    sendResponse({ status: 'ok' });
  }

  return true;
});
