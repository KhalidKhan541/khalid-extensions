const StorageManager = {
  STORAGE_KEY: 'page_archives',
  SETTINGS_KEY: 'page_archiver_settings',

  defaultSettings: {
    autoSave: false,
    storageLimitMB: 5,
    autoCleanupDays: 30,
    defaultSaveType: 'full'
  },

  async getSettings() {
    const result = await chrome.storage.local.get(this.SETTINGS_KEY);
    return { ...this.defaultSettings, ...(result[this.SETTINGS_KEY] || {}) };
  },

  async saveSettings(settings) {
    await chrome.storage.local.set({ [this.SETTINGS_KEY]: settings });
  },

  async getArchives() {
    const result = await chrome.storage.local.get(this.STORAGE_KEY);
    return result[this.STORAGE_KEY] || [];
  },

  async addArchive(archive) {
    const archives = await this.getArchives();
    archive.id = this.generateId();
    archive.savedAt = Date.now();
    archives.unshift(archive);
    await this.saveArchives(archives);
    return archive;
  },

  async removeArchive(id) {
    const archives = await this.getArchives();
    const filtered = archives.filter(a => a.id !== id);
    await this.saveArchives(filtered);
  },

  async updateArchive(id, updates) {
    const archives = await this.getArchives();
    const idx = archives.findIndex(a => a.id === id);
    if (idx !== -1) {
      archives[idx] = { ...archives[idx], ...updates };
      await this.saveArchives(archives);
    }
  },

  async getArchive(id) {
    const archives = await this.getArchives();
    return archives.find(a => a.id === id) || null;
  },

  async saveArchives(archives) {
    await chrome.storage.local.set({ [this.STORAGE_KEY]: archives });
  },

  async clearAll() {
    await chrome.storage.local.remove(this.STORAGE_KEY);
  },

  async getUsage() {
    const bytes = await chrome.storage.local.getBytesInUse(null);
    return {
      used: bytes,
      usedFormatted: this.formatBytes(bytes)
    };
  },

  async getStats() {
    const archives = await this.getArchives();
    const usage = await this.getUsage();
    const settings = await this.getSettings();
    const totalSize = archives.reduce((sum, a) => sum + (a.size || 0), 0);
    const oldest = archives.length > 0
      ? new Date(archives[archives.length - 1].savedAt)
      : null;
    return {
      total: archives.length,
      totalSize,
      totalSizeFormatted: this.formatBytes(totalSize),
      avgSize: archives.length > 0 ? this.formatBytes(totalSize / archives.length) : '0 B',
      oldest: oldest ? this.formatDate(oldest) : '-',
      usage: usage.used,
      usageFormatted: usage.usedFormatted,
      limit: settings.storageLimitMB * 1024 * 1024,
      limitFormatted: `${settings.storageLimitMB} MB`
    };
  },

  async cleanupOldArchives() {
    const settings = await this.getSettings();
    if (settings.autoCleanupDays <= 0) return 0;
    const archives = await this.getArchives();
    const cutoff = Date.now() - (settings.autoCleanupDays * 24 * 60 * 60 * 1000);
    const remaining = archives.filter(a => a.savedAt > cutoff);
    const removed = archives.length - remaining.length;
    if (removed > 0) {
      await this.saveArchives(remaining);
    }
    return removed;
  },

  async exportData() {
    const archives = await this.getArchives();
    const settings = await this.getSettings();
    return JSON.stringify({ archives, settings, exportedAt: Date.now() }, null, 2);
  },

  async importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data.archives && Array.isArray(data.archives)) {
        const existing = await this.getArchives();
        const existingIds = new Set(existing.map(a => a.id));
        const newArchives = data.archives.filter(a => !existingIds.has(a.id));
        await this.saveArchives([...newArchives, ...existing]);
        return { success: true, imported: newArchives.length };
      }
      return { success: false, error: 'Invalid data format' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async searchArchives(query) {
    const archives = await this.getArchives();
    const q = query.toLowerCase().trim();
    if (!q) return archives;
    return archives.filter(a =>
      (a.title || '').toLowerCase().includes(q) ||
      (a.url || '').toLowerCase().includes(q) ||
      (a.description || '').toLowerCase().includes(q) ||
      (a.tags || []).some(t => t.toLowerCase().includes(q))
    );
  },

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  },

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  },

  formatDate(date) {
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return date.toLocaleDateString();
  }
};
