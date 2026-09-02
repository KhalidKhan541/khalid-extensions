class WebClipperPopup {
  constructor() {
    this.clips = [];
    this.collections = [];
    this.tags = [];
    this.batchMode = false;
    this.selectedClips = new Set();
    this.currentSort = 'date-desc';
    this.searchQuery = '';
    this.filterCollection = '';
    this.filterTag = '';
    this.init();
  }

  async init() {
    await this.loadData();
    this.bindEvents();
    this.applyTheme();
    this.render();
  }

  async loadData() {
    try {
      this.collections = await window.clipStorage.getAllCollections();
      this.tags = await window.clipStorage.getAllTags();
      this.clips = await window.clipStorage.getAllClips();
    } catch (e) {
      console.error('Failed to load data:', e);
    }
  }

  bindEvents() {
    document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
    document.getElementById('clipSelectionBtn').addEventListener('click', () => this.clipSelection());
    document.getElementById('clipFullBtn').addEventListener('click', () => this.clipFullPage());
    document.getElementById('clipArticleBtn').addEventListener('click', () => this.clipArticle());
    document.getElementById('screenshotBtn').addEventListener('click', () => this.screenshotClip());
    document.getElementById('searchInput').addEventListener('input', (e) => this.handleSearch(e.target.value));
    document.getElementById('clearSearch').addEventListener('click', () => this.clearSearch());
    document.getElementById('sortBy').addEventListener('change', (e) => this.handleSortChange(e.target.value));
    document.getElementById('batchModeBtn').addEventListener('click', () => this.toggleBatchMode());
    document.getElementById('batchCancel').addEventListener('click', () => this.toggleBatchMode());
    document.getElementById('batchDeleteBtn').addEventListener('click', () => this.batchDelete());
    document.getElementById('batchTagBtn').addEventListener('click', () => this.batchTag());
    document.getElementById('batchMoveBtn').addEventListener('click', () => this.batchMove());
    document.getElementById('menuBtn').addEventListener('click', () => this.toggleMenu());
    document.getElementById('collectionFilter').addEventListener('change', (e) => this.handleCollectionFilter(e.target.value));
    document.getElementById('tagFilterInput').addEventListener('input', (e) => this.handleTagFilter(e.target.value));
    document.getElementById('newCollectionBtn').addEventListener('click', () => this.showNewCollectionModal());
    document.getElementById('exportMenuBtn').addEventListener('click', () => this.showExportModal());
    document.getElementById('importMenuBtn').addEventListener('click', () => this.showImportModal());
    document.getElementById('collectionsMenuBtn').addEventListener('click', () => this.showCollectionsPanel());
    document.getElementById('exportJsonBtn').addEventListener('click', () => this.exportAs('json'));
    document.getElementById('exportMarkdownBtn').addEventListener('click', () => this.exportAs('markdown'));
    document.getElementById('exportHtmlBtn').addEventListener('click', () => this.exportAs('html'));
    document.getElementById('importFileInput').addEventListener('change', (e) => this.handleImportFile(e));
    document.getElementById('modalOverlay').addEventListener('click', () => this.closeModal());
    document.getElementById('modalClose').addEventListener('click', () => this.closeModal());

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.dropdown-menu') && !e.target.closest('#menuBtn')) {
        document.getElementById('dropdownMenu').style.display = 'none';
      }
    });

    document.addEventListener('click', (e) => {
      const suggestion = e.target.closest('.tag-suggestion');
      if (suggestion) {
        document.getElementById('tagFilterInput').value = suggestion.dataset.tag;
        this.filterTag = suggestion.dataset.tag;
        document.getElementById('tagSuggestions').classList.remove('visible');
        this.render();
      }
    });
  }

  applyTheme() {
    const theme = localStorage.getItem('wc-theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('wc-theme', next);
  }

  async clipSelection() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getSelection' });
      if (response) {
        chrome.tabs.sendMessage(tab.id, { action: 'showPreview', clipData: response });
      } else {
        this.showToast('No text selected. Please select some content first.', 'error');
      }
    } catch (e) {
      this.showToast('Could not clip. Try reloading the page.', 'error');
    }
  }

  async clipFullPage() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getFullPage' });
      if (response) {
        chrome.tabs.sendMessage(tab.id, { action: 'showPreview', clipData: response });
      }
    } catch (e) {
      this.showToast('Could not clip page. Try reloading the page.', 'error');
    }
  }

  async clipArticle() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getArticle' });
      if (response) {
        chrome.tabs.sendMessage(tab.id, { action: 'showPreview', clipData: response });
      }
    } catch (e) {
      this.showToast('Could not extract article. Try reloading the page.', 'error');
    }
  }

  async screenshotClip() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    try {
      const dataUrl = await new Promise((resolve) => {
        chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' }, (dataUrl) => {
          resolve(chrome.runtime.lastError ? null : dataUrl);
        });
      });

      if (dataUrl) {
        const clip = {
          url: tab.url,
          title: `Screenshot - ${tab.title || 'Untitled'}`,
          content: `Screenshot of: ${tab.url}\n${tab.title || ''}`,
          html: `<img src="${dataUrl}" alt="Screenshot" style="max-width:100%;">`,
          markdown: `![Screenshot](${dataUrl})`,
          excerpt: `Screenshot of ${tab.url}`,
          type: 'screenshot',
          collection: 'Uncategorized',
          tags: [],
          annotation: '',
          highlights: [],
          images: [{ src: dataUrl, alt: 'Screenshot' }],
          metadata: { sourceUrl: tab.url },
          date: Date.now()
        };

        await window.clipStorage.saveClip(clip);
        this.showToast('Screenshot saved!', 'success');
        await this.loadData();
        this.render();
      }
    } catch (e) {
      this.showToast('Screenshot failed', 'error');
    }
  }

  handleSearch(query) {
    this.searchQuery = query;
    const clearBtn = document.getElementById('clearSearch');
    clearBtn.classList.toggle('visible', query.length > 0);
    this.render();
  }

  clearSearch() {
    document.getElementById('searchInput').value = '';
    this.searchQuery = '';
    document.getElementById('clearSearch').classList.remove('visible');
    this.render();
  }

  handleSortChange(sort) {
    this.currentSort = sort;
    this.render();
  }

  handleCollectionFilter(collection) {
    this.filterCollection = collection;
    this.render();
  }

  handleTagFilter(tag) {
    this.filterTag = tag;
    const suggestions = document.getElementById('tagSuggestions');
    if (tag.length > 0) {
      const allTags = this.getAllUniqueTags();
      const filtered = allTags.filter(t => t.toLowerCase().includes(tag.toLowerCase()));
      if (filtered.length > 0) {
        suggestions.innerHTML = filtered.map(t =>
          `<div class="tag-suggestion" data-tag="${this.escapeHtml(t)}">
            <span class="tag-dot"></span>
            ${this.escapeHtml(t)}
          </div>`
        ).join('');
        suggestions.classList.add('visible');
      } else {
        suggestions.classList.remove('visible');
      }
    } else {
      suggestions.classList.remove('visible');
    }
    this.render();
  }

  getAllUniqueTags() {
    const tagSet = new Set();
    for (const clip of this.clips) {
      for (const tag of (clip.tags || [])) {
        tagSet.add(tag);
      }
    }
    return Array.from(tagSet).sort();
  }

  toggleBatchMode() {
    this.batchMode = !this.batchMode;
    this.selectedClips.clear();
    document.getElementById('batchBar').style.display = this.batchMode ? 'flex' : 'none';
    document.getElementById('clipList').classList.toggle('batch-mode', this.batchMode);
    this.updateSelectedCount();
    this.render();
  }

  toggleClipSelection(id) {
    if (this.selectedClips.has(id)) {
      this.selectedClips.delete(id);
    } else {
      this.selectedClips.add(id);
    }
    this.updateSelectedCount();
    this.render();
  }

  updateSelectedCount() {
    document.getElementById('selectedCount').textContent = `${this.selectedClips.size} selected`;
  }

  async batchDelete() {
    if (this.selectedClips.size === 0) return;
    if (!confirm(`Delete ${this.selectedClips.size} clips?`)) return;

    await window.clipStorage.deleteClips(Array.from(this.selectedClips));
    this.showToast(`${this.selectedClips.size} clips deleted`, 'success');
    this.selectedClips.clear();
    this.updateSelectedCount();
    await this.loadData();
    this.render();
  }

  async batchTag() {
    if (this.selectedClips.size === 0) return;
    const tag = prompt('Enter tag name:');
    if (!tag) return;

    for (const id of this.selectedClips) {
      const clip = this.clips.find(c => c.id === id);
      if (clip) {
        const tags = [...new Set([...(clip.tags || []), tag])];
        await window.clipStorage.updateClip(id, { tags });
      }
    }

    this.showToast(`Tag "${tag}" added to ${this.selectedClips.size} clips`, 'success');
    await this.loadData();
    this.render();
  }

  async batchMove() {
    if (this.selectedClips.size === 0) return;

    const collection = prompt('Move to collection:');
    if (!collection) return;

    for (const id of this.selectedClips) {
      await window.clipStorage.updateClip(id, { collection });
    }

    this.showToast(`${this.selectedClips.size} clips moved to "${collection}"`, 'success');
    this.selectedClips.clear();
    this.updateSelectedCount();
    await this.loadData();
    this.render();
  }

  toggleMenu() {
    const menu = document.getElementById('dropdownMenu');
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
  }

  showNewCollectionModal() {
    document.getElementById('dropdownMenu').style.display = 'none';
    this.openModal('New Collection', `
      <div class="form-group">
        <label>Name</label>
        <input type="text" id="newCollectionName" placeholder="Collection name">
      </div>
      <div class="form-group">
        <label>Icon</label>
        <input type="text" id="newCollectionIcon" value="📁" maxlength="2">
      </div>
      <div class="form-group">
        <label>Color</label>
        <div class="color-picker">
          ${['#3498db', '#27ae60', '#e67e22', '#9b59b6', '#e74c3c', '#1abc9c', '#f39c12', '#95a5a6'].map(c =>
            `<div class="color-option ${c === '#3498db' ? 'selected' : ''}" data-color="${c}" style="background:${c};"></div>`
          ).join('')}
        </div>
      </div>
    `, [
      { text: 'Cancel', action: 'closeModal' },
      { text: 'Create', class: 'btn-primary', action: 'createCollection' }
    ]);

    document.querySelectorAll('.color-option').forEach(opt => {
      opt.addEventListener('click', () => {
        document.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
      });
    });

    document.getElementById('createCollection')?.addEventListener('click', async () => {
      const name = document.getElementById('newCollectionName').value.trim();
      const icon = document.getElementById('newCollectionIcon').value;
      const color = document.querySelector('.color-option.selected')?.dataset.color || '#3498db';

      if (!name) {
        this.showToast('Please enter a collection name', 'error');
        return;
      }

      await window.clipStorage.saveCollection({ name, icon, color });
      await this.loadData();
      this.populateCollectionFilter();
      this.closeModal();
      this.showToast(`Collection "${name}" created`, 'success');
    });
  }

  async showExportModal() {
    document.getElementById('dropdownMenu').style.display = 'none';
    this.openModal('Export Clips', `
      <div class="form-group">
        <label>Format</label>
        <select id="exportFormat">
          <option value="json">JSON</option>
          <option value="markdown">Markdown</option>
          <option value="html">HTML</option>
        </select>
      </div>
      <div class="form-group">
        <label>Collection</label>
        <select id="exportCollection">
          <option value="">All Collections</option>
          ${this.collections.map(c => `<option value="${this.escapeHtml(c.name)}">${c.icon} ${this.escapeHtml(c.name)}</option>`).join('')}
        </select>
      </div>
    `, [
      { text: 'Cancel', action: 'closeModal' },
      { text: 'Export', class: 'btn-primary', action: 'doExport' }
    ]);

    document.getElementById('doExport')?.addEventListener('click', async () => {
      const format = document.getElementById('exportFormat').value;
      const collection = document.getElementById('exportCollection').value;
      const data = await window.clipStorage.exportClips(format, collection);

      const extensions = { json: 'json', markdown: 'md', html: 'html' };
      const mimeTypes = { json: 'application/json', markdown: 'text/markdown', html: 'text/html' };

      const blob = new Blob([data], { type: mimeTypes[format] });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `web-clipper-export.${extensions[format]}`;
      a.click();
      URL.revokeObjectURL(url);

      this.closeModal();
      this.showToast('Export downloaded!', 'success');
    });
  }

  showImportModal() {
    document.getElementById('dropdownMenu').style.display = 'none';
    document.getElementById('importFileInput').click();
  }

  async handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const text = await file.text();
    try {
      const imported = await window.clipStorage.importClips(text);
      await this.loadData();
      this.render();
      this.showToast(`Imported ${imported} clips`, 'success');
    } catch (e) {
      this.showToast('Import failed: Invalid file format', 'error');
    }
    event.target.value = '';
  }

  async exportAs(format) {
    document.getElementById('dropdownMenu').style.display = 'none';
    const data = await window.clipStorage.exportClips(format);

    const extensions = { json: 'json', markdown: 'md', html: 'html' };
    const mimeTypes = { json: 'application/json', markdown: 'text/markdown', html: 'text/html' };

    const blob = new Blob([data], { type: mimeTypes[format] });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `web-clipper-export.${extensions[format]}`;
    a.click();
    URL.revokeObjectURL(url);

    this.showToast('Export downloaded!', 'success');
  }

  showCollectionsPanel() {
    document.getElementById('dropdownMenu').style.display = 'none';
    const panel = document.getElementById('collectionsPanel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    this.renderCollections();
  }

  renderCollections() {
    const list = document.getElementById('collectionList');
    list.innerHTML = this.collections.map(col => `
      <div class="collection-item" data-id="${col.id}">
        <div class="collection-icon" style="background:${col.color}20;color:${col.color};">${col.icon}</div>
        <span class="collection-name">${this.escapeHtml(col.name)}</span>
        <span class="collection-count">${this.clips.filter(c => c.collection === col.name).length}</span>
      </div>
    `).join('');

    list.querySelectorAll('.collection-item').forEach(item => {
      item.addEventListener('click', () => {
        this.filterCollection = item.querySelector('.collection-name').textContent;
        document.getElementById('collectionFilter').value = this.filterCollection;
        document.getElementById('collectionsPanel').style.display = 'none';
        this.render();
      });
    });
  }

  populateCollectionFilter() {
    const select = document.getElementById('collectionFilter');
    select.innerHTML = '<option value="">All Collections</option>' +
      this.collections.map(c => `<option value="${this.escapeHtml(c.name)}">${c.icon} ${this.escapeHtml(c.name)}</option>`).join('');
  }

  async deleteClip(id) {
    if (!confirm('Delete this clip?')) return;
    await window.clipStorage.deleteClip(id);
    await this.loadData();
    this.render();
    this.showToast('Clip deleted', 'success');
  }

  async openClip(clip) {
    if (clip.url) {
      chrome.tabs.create({ url: clip.url });
    }
  }

  async deleteCollection(id) {
    if (!confirm('Delete this collection? Clips will be moved to Uncategorized.')) return;
    await window.clipStorage.deleteCollection(id);
    await this.loadData();
    this.populateCollectionFilter();
    this.renderCollections();
    this.showToast('Collection deleted', 'success');
  }

  getFilteredClips() {
    let filtered = [...this.clips];

    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(clip => {
        const text = `${clip.title} ${clip.excerpt} ${(clip.tags || []).join(' ')} ${clip.url}`.toLowerCase();
        return query.split(/\s+/).every(term => text.includes(term));
      });
    }

    if (this.filterCollection) {
      filtered = filtered.filter(c => c.collection === this.filterCollection);
    }

    if (this.filterTag) {
      filtered = filtered.filter(c => (c.tags || []).includes(this.filterTag));
    }

    return this.sortClips(filtered);
  }

  sortClips(clips) {
    const sorted = [...clips];
    switch (this.currentSort) {
      case 'date-desc':
        sorted.sort((a, b) => b.date - a.date);
        break;
      case 'date-asc':
        sorted.sort((a, b) => a.date - b.date);
        break;
      case 'title-asc':
        sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        break;
      case 'title-desc':
        sorted.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
        break;
      case 'source':
        sorted.sort((a, b) => {
          try {
            return new URL(a.url).hostname.localeCompare(new URL(b.url).hostname);
          } catch { return 0; }
        });
        break;
    }
    return sorted;
  }

  async updateStats() {
    const stats = await window.clipStorage.getStats();
    document.getElementById('totalClips').textContent = stats.total;
    document.getElementById('weekClips').textContent = stats.week;
    document.getElementById('storageUsed').textContent = stats.storageUsed;
  }

  formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago';

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  getClipThumbnail(clip) {
    if (clip.thumbnail) return `<img src="${this.escapeHtml(clip.thumbnail)}" alt="">`;
    if (clip.images && clip.images.length > 0 && clip.images[0].src) {
      return `<img src="${this.escapeHtml(clip.images[0].src)}" alt="">`;
    }

    const icons = {
      selection: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12M6 3v4M18 3v4M6 3l12 18M6 21l12-18"/></svg>',
      fullpage: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>',
      article: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
      screenshot: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
      link: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
      image: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>'
    };
    return icons[clip.type] || icons.selection;
  }

  getHostname(url) {
    try { return new URL(url).hostname; } catch { return ''; }
  }

  renderClipCard(clip) {
    const isSelected = this.selectedClips.has(clip.id);
    const hostname = this.getHostname(clip.url);
    const collection = this.collections.find(c => c.name === clip.collection);

    return `
      <div class="clip-card ${isSelected ? 'selected' : ''}" data-id="${clip.id}">
        <div class="checkbox" data-action="select"></div>
        <div class="clip-thumbnail">${this.getClipThumbnail(clip)}</div>
        <div class="clip-info">
          <div class="clip-title">${this.escapeHtml(clip.title || 'Untitled')}</div>
          <div class="clip-url">${this.escapeHtml(hostname)}</div>
          <div class="clip-meta">
            <span class="clip-date">${this.formatDate(clip.date)}</span>
            ${collection ? `<span class="clip-collection" style="--col-color:${collection.color}">${collection.icon} ${this.escapeHtml(clip.collection)}</span>` : ''}
          </div>
          ${(clip.tags && clip.tags.length > 0) ? `
            <div class="clip-tags">
              ${clip.tags.slice(0, 3).map(t => `<span class="clip-tag">${this.escapeHtml(t)}</span>`).join('')}
              ${clip.tags.length > 3 ? `<span class="clip-tag">+${clip.tags.length - 3}</span>` : ''}
            </div>
          ` : ''}
        </div>
        <div class="clip-actions-row">
          <button class="clip-action-btn" data-action="open" title="Open">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </button>
          <button class="clip-action-btn" data-action="edit" title="Edit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="clip-action-btn" data-action="copy" title="Copy Markdown">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
          <button class="clip-action-btn" data-action="delete" title="Delete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    `;
  }

  render() {
    const filtered = this.getFilteredClips();
    const clipList = document.getElementById('clipList');
    const emptyState = document.getElementById('emptyState');

    this.populateCollectionFilter();
    this.updateStats();

    if (filtered.length === 0) {
      clipList.innerHTML = '';
      clipList.appendChild(emptyState);
      emptyState.style.display = 'flex';
      return;
    }

    emptyState.style.display = 'none';
    clipList.innerHTML = filtered.map(clip => this.renderClipCard(clip)).join('');

    clipList.querySelectorAll('.clip-card').forEach(card => {
      const clipId = card.dataset.id;

      card.addEventListener('click', (e) => {
        const actionBtn = e.target.closest('.clip-action-btn');
        const checkbox = e.target.closest('[data-action="select"]');

        if (checkbox) {
          this.toggleClipSelection(clipId);
          return;
        }

        if (actionBtn) {
          e.stopPropagation();
          const action = actionBtn.dataset.action;
          const clip = this.clips.find(c => c.id === clipId);
          switch (action) {
            case 'open': this.openClip(clip); break;
            case 'edit': this.showEditModal(clip); break;
            case 'copy': this.copyClipMarkdown(clip); break;
            case 'delete': this.deleteClip(clipId); break;
          }
          return;
        }

        if (!this.batchMode) {
          const clip = this.clips.find(c => c.id === clipId);
          this.showClipDetail(clip);
        }
      });
    });
  }

  async copyClipMarkdown(clip) {
    try {
      await navigator.clipboard.writeText(clip.markdown || clip.content || '');
      this.showToast('Markdown copied to clipboard', 'success');
    } catch (e) {
      this.showToast('Failed to copy', 'error');
    }
  }

  showEditModal(clip) {
    this.openModal('Edit Clip', `
      <div class="form-group">
        <label>Title</label>
        <input type="text" id="editTitle" value="${this.escapeHtml(clip.title || '')}">
      </div>
      <div class="form-group">
        <label>Collection</label>
        <select id="editCollection">
          ${this.collections.map(c =>
            `<option value="${this.escapeHtml(c.name)}" ${c.name === clip.collection ? 'selected' : ''}>${c.icon} ${this.escapeHtml(c.name)}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Tags</label>
        <input type="text" id="editTags" value="${(clip.tags || []).join(', ')}" placeholder="Comma separated tags">
      </div>
      <div class="form-group">
        <label>Annotation</label>
        <textarea id="editAnnotation" rows="3">${this.escapeHtml(clip.annotation || '')}</textarea>
      </div>
    `, [
      { text: 'Cancel', action: 'closeModal' },
      { text: 'Save', class: 'btn-primary', action: 'saveEdit' }
    ]);

    document.getElementById('saveEdit')?.addEventListener('click', async () => {
      const title = document.getElementById('editTitle').value.trim();
      const collection = document.getElementById('editCollection').value;
      const tags = document.getElementById('editTags').value.split(',').map(t => t.trim()).filter(t => t);
      const annotation = document.getElementById('editAnnotation').value;

      await window.clipStorage.updateClip(clip.id, { title, collection, tags, annotation });
      await this.loadData();
      this.render();
      this.closeModal();
      this.showToast('Clip updated', 'success');
    });
  }

  showClipDetail(clip) {
    const preview = (clip.excerpt || clip.content || '').substring(0, 800);

    this.openModal(clip.title || 'Untitled', `
      <div style="margin-bottom:12px;">
        <div style="font-size:11px;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Source</div>
        <a href="${this.escapeHtml(clip.url || '#')}" target="_blank" style="color:var(--accent-color);font-size:13px;text-decoration:none;word-break:break-all;">${this.escapeHtml(clip.url || '')}</a>
      </div>
      ${clip.metadata?.author ? `<div style="margin-bottom:12px;"><div style="font-size:11px;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Author</div><div style="font-size:13px;">${this.escapeHtml(clip.metadata.author)}</div></div>` : ''}
      <div style="margin-bottom:12px;">
        <div style="font-size:11px;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Clipped</div>
        <div style="font-size:13px;">${new Date(clip.date).toLocaleString()}</div>
      </div>
      ${clip.tags && clip.tags.length ? `
        <div style="margin-bottom:12px;">
          <div style="font-size:11px;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Tags</div>
          <div class="clip-tags">${clip.tags.map(t => `<span class="clip-tag">${this.escapeHtml(t)}</span>`).join('')}</div>
        </div>
      ` : ''}
      ${clip.annotation ? `
        <div style="margin-bottom:12px;">
          <div style="font-size:11px;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Note</div>
          <div style="font-size:13px;background:var(--bg-secondary);padding:10px;border-radius:6px;white-space:pre-wrap;">${this.escapeHtml(clip.annotation)}</div>
        </div>
      ` : ''}
      <div>
        <div style="font-size:11px;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Content Preview</div>
        <div class="clip-preview">${preview}${preview.length >= 800 ? '...' : ''}</div>
      </div>
    `, [
      { text: 'Close', action: 'closeModal' },
      { text: 'Open Source', class: 'btn-primary', action: 'openSource' },
      { text: 'Copy Markdown', action: 'copyMd' }
    ]);

    document.getElementById('openSource')?.addEventListener('click', () => {
      if (clip.url) chrome.tabs.create({ url: clip.url });
      this.closeModal();
    });

    document.getElementById('copyMd')?.addEventListener('click', () => {
      this.copyClipMarkdown(clip);
      this.closeModal();
    });
  }

  openModal(title, bodyHtml, buttons = []) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = bodyHtml;
    document.getElementById('modalFooter').innerHTML = buttons.map(b =>
      `<button class="btn ${b.class || ''}" id="${b.action}">${b.text}</button>`
    ).join('');
    document.getElementById('modal').style.display = 'block';

    buttons.forEach(b => {
      if (b.action === 'closeModal') {
        document.getElementById(b.action)?.addEventListener('click', () => this.closeModal());
      }
    });
  }

  closeModal() {
    document.getElementById('modal').style.display = 'none';
  }

  showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new WebClipperPopup();
});
