/**
 * StreamGrabber - HLS (.m3u8) Downloader Engine
 * Full stream downloader with In-Page Fetch Bridge (Bypasses HTTP 412 / CORS), AES-128 Decryption & Segment Joining
 */

export function saveBlobToDB(key, blob) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('StreamGrabberDB', 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('blobs');
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('blobs', 'readwrite');
      tx.objectStore('blobs').put(blob, key);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    };
    req.onerror = () => reject(req.error);
  });
}

export async function ensureOffscreenDocument() {
  if (!chrome.offscreen) return;
  try {
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT']
    });
    if (existingContexts && existingContexts.length > 0) return;
  } catch (e) {}

  try {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['BLOBS'],
      justification: 'Create Blob URL for video file download'
    });
  } catch (err) {
    if (!err.message?.includes('Only a single offscreen document may be created')) {
      console.warn('[StreamGrabber] Error creating offscreen doc:', err);
    }
  }
}

export class HLSEngine {
  constructor(options = {}) {
    this.maxParallel = options.maxParallel || 6;
    this.activeDownloads = new Map();
    this.keyCache = new Map();
  }

  resolveUrl(relative, base) {
    try {
      return new URL(relative, base).href;
    } catch (e) {
      return relative;
    }
  }

  hexToUint8Array(hexString) {
    const cleaned = hexString.replace(/^0x/i, '');
    const bytes = new Uint8Array(cleaned.length / 2);
    for (let i = 0; i < cleaned.length; i += 2) {
      bytes[i / 2] = parseInt(cleaned.substr(i, 2), 16);
    }
    return bytes;
  }

  seqToIV(seq) {
    const iv = new Uint8Array(16);
    const view = new DataView(iv.buffer);
    view.setUint32(12, seq, false);
    return iv;
  }

  /**
   * Resilient Text Fetcher: Tries in-page fetch via content script first (bypasses HTTP 412 / CORS),
   * then falls back to background fetch.
   */
  async fetchPlaylistText(url, tabId, referer) {
    // 1. Try In-Page Fetch (100% immune to HTTP 412 Precondition Failed)
    if (tabId) {
      try {
        const response = await new Promise((resolve) => {
          chrome.tabs.sendMessage(tabId, { action: 'PAGE_FETCH_TEXT', url }, (res) => {
            if (chrome.runtime.lastError || !res) {
              resolve(null);
            } else {
              resolve(res);
            }
          });
        });

        if (response && response.success && response.text) {
          return response.text;
        }
      } catch (e) {}
    }

    // 2. Fallback: Background fetch without restricted conditional headers
    const headers = {
      'Accept': '*/*'
    };
    if (referer) {
      try {
        headers['Referer'] = referer;
      } catch (e) {}
    }

    const resp = await fetch(url, {
      headers,
      cache: 'no-store'
    });

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status} reading playlist`);
    }

    return await resp.text();
  }

  /**
   * Resilient Segment Buffer Fetcher
   */
  async fetchSegmentBuffer(segUrl, tabId, referer) {
    const headers = {
      'Accept': '*/*'
    };
    if (referer) {
      try {
        headers['Referer'] = referer;
      } catch (e) {}
    }

    try {
      const resp = await fetch(segUrl, { headers, cache: 'no-store' });
      if (resp.ok) {
        return await resp.arrayBuffer();
      }
    } catch (e) {}

    // Fallback: in-page fetch
    if (tabId) {
      const response = await new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, { action: 'PAGE_FETCH_BUFFER', url: segUrl }, (res) => {
          if (chrome.runtime.lastError || !res) resolve(null);
          else resolve(res);
        });
      });

      if (response && response.success && response.base64) {
        const binary = atob(response.base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
      }
    }

    throw new Error(`Could not download video segment: ${segUrl}`);
  }

  parseM3U8(content, baseUrl) {
    const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const isMaster = lines.some(line => line.startsWith('#EXT-X-STREAM-INF'));

    if (isMaster) {
      const variants = [];
      let currentVariant = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('#EXT-X-STREAM-INF:')) {
          currentVariant = {};
          const resMatch = line.match(/RESOLUTION=(\d+x\d+)/i);
          if (resMatch) currentVariant.resolution = resMatch[1];
          const bwMatch = line.match(/BANDWIDTH=(\d+)/i);
          if (bwMatch) currentVariant.bandwidth = parseInt(bwMatch[1], 10);
          const nameMatch = line.match(/NAME="([^"]+)"/i);
          if (nameMatch) currentVariant.name = nameMatch[1];
        } else if (currentVariant && !line.startsWith('#')) {
          currentVariant.url = this.resolveUrl(line, baseUrl);
          variants.push(currentVariant);
          currentVariant = null;
        }
      }

      // Always sort to select highest quality: resolution first, then bandwidth
      variants.sort((a, b) => {
        const getResHeight = (res) => {
          if (!res) return 0;
          const parts = res.split('x');
          return parts.length > 1 ? parseInt(parts[1], 10) : parseInt(res, 10) || 0;
        };
        const hA = getResHeight(a.resolution);
        const hB = getResHeight(b.resolution);
        if (hA !== hB) return hB - hA;
        return (b.bandwidth || 0) - (a.bandwidth || 0);
      });
      return { isMaster: true, variants };
    } else {
      const segments = [];
      let currentKeyInfo = null;
      let currentSeq = 0;
      let totalDurationSec = 0;
      let initSegmentUrl = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('#EXT-X-MAP:')) {
          const mapMatch = line.match(/URI="([^"]+)"/i);
          if (mapMatch) {
            initSegmentUrl = this.resolveUrl(mapMatch[1], baseUrl);
          }
        } else if (line.startsWith('#EXTINF:')) {
          const durMatch = line.match(/#EXTINF:([\d.]+)/);
          if (durMatch) totalDurationSec += parseFloat(durMatch[1]);
        } else if (line.startsWith('#EXT-X-MEDIA-SEQUENCE:')) {
          currentSeq = parseInt(line.split(':')[1], 10) || 0;
        } else if (line.startsWith('#EXT-X-KEY:')) {
          const methodMatch = line.match(/METHOD=([^,\s]+)/);
          const method = methodMatch ? methodMatch[1] : null;

          if (method === 'AES-128') {
            const uriMatch = line.match(/URI="([^"]+)"/);
            const ivMatch = line.match(/IV=([^,\s]+)/);
            if (uriMatch) {
              currentKeyInfo = {
                method: 'AES-128',
                keyUrl: this.resolveUrl(uriMatch[1], baseUrl),
                iv: ivMatch ? this.hexToUint8Array(ivMatch[1]) : null
              };
            }
          } else {
            currentKeyInfo = null;
          }
        } else if (!line.startsWith('#')) {
          segments.push({
            url: this.resolveUrl(line, baseUrl),
            seq: currentSeq,
            keyInfo: currentKeyInfo ? { ...currentKeyInfo, iv: currentKeyInfo.iv || this.seqToIV(currentSeq) } : null
          });
          currentSeq++;
        }
      }

      // Prepend fMP4 init segment (ftyp + moov headers) so video plays cleanly
      if (initSegmentUrl) {
        segments.unshift({
          url: initSegmentUrl,
          seq: -1,
          isInit: true,
          keyInfo: null
        });
      }

      return { isMaster: false, segments, totalDurationSec: Math.round(totalDurationSec) };
    }
  }

  async getCryptoKey(keyUrl, tabId, referer) {
    if (this.keyCache.has(keyUrl)) {
      return this.keyCache.get(keyUrl);
    }

    const rawKey = await this.fetchSegmentBuffer(keyUrl, tabId, referer);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      rawKey,
      { name: 'AES-CBC' },
      false,
      ['decrypt']
    );

    this.keyCache.set(keyUrl, cryptoKey);
    return cryptoKey;
  }

  async decryptSegment(encryptedBuffer, keyInfo, tabId, referer) {
    if (!keyInfo) return encryptedBuffer;

    try {
      const cryptoKey = await this.getCryptoKey(keyInfo.keyUrl, tabId, referer);
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-CBC', iv: keyInfo.iv },
        cryptoKey,
        encryptedBuffer
      );
      return decrypted;
    } catch (err) {
      console.warn('Fallo en descifrado AES, usando original:', err);
      return encryptedBuffer;
    }
  }

  /**
   * Start complete HLS stream download
   */
  async startDownload({ id, url, selectedVariantUrl, title, tabId, referer, format, saveAs, onProgress, onStatusChange }) {
    const downloadId = id || 'hls_' + Date.now();
    const targetFormat = (format || 'mp4').toLowerCase();
    
    const downloadState = {
      id: downloadId,
      url,
      selectedVariantUrl,
      title: title || 'full_video',
      format: targetFormat,
      status: 'analyzing',
      progress: 0,
      downloadedBytes: 0,
      totalSegments: 0,
      completedSegments: 0,
      speedBps: 0,
      cancelRequested: false
    };

    this.activeDownloads.set(downloadId, downloadState);

    const updateState = (updates) => {
      Object.assign(downloadState, updates);
      if (onProgress) onProgress(downloadState);
      if (onStatusChange && updates.status) onStatusChange(downloadState);
    };

    try {
      updateState({ status: 'analyzing' });

      // Target URL: either the user's explicitly selected variant or the master playlist URL
      const streamUrl = selectedVariantUrl || url;
      const initialText = await this.fetchPlaylistText(streamUrl, tabId, referer);
      let parsed = this.parseM3U8(initialText, streamUrl);

      // If it's a Master playlist (and user didn't pick a direct media playlist), select best or chosen variant
      let selectedBandwidth = 0;
      if (parsed.isMaster) {
        if (!parsed.variants || parsed.variants.length === 0) {
          throw new Error('No stream variants found in stream');
        }
        const chosenVariant = (selectedVariantUrl && parsed.variants.find(v => v.url === selectedVariantUrl)) || parsed.variants[0];
        selectedBandwidth = chosenVariant.bandwidth || 0;
        const mediaText = await this.fetchPlaylistText(chosenVariant.url, tabId, referer);
        parsed = this.parseM3U8(mediaText, chosenVariant.url);
      }

      if (!parsed.segments || parsed.segments.length === 0) {
        throw new Error('No video segments found in playlist');
      }

      const segments = parsed.segments;
      downloadState.totalSegments = segments.length;

      // Smart Size & Duration Estimation for UI
      if (parsed.totalDurationSec) {
        downloadState.durationSec = parsed.totalDurationSec;
        if (selectedBandwidth > 0) {
          downloadState.estimatedBytes = Math.round((selectedBandwidth * parsed.totalDurationSec) / 8);
        }
      }

      updateState({
        status: 'downloading',
        totalSegments: segments.length,
        durationSec: downloadState.durationSec,
        estimatedBytes: downloadState.estimatedBytes
      });

      const segmentBuffers = new Array(segments.length);
      let loadedCount = 0;
      let totalBytes = 0;
      let lastSpeedCheck = Date.now();
      let bytesSinceCheck = 0;

      const downloadSegment = async (index) => {
        if (downloadState.cancelRequested) return;

        const seg = segments[index];
        let retries = 3;

        while (retries > 0) {
          try {
            let buffer = await this.fetchSegmentBuffer(seg.url, tabId, referer);

            if (seg.keyInfo) {
              buffer = await this.decryptSegment(buffer, seg.keyInfo, tabId, referer);
            }

            segmentBuffers[index] = buffer;
            loadedCount++;
            totalBytes += buffer.byteLength;
            bytesSinceCheck += buffer.byteLength;

            const now = Date.now();
            const elapsedSec = (now - lastSpeedCheck) / 1000;
            if (elapsedSec >= 0.5) {
              downloadState.speedBps = bytesSinceCheck / elapsedSec;
              lastSpeedCheck = now;
              bytesSinceCheck = 0;
            }

            const progress = Math.round((loadedCount / segments.length) * 100);
            updateState({
              progress,
              completedSegments: loadedCount,
              downloadedBytes: totalBytes
            });
            break;
          } catch (err) {
            retries--;
            if (retries === 0) throw new Error(`Error en fragmento ${index + 1}/${segments.length}: ${err.message}`);
            await new Promise(r => setTimeout(r, 600));
          }
        }
      };

      // Bulletproof Parallel Worker Queue with shared atomic index
      let nextIndex = 0;
      let downloadError = null;

      const worker = async () => {
        while (nextIndex < segments.length && !downloadState.cancelRequested && !downloadError) {
          const currentIndex = nextIndex++;
          try {
            await downloadSegment(currentIndex);
          } catch (err) {
            console.error(`Segment ${currentIndex} download failed:`, err);
            downloadError = err;
          }
        }
      };

      const numWorkers = Math.min(this.maxParallel || 5, segments.length);
      const workers = [];
      for (let w = 0; w < numWorkers; w++) {
        workers.push(worker());
      }

      await Promise.all(workers);

      if (downloadState.cancelRequested) {
        updateState({ status: 'cancelled' });
        return null;
      }

      if (downloadError) {
        throw downloadError;
      }

      // Verify every segment is a valid, non-empty ArrayBuffer (prevents "undefined" holes and corrupted video)
      const validBuffers = [];
      for (let i = 0; i < segments.length; i++) {
        let buf = segmentBuffers[i];
        if (!buf || !(buf instanceof ArrayBuffer) || buf.byteLength === 0) {
          try {
            await downloadSegment(i);
            buf = segmentBuffers[i];
          } catch (e) {
            throw new Error(`Error: Could not retrieve segment ${i + 1}/${segments.length}`);
          }
        }
        if (buf && buf instanceof ArrayBuffer && buf.byteLength > 0) {
          validBuffers.push(buf);
        } else {
          throw new Error(`Error: Incomplete segment ${i + 1}`);
        }
      }

      updateState({ status: 'merging', progress: 99 });

      // Set MIME type and filename
      let mimeType = 'video/mp4';
      if (targetFormat === 'mkv') mimeType = 'video/x-matroska';
      else if (targetFormat === 'ts') mimeType = 'video/mp2t';

      const concatenatedBlob = new Blob(validBuffers, { type: mimeType });
      const sanitizedTitle = (downloadState.title || 'full_video')
        .replace(/[/\\?%*:|"<>]/g, '_')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 100);
      const filename = `${sanitizedTitle}.${targetFormat}`;

      // 1. Primary: Download via Offscreen Document and native ObjectURL (avoids Chrome data: URL limits)
      let downloadedViaOffscreen = false;

      if (chrome.offscreen) {
        try {
          const blobKey = 'hls_' + Date.now();
          await saveBlobToDB(blobKey, concatenatedBlob);
          await ensureOffscreenDocument();

          const createRes = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
              action: 'CREATE_BLOB_URL',
              key: blobKey
            }, (res) => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else if (res && res.success && res.blobUrl) {
                resolve(res);
              } else {
                reject(new Error(res?.error || 'Offscreen Blob URL creation failed'));
              }
            });
          });

          const blobUrl = createRes.blobUrl;
          const downloadItemId = await new Promise((resolve, reject) => {
            chrome.downloads.download({
              url: blobUrl,
              filename: filename,
              saveAs: Boolean(saveAs)
            }, (id) => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else {
                resolve(id);
              }
            });
          });

          downloadedViaOffscreen = true;
          updateState({ status: 'complete', progress: 100, downloadItemId });
          setTimeout(() => {
            chrome.runtime.sendMessage({ action: 'REVOKE_BLOB_URL', blobUrl }).catch(() => {});
          }, 120000);
          return { downloadItemId, filename, size: concatenatedBlob.size };
        } catch (offErr) {
          console.warn('[StreamGrabber] Offscreen download fallback triggered:', offErr);
        }
      }

      // 2. Direct ObjectURL if running in a window context where URL.createObjectURL is supported
      if (!downloadedViaOffscreen && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
        const downloadUrl = URL.createObjectURL(concatenatedBlob);
        return new Promise((resolve, reject) => {
          chrome.downloads.download({
            url: downloadUrl,
            filename: filename,
            saveAs: Boolean(saveAs)
          }, (downloadItemId) => {
            if (chrome.runtime.lastError) {
              updateState({ status: 'error', error: chrome.runtime.lastError.message });
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              updateState({ status: 'complete', progress: 100, downloadItemId });
              resolve({ downloadItemId, filename, size: concatenatedBlob.size });
            }
          });
        });
      }

      // 3. Last-resort fallback for tiny files
      const downloadUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Error processing video file in memory'));
        reader.readAsDataURL(concatenatedBlob);
      });

      return new Promise((resolve, reject) => {
        chrome.downloads.download({
          url: downloadUrl,
          filename: filename,
          saveAs: Boolean(options.saveAs)
        }, (downloadItemId) => {
          if (chrome.runtime.lastError) {
            updateState({ status: 'error', error: chrome.runtime.lastError.message });
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            updateState({ status: 'complete', progress: 100, downloadItemId });
            resolve({ downloadItemId, filename, size: concatenatedBlob.size });
          }
        });
      });

    } catch (err) {
      updateState({ status: 'error', error: err.message });
      throw err;
    }
  }

  cancelDownload(downloadId) {
    const state = this.activeDownloads.get(downloadId);
    if (state) {
      state.cancelRequested = true;
      state.status = 'cancelled';
    }
  }
}

export const hlsEngine = new HLSEngine();
