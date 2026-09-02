class WebClipperStorage {
  constructor() {
    this.DB_NAME = 'WebClipperDB';
    this.DB_VERSION = 1;
    this.db = null;
    this.CLIPS_STORE = 'clips';
    this.COLLECTIONS_STORE = 'collections';
    this.TAGS_STORE = 'tags';
    this.INDEX_STORE = 'searchIndex';
    this.initPromise = this.init();
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(this.CLIPS_STORE)) {
          const clipStore = db.createObjectStore(this.CLIPS_STORE, { keyPath: 'id' });
          clipStore.createIndex('url', 'url', { unique: false });
          clipStore.createIndex('date', 'date', { unique: false });
          clipStore.createIndex('collection', 'collection', { unique: false });
          clipStore.createIndex('type', 'type', { unique: false });
        }

        if (!db.objectStoreNames.contains(this.COLLECTIONS_STORE)) {
          const colStore = db.createObjectStore(this.COLLECTIONS_STORE, { keyPath: 'id' });
          colStore.createIndex('name', 'name', { unique: true });
        }

        if (!db.objectStoreNames.contains(this.TAGS_STORE)) {
          const tagStore = db.createObjectStore(this.TAGS_STORE, { keyPath: 'id' });
          tagStore.createIndex('name', 'name', { unique: true });
        }

        if (!db.objectStoreNames.contains(this.INDEX_STORE)) {
          const indexStore = db.createObjectStore(this.INDEX_STORE, { keyPath: 'clipId' });
          indexStore.createIndex('words', 'words', { unique: false, multiEntry: true });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        this.seedCollections();
        resolve(this.db);
      };
    });
  }

  async seedCollections() {
    const collections = await this.getAllCollections();
    if (collections.length === 0) {
      const defaults = [
        { id: this.generateId(), name: 'Uncategorized', icon: '📁', color: '#95a5a6', created: Date.now() },
        { id: this.generateId(), name: 'Read Later', icon: '🕐', color: '#3498db', created: Date.now() },
        { id: this.generateId(), name: 'Work', icon: '💼', color: '#e67e22', created: Date.now() },
        { id: this.generateId(), name: 'Personal', icon: '🏠', color: '#27ae60', created: Date.now() },
        { id: this.generateId(), name: 'Research', icon: '🔬', color: '#9b59b6', created: Date.now() }
      ];
      for (const col of defaults) {
        await this.saveCollection(col);
      }
    }
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  async ensureInit() {
    if (!this.db) await this.initPromise;
  }

  getTransaction(storeName, mode = 'readonly') {
    const tx = this.db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  }

  promisifyRequest(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveClip(clip) {
    await this.ensureInit();
    const data = {
      id: clip.id || this.generateId(),
      url: clip.url || '',
      title: clip.title || 'Untitled',
      content: clip.content || '',
      html: clip.html || '',
      markdown: clip.markdown || '',
      excerpt: clip.excerpt || '',
      type: clip.type || 'selection',
      collection: clip.collection || 'Uncategorized',
      tags: clip.tags || [],
      annotation: clip.annotation || '',
      highlights: clip.highlights || [],
      thumbnail: clip.thumbnail || '',
      images: clip.images || [],
      metadata: clip.metadata || {},
      date: clip.date || Date.now(),
      modified: Date.now()
    };

    const store = this.getTransaction(this.CLIPS_STORE, 'readwrite');
    await this.promisifyRequest(store.put(data));

    await this.indexClip(data);

    this.updateBadge();
    return data;
  }

  async indexClip(clip) {
    const text = `${clip.title} ${clip.excerpt} ${clip.markdown} ${(clip.tags || []).join(' ')}`.toLowerCase();
    const words = text.split(/\s+/).filter(w => w.length > 2);
    const uniqueWords = [...new Set(words)];

    const store = this.getTransaction(this.INDEX_STORE, 'readwrite');
    await this.promisifyRequest(store.put({ clipId: clip.id, words: uniqueWords }));
  }

  async getClip(id) {
    await this.ensureInit();
    const store = this.getTransaction(this.CLIPS_STORE);
    return this.promisifyRequest(store.get(id));
  }

  async deleteClip(id) {
    await this.ensureInit();
    const store = this.getTransaction(this.CLIPS_STORE, 'readwrite');
    await this.promisifyRequest(store.delete(id));
    const indexStore = this.getTransaction(this.INDEX_STORE, 'readwrite');
    await this.promisifyRequest(indexStore.delete(id));
    this.updateBadge();
  }

  async deleteClips(ids) {
    await this.ensureInit();
    const tx = this.db.transaction([this.CLIPS_STORE, this.INDEX_STORE], 'readwrite');
    const clipStore = tx.objectStore(this.CLIPS_STORE);
    const indexStore = tx.objectStore(this.INDEX_STORE);
    for (const id of ids) {
      clipStore.delete(id);
      indexStore.delete(id);
    }
    await new Promise((resolve) => { tx.oncomplete = resolve; });
    this.updateBadge();
  }

  async getAllClips() {
    await this.ensureInit();
    const store = this.getTransaction(this.CLIPS_STORE);
    return this.promisifyRequest(store.getAll());
  }

  async searchClips(query) {
    if (!query || query.trim().length === 0) return this.getAllClips();

    await this.ensureInit();
    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);

    const clips = await this.getAllClips();

    return clips.filter(clip => {
      const searchText = `${clip.title} ${clip.excerpt} ${(clip.tags || []).join(' ')} ${clip.url}`.toLowerCase();
      return terms.every(term => searchText.includes(term));
    });
  }

  async getClipsByCollection(collection) {
    const clips = await this.getAllClips();
    return clips.filter(c => c.collection === collection);
  }

  async getClipsByTag(tag) {
    const clips = await this.getAllClips();
    return clips.filter(c => (c.tags || []).includes(tag));
  }

  async getClipsByDateRange(startDate, endDate) {
    const clips = await this.getAllClips();
    return clips.filter(c => c.date >= startDate && c.date <= endDate);
  }

  async updateClip(id, updates) {
    const clip = await this.getClip(id);
    if (!clip) return null;
    const updated = { ...clip, ...updates, modified: Date.now() };
    const store = this.getTransaction(this.CLIPS_STORE, 'readwrite');
    await this.promisifyRequest(store.put(updated));
    await this.indexClip(updated);
    return updated;
  }

  async saveCollection(collection) {
    await this.ensureInit();
    const data = {
      id: collection.id || this.generateId(),
      name: collection.name,
      icon: collection.icon || '📁',
      color: collection.color || '#3498db',
      created: collection.created || Date.now()
    };
    const store = this.getTransaction(this.COLLECTIONS_STORE, 'readwrite');
    await this.promisifyRequest(store.put(data));
    return data;
  }

  async getAllCollections() {
    await this.ensureInit();
    const store = this.getTransaction(this.COLLECTIONS_STORE);
    return this.promisifyRequest(store.getAll());
  }

  async deleteCollection(id) {
    await this.ensureInit();
    const clips = await this.getClipsByCollection('Uncategorized');
    for (const clip of clips) {
      await this.updateClip(clip.id, { collection: 'Uncategorized' });
    }
    const store = this.getTransaction(this.COLLECTIONS_STORE, 'readwrite');
    await this.promisifyRequest(store.delete(id));
  }

  async saveTag(tag) {
    await this.ensureInit();
    const data = {
      id: tag.id || this.generateId(),
      name: tag.name,
      color: tag.color || '#4a90d9'
    };
    const store = this.getTransaction(this.TAGS_STORE, 'readwrite');
    await this.promisifyRequest(store.put(data));
    return data;
  }

  async getAllTags() {
    await this.ensureInit();
    const store = this.getTransaction(this.TAGS_STORE);
    return this.promisifyRequest(store.getAll());
  }

  async deleteTag(id) {
    await this.ensureInit();
    const store = this.getTransaction(this.TAGS_STORE, 'readwrite');
    await this.promisifyRequest(store.delete(id));
  }

  async updateBadge() {
    try {
      const clips = await this.getAllClips();
      const count = clips.length;
      chrome.action.setBadgeText({ text: count > 0 ? count.toString() : '' });
      chrome.action.setBadgeBackgroundColor({ color: '#4a90d9' });
    } catch (e) {}
  }

  async getStats() {
    const clips = await this.getAllClips();
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    const weekClips = clips.filter(c => c.date >= weekAgo).length;
    const storageUsed = this.estimateStorageSize(clips);

    return { total: clips.length, week: weekClips, storageUsed };
  }

  estimateStorageSize(clips) {
    let bytes = 0;
    for (const clip of clips) {
      bytes += (clip.content || '').length;
      bytes += (clip.html || '').length;
      bytes += (clip.markdown || '').length;
      bytes += (clip.title || '').length;
      bytes += (clip.url || '').length;
      bytes += 200;
    }
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  async exportClips(format = 'json', collection = '') {
    let clips = await this.getAllClips();
    if (collection) clips = clips.filter(c => c.collection === collection);

    if (format === 'json') {
      return JSON.stringify(clips, null, 2);
    }

    if (format === 'markdown') {
      let md = '# Web Clipper Export\n\n';
      for (const clip of clips) {
        md += `## ${clip.title}\n\n`;
        md += `**Source:** [${clip.url}](${clip.url})\n`;
        md += `**Date:** ${new Date(clip.date).toISOString()}\n`;
        md += `**Collection:** ${clip.collection}\n`;
        if (clip.tags.length) md += `**Tags:** ${clip.tags.join(', ')}\n`;
        if (clip.annotation) md += `**Note:** ${clip.annotation}\n`;
        md += '\n---\n\n';
        md += clip.markdown || clip.excerpt || clip.content || '';
        md += '\n\n---\n\n';
      }
      return md;
    }

    if (format === 'html') {
      let html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Web Clipper Export</title>';
      html += '<style>body{font-family:sans-serif;max-width:800px;margin:0 auto;padding:20px;line-height:1.6}';
      html += '.clip{border:1px solid #ddd;border-radius:8px;padding:20px;margin-bottom:20px}';
      html += '.clip-header{margin-bottom:12px}h2{margin:0 0 8px}meta{color:#666;font-size:14px}';
      html += 'img{max-width:100%;border-radius:4px}pre{background:#f5f5f5;padding:12px;border-radius:4px;overflow-x:auto}';
      html += 'blockquote{border-left:3px solid #4a90d9;padding-left:12px;color:#666}</style></head><body>';
      html += '<h1>Web Clipper Export</h1>';
      for (const clip of clips) {
        html += '<div class="clip">';
        html += `<div class="clip-header"><h2>${this.escapeHtml(clip.title)}</h2>`;
        html += `<p class="meta">Source: <a href="${clip.url}">${clip.url}</a> | Date: ${new Date(clip.date).toLocaleDateString()}</p>`;
        if (clip.tags.length) html += `<p class="meta">Tags: ${clip.tags.join(', ')}</p>`;
        html += '</div>';
        html += clip.html || clip.content || '';
        html += '</div>';
      }
      html += '</body></html>';
      return html;
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async importClips(data) {
    let clips;
    try {
      clips = typeof data === 'string' ? JSON.parse(data) : data;
    } catch (e) {
      throw new Error('Invalid import data');
    }

    if (!Array.isArray(clips)) clips = [clips];

    let imported = 0;
    for (const clip of clips) {
      try {
        clip.id = this.generateId();
        clip.date = clip.date || Date.now();
        await this.saveClip(clip);
        imported++;
      } catch (e) {}
    }

    return imported;
  }

  async clearAllClips() {
    await this.ensureInit();
    const tx = this.db.transaction([this.CLIPS_STORE, this.INDEX_STORE], 'readwrite');
    tx.objectStore(this.CLIPS_STORE).clear();
    tx.objectStore(this.INDEX_STORE).clear();
    await new Promise((resolve) => { tx.oncomplete = resolve; });
    this.updateBadge();
  }
}

window.clipStorage = new WebClipperStorage();
