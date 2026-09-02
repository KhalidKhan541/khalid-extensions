const MD_EXTENSIONS = ['.md', '.markdown', '.mdown', '.mkd'];

function isMarkdownUrl(url) {
  if (!url) return false;
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return MD_EXTENSIONS.some((ext) => pathname.endsWith(ext));
  } catch {
    return false;
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url) return;

  if (isMarkdownUrl(tab.url)) {
    chrome.action.setBadgeText({ text: 'MD', tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#4A5568', tabId });
  } else {
    chrome.action.setBadgeText({ text: '', tabId });
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url && isMarkdownUrl(tab.url)) {
      chrome.action.setBadgeText({ text: 'MD', tabId: activeInfo.tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#4A5568', tabId: activeInfo.tabId });
    } else {
      chrome.action.setBadgeText({ text: '', tabId: activeInfo.tabId });
    }
  } catch {}
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get('mdViewerSettings', (data) => {
    if (!data.mdViewerSettings) {
      chrome.storage.local.set({
        mdViewerSettings: {
          theme: 'github',
          fontSize: 16,
          lineWidth: 800,
          zoom: 100,
          viewMode: 'rendered',
          toc: true,
          syntaxHighlight: true
        }
      });
    }
  });
});
