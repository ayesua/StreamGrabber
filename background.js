/**
 * XtremeShld - Background Service Worker (Manifest V3)
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
  blockMediaPrerolls: true,
  historyTrapDefense: true,
  fullscreenDefense: true,
  shadowDomScanner: true,
  tabWatchdog: true,
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

const ICONS_ON = {
  16: 'icon16.png',
  48: 'icon48.png',
  128: 'icon128.png'
};

const ICONS_OFF = {
  16: 'icon16_off.png',
  48: 'icon48_off.png',
  128: 'icon128_off.png'
};

// In-memory runtime state for fast reactive defense decisions
let isMasterEnabled = true;
let pauseUntilTimestamp = 0;
let currentSettings = { ...DEFAULT_SETTINGS };
let currentWhitelistedDomains = [];
const tabHostnames = new Map(); // tabId -> hostname

function updateTabUI(tabId, url) {
  if (!tabId) return;

  const isPaused = Boolean(pauseUntilTimestamp && Date.now() < pauseUntilTimestamp);
  const isGloballyOff = !isMasterEnabled || isPaused;

  if (isGloballyOff) {
    chrome.action.setIcon({ tabId, path: ICONS_OFF }, () => { if (chrome.runtime.lastError) {} });
    return;
  }

  let hostname = '';
  try {
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      hostname = new URL(url).hostname;
    }
  } catch (_) {}

  const isWhitelisted = Boolean(hostname && currentWhitelistedDomains.some(d => hostname === d || hostname.endsWith('.' + d)));

  if (isWhitelisted) {
    chrome.action.setIcon({ tabId, path: ICONS_OFF }, () => { if (chrome.runtime.lastError) {} });
    chrome.action.setBadgeText({ tabId, text: '' });
  } else {
    chrome.action.setIcon({ tabId, path: ICONS_ON }, () => { if (chrome.runtime.lastError) {} });
    updateTabBadge(tabId);
  }
}

function refreshExtensionIcons() {
  const isPaused = Boolean(pauseUntilTimestamp && Date.now() < pauseUntilTimestamp);
  const isGloballyOff = !isMasterEnabled || isPaused;

  if (isGloballyOff) {
    chrome.action.setIcon({ path: ICONS_OFF }, () => { if (chrome.runtime.lastError) {} });
  } else {
    chrome.action.setIcon({ path: ICONS_ON }, () => { if (chrome.runtime.lastError) {} });
  }

  try {
    chrome.tabs.query({}, (tabs) => {
      if (chrome.runtime.lastError || !tabs) return;
      for (const tab of tabs) {
        if (tab.id && tab.url) {
          updateTabUI(tab.id, tab.url);
        }
      }
    });
  } catch (_) {}
}

const WHITELIST_RULE_ID_OFFSET = 900000;

async function syncDnrRulesets() {
  try {
    const isPaused = Boolean(pauseUntilTimestamp && Date.now() < pauseUntilTimestamp);
    const isActive = isMasterEnabled && !isPaused;

    const enableRulesetIds = [];
    const disableRulesetIds = [];

    const rulesetMap = {
      ruleset_trackers: isActive && currentSettings.blockTrackers !== false,
      ruleset_popups: isActive && currentSettings.blockPopups !== false,
      ruleset_query_stripping: isActive && currentSettings.stripParams !== false,
      ruleset_annoyances: isActive && (currentSettings.dismissCookieBanners !== false || currentSettings.removeOverlays !== false)
    };

    for (const [id, shouldEnable] of Object.entries(rulesetMap)) {
      if (shouldEnable) enableRulesetIds.push(id);
      else disableRulesetIds.push(id);
    }

    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds,
      disableRulesetIds
    });
  } catch (err) {
    console.warn('[XtremeShld] Error syncing DNR rulesets:', err);
  }
}

async function syncWhitelistDnrRules(domains = currentWhitelistedDomains) {
  try {
    if (!chrome.declarativeNetRequest?.updateDynamicRules) return;
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existingRules
      .filter(r => r.id >= WHITELIST_RULE_ID_OFFSET && r.id < WHITELIST_RULE_ID_OFFSET + 50000)
      .map(r => r.id);

    const cleanDomains = Array.from(new Set(
      (domains || [])
        .map(d => String(d || '').trim().toLowerCase().replace(/^www\./, ''))
        .filter(Boolean)
    ));

    const addRules = [];
    cleanDomains.forEach((domain, idx) => {
      addRules.push({
        id: WHITELIST_RULE_ID_OFFSET + (idx * 2) + 1,
        priority: 100000,
        action: { type: 'allow' },
        condition: {
          initiatorDomains: [domain],
          resourceTypes: [
            'main_frame', 'sub_frame', 'stylesheet', 'script', 'image',
            'font', 'object', 'xmlhttprequest', 'ping', 'csp_report',
            'media', 'websocket', 'webtransport', 'webbundle', 'other'
          ]
        }
      });
      addRules.push({
        id: WHITELIST_RULE_ID_OFFSET + (idx * 2) + 2,
        priority: 100000,
        action: { type: 'allowAllRequests' },
        condition: {
          requestDomains: [domain],
          resourceTypes: ['main_frame', 'sub_frame']
        }
      });
    });

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules
    });
  } catch (err) {
    console.warn('[XtremeShld] Error syncing dynamic whitelist DNR rules:', err);
  }
}

async function initBackgroundState() {
  try {
    const data = await chrome.storage.local.get([
      'masterEnabled',
      'pauseUntil',
      'settings',
      'whitelistedDomains'
    ]);
    if (data.masterEnabled !== undefined) isMasterEnabled = data.masterEnabled !== false;
    if (data.pauseUntil) pauseUntilTimestamp = data.pauseUntil;
    if (data.settings) currentSettings = { ...DEFAULT_SETTINGS, ...data.settings };
    if (data.whitelistedDomains) currentWhitelistedDomains = data.whitelistedDomains;

    // Automatically recover if a timed pause expired while Service Worker or browser was asleep
    if (pauseUntilTimestamp && Date.now() >= pauseUntilTimestamp) {
      isMasterEnabled = true;
      pauseUntilTimestamp = 0;
      await chrome.storage.local.set({ masterEnabled: true, pauseUntil: 0 });
    }

    await syncDnrRulesets();
    await syncWhitelistDnrRules(currentWhitelistedDomains);
    refreshExtensionIcons();

    const isPaused = Boolean(pauseUntilTimestamp && Date.now() < pauseUntilTimestamp);
    if (!isMasterEnabled || isPaused) {
      if (isPaused) {
        chrome.action.setBadgeText({ text: 'PAUSE' });
        chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' });
      } else {
        chrome.action.setBadgeText({ text: 'OFF' });
        chrome.action.setBadgeBackgroundColor({ color: '#64748b' });
      }
    }
  } catch (_) {}
}
initBackgroundState();

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    let shouldSyncDnr = false;
    if (changes.masterEnabled !== undefined) {
      isMasterEnabled = changes.masterEnabled.newValue !== false;
      shouldSyncDnr = true;
    }
    if (changes.pauseUntil !== undefined) {
      pauseUntilTimestamp = changes.pauseUntil.newValue || 0;
      shouldSyncDnr = true;
    }
    if (changes.settings !== undefined) {
      currentSettings = { ...DEFAULT_SETTINGS, ...changes.settings.newValue };
      shouldSyncDnr = true;
    }
    if (changes.whitelistedDomains !== undefined) {
      currentWhitelistedDomains = changes.whitelistedDomains.newValue || [];
      syncWhitelistDnrRules(currentWhitelistedDomains);
    }
    if (shouldSyncDnr) {
      syncDnrRulesets();
    }
    refreshExtensionIcons();
  }
});

function isTabWatchdogActive(openerTabId) {
  if (!isMasterEnabled) return false;
  if (pauseUntilTimestamp && Date.now() < pauseUntilTimestamp) return false;
  if (currentSettings.blockPopups === false || currentSettings.tabWatchdog === false) return false;

  if (openerTabId && tabHostnames.has(openerTabId)) {
    const openerHost = tabHostnames.get(openerTabId);
    const normOpener = openerHost.replace(/^www\./i, '');
    if (currentWhitelistedDomains.some(d => openerHost === d || openerHost.endsWith('.' + d) || normOpener === d || normOpener.endsWith('.' + d))) {
      return false;
    }
  }
  return true;
}

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

  // Sync DNR rulesets and dynamic whitelist rules
  await syncDnrRulesets();
  await syncWhitelistDnrRules(data.whitelistedDomains || []);

  // Setup Context Menus
  setupContextMenus();

  console.log('[XtremeShld] Background Service Worker initialized.');
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

// Service Worker Alarm + Interval for persistent GC & Timed Pause Resume
try {
  chrome.alarms?.create('memory_gc', { periodInMinutes: 10 });
  chrome.alarms?.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'memory_gc') {
      runMemoryGarbageCollection();
    } else if (alarm.name === 'resume_protection') {
      await setGlobalProtection(true);
    }
  });
} catch (_) {}
setInterval(runMemoryGarbageCollection, 10 * 60 * 1000);

/* ==========================================================================
   3. KEYBOARD SHORTCUTS (COMMANDS)
   ========================================================================== */
chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return;

  if (command === 'zap_element') {
    chrome.tabs.sendMessage(tab.id, { action: 'startElementPicker' }, (res) => {
      if (chrome.runtime.lastError || !res) {
        chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] }).then(() => {
          chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['element-picker.css'] }).then(() => {
            chrome.tabs.sendMessage(tab.id, { action: 'startElementPicker' });
          });
        }).catch(() => {});
      }
    });
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
          console.warn('[XtremeShld] Auto-closing DNR blocked popup tab:', url);
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
      console.log(`[XtremeShld] WebRTC leak protection: ${enable ? 'ENABLED' : 'DISABLED'}`);
    });
  }
}

/* ==========================================================================
   6. CONTEXT MENUS
   ========================================================================== */
function setupContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'xtremeshld-zap-element',
      title: '⚡ Zap Element on this Page (Alt+Shift+Z)',
      contexts: ['all']
    });

    chrome.contextMenus.create({
      id: 'xtremeshld-whitelist-domain',
      title: '🛡️ Whitelist this Site',
      contexts: ['page']
    });

    chrome.contextMenus.create({
      id: 'xtremeshld-options',
      title: '⚙️ XtremeShld Settings',
      contexts: ['action']
    });
  });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab || !tab.id) return;

  if (info.menuItemId === 'xtremeshld-zap-element') {
    chrome.tabs.sendMessage(tab.id, { action: 'startElementPicker' }, (res) => {
      if (chrome.runtime.lastError || !res) {
        chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] }).then(() => {
          chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['element-picker.css'] }).then(() => {
            chrome.tabs.sendMessage(tab.id, { action: 'startElementPicker' });
          });
        }).catch(() => {});
      }
    });
  } else if (info.menuItemId === 'xtremeshld-whitelist-domain') {
    try {
      const url = new URL(tab.url);
      whitelistDomain(url.hostname);
    } catch (_) {}
  } else if (info.menuItemId === 'xtremeshld-options') {
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
  'orbsrv.com',
  'pjs.js',
  'smartpopbucketid=',
  'gototheroom',
  'rtb-6.xgroovy.com',
  'rtb-4.xgroovy.com',
  'lazyload.io',
  'st.pussyspace.com',
  'xhamsterlive.com',
  'stripchat',
  'stripcash',
  'strpchat',
  'chaturbate',
  'bongacams',
  'livejasmin',
  'camsoda',
  'cam4.com',
  'svradv',
  'amateurok.net',
  'cherrytale',
  'ero-labs',
  'mybid',
  'kartela.ink',
  'kartel69'
];

function isMaliciousAdUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const lower = url.toLowerCase();
  return KNOWN_AD_POPUP_PATTERNS.some(p => lower.includes(p));
}

// 1. Watchdog for new tabs created (instant termination of ad popups/popunders)
chrome.tabs.onCreated.addListener((tab) => {
  if (!isTabWatchdogActive(tab.openerTabId)) return;
  const url = tab.pendingUrl || tab.url || '';
  if (isMaliciousAdUrl(url)) {
    console.warn('[XtremeShld] Terminating malicious ad popup tab on creation:', url);
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
  const currentUrl = changeInfo.url || tab?.url || tab?.pendingUrl || '';
  if (currentUrl) {
    try {
      const u = new URL(currentUrl);
      if (u.hostname) tabHostnames.set(tabId, u.hostname);
    } catch (_) {}
  }

  updateTabUI(tabId, currentUrl);

  if (isTabWatchdogActive(tab?.openerTabId) && isMaliciousAdUrl(currentUrl)) {
    console.warn('[XtremeShld] Terminating malicious ad popup tab on navigation:', currentUrl);
    try {
      chrome.tabs.remove(tabId, () => { if (chrome.runtime.lastError) {} });
    } catch (_) {}
    recordBlockedItem(tab?.openerTabId || null, {
      type: 'popup',
      url: currentUrl,
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

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab && (tab.url || tab.pendingUrl)) {
      updateTabUI(tab.id, tab.url || tab.pendingUrl);
    }
  } catch (_) {}
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabStats.delete(tabId);
  tabHostnames.delete(tabId);
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

  // 2. Update Persisted Lifetime Statistics (Debounced memory cache)
  await ensureStorageCache();

  if (type === 'popup') {
    cachedStats.totalPopupsBlocked++;
    cachedStats.totalDataSavedKB += 120;
    cachedStats.totalTimeSavedSec += 0.8;
  } else if (type === 'annoyance') {
    cachedStats.totalAnnoyancesBlocked++;
    cachedStats.totalDataSavedKB += 35;
    cachedStats.totalTimeSavedSec += 0.2;
  } else {
    cachedStats.totalTrackersBlocked++;
    cachedStats.totalDataSavedKB += 45;
    cachedStats.totalTimeSavedSec += 0.3;
  }

  cachedLogs.unshift({
    type,
    url: url || 'Blocked Resource',
    domain: domain || '',
    category: categorizeTracker(url || domain),
    timestamp: timestamp || Date.now()
  });

  if (cachedLogs.length > 100) cachedLogs.pop();

  scheduleStorageFlush();
}

let cachedStats = null;
let cachedLogs = null;
let storageFlushTimer = null;

async function ensureStorageCache() {
  if (!cachedStats || !cachedLogs) {
    const data = await chrome.storage.local.get(['stats', 'trackerLogs']);
    cachedStats = data.stats || {
      totalPopupsBlocked: 0,
      totalTrackersBlocked: 0,
      totalAnnoyancesBlocked: 0,
      totalDataSavedKB: 0,
      totalTimeSavedSec: 0
    };
    cachedLogs = data.trackerLogs || [];
  }
}

function scheduleStorageFlush() {
  if (storageFlushTimer) return;
  storageFlushTimer = setTimeout(async () => {
    storageFlushTimer = null;
    if (cachedStats && cachedLogs) {
      try {
        await chrome.storage.local.set({ stats: cachedStats, trackerLogs: cachedLogs });
      } catch (_) {}
    }
  }, 1000);
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
  isMasterEnabled = enabled;
  pauseUntilTimestamp = 0;
  try {
    chrome.alarms?.clear('resume_protection');
  } catch (_) {}
  await chrome.storage.local.set({ masterEnabled: enabled, pauseUntil: 0 });
  await syncDnrRulesets();

  if (enabled) {
    applyWebRTCProtection(currentSettings.blockWebRTCLeaks !== false);
    chrome.action.setBadgeText({ text: '' });
    refreshExtensionIcons();
    console.log('[XtremeShld] Global protection: ENABLED');
  } else {
    applyWebRTCProtection(false);
    chrome.action.setBadgeText({ text: 'OFF' });
    chrome.action.setBadgeBackgroundColor({ color: '#64748b' });
    refreshExtensionIcons();
    console.log('[XtremeShld] Global protection: DISABLED');
  }
}

async function pauseProtectionForMinutes(minutes) {
  const pauseUntil = Date.now() + (minutes * 60 * 1000);
  isMasterEnabled = false;
  pauseUntilTimestamp = pauseUntil;
  await chrome.storage.local.set({ masterEnabled: false, pauseUntil });
  await syncDnrRulesets();
  applyWebRTCProtection(false);
  chrome.action.setBadgeText({ text: 'PAUSE' });
  chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' });
  refreshExtensionIcons();

  // Schedule persistent MV3 alarm for auto-reactivation even if Service Worker sleeps
  try {
    chrome.alarms?.create('resume_protection', { when: pauseUntil });
  } catch (_) {}
}

async function whitelistDomain(domain) {
  if (!domain) return;
  const clean = domain.trim().toLowerCase();
  const data = await chrome.storage.local.get(['whitelistedDomains']);
  const list = data.whitelistedDomains || [];
  if (!list.includes(clean)) {
    list.push(clean);
    await chrome.storage.local.set({ whitelistedDomains: list });
    currentWhitelistedDomains = list;
    await syncWhitelistDnrRules(list);
    refreshExtensionIcons();
    console.log(`[XtremeShld] Whitelisted domain: ${clean}`);
  }
}

async function removeWhitelistedDomain(domain) {
  if (!domain) return;
  const clean = domain.trim().toLowerCase();
  const canonical = clean.replace(/^www\./, '');
  const data = await chrome.storage.local.get(['whitelistedDomains']);
  let list = data.whitelistedDomains || [];
  list = list.filter(d => d !== clean && d !== canonical && d !== 'www.' + canonical);
  await chrome.storage.local.set({ whitelistedDomains: list });
  currentWhitelistedDomains = list;
  await syncWhitelistDnrRules(list);
  refreshExtensionIcons();
  console.log(`[XtremeShld] Removed whitelist for domain: ${clean}`);
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
