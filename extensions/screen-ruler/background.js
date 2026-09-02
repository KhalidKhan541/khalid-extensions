const tabStates = new Map();

function getTabState(tabId) {
  if (!tabStates.has(tabId)) {
    tabStates.set(tabId, {
      enabled: false,
      mode: 'point-to-point',
      unit: 'px',
      color: '#FF4081'
    });
  }
  return tabStates.get(tabId);
}

function updateBadge(tabId) {
  const state = getTabState(tabId);
  chrome.action.setBadgeText({
    text: state.enabled ? 'ON' : '',
    tabId: tabId
  });
  chrome.action.setBadgeBackgroundColor({
    color: state.enabled ? '#FF4081' : '#666',
    tabId: tabId
  });
}

chrome.tabs.onRemoved.addListener((tabId) => {
  tabStates.delete(tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    updateBadge(tabId);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  if (!tabId) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        handleTabMessage(message, tabs[0].id, sendResponse);
      }
    });
    return true;
  }

  handleTabMessage(message, tabId, sendResponse);
  return true;
});

function handleTabMessage(message, tabId, sendResponse) {
  const state = getTabState(tabId);

  switch (message.action) {
    case 'getState':
      sendResponse(state);
      break;

    case 'toggleRuler':
      state.enabled = message.enabled !== undefined ? message.enabled : !state.enabled;
      updateBadge(tabId);
      chrome.tabs.sendMessage(tabId, {
        action: 'toggleRuler',
        enabled: state.enabled
      }).catch(() => {});
      sendResponse(state);
      break;

    case 'setMode':
      state.mode = message.mode;
      chrome.tabs.sendMessage(tabId, {
        action: 'setMode',
        mode: message.mode
      }).catch(() => {});
      sendResponse({ success: true });
      break;

    case 'rulerToggled':
      state.enabled = message.enabled;
      updateBadge(tabId);
      sendResponse({ success: true });
      break;

    default:
      sendResponse({ error: 'Unknown action' });
  }
}

chrome.commands.onCommand.addListener((command, tab) => {
  if (!tab?.id) return;

  const state = getTabState(tab.id);

  switch (command) {
    case 'toggle-ruler':
      state.enabled = !state.enabled;
      updateBadge(tab.id);
      chrome.tabs.sendMessage(tab.id, {
        action: 'toggleRuler',
        enabled: state.enabled
      }).catch(() => {});
      break;

    case 'toggle-grid':
      if (state.enabled) {
        const newMode = state.mode === 'grid' ? 'point-to-point' : 'grid';
        state.mode = newMode;
        chrome.tabs.sendMessage(tab.id, {
          action: 'setMode',
          mode: newMode
        }).catch(() => {});
      }
      break;
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get('screenRulerSettings', (result) => {
    if (!result.screenRulerSettings) {
      chrome.storage.local.set({
        screenRulerSettings: {
          rulerEnabled: false,
          mode: 'point-to-point',
          unit: 'px',
          rulerColor: '#FF4081',
          gridSize: 50,
          gridColor: '#2196F3',
          gridOpacity: 30,
          baseFontSize: 16,
          decimalPlaces: 2,
          rulerThickness: 30,
          snapEnabled: true,
          showCoordinates: true,
          history: []
        }
      });
    }
  });
});
