const DownloadTracker = {
  activeDownloads: new Map(),
  speedHistory: new Map(),

  init() {
    this.setupListeners();
  },

  setupListeners() {
    chrome.downloads.onCreated.addListener((download) => {
      this.trackDownload(download);
    });

    chrome.downloads.onChanged.addListener((delta) => {
      this.updateDownload(delta);
    });

    chrome.downloads.onDeterminingFilename.addListener((download, suggest) => {
      this.handleFilename(download, suggest);
    });
  },

  trackDownload(download) {
    const tracked = {
      id: download.id,
      url: download.url,
      filename: download.filename || 'Unknown',
      fileSize: download.totalBytes || 0,
      mimeType: download.mime-type || 'application/octet-stream',
      status: 'in_progress',
      progress: 0,
      speed: 0,
      startTime: Date.now(),
      endTime: null,
      error: null,
      retries: 0
    };

    this.activeDownloads.set(download.id, tracked);
    this.speedHistory.set(download.id, []);

    chrome.storage.local.get('settings', (result) => {
      const settings = result.settings || { showNotifications: true };
      if (settings.showNotifications) {
        this.showNotification('Download Started', `Downloading: ${tracked.filename}`);
      }
    });

    this.saveDownload(tracked);
  },

  async updateDownload(delta) {
    if (!delta.id) return;

    const tracked = this.activeDownloads.get(delta.id);
    if (!tracked) return;

    if (delta.state) {
      tracked.status = this.mapState(delta.state.current);

      if (tracked.status === 'completed') {
        tracked.progress = 100;
        tracked.endTime = Date.now();
        this.calculateFinalSpeed(delta.id);
        this.showNotification('Download Complete', `${tracked.filename} has finished downloading.`);
      } else if (tracked.status === 'interrupted') {
        tracked.error = delta.error?.current || 'Download interrupted';
        this.showNotification('Download Failed', `${tracked.filename}: ${tracked.error}`);
      }
    }

    if (delta.bytesReceived) {
      const currentBytes = delta.bytesReceived.current;
      this.updateSpeed(delta.id, currentBytes);
      if (tracked.fileSize > 0) {
        tracked.progress = Math.round((currentBytes / tracked.fileSize) * 100);
      }
    }

    this.saveDownload(tracked);
  },

  mapState(state) {
    const stateMap = {
      'in_progress': 'in_progress',
      'complete': 'completed',
      'interrupted': 'interrupted'
    };
    return stateMap[state] || state;
  },

  updateSpeed(downloadId, currentBytes) {
    const history = this.speedHistory.get(downloadId) || [];
    const now = Date.now();

    history.push({ bytes: currentBytes, time: now });

    const oneSecondAgo = now - 1000;
    const recentHistory = history.filter(h => h.time >= oneSecondAgo);
    this.speedHistory.set(downloadId, recentHistory);

    if (recentHistory.length >= 2) {
      const first = recentHistory[0];
      const last = recentHistory[recentHistory.length - 1];
      const timeDiff = (last.time - first.time) / 1000;

      if (timeDiff > 0) {
        const bytesDiff = last.bytes - first.bytes;
        const speed = Math.round(bytesDiff / timeDiff);

        const tracked = this.activeDownloads.get(downloadId);
        if (tracked) {
          tracked.speed = speed;
        }
      }
    }
  },

  calculateFinalSpeed(downloadId) {
    const history = this.speedHistory.get(downloadId) || [];
    const tracked = this.activeDownloads.get(downloadId);

    if (tracked && history.length > 0) {
      const totalTime = (history[history.length - 1].time - history[0].time) / 1000;
      const totalBytes = history[history.length - 1].bytes;

      if (totalTime > 0) {
        tracked.speed = Math.round(totalBytes / totalTime);
      }
    }
  },

  async saveDownload(download) {
    try {
      const result = await chrome.storage.local.get('downloads');
      const downloads = result.downloads || [];
      const index = downloads.findIndex(d => d.id === download.id);

      if (index !== -1) {
        downloads[index] = download;
      } else {
        downloads.unshift(download);
      }

      const settingsResult = await chrome.storage.local.get('settings');
      const settings = settingsResult.settings || { maxHistoryItems: 1000 };

      if (downloads.length > settings.maxHistoryItems) {
        downloads.length = settings.maxHistoryItems;
      }

      await chrome.storage.local.set({ downloads });
    } catch (error) {
      console.error('Error saving download:', error);
    }
  },

  handleFilename(download, suggest) {
    suggest({ filename: download.filename });
  },

  async retryDownload(downloadId) {
    try {
      const downloads = await this.getStoredDownloads();
      const download = downloads.find(d => d.id === downloadId);

      if (!download) return false;

      await chrome.downloads.download({
        url: download.url,
        filename: download.filename
      });

      return true;
    } catch (error) {
      console.error('Retry failed:', error);
      return false;
    }
  },

  async pauseDownload(downloadId) {
    try {
      await chrome.downloads.pause(downloadId);
      return true;
    } catch (error) {
      console.error('Pause failed:', error);
      return false;
    }
  },

  async resumeDownload(downloadId) {
    try {
      await chrome.downloads.resume(downloadId);
      return true;
    } catch (error) {
      console.error('Resume failed:', error);
      return false;
    }
  },

  async cancelDownload(downloadId) {
    try {
      await chrome.downloads.cancel(downloadId);
      await this.updateDownloadStatus(downloadId, 'cancelled');
      return true;
    } catch (error) {
      console.error('Cancel failed:', error);
      return false;
    }
  },

  async updateDownloadStatus(downloadId, status) {
    const tracked = this.activeDownloads.get(downloadId);
    if (tracked) {
      tracked.status = status;
      await this.saveDownload(tracked);
    }
  },

  async getStoredDownloads() {
    const result = await chrome.storage.local.get('downloads');
    return result.downloads || [];
  },

  async batchDownload(urls) {
    const results = [];

    for (const url of urls) {
      try {
        const downloadId = await chrome.downloads.download({ url });
        results.push({ url, success: true, downloadId });
      } catch (error) {
        results.push({ url, success: false, error: error.message });
      }
    }

    return results;
  },

  showNotification(title, message) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title,
      message
    });
  },

  async getDownloadStats() {
    const downloads = await this.getStoredDownloads();

    return {
      total: downloads.length,
      completed: downloads.filter(d => d.status === 'completed').length,
      inProgress: downloads.filter(d => d.status === 'in_progress').length,
      failed: downloads.filter(d => d.status === 'interrupted').length,
      totalSize: downloads.reduce((sum, d) => sum + (d.fileSize || 0), 0)
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DownloadTracker;
}
