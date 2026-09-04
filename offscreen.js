/**
 * StreamGrabber - Offscreen Document
 * Provides full DOM environment (URL.createObjectURL) to download Blobs in Manifest V3
 */

function getBlobFromDB(key) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('StreamGrabberDB', 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('blobs');
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('blobs', 'readwrite');
      const store = tx.objectStore('blobs');
      const getReq = store.get(key);
      getReq.onsuccess = () => {
        const blob = getReq.result;
        try {
          store.delete(key);
        } catch (e) {}
        tx.oncomplete = () => {
          db.close();
          resolve(blob);
        };
      };
      getReq.onerror = () => {
        db.close();
        reject(getReq.error);
      };
    };
    req.onerror = () => reject(req.error);
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'CREATE_BLOB_URL') {
    const { key } = message;
    getBlobFromDB(key)
      .then((blob) => {
        if (!blob) throw new Error('Blob not found in storage');
        const blobUrl = URL.createObjectURL(blob);
        sendResponse({ success: true, blobUrl });
      })
      .catch((err) => {
        sendResponse({ success: false, error: err.message });
      });
    return true; // async
  }

  if (message.action === 'REVOKE_BLOB_URL') {
    try {
      if (message.blobUrl) {
        URL.revokeObjectURL(message.blobUrl);
      }
    } catch (e) {}
    sendResponse({ success: true });
    return true;
  }
});
