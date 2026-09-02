const tabStates = new Map();

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ inspectorEnabled: false });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  switch (message.type) {
    case 'INSPECTOR_TOGGLED':
      if (tabId) {
        tabStates.set(tabId, { active: message.active });
        updateBadge(tabId, message.active);
      }
      sendResponse({ ok: true });
      break;

    case 'GET_TAB_STATE':
      if (tabId) {
        const state = tabStates.get(tabId) || { active: false };
        sendResponse(state);
      } else {
        sendResponse({ active: false });
      }
      break;

    case 'GET_STATE':
      if (tabId) {
        const state = tabStates.get(tabId) || { active: false };
        sendResponse(state);
      } else {
        sendResponse({ active: false });
      }
      break;

    default:
      sendResponse({ ok: true });
  }

  return true;
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-inspector') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_INSPECTOR' });
      } catch (e) {
        console.error('Failed to send toggle command:', e);
      }
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabStates.delete(tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    const state = tabStates.get(tabId);
    if (state && state.active) {
      updateBadge(tabId, false);
      tabStates.delete(tabId);
    }
  }
});

function updateBadge(tabId, active) {
  if (active) {
    chrome.action.setBadgeText({ text: 'ON', tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#6366f1', tabId });
  } else {
    chrome.action.setBadgeText({ text: '', tabId });
  }
}

chrome.runtime.onStartup.addListener(async () => {
  const tabs = await chrome.tabs.query({});
  tabs.forEach(tab => {
    tabStates.delete(tab.id);
    chrome.action.setBadgeText({ text: '', tabId: tab.id });
  });
});
