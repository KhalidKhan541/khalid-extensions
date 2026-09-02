/**
 * Dark Mode Plus - Background Service Worker
 * Manages settings, tab updates, context menus, and scheduling.
 */

const DEFAULT_SETTINGS = {
  globalTheme: 'dark',
  whitelist: [],
  perSite: {},
  schedule: {
    enabled: false,
    type: 'sunset',
    onTime: '18:00',
    offTime: '07:00',
    location: '',
    sunriseHour: 6,
    sunsetHour: 18
  },
  stats: {
    sitesDarkened: 0,
    startTime: Date.now(),
    hoursUsed: 0
  }
};

let cachedSettings = null;
let scheduleTimer = null;

// ---- Storage Helpers ----

async function getSettings() {
  if (cachedSettings) return cachedSettings;
  return new Promise((resolve) => {
    chrome.storage.local.get(null, (data) => {
      cachedSettings = { ...DEFAULT_SETTINGS, ...data };
      resolve(cachedSettings);
    });
  });
}

async function saveSettings(settings) {
  cachedSettings = settings;
  return new Promise((resolve) => {
    chrome.storage.local.set(settings, resolve);
  });
}

// ---- URL / Hostname Helpers ----

function extractHostname(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

// ---- Dark Mode Decision Logic ----

function shouldActivateDarkMode(hostname, settings) {
  const theme = settings.globalTheme || 'dark';

  // System theme: respect OS preference
  if (theme === 'system') {
    return true; // Let content script handle prefers-color-scheme
  }

  if (theme === 'light') return false;
  if (theme === 'dark') {
    // Check whitelist
    if (settings.whitelist && settings.whitelist.includes(hostname)) {
      return false;
    }
    // Check per-site override
    if (settings.perSite && settings.perSite[hostname]) {
      return settings.perSite[hostname].enabled !== false;
    }
    return true;
  }

  return false;
}

function getSiteOptions(hostname, settings) {
  const site = (settings.perSite && settings.perSite[hostname]) || {};
  return {
    brightness: site.brightness ?? 100,
    contrast: site.contrast ?? 100,
    dimImages: site.dimImages || false,
    fontSmoothing: site.fontSmoothing || false,
    transitionSpeed: site.transitionSpeed || '0.3',
    customCSS: site.customCSS || ''
  };
}

// ---- Badge Management ----

function updateBadge(tabId, active) {
  const color = active ? '#667eea' : '#666680';
  const text = active ? '' : '';

  chrome.action.setBadgeBackgroundColor({ color, tabId });
  chrome.action.setBadgeText({ text, tabId });
}

// ---- Tab Management ----

async function applyToTab(tab) {
  if (!tab || !tab.id || !tab.url) return;
  if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('about:')) {
    return;
  }

  const hostname = extractHostname(tab.url);
  const settings = await getSettings();
  const active = shouldActivateDarkMode(hostname, settings);
  const options = getSiteOptions(hostname, settings);

  updateBadge(tab.id, active);

  try {
    if (active) {
      await chrome.tabs.sendMessage(tab.id, {
        type: 'DMP_ACTIVATE',
        options
      });
    } else {
      await chrome.tabs.sendMessage(tab.id, {
        type: 'DMP_DEACTIVATE'
      });
    }
  } catch (e) {
    // Content script might not be loaded yet
  }
}

// ---- Event Listeners ----

// Tab URL updated
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' || changeInfo.url) {
    applyToTab(tab);
  }
});

// Tab activated (switched to)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId).catch(() => null);
  applyToTab(tab);
});

// Tab created
chrome.tabs.onCreated.addListener((tab) => {
  if (tab.url) {
    applyToTab(tab);
  }
});

// Extension installed or updated
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    await saveSettings(DEFAULT_SETTINGS);
  }
  initSchedule();
});

// Message handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'DMP_GET_STATE') {
    (async () => {
      const hostname = extractHostname(message.url || '');
      const settings = await getSettings();
      const active = shouldActivateDarkMode(hostname, settings);
      const options = getSiteOptions(hostname, settings);
      sendResponse({ shouldActivate: active, options });
    })();
    return true;
  }

  if (message.type === 'applyDarkMode') {
    cachedSettings = message.settings;
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.url && tab.url.includes(message.hostname)) {
          applyToTab(tab);
        }
      });
    });
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'updateGlobalTheme') {
    getSettings().then(settings => {
      settings.globalTheme = message.theme;
      saveSettings(settings);
      // Re-apply to all tabs
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => applyToTab(tab));
      });
    });
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'updateSchedule') {
    getSettings().then(settings => {
      settings.schedule = message.schedule;
      saveSettings(settings);
      initSchedule();
    });
    sendResponse({ success: true });
    return true;
  }
});

// ---- Context Menu ----

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab || !tab.url) return;
  const hostname = extractHostname(tab.url);
  const settings = await getSettings();

  if (info.menuItemId === 'dark-mode-plus-toggle') {
    if (!settings.perSite[hostname]) {
      settings.perSite[hostname] = { enabled: true };
    } else {
      settings.perSite[hostname].enabled = !settings.perSite[hostname].enabled;
    }
    await saveSettings(settings);
    applyToTab(tab);
  }

  if (info.menuItemId === 'dark-mode-plus-add-whitelist') {
    if (!settings.whitelist.includes(hostname)) {
      settings.whitelist.push(hostname);
      await saveSettings(settings);
      applyToTab(tab);
    }
  }

  if (info.menuItemId === 'dark-mode-plus-remove-whitelist') {
    settings.whitelist = settings.whitelist.filter(h => h !== hostname);
    await saveSettings(settings);
    applyToTab(tab);
  }
});

// ---- Scheduling ----

function initSchedule() {
  if (scheduleTimer) clearInterval(scheduleTimer);

  getSettings().then(settings => {
    if (!settings.schedule.enabled) return;

    scheduleTimer = setInterval(async () => {
      const now = new Date();
      const settings = await getSettings();
      const schedule = settings.schedule;

      let shouldBeDark = false;

      if (schedule.type === 'sunset') {
        const { sunrise, sunset } = getSunTimes(schedule.location);
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        shouldBeDark = currentMinutes >= sunset || currentMinutes < sunrise;
      } else if (schedule.type === 'custom') {
        const [onH, onM] = (schedule.onTime || '18:00').split(':').map(Number);
        const [offH, offM] = (schedule.offTime || '07:00').split(':').map(Number);
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const onMinutes = onH * 60 + onM;
        const offMinutes = offH * 60 + offM;

        if (onMinutes < offMinutes) {
          shouldBeDark = currentMinutes >= onMinutes && currentMinutes < offMinutes;
        } else {
          shouldBeDark = currentMinutes >= onMinutes || currentMinutes < offMinutes;
        }
      }

      const desiredTheme = shouldBeDark ? 'dark' : 'light';
      if (settings.globalTheme !== 'system') {
        settings.globalTheme = desiredTheme;
        await saveSettings(settings);
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach(tab => applyToTab(tab));
        });
      }
    }, 60000); // Check every minute
  });
}

function getSunTimes(location) {
  const defaultSunrise = 6 * 60; // 6:00 AM in minutes
  const defaultSunset = 18 * 60; // 6:00 PM in minutes

  if (!location) {
    return { sunrise: defaultSunrise, sunset: defaultSunset };
  }

  try {
    const parts = location.split(',').map(s => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      const lat = parts[0];
      const now = new Date();
      const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);

      // Simplified sunrise/sunset calculation
      const declination = 23.45 * Math.sin((2 * Math.PI / 365) * (dayOfYear - 81));
      const latRad = lat * Math.PI / 180;
      const decRad = declination * Math.PI / 180;

      const hourAngle = Math.acos(
        Math.min(1, Math.max(-1, -Math.tan(latRad) * Math.tan(decRad)))
      );

      const sunriseMinutes = Math.round(720 - 4 * (hourAngle * 180 / Math.PI));
      const sunsetMinutes = Math.round(720 + 4 * (hourAngle * 180 / Math.PI));

      return {
        sunrise: Math.max(0, Math.min(720, sunriseMinutes)),
        sunset: Math.max(720, Math.min(1440, sunsetMinutes))
      };
    }
  } catch (e) {}

  return { sunrise: defaultSunrise, sunset: defaultSunset };
}

// ---- Init ----

initSchedule();
