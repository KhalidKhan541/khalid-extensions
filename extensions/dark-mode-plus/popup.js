document.addEventListener('DOMContentLoaded', async () => {
  function sendMsg(msg) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(msg, resolve);
    });
  }

  function storeGet(keys) {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, resolve);
    });
  }

  function storeSet(data) {
    return new Promise((resolve) => {
      chrome.storage.local.set(data, resolve);
    });
  }

  async function getTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }

  function extractHostname(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  }

  // DOM elements
  const globalToggleBtns = document.querySelectorAll('.toggle-btn');
  const perSiteToggle = document.getElementById('perSiteToggle');
  const whitelistToggle = document.getElementById('whitelistToggle');
  const brightnessSlider = document.getElementById('brightnessSlider');
  const brightnessValue = document.getElementById('brightnessValue');
  const contrastSlider = document.getElementById('contrastSlider');
  const contrastValue = document.getElementById('contrastValue');
  const dimImagesToggle = document.getElementById('dimImagesToggle');
  const fontSmoothingToggle = document.getElementById('fontSmoothingToggle');
  const transitionSelect = document.getElementById('transitionSelect');
  const currentSiteEl = document.getElementById('currentSite');
  const scheduleToggle = document.getElementById('scheduleToggle');
  const scheduleTypeRadios = document.querySelectorAll('input[name="scheduleType"]');
  const customTimes = document.getElementById('customTimes');
  const scheduleOnTime = document.getElementById('scheduleOnTime');
  const scheduleOffTime = document.getElementById('scheduleOffTime');
  const locationInput = document.getElementById('locationInput');
  const detectLocationBtn = document.getElementById('detectLocationBtn');
  const customCSSEditor = document.getElementById('customCSSEditor');
  const applyCustomCSS = document.getElementById('applyCustomCSS');
  const resetCustomCSS = document.getElementById('resetCustomCSS');
  const settingsBtn = document.getElementById('settingsBtn');
  const backBtn = document.getElementById('backBtn');
  const mainView = document.getElementById('mainView');
  const settingsView = document.getElementById('settingsView');
  const whitelistContainer = document.getElementById('whitelistContainer');
  const perSiteContainer = document.getElementById('perSiteContainer');
  const sitesDarkenedEl = document.getElementById('sitesDarkened');
  const hoursUsedEl = document.getElementById('hoursUsed');
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const importFile = document.getElementById('importFile');
  const resetAllBtn = document.getElementById('resetAllBtn');

  const scheduleHeader = document.getElementById('scheduleHeader');
  const scheduleBody = document.getElementById('scheduleBody');
  const customCSSHeader = document.getElementById('customCSSHeader');
  const customCSSBody = document.getElementById('customCSSBody');

  let currentHostname = '';
  let settings = {};

  // Load settings
  async function loadSettings() {
    const tab = await getTab();
    if (!tab) return;

    currentHostname = extractHostname(tab.url);
    currentSiteEl.textContent = currentHostname;

    const data = await storeGet(null);
    settings = {
      globalTheme: data.globalTheme || 'dark',
      whitelist: data.whitelist || [],
      perSite: data.perSite || {},
      schedule: data.schedule || { enabled: false, type: 'sunset', onTime: '18:00', offTime: '07:00', location: '' },
      stats: data.stats || { sitesDarkened: 0, startTime: Date.now() }
    };

    // Global theme buttons
    globalToggleBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === settings.globalTheme);
    });

    // Per-site settings
    const siteSettings = settings.perSite[currentHostname] || {};
    perSiteToggle.checked = siteSettings.enabled !== false;
    whitelistToggle.checked = settings.whitelist.includes(currentHostname);
    brightnessSlider.value = siteSettings.brightness ?? 100;
    brightnessValue.textContent = `${brightnessSlider.value}%`;
    contrastSlider.value = siteSettings.contrast ?? 100;
    contrastValue.textContent = `${contrastSlider.value}%`;
    dimImagesToggle.checked = siteSettings.dimImages || false;
    fontSmoothingToggle.checked = siteSettings.fontSmoothing || false;
    transitionSelect.value = siteSettings.transitionSpeed ?? '0.3';
    customCSSEditor.value = siteSettings.customCSS || '';

    // Schedule
    scheduleToggle.checked = settings.schedule.enabled || false;
    const stype = settings.schedule.type || 'sunset';
    scheduleTypeRadios.forEach(r => {
      r.checked = r.value === stype;
    });
    customTimes.classList.toggle('collapsed', stype !== 'custom');
    scheduleOnTime.value = settings.schedule.onTime || '18:00';
    scheduleOffTime.value = settings.schedule.offTime || '07:00';
    locationInput.value = settings.schedule.location || '';

    // Stats
    const siteCount = Object.keys(settings.perSite).length + (settings.whitelist.length > 0 ? 1 : 0);
    sitesDarkenedEl.textContent = settings.stats.sitesDarkened || 0;
    const hours = Math.round((Date.now() - (settings.stats.startTime || Date.now())) / 3600000);
    hoursUsedEl.textContent = Math.max(hours, settings.stats.hoursUsed || 0);
  }

  // Save and apply
  async function saveAndApply(updates) {
    Object.assign(settings, updates);
    await storeSet(settings);
    await sendMsg({ type: 'applyDarkMode', hostname: currentHostname, settings });
  }

  // Global theme toggle
  globalToggleBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      globalToggleBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      settings.globalTheme = btn.dataset.theme;
      await storeSet({ globalTheme: settings.globalTheme });
      await sendMsg({ type: 'updateGlobalTheme', theme: settings.globalTheme });
    });
  });

  // Per-site toggle
  perSiteToggle.addEventListener('change', async () => {
    if (!settings.perSite[currentHostname]) {
      settings.perSite[currentHostname] = {};
    }
    settings.perSite[currentHostname].enabled = perSiteToggle.checked;
    await storeSet({ perSite: settings.perSite });
    await sendMsg({ type: 'applyDarkMode', hostname: currentHostname, settings });
  });

  // Whitelist toggle
  whitelistToggle.addEventListener('change', async () => {
    if (whitelistToggle.checked) {
      if (!settings.whitelist.includes(currentHostname)) {
        settings.whitelist.push(currentHostname);
      }
    } else {
      settings.whitelist = settings.whitelist.filter(h => h !== currentHostname);
    }
    await storeSet({ whitelist: settings.whitelist });
    await sendMsg({ type: 'applyDarkMode', hostname: currentHostname, settings });
  });

  // Brightness
  brightnessSlider.addEventListener('input', () => {
    brightnessValue.textContent = `${brightnessSlider.value}%`;
  });

  brightnessSlider.addEventListener('change', async () => {
    if (!settings.perSite[currentHostname]) settings.perSite[currentHostname] = {};
    settings.perSite[currentHostname].brightness = parseInt(brightnessSlider.value);
    await storeSet({ perSite: settings.perSite });
    await sendMsg({ type: 'applyDarkMode', hostname: currentHostname, settings });
  });

  // Contrast
  contrastSlider.addEventListener('input', () => {
    contrastValue.textContent = `${contrastSlider.value}%`;
  });

  contrastSlider.addEventListener('change', async () => {
    if (!settings.perSite[currentHostname]) settings.perSite[currentHostname] = {};
    settings.perSite[currentHostname].contrast = parseInt(contrastSlider.value);
    await storeSet({ perSite: settings.perSite });
    await sendMsg({ type: 'applyDarkMode', hostname: currentHostname, settings });
  });

  // Dim images
  dimImagesToggle.addEventListener('change', async () => {
    if (!settings.perSite[currentHostname]) settings.perSite[currentHostname] = {};
    settings.perSite[currentHostname].dimImages = dimImagesToggle.checked;
    await storeSet({ perSite: settings.perSite });
    await sendMsg({ type: 'applyDarkMode', hostname: currentHostname, settings });
  });

  // Font smoothing
  fontSmoothingToggle.addEventListener('change', async () => {
    if (!settings.perSite[currentHostname]) settings.perSite[currentHostname] = {};
    settings.perSite[currentHostname].fontSmoothing = fontSmoothingToggle.checked;
    await storeSet({ perSite: settings.perSite });
    await sendMsg({ type: 'applyDarkMode', hostname: currentHostname, settings });
  });

  // Transition speed
  transitionSelect.addEventListener('change', async () => {
    if (!settings.perSite[currentHostname]) settings.perSite[currentHostname] = {};
    settings.perSite[currentHostname].transitionSpeed = transitionSelect.value;
    await storeSet({ perSite: settings.perSite });
    await sendMsg({ type: 'applyDarkMode', hostname: currentHostname, settings });
  });

  // Schedule toggle
  scheduleToggle.addEventListener('change', async () => {
    settings.schedule.enabled = scheduleToggle.checked;
    await storeSet({ schedule: settings.schedule });
    await sendMsg({ type: 'updateSchedule', schedule: settings.schedule });
  });

  // Schedule type
  scheduleTypeRadios.forEach(radio => {
    radio.addEventListener('change', async () => {
      customTimes.classList.toggle('collapsed', radio.value !== 'custom');
      settings.schedule.type = radio.value;
      await storeSet({ schedule: settings.schedule });
      await sendMsg({ type: 'updateSchedule', schedule: settings.schedule });
    });
  });

  // Custom times
  scheduleOnTime.addEventListener('change', async () => {
    settings.schedule.onTime = scheduleOnTime.value;
    await storeSet({ schedule: settings.schedule });
    await sendMsg({ type: 'updateSchedule', schedule: settings.schedule });
  });

  scheduleOffTime.addEventListener('change', async () => {
    settings.schedule.offTime = scheduleOffTime.value;
    await storeSet({ schedule: settings.schedule });
    await sendMsg({ type: 'updateSchedule', schedule: settings.schedule });
  });

  // Location
  locationInput.addEventListener('change', async () => {
    settings.schedule.location = locationInput.value;
    await storeSet({ schedule: settings.schedule });
    await sendMsg({ type: 'updateSchedule', schedule: settings.schedule });
  });

  detectLocationBtn.addEventListener('click', () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          locationInput.value = `${pos.coords.latitude.toFixed(4)},${pos.coords.longitude.toFixed(4)}`;
          settings.schedule.location = locationInput.value;
          await storeSet({ schedule: settings.schedule });
          await sendMsg({ type: 'updateSchedule', schedule: settings.schedule });
        },
        () => {
          locationInput.value = '40.7128,-74.0060';
        }
      );
    }
  });

  // Custom CSS
  applyCustomCSS.addEventListener('click', async () => {
    if (!settings.perSite[currentHostname]) settings.perSite[currentHostname] = {};
    settings.perSite[currentHostname].customCSS = customCSSEditor.value;
    await storeSet({ perSite: settings.perSite });
    await sendMsg({ type: 'applyDarkMode', hostname: currentHostname, settings });
  });

  resetCustomCSS.addEventListener('click', async () => {
    customCSSEditor.value = '';
    if (settings.perSite[currentHostname]) {
      settings.perSite[currentHostname].customCSS = '';
      await storeSet({ perSite: settings.perSite });
      await sendMsg({ type: 'applyDarkMode', hostname: currentHostname, settings });
    }
  });

  // Collapsible sections
  scheduleHeader.addEventListener('click', () => {
    const isExpanded = scheduleHeader.classList.toggle('expanded');
    scheduleBody.classList.toggle('collapsed', !isExpanded);
  });

  customCSSHeader.addEventListener('click', () => {
    const isExpanded = customCSSHeader.classList.toggle('expanded');
    customCSSBody.classList.toggle('collapsed', !isExpanded);
  });

  // Settings view
  settingsBtn.addEventListener('click', () => {
    mainView.classList.remove('active');
    settingsView.classList.add('active');
    renderWhitelist();
    renderPerSite();
  });

  backBtn.addEventListener('click', () => {
    settingsView.classList.remove('active');
    mainView.classList.add('active');
  });

  function renderWhitelist() {
    if (settings.whitelist.length === 0) {
      whitelistContainer.innerHTML = '<p class="empty-state">No whitelisted sites yet</p>';
      return;
    }
    whitelistContainer.innerHTML = settings.whitelist.map(site => `
      <div class="list-item">
        <span>${site}</span>
        <button class="remove-btn" data-site="${site}">&times;</button>
      </div>
    `).join('');

    whitelistContainer.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const site = btn.dataset.site;
        settings.whitelist = settings.whitelist.filter(h => h !== site);
        await storeSet({ whitelist: settings.whitelist });
        renderWhitelist();
      });
    });
  }

  function renderPerSite() {
    const entries = Object.entries(settings.perSite);
    if (entries.length === 0) {
      perSiteContainer.innerHTML = '<p class="empty-state">No custom per-site settings</p>';
      return;
    }
    perSiteContainer.innerHTML = entries.map(([site, s]) => `
      <div class="list-item">
        <span>${site} <span style="color:var(--text-dim)">${s.enabled === false ? '(disabled)' : '(enabled)'}</span></span>
        <button class="remove-btn" data-site="${site}">&times;</button>
      </div>
    `).join('');

    perSiteContainer.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const site = btn.dataset.site;
        delete settings.perSite[site];
        await storeSet({ perSite: settings.perSite });
        renderPerSite();
      });
    });
  }

  // Export
  exportBtn.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dark-mode-plus-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  // Import
  importBtn.addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    try {
      const imported = JSON.parse(text);
      settings = { ...settings, ...imported };
      await storeSet(settings);
      await sendMsg({ type: 'updateGlobalTheme', theme: settings.globalTheme });
      await loadSettings();
    } catch (err) {
      console.error('Import failed:', err);
    }
  });

  // Reset all
  resetAllBtn.addEventListener('click', async () => {
    if (!confirm('Reset all Dark Mode Plus settings?')) return;
    await storeSet({
      globalTheme: 'dark',
      whitelist: [],
      perSite: {},
      schedule: { enabled: false, type: 'sunset', onTime: '18:00', offTime: '07:00', location: '' },
      stats: { sitesDarkened: 0, startTime: Date.now() }
    });
    await sendMsg({ type: 'updateGlobalTheme', theme: 'dark' });
    await loadSettings();
  });

  await loadSettings();
});
