const StorageManager = {
  DEFAULT_SETTINGS: {
    theme: 'light',
    maxHistoryItems: 1000,
    showNotifications: true,
    autoRetry: false,
    maxRetries: 3,
    speedUpdateInterval: 1000,
    fileTypes: {
      documents: ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt'],
      images: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp'],
      videos: ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm'],
      audio: ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma'],
      archives: ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2'],
      code: ['.js', '.ts', '.py', '.java', '.cpp', '.html', '.css', '.json']
    }
  },

  async get(key) {
    try {
      const result = await chrome.storage.local.get(key);
      return result[key] ?? null;
    } catch (error) {
      console.error('Storage get error:', error);
      return null;
    }
  },

  async set(key, value) {
    try {
      await chrome.storage.local.set({ [key]: value });
      return true;
    } catch (error) {
      console.error('Storage set error:', error);
      return false;
    }
  },

  async remove(key) {
    try {
      await chrome.storage.local.remove(key);
      return true;
    } catch (error) {
      console.error('Storage remove error:', error);
      return false;
    }
  },

  async getSettings() {
    const settings = await this.get('settings');
    return { ...this.DEFAULT_SETTINGS, ...(settings || {}) };
  },

  async updateSettings(newSettings) {
    const current = await this.getSettings();
    const updated = { ...current, ...newSettings };
    return this.set('settings', updated);
  },

  async getDownloads() {
    return (await this.get('downloads')) || [];
  },

  async addDownload(download) {
    const downloads = await this.getDownloads();
    const settings = await this.getSettings();

    const newDownload = {
      id: download.id || Date.now().toString(),
      url: download.url,
      filename: download.filename || 'Unknown',
      fileSize: download.fileSize || 0,
      mimeType: download.mimeType || 'application/octet-stream',
      status: download.status || 'in_progress',
      progress: download.progress || 0,
      speed: 0,
      startTime: download.startTime || Date.now(),
      endTime: null,
      error: null,
      retries: 0,
      tags: download.tags || [],
      ...download
    };

    downloads.unshift(newDownload);

    if (downloads.length > settings.maxHistoryItems) {
      downloads.length = settings.maxHistoryItems;
    }

    await this.set('downloads', downloads);
    return newDownload;
  },

  async updateDownload(id, updates) {
    const downloads = await this.getDownloads();
    const index = downloads.findIndex(d => d.id === id);

    if (index === -1) return null;

    downloads[index] = { ...downloads[index], ...updates };
    await this.set('downloads', downloads);
    return downloads[index];
  },

  async removeDownload(id) {
    const downloads = await this.getDownloads();
    const filtered = downloads.filter(d => d.id !== id);
    await this.set('downloads', filtered);
    return filtered.length < downloads.length;
  },

  async clearHistory() {
    return this.set('downloads', []);
  },

  async searchDownloads(query, filters = {}) {
    const downloads = await this.getDownloads();
    const lowerQuery = query.toLowerCase();

    return downloads.filter(download => {
      const matchesQuery = !query ||
        download.filename.toLowerCase().includes(lowerQuery) ||
        download.url.toLowerCase().includes(lowerQuery);

      const matchesStatus = !filters.status || download.status === filters.status;
      const matchesFileType = !filters.fileType || this.getFileType(download.filename) === filters.fileType;
      const matchesDateFrom = !filters.dateFrom || download.startTime >= filters.dateFrom;
      const matchesDateTo = !filters.dateTo || download.startTime <= filters.dateTo;

      return matchesQuery && matchesStatus && matchesFileType && matchesDateFrom && matchesDateTo;
    });
  },

  getFileType(filename) {
    const ext = '.' + filename.split('.').pop().toLowerCase();
    const settings = this.DEFAULT_SETTINGS;

    for (const [type, extensions] of Object.entries(settings.fileTypes)) {
      if (extensions.includes(ext)) return type;
    }
    return 'other';
  },

  async getStorageStats() {
    try {
      const downloads = await this.getDownloads();
      const totalSize = downloads.reduce((sum, d) => sum + (d.fileSize || 0), 0);
      const completedCount = downloads.filter(d => d.status === 'completed').length;
      const activeCount = downloads.filter(d => d.status === 'in_progress').length;

      const estimate = await chrome.storage.local.getBytesInUse();

      return {
        totalDownloads: downloads.length,
        completedDownloads: completedCount,
        activeDownloads: activeCount,
        totalDataTransferred: totalSize,
        storageUsed: estimate,
        storageQuota: chrome.storage.local.QUOTA_BYTES || 5242880
      };
    } catch (error) {
      console.error('Storage stats error:', error);
      return {
        totalDownloads: 0,
        completedDownloads: 0,
        activeDownloads: 0,
        totalDataTransferred: 0,
        storageUsed: 0,
        storageQuota: 5242880
      };
    }
  },

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  formatSpeed(bytesPerSecond) {
    return this.formatBytes(bytesPerSecond) + '/s';
  },

  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageManager;
}
