(() => {
  let storage = null;
  let highlighter = null;
  let allClips = [];
  let filteredClips = [];
  let selectedIds = new Set();
  let multiSelectMode = false;
  let currentFilter = { type: 'all', folder: 'all', sort: 'newest', query: '' };
  let contextClipId = null;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  async function init() {
    storage = new ClipStorage();
    await storage.init();
    highlighter = new SyntaxHighlighter();

    renderFolders();
    bindEvents();
    await refreshClips();
  }

  function bindEvents() {
    $('#searchInput').addEventListener('input', debounce(onSearch, 200));
    $('#btnClearSearch').addEventListener('click', () => {
      $('#searchInput').value = '';
      currentFilter.query = '';
      $('#btnClearSearch').style.display = 'none';
      refreshClips();
    });

    $('#filterType').addEventListener('change', (e) => {
      currentFilter.type = e.target.value;
      refreshClips();
    });
    $('#filterFolder').addEventListener('change', (e) => {
      currentFilter.folder = e.target.value;
      refreshClips();
    });
    $('#filterSort').addEventListener('change', (e) => {
      currentFilter.sort = e.target.value;
      refreshClips();
    });

    $$('.folder-tab[data-folder]').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.folder-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentFilter.folder = tab.dataset.folder;
        $('#filterFolder').value = tab.dataset.folder;
        refreshClips();
      });
    });

    $('#btnAddFolder').addEventListener('click', addFolder);
    $('#btnMultiSelect').addEventListener('click', toggleMultiSelect);
    $('#btnSettings').addEventListener('click', () => togglePanel('settingsPanel'));
    $('#btnStats').addEventListener('click', () => { togglePanel('statsPanel'); loadStats(); });
    $('#btnCloseSettings').addEventListener('click', () => hidePanel('settingsPanel'));
    $('#btnCloseStats').addEventListener('click', () => hidePanel('statsPanel'));

    $('#btnCopySelected').addEventListener('click', copySelected);
    $('#btnDeleteSelected').addEventListener('click', deleteSelected);
    $('#btnMoveSelected').addEventListener('click', showMoveMenuForSelected);
    $('#btnPinSelected').addEventListener('click', pinSelected);
    $('#btnDeselectAll').addEventListener('click', deselectAll);

    $('#btnViewerCopy').addEventListener('click', copyViewerClip);
    $('#btnViewerPin').addEventListener('click', pinViewerClip);
    $('#btnViewerEdit').addEventListener('click', editViewerClip);
    $('#btnViewerDelete').addEventListener('click', deleteViewerClip);
    $('#btnViewerClose').addEventListener('click', () => hidePanel('clipViewer'));

    $('#btnExport').addEventListener('click', exportData);
    $('#btnImport').addEventListener('click', () => $('#importFile').click());
    $('#importFile').addEventListener('change', importData);
    $('#btnClearAll').addEventListener('click', clearAll);

    saveSettingsOnchange();

    document.addEventListener('click', (e) => {
      if (!$('#contextMenu').contains(e.target)) $('#contextMenu').style.display = 'none';
      if (!$('#moveMenu').contains(e.target)) $('#moveMenu').style.display = 'none';
    });

    document.addEventListener('keydown', handleKeyboard);

    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.action === 'clipAdded') {
        refreshClips();
      }
    });
  }

  async function onSearch(e) {
    currentFilter.query = e.target.value;
    $('#btnClearSearch').style.display = e.target.value ? 'flex' : 'none';
    await refreshClips();
  }

  async function refreshClips() {
    filteredClips = await storage.searchClips(currentFilter.query, currentFilter);
    renderClips();
  }

  function renderClips() {
    const list = $('#clipList');
    const empty = $('#emptyState');

    if (filteredClips.length === 0) {
      list.innerHTML = '';
      list.appendChild(createEmptyState());
      return;
    }

    const fragment = document.createDocumentFragment();
    filteredClips.forEach(clip => {
      fragment.appendChild(createClipElement(clip));
    });
    list.innerHTML = '';
    list.appendChild(fragment);

    if (multiSelectMode) list.classList.add('multi-select-mode');
    else list.classList.remove('multi-select-mode');
  }

  function createEmptyState() {
    const div = document.createElement('div');
    div.className = 'empty-state';
    div.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
      </svg>
      <p>No clips found</p>
      <span>${currentFilter.query ? 'Try a different search' : 'Copy something to get started'}</span>
    `;
    return div;
  }

  function createClipElement(clip) {
    const div = document.createElement('div');
    div.className = 'clip-item' + (clip.pinned ? ' pinned' : '') + (selectedIds.has(clip.id) ? ' selected' : '');
    div.dataset.id = clip.id;

    const checkbox = document.createElement('div');
    checkbox.className = 'clip-checkbox' + (selectedIds.has(clip.id) ? ' checked' : '');
    checkbox.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleSelect(clip.id);
    });

    const body = document.createElement('div');
    body.className = 'clip-body';

    const preview = document.createElement('div');
    preview.className = 'clip-preview' + (clip.type === 'code' ? ' code-preview' : '') + (clip.type === 'link' ? ' link-preview' : '');

    if (clip.isImage && clip.imageData) {
      preview.classList.add('image-preview');
      preview.innerHTML = `<img src="${clip.imageData}" alt="clip">`;
    } else if (clip.type === 'code') {
      const previewText = clip.text.substring(0, 200);
      preview.textContent = previewText + (clip.text.length > 200 ? '...' : '');
    } else {
      const previewText = clip.text.substring(0, 200);
      preview.textContent = previewText + (clip.text.length > 200 ? '...' : '');
    }

    const meta = document.createElement('div');
    meta.className = 'clip-meta';
    const time = formatTime(clip.timestamp);
    const source = clip.source ? extractDomain(clip.source) : 'Unknown';
    const typeBadge = clip.type !== 'text' ? `<span class="type-badge ${clip.type}">${clip.type}</span>` : '';
    const copyCount = clip.copyCount > 0 ? ` · copied ${clip.copyCount}x` : '';
    meta.innerHTML = `<span>${time}</span><span class="source">${source}</span>${typeBadge}${copyCount}`;

    body.appendChild(preview);
    body.appendChild(meta);
    div.appendChild(checkbox);
    div.appendChild(body);

    div.addEventListener('click', (e) => {
      if (multiSelectMode) {
        toggleSelect(clip.id);
      } else {
        showViewer(clip);
      }
    });

    div.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showContextMenu(e, clip);
    });

    div.addEventListener('dblclick', () => {
      copyToClipboard(clip.text);
    });

    return div;
  }

  function showViewer(clip) {
    const viewer = $('#clipViewer');
    const content = $('#viewerContent');
    const meta = $('#viewerMeta');
    const title = $('#viewerTitle');

    title.textContent = clip.type === 'code' ? `Code · ${clip.language || 'unknown'}` : 'Clip Details';
    meta.innerHTML = `
      <span>Created: ${new Date(clip.timestamp).toLocaleString()}</span>
      <span>Source: ${clip.source ? extractDomain(clip.source) : 'Unknown'}</span>
      <span>Type: ${clip.type}</span>
      ${clip.copyCount > 0 ? `<span>Copied: ${clip.copyCount}x</span>` : ''}
    `;

    if (clip.isImage && clip.imageData) {
      content.innerHTML = `<img src="${clip.imageData}" alt="clip">`;
      content.className = 'viewer-content';
    } else if (clip.type === 'code') {
      content.innerHTML = highlighter.renderCodeBlock(clip.text, clip.language || 'text');
      content.className = 'viewer-content code-block';
    } else {
      content.textContent = clip.text;
      content.className = 'viewer-content';
    }

    viewer.dataset.clipId = clip.id;
    viewer.style.display = 'flex';

    const pinBtn = $('#btnViewerPin');
    pinBtn.style.color = clip.pinned ? 'var(--warning)' : '';
  }

  function showContextMenu(e, clip) {
    contextClipId = clip.id;
    const menu = $('#contextMenu');
    menu.style.display = 'block';
    menu.style.left = Math.min(e.clientX, window.innerWidth - 180) + 'px';
    menu.style.top = Math.min(e.clientY, window.innerHeight - 250) + 'px';
    $('#ctxPinLabel').textContent = clip.pinned ? 'Unpin' : 'Pin';

    $$('.ctx-item').forEach(item => {
      item.onclick = () => handleContextAction(item.dataset.action, clip);
    });
  }

  async function handleContextAction(action, clip) {
    $('#contextMenu').style.display = 'none';
    switch (action) {
      case 'copy':
        copyToClipboard(clip.text);
        break;
      case 'pin':
        clip.pinned = !clip.pinned;
        await storage.updateClip(clip);
        refreshClips();
        showToast(clip.pinned ? 'Pinned' : 'Unpinned');
        break;
      case 'edit':
        editClip(clip);
        break;
      case 'move':
        showMoveMenu(clip, event);
        break;
      case 'select':
        toggleMultiSelect();
        toggleSelect(clip.id);
        break;
      case 'view':
        showViewer(clip);
        break;
      case 'delete':
        await storage.deleteClip(clip.id);
        refreshClips();
        updateBadge();
        showToast('Deleted');
        break;
    }
  }

  function editClip(clip) {
    const newText = prompt('Edit clip:', clip.text);
    if (newText !== null && newText.trim()) {
      clip.text = newText.trim();
      clip.type = storage.detectType(clip.text);
      if (clip.type === 'code') clip.language = storage.detectLanguage(clip.text);
      storage.updateClip(clip).then(() => refreshClips());
    }
  }

  function showMoveMenu(clip, e) {
    const menu = $('#moveMenu');
    const list = $('#moveList');
    list.innerHTML = '';

    const unsortedBtn = document.createElement('button');
    unsortedBtn.className = 'move-item';
    unsortedBtn.textContent = 'Unsorted';
    unsortedBtn.onclick = async () => {
      clip.folder = 'unsorted';
      await storage.updateClip(clip);
      menu.style.display = 'none';
      refreshClips();
    };
    list.appendChild(unsortedBtn);

    storage.settings.folders.forEach(folder => {
      const btn = document.createElement('button');
      btn.className = 'move-item';
      btn.textContent = folder;
      btn.onclick = async () => {
        clip.folder = folder;
        await storage.updateClip(clip);
        menu.style.display = 'none';
        refreshClips();
      };
      list.appendChild(btn);
    });

    menu.style.display = 'block';
    if (e) {
      menu.style.left = Math.min(e.clientX || 200, window.innerWidth - 200) + 'px';
      menu.style.top = Math.min(e.clientY || 200, window.innerHeight - 200) + 'px';
    }
  }

  function showMoveMenuForSelected() {
    const menu = $('#moveMenu');
    const list = $('#moveList');
    list.innerHTML = '';

    const unsortedBtn = document.createElement('button');
    unsortedBtn.className = 'move-item';
    unsortedBtn.textContent = 'Unsorted';
    unsortedBtn.onclick = async () => {
      for (const id of selectedIds) {
        const clip = await storage.getClip(id);
        if (clip) {
          clip.folder = 'unsorted';
          await storage.updateClip(clip);
        }
      }
      menu.style.display = 'none';
      deselectAll();
      refreshClips();
    };
    list.appendChild(unsortedBtn);

    storage.settings.folders.forEach(folder => {
      const btn = document.createElement('button');
      btn.className = 'move-item';
      btn.textContent = folder;
      btn.onclick = async () => {
        for (const id of selectedIds) {
          const clip = await storage.getClip(id);
          if (clip) {
            clip.folder = folder;
            await storage.updateClip(clip);
          }
        }
        menu.style.display = 'none';
        deselectAll();
        refreshClips();
      };
      list.appendChild(btn);
    });

    menu.style.display = 'block';
    menu.style.left = '200px';
    menu.style.top = '200px';
  }

  async function addFolder() {
    const name = prompt('Folder name:');
    if (name && name.trim()) {
      await storage.addFolder(name.trim());
      renderFolders();
      showToast('Folder created');
    }
  }

  function renderFolders() {
    const tabs = $('#folderTabs');
    tabs.innerHTML = '';
    const filterSelect = $('#filterFolder');

    const existingOptions = filterSelect.querySelectorAll('option:not([value="all"]):not([value="unsorted"]):not([value="pinned"])');
    existingOptions.forEach(o => o.remove());

    storage.settings.folders.forEach(folder => {
      const tab = document.createElement('button');
      tab.className = 'folder-tab' + (currentFilter.folder === folder ? ' active' : '');
      tab.dataset.folder = folder;
      tab.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
        ${folder}
        <button class="remove-folder" title="Remove folder">×</button>
      `;
      tab.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-folder')) return;
        $$('.folder-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentFilter.folder = folder;
        $('#filterFolder').value = folder;
        refreshClips();
      });
      tab.querySelector('.remove-folder').addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm(`Remove folder "${folder}"? Clips will be moved to Unsorted.`)) {
          await storage.removeFolder(folder);
          if (currentFilter.folder === folder) {
            currentFilter.folder = 'all';
            $$('.folder-tab')[0].classList.add('active');
          }
          renderFolders();
          refreshClips();
        }
      });
      tabs.appendChild(tab);

      const option = document.createElement('option');
      option.value = folder;
      option.textContent = folder;
      filterSelect.appendChild(option);
    });
  }

  function toggleMultiSelect() {
    multiSelectMode = !multiSelectMode;
    $('#btnMultiSelect').classList.toggle('active', multiSelectMode);
    $('#toolbar').style.display = multiSelectMode ? 'flex' : 'none';
    if (!multiSelectMode) deselectAll();
    renderClips();
  }

  function toggleSelect(id) {
    if (selectedIds.has(id)) selectedIds.delete(id);
    else selectedIds.add(id);
    $('#selectedCount').textContent = `${selectedIds.size} selected`;
    renderClips();
  }

  function deselectAll() {
    selectedIds.clear();
    $('#selectedCount').textContent = '0 selected';
    renderClips();
  }

  async function copySelected() {
    const texts = [];
    for (const id of selectedIds) {
      const clip = await storage.getClip(id);
      if (clip) texts.push(clip.text);
    }
    copyToClipboard(texts.join('\n\n'));
    showToast(`Copied ${selectedIds.size} clips`);
  }

  async function deleteSelected() {
    if (!confirm(`Delete ${selectedIds.size} clips?`)) return;
    await storage.deleteClips([...selectedIds]);
    deselectAll();
    refreshClips();
    updateBadge();
    showToast('Deleted');
  }

  async function pinSelected() {
    for (const id of selectedIds) {
      const clip = await storage.getClip(id);
      if (clip) {
        clip.pinned = true;
        await storage.updateClip(clip);
      }
    }
    deselectAll();
    refreshClips();
    showToast('Pinned');
  }

  function copyViewerClip() {
    const id = $('#clipViewer').dataset.clipId;
    const clip = filteredClips.find(c => c.id === id);
    if (clip) copyToClipboard(clip.text);
  }

  async function pinViewerClip() {
    const id = $('#clipViewer').dataset.clipId;
    const clip = await storage.getClip(id);
    if (clip) {
      clip.pinned = !clip.pinned;
      await storage.updateClip(clip);
      showViewer(clip);
      refreshClips();
      showToast(clip.pinned ? 'Pinned' : 'Unpinned');
    }
  }

  function editViewerClip() {
    const id = $('#clipViewer').dataset.clipId;
    const clip = filteredClips.find(c => c.id === id);
    if (clip) editClip(clip);
  }

  async function deleteViewerClip() {
    const id = $('#clipViewer').dataset.clipId;
    await storage.deleteClip(id);
    hidePanel('clipViewer');
    refreshClips();
    updateBadge();
    showToast('Deleted');
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied to clipboard');
      const clip = filteredClips.find(c => c.text === text);
      if (clip) {
        clip.copyCount = (clip.copyCount || 0) + 1;
        await storage.updateClip(clip);
      }
    } catch (e) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showToast('Copied');
    }
  }

  async function loadStats() {
    const stats = await storage.getStats();
    $('#statTotal').textContent = stats.total;
    $('#statToday').textContent = stats.today;
    $('#statPinned').textContent = stats.pinned;
    $('#statCopied').textContent = stats.totalCopied;
    $('#statMostCopied').textContent = stats.mostCopied
      ? stats.mostCopied.substring(0, 80) + (stats.mostCopied.length > 80 ? '...' : '')
      : '-';
    const kb = (stats.storageUsed / 1024).toFixed(1);
    const mb = (stats.storageUsed / (1024 * 1024)).toFixed(2);
    $('#statStorage').textContent = stats.storageUsed > 1024 * 1024 ? `${mb} MB` : `${kb} KB`;
  }

  async function exportData() {
    const data = await storage.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clipvault-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported');
  }

  async function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      await storage.importData(text);
      refreshClips();
      updateBadge();
      showToast('Imported');
    } catch (err) {
      showToast('Import failed: ' + err.message, 'error');
    }
    e.target.value = '';
  }

  async function clearAll() {
    if (!confirm('Delete ALL clips? This cannot be undone.')) return;
    await storage.clearAll();
    refreshClips();
    updateBadge();
    showToast('All clips cleared');
  }

  function saveSettingsOnchange() {
    const fields = {
      settingMaxSize: 'maxSize',
      settingAutoClear: 'autoClearDays',
      settingInterceptCopy: 'interceptCopy',
      settingInterceptRightClick: 'interceptRightClick',
      settingPollClipboard: 'pollClipboard',
      settingShowBadge: 'showBadge'
    };

    Object.entries(fields).forEach(([id, key]) => {
      const el = $(`#${id}`);
      el.addEventListener('change', async () => {
        const val = el.type === 'checkbox' ? el.checked : (el.type === 'select-one' ? parseInt(el.value) : el.value);
        settings[key] = val;
        await chrome.runtime.sendMessage({ action: 'saveSettings', settings });
      });
    });

    $('#settingExcludedSites').addEventListener('change', async () => {
      settings.excludedSites = $('#settingExcludedSites').value.split('\n').filter(s => s.trim());
      await chrome.runtime.sendMessage({ action: 'saveSettings', settings });
    });

    loadSettingsUI();
  }

  async function loadSettingsUI() {
    const result = await chrome.runtime.sendMessage({ action: 'getSettings' });
    if (result && result.settings) {
      settings = result.settings;
      $('#settingMaxSize').value = settings.maxSize || 100;
      $('#settingAutoClear').value = settings.autoClearDays || 7;
      $('#settingInterceptCopy').checked = settings.interceptCopy !== false;
      $('#settingInterceptRightClick').checked = settings.interceptRightClick !== false;
      $('#settingPollClipboard').checked = settings.pollClipboard || false;
      $('#settingShowBadge').checked = settings.showBadge !== false;
      $('#settingExcludedSites').value = (settings.excludedSites || []).join('\n');
    }
  }

  async function updateBadge() {
    const clips = await storage.getAllClips();
    const count = clips.length;
    chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
    chrome.action.setBadgeBackgroundColor({ color: '#e94560' });
  }

  function handleKeyboard(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
      if (e.key === 'Escape') e.target.blur();
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'j') {
      e.preventDefault();
      navigateClip(1);
    } else if (e.key === 'ArrowUp' || e.key === 'k') {
      e.preventDefault();
      navigateClip(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const active = $('.clip-item.active');
      if (active) {
        const clip = filteredClips.find(c => c.id === active.dataset.id);
        if (clip) copyToClipboard(clip.text);
      }
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (multiSelectMode && selectedIds.size > 0) {
        deleteSelected();
      }
    } else if (e.key === 'Escape') {
      if ($('#clipViewer').style.display !== 'none') hidePanel('clipViewer');
      else if ($('#settingsPanel').style.display !== 'none') hidePanel('settingsPanel');
      else if ($('#statsPanel').style.display !== 'none') hidePanel('statsPanel');
      if (multiSelectMode) toggleMultiSelect();
    } else if (e.key === 'f' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      $('#searchInput').focus();
    } else if (e.key === 'a' && (e.ctrlKey || e.metaKey) && multiSelectMode) {
      e.preventDefault();
      filteredClips.forEach(c => selectedIds.add(c.id));
      $('#selectedCount').textContent = `${selectedIds.size} selected`;
      renderClips();
    }
  }

  function navigateClip(direction) {
    const items = $$('.clip-item');
    if (items.length === 0) return;

    const active = $('.clip-item.active');
    let index = -1;
    if (active) {
      index = Array.from(items).indexOf(active);
      active.classList.remove('active');
    }

    index += direction;
    if (index < 0) index = items.length - 1;
    if (index >= items.length) index = 0;

    items[index].classList.add('active');
    items[index].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function togglePanel(id) {
    const panel = $(`#${id}`);
    panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
  }

  function hidePanel(id) {
    $(`#${id}`).style.display = 'none';
  }

  function showToast(message, type = 'success') {
    const toast = $('#toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 2000);
  }

  function formatTime(ts) {
    const now = Date.now();
    const diff = now - ts;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return new Date(ts).toLocaleDateString();
  }

  function extractDomain(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return url.substring(0, 30);
    }
  }

  function debounce(fn, ms) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }

  document.addEventListener('DOMContentLoaded', init);
})();