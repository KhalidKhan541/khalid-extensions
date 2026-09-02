/* global Search:true, Utils:true */
const Search = (() => {
  let bookmarksCache = [];
  let historyCache = [];
  let tabsCache = [];
  let extensionsCache = [];
  let lastCacheUpdate = 0;
  const CACHE_TTL = 30000;

  async function refreshCaches() {
    const now = Date.now();
    if (now - lastCacheUpdate < CACHE_TTL) return;
    lastCacheUpdate = now;

    const [bookmarks, tabs, extensions] = await Promise.all([
      loadBookmarks(),
      loadTabs(),
      loadExtensions()
    ]);
    bookmarksCache = bookmarks;
    tabsCache = tabs;
    extensionsCache = extensions;

    try {
      const results = await chrome.history.search({ text: '', maxResults: 500, startTime: Date.now() - 7 * 24 * 60 * 60 * 1000 });
      historyCache = results;
    } catch {
      historyCache = [];
    }
  }

  async function loadBookmarks() {
    const tree = await chrome.bookmarks.getTree();
    const flat = [];
    function walk(nodes) {
      for (const node of nodes) {
        if (node.url) {
          flat.push({ id: node.id, title: node.title || '', url: node.url, dateAdded: node.dateAdded || 0 });
        }
        if (node.children) walk(node.children);
      }
    }
    walk(tree);
    return flat;
  }

  async function loadTabs() {
    return new Promise((resolve) => {
      chrome.tabs.query({}, (tabs) => {
        resolve(tabs.map((t) => ({
          id: t.id,
          title: t.title || '',
          url: t.url || '',
          favIconUrl: t.favIconUrl || '',
          active: t.active,
          windowId: t.windowId,
          index: t.index
        })));
      });
    });
  }

  async function loadExtensions() {
    return new Promise((resolve) => {
      try {
        chrome.management.getAll((exts) => {
          resolve(exts.filter((e) => e.enabled && e.type === 'extension').map((e) => ({
            id: e.id,
            name: e.name,
            description: e.description || '',
            icon: e.icons?.[0]?.url || '',
            optionsUrl: e.optionsUrl || ''
          })));
        });
      } catch {
        resolve([]);
      }
    });
  }

  function scoreResult(item, query) {
    let score = 0;
    const titleMatch = Utils.fuzzyMatch(item.title || '', query);
    const urlMatch = Utils.fuzzyMatch(item.url || '', query);

    if (titleMatch.match) score += titleMatch.score * 2;
    if (urlMatch.match) score += urlMatch.score;

    if (item.bookmark) score += 100;
    if (item.tab) score += 80;
    if (item.historyItem) {
      const recency = Math.max(0, 100 - Math.floor((Date.now() - (item.visitTime || 0)) / (60 * 60 * 1000)));
      score += 20 + recency;
    }

    const freq = item.visitCount || 0;
    score += Math.min(freq * 5, 50);

    return score;
  }

  function buildResult(item) {
    const result = {
      title: item.title || item.name || '',
      url: item.url || '',
      type: item.type || 'history',
      icon: item.icon || Utils.getFaviconUrl(item.url || ''),
      score: item.score || 0,
      indices: item.indices || []
    };

    if (item.bookmark) result.badge = 'Bookmark';
    else if (item.tab) result.badge = 'Tab';
    else if (item.historyItem) result.badge = 'History';
    else if (item.extension) result.badge = 'Extension';
    else if (item.command) result.badge = 'Command';

    return result;
  }

  async function search(query, maxResults = 20) {
    await refreshCaches();

    const q = query.trim();
    if (!q) return [];

    const results = [];
    const seen = new Set();

    for (const b of bookmarksCache) {
      const titleMatch = Utils.fuzzyMatch(b.title, q);
      const urlMatch = Utils.fuzzyMatch(b.url, q);
      if (titleMatch.match || urlMatch.match) {
        const bestMatch = titleMatch.match ? titleMatch : urlMatch;
        const key = b.url;
        if (!seen.has(key)) {
          seen.add(key);
          results.push(buildResult({
            title: b.title,
            url: b.url,
            type: 'bookmark',
            bookmark: true,
            score: scoreResult({ title: b.title, url: b.url, bookmark: true }, q),
            indices: bestMatch.indices
          }));
        }
      }
    }

    for (const h of historyCache) {
      const titleMatch = Utils.fuzzyMatch(h.title || '', q);
      const urlMatch = Utils.fuzzyMatch(h.url || '', q);
      if (titleMatch.match || urlMatch.match) {
        const bestMatch = titleMatch.match ? titleMatch : urlMatch;
        const key = h.url;
        if (!seen.has(key)) {
          seen.add(key);
          results.push(buildResult({
            title: h.title,
            url: h.url,
            type: 'history',
            historyItem: true,
            visitTime: h.lastVisitTime,
            visitCount: h.visitCount,
            score: scoreResult({ title: h.title, url: h.url, historyItem: true, visitTime: h.lastVisitTime, visitCount: h.visitCount }, q),
            indices: bestMatch.indices
          }));
        }
      }
    }

    for (const t of tabsCache) {
      const titleMatch = Utils.fuzzyMatch(t.title, q);
      const urlMatch = Utils.fuzzyMatch(t.url, q);
      if (titleMatch.match || urlMatch.match) {
        const bestMatch = titleMatch.match ? titleMatch : urlMatch;
        const key = t.url;
        if (!seen.has(key)) {
          seen.add(key);
          results.push(buildResult({
            title: t.title,
            url: t.url,
            type: 'tab',
            tab: true,
            tabId: t.id,
            active: t.active,
            windowId: t.windowId,
            score: scoreResult({ title: t.title, url: t.url, tab: true }, q),
            indices: bestMatch.indices
          }));
        }
      }
    }

    for (const e of extensionsCache) {
      const titleMatch = Utils.fuzzyMatch(e.name, q);
      const descMatch = Utils.fuzzyMatch(e.description, q);
      if (titleMatch.match || descMatch.match) {
        const bestMatch = titleMatch.match ? titleMatch : descMatch;
        results.push(buildResult({
          title: e.name,
          url: e.optionsUrl || '',
          type: 'extension',
          extension: true,
          icon: e.icon || '',
          score: scoreResult({ title: e.name, url: e.description }, q) * 0.5,
          indices: bestMatch.indices
        }));
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, maxResults);
  }

  async function getTopSites() {
    return new Promise((resolve) => {
      try {
        chrome.topSites.get((sites) => {
          resolve((sites || []).slice(0, 20).map((s) => ({
            title: s.title,
            url: s.url,
            favicon: Utils.getFaviconUrl(s.url)
          })));
        });
      } catch {
        resolve([]);
      }
    });
  }

  async function getRecentlyClosed() {
    return new Promise((resolve) => {
      chrome.sessions.getRecentlyClosed({ maxResults: 10 }, (sessions) => {
        resolve((sessions || []).map((s) => {
          const tab = s.tab || s.window?.tabs?.[0];
          return tab ? {
            title: tab.title || '',
            url: tab.url || '',
            favIconUrl: tab.favIconUrl || '',
            sessionId: s.tab ? s.tab.sessionId : s.window?.tabs?.[0]?.sessionId
          } : null;
        }).filter(Boolean));
      });
    });
  }

  function invalidateCache() {
    lastCacheUpdate = 0;
  }

  return {
    search,
    refreshCaches,
    getTopSites,
    getRecentlyClosed,
    invalidateCache,
    loadTabs,
    loadExtensions
  };
})();
