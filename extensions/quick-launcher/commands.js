/* global Commands:true, Utils:true */
const Commands = (() => {
  const SITE_SHORTCUTS = {
    'yt': 'https://youtube.com',
    'gh': 'https://github.com',
    'tw': 'https://twitter.com',
    'x': 'https://x.com',
    'rd': 'https://reddit.com',
    'ghub': 'https://github.com',
    'so': 'https://stackoverflow.com',
    'sf': 'https://stackoverflow.com',
    'g': 'https://google.com',
    'gd': 'https://drive.google.com',
    'gm': 'https://mail.google.com',
    'cal': 'https://calendar.google.com',
    'maps': 'https://maps.google.com',
    'news': 'https://news.google.com',
    'maps': 'https://maps.google.com',
    'sheets': 'https://sheets.google.com',
    'docs': 'https://docs.google.com',
    'slides': 'https://slides.google.com',
    'notion': 'https://notion.so',
    'li': 'https://linkedin.com',
    'fb': 'https://facebook.com',
    'ig': 'https://instagram.com',
    'wa': 'https://web.whatsapp.com',
    'slack': 'https://app.slack.com',
    'dl': 'https://downloads',
    'ext': 'chrome://extensions',
    'set': 'chrome://settings',
    'hist': 'chrome://history',
    'bm': 'chrome://bookmarks',
    'blank': 'about:blank',
    'nw': 'chrome://new-window'
  };

  const BUILTIN_COMMANDS = [
    { id: 'new-tab', name: 'New Tab', icon: '⊞', shortcut: '', action: () => chrome.tabs.create({ url: 'chrome://newtab' }) },
    { id: 'new-window', name: 'New Window', icon: '⧉', shortcut: '', action: () => chrome.windows.create() },
    { id: 'incognito', name: 'New Incognito Window', icon: '🕵', shortcut: '', action: () => chrome.windows.create({ incognito: true }) },
    { id: 'history', name: 'Open History', icon: '🕐', shortcut: '', action: () => chrome.tabs.create({ url: 'chrome://history' }) },
    { id: 'downloads', name: 'Open Downloads', icon: '⬇', shortcut: '', action: () => chrome.tabs.create({ url: 'chrome://downloads' }) },
    { id: 'extensions', name: 'Manage Extensions', icon: '🧩', shortcut: '', action: () => chrome.tabs.create({ url: 'chrome://extensions' }) },
    { id: 'settings', name: 'Chrome Settings', icon: '⚙', shortcut: '', action: () => chrome.tabs.create({ url: 'chrome://settings' }) },
    { id: 'clear-cache', name: 'Clear Cache', icon: '🗑', shortcut: '', action: async () => {
      await new Promise((r) => chrome.browsingData.removeCache({ originTypes: { unprotectedWeb: true } }, r));
    }},
    { id: 'zoom-in', name: 'Zoom In', icon: '🔍', shortcut: '', action: async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) chrome.tabs.setZoom(tab.id, Math.min((tab.zoomFactor || 1) + 0.1, 5));
    }},
    { id: 'zoom-out', name: 'Zoom Out', icon: '🔎', shortcut: '', action: async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) chrome.tabs.setZoom(tab.id, Math.max((tab.zoomFactor || 1) - 0.1, 0.25));
    }},
    { id: 'zoom-reset', name: 'Reset Zoom', icon: '↺', shortcut: '', action: async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) chrome.tabs.setZoom(tab.id, 1);
    }},
    { id: 'screenshot', name: 'Capture Screenshot', icon: '📷', shortcut: '', action: async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        try {
          const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = `screenshot-${Date.now()}.png`;
          a.click();
        } catch {}
      }
    }},
    { id: 'pin-tab', name: 'Pin/Unpin Tab', icon: '📌', shortcut: '', action: async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) chrome.tabs.update(tab.id, { pinned: !tab.pinned });
    }},
    { id: 'mute-tab', name: 'Mute/Unmute Tab', icon: '🔇', shortcut: '', action: async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) chrome.tabs.update(tab.id, { muted: !tab.mutedInfo?.muted });
    }},
    { id: 'close-tab', name: 'Close Current Tab', icon: '✕', shortcut: '', action: async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) chrome.tabs.remove(tab.id);
    }},
    { id: 'duplicate-tab', name: 'Duplicate Tab', icon: '⧉', shortcut: '', action: async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) chrome.tabs.duplicate(tab.id);
    }},
    { id: 'bookmark-page', name: 'Bookmark Current Page', icon: '⭐', shortcut: '', action: async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) chrome.bookmarks.create({ title: tab.title, url: tab.url });
    }},
    { id: 'show-bookmarks-bar', name: 'Toggle Bookmarks Bar', icon: '📊', shortcut: '', action: async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      chrome.tabs.sendMessage(tab.id, { type: 'toggle-bookmarks-bar' }).catch(() => {});
    }},
    { id: 'calculator', name: 'Calculator', icon: '🧮', shortcut: '', action: null, tool: 'calculator' },
    { id: 'color-picker', name: 'Color Picker', icon: '🎨', shortcut: '', action: null, tool: 'color-picker' },
    { id: 'lorem', name: 'Lorem Ipsum Generator', icon: '📝', shortcut: '', action: null, tool: 'lorem' },
    { id: 'base64', name: 'Base64 Encode/Decode', icon: '🔤', shortcut: '', action: null, tool: 'base64' },
    { id: 'json-formatter', name: 'JSON Formatter', icon: '📋', shortcut: '', action: null, tool: 'json-formatter' },
    { id: 'clipboard-history', name: 'Clipboard History', icon: '📑', shortcut: '', action: null, tool: 'clipboard' }
  ];

  const DEFAULT_FAVORITES = [
    { name: 'YouTube', url: 'https://youtube.com' },
    { name: 'GitHub', url: 'https://github.com' },
    { name: 'Gmail', url: 'https://mail.google.com' },
    { name: 'Google', url: 'https://google.com' },
    { name: 'Reddit', url: 'https://reddit.com' },
    { name: 'Twitter', url: 'https://x.com' },
    { name: 'Notion', url: 'https://notion.so' },
    { name: 'LinkedIn', url: 'https://linkedin.com' }
  ];

  const DEFAULT_QUICK_ACTIONS = [
    { id: 'new-tab', icon: '⊞', label: 'New Tab' },
    { id: 'incognito', icon: '🕵', label: 'Incognito' },
    { id: 'history', icon: '🕐', label: 'History' },
    { id: 'downloads', icon: '⬇', label: 'Downloads' },
    { id: 'extensions', icon: '🧩', label: 'Extensions' },
    { id: 'settings', icon: '⚙', label: 'Settings' },
    { id: 'calculator', icon: '🧮', label: 'Calculator' },
    { id: 'color-picker', icon: '🎨', label: 'Colors' },
    { id: 'lorem', icon: '📝', label: 'Lorem' },
    { id: 'base64', icon: '🔤', label: 'Base64' },
    { id: 'json-formatter', icon: '📋', label: 'JSON' },
    { id: 'clipboard-history', icon: '📑', label: 'Clipboard' }
  ];

  let commandHistory = {};

  async function loadHistory() {
    const h = await Utils.getStorage('cmd_history');
    commandHistory = h || {};
  }

  async function recordUse(cmdId) {
    if (!commandHistory[cmdId]) commandHistory[cmdId] = { count: 0, lastUsed: 0 };
    commandHistory[cmdId].count++;
    commandHistory[cmdId].lastUsed = Date.now();
    await Utils.setStorage('cmd_history', commandHistory);
  }

  function getScore(cmd) {
    const h = commandHistory[cmd.id];
    if (!h) return 0;
    const recency = Math.max(0, 100 - Math.floor((Date.now() - h.lastUsed) / (60 * 60 * 1000)));
    return h.count * 10 + recency;
  }

  function matchSiteShortcut(query) {
    const q = query.toLowerCase().trim();
    if (SITE_SHORTCUTS[q]) return SITE_SHORTCUTS[q];
    for (const [key, url] of Object.entries(SITE_SHORTCUTS)) {
      if (q.startsWith(key + ' ') || q.startsWith(key + ':')) {
        const rest = q.slice(key.length + 1).trim();
        if (rest) return url + '/search?q=' + encodeURIComponent(rest);
        return url;
      }
    }
    return null;
  }

  function getCommands() {
    return BUILTIN_COMMANDS.map((cmd) => ({
      ...cmd,
      score: getScore(cmd)
    }));
  }

  function searchCommands(query) {
    const q = query.toLowerCase();
    const scored = BUILTIN_COMMANDS.map((cmd) => {
      const match = Utils.fuzzyMatch(cmd.name, q);
      if (match.match) {
        return {
          ...cmd,
          type: 'command',
          score: match.score + getScore(cmd),
          indices: match.indices
        };
      }
      const iconMatch = Utils.fuzzyMatch(cmd.id, q);
      if (iconMatch.match) {
        return {
          ...cmd,
          type: 'command',
          score: iconMatch.score + getScore(cmd),
          indices: iconMatch.indices
        };
      }
      return null;
    }).filter(Boolean);

    scored.sort((a, b) => b.score - a.score);
    return scored;
  }

  async function executeCommand(cmd) {
    if (!cmd) return false;

    const url = matchSiteShortcut(cmd.id || cmd.name || '');
    if (url) {
      chrome.tabs.create({ url });
      return true;
    }

    const found = BUILTIN_COMMANDS.find((c) => c.id === cmd.id);
    if (found) {
      await recordUse(found.id);
      if (found.action) {
        found.action();
        return true;
      }
      if (found.tool) return found.tool;
    }

    if (cmd.url) {
      chrome.tabs.create({ url: cmd.url });
      return true;
    }

    return false;
  }

  async function getFavorites() {
    const stored = await Utils.getStorage('favorites');
    return Array.isArray(stored) && stored.length > 0 ? stored : DEFAULT_FAVORITES;
  }

  async function saveFavorites(favs) {
    await Utils.setStorage('favorites', favs);
  }

  async function getQuickActions() {
    const stored = await Utils.getStorage('quick_actions');
    return Array.isArray(stored) && stored.length > 0 ? stored : DEFAULT_QUICK_ACTIONS;
  }

  async function addCustomCommand(name, url) {
    const stored = await Utils.getStorage('custom_commands');
    const cmds = Array.isArray(stored) ? stored : [];
    cmds.push({ id: 'custom-' + Date.now(), name, url, custom: true });
    await Utils.setStorage('custom_commands', cmds);
  }

  async function getCustomCommands() {
    const stored = await Utils.getStorage('custom_commands');
    return Array.isArray(stored) ? stored : [];
  }

  function searchAll(query) {
    const siteUrl = matchSiteShortcut(query);
    if (siteUrl) {
      return [{
        title: `Go to ${query}`,
        url: siteUrl,
        type: 'command',
        badge: 'Shortcut',
        action: () => chrome.tabs.create({ url: siteUrl })
      }];
    }

    return searchCommands(query).map((cmd) => ({
      title: cmd.name,
      url: '',
      type: 'command',
      badge: 'Command',
      icon: cmd.icon,
      indices: cmd.indices,
      command: cmd,
      action: () => executeCommand(cmd)
    }));
  }

  return {
    SITE_SHORTCUTS,
    DEFAULT_FAVORITES,
    loadHistory,
    getCommands,
    searchCommands,
    executeCommand,
    matchSiteShortcut,
    getFavorites,
    saveFavorites,
    getQuickActions,
    addCustomCommand,
    getCustomCommands,
    searchAll,
    recordUse
  };
})();
