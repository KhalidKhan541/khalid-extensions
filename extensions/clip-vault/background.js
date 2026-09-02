let clipVault = null;
let pollingInterval = null;
let settings = {
  maxSize: 100,
  autoClearDays: 7,
  interceptCopy: true,
  interceptRightClick: true,
  pollClipboard: false,
  showBadge: true,
  excludedSites: [],
  folders: []
};

async function init() {
  try {
    clipVault = new ClipStorage();
    await clipVault.init();
    settings = clipVault.settings;
    setupContextMenus();
    setupMessageListeners();
    setupCommandListeners();
    updateBadge();
    if (settings.pollClipboard) startPolling();
  } catch (e) {
    console.error('ClipVault init error:', e);
  }
}

function setupContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'clipvault-copy',
      title: 'Copy to ClipVault',
      contexts: ['selection']
    });
    chrome.contextMenus.create({
      id: 'clipvault-separator',
      type: 'separator',
      contexts: ['selection']
    });
  });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'clipvault-copy' && info.selectionText) {
    await addClip(info.selectionText, tab ? tab.url : '');
  }
});

function setupMessageListeners() {
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'clipCaptured') {
      addClip(msg.text, msg.source).then(clip => {
        sendResponse({ ok: true, clip });
      }).catch(e => {
        sendResponse({ ok: false, error: e.message });
      });
      return true;
    }
    if (msg.action === 'getClips') {
      clipVault.searchClips(msg.query, msg.filters).then(clips => {
        sendResponse({ clips });
      });
      return true;
    }
    if (msg.action === 'getAllClips') {
      clipVault.getAllClips().then(clips => {
        sendResponse({ clips });
      });
      return true;
    }
    if (msg.action === 'addClip') {
      addClip(msg.text, msg.source).then(clip => {
        sendResponse({ ok: true, clip });
      }).catch(e => {
        sendResponse({ ok: false, error: e.message });
      });
      return true;
    }
    if (msg.action === 'updateClip') {
      clipVault.updateClip(msg.clip).then(() => {
        sendResponse({ ok: true });
      });
      return true;
    }
    if (msg.action === 'deleteClip') {
      clipVault.deleteClip(msg.id).then(() => {
        updateBadge();
        sendResponse({ ok: true });
      });
      return true;
    }
    if (msg.action === 'deleteClips') {
      clipVault.deleteClips(msg.ids).then(() => {
        updateBadge();
        sendResponse({ ok: true });
      });
      return true;
    }
    if (msg.action === 'getSettings') {
      sendResponse({ settings: clipVault.settings });
      return true;
    }
    if (msg.action === 'saveSettings') {
      Object.assign(settings, msg.settings);
      clipVault.settings = settings;
      clipVault.saveSettings().then(() => {
        broadcastSettings();
        if (settings.pollClipboard) startPolling();
        else stopPolling();
        updateBadge();
        sendResponse({ ok: true });
      });
      return true;
    }
    if (msg.action === 'getStats') {
      clipVault.getStats().then(stats => {
        sendResponse({ stats });
      });
      return true;
    }
    if (msg.action === 'exportData') {
      clipVault.exportData().then(data => {
        sendResponse({ data });
      });
      return true;
    }
    if (msg.action === 'importData') {
      clipVault.importData(msg.data).then(() => {
        updateBadge();
        sendResponse({ ok: true });
      }).catch(e => {
        sendResponse({ ok: false, error: e.message });
      });
      return true;
    }
    if (msg.action === 'clearAll') {
      clipVault.clearAll().then(() => {
        updateBadge();
        sendResponse({ ok: true });
      });
      return true;
    }
    if (msg.action === 'addFolder') {
      clipVault.addFolder(msg.name).then(() => {
        sendResponse({ ok: true, folders: clipVault.settings.folders });
      });
      return true;
    }
    if (msg.action === 'removeFolder') {
      clipVault.removeFolder(msg.name).then(() => {
        sendResponse({ ok: true, folders: clipVault.settings.folders });
      });
      return true;
    }
  });
}

function setupCommandListeners() {
  chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'copy-last-clip') {
      const clips = await clipVault.getAllClips();
      if (clips.length > 0) {
        const sorted = clips.sort((a, b) => b.timestamp - a.timestamp);
        try {
          await navigator.clipboard.writeText(sorted[0].text);
          showNotification('Copied latest clip to clipboard');
        } catch (e) {}
      }
    }
  });
}

async function addClip(text, source) {
  const clip = await clipVault.addClip(text, { source });
  if (clip) {
    await updateBadge();
    chrome.runtime.sendMessage({
      action: 'clipAdded',
      clip
    }).catch(() => {});
  }
  return clip;
}

async function updateBadge() {
  if (!settings.showBadge) {
    chrome.action.setBadgeText({ text: '' });
    return;
  }
  const clips = await clipVault.getAllClips();
  const count = clips.length;
  chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#e94560' });
}

function broadcastSettings() {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, {
        action: 'updateSettings',
        settings
      }).catch(() => {});
    }
  });
}

function startPolling() {
  stopPolling();
  let lastClip = '';
  pollingInterval = setInterval(async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        chrome.tabs.sendMessage(tab.id, { action: 'getSelectedText' }, (response) => {
          if (response && response.text && response.text !== lastClip) {
            lastClip = response.text;
            addClip(response.text, tab.url);
          }
        });
      }
    } catch (e) {}
  }, 2000);
}

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

function showNotification(message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'ClipVault',
    message
  }).catch(() => {});
}

chrome.runtime.onInstalled.addListener(() => {
  init();
});

chrome.runtime.onStartup.addListener(() => {
  init();
});

init();