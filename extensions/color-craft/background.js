const tabStates = new Map();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id ?? message.tabId;

  switch (message.type) {
    case 'ACTIVATE_EYEDROPPER':
      tabStates.set(tabId, { active: true });
      chrome.tabs.sendMessage(tabId, { type: 'START_EYEDROPPER' }).catch(() => {});
      sendResponse({ success: true });
      break;

    case 'DEACTIVATE_EYEDROPPER':
      tabStates.delete(tabId);
      chrome.tabs.sendMessage(tabId, { type: 'STOP_EYEDROPPER' }).catch(() => {});
      sendResponse({ success: true });
      break;

    case 'EYEDROPPER_COLOR_PICKED':
      chrome.storage.local.get({ history: [], favorites: [] }, (data) => {
        const history = data.history;
        history.unshift(message.color);
        if (history.length > 20) history.length = 20;
        chrome.storage.local.set({ history });
      });
      chrome.tabs.sendMessage(tabId, { type: 'STOP_EYEDROPPER' }).catch(() => {});
      tabStates.delete(tabId);
      sendResponse({ success: true });
      break;

    case 'GET_TAB_STATE':
      sendResponse({ active: tabStates.get(tabId)?.active ?? false });
      break;

    case 'COPY_TO_CLIPBOARD':
      chrome.tabs.sendMessage(tabId, {
        type: 'SHOW_COPY_NOTIFICATION',
        text: message.text
      }).catch(() => {});
      sendResponse({ success: true });
      break;
  }
  return true;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabStates.delete(tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    tabStates.delete(tabId);
  }
});
