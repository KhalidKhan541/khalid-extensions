class ClipStorage {
  constructor() {
    this.dbName = 'ClipVaultDB';
    this.dbVersion = 2;
    this.db = null;
    this.settings = {
      maxSize: 100,
      autoClearDays: 7,
      interceptCopy: true,
      interceptRightClick: true,
      pollClipboard: false,
      showBadge: true,
      excludedSites: [],
      folders: []
    };
  }

  async init() {
    this.db = await this.openDB();
    await this.loadSettings();
    return this;
  }

  openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('clips')) {
          const store = db.createObjectStore('clips', { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('pinned', 'pinned', { unique: false });
          store.createIndex('folder', 'folder', { unique: false });
          store.createIndex('copyCount', 'copyCount', { unique: false });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  }

  async loadSettings() {
    const stored = await this.getSetting('settings');
    if (stored) {
      this.settings = { ...this.settings, ...stored };
    }
  }

  async getSetting(key) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('settings', 'readonly');
      const store = tx.objectStore('settings');
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value : null);
      req.onerror = () => reject(req.error);
    });
  }

  async saveSetting(key, value) {
    this.settings[key] = value;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('settings', 'readwrite');
      const store = tx.objectStore('settings');
      const req = store.put({ key, value });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async saveSettings() {
    for (const [key, value] of Object.entries(this.settings)) {
      await this.saveSetting(key, value);
    }
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  detectType(text, isImage = false) {
    if (isImage) return 'image';
    if (!text) return 'text';
    const trimmed = text.trim();
    if (/^https?:\/\//.test(trimmed)) return 'link';
    const codePatterns = [
      /function\s+\w+\s*\(/, /const\s+\w+\s*=/, /let\s+\w+\s*=/, /var\s+\w+\s*=/,
      /=>\s*\{/, /class\s+\w+/, /def\s+\w+/, /import\s+.*from/,
      /<html/i, /<div/i, /<script/i, /<\/\w+>/, /document\./, /console\./,
      /\{\s*["']?\w+["']?\s*:/, /SELECT\s+.+FROM/i, /INSERT\s+INTO/i,
      /CREATE\s+TABLE/i, /fn\s+\w+/, /pub\s+fn/, /#include/, /using\s+System/,
      /package\s+\w+/, /interface\s+\w+/, /type\s+\w+\s+struct/
    ];
    const codeScore = codePatterns.reduce((score, p) => score + (p.test(trimmed) ? 1 : 0), 0);
    if (codeScore >= 2 || (trimmed.includes('\n') && codeScore >= 1)) return 'code';
    return 'text';
  }

  detectLanguage(text) {
    if (!text) return 'text';
    const trimmed = text.trim();
    const langPatterns = {
      javascript: [/\b(const|let|var|function|=>|async|await|import|export)\b/, /console\.(log|error|warn)/, /document\.(getElementById|querySelector)/],
      python: [/\b(def|class|import|from|print|if __name__)\b/, /:\s*$/m, /\bself\./],
      html: [/<\/?[\w-]+(\s+[\w-]+="[^"]*")*\s*\/?>/, /<!DOCTYPE/i, /<html/i],
      css: [/\{[\s\S]*?[\w-]+\s*:\s*[\w#.-]+;/, /@media/, /\.([\w-]+)\s*\{/],
      json: [/^\s*[\[{]/, /"[\w]+"\s*:/, /^\s*\{[\s\S]*\}\s*$/],
      sql: [/\b(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/i, /\b(FROM|WHERE|JOIN|ON|GROUP BY|ORDER BY)\b/i],
      go: [/\b(package|func|import|fmt\.|:=)\b/, /func\s*\(/],
      rust: [/\b(fn|let\s+mut|impl|pub|struct|enum|match|use)\b/, /->\s*\w+/],
      java: [/\b(public|private|protected|class|void|String)\b/, /System\.out/],
      cpp: [/\b(#include|std::|cout|cin|template|namespace)\b/, /<<\s*std/]
    };
    let bestLang = 'text';
    let bestScore = 0;
    for (const [lang, patterns] of Object.entries(langPatterns)) {
      const score = patterns.reduce((s, p) => s + (p.test(trimmed) ? 1 : 0), 0);
      if (score > bestScore) {
        bestScore = score;
        bestLang = lang;
      }
    }
    return bestLang;
  }

  async addClip(text, options = {}) {
    if (!text || !text.trim()) return null;
    const trimmed = text.trim();
    const type = options.type || this.detectType(trimmed);
    const language = type === 'code' ? this.detectLanguage(trimmed) : undefined;

    const existing = await this.findDuplicate(trimmed);
    if (existing) {
      existing.copyCount = (existing.copyCount || 0) + 1;
      existing.timestamp = Date.now();
      await this.updateClip(existing);
      return existing;
    }

    const clip = {
      id: this.generateId(),
      text: trimmed,
      type,
      language,
      timestamp: Date.now(),
      pinned: false,
      folder: options.folder || 'unsorted',
      copyCount: 0,
      source: options.source || '',
      isImage: options.isImage || false,
      imageData: options.imageData || null
    };

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('clips', 'readwrite');
      const store = tx.objectStore('clips');
      const req = store.add(clip);
      req.onsuccess = async () => {
        await this.pruneOld();
        resolve(clip);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async findDuplicate(text) {
    const clips = await this.getAllClips();
    return clips.find(c => c.text === text);
  }

  async updateClip(clip) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('clips', 'readwrite');
      const store = tx.objectStore('clips');
      const req = store.put(clip);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async deleteClip(id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('clips', 'readwrite');
      const store = tx.objectStore('clips');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async deleteClips(ids) {
    const tx = this.db.transaction('clips', 'readwrite');
    const store = tx.objectStore('clips');
    for (const id of ids) {
      store.delete(id);
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getClip(id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('clips', 'readonly');
      const store = tx.objectStore('clips');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async getAllClips() {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('clips', 'readonly');
      const store = tx.objectStore('clips');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async searchClips(query, filters = {}) {
    let clips = await this.getAllClips();
    if (query) {
      const q = query.toLowerCase();
      clips = clips.filter(c => {
        const text = (c.text || '').toLowerCase();
        const source = (c.source || '').toLowerCase();
        return text.includes(q) || source.includes(q);
      });
    }
    if (filters.type && filters.type !== 'all') {
      clips = clips.filter(c => c.type === filters.type);
    }
    if (filters.folder && filters.folder !== 'all') {
      if (filters.folder === 'pinned') {
        clips = clips.filter(c => c.pinned);
      } else if (filters.folder === 'unsorted') {
        clips = clips.filter(c => c.folder === 'unsorted');
      } else {
        clips = clips.filter(c => c.folder === filters.folder);
      }
    }
    const sort = filters.sort || 'newest';
    clips.sort((a, b) => {
      switch (sort) {
        case 'oldest': return a.timestamp - b.timestamp;
        case 'most-copied': return (b.copyCount || 0) - (a.copyCount || 0);
        case 'alpha': return (a.text || '').localeCompare(b.text || '');
        default: return b.timestamp - a.timestamp;
      }
    });
    return clips;
  }

  async pruneOld() {
    if (this.settings.autoClearDays <= 0) return;
    const cutoff = Date.now() - (this.settings.autoClearDays * 24 * 60 * 60 * 1000);
    const clips = await this.getAllClips();
    const toDelete = clips.filter(c => !c.pinned && c.timestamp < cutoff).map(c => c.id);
    if (toDelete.length > 0) await this.deleteClips(toDelete);

    const remaining = await this.getAllClips();
    const unpinned = remaining.filter(c => !c.pinned).sort((a, b) => a.timestamp - b.timestamp);
    while (unpinned.length > this.settings.maxSize) {
      const oldest = unpinned.shift();
      await this.deleteClip(oldest.id);
    }
  }

  async getStats() {
    const clips = await this.getAllClips();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();
    const todayClips = clips.filter(c => c.timestamp >= todayStart);
    const pinned = clips.filter(c => c.pinned);
    const totalCopied = clips.reduce((sum, c) => sum + (c.copyCount || 0), 0);
    const mostCopied = [...clips].sort((a, b) => (b.copyCount || 0) - (a.copyCount || 0))[0];

    let storageUsed = 0;
    clips.forEach(c => {
      storageUsed += (c.text || '').length * 2;
      if (c.imageData) storageUsed += c.imageData.length;
    });

    return {
      total: clips.length,
      today: todayClips.length,
      pinned: pinned.length,
      totalCopied,
      mostCopied: mostCopied ? mostCopied.text : null,
      storageUsed
    };
  }

  async exportData() {
    const clips = await this.getAllClips();
    const data = {
      version: 1,
      timestamp: Date.now(),
      settings: this.settings,
      clips
    };
    return JSON.stringify(data, null, 2);
  }

  async importData(jsonStr) {
    const data = JSON.parse(jsonStr);
    if (!data.clips || !Array.isArray(data.clips)) throw new Error('Invalid import data');
    for (const clip of data.clips) {
      if (clip.id && clip.text) {
        await this.addClip(clip.text, {
          type: clip.type,
          folder: clip.folder,
          source: clip.source,
          isImage: clip.isImage,
          imageData: clip.imageData
        });
      }
    }
    if (data.settings) {
      await this.saveSettings();
    }
  }

  async clearAll() {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('clips', 'readwrite');
      const store = tx.objectStore('clips');
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async addFolder(name) {
    if (!this.settings.folders.includes(name)) {
      this.settings.folders.push(name);
      await this.saveSettings();
    }
  }

  async removeFolder(name) {
    this.settings.folders = this.settings.folders.filter(f => f !== name);
    const clips = await this.getAllClips();
    for (const clip of clips) {
      if (clip.folder === name) {
        clip.folder = 'unsorted';
        await this.updateClip(clip);
      }
    }
    await this.saveSettings();
  }
}

window.ClipStorage = ClipStorage;