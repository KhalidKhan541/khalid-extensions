document.addEventListener('DOMContentLoaded', async () => {
  const DOM = {
    pageTitle: document.getElementById('pageTitle'),
    pageUrl: document.getElementById('pageUrl'),
    saveBtn: document.getElementById('saveBtn'),
    progressBar: document.getElementById('progressBar'),
    progressFill: document.getElementById('progressFill'),
    progressText: document.getElementById('progressText'),
    saveMessage: document.getElementById('saveMessage'),
    archiveList: document.getElementById('archiveList'),
    archiveCount: document.getElementById('archiveCount'),
    archiveActions: document.getElementById('archiveActions'),
    searchInput: document.getElementById('searchInput'),
    clearSearch: document.getElementById('clearSearch'),
    settingsBtn: document.getElementById('settingsBtn'),
    settingsPanel: document.getElementById('settingsPanel'),
    closeSettings: document.getElementById('closeSettings'),
    storageUsed: document.getElementById('storageUsed'),
    storageUsedText: document.getElementById('storageUsedText'),
    storageTotalText: document.getElementById('storageTotalText'),
    totalArchives: document.getElementById('totalArchives'),
    avgSize: document.getElementById('avgSize'),
    oldestArchive: document.getElementById('oldestArchive'),
    exportAllBtn: document.getElementById('exportAllBtn'),
    clearAllBtn: document.getElementById('clearAllBtn'),
    cleanupBtn: document.getElementById('cleanupBtn'),
    importBtn: document.getElementById('importBtn'),
    exportDataBtn: document.getElementById('exportDataBtn'),
    importFile: document.getElementById('importFile'),
    readingOverlay: document.getElementById('readingOverlay'),
    readingTitle: document.getElementById('readingTitle'),
    readingContent: document.getElementById('readingContent'),
    closeReading: document.getElementById('closeReading'),
    fontDecrease: document.getElementById('fontDecrease'),
    fontIncrease: document.getElementById('fontIncrease'),
    saveOptions: document.querySelectorAll('.save-option'),
    tabs: document.querySelectorAll('.tab'),
    tabContents: document.querySelectorAll('.tab-content')
  };

  let currentTab = null;
  let currentSaveType = 'full';
  let readingFontSize = 16;

  async function init() {
    await loadCurrentTab();
    await loadArchives();
    await loadStorageStats();
    await loadSettings();
    setupEventListeners();
  }

  async function loadCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      currentTab = tab;
      if (tab) {
        DOM.pageTitle.textContent = tab.title || 'Untitled';
        DOM.pageUrl.textContent = tab.url || '';
      }
    } catch (e) {
      DOM.pageTitle.textContent = 'No page loaded';
    }
  }

  async function loadArchives(query = '') {
    const archives = query
      ? await StorageManager.searchArchives(query)
      : await StorageManager.getArchives();

    DOM.archiveCount.textContent = archives.length;
    DOM.archiveActions.classList.toggle('hidden', archives.length === 0);

    if (archives.length === 0) {
      DOM.archiveList.innerHTML = `
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <p>${query ? 'No matching archives' : 'No archives yet'}</p>
          <span>${query ? 'Try a different search' : 'Save your first page to get started'}</span>
        </div>`;
      return;
    }

    const typeIcons = {
      full: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
      screenshot: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`,
      text: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>`,
      reading: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`
    };

    const typeLabels = { full: 'Full', screenshot: 'Screenshot', text: 'Text', reading: 'Reading' };

    DOM.archiveList.innerHTML = archives.map(a => `
      <div class="archive-item" data-id="${a.id}">
        <div class="archive-icon ${a.type}">${typeIcons[a.type] || typeIcons.full}</div>
        <div class="archive-info">
          <div class="archive-title" title="${escapeAttr(a.title || 'Untitled')}">${escapeHtml(a.title || 'Untitled')}</div>
          <div class="archive-meta">
            <span>${typeLabels[a.type] || a.type}</span>
            <span>${StorageManager.formatBytes(a.size || 0)}</span>
            <span>${StorageManager.formatDate(new Date(a.savedAt))}</span>
          </div>
        </div>
        <div class="archive-actions-row">
          <button class="icon-btn-sm view-btn" data-id="${a.id}" title="View">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <button class="icon-btn-sm download-btn" data-id="${a.id}" title="Download">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
          <button class="icon-btn-sm delete-btn" data-id="${a.id}" title="Delete">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    `).join('');

    DOM.archiveList.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        viewArchive(btn.dataset.id);
      });
    });

    DOM.archiveList.querySelectorAll('.download-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        downloadArchive(btn.dataset.id);
      });
    });

    DOM.archiveList.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteArchive(btn.dataset.id);
      });
    });
  }

  async function loadStorageStats() {
    const stats = await StorageManager.getStats();
    const percent = stats.limit > 0 ? (stats.usage / stats.limit) * 100 : 0;
    DOM.storageUsed.style.width = percent + '%';
    DOM.storageUsed.className = 'storage-used' +
      (percent > 80 ? ' danger' : percent > 60 ? ' warning' : '');
    DOM.storageUsedText.textContent = stats.usageFormatted;
    DOM.storageTotalText.textContent = stats.limitFormatted;
    DOM.totalArchives.textContent = stats.total;
    DOM.avgSize.textContent = stats.avgSize;
    DOM.oldestArchive.textContent = stats.oldest;
  }

  async function loadSettings() {
    const settings = await StorageManager.getSettings();
    document.getElementById('autoSave').checked = settings.autoSave;
    document.getElementById('storageLimit').value = settings.storageLimitMB;
    document.getElementById('autoCleanup').value = settings.autoCleanupDays;
    document.getElementById('defaultSaveType').value = settings.defaultSaveType;

    const defaultOption = document.querySelector(`.save-option[data-type="${settings.defaultSaveType}"]`);
    if (defaultOption) {
      selectSaveType(settings.defaultSaveType);
    }
  }

  function setupEventListeners() {
    DOM.saveBtn.addEventListener('click', savePage);

    DOM.saveOptions.forEach(opt => {
      opt.addEventListener('click', () => selectSaveType(opt.dataset.type));
    });

    DOM.tabs.forEach(tab => {
      tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    DOM.searchInput.addEventListener('input', debounce(async () => {
      const query = DOM.searchInput.value;
      DOM.clearSearch.classList.toggle('hidden', !query);
      await loadArchives(query);
    }, 300));

    DOM.clearSearch.addEventListener('click', () => {
      DOM.searchInput.value = '';
      DOM.clearSearch.classList.add('hidden');
      loadArchives();
    });

    DOM.settingsBtn.addEventListener('click', () => {
      DOM.settingsPanel.classList.remove('hidden');
    });

    DOM.closeSettings.addEventListener('click', () => {
      DOM.settingsPanel.classList.add('hidden');
      saveSettings();
    });

    document.getElementById('autoSave').addEventListener('change', saveSettings);
    document.getElementById('storageLimit').addEventListener('change', saveSettings);
    document.getElementById('autoCleanup').addEventListener('change', saveSettings);
    document.getElementById('defaultSaveType').addEventListener('change', saveSettings);

    DOM.exportAllBtn.addEventListener('click', exportAllArchives);
    DOM.clearAllBtn.addEventListener('click', clearAllArchives);
    DOM.cleanupBtn.addEventListener('click', cleanupOldArchives);
    DOM.importBtn.addEventListener('click', () => DOM.importFile.click());
    DOM.exportDataBtn.addEventListener('click', exportData);
    DOM.importFile.addEventListener('change', importData);

    DOM.closeReading.addEventListener('click', closeReadingMode);
    DOM.fontDecrease.addEventListener('click', () => adjustReadingFont(-2));
    DOM.fontIncrease.addEventListener('click', () => adjustReadingFont(2));

    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === 'SAVE_PROGRESS') {
        updateProgress(msg.progress);
      }
    });
  }

  function selectSaveType(type) {
    currentSaveType = type;
    DOM.saveOptions.forEach(opt => {
      opt.classList.toggle('active', opt.dataset.type === type);
      opt.querySelector('input').checked = opt.dataset.type === type;
    });
  }

  function switchTab(tabName) {
    DOM.tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
    DOM.tabContents.forEach(tc => tc.classList.remove('active'));
    document.getElementById(tabName + 'Tab').classList.add('active');
  }

  async function savePage() {
    if (!currentTab) return;

    DOM.saveBtn.disabled = true;
    DOM.saveBtn.textContent = 'Saving...';
    DOM.progressBar.classList.remove('hidden');
    DOM.saveMessage.classList.add('hidden');

    try {
      const result = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          type: 'SAVE_PAGE',
          tabId: currentTab.id,
          saveType: currentSaveType
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });

      if (result?.success) {
        showMessage('Page archived successfully!', 'success');
        await loadArchives();
        await loadStorageStats();
      } else {
        showMessage(result?.error || 'Failed to save page', 'error');
      }
    } catch (e) {
      showMessage(e.message || 'Failed to save page', 'error');
    } finally {
      DOM.saveBtn.disabled = false;
      DOM.saveBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
          <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
        </svg>
        Save Page`;
      setTimeout(() => DOM.progressBar.classList.add('hidden'), 1000);
    }
  }

  function updateProgress(progress) {
    DOM.progressFill.style.width = progress.percent + '%';
    DOM.progressText.textContent = progress.step;
  }

  function showMessage(text, type) {
    DOM.saveMessage.textContent = text;
    DOM.saveMessage.className = `save-message ${type}`;
    setTimeout(() => DOM.saveMessage.classList.add('hidden'), 3000);
  }

  async function viewArchive(id) {
    const archive = await StorageManager.getArchive(id);
    if (!archive) return;

    if (archive.type === 'screenshot') {
      const win = window.open('');
      win.document.write(`<img src="${archive.content}" style="max-width:100%">`);
      return;
    }

    if (archive.type === 'reading') {
      DOM.readingOverlay.classList.remove('hidden');
      DOM.readingTitle.textContent = archive.title || 'Saved Article';
      const data = archive.readingData || {};
      DOM.readingContent.innerHTML = `
        <h1>${escapeHtml(archive.title || '')}</h1>
        ${data.author ? `<p style="color:#868e96;font-size:14px">${escapeHtml(data.author)} · ${escapeHtml(data.siteName || '')}</p>` : ''}
        ${data.excerpt ? `<blockquote style="border-left:3px solid #5c7cfa;padding-left:16px;color:#909296;margin:16px 0;font-style:italic">${escapeHtml(data.excerpt)}</blockquote>` : ''}
        <div class="reading-body-content">${archive.content || ''}</div>
      `;
      return;
    }

    if (archive.type === 'full') {
      const blob = new Blob([archive.content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      chrome.tabs.create({ url });
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      return;
    }

    if (archive.type === 'text') {
      DOM.readingOverlay.classList.remove('hidden');
      DOM.readingTitle.textContent = archive.title || 'Saved Text';
      DOM.readingContent.innerHTML = `<pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(archive.content || '')}</pre>`;
    }
  }

  async function downloadArchive(id) {
    const archive = await StorageManager.getArchive(id);
    if (!archive) return;

    chrome.runtime.sendMessage({
      type: 'DOWNLOAD_ARCHIVE',
      archive
    });
  }

  async function deleteArchive(id) {
    if (!confirm('Delete this archive?')) return;
    await StorageManager.removeArchive(id);
    await loadArchives(DOM.searchInput.value);
    await loadStorageStats();
  }

  async function exportAllArchives() {
    const data = await StorageManager.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `page-archiver-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function clearAllArchives() {
    if (!confirm('Delete ALL archives? This cannot be undone.')) return;
    await StorageManager.clearAll();
    await loadArchives();
    await loadStorageStats();
  }

  async function cleanupOldArchives() {
    const removed = await new Promise(resolve => {
      chrome.runtime.sendMessage({ type: 'CLEANUP_OLD' }, resolve);
    });
    showMessage(`Cleaned up ${removed} old archives`, 'success');
    await loadArchives();
    await loadStorageStats();
  }

  async function exportData() {
    await exportAllArchives();
  }

  async function importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = await StorageManager.importData(text);
      if (result.success) {
        showMessage(`Imported ${result.imported} archives`, 'success');
        await loadArchives();
        await loadStorageStats();
      } else {
        showMessage(result.error || 'Import failed', 'error');
      }
    } catch (e) {
      showMessage('Failed to read file', 'error');
    }
    DOM.importFile.value = '';
  }

  async function saveSettings() {
    const settings = {
      autoSave: document.getElementById('autoSave').checked,
      storageLimitMB: parseInt(document.getElementById('storageLimit').value) || 5,
      autoCleanupDays: parseInt(document.getElementById('autoCleanup').value) || 30,
      defaultSaveType: document.getElementById('defaultSaveType').value
    };
    await StorageManager.saveSettings(settings);
  }

  function closeReadingMode() {
    DOM.readingOverlay.classList.add('hidden');
  }

  function adjustReadingFont(delta) {
    readingFontSize = Math.min(28, Math.max(12, readingFontSize + delta));
    DOM.readingContent.style.fontSize = readingFontSize + 'px';
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return (str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function debounce(fn, ms) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }

  init();
});
