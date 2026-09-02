/* scanner.js — Bookmark analysis engine */

const BookmarkScanner = (() => {
  const URLNormalization = {
    normalize(url, settings = {}) {
      if (!url || typeof url !== 'string') return null;
      try {
        const parsed = new URL(url);
        let normalized = parsed.protocol + '//' + parsed.hostname.toLowerCase() + parsed.pathname;

        // Remove trailing slash (except root)
        if (normalized.length > parsed.protocol.length + 2 && normalized.endsWith('/')) {
          normalized = normalized.slice(0, -1);
        }

        // Normalize www
        if (settings.normalizeWww !== false) {
          normalized = normalized.replace(/^https?:\/\/www\./, (m) => m.replace('www.', ''));
        }

        // Normalize protocol
        if (settings.normalizeProtocol !== false) {
          normalized = normalized.replace(/^https?:/, 'https:');
        }

        // Sort query params
        if (parsed.search) {
          const params = new URLSearchParams(parsed.search);
          const sorted = new URLSearchParams([...params.entries()].sort());
          normalized += '?' + sorted.toString();
        }

        // Fragments
        if (settings.includeFragments && parsed.hash) {
          normalized += parsed.hash;
        }

        return normalized;
      } catch {
        return null;
      }
    },

    getDomain(url) {
      try {
        return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
      } catch {
        return null;
      }
    },

    getPath(url) {
      try {
        return new URL(url).pathname;
      } catch {
        return '';
      }
    }
  };

  // Levenshtein distance for fuzzy name matching
  function levenshtein(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = Array.from({ length: a.length + 1 }, (_, i) =>
      Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
    );
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    return matrix[a.length][b.length];
  }

  function similarity(a, b) {
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 1;
    return 1 - levenshtein(a.toLowerCase(), b.toLowerCase()) / maxLen;
  }

  // Flatten bookmark tree into a flat array
  async function flattenBookmarks() {
    const tree = await chrome.bookmarks.getTree();
    const flat = [];

    function walk(nodes, path = '') {
      for (const node of nodes) {
        if (node.children) {
          const folderPath = path ? path + ' / ' + node.title : (node.title || 'Root');
          walk(node.children, folderPath);
        } else if (node.url) {
          flat.push({
            id: node.id,
            title: node.title || '',
            url: node.url,
            dateAdded: node.dateAdded || 0,
            folder: path || 'Unfiled',
            parentId: node.parentId
          });
        }
      }
    }

    walk(tree[0].children);
    return flat;
  }

  async function getEmptyFolders() {
    const tree = await chrome.bookmarks.getTree();
    const folders = [];

    function walk(nodes, path = '') {
      for (const node of nodes) {
        if (node.children) {
          const folderPath = path ? path + ' / ' + node.title : (node.title || 'Root');
          if (node.children.length === 0 && node.id !== '0' && node.id !== '1' && node.id !== '2') {
            folders.push({ id: node.id, title: node.title || '(Untitled)', path: folderPath, parentId: node.parentId });
          } else {
            walk(node.children, folderPath);
          }
        }
      }
    }

    walk(tree[0].children);
    return folders;
  }

  // Broken link detection via HEAD request
  async function checkBroken(url, timeoutMs = 8000) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const resp = await fetch(url, {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal,
        redirect: 'follow'
      });
      clearTimeout(timer);
      // no-cors gives opaque response (status=0), treat as alive
      if (resp.type === 'opaque') return false;
      return resp.status >= 400;
    } catch {
      return true; // network error => broken
    }
  }

  // Group bookmarks by normalized URL
  function groupDuplicates(bookmarks, settings = {}) {
    const groups = {};
    for (const bm of bookmarks) {
      const norm = URLNormalization.normalize(bm.url, settings);
      if (!norm) continue;
      if (!groups[norm]) groups[norm] = [];
      groups[norm].push({ ...bm, normalizedUrl: norm });
    }
    // Only groups with >1 bookmark
    return Object.entries(groups)
      .filter(([, items]) => items.length > 1)
      .map(([url, items]) => ({
        url,
        originalUrl: items[0].url,
        count: items.length,
        items: items.sort((a, b) => (a.dateAdded || 0) - (b.dateAdded || 0))
      }));
  }

  // Similar bookmarks: same domain, different paths
  function findSimilar(bookmarks) {
    const byDomain = {};
    for (const bm of bookmarks) {
      const domain = URLNormalization.getDomain(bm.url);
      if (!domain) continue;
      if (!byDomain[domain]) byDomain[domain] = [];
      byDomain[domain].push(bm);
    }

    const similar = [];
    for (const [domain, items] of Object.entries(byDomain)) {
      if (items.length < 2) continue;
      // Group by path similarity — pairs with >0.6 name similarity or shared path prefix
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const pathA = URLNormalization.getPath(items[i].url);
          const pathB = URLNormalization.getPath(items[j].url);
          if (pathA === pathB) continue; // exact dup handled elsewhere
          const nameSim = similarity(items[i].title, items[j].title);
          const pathPrefix = longestCommonPrefix(pathA, pathB);
          if (nameSim > 0.6 || pathPrefix.length > 10) {
            similar.push({
              domain,
              items: [items[i], items[j]],
              reason: nameSim > 0.6 ? 'similar names' : 'shared path prefix'
            });
          }
        }
      }
    }
    return similar;
  }

  function longestCommonPrefix(a, b) {
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    return a.slice(0, i);
  }

  // Full scan
  async function scan(settings = {}, onProgress = null) {
    const report = {
      bookmarks: [],
      duplicates: [],
      broken: [],
      emptyFolders: [],
      similar: [],
      stats: { total: 0, duplicates: 0, broken: 0, emptyFolders: 0, similar: 0 },
      scannedAt: Date.now(),
      settings
    };

    if (onProgress) onProgress('Flattening bookmarks...', 5);

    report.bookmarks = await flattenBookmarks();
    report.stats.total = report.bookmarks.length;

    if (onProgress) onProgress('Finding duplicates...', 15);
    report.duplicates = groupDuplicates(report.bookmarks, settings);
    report.stats.duplicates = report.duplicates.reduce((sum, g) => sum + g.count - 1, 0);

    if (onProgress) onProgress('Finding similar bookmarks...', 30);
    report.similar = findSimilar(report.bookmarks);
    report.stats.similar = report.similar.length;

    if (onProgress) onProgress('Finding empty folders...', 40);
    report.emptyFolders = await getEmptyFolders();
    report.stats.emptyFolders = report.emptyFolders.length;

    if (settings.checkBroken !== false) {
      // Check broken links — only for unique URLs to avoid redundant checks
      const uniqueUrls = [...new Set(report.bookmarks.map(b => b.url))];
      const total = uniqueUrls.length;
      if (onProgress) onProgress(`Checking ${total} unique URLs for broken links...`, 45);

      const batchSize = 5;
      for (let i = 0; i < total; i += batchSize) {
        const batch = uniqueUrls.slice(i, i + batchSize);
        const results = await Promise.all(batch.map(async (url) => {
          const isBroken = await checkBroken(url);
          return { url, isBroken };
        }));
        for (const { url, isBroken } of results) {
          if (isBroken) {
            const matching = report.bookmarks.filter(b => b.url === url);
            report.broken.push(...matching);
          }
        }
        const pct = 45 + Math.floor((i / total) * 50);
        if (onProgress) onProgress(`Checked ${Math.min(i + batchSize, total)}/${total} URLs...`, Math.min(pct, 95));
      }
      report.stats.broken = report.broken.length;
    }

    if (onProgress) onProgress('Scan complete!', 100);
    return report;
  }

  return {
    URLNormalization,
    levenshtein,
    similarity,
    flattenBookmarks,
    getEmptyFolders,
    checkBroken,
    groupDuplicates,
    findSimilar,
    scan
  };
})();
