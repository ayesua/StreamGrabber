/**
 * Video DownloadHelper Pro - Options Page Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  const askFilenameInput = document.getElementById('askFilename');
  const minSizeInput = document.getElementById('minSize');
  const maxThreadsInput = document.getElementById('maxThreads');
  const defaultFormatInput = document.getElementById('defaultFormat');
  const autoDetectInput = document.getElementById('autoDetect');
  const form = document.getElementById('optionsForm');
  const toast = document.getElementById('toast');

  // Load saved options
  chrome.storage.sync.get({
    askFilename: false,
    minSizeKB: 100,
    maxThreads: 5,
    defaultFormat: 'mp4',
    autoDetect: true
  }, (items) => {
    if (askFilenameInput) askFilenameInput.checked = Boolean(items.askFilename);
    minSizeInput.value = items.minSizeKB;
    maxThreadsInput.value = items.maxThreads;
    if (defaultFormatInput) defaultFormatInput.value = items.defaultFormat || 'mp4';
    autoDetectInput.value = items.autoDetect.toString();
  });

  // Save options
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const askFilename = askFilenameInput ? askFilenameInput.checked : false;
    const minSizeKB = parseInt(minSizeInput.value, 10) || 100;
    const maxThreads = parseInt(maxThreadsInput.value, 10) || 5;
    const defaultFormat = defaultFormatInput ? defaultFormatInput.value : 'mp4';
    const autoDetect = autoDetectInput.value === 'true';

    chrome.storage.sync.set({
      askFilename,
      minSizeKB,
      maxThreads,
      defaultFormat,
      autoDetect
    }, () => {
      toast.style.display = 'block';
      setTimeout(() => {
        toast.style.display = 'none';
      }, 2500);
    });
  });
});
