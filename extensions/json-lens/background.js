chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'json-lens-format',
    title: 'Format JSON with JSON Lens',
    contexts: ['selection']
  });

  chrome.contextMenus.create({
    id: 'json-lens-view',
    title: 'View as JSON Tree',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'json-lens-format') {
    chrome.tabs.sendMessage(tab.id, { action: 'formatSelection', text: info.selectionText });
  } else if (info.menuItemId === 'json-lens-view') {
    chrome.tabs.sendMessage(tab.id, { action: 'viewSelection', text: info.selectionText });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'detectJSON') {
    const contentType = request.contentType || '';
    const body = request.body || '';

    const isJSON = contentType.includes('application/json') ||
      contentType.includes('text/json') ||
      contentType.includes('application/vnd.api+json') ||
      contentType.includes('application/hal+json') ||
      contentType.includes('application/ld+json');

    if (isJSON) {
      sendResponse({ detected: true });
      return;
    }

    const trimmed = body.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        JSON.parse(trimmed);
        sendResponse({ detected: true });
        return;
      } catch (e) {}
    }

    sendResponse({ detected: false });
  }

  if (request.action === 'saveFormatted') {
    chrome.storage.local.get(['jsonHistory'], (result) => {
      const history = result.jsonHistory || [];
      history.unshift({
        text: request.text,
        preview: request.text.substring(0, 100) + (request.text.length > 100 ? '...' : ''),
        time: Date.now()
      });
      if (history.length > 10) history.pop();
      chrome.storage.local.set({ jsonHistory: history });
    });
    sendResponse({ success: true });
  }

  if (request.action === 'getHistory') {
    chrome.storage.local.get(['jsonHistory'], (result) => {
      sendResponse({ history: result.jsonHistory || [] });
    });
    return true;
  }

  return false;
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const url = tab.url;
    if (url.endsWith('.json') || url.includes('api.') || url.includes('/api/')) {
      chrome.tabs.sendMessage(tabId, { action: 'checkForJSON' }).catch(() => {});
    }
  }
});
