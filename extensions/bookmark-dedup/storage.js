/* storage.js — Data management and persistence */

const StorageManager = (() => {
  const KEYS = {
    SETTINGS: 'bd_settings',
    LAST_SCAN: 'bd_last_scan',
    BACKUP: 'bd_backup',
    CLEANUP_HISTORY: 'bd_cleanup_history',
    STATS_HISTORY: 'bd_stats_history',
    LAST_BACKGROUND_SCAN: 'bd_last_bg_scan'
  };

  const DEFAULT_SETTINGS = {
    autoScan: true,
    checkBroken: true,
    includeFragments: false,
    normalizeWww: true,
    normalizeProtocol: true,
    scanInterval: 60 // minutes
  };

  // Settings
  async function getSettings() {
    const data = await chrome.storage.local.get(KEYS.SETTINGS);
    return { ...DEFAULT_SETTINGS, ...(data[KEYS.SETTINGS] || {}) };
  }

  async function saveSettings(settings) {
    await chrome.storage.local.set({ [KEYS.SETTINGS]: settings });
  }

  // Last scan results
  async function saveScanResults(report) {
    // Don't store the full bookmark list in results to save space
    const compact = {
      ...report,
      bookmarks: undefined,
      scannedAt: report.scannedAt || Date.now()
    };
    await chrome.storage.local.set({ [KEYS.LAST_SCAN]: compact });
  }

  async function getScanResults() {
    const data = await chrome.storage.local.get(KEYS.LAST_SCAN);
    return data[KEYS.LAST_SCAN] || null;
  }

  // Backup
  async function saveBackup(backup) {
    await chrome.storage.local.set({ [KEYS.BACKUP]: backup });
  }

  async function getBackup() {
    const data = await chrome.storage.local.get(KEYS.BACKUP);
    return data[KEYS.BACKUP] || null;
  }

  async function hasBackup() {
    const data = await chrome.storage.local.get(KEYS.BACKUP);
    return !!data[KEYS.BACKUP];
  }

  async function clearBackup() {
    await chrome.storage.local.remove(KEYS.BACKUP);
  }

  // Cleanup history
  async function addCleanupEntry(entry) {
    const history = await getCleanupHistory();
    history.unshift({
      ...entry,
      timestamp: Date.now()
    });
    // Keep last 50 entries
    if (history.length > 50) history.length = 50;
    await chrome.storage.local.set({ [KEYS.CLEANUP_HISTORY]: history });
  }

  async function getCleanupHistory() {
    const data = await chrome.storage.local.get(KEYS.CLEANUP_HISTORY);
    return data[KEYS.CLEANUP_HISTORY] || [];
  }

  // Stats history — track scan stats over time
  async function recordStats(stats) {
    const history = await getStatsHistory();
    history.push({
      ...stats,
      timestamp: Date.now()
    });
    // Keep last 100 entries
    if (history.length > 100) history.length = 100;
    await chrome.storage.local.set({ [KEYS.STATS_HISTORY]: history });
  }

  async function getStatsHistory() {
    const data = await chrome.storage.local.get(KEYS.STATS_HISTORY);
    return data[KEYS.STATS_HISTORY] || [];
  }

  // Background scan timestamp
  async function setLastBackgroundScan(ts) {
    await chrome.storage.local.set({ [KEYS.LAST_BACKGROUND_SCAN]: ts });
  }

  async function getLastBackgroundScan() {
    const data = await chrome.storage.local.get(KEYS.LAST_BACKGROUND_SCAN);
    return data[KEYS.LAST_BACKGROUND_SCAN] || 0;
  }

  // Export scan report as JSON string
  function exportReport(report) {
    const exportData = {
      exportedAt: new Date().toISOString(),
      stats: report.stats,
      duplicates: report.duplicates.map(g => ({
        url: g.originalUrl,
        normalizedUrl: g.url,
        count: g.count,
        bookmarks: g.items.map(b => ({
          title: b.title,
          url: b.url,
          folder: b.folder,
          dateAdded: b.dateAdded ? new Date(b.dateAdded).toISOString() : null
        }))
      })),
      broken: report.broken.map(b => ({
        title: b.title,
        url: b.url,
        folder: b.folder
      })),
      emptyFolders: report.emptyFolders.map(f => ({
        title: f.title,
        path: f.path
      })),
      similar: report.similar.map(s => ({
        domain: s.domain,
        reason: s.reason,
        items: s.items.map(b => ({
          title: b.title,
          url: b.url,
          folder: b.folder
        }))
      }))
    };
    return JSON.stringify(exportData, null, 2);
  }

  // Clear all stored data
  async function clearAll() {
    await chrome.storage.local.remove([
      KEYS.LAST_SCAN, KEYS.BACKUP, KEYS.CLEANUP_HISTORY,
      KEYS.STATS_HISTORY, KEYS.LAST_BACKGROUND_SCAN
    ]);
  }

  return {
    DEFAULT_SETTINGS,
    getSettings,
    saveSettings,
    saveScanResults,
    getScanResults,
    saveBackup,
    getBackup,
    hasBackup,
    clearBackup,
    addCleanupEntry,
    getCleanupHistory,
    recordStats,
    getStatsHistory,
    setLastBackgroundScan,
    getLastBackgroundScan,
    exportReport,
    clearAll
  };
})();
