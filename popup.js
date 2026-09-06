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

function isGenericOrTechnicalTitle(title) {
  if (!title) return true;
  const clean = title.toLowerCase().trim();
  if (!clean || clean.length <= 2) return true;

  const genericList = [
    'master', 'index', 'playlist', 'video', 'manifest', 'stream',
    'video_completo', 'video_stream', 'full_video', 'full video',
    'media', 'videoplayback', 'playback', 'output', 'file', 'source',
    'untitled', 'default', 'null', 'undefined', 'movie', 'clip',
    'watch', 'play', 'download', 'streaming'
  ];
  if (genericList.includes(clean)) return true;

  if (/^tpl[-_]?/i.test(clean) || /^tpl\d+/i.test(clean) || clean === 'tpl' || clean.startsWith('tpl')) return true;
  if (/^(hls|dash|seg|segment|chunk|frag|fragment|part)[-_]?\d*/i.test(clean)) return true;
  if (/^(video|stream|track|aud|audio)[-_]?\d+/i.test(clean)) return true;
  if (/^(\d{3,4}p|\d{3,4}x\d{3,4}|mp4|webm|m3u8|ts|m4s)$/i.test(clean)) return true;
  if (/^[0-9a-f]{12,}$/i.test(clean)) return true;

  return false;
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
    } else if (message.action === 'MEDIA_UPDATED') {
      loadTabMedia();
    }
  });

  // Video Orientation / Rotation Listeners
  const btnRotateLeft = document.getElementById('btnRotateLeft');
  const btnRotateRight = document.getElementById('btnRotateRight');
  const btnRotate180 = document.getElementById('btnRotate180');
  const btnRotateReset = document.getElementById('btnRotateReset');

  if (btnRotateLeft) {
    btnRotateLeft.addEventListener('click', () => {
      previewRotationAngle = (previewRotationAngle + 270) % 360;
      updatePreviewRotationUI();
    });
  }
  if (btnRotateRight) {
    btnRotateRight.addEventListener('click', () => {
      previewRotationAngle = (previewRotationAngle + 90) % 360;
      updatePreviewRotationUI();
    });
  }
  if (btnRotate180) {
    btnRotate180.addEventListener('click', () => {
      previewRotationAngle = (previewRotationAngle + 180) % 360;
      updatePreviewRotationUI();
    });
  }
  if (btnRotateReset) {
    btnRotateReset.addEventListener('click', () => {
      previewRotationAngle = 0;
      updatePreviewRotationUI();
    });
  }

  // Preview Modal Listeners
  const modalPreview = document.getElementById('modalPreview');
  const modalPreviewBtnClose = document.getElementById('modalPreviewBtnClose');
  const previewBtnDownload = document.getElementById('previewBtnDownload');

  if (modalPreviewBtnClose) {
    modalPreviewBtnClose.addEventListener('click', closePreview);
  }

  if (previewBtnDownload) {
    previewBtnDownload.addEventListener('click', () => {
      if (!activePreviewItem) return;
      const format = document.getElementById('previewFormatSelect')?.value || 'mp4';
      const itemToDownload = { ...activePreviewItem, rotation: previewRotationAngle };
      closePreview();
      triggerDownload(itemToDownload, format, itemToDownload.selectedVariantUrl);
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (modalPreview && modalPreview.style.display !== 'none') {
        closePreview();
      }
    }
  });
});

let currentHlsInstance = null;
let activePreviewItem = null;
let previewRotationAngle = 0;

function updatePreviewRotationUI() {
  const player = document.getElementById('previewPlayer');
  const badge = document.getElementById('previewRotateBadge');
  if (player) {
    if (previewRotationAngle === 90 || previewRotationAngle === 270) {
      player.style.transform = `rotate(${previewRotationAngle}deg) scale(0.75)`;
    } else {
      player.style.transform = `rotate(${previewRotationAngle}deg) scale(1)`;
    }
  }
  if (badge) {
    badge.textContent = previewRotationAngle === 0 ? '0° (Original)' : `${previewRotationAngle}°`;
  }
}

function openPreview(item) {
  activePreviewItem = item;
  previewRotationAngle = item.rotation || 0;
  updatePreviewRotationUI();
  const modal = document.getElementById('modalPreview');
  const player = document.getElementById('previewPlayer');
  const titleEl = document.getElementById('previewTitle');
  const qualityBadge = document.getElementById('previewQualityBadge');
  const typeBadge = document.getElementById('previewTypeBadge');
  const statusMsg = document.getElementById('previewStatusMsg');

  if (!modal || !player) return;

  closePreviewPlayerOnly();

  if (titleEl) titleEl.textContent = item.title || 'Video Preview';
  if (qualityBadge) qualityBadge.textContent = '★ ' + (item.quality || 'Auto HD');
  if (typeBadge) {
    typeBadge.textContent = item.type || 'MP4';
    typeBadge.className = `thumbnail-badge-type tag tag-type-${(item.type || 'mp4').toLowerCase()}`;
  }
  if (statusMsg) statusMsg.style.display = 'none';

  modal.style.display = 'flex';

  const streamUrl = item.selectedVariantUrl || item.url;

  if (item.type === 'HLS' || streamUrl.includes('.m3u8')) {
    if (window.Hls && window.Hls.isSupported()) {
      currentHlsInstance = new window.Hls({
        maxBufferLength: 15,
        enableWorker: true
      });
      currentHlsInstance.loadSource(streamUrl);
      currentHlsInstance.attachMedia(player);
      currentHlsInstance.on(window.Hls.Events.MANIFEST_PARSED, () => {
        player.play().catch(() => {});
      });
      currentHlsInstance.on(window.Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          if (statusMsg) {
            statusMsg.textContent = 'Preview notice: Direct stream playback requires unrestricted CORS. Full video download remains available!';
            statusMsg.style.display = 'block';
          }
        }
      });
    } else if (player.canPlayType('application/vnd.apple.mpegurl')) {
      player.src = streamUrl;
      player.play().catch(() => {});
    } else {
      if (statusMsg) {
        statusMsg.textContent = 'HLS preview playback not supported natively in this browser.';
        statusMsg.style.display = 'block';
      }
    }
  } else {
    player.src = streamUrl;
    player.play().catch(() => {});
  }
}

function closePreviewPlayerOnly() {
  const player = document.getElementById('previewPlayer');
  if (player) {
    player.pause();
    player.removeAttribute('src');
    player.load();
  }
  if (currentHlsInstance) {
    currentHlsInstance.destroy();
    currentHlsInstance = null;
  }
}

function closePreview() {
  closePreviewPlayerOnly();
  const modal = document.getElementById('modalPreview');
  if (modal) modal.style.display = 'none';
  activePreviewItem = null;
}

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

    // Preview trigger on thumbnail click
    const thumbFrame = card.querySelector('.btn-trigger-preview');
    if (thumbFrame) {
      thumbFrame.addEventListener('click', () => openPreview(item));
    }

    // Preview button
    const btnPreview = card.querySelector('.btn-preview');
    if (btnPreview) {
      btnPreview.addEventListener('click', () => openPreview(item));
    }

    // Quality selector change
    const qualitySelect = card.querySelector('.quality-select');
    if (qualitySelect) {
      qualitySelect.addEventListener('change', (e) => {
        item.selectedVariantUrl = e.target.value;
      });
    }

    // Download Button
    const btnDownload = card.querySelector('.btn-download');
    if (btnDownload) {
      btnDownload.addEventListener('click', () => {
        const format = card.querySelector('.format-select')?.value || 'mp4';
        const selectedVariant = card.querySelector('.quality-select')?.value || item.selectedVariantUrl;
        triggerDownload(item, format, selectedVariant);
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

  let cleanTitle = item.title;
  if (isGenericOrTechnicalTitle(cleanTitle)) {
    if (currentTabTitle && !isGenericOrTechnicalTitle(currentTabTitle)) {
      cleanTitle = currentTabTitle;
    } else {
      const goodItem = allDetectedMedia.find(m => m.title && !isGenericOrTechnicalTitle(m.title));
      cleanTitle = goodItem ? goodItem.title : 'Video';
    }
  }

  const qualitySelectHTML = (item.variants && item.variants.length > 1) ? `
    <div class="media-quality-row">
      <span class="quality-label">Resolution:</span>
      <select class="quality-select" title="Choose stream resolution">
        ${item.variants.map((v, idx) => {
          const resHeight = v.resolution ? (v.resolution.split('x')[1] ? v.resolution.split('x')[1] + 'p' : v.resolution) : (v.name || 'Stream');
          const mbps = v.bandwidth ? ` (~${(v.bandwidth / 1000000).toFixed(1)} Mbps)` : '';
          const isSelected = item.selectedVariantUrl ? (item.selectedVariantUrl === v.url) : (idx === 0);
          return `<option value="${escapeHtml(v.url)}" ${isSelected ? 'selected' : ''}>★ ${resHeight}${mbps}</option>`;
        }).join('')}
      </select>
    </div>
  ` : '';

  return `
    <div class="media-card" id="card_${item.id}">
      
      <!-- Static Video Screenshot Photo with Play Overlay -->
      <div class="media-thumbnail-frame btn-trigger-preview" title="Click to preview video">
        ${posterImgHTML}
        ${placeholderHTML}
        <div class="thumb-play-overlay">
          <div class="thumb-play-circle">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#ffffff">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          </div>
        </div>
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

        <!-- HLS Stream Quality / Resolution Selector -->
        ${qualitySelectHTML}

        <!-- Download Action Buttons with Format Selector and Preview Button -->
        <div class="media-actions">
          <select class="format-select" title="Select video format (MP4, MKV, TS)">
            <option value="mp4" selected>MP4</option>
            <option value="mkv">MKV</option>
            <option value="ts">TS</option>
          </select>

          <button class="btn-primary btn-download" title="Download in selected quality">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download
          </button>

          <button class="btn-secondary btn-preview" title="Preview video before downloading">
            ▶ Preview
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

function triggerDownload(item, format = 'mp4', selectedVariantUrl = null) {
  let finalTitle = item.title;
  if (isGenericOrTechnicalTitle(finalTitle)) {
    if (currentTabTitle && !isGenericOrTechnicalTitle(currentTabTitle)) {
      finalTitle = currentTabTitle;
    } else {
      const goodItem = allDetectedMedia.find(m => m.title && !isGenericOrTechnicalTitle(m.title));
      finalTitle = goodItem ? goodItem.title : 'Video';
    }
  }

  const updatedItem = {
    ...item,
    selectedVariantUrl: selectedVariantUrl || item.selectedVariantUrl || null
  };

  chrome.storage.sync.get({ askFilename: false }, (res) => {
    if (res && res.askFilename) {
      promptForFilename(finalTitle, (chosenTitle) => {
        if (chosenTitle === null) {
          // User clicked Cancel in the modal
          return;
        }
        executeDownload(updatedItem, chosenTitle, format);
      });
    } else {
      executeDownload(updatedItem, finalTitle, format);
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
  if (!container || !list) return;

  const now = Date.now();
  // Filter out downloads that completed more than 2.5s ago
  const activeOnly = (downloads || []).filter(dl => {
    if (dl.status === 'complete' && dl.completedAt && (now - dl.completedAt > 2500)) {
      return false;
    }
    return true;
  });

  if (activeOnly.length === 0) {
    container.style.display = 'none';
    list.innerHTML = '';
    return;
  }

  container.style.display = 'block';
  list.innerHTML = activeOnly.map(dl => {
    const isComplete = dl.status === 'complete' || (dl.progress >= 100 && dl.status !== 'downloading');
    return `
      <div class="download-item" id="dl_${dl.id}">
        <div class="download-item-header">
          <div class="download-title">${escapeHtml(dl.title || 'Downloading video...')}</div>
          ${isComplete
            ? '<span style="color: var(--vdh-green); font-size: 11px; font-weight: 700;">✓ Saved</span>'
            : `<button class="btn-cancel-dl" data-id="${dl.id}" title="Cancel download">✕ Cancel</button>`
          }
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width: ${dl.progress || 0}%; ${isComplete ? 'background: var(--vdh-green);' : ''}"></div>
        </div>
        <div class="download-meta">
          ${isComplete
            ? `<span style="color: var(--vdh-green); font-weight: 700;">Download complete! (100% • ${formatBytes(dl.downloadedBytes)})</span>`
            : `<span>${dl.progress || 0}% (${formatBytes(dl.downloadedBytes)})</span><span>⚡ ${formatSpeed(dl.speedBps)}</span>`
          }
        </div>
      </div>
    `;
  }).join('');

  // Auto-remove completed items after 2.5 seconds
  activeOnly.forEach(dl => {
    if (dl.status === 'complete' || (dl.progress >= 100 && dl.status !== 'downloading')) {
      setTimeout(() => {
        const itemEl = document.getElementById(`dl_${dl.id}`);
        if (itemEl) itemEl.remove();
        if (list.children.length === 0) container.style.display = 'none';
      }, 2500);
    }
  });

  // Attach cancel download listeners
  list.querySelectorAll('.btn-cancel-dl').forEach(btn => {
    btn.addEventListener('click', () => {
      const dlId = btn.dataset.id;
      chrome.runtime.sendMessage({ action: 'CANCEL_DOWNLOAD', downloadId: dlId }, () => {
        if (chrome.runtime.lastError) return;
        const itemEl = document.getElementById(`dl_${dlId}`);
        if (itemEl) itemEl.remove();
        if (list.children.length === 0) container.style.display = 'none';
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
      if (fill) {
        fill.style.width = '100%';
        fill.style.background = 'var(--vdh-green)';
      }
      const cancelBtn = el.querySelector('.btn-cancel-dl');
      if (cancelBtn) cancelBtn.outerHTML = '<span style="color: var(--vdh-green); font-size: 11px; font-weight: 700;">✓ Saved</span>';
      meta.innerHTML = `<span style="color: var(--vdh-green); font-weight: bold;">Download complete! (100% • ${formatBytes(state.downloadedBytes)})</span>`;
      setTimeout(() => {
        el.remove();
        if (list.children.length === 0) container.style.display = 'none';
        loadTabMedia();
      }, 2500);
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

// Live listener for download progress and completion events
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'DOWNLOAD_PROGRESS' || message.action === 'DOWNLOAD_STATUS') {
    updateActiveDownloadUI(message.state);
  }
});

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
