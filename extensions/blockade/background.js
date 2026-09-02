import { Blocker } from './blocker.js';
import { FilterLists } from './filter-lists.js';
import { Storage } from './storage.js';

const blocker = new Blocker();
const filterLists = new FilterLists();
const storage = new Storage();

let globalEnabled = true;
let siteEnabled = {};
let categoryEnabled = {
  ads: true,
  trackers: true,
  cryptominers: true,
  fingerprinters: true,
  malware: true
};
let allowlist = [];
let customBlockList = [];
let blockedLog = [];

chrome.runtime.onInstalled.addListener(async () => {
  await storage.initializeDefaults();
  await loadSettings();
  await blocker.initialize(filterLists);
  updateBadge();
});

chrome.runtime.onStartup.addListener(async () => {
  await loadSettings();
  await blocker.initialize(filterLists);
  updateBadge();
});

async function loadSettings() {
  const settings = await storage.getSettings();
  globalEnabled = settings.globalEnabled ?? true;
  siteEnabled = settings.siteEnabled ?? {};
  categoryEnabled = settings.categoryEnabled ?? {
    ads: true, trackers: true, cryptominers: true, fingerprinters: true, malware: true
  };
  allowlist = settings.allowlist ?? [];
  customBlockList = settings.customBlockList ?? [];
}

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (!globalEnabled) return {};

    const url = new URL(details.url);
    const hostname = url.hostname;

    if (isOnAllowlist(hostname)) return {};

    const tabEnabled = siteEnabled[details.tabId];
    if (tabEnabled === false) return {};

    const result = blocker.checkUrl(details.url, details.type, details.tabId);

    if (result.blocked) {
      const blockedEntry = {
        url: details.url,
        type: result.category,
        timestamp: Date.now(),
        tabId: details.tabId
      };
      blockedLog.push(blockedEntry);
      if (blockedLog.length > 50) blockedLog.shift();

      incrementStat(result.category);
      updateBadge();
      storage.logBlockedRequest(blockedEntry);

      return { cancel: true };
    }

    return {};
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);

chrome.tabs.onRemoved.addListener((tabId) => {
  delete siteEnabled[tabId];
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && tab.url) {
    const hostname = new URL(tab.url).hostname;
    const enabled = !allowlist.includes(hostname);
    setTabBlockingState(tabId, enabled);
  }
});

function isOnAllowlist(hostname) {
  return allowlist.some(domain => {
    if (domain.startsWith('.')) {
      return hostname === domain.slice(1) || hostname.endsWith(domain);
    }
    return hostname === domain || hostname.endsWith('.' + domain);
  });
}

function incrementStat(category) {
  const key = `stats_${category}`;
  chrome.storage.local.get(key, (data) => {
    const count = (data[key] || 0) + 1;
    chrome.storage.local.set({ [key]: count });

    chrome.storage.local.get('stats_total', (d) => {
      chrome.storage.local.set({ stats_total: (d.stats_total || 0) + 1 });
    });

    const today = new Date().toISOString().split('T')[0];
    const todayKey = `stats_today_${today}`;
    chrome.storage.local.get(todayKey, (d) => {
      chrome.storage.local.set({ [todayKey]: (d[todayKey] || 0) + 1 });
    });
  });
}

function updateBadge() {
  chrome.storage.local.get('stats_total', (data) => {
    const count = data.stats_total || 0;
    const text = count > 999 ? `${Math.floor(count / 1000)}k` : count.toString();
    chrome.action.setBadgeText({ text: globalEnabled ? text : '' });
    chrome.action.setBadgeBackgroundColor({ color: globalEnabled ? '#4CAF50' : '#9E9E9E' });
  });
}

function setTabBlockingState(tabId, enabled) {
  siteEnabled[tabId] = enabled;
  storage.setSettings({ siteEnabled });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      switch (request.action) {
        case 'getPopupData':
          const stats = await storage.getStats();
          sendResponse({
            globalEnabled,
            categoryEnabled,
            allowlist,
            customBlockList,
            stats,
            filterCount: filterLists.getFilterCount(),
            blockedLog: blockedLog.slice(-50)
          });
          break;

        case 'toggleGlobal':
          globalEnabled = request.enabled;
          await storage.setSettings({ globalEnabled });
          updateBadge();
          sendResponse({ success: true });
          break;

        case 'toggleCategory':
          categoryEnabled[request.category] = request.enabled;
          await storage.setSettings({ categoryEnabled });
          await blocker.updateRules(filterLists, categoryEnabled);
          sendResponse({ success: true });
          break;

        case 'addToAllowlist':
          if (!allowlist.includes(request.domain)) {
            allowlist.push(request.domain);
            await storage.setSettings({ allowlist });
          }
          sendResponse({ success: true });
          break;

        case 'removeFromAllowlist':
          allowlist = allowlist.filter(d => d !== request.domain);
          await storage.setSettings({ allowlist });
          sendResponse({ success: true });
          break;

        case 'addToBlockList':
          if (!customBlockList.includes(request.domain)) {
            customBlockList.push(request.domain);
            await storage.setSettings({ customBlockList });
            await blocker.updateRules(filterLists, categoryEnabled);
          }
          sendResponse({ success: true });
          break;

        case 'removeFromBlockList':
          customBlockList = customBlockList.filter(d => d !== request.domain);
          await storage.setSettings({ customBlockList });
          await blocker.updateRules(filterLists, categoryEnabled);
          sendResponse({ success: true });
          break;

        case 'toggleEasyList':
          await filterLists.toggleEasyList(request.enabled);
          await blocker.updateRules(filterLists, categoryEnabled);
          sendResponse({ success: true, filterCount: filterLists.getFilterCount() });
          break;

        case 'getStats':
          const currentStats = await storage.getStats();
          sendResponse(currentStats);
          break;

        case 'clearStats':
          await storage.clearStats();
          blockedLog = [];
          updateBadge();
          sendResponse({ success: true });
          break;

        case 'getSiteState':
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab) {
            const hostname = new URL(tab.url).hostname;
            const onAllowlist = allowlist.includes(hostname);
            sendResponse({ enabled: !onAllowlist, hostname });
          } else {
            sendResponse({ enabled: true, hostname: '' });
          }
          break;

        case 'toggleSite':
          const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (activeTab) {
            const hostname = new URL(activeTab.url).hostname;
            if (request.enabled) {
              allowlist = allowlist.filter(d => d !== hostname);
            } else {
              if (!allowlist.includes(hostname)) allowlist.push(hostname);
            }
            await storage.setSettings({ allowlist });
            sendResponse({ success: true, enabled: request.enabled });
          } else {
            sendResponse({ success: false });
          }
          break;

        default:
          sendResponse({ error: 'Unknown action' });
      }
    } catch (err) {
      sendResponse({ error: err.message });
    }
  })();
  return true;
});

setInterval(() => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const oldKey = `stats_today_${yesterday.toISOString().split('T')[0]}`;
  chrome.storage.local.remove(oldKey);
}, 86400000);
