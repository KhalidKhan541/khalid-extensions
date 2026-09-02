/* background.js — Service worker for periodic scanning and badge updates */

let scanTimer = null;

// Run on install / update
chrome.runtime.onInstalled.addListener(async () => {
  const settings = await StorageManager.getSettings();
  if (settings.autoScan) {
    startPeriodicScan(settings.scanInterval);
  }
  updateBadge(0);
});

// Listen for bookmark changes
chrome.bookmarks.onCreated.addListener(() => scheduleAutoScan());
chrome.bookmarks.onRemoved.addListener(() => scheduleAutoScan());
chrome.bookmarks.onChanged.addListener(() => scheduleAutoScan());
chrome.bookmarks.onMoved.addListener(() => scheduleAutoScan());

let autoScanDebounce = null;
function scheduleAutoScan() {
  if (autoScanDebounce) clearTimeout(autoScanDebounce);
  autoScanDebounce = setTimeout(async () => {
    const settings = await StorageManager.getSettings();
    if (!settings.autoScan) return;
    await runBackgroundScan();
  }, 5000); // 5 second debounce
}

async function runBackgroundScan() {
  try {
    const settings = await StorageManager.getSettings();
    const report = await BookmarkScanner.scan(settings);
    await StorageManager.saveScanResults(report);
    await StorageManager.recordStats(report.stats);
    await StorageManager.setLastBackgroundScan(Date.now());
    updateBadge(report.stats.duplicates);
  } catch (e) {
    console.error('Background scan failed:', e);
  }
}

function updateBadge(count) {
  const text = count > 0 ? String(count) : '';
  const color = count > 0 ? '#f39c12' : '#4285f4';
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
}

function startPeriodicScan(intervalMinutes) {
  if (scanTimer) clearInterval(scanTimer);
  if (intervalMinutes <= 0) return;

  scanTimer = setInterval(async () => {
    const settings = await StorageManager.getSettings();
    const lastScan = await StorageManager.getLastBackgroundScan();
    const elapsed = Date.now() - lastScan;
    const intervalMs = settings.scanInterval * 60 * 1000;

    if (elapsed >= intervalMs) {
      await runBackgroundScan();
    }
  }, Math.min(intervalMinutes * 60 * 1000, 600000)); // check at most every 10 min

  // Also run immediately
  runBackgroundScan();
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'triggerScan') {
    runBackgroundScan().then(() => sendResponse({ ok: true })).catch(() => sendResponse({ ok: false }));
    return true; // async
  }
  if (msg.type === 'getBadgeCount') {
    StorageManager.getScanResults().then(r => {
      sendResponse({ count: r ? r.stats.duplicates : 0 });
    });
    return true;
  }
  if (msg.type === 'updateSettings') {
    if (msg.settings.autoScan) {
      startPeriodicScan(msg.settings.scanInterval);
    } else {
      if (scanTimer) clearInterval(scanTimer);
    }
    sendResponse({ ok: true });
  }
});
