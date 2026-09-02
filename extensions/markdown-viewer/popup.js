const DEFAULTS = {
  theme: 'github',
  fontSize: 16,
  lineWidth: 800,
  zoom: 100,
  viewMode: 'rendered',
  toc: true,
  syntaxHighlight: true
};

let currentSettings = { ...DEFAULTS };

document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await checkMarkdownPage();
  setupEventListeners();
});

async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get('mdViewerSettings', (data) => {
      if (data.mdViewerSettings) {
        currentSettings = { ...DEFAULTS, ...data.mdViewerSettings };
      }
      applySettingsToUI();
      resolve();
    });
  });
}

function saveSettings() {
  chrome.storage.local.set({ mdViewerSettings: currentSettings });
}

function applySettingsToUI() {
  const { theme, fontSize, lineWidth, zoom, viewMode, toc, syntaxHighlight } = currentSettings;

  document.querySelectorAll('.theme-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });

  document.getElementById('font-size').value = fontSize;
  document.getElementById('font-size-value').textContent = fontSize;

  document.getElementById('line-width').value = lineWidth;
  document.getElementById('line-width-value').textContent = lineWidth;

  document.getElementById('zoom').value = zoom;
  document.getElementById('zoom-value').textContent = zoom;

  document.querySelectorAll('#view-mode .group-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === viewMode);
  });

  document.getElementById('toc-toggle').checked = toc;
  document.getElementById('syntax-toggle').checked = syntaxHighlight;
}

async function checkMarkdownPage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  const url = tab.url || '';
  const isMarkdown = isMarkdownUrl(url);
  const statusBar = document.getElementById('page-status');
  const statusText = statusBar.querySelector('.status-text');

  if (isMarkdown) {
    statusBar.classList.add('markdown');
    statusText.textContent = 'Markdown page detected';
  } else {
    statusBar.classList.remove('markdown');
    statusText.textContent = 'Not a markdown page';
  }
}

function isMarkdownUrl(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    /\.md($|\?|#)/.test(lower) ||
    /\.markdown($|\?|#)/.test(lower) ||
    /\.mdown($|\?|#)/.test(lower) ||
    /\.mkd($|\?|#)/.test(lower)
  );
}

function setupEventListeners() {
  document.querySelectorAll('.theme-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentSettings.theme = btn.dataset.theme;
      document.querySelectorAll('.theme-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      saveSettings();
      applyToContentScript();
    });
  });

  const fontSizeSlider = document.getElementById('font-size');
  fontSizeSlider.addEventListener('input', (e) => {
    currentSettings.fontSize = parseInt(e.target.value);
    document.getElementById('font-size-value').textContent = currentSettings.fontSize;
    saveSettings();
    applyToContentScript();
  });

  const lineWidthSlider = document.getElementById('line-width');
  lineWidthSlider.addEventListener('input', (e) => {
    currentSettings.lineWidth = parseInt(e.target.value);
    document.getElementById('line-width-value').textContent = currentSettings.lineWidth;
    saveSettings();
    applyToContentScript();
  });

  const zoomSlider = document.getElementById('zoom');
  zoomSlider.addEventListener('input', (e) => {
    currentSettings.zoom = parseInt(e.target.value);
    document.getElementById('zoom-value').textContent = currentSettings.zoom;
    saveSettings();
    applyToContentScript();
  });

  document.querySelectorAll('#view-mode .group-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentSettings.viewMode = btn.dataset.mode;
      document.querySelectorAll('#view-mode .group-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      saveSettings();
      applyToContentScript();
    });
  });

  document.getElementById('toc-toggle').addEventListener('change', (e) => {
    currentSettings.toc = e.target.checked;
    saveSettings();
    applyToContentScript();
  });

  document.getElementById('syntax-toggle').addEventListener('change', (e) => {
    currentSettings.syntaxHighlight = e.target.checked;
    saveSettings();
    applyToContentScript();
  });

  document.getElementById('btn-copy-raw').addEventListener('click', async () => {
    await sendAction('copyRaw');
    showToast('Copied to clipboard');
  });

  document.getElementById('btn-download-html').addEventListener('click', async () => {
    await sendAction('downloadHtml');
    showToast('Downloaded');
  });

  document.getElementById('btn-print').addEventListener('click', async () => {
    await sendAction('print');
  });
}

function applyToContentScript() {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!tab) return;
    chrome.tabs.sendMessage(tab.id, {
      type: 'updateSettings',
      settings: currentSettings
    }).catch(() => {});
  });
}

async function sendAction(action) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  chrome.tabs.sendMessage(tab.id, { type: action }).catch(() => {});
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 1500);
}
