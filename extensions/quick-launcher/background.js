/* global Utils, Search, Commands */

chrome.omnibox.onInputStarted.addListener(() => {
  chrome.omnibox.setDefaultSuggestion({ description: 'Type to search bookmarks, history, tabs, or commands' });
});

chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
  const q = text.trim();
  if (!q) {
    chrome.omnibox.setDefaultSuggestion({ description: 'Type to search bookmarks, history, tabs, or commands' });
    return;
  }

  const [searchResults, commandResults] = await Promise.all([
    Search.search(q, 6),
    Promise.resolve(Commands.searchAll(q))
  ]);

  const allResults = [...commandResults.slice(0, 3), ...searchResults.slice(0, 7)];
  const suggestions = allResults.map((r) => {
    const content = r.url || '';
    const description = r.badge ? `[${r.badge}] ${r.title}` : r.title;
    return { content, description: `<match>${escapeXml(description)}</match> <dim>${escapeXml(Utils.getDomain(r.url || ''))}</dim>` };
  });

  if (suggestions.length === 0) {
    suggestions.push({
      content: `https://www.google.com/search?q=${encodeURIComponent(q)}`,
      description: `Search Google for <match>${escapeXml(q)}</match>`
    });
  }

  suggest(suggestions);
});

chrome.omnibox.onInputEntered.addListener(async (text) => {
  if (!text) return;

  if (text.startsWith('chrome://') || text.startsWith('about:')) {
    chrome.tabs.create({ url: text });
    return;
  }

  const siteUrl = Commands.matchSiteShortcut(text);
  if (siteUrl) {
    chrome.tabs.create({ url: siteUrl });
    return;
  }

  const cmd = Commands.getCommands().find((c) => c.name === text || c.id === text);
  if (cmd) {
    await Commands.executeCommand(cmd);
    return;
  }

  if (/^https?:\/\//.test(text)) {
    chrome.tabs.create({ url: text });
  } else {
    chrome.tabs.create({ url: `https://www.google.com/search?q=${encodeURIComponent(text)}` });
  }
});

chrome.omnibox.onInputCancelled.addListener(() => {});

// Badge updates
async function updateBadge() {
  try {
    const tabs = await chrome.tabs.query({});
    const activeTab = tabs.find((t) => t.active);
    if (activeTab?.url) {
      const domain = Utils.getDomain(activeTab.url);
      const short = domain.length > 12 ? domain.slice(0, 10) + '..' : domain;
      chrome.action.setBadgeText({ text: short });
      chrome.action.setBadgeBackgroundColor({ color: '#4285f4' });
    }
  } catch {}
}

chrome.tabs.onActivated.addListener(updateBadge);
chrome.tabs.onUpdated.addListener(updateBadge);
updateBadge();

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

// Message handling
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'search') {
    Search.search(msg.query, msg.maxResults || 20).then(sendResponse);
    return true;
  }
  if (msg.type === 'execute-command') {
    Commands.executeCommand(msg.command).then(sendResponse);
    return true;
  }
  if (msg.type === 'get-favorites') {
    Commands.getFavorites().then(sendResponse);
    return true;
  }
  if (msg.type === 'refresh-cache') {
    Search.invalidateCache();
    Search.refreshCaches().then(() => sendResponse({ ok: true }));
    return true;
  }
});
