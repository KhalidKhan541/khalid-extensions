export class Storage {
  constructor() {
    this.STORAGE_KEYS = {
      SETTINGS: 'blockade_settings',
      STATS: 'blockade_stats',
      BLOCKED_LOG: 'blockade_blocked_log',
      CUSTOM_BLOCK_LIST: 'blockade_custom_block_list',
      CUSTOM_ALLOW_LIST: 'blockade_custom_allow_list',
      SITE_STATS: 'blockade_site_stats',
      LAST_CLEANUP: 'blockade_last_cleanup'
    };

    this.DEFAULT_SETTINGS = {
      globalEnabled: true,
      siteEnabled: {},
      categoryEnabled: {
        ads: true,
        trackers: true,
        cryptominers: true,
        fingerprinters: true,
        malware: true
      },
      allowlist: [],
      customBlockList: [],
      easyListEnabled: true,
      theme: 'light'
    };

    this.DEFAULT_STATS = {
      ads: 0,
      trackers: 0,
      cryptominers: 0,
      fingerprinters: 0,
      malware: 0,
      total: 0,
      today: {}
    };
  }

  async initializeDefaults() {
    const existing = await this.getSettings();
    const merged = { ...this.DEFAULT_SETTINGS, ...existing };
    await this.setSettings(merged);

    const existingStats = await this.getStats();
    const mergedStats = { ...this.DEFAULT_STATS, ...existingStats };
    await this.setStats(mergedStats);
  }

  async getSettings() {
    try {
      const data = await chrome.storage.local.get(this.STORAGE_KEYS.SETTINGS);
      return data[this.STORAGE_KEYS.SETTINGS] || this.DEFAULT_SETTINGS;
    } catch {
      return { ...this.DEFAULT_SETTINGS };
    }
  }

  async setSettings(settings) {
    try {
      await chrome.storage.local.set({ [this.STORAGE_KEYS.SETTINGS]: settings });
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  }

  async getStats() {
    try {
      const data = await chrome.storage.local.get(this.STORAGE_KEYS.STATS);
      const stats = data[this.STORAGE_KEYS.STATS] || { ...this.DEFAULT_STATS };

      const today = new Date().toISOString().split('T')[0];
      if (!stats.today) stats.today = {};
      if (!stats.today[today]) stats.today[today] = 0;

      return stats;
    } catch {
      return { ...this.DEFAULT_STATS };
    }
  }

  async setStats(stats) {
    try {
      await chrome.storage.local.set({ [this.STORAGE_KEYS.STATS]: stats });
    } catch (err) {
      console.error('Failed to save stats:', err);
    }
  }

  async incrementStat(category) {
    const stats = await this.getStats();
    stats[category] = (stats[category] || 0) + 1;
    stats.total = (stats.total || 0) + 1;

    const today = new Date().toISOString().split('T')[0];
    if (!stats.today) stats.today = {};
    stats.today[today] = (stats.today[today] || 0) + 1;

    await this.setStats(stats);
    return stats;
  }

  async clearStats() {
    await this.setStats({ ...this.DEFAULT_STATS });
  }

  async logBlockedRequest(entry) {
    try {
      const data = await chrome.storage.local.get(this.STORAGE_KEYS.BLOCKED_LOG);
      let log = data[this.STORAGE_KEYS.BLOCKED_LOG] || [];
      log.push({
        ...entry,
        id: Date.now() + Math.random().toString(36).substr(2, 5)
      });

      if (log.length > 50) {
        log = log.slice(-50);
      }

      await chrome.storage.local.set({ [this.STORAGE_KEYS.BLOCKED_LOG]: log });
    } catch (err) {
      console.error('Failed to log blocked request:', err);
    }
  }

  async getBlockedLog() {
    try {
      const data = await chrome.storage.local.get(this.STORAGE_KEYS.BLOCKED_LOG);
      return data[this.STORAGE_KEYS.BLOCKED_LOG] || [];
    } catch {
      return [];
    }
  }

  async clearBlockedLog() {
    await chrome.storage.local.set({ [this.STORAGE_KEYS.BLOCKED_LOG]: [] });
  }

  async addToAllowlist(domain) {
    const settings = await this.getSettings();
    if (!settings.allowlist) settings.allowlist = [];
    if (!settings.allowlist.includes(domain)) {
      settings.allowlist.push(domain);
      await this.setSettings(settings);
    }
    return settings.allowlist;
  }

  async removeFromAllowlist(domain) {
    const settings = await this.getSettings();
    if (settings.allowlist) {
      settings.allowlist = settings.allowlist.filter(d => d !== domain);
      await this.setSettings(settings);
    }
    return settings.allowlist || [];
  }

  async getAllowlist() {
    const settings = await this.getSettings();
    return settings.allowlist || [];
  }

  async addToBlockList(domain) {
    const settings = await this.getSettings();
    if (!settings.customBlockList) settings.customBlockList = [];
    if (!settings.customBlockList.includes(domain)) {
      settings.customBlockList.push(domain);
      await this.setSettings(settings);
    }
    return settings.customBlockList;
  }

  async removeFromBlockList(domain) {
    const settings = await this.getSettings();
    if (settings.customBlockList) {
      settings.customBlockList = settings.customBlockList.filter(d => d !== domain);
      await this.setSettings(settings);
    }
    return settings.customBlockList || [];
  }

  async getCustomBlockList() {
    const settings = await this.getSettings();
    return settings.customBlockList || [];
  }

  async updateSiteStats(hostname, blocked) {
    try {
      const data = await chrome.storage.local.get(this.STORAGE_KEYS.SITE_STATS);
      let siteStats = data[this.STORAGE_KEYS.SITE_STATS] || {};

      if (!siteStats[hostname]) {
        siteStats[hostname] = {
          blocked: 0,
          allowed: 0,
          lastAccess: Date.now()
        };
      }

      if (blocked) {
        siteStats[hostname].blocked++;
      } else {
        siteStats[hostname].allowed++;
      }
      siteStats[hostname].lastAccess = Date.now();

      const hostnames = Object.keys(siteStats);
      if (hostnames.length > 1000) {
        const sorted = hostnames.sort((a, b) =>
          (siteStats[a].lastAccess || 0) - (siteStats[b].lastAccess || 0)
        );
        const toRemove = sorted.slice(0, 200);
        toRemove.forEach(h => delete siteStats[h]);
      }

      await chrome.storage.local.set({ [this.STORAGE_KEYS.SITE_STATS]: siteStats });
    } catch (err) {
      console.error('Failed to update site stats:', err);
    }
  }

  async getSiteStats() {
    try {
      const data = await chrome.storage.local.get(this.STORAGE_KEYS.SITE_STATS);
      return data[this.STORAGE_KEYS.SITE_STATS] || {};
    } catch {
      return {};
    }
  }

  async cleanupOldData() {
    try {
      const data = await chrome.storage.local.get(this.STORAGE_KEYS.LAST_CLEANUP);
      const lastCleanup = data[this.STORAGE_KEYS.LAST_CLEANUP] || 0;
      const now = Date.now();

      if (now - lastCleanup > 86400000) {
        const stats = await this.getStats();
        if (stats.today) {
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - 7);
          const cutoffStr = cutoff.toISOString().split('T')[0];

          for (const date of Object.keys(stats.today)) {
            if (date < cutoffStr) {
              delete stats.today[date];
            }
          }
          await this.setStats(stats);
        }

        const siteStats = await this.getSiteStats();
        const siteHostnames = Object.keys(siteStats);
        const oldThreshold = now - 604800000;

        for (const hostname of siteHostnames) {
          if ((siteStats[hostname].lastAccess || 0) < oldThreshold) {
            delete siteStats[hostname];
          }
        }
        await chrome.storage.local.set({ [this.STORAGE_KEYS.SITE_STATS]: siteStats });

        await chrome.storage.local.set({ [this.STORAGE_KEYS.LAST_CLEANUP]: now });
      }
    } catch (err) {
      console.error('Failed to cleanup old data:', err);
    }
  }

  async getPerformanceMetrics() {
    const stats = await this.getStats();
    const totalBlocked = stats.total || 0;
    const estimatedBytesSaved = totalBlocked * 15000;
    const estimatedTimeSaved = Math.round(totalBlocked * 0.1);

    return {
      requestsBlocked: totalBlocked,
      estimatedBytesSaved,
      estimatedTimeSaved,
      adsBlocked: stats.ads || 0,
      trackersBlocked: stats.trackers || 0,
      cryptominersBlocked: stats.cryptominers || 0,
      fingerprintersBlocked: stats.fingerprinters || 0,
      malwareBlocked: stats.malware || 0
    };
  }

  async exportData() {
    const settings = await this.getSettings();
    const stats = await this.getStats();
    const log = await this.getBlockedLog();
    const siteStats = await this.getSiteStats();

    return {
      settings,
      stats,
      log,
      siteStats,
      exportDate: new Date().toISOString()
    };
  }

  async importData(data) {
    if (data.settings) await this.setSettings(data.settings);
    if (data.stats) await this.setStats(data.stats);
    if (data.log) await chrome.storage.local.set({ [this.STORAGE_KEYS.BLOCKED_LOG]: data.log });
    if (data.siteStats) await chrome.storage.local.set({ [this.STORAGE_KEYS.SITE_STATS]: data.siteStats });
  }
}
