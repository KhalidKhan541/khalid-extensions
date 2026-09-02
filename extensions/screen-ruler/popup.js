document.addEventListener('DOMContentLoaded', () => {
  const toggleRulerBtn = document.getElementById('toggleRuler');
  const modeBtns = document.querySelectorAll('.mode-btn');
  const unitBtns = document.querySelectorAll('.unit-btn');
  const rulerColorInput = document.getElementById('rulerColor');
  const rulerColorHex = document.getElementById('rulerColorHex');
  const gridSettings = document.getElementById('gridSettings');
  const gridSize = document.getElementById('gridSize');
  const gridSizeVal = document.getElementById('gridSizeVal');
  const gridColor = document.getElementById('gridColor');
  const gridOpacity = document.getElementById('gridOpacity');
  const gridOpacityVal = document.getElementById('gridOpacityVal');
  const screenshotBtn = document.getElementById('screenshotBtn');
  const clearMeasurementsBtn = document.getElementById('clearMeasurements');
  const settingsBtn = document.getElementById('settingsBtn');
  const backBtn = document.getElementById('backBtn');
  const backBtn2 = document.getElementById('backBtn2');
  const mainPanel = document.getElementById('mainPanel');
  const settingsPanel = document.getElementById('settingsPanel');
  const historyPanel = document.getElementById('historyPanel');
  const baseFontSize = document.getElementById('baseFontSize');
  const decimalPlaces = document.getElementById('decimalPlaces');
  const rulerThickness = document.getElementById('rulerThickness');
  const rulerThicknessVal = document.getElementById('rulerThicknessVal');
  const snapEnabled = document.getElementById('snapEnabled');
  const showCoordinates = document.getElementById('showCoordinates');
  const historyList = document.getElementById('historyList');

  let currentMode = 'point-to-point';
  let currentUnit = 'px';

  const defaultSettings = {
    rulerEnabled: true,
    mode: 'point-to-point',
    unit: 'px',
    rulerColor: '#FF4081',
    gridSize: 50,
    gridColor: '#2196F3',
    gridOpacity: 30,
    baseFontSize: 16,
    decimalPlaces: 2,
    rulerThickness: 30,
    snapEnabled: true,
    showCoordinates: true,
    history: []
  };

  let settings = { ...defaultSettings };

  async function loadSettings() {
    try {
      const result = await chrome.storage.local.get('screenRulerSettings');
      if (result.screenRulerSettings) {
        settings = { ...defaultSettings, ...result.screenRulerSettings };
      }
      applySettings();
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  }

  async function saveSettings() {
    try {
      await chrome.storage.local.set({ screenRulerSettings: settings });
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }

  function applySettings() {
    toggleRulerBtn.classList.toggle('active', settings.rulerEnabled);
    toggleRulerBtn.querySelector('span').textContent = `Ruler: ${settings.rulerEnabled ? 'ON' : 'OFF'}`;

    currentMode = settings.mode;
    modeBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === currentMode);
    });

    currentUnit = settings.unit;
    unitBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.unit === currentUnit);
    });

    rulerColorInput.value = settings.rulerColor;
    rulerColorHex.textContent = settings.rulerColor;

    gridSize.value = settings.gridSize;
    gridSizeVal.textContent = `${settings.gridSize}px`;
    gridColor.value = settings.gridColor;
    gridOpacity.value = settings.gridOpacity;
    gridOpacityVal.textContent = `${settings.gridOpacity}%`;

    baseFontSize.value = settings.baseFontSize;
    decimalPlaces.value = settings.decimalPlaces;
    rulerThickness.value = settings.rulerThickness;
    rulerThicknessVal.textContent = `${settings.rulerThickness}px`;
    snapEnabled.checked = settings.snapEnabled;
    showCoordinates.checked = settings.showCoordinates;

    gridSettings.style.display = currentMode === 'grid' ? 'block' : 'none';

    renderHistory();
  }

  async function sendToContent(action, data = {}) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        await chrome.tabs.sendMessage(tab.id, { action, ...data });
      }
    } catch (e) {
      console.error('Failed to send message:', e);
    }
  }

  function renderHistory() {
    if (settings.history.length === 0) {
      historyList.innerHTML = '<p class="empty-history">No measurements yet</p>';
      return;
    }

    historyList.innerHTML = settings.history.map((item, index) => `
      <div class="history-item">
        <span class="measurement">${item.value}</span>
        <span class="timestamp">${item.time}</span>
      </div>
    `).join('');
  }

  toggleRulerBtn.addEventListener('click', async () => {
    settings.rulerEnabled = !settings.rulerEnabled;
    toggleRulerBtn.classList.toggle('active', settings.rulerEnabled);
    toggleRulerBtn.querySelector('span').textContent = `Ruler: ${settings.rulerEnabled ? 'ON' : 'OFF'}`;
    await saveSettings();
    await sendToContent('toggleRuler', { enabled: settings.rulerEnabled });
  });

  modeBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      modeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentMode = btn.dataset.mode;
      settings.mode = currentMode;
      gridSettings.style.display = currentMode === 'grid' ? 'block' : 'none';
      await saveSettings();
      await sendToContent('setMode', { mode: currentMode });
    });
  });

  unitBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      unitBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentUnit = btn.dataset.unit;
      settings.unit = currentUnit;
      await saveSettings();
      await sendToContent('setUnit', { unit: currentUnit });
    });
  });

  rulerColorInput.addEventListener('input', async (e) => {
    settings.rulerColor = e.target.value;
    rulerColorHex.textContent = e.target.value;
    await saveSettings();
    await sendToContent('setColor', { color: settings.rulerColor });
  });

  gridSize.addEventListener('input', async (e) => {
    settings.gridSize = parseInt(e.target.value);
    gridSizeVal.textContent = `${settings.gridSize}px`;
    await saveSettings();
    await sendToContent('setGridSettings', {
      size: settings.gridSize,
      color: settings.gridColor,
      opacity: settings.gridOpacity
    });
  });

  gridColor.addEventListener('input', async (e) => {
    settings.gridColor = e.target.value;
    await saveSettings();
    await sendToContent('setGridSettings', {
      size: settings.gridSize,
      color: settings.gridColor,
      opacity: settings.gridOpacity
    });
  });

  gridOpacity.addEventListener('input', async (e) => {
    settings.gridOpacity = parseInt(e.target.value);
    gridOpacityVal.textContent = `${settings.gridOpacity}%`;
    await saveSettings();
    await sendToContent('setGridSettings', {
      size: settings.gridSize,
      color: settings.gridColor,
      opacity: settings.gridOpacity
    });
  });

  screenshotBtn.addEventListener('click', async () => {
    await sendToContent('takeScreenshot');
  });

  clearMeasurementsBtn.addEventListener('click', async () => {
    settings.history = [];
    await saveSettings();
    renderHistory();
    await sendToContent('clearMeasurements');
  });

  settingsBtn.addEventListener('click', () => {
    mainPanel.classList.remove('active');
    settingsPanel.classList.add('active');
  });

  backBtn.addEventListener('click', () => {
    settingsPanel.classList.remove('active');
    mainPanel.classList.add('active');
  });

  backBtn2.addEventListener('click', () => {
    historyPanel.classList.remove('active');
    mainPanel.classList.add('active');
  });

  baseFontSize.addEventListener('change', async () => {
    settings.baseFontSize = parseInt(baseFontSize.value) || 16;
    await saveSettings();
    await sendToContent('updateSettings', { baseFontSize: settings.baseFontSize });
  });

  decimalPlaces.addEventListener('change', async () => {
    settings.decimalPlaces = parseInt(decimalPlaces.value);
    await saveSettings();
    await sendToContent('updateSettings', { decimalPlaces: settings.decimalPlaces });
  });

  rulerThickness.addEventListener('input', async (e) => {
    settings.rulerThickness = parseInt(e.target.value);
    rulerThicknessVal.textContent = `${settings.rulerThickness}px`;
    await saveSettings();
    await sendToContent('updateSettings', { rulerThickness: settings.rulerThickness });
  });

  snapEnabled.addEventListener('change', async () => {
    settings.snapEnabled = snapEnabled.checked;
    await saveSettings();
    await sendToContent('updateSettings', { snapEnabled: settings.snapEnabled });
  });

  showCoordinates.addEventListener('change', async () => {
    settings.showCoordinates = showCoordinates.checked;
    await saveSettings();
    await sendToContent('updateSettings', { showCoordinates: settings.showCoordinates });
  });

  loadSettings();
});
