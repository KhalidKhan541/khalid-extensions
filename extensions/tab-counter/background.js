let isTracking = false;
let currentTabCount = 0;

async function updateBadge() {
  try {
    const tabs = await new Promise(resolve => chrome.tabs.query({}, resolve));
    currentTabCount = tabs.length;

    chrome.action.setBadgeText({ text: currentTabCount.toString() });
    chrome.action.setBadgeBackgroundColor({ color: currentTabCount > 30 ? '#fc5c65' : currentTabCount > 15 ? '#f6ad55' : '#4f8cff' });
  } catch (err) {
    console.error('Badge update error:', err);
  }
}

async function trackSnapshot() {
  try {
    const tabs = await new Promise(resolve => chrome.tabs.query({}, resolve));
    await History.recordSnapshot(tabs.length);
  } catch (err) {
    console.error('Snapshot error:', err);
  }
}

chrome.tabs.onCreated.addListener(async (tab) => {
  await updateBadge();
  await trackSnapshot();
});

chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  await updateBadge();
  await trackSnapshot();
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.title) {
    await updateBadge();
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await updateBadge();
});

chrome.windows.onCreated.addListener(async () => {
  await updateBadge();
});

chrome.windows.onRemoved.addListener(async () => {
  await updateBadge();
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStats') {
    TabTracker.getFullStats().then(stats => {
      sendResponse(stats);
    }).catch(err => {
      sendResponse({ error: err.message });
    });
    return true;
  }

  if (request.action === 'switchToTab') {
    chrome.tabs.update(request.tabId, { active: true });
    chrome.windows.update(request.windowId, { focused: true });
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'restoreTab') {
    chrome.sessions.restore(request.sessionId).then(session => {
      sendResponse({ success: true, session });
    }).catch(err => {
      sendResponse({ error: err.message });
    });
    return true;
  }

  if (request.action === 'startSession') {
    History.startSession().then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'endSession') {
    History.endSession(request.tabCount).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'getSessionHistory') {
    History.getSessionHistory().then(history => {
      sendResponse({ history });
    });
    return true;
  }

  if (request.action === 'getTrendData') {
    History.getTrendData(request.points).then(data => {
      sendResponse({ data });
    });
    return true;
  }

  if (request.action === 'clearHistory') {
    History.clearHistory().then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'exportCSV') {
    History.exportToCSV().then(csv => {
      History.downloadCSV(csv, `tab-counter-export-${new Date().toISOString().split('T')[0]}.csv`);
      sendResponse({ success: true });
    });
    return true;
  }
});

chrome.runtime.onStartup.addListener(async () => {
  await updateBadge();
  await History.startSession();
  await trackSnapshot();
});

chrome.runtime.onInstalled.addListener(async () => {
  await updateBadge();
  await History.startSession();
  await trackSnapshot();
});

setInterval(async () => {
  await updateBadge();
  await trackSnapshot();
}, 60000);

updateBadge();