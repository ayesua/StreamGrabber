/**
 * ExtremeShield - Background Service Worker (Manifest V3)
 * Manages DNR rulesets, onRuleMatchedDebug telemetry, dynamic whitelisting,
 * WebRTC IP leak defense, memory garbage collection, hotkeys, and context menus.
 */

const DEFAULT_SETTINGS = {
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
  // Advanced Optional Features
  stripPingAttributes: false,
  trimReferrers: false,
  unlockRightClick: false,
  blockAutoplay: false
};

const DEFAULT_DONATION_SETTINGS = {
  kofi: 'yesuag',
  btc: 'bc1qc92qpkma6k5yvypa9xs6dy8g8ah34ceu83nger',
  eth: '0x1466a8eD548A9e39829e142431fff185b0C15dF4'
};

// In-memory per-tab stats with last active timestamps for GC
const tabStats = new Map();
const ALL_RULESETS = ['ruleset_trackers', 'ruleset_popups', 'ruleset_query_stripping', 'ruleset_annoyances'];

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
    'donationSettings',
    'pauseUntil'
  ]);

  const initialData = {};
  if (data.masterEnabled === undefined) initialData.masterEnabled = true;
  if (!data.settings) initialData.settings = DEFAULT_SETTINGS;
  else initialData.settings = { ...DEFAULT_SETTINGS, ...data.settings };

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
  if (!data.pauseUntil) initialData.pauseUntil = 0;

  await chrome.storage.local.set(initialData);

  // Setup WebRTC IP Leak Defense
  applyWebRTCProtection(initialData.settings?.blockWebRTCLeaks ?? true);

  // Setup Context Menus
  setupContextMenus();

  console.log('[PureShield] Background Service Worker initialized.');
});

/* ==========================================================================
   2. MEMORY OPTIMIZATION & GARBAGE COLLECTION
   ========================================================================== */
// Periodically purge tab stats for inactive or closed tabs
function runMemoryGarbageCollection() {
  const now = Date.now();
  chrome.tabs.query({}, (activeTabs) => {
    const activeTabIds = new Set(activeTabs.map(t => t.id));
    for (const [tabId, info] of tabStats.entries()) {
      if (!activeTabIds.has(tabId) || (now - info.lastUpdated > 15 * 60 * 1000)) {
        tabStats.delete(tabId);
      }
    }
  });
}

// Run GC every 10 minutes
setInterval(runMemoryGarbageCollection, 10 * 60 * 1000);

/* ==========================================================================
   3. KEYBOARD SHORTCUTS (COMMANDS)
   ========================================================================== */
chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return;

  if (command === 'zap_element') {
    chrome.tabs.sendMessage(tab.id, { action: 'startElementPicker' });
  } else if (command === 'toggle_protection') {
    const data = await chrome.storage.local.get(['masterEnabled']);
    const newState = !(data.masterEnabled !== false);
    await setGlobalProtection(newState);
    chrome.tabs.reload(tab.id);
  }
});

/* ==========================================================================
   4. DECLARATIVE NET REQUEST (DNR) TELEMETRY
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

    // Auto-close blocked popup tabs so user is not stranded on ERR_BLOCKED_BY_CLIENT
    if (tabId && tabId > 0 && rulesetId === 'ruleset_popups' && info?.request?.type === 'main_frame') {
      chrome.tabs.get(tabId, (targetTab) => {
        if (chrome.runtime.lastError || !targetTab) return;
        if (targetTab.openerTabId) {
          console.warn('[ExtremeShield] Auto-closing DNR blocked popup tab:', url);
          try { chrome.tabs.remove(tabId); } catch (_) {}
        }
      });
    }
  });
}

/* ==========================================================================
   5. WEBRTC IP LEAK DEFENSE
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
   6. CONTEXT MENUS
   ========================================================================== */
function setupContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'pureshield-zap-element',
      title: '⚡ Zap Element on this Page (Alt+Shift+Z)',
      contexts: ['all']
    });

    chrome.contextMenus.create({
      id: 'pureshield-whitelist-domain',
      title: '🛡️ Whitelist this Site',
      contexts: ['page']
    });

    chrome.contextMenus.create({
      id: 'pureshield-options',
      title: '⚙️ ExtremeShield Settings',
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
   7. TAB TRACKING & BADGE MANAGEMENT
   ========================================================================== */
function getTabInfo(tabId) {
  if (!tabStats.has(tabId)) {
    tabStats.set(tabId, {
      popups: 0,
      trackers: 0,
      annoyances: 0,
      items: [],
      lastUpdated: Date.now()
    });
  }
  const info = tabStats.get(tabId);
  info.lastUpdated = Date.now();
  return info;
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

/* ==========================================================================
   7B. AD POPUP & POPUNDER TAB WATCHDOG (Instantly terminates ad tabs)
   ========================================================================== */
const KNOWN_AD_POPUP_PATTERNS = [
  'tarklot.com',
  'goodstatorone.com',
  'auhubsm.com',
  'kadam.net',
  'kadam.ru',
  'kadampn.com',
  'clickadu.com',
  'hilltopads.com',
  'hilltopads.net',
  'trafficstars.com',
  'whitetrafsa.com',
  'whitetraf.com',
  'magsrv.com',
  'tsyndicate.com',
  'exoclick.com',
  'popads.net',
  'popcash.net',
  'propellerads.com',
  'onclickads.net',
  'adcash.com',
  'adsterra.com',
  'monetag.com',
  'richpush.co',
  'zeroredirect.com',
  'popunder.net',
  'rotator=',
  'click.php',
  '/news/prl/',
  'ext_click_id=',
  'subsource=',
  'prelanding=',
  'landing=77',
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
  'smartpopbucketid=',
  'gototheroom',
  'rtb-6.xgroovy.com',
  'rtb-4.xgroovy.com',
  'lazyload.io',
  'st.pussyspace.com',
  'strpchat.com',
  'xhamsterlive.com',
  'stripchat',
  'stripcash',
  'strpchat',
  'chaturbate',
  'bongacams',
  'livejasmin',
  'camsoda',
  'cam4.com',
  'svradv.com',
  'go.svradv.com',
  'svradv',
  'amateurok.net',
  'cherrytale',
  'ero-labs',
  'mybid',
  'ero-labs.art'
];

function isMaliciousAdUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const lower = url.toLowerCase();
  return KNOWN_AD_POPUP_PATTERNS.some(p => lower.includes(p));
}

// 1. Watchdog for new tabs created (instant termination of ad popups/popunders)
chrome.tabs.onCreated.addListener((tab) => {
  const url = tab.pendingUrl || tab.url || '';
  if (isMaliciousAdUrl(url)) {
    console.warn('[ExtremeShield] Terminating malicious ad popup tab on creation:', url);
    try {
      chrome.tabs.remove(tab.id, () => { if (chrome.runtime.lastError) {} });
    } catch (_) {}
    recordBlockedItem(tab.openerTabId || null, {
      type: 'popup',
      url,
      domain: 'Ad Popup Shield',
      timestamp: Date.now()
    });
  }
});

// 2. Watchdog for tab navigations and updates (catches delayed about:blank navigations to ad networks)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const url = changeInfo.url || tab?.url || tab?.pendingUrl || '';
  if (isMaliciousAdUrl(url)) {
    console.warn('[ExtremeShield] Terminating malicious ad popup tab on navigation:', url);
    try {
      chrome.tabs.remove(tabId, () => { if (chrome.runtime.lastError) {} });
    } catch (_) {}
    recordBlockedItem(tab?.openerTabId || null, {
      type: 'popup',
      url,
      domain: 'Ad Popup Shield',
      timestamp: Date.now()
    });
    return;
  }

  if (changeInfo.status === 'loading') {
    tabStats.set(tabId, { popups: 0, trackers: 0, annoyances: 0, items: [], lastUpdated: Date.now() });
    updateTabBadge(tabId);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabStats.delete(tabId);
});

/* ==========================================================================
   8. EVENT RECORDING & TELEMETRY
   ========================================================================== */
async function recordBlockedItem(senderTabId, eventData) {
  const { type, url, domain, timestamp } = eventData;

  // 1. Update In-Memory Tab Stats
  if (senderTabId) {
    const tStats = getTabInfo(senderTabId);
    if (type === 'popup') tStats.popups++;
    else if (type === 'annoyance') tStats.annoyances++;
    else tStats.trackers++;

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
    stats.totalDataSavedKB += 120;
    stats.totalTimeSavedSec += 0.8;
  } else if (type === 'annoyance') {
    stats.totalAnnoyancesBlocked++;
    stats.totalDataSavedKB += 35;
    stats.totalTimeSavedSec += 0.2;
  } else {
    stats.totalTrackersBlocked++;
    stats.totalDataSavedKB += 45;
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

  if (logs.length > 100) logs.pop();

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
   9. GLOBAL PROTECTION & TIMED PAUSES
   ========================================================================== */
async function setGlobalProtection(enabled) {
  await chrome.storage.local.set({ masterEnabled: enabled, pauseUntil: 0 });

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

async function pauseProtectionForMinutes(minutes) {
  const pauseUntil = Date.now() + (minutes * 60 * 1000);
  await chrome.storage.local.set({ masterEnabled: false, pauseUntil });
  await chrome.declarativeNetRequest.updateEnabledRulesets({ disableRulesetIds: ALL_RULESETS });
  chrome.action.setBadgeText({ text: 'PAUSE' });
  chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' });

  // Schedule auto-reactivation
  setTimeout(async () => {
    const data = await chrome.storage.local.get(['pauseUntil']);
    if (data.pauseUntil && Date.now() >= data.pauseUntil) {
      await setGlobalProtection(true);
    }
  }, minutes * 60 * 1000);
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
   10. MESSAGE DISPATCHER
   ========================================================================== */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const senderTabId = sender?.tab?.id;

  if (message.action === 'toggleGlobalProtection') {
    setGlobalProtection(message.enabled).then(() => sendResponse({ status: 'ok' }));
    return true;
  } else if (message.action === 'pauseProtection') {
    pauseProtectionForMinutes(message.minutes || 15).then(() => sendResponse({ status: 'ok' }));
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
