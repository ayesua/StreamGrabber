/**
 * StreamGrabber - Popup Script
 * Shows static video frame photos, format selector, inline renaming, filter pills, and active download controls
 */

let currentTabId = null;
let currentTabUrl = '';
let currentTabTitle = '';
let allDetectedMedia = [];
let currentFilter = 'all'; // 'all' | 'video' | 'audio'

function formatSpeed(bps) {
  if (!bps || bps <= 0) return '0 KB/s';
  if (bps < 1024 * 1024) return (bps / 1024).toFixed(1) + ' KB/s';
  return (bps / (1024 * 1024)).toFixed(2) + ' MB/s';
}

function formatBytes(bytes) {
  if (!bytes) return '0 MB';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Get Active Tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    currentTabId = tab.id;
    currentTabUrl = tab.url;
    currentTabTitle = tab.title || tab.url;
    const titleEl = document.getElementById('currentTabTitle');
    if (titleEl) titleEl.textContent = tab.title || tab.url;
    loadTabMedia();
  }

  // Quick Win: Filter Pills Bar (Todos | Videos | Audios)
  const pills = document.querySelectorAll('.pill-btn');
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentFilter = pill.dataset.filter;
      renderMediaList(allDetectedMedia);
    });
  });

  // Navigation Links
  const btnRescan = document.getElementById('btnRescan');
  if (btnRescan) {
    btnRescan.addEventListener('click', () => {
      if (!currentTabId) return;
      chrome.scripting.executeScript({
        target: { tabId: currentTabId },
        files: ['content.js']
      }).catch(() => {});
      setTimeout(loadTabMedia, 600);
    });
  }

  const btnOpenPremium = document.getElementById('btnOpenPremium');
  if (btnOpenPremium) {
    btnOpenPremium.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('premium.html') });
    });
  }

  const footerPremiumLink = document.getElementById('footerPremiumLink');
  if (footerPremiumLink) {
    footerPremiumLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: chrome.runtime.getURL('premium.html') });
    });
  }

  const btnOpenOptions = document.getElementById('btnOpenOptions');
  if (btnOpenOptions) {
    btnOpenOptions.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
    });
  }

  // PayPal Donation Button - Directly opens developer PayPal.me link (non-editable, fixed for end users)
  const btnPayPal = document.getElementById('btnPayPal');
  if (btnPayPal) {
    btnPayPal.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://paypal.me/yesarts' });
    });
  }

  // Generic Donation Button Fallback
  const btnDonate = document.getElementById('btnDonate');
  if (btnDonate) {
    btnDonate.addEventListener('click', () => {
      chrome.storage.sync.get({ donationUrl: '' }, (res) => {
        if (res.donationUrl && res.donationUrl.startsWith('http')) {
          chrome.tabs.create({ url: res.donationUrl });
        } else {
          chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
        }
      });
    });
  }

  // Feedback Controls (Only appears when user clicks Feedback)
  const btnFeedback = document.getElementById('btnFeedback');
  const modalFeedback = document.getElementById('modalFeedback');
  const modalFeedbackBtnClose = document.getElementById('modalFeedbackBtnClose');
  const btnOpenFeedbackEmail = document.getElementById('btnOpenFeedbackEmail');
  const btnCopyFeedbackEmail = document.getElementById('btnCopyFeedbackEmail');

  const openFeedbackMail = () => {
    chrome.tabs.create({ url: 'mailto:ayesua@gmail.com?subject=StreamGrabber%20Feedback%20%26%20Suggestions' });
  };

  if (btnFeedback && modalFeedback) {
    btnFeedback.addEventListener('click', () => {
      modalFeedback.style.display = 'flex';
    });
  }

  if (modalFeedbackBtnClose && modalFeedback) {
    modalFeedbackBtnClose.addEventListener('click', () => {
      modalFeedback.style.display = 'none';
    });
  }

  if (btnOpenFeedbackEmail) {
    btnOpenFeedbackEmail.addEventListener('click', openFeedbackMail);
  }

  if (btnCopyFeedbackEmail) {
    btnCopyFeedbackEmail.addEventListener('click', () => {
      navigator.clipboard.writeText('ayesua@gmail.com');
      btnCopyFeedbackEmail.textContent = '✅ Copied: ayesua@gmail.com';
      setTimeout(() => {
        btnCopyFeedbackEmail.textContent = '📋 Copy Email Address';
      }, 2000);
    });
  }

  // Listen for progress updates from background
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'DOWNLOAD_PROGRESS' || message.action === 'DOWNLOAD_STATUS') {
      updateActiveDownloadUI(message.state);
    } else if (message.action === 'DOWNLOAD_CANCELLED') {
      const el = document.getElementById(`dl_${message.id}`);
      if (el) el.remove();
      loadTabMedia();
    }
  });
});

async function loadTabMedia() {
  if (!currentTabId) return;

  chrome.runtime.sendMessage({ action: 'GET_TAB_MEDIA', tabId: currentTabId }, (response) => {
    if (chrome.runtime.lastError || !response) return;
    const { mediaList, activeDownloads } = response;

    allDetectedMedia = mediaList || [];
    updateFilterCounts(allDetectedMedia);
    renderMediaList(allDetectedMedia);
    renderActiveDownloads(activeDownloads || []);
  });
}

function updateFilterCounts(mediaList) {
  const total = mediaList.length;
  const audios = mediaList.filter(m => m.type === 'Audio').length;
  const videos = total - audios;

  const countAll = document.getElementById('countAll');
  const countVideos = document.getElementById('countVideos');
  const countAudios = document.getElementById('countAudios');

  if (countAll) countAll.textContent = total;
  if (countVideos) countVideos.textContent = videos;
  if (countAudios) countAudios.textContent = audios;
}

function renderMediaList(mediaList) {
  const container = document.getElementById('mediaListContainer');
  const emptyState = document.getElementById('emptyState');
  const countBadge = document.getElementById('mediaCount');

  // Filter based on active pill
  let filtered = mediaList;
  if (currentFilter === 'video') {
    filtered = mediaList.filter(m => m.type !== 'Audio');
  } else if (currentFilter === 'audio') {
    filtered = mediaList.filter(m => m.type === 'Audio');
  }

  countBadge.textContent = `${filtered.length} available`;

  if (filtered.length === 0) {
    container.innerHTML = '';
    emptyState.style.display = 'flex';
    return;
  }

  emptyState.style.display = 'none';
  container.innerHTML = filtered.map(item => createMediaCardHTML(item)).join('');

  // Attach button and inline rename event listeners
  filtered.forEach(item => {
    const card = document.getElementById(`card_${item.id}`);
    if (!card) return;

    // Quick Win: Inline Title Editing
    const btnEdit = card.querySelector('.btn-icon-rename');
    const titleRow = card.querySelector('.media-title-row');
    const editWrap = card.querySelector('.media-title-edit-wrap');
    const inputTitle = card.querySelector('.title-edit-input');
    const btnSave = card.querySelector('.btn-icon-save');
    const titleDisplay = card.querySelector('.media-title');

    const saveNewTitle = () => {
      if (!inputTitle) return;
      const newTitle = inputTitle.value.trim();
      if (newTitle) {
        item.title = newTitle;
        if (titleDisplay) {
          titleDisplay.textContent = newTitle;
          titleDisplay.title = newTitle;
        }
      }
      if (titleRow) titleRow.style.display = 'flex';
      if (editWrap) editWrap.style.display = 'none';
    };

    if (btnEdit) {
      btnEdit.addEventListener('click', () => {
        if (titleRow) titleRow.style.display = 'none';
        if (editWrap) {
          editWrap.style.display = 'flex';
          inputTitle.focus();
          inputTitle.select();
        }
      });
    }

    if (btnSave) {
      btnSave.addEventListener('click', saveNewTitle);
    }

    if (inputTitle) {
      inputTitle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveNewTitle();
        if (e.key === 'Escape') {
          if (titleRow) titleRow.style.display = 'flex';
          if (editWrap) editWrap.style.display = 'none';
        }
      });
    }

    // Download Button
    const btnDownload = card.querySelector('.btn-download');
    if (btnDownload) {
      btnDownload.addEventListener('click', () => {
        const format = card.querySelector('.format-select')?.value || 'mp4';
        triggerDownload(item, format);
      });
    }

    // Audio MP3 Button
    const btnAudio = card.querySelector('.btn-audio');
    if (btnAudio) {
      btnAudio.addEventListener('click', () => triggerDownload({ ...item, type: 'Audio' }, 'mp3'));
    }

    // Copy Link Button
    const btnCopy = card.querySelector('.btn-copy');
    if (btnCopy) {
      btnCopy.addEventListener('click', () => {
        navigator.clipboard.writeText(item.url);
        btnCopy.textContent = 'Copied!';
        setTimeout(() => { btnCopy.textContent = 'Copy'; }, 1500);
      });
    }
  });
}

function createMediaCardHTML(item) {
  const typeClass = item.type ? `tag-type-${item.type.toLowerCase()}` : 'tag-type-mp4';
  
  // Quick Win: Smart Size & Estimation
  let sizeText = item.sizeFormatted;
  if (!sizeText || sizeText === 'Video Completo' || sizeText === 'Full Video') {
    if (item.size) sizeText = formatBytes(item.size);
    else if (item.estimatedBytes) sizeText = '~' + formatBytes(item.estimatedBytes);
    else sizeText = 'Full Video';
  }

  const qualityText = item.quality || 'Auto HD';

  // Video Screenshot Image with seamless fallback
  const hasPoster = Boolean(item.poster);
  const posterImgHTML = hasPoster
    ? `<img src="${escapeHtml(item.poster)}" referrerpolicy="no-referrer" class="media-thumbnail-img" alt="Video frame" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />`
    : '';

  const placeholderHTML = `
    <div class="thumbnail-placeholder" style="${hasPoster ? 'display:none;' : ''}">
      <div class="camera-frame-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="23 7 16 12 23 17 23 7"/>
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
        </svg>
      </div>
      <span style="font-size: 11px; color: #94a3b8; font-weight: 500;">Video Frame</span>
    </div>
  `;

  const genericNames = ['master', 'index', 'playlist', 'video', 'manifest', 'stream', 'video_completo', 'video_stream', 'full_video'];
  let cleanTitle = item.title;
  if (!cleanTitle || genericNames.includes(cleanTitle.toLowerCase().trim())) {
    cleanTitle = currentTabTitle || 'Video';
  }

  return `
    <div class="media-card" id="card_${item.id}">
      
      <!-- Static Video Screenshot Photo (Directly Above Download Button) -->
      <div class="media-thumbnail-frame" title="Captured video frame">
        ${posterImgHTML}
        ${placeholderHTML}
        <span class="thumbnail-badge-type tag ${typeClass}">${item.type}</span>
        <span class="thumbnail-badge-res">★ ${qualityText}</span>
      </div>

      <!-- Card Details & Actions -->
      <div class="card-body">
        
        <!-- Inline Title & Rename Button (Quick Win: Editable Title) -->
        <div class="media-title-row">
          <div class="media-title" title="${escapeHtml(cleanTitle)}">${escapeHtml(cleanTitle)}</div>
          <button class="btn-icon-rename" title="Rename file before download">✏️</button>
        </div>
        <div class="media-title-edit-wrap" style="display: none;">
          <input type="text" class="title-edit-input" value="${escapeHtml(cleanTitle)}" />
          <button class="btn-icon-save" title="Save">✓</button>
        </div>

        <div class="media-meta-row">
          <span>Type: <strong>${item.type}</strong></span>
          <span>Size: <strong>${sizeText}</strong></span>
        </div>

        <!-- Download Action Buttons with Format Selector -->
        <div class="media-actions">
          <select class="format-select" title="Select video format (MP4, MKV, TS)">
            <option value="mp4" selected>MP4</option>
            <option value="mkv">MKV</option>
            <option value="ts">TS</option>
          </select>

          <button class="btn-primary btn-download" title="Download in maximum available quality">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download
          </button>

          <button class="btn-secondary btn-audio" title="Download as MP3 audio">
            🎵 MP3
          </button>
          
          <button class="btn-secondary btn-copy" title="Copy direct link">
            Copy
          </button>
        </div>
      </div>

    </div>
  `;
}

function promptForFilename(defaultTitle, callback) {
  const modal = document.getElementById('modalFilename');
  const input = document.getElementById('modalInputFilename');
  const btnConfirm = document.getElementById('modalBtnConfirm');
  const btnCancel = document.getElementById('modalBtnCancel');

  if (!modal || !input || !btnConfirm || !btnCancel) {
    callback(defaultTitle);
    return;
  }

  input.value = defaultTitle;
  modal.style.display = 'flex';

  setTimeout(() => {
    input.focus();
    input.select();
  }, 60);

  const cleanup = () => {
    modal.style.display = 'none';
    btnConfirm.onclick = null;
    btnCancel.onclick = null;
    input.onkeydown = null;
  };

  btnConfirm.onclick = () => {
    const val = input.value.trim() || defaultTitle;
    cleanup();
    callback(val);
  };

  btnCancel.onclick = () => {
    cleanup();
    callback(null); // Cancelled by user
  };

  input.onkeydown = (e) => {
    if (e.key === 'Enter') {
      const val = input.value.trim() || defaultTitle;
      cleanup();
      callback(val);
    } else if (e.key === 'Escape') {
      cleanup();
      callback(null);
    }
  };
}

function triggerDownload(item, format = 'mp4') {
  const genericNames = ['master', 'index', 'playlist', 'video', 'manifest', 'stream', 'video_completo', 'video_stream', 'full_video'];
  let finalTitle = item.title;
  if (!finalTitle || genericNames.includes(finalTitle.toLowerCase().trim())) {
    finalTitle = currentTabTitle || 'Video';
  }

  chrome.storage.sync.get({ askFilename: false }, (res) => {
    if (res && res.askFilename) {
      promptForFilename(finalTitle, (chosenTitle) => {
        if (chosenTitle === null) {
          // User clicked Cancel in the modal
          return;
        }
        executeDownload(item, chosenTitle, format);
      });
    } else {
      executeDownload(item, finalTitle, format);
    }
  });
}

function executeDownload(item, title, format) {
  const updatedItem = {
    ...item,
    title
  };

  chrome.runtime.sendMessage({
    action: 'START_DOWNLOAD',
    item: updatedItem,
    format,
    tabId: currentTabId,
    referer: currentTabUrl
  }, (response) => {
    if (chrome.runtime.lastError) return;
    if (response && response.success) {
      loadTabMedia();
    } else if (response && response.error) {
      alert(`Error starting download: ${response.error}`);
    }
  });
}

function renderActiveDownloads(downloads) {
  const container = document.getElementById('activeDownloadsContainer');
  const list = document.getElementById('activeDownloadsList');

  if (!downloads || downloads.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';
  list.innerHTML = downloads.map(dl => `
    <div class="download-item" id="dl_${dl.id}">
      <div class="download-item-header">
        <div class="download-title">${escapeHtml(dl.title || 'Downloading full video...')}</div>
        <button class="btn-cancel-dl" data-id="${dl.id}" title="Cancel download">✕ Cancel</button>
      </div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" style="width: ${dl.progress || 0}%"></div>
      </div>
      <div class="download-meta">
        <span>${dl.progress || 0}% (${formatBytes(dl.downloadedBytes)})</span>
        <span>⚡ ${formatSpeed(dl.speedBps)}</span>
      </div>
    </div>
  `).join('');

  // Attach cancel download listeners
  list.querySelectorAll('.btn-cancel-dl').forEach(btn => {
    btn.addEventListener('click', () => {
      const dlId = btn.dataset.id;
      chrome.runtime.sendMessage({ action: 'CANCEL_DOWNLOAD', downloadId: dlId }, () => {
        if (chrome.runtime.lastError) return;
        const itemEl = document.getElementById(`dl_${dlId}`);
        if (itemEl) itemEl.remove();
        loadTabMedia();
      });
    });
  });
}

function updateActiveDownloadUI(state) {
  if (!state) return;
  const container = document.getElementById('activeDownloadsContainer');
  const list = document.getElementById('activeDownloadsList');
  if (!container || !list) return;

  container.style.display = 'block';

  let el = document.getElementById(`dl_${state.id}`);
  if (!el) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'download-item';
    itemDiv.id = `dl_${state.id}`;
    itemDiv.innerHTML = `
      <div class="download-item-header">
        <div class="download-title">${escapeHtml(state.title || 'Downloading full video...')}</div>
        <button class="btn-cancel-dl" data-id="${state.id}" title="Cancel download">✕ Cancel</button>
      </div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" style="width: ${state.progress || 0}%"></div>
      </div>
      <div class="download-meta">
        <span>${state.progress || 0}% (${formatBytes(state.downloadedBytes)})</span>
        <span>⚡ ${formatSpeed(state.speedBps)}</span>
      </div>
    `;

    const cancelBtn = itemDiv.querySelector('.btn-cancel-dl');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'CANCEL_DOWNLOAD', downloadId: state.id }, () => {
          if (chrome.runtime.lastError) return;
          itemDiv.remove();
          loadTabMedia();
        });
      });
    }

    list.appendChild(itemDiv);
    el = itemDiv;
  }

  const fill = el.querySelector('.progress-bar-fill');
  const meta = el.querySelector('.download-meta');

  if (fill) fill.style.width = `${state.progress || 0}%`;
  if (meta) {
    if (state.status === 'complete') {
      if (fill) fill.style.width = '100%';
      meta.innerHTML = `<span style="color: var(--vdh-green); font-weight: bold;">Download complete! (100%)</span>`;
      setTimeout(() => {
        el.remove();
        if (list.children.length === 0) container.style.display = 'none';
        loadTabMedia();
      }, 4000);
    } else if (state.status === 'cancelled') {
      meta.innerHTML = `<span style="color: var(--vdh-text-muted);">Download cancelled</span>`;
      setTimeout(() => {
        el.remove();
        if (list.children.length === 0) container.style.display = 'none';
      }, 1500);
    } else if (state.status === 'error') {
      meta.innerHTML = `<span style="color: var(--vdh-red);">Error: ${escapeHtml(state.error || 'Streaming error')}</span>`;
    } else {
      meta.innerHTML = `
        <span>${state.progress || 0}% (${formatBytes(state.downloadedBytes)})</span>
        <span>⚡ ${formatSpeed(state.speedBps)}</span>
      `;
    }
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
