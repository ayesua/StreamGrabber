/**
 * Video Downloader - XtremeGrbr - Options Page Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  const languageSelector = document.getElementById('languageSelector');
  const themeSelector = document.getElementById('themeSelector');
  const extensionEnabledInput = document.getElementById('extensionEnabled');
  const askFilenameInput = document.getElementById('askFilename');
  const showFloatingBtnInput = document.getElementById('showFloatingBtn');
  const minSizeInput = document.getElementById('minSize');
  const maxThreadsInput = document.getElementById('maxThreads');
  const defaultFormatInput = document.getElementById('defaultFormat');
  const autoDetectInput = document.getElementById('autoDetect');
  const form = document.getElementById('optionsForm');
  const toast = document.getElementById('toast');

  // Update check elements
  const btnCheckUpdates = document.getElementById('btnCheckUpdates');
  const updateSpinner = document.getElementById('updateSpinner');
  const updateResultAlert = document.getElementById('updateResultAlert');

  // Dynamic Version Display from Manifest
  try {
    const manifestVer = chrome.runtime?.getManifest ? chrome.runtime.getManifest().version : '3.5.5';
    const optionsVersionLabel = document.getElementById('optionsVersionLabel');
    const updatesVersionBadge = document.getElementById('updatesVersionBadge');
    const updateStatusText = document.getElementById('updateStatusText');
    if (optionsVersionLabel) optionsVersionLabel.textContent = `v${manifestVer}`;
    if (updatesVersionBadge) updatesVersionBadge.textContent = `v${manifestVer}`;
    if (updateStatusText) updateStatusText.textContent = `Current Version: v${manifestVer}`;
  } catch (_) {}

  // 1. Language Initialization & Real-Time Switching
  if (typeof getStoredLanguage === 'function') {
    getStoredLanguage((lang) => {
      if (languageSelector) languageSelector.value = lang;
      if (typeof applyI18n === 'function') applyI18n(lang);
    });
  }

  if (languageSelector) {
    languageSelector.addEventListener('change', (e) => {
      const selectedLang = e.target.value;
      if (typeof setStoredLanguage === 'function') {
        setStoredLanguage(selectedLang, (lang) => {
          if (typeof applyI18n === 'function') applyI18n(lang);
        });
      }
    });
  }

  // 1b. Theme Initialization & Real-Time Switching
  if (typeof getStoredTheme === 'function') {
    getStoredTheme((theme) => {
      if (themeSelector) themeSelector.value = theme;
      if (typeof applyTheme === 'function') applyTheme(theme);
    });
  }

  if (themeSelector) {
    themeSelector.addEventListener('change', (e) => {
      const selectedTheme = e.target.value;
      if (typeof setStoredTheme === 'function') {
        setStoredTheme(selectedTheme, (theme) => {
          if (typeof applyTheme === 'function') applyTheme(theme);
        });
      }
    });
  }

  // 2. Load saved options
  chrome.storage.local.get({ extensionEnabled: true }, (res) => {
    if (extensionEnabledInput) extensionEnabledInput.checked = res.extensionEnabled !== false;
  });

  if (extensionEnabledInput) {
    extensionEnabledInput.addEventListener('change', () => {
      const enabled = extensionEnabledInput.checked;
      chrome.storage.local.set({ extensionEnabled: enabled }, () => {
        chrome.runtime.sendMessage({ action: 'SET_EXTENSION_ENABLED', enabled }, () => {
          if (chrome.runtime.lastError) {}
        });
        if (toast) {
          toast.textContent = enabled ? 'XtremeGrbr has been enabled!' : 'XtremeGrbr has been paused/disabled!';
          toast.style.display = 'block';
          setTimeout(() => {
            toast.style.display = 'none';
            toast.textContent = 'Preferences saved successfully!';
          }, 2000);
        }
      });
    });
  }

  const dimSeenVideosInput = document.getElementById('dimSeenVideos');
  const btnClearSeenVideos = document.getElementById('btnClearSeenVideos');

  chrome.storage.sync.get({
    askFilename: false,
    showFloatingBtn: true,
    dimSeenVideos: true,
    minSizeKB: 100,
    maxThreads: 5,
    defaultFormat: 'mp4',
    autoDetect: true
  }, (items) => {
    if (askFilenameInput) askFilenameInput.checked = Boolean(items.askFilename);
    if (showFloatingBtnInput) showFloatingBtnInput.checked = Boolean(items.showFloatingBtn ?? true);
    if (dimSeenVideosInput) dimSeenVideosInput.checked = Boolean(items.dimSeenVideos !== false);
    if (minSizeInput) minSizeInput.value = items.minSizeKB;
    if (maxThreadsInput) maxThreadsInput.value = items.maxThreads;
    if (defaultFormatInput) defaultFormatInput.value = items.defaultFormat || 'mp4';
    if (autoDetectInput) autoDetectInput.value = items.autoDetect.toString();
  });

  function saveOptions(showToast = true) {
    const askFilename = askFilenameInput ? askFilenameInput.checked : false;
    const showFloatingBtn = showFloatingBtnInput ? showFloatingBtnInput.checked : true;
    const dimSeenVideos = dimSeenVideosInput ? dimSeenVideosInput.checked : true;
    const minSizeKB = parseInt(minSizeInput.value, 10) || 100;
    const maxThreads = parseInt(maxThreadsInput.value, 10) || 5;
    const defaultFormat = defaultFormatInput ? defaultFormatInput.value : 'mp4';
    const autoDetect = autoDetectInput.value === 'true';

    chrome.storage.sync.set({
      askFilename,
      showFloatingBtn,
      dimSeenVideos,
      minSizeKB,
      maxThreads,
      defaultFormat,
      autoDetect
    }, () => {
      if (showToast && toast) {
        toast.style.display = 'block';
        setTimeout(() => {
          toast.style.display = 'none';
        }, 2000);
      }
    });
  }

  if (btnClearSeenVideos) {
    btnClearSeenVideos.addEventListener('click', () => {
      chrome.storage.local.set({ seenVideosMap: {} }, () => {
        if (toast) {
          toast.textContent = 'Watched video history cleared!';
          toast.style.display = 'block';
          setTimeout(() => {
            toast.style.display = 'none';
            toast.textContent = 'Preferences saved successfully!';
          }, 2000);
        }
      });
    });
  }

  // Auto-save immediately when user toggles or changes any preference
  if (dimSeenVideosInput) dimSeenVideosInput.addEventListener('change', () => saveOptions(true));
  if (askFilenameInput) askFilenameInput.addEventListener('change', () => saveOptions(true));
  if (showFloatingBtnInput) showFloatingBtnInput.addEventListener('change', () => saveOptions(true));
  if (minSizeInput) minSizeInput.addEventListener('change', () => saveOptions(true));
  if (maxThreadsInput) maxThreadsInput.addEventListener('change', () => saveOptions(true));
  if (defaultFormatInput) defaultFormatInput.addEventListener('change', () => saveOptions(true));
  if (autoDetectInput) autoDetectInput.addEventListener('change', () => saveOptions(true));

  // Also save on form submit
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      saveOptions(true);
    });
  }

  // 3. "Check for Updates" Button Logic
  if (btnCheckUpdates) {
    btnCheckUpdates.addEventListener('click', () => {
      const currentLang = languageSelector ? languageSelector.value : 'en';
      if (updateSpinner) updateSpinner.style.display = 'inline-block';
      if (updateResultAlert) {
        updateResultAlert.style.display = 'block';
        updateResultAlert.style.background = '#e0f2fe';
        updateResultAlert.style.color = '#0369a1';
        updateResultAlert.textContent = t('checkingUpdates', currentLang);
      }

      // Allow visual feedback delay
      setTimeout(() => {
        if (chrome.runtime && typeof chrome.runtime.requestUpdateCheck === 'function') {
          try {
            chrome.runtime.requestUpdateCheck((status, details) => {
              if (updateSpinner) updateSpinner.style.display = 'none';
              if (!updateResultAlert) return;

              if (status === 'throttled') {
                updateResultAlert.style.background = '#f0fdf4';
                updateResultAlert.style.color = '#15803d';
                updateResultAlert.textContent = t('updateThrottled', currentLang);
              } else if (status === 'no_update') {
                updateResultAlert.style.background = '#f0fdf4';
                updateResultAlert.style.color = '#15803d';
                updateResultAlert.textContent = t('upToDate', currentLang);
              } else if (status === 'update_available') {
                updateResultAlert.style.background = '#fef3c7';
                updateResultAlert.style.color = '#b45309';
                const verText = details && details.version ? ` (v${details.version})` : '';
                updateResultAlert.textContent = `${t('updateAvailable', currentLang)}${verText}`;
              } else {
                updateResultAlert.style.background = '#f0fdf4';
                updateResultAlert.style.color = '#15803d';
                updateResultAlert.textContent = t('upToDate', currentLang);
              }
            });
          } catch (err) {
            if (updateSpinner) updateSpinner.style.display = 'none';
            if (updateResultAlert) {
              updateResultAlert.style.background = '#f0fdf4';
              updateResultAlert.style.color = '#15803d';
              updateResultAlert.textContent = t('upToDate', currentLang);
            }
          }
        } else {
          if (updateSpinner) updateSpinner.style.display = 'none';
          if (updateResultAlert) {
            updateResultAlert.style.background = '#f0fdf4';
            updateResultAlert.style.color = '#15803d';
            updateResultAlert.textContent = t('upToDate', currentLang);
          }
        }
      }, 750);
    });
  }

  // 4. 1-Click Copy for Crypto Addresses on Options page
  const copyCryptoButtons = document.querySelectorAll('.btn-copy-crypto');
  copyCryptoButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        const addrText = targetEl.textContent.trim();
        const currentLang = languageSelector ? languageSelector.value : 'en';
        navigator.clipboard.writeText(addrText).then(() => {
          const originalText = btn.textContent;
          btn.textContent = t('copiedBtn', currentLang);
          btn.classList.add('copied');
          setTimeout(() => {
            btn.textContent = originalText;
            btn.classList.remove('copied');
          }, 2000);
        }).catch(() => {});
      }
    });
  });
});
