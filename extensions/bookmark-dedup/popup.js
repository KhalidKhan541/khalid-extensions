/* popup.js — UI controller */

(() => {
  // State
  let currentReport = null;
  let selectedDuplicates = new Set();
  let selectedBroken = new Set();
  let selectedEmpty = new Set();

  // DOM refs
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const dom = {
    statTotal: $('#stat-total'),
    statDuplicates: $('#stat-duplicates'),
    statBroken: $('#stat-broken'),
    statEmpty: $('#stat-empty'),
    btnScan: $('#btn-scan'),
    btnCleanupAll: $('#btn-cleanup-all'),
    progressContainer: $('#progress-container'),
    progressFill: $('#progress-fill'),
    progressText: $('#progress-text'),
    tabDuplicates: $('#tab-duplicates'),
    tabBroken: $('#tab-broken'),
    tabEmpty: $('#tab-empty'),
    tabSimilar: $('#tab-similar'),
    duplicatesList: $('#duplicates-list'),
    brokenList: $('#broken-list'),
    emptyList: $('#empty-list'),
    similarList: $('#similar-list'),
    sortDuplicates: $('#sort-duplicates'),
    btnKeepFirstAll: $('#btn-keep-first-all'),
    btnDeleteSelected: $('#btn-delete-selected'),
    btnDeleteBroken: $('#btn-delete-broken'),
    btnDeleteEmpty: $('#btn-delete-empty'),
    btnExport: $('#btn-export'),
    btnSettings: $('#btn-settings'),
    btnCloseSettings: $('#btn-close-settings'),
    modalSettings: $('#modal-settings'),
    undoToast: $('#undo-toast'),
    undoMessage: $('#undo-message'),
    btnUndo: $('#btn-undo')
  };

  // Settings elements
  const settingsEls = {
    autoScan: $('#setting-auto-scan'),
    checkBroken: $('#setting-check-broken'),
    includeFragments: $('#setting-include-fragments'),
    normalizeWww: $('#setting-normalize-www'),
    normalizeProtocol: $('#setting-normalize-protocol'),
    scanInterval: $('#setting-scan-interval')
  };

  // Init
  async function init() {
    await loadSettings();
    await loadLastResults();
    bindEvents();
  }

  // Settings
  async function loadSettings() {
    const settings = await StorageManager.getSettings();
    settingsEls.autoScan.checked = settings.autoScan;
    settingsEls.checkBroken.checked = settings.checkBroken;
    settingsEls.includeFragments.checked = settings.includeFragments;
    settingsEls.normalizeWww.checked = settings.normalizeWww;
    settingsEls.normalizeProtocol.checked = settings.normalizeProtocol;
    settingsEls.scanInterval.value = settings.scanInterval;
  }

  async function saveSettings() {
    const settings = {
      autoScan: settingsEls.autoScan.checked,
      checkBroken: settingsEls.checkBroken.checked,
      includeFragments: settingsEls.includeFragments.checked,
      normalizeWww: settingsEls.normalizeWww.checked,
      normalizeProtocol: settingsEls.normalizeProtocol.checked,
      scanInterval: parseInt(settingsEls.scanInterval.value) || 60
    };
    await StorageManager.saveSettings(settings);
    chrome.runtime.sendMessage({ type: 'updateSettings', settings });
  }

  // Load cached results
  async function loadLastResults() {
    const report = await StorageManager.getScanResults();
    if (report) {
      currentReport = report;
      renderReport(report);
      dom.btnCleanupAll.disabled = false;
    }
  }

  // Events
  function bindEvents() {
    dom.btnScan.addEventListener('click', runScan);
    dom.btnCleanupAll.addEventListener('click', runFullCleanup);
    dom.btnKeepFirstAll.addEventListener('click', keepFirstAll);
    dom.btnDeleteSelected.addEventListener('click', deleteSelectedDuplicates);
    dom.btnDeleteBroken.addEventListener('click', deleteBroken);
    dom.btnDeleteEmpty.addEventListener('click', deleteEmpty);
    dom.btnExport.addEventListener('click', exportReport);
    dom.btnSettings.addEventListener('click', () => dom.modalSettings.classList.remove('hidden'));
    dom.btnCloseSettings.addEventListener('click', () => dom.modalSettings.classList.add('hidden'));
    dom.btnUndo.addEventListener('click', runUndo);
    dom.sortDuplicates.addEventListener('change', () => renderDuplicates());

    // Settings change listeners
    for (const el of Object.values(settingsEls)) {
      el.addEventListener('change', saveSettings);
    }

    // Tab switching
    $$('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        $$('.panel').forEach(p => p.classList.remove('active'));
        $(`#panel-${tab.dataset.tab}`).classList.add('active');
      });
    });

    // Close modal on backdrop click
    dom.modalSettings.addEventListener('click', (e) => {
      if (e.target === dom.modalSettings) dom.modalSettings.classList.add('hidden');
    });
  }

  // Scan
  async function runScan() {
    dom.btnScan.disabled = true;
    dom.btnScan.innerHTML = '<svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg> Scanning...';
    dom.progressContainer.classList.remove('hidden');

    const settings = await StorageManager.getSettings();

    try {
      currentReport = await BookmarkScanner.scan(settings, (text, pct) => {
        dom.progressText.textContent = text;
        dom.progressFill.style.width = pct + '%';
      });

      await StorageManager.saveScanResults(currentReport);
      await StorageManager.recordStats(currentReport.stats);
      renderReport(currentReport);

      dom.btnCleanupAll.disabled = false;
      chrome.runtime.sendMessage({ type: 'triggerScan' });
    } catch (e) {
      dom.progressText.textContent = 'Error: ' + e.message;
    }

    dom.btnScan.disabled = false;
    dom.btnScan.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg> Scan Bookmarks';

    setTimeout(() => dom.progressContainer.classList.add('hidden'), 1500);
  }

  // Render
  function renderReport(report) {
    dom.statTotal.textContent = report.stats.total;
    dom.statDuplicates.textContent = report.stats.duplicates;
    dom.statBroken.textContent = report.stats.broken;
    dom.statEmpty.textContent = report.stats.emptyFolders;
    dom.tabDuplicates.textContent = report.duplicates.length;
    dom.tabBroken.textContent = report.broken.length;
    dom.tabEmpty.textContent = report.emptyFolders.length;
    dom.tabSimilar.textContent = report.similar.length;

    selectedDuplicates.clear();
    selectedBroken.clear();
    selectedEmpty.clear();

    renderDuplicates();
    renderBroken();
    renderEmpty();
    renderSimilar();
    updateToolbarState();
  }

  function renderDuplicates() {
    if (!currentReport) return;
    let groups = [...currentReport.duplicates];

    // Sort
    const sort = dom.sortDuplicates.value;
    if (sort === 'most') groups.sort((a, b) => b.count - a.count);
    else if (sort === 'newest') groups.sort((a, b) => {
      const aMax = Math.max(...a.items.map(i => i.dateAdded || 0));
      const bMax = Math.max(...b.items.map(i => i.dateAdded || 0));
      return bMax - aMax;
    });
    else if (sort === 'oldest') groups.sort((a, b) => {
      const aMin = Math.min(...a.items.map(i => i.dateAdded || Infinity));
      const bMin = Math.min(...b.items.map(i => i.dateAdded || Infinity));
      return aMin - bMin;
    });
    else if (sort === 'folder') groups.sort((a, b) => a.items[0].folder.localeCompare(b.items[0].folder));

    if (groups.length === 0) {
      dom.duplicatesList.innerHTML = '<div class="empty-state"><p>No duplicates found.</p></div>';
      return;
    }

    dom.duplicatesList.innerHTML = groups.map((group, gi) => `
      <div class="dup-group" data-group="${gi}">
        <div class="dup-group-header" onclick="this.parentElement.classList.toggle('expanded')">
          <span class="dup-group-url" title="${escHtml(group.originalUrl)}">${escHtml(truncate(group.originalUrl, 50))}</span>
          <span class="dup-group-count">${group.count} duplicates</span>
          <div class="dup-group-actions">
            <button class="btn-sm" onclick="event.stopPropagation(); keepFirst(${gi})" title="Keep oldest, delete rest">Keep First</button>
            <button class="btn-sm" onclick="event.stopPropagation(); mergeNames(${gi})" title="Merge names, keep longest title">Merge</button>
          </div>
        </div>
        <div class="dup-group-body">
          ${group.items.map((item, ii) => `
            <div class="bookmark-item">
              <input type="checkbox" class="bookmark-check" data-group="${gi}" data-item="${ii}"
                ${selectedDuplicates.has(`${gi}-${ii}`) ? 'checked' : ''}
                onchange="toggleDupSelect(${gi}, ${ii}, this.checked)">
              <div class="bookmark-info">
                <div class="bookmark-name" title="${escHtml(item.title)}">${escHtml(item.title || '(No title)')}</div>
                <div class="bookmark-meta">${escHtml(item.folder)} &middot; ${item.dateAdded ? formatDate(item.dateAdded) : 'Unknown date'}</div>
              </div>
              ${ii === 0 ? '<span class="bookmark-badge keep">KEEP</span>' : '<span class="bookmark-badge delete">DUP</span>'}
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  function renderBroken() {
    if (!currentReport || !currentReport.broken.length) {
      dom.brokenList.innerHTML = '<div class="empty-state"><p>No broken links found.</p></div>';
      return;
    }

    dom.brokenList.innerHTML = currentReport.broken.map((bm, i) => `
      <div class="simple-item">
        <div class="simple-item-info">
          <div class="simple-item-name" title="${escHtml(bm.url)}">${escHtml(bm.title || bm.url)}</div>
          <div class="simple-item-path">${escHtml(bm.folder)}</div>
        </div>
        <input type="checkbox" class="simple-item-check" data-idx="${i}"
          ${selectedBroken.has(i) ? 'checked' : ''}
          onchange="toggleBrokenSelect(${i}, this.checked)">
      </div>
    `).join('');
  }

  function renderEmpty() {
    if (!currentReport || !currentReport.emptyFolders.length) {
      dom.emptyList.innerHTML = '<div class="empty-state"><p>No empty folders found.</p></div>';
      return;
    }

    dom.emptyList.innerHTML = currentReport.emptyFolders.map((folder, i) => `
      <div class="simple-item">
        <div class="simple-item-info">
          <div class="simple-item-name">${escHtml(folder.title)}</div>
          <div class="simple-item-path">${escHtml(folder.path)}</div>
        </div>
        <input type="checkbox" class="simple-item-check" data-idx="${i}"
          ${selectedEmpty.has(i) ? 'checked' : ''}
          onchange="toggleEmptySelect(${i}, this.checked)">
      </div>
    `).join('');
  }

  function renderSimilar() {
    if (!currentReport || !currentReport.similar.length) {
      dom.similarList.innerHTML = '<div class="empty-state"><p>No similar bookmarks found.</p></div>';
      return;
    }

    dom.similarList.innerHTML = currentReport.similar.map(group => `
      <div class="similar-group">
        <div class="similar-group-header">${escHtml(group.domain)} &middot; ${escHtml(group.reason)}</div>
        ${group.items.map(item => `
          <div class="bookmark-item">
            <div class="bookmark-info">
              <div class="bookmark-name" title="${escHtml(item.url)}">${escHtml(item.title || '(No title)')}</div>
              <div class="bookmark-meta">${escHtml(item.folder)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `).join('');
  }

  // Duplicate selection
  window.toggleDupSelect = (gi, ii, checked) => {
    const key = `${gi}-${ii}`;
    if (checked) selectedDuplicates.add(key); else selectedDuplicates.delete(key);
    updateToolbarState();
  };

  window.toggleBrokenSelect = (idx, checked) => {
    if (checked) selectedBroken.add(idx); else selectedBroken.delete(idx);
    updateToolbarState();
  };

  window.toggleEmptySelect = (idx, checked) => {
    if (checked) selectedEmpty.add(idx); else selectedEmpty.delete(idx);
    updateToolbarState();
  };

  function updateToolbarState() {
    dom.btnKeepFirstAll.disabled = !currentReport || currentReport.duplicates.length === 0;
    dom.btnDeleteSelected.disabled = selectedDuplicates.size === 0;
    dom.btnDeleteBroken.disabled = !currentReport || currentReport.broken.length === 0;
    dom.btnDeleteEmpty.disabled = !currentReport || currentReport.emptyFolders.length === 0;
  }

  // Actions
  window.keepFirst = async (groupIdx) => {
    if (!currentReport) return;
    const group = currentReport.duplicates[groupIdx];
    if (!group) return;

    await BookmarkCleaner.createBackup();
    const { delete: toDelete } = BookmarkCleaner.pickKeepers(group, 'first');
    const deleted = await BookmarkCleaner.deleteBookmarks(toDelete);
    showUndoToast(`Deleted ${deleted} duplicate(s)`);
    await refreshScan();
  };

  window.mergeNames = async (groupIdx) => {
    if (!currentReport) return;
    const group = currentReport.duplicates[groupIdx];
    if (!group) return;

    await BookmarkCleaner.createBackup();
    const { delete: toDelete } = BookmarkCleaner.pickByMerge(group);
    const deleted = await BookmarkCleaner.deleteBookmarks(toDelete);
    showUndoToast(`Merged: deleted ${deleted}, kept longest name`);
    await refreshScan();
  };

  window.keepFirstAll = async () => {
    if (!currentReport) return;
    await BookmarkCleaner.createBackup();
    let totalDeleted = 0;
    for (const group of currentReport.duplicates) {
      const { delete: toDelete } = BookmarkCleaner.pickKeepers(group, 'first');
      totalDeleted += await BookmarkCleaner.deleteBookmarks(toDelete);
    }
    showUndoToast(`Deleted ${totalDeleted} duplicates, kept first in each group`);
    await refreshScan();
  };

  async function deleteSelectedDuplicates() {
    if (!currentReport || selectedDuplicates.size === 0) return;
    await BookmarkCleaner.createBackup();
    let totalDeleted = 0;
    for (const key of selectedDuplicates) {
      const [gi, ii] = key.split('-').map(Number);
      const group = currentReport.duplicates[gi];
      if (group && group.items[ii]) {
        const ok = await BookmarkCleaner.deleteBookmark(group.items[ii].id);
        if (ok) totalDeleted++;
      }
    }
    showUndoToast(`Deleted ${totalDeleted} selected bookmark(s)`);
    await refreshScan();
  }

  async function deleteBroken() {
    if (!currentReport || !currentReport.broken.length) return;
    await BookmarkCleaner.createBackup();
    const ids = currentReport.broken.map(b => b.id);
    const deleted = await BookmarkCleaner.deleteBookmarks(ids);
    showUndoToast(`Deleted ${deleted} broken bookmark(s)`);
    await refreshScan();
  }

  async function deleteEmpty() {
    if (!currentReport || !currentReport.emptyFolders.length) return;
    await BookmarkCleaner.createBackup();
    const deleted = await BookmarkCleaner.deleteEmptyFolders(currentReport.emptyFolders);
    showUndoToast(`Deleted ${deleted} empty folder(s)`);
    await refreshScan();
  }

  async function runFullCleanup() {
    if (!currentReport) return;
    if (!confirm('This will delete all duplicates, broken links, and empty folders. Continue?')) return;

    dom.progressContainer.classList.remove('hidden');
    dom.progressText.textContent = 'Cleaning up...';
    dom.progressFill.style.width = '0%';

    const results = await BookmarkCleaner.fullCleanup(currentReport, {}, (done, total, errors) => {
      const pct = total > 0 ? Math.floor((done / total) * 100) : 100;
      dom.progressFill.style.width = pct + '%';
      dom.progressText.textContent = `Cleaned ${done}/${total} (${errors} errors)`;
    });

    showUndoToast(`Cleanup done: ${results.duplicates} duplicates, ${results.broken} broken, ${results.emptyFolders} empty folders removed`);
    await refreshScan();
  }

  async function refreshScan() {
    const settings = await StorageManager.getSettings();
    currentReport = await BookmarkScanner.scan(settings);
    await StorageManager.saveScanResults(currentReport);
    renderReport(currentReport);
  }

  // Undo
  async function runUndo() {
    try {
      await BookmarkCleaner.restoreFromBackup();
      dom.undoToast.classList.add('hidden');
      await refreshScan();
    } catch (e) {
      alert('Restore failed: ' + e.message);
    }
  }

  function showUndoToast(message) {
    dom.undoMessage.textContent = message;
    dom.undoToast.classList.remove('hidden');
    setTimeout(() => dom.undoToast.classList.add('hidden'), 8000);
  }

  // Export
  function exportReport() {
    if (!currentReport) return;
    const json = StorageManager.exportReport(currentReport);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookmark-dedup-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Helpers
  function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function truncate(str, len) {
    return str.length > len ? str.slice(0, len) + '...' : str;
  }

  function formatDate(ts) {
    try { return new Date(ts).toLocaleDateString(); } catch { return ''; }
  }

  // CSS for spinner
  const style = document.createElement('style');
  style.textContent = `.spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }`;
  document.head.appendChild(style);

  init();
})();
