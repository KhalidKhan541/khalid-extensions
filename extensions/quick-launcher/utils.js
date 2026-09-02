/* global Utils:true */
const Utils = (() => {
  const STORAGE_PREFIX = 'ql_';
  const CLIPBOARD_MAX = 5;

  function normalizeUrl(url) {
    if (!url) return '';
    url = url.trim();
    if (!url.includes('://') && !url.startsWith('//')) {
      if (url.includes('.') && !url.includes(' ')) {
        url = 'https://' + url;
      }
    }
    try {
      const u = new URL(url);
      return u.origin + u.pathname.replace(/\/+$/, '') + u.search + u.hash;
    } catch {
      return url;
    }
  }

  function getDomain(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  }

  function getFaviconUrl(url) {
    const domain = getDomain(url);
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  }

  function matchesDomain(url, query) {
    const domain = getDomain(url);
    const q = query.toLowerCase();
    return domain.includes(q);
  }

  function relativeTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);

    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    if (weeks < 4) return `${weeks}w ago`;
    return `${months}mo ago`;
  }

  function formatTime(timestamp) {
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function debounce(fn, ms) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  function throttle(fn, ms) {
    let last = 0;
    return function (...args) {
      const now = Date.now();
      if (now - last >= ms) {
        last = now;
        return fn.apply(this, args);
      }
    };
  }

  async function getStorage(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get(STORAGE_PREFIX + key, (result) => {
        resolve(result[STORAGE_PREFIX + key] ?? null);
      });
    });
  }

  async function setStorage(key, value) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_PREFIX + key]: value }, resolve);
    });
  }

  async function getStorageBulk(keys) {
    return new Promise((resolve) => {
      const prefixed = keys.map((k) => STORAGE_PREFIX + k);
      chrome.storage.local.get(prefixed, (result) => {
        const out = {};
        keys.forEach((k, i) => {
          out[k] = result[prefixed[i]] ?? null;
        });
        resolve(out);
      });
    });
  }

  function fuzzyMatch(text, query) {
    if (!query) return { match: true, score: 0, indices: [] };
    const t = text.toLowerCase();
    const q = query.toLowerCase();

    if (t === q) return { match: true, score: 1000, indices: [...Array(q.length).keys()] };
    if (t.includes(q)) {
      const idx = t.indexOf(q);
      return { match: true, score: 800 - idx, indices: [...Array(q.length).keys()].map((i) => i + idx) };
    }

    let qi = 0;
    let score = 0;
    let lastIdx = -1;
    const indices = [];

    for (let ti = 0; ti < t.length && qi < q.length; ti++) {
      if (t[ti] === q[qi]) {
        indices.push(ti);
        if (lastIdx === ti - 1) score += 10;
        else score += 5;
        if (ti === 0 || text[ti - 1] === '/' || text[ti - 1] === '.' || text[ti - 1] === ' ') score += 15;
        lastIdx = ti;
        qi++;
      }
    }

    if (qi === q.length) {
      score += Math.max(0, 100 - indices.length);
      return { match: true, score, indices };
    }

    return { match: false, score: 0, indices: [] };
  }

  function highlightMatch(text, indices) {
    if (!indices || indices.length === 0) return escapeHtml(text);
    const indexSet = new Set(indices);
    let result = '';
    let inMark = false;
    for (let i = 0; i < text.length; i++) {
      if (indexSet.has(i)) {
        if (!inMark) { result += '<mark>'; inMark = true; }
        result += escapeHtml(text[i]);
      } else {
        if (inMark) { result += '</mark>'; inMark = false; }
        result += escapeHtml(text[i]);
      }
    }
    if (inMark) result += '</mark>';
    return result;
  }

  function escapeHtml(str) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return str.replace(/[&<>"']/g, (c) => map[c]);
  }

  function deduplicate(items, keyFn) {
    const seen = new Map();
    for (const item of items) {
      const key = keyFn(item);
      if (!seen.has(key)) {
        seen.set(key, item);
      }
    }
    return [...seen.values()];
  }

  async function getClipboardHistory() {
    const history = await getStorage('clipboard');
    return Array.isArray(history) ? history : [];
  }

  async function addClipboardEntry(text) {
    if (!text || text.length > 500) return;
    const history = await getClipboardHistory();
    const filtered = history.filter((e) => e.text !== text);
    filtered.unshift({ text, time: Date.now() });
    if (filtered.length > CLIPBOARD_MAX) filtered.length = CLIPBOARD_MAX;
    await setStorage('clipboard', filtered);
  }

  function isValidJson(str) {
    try { JSON.parse(str); return true; } catch { return false; }
  }

  function formatJson(str) {
    try { return JSON.stringify(JSON.parse(str), null, 2); } catch { return str; }
  }

  function evaluateMath(expr) {
    try {
      const sanitized = expr.replace(/[^-()\d/*+.%]/g, '');
      if (!sanitized || /[+\-*/]{2,}/.test(sanitized)) return null;
      const result = Function(`"use strict"; return (${sanitized})`)();
      if (typeof result === 'number' && isFinite(result)) return result;
      return null;
    } catch {
      return null;
    }
  }

  function generateLorem(words = 50) {
    const pool = [
      'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
      'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
      'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
      'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo',
      'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate',
      'velit', 'esse', 'cillum', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint',
      'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'culpa', 'qui', 'officia',
      'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum'
    ];
    const result = [];
    for (let i = 0; i < words; i++) {
      result.push(pool[Math.floor(Math.random() * pool.length)]);
    }
    result[0] = result[0][0].toUpperCase() + result[0].slice(1);
    return result.join(' ');
  }

  return {
    normalizeUrl,
    getDomain,
    getFaviconUrl,
    matchesDomain,
    relativeTime,
    formatTime,
    debounce,
    throttle,
    getStorage,
    setStorage,
    getStorageBulk,
    fuzzyMatch,
    highlightMatch,
    escapeHtml,
    deduplicate,
    getClipboardHistory,
    addClipboardEntry,
    isValidJson,
    formatJson,
    evaluateMath,
    generateLorem
  };
})();
