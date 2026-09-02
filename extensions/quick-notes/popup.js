/**
 * Quick Notes - Popup Script
 * Manages the note list UI in the extension popup
 */

document.addEventListener('DOMContentLoaded', () => {
  const popup = new QuickNotesPopup();
  popup.init();
});

class QuickNotesPopup {
  constructor() {
    this.notes = [];
    this.filteredNotes = [];
    this.allTags = [];
    this.activeTag = null;
    this.currentSort = 'modified';
    this.searchQuery = '';
    this.debounceTimer = null;
  }

  async init() {
    this.bindElements();
    this.bindEvents();
    await this.loadNotes();
    await this.loadTags();
  }

  bindElements() {
    this.notesList = document.getElementById('notes-list');
    this.searchInput = document.getElementById('search-input');
    this.sortSelect = document.getElementById('sort-select');
    this.tagInput = document.getElementById('tag-input');
    this.tagsContainer = document.getElementById('tags-container');
    this.noteCountDisplay = document.getElementById('note-count-display');
    this.btnNewNote = document.getElementById('btn-new-note');
    this.btnExport = document.getElementById('btn-export');
    this.btnImport = document.getElementById('btn-import');
    this.importFileInput = document.getElementById('import-file-input');
  }

  bindEvents() {
    this.btnNewNote.addEventListener('click', () => this.createNewNote());

    this.searchInput.addEventListener('input', (e) => {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.searchQuery = e.target.value;
        this.filterNotes();
      }, 200);
    });

    this.sortSelect.addEventListener('change', (e) => {
      this.currentSort = e.target.value;
      this.filterNotes();
    });

    this.tagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.value.trim()) {
        this.filterByTag(e.target.value.trim());
        e.target.value = '';
      }
    });

    this.btnExport.addEventListener('click', () => this.showExportMenu());

    this.btnImport.addEventListener('click', () => {
      this.importFileInput.click();
    });

    this.importFileInput.addEventListener('change', (e) => {
      this.handleImport(e);
    });
  }

  async loadNotes() {
    const response = await this.sendMessage({ type: 'get-notes' });
    if (response.success) {
      this.notes = response.notes;
      this.filterNotes();
    }
  }

  async loadTags() {
    const response = await this.sendMessage({ type: 'get-tags' });
    if (response.success) {
      this.allTags = response.tags;
      this.renderTags();
    }
  }

  filterNotes() {
    let filtered = [...this.notes];

    // Apply search filter
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(note =>
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query) ||
        note.tags.some(t => t.toLowerCase().includes(query))
      );
    }

    // Apply tag filter
    if (this.activeTag) {
      filtered = filtered.filter(note =>
        note.tags.includes(this.activeTag)
      );
    }

    // Apply sort
    filtered = this.sortNotes(filtered);

    this.filteredNotes = filtered;
    this.renderNotes();
    this.updateNoteCount();
  }

  sortNotes(notes) {
    const sorted = [...notes];
    switch (this.currentSort) {
      case 'modified':
        return sorted.sort((a, b) => b.updatedAt - a.updatedAt);
      case 'created':
        return sorted.sort((a, b) => b.createdAt - a.createdAt);
      case 'title':
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      default:
        return sorted;
    }
  }

  renderNotes() {
    if (this.filteredNotes.length === 0) {
      this.notesList.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          <p>${this.searchQuery ? 'No matching notes' : 'No notes yet'}</p>
          <span>${this.searchQuery ? 'Try a different search term' : 'Create your first note or press Alt+N on any page'}</span>
        </div>
      `;
      return;
    }

    this.notesList.innerHTML = this.filteredNotes.map(note => this.renderNoteCard(note)).join('');

    // Bind note card events
    this.notesList.querySelectorAll('.note-card').forEach(card => {
      const id = card.dataset.id;

      card.addEventListener('click', (e) => {
        if (e.target.closest('.note-action-btn')) return;
        this.openNote(id);
      });

      card.querySelector('.pin-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.togglePin(id);
      });

      card.querySelector('.delete-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteNote(id);
      });
    });
  }

  renderNoteCard(note) {
    const preview = this.getPreview(note.content);
    const date = this.formatDate(note.updatedAt);
    const tagsHtml = note.tags.slice(0, 3).map(t =>
      `<span class="note-tag">${this.escapeHtml(t)}</span>`
    ).join('');

    return `
      <div class="note-card ${note.pinned ? 'pinned' : ''}" data-id="${note.id}">
        <div class="note-card-header">
          <div class="note-title">${this.escapeHtml(note.title)}</div>
          <div class="note-card-actions">
            <button class="note-action-btn pin-btn ${note.pinned ? 'pin-active' : ''}" title="${note.pinned ? 'Unpin' : 'Pin'}">
              <svg viewBox="0 0 24 24" fill="${note.pinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z"></path>
              </svg>
            </button>
            <button class="note-action-btn delete-btn" title="Delete">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
        <div class="note-preview">${this.escapeHtml(preview)}</div>
        <div class="note-meta">
          <span class="note-date">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            ${date}
          </span>
          <div class="note-tags">${tagsHtml}</div>
        </div>
      </div>
    `;
  }

  renderTags() {
    this.tagsContainer.innerHTML = this.allTags.map(tag => `
      <span class="tag-pill ${this.activeTag === tag ? 'active' : ''}" data-tag="${this.escapeHtml(tag)}">
        ${this.escapeHtml(tag)}
      </span>
    `).join('');

    this.tagsContainer.querySelectorAll('.tag-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const tag = pill.dataset.tag;
        if (this.activeTag === tag) {
          this.activeTag = null;
        } else {
          this.activeTag = tag;
        }
        this.filterNotes();
        this.renderTags();
      });
    });
  }

  filterByTag(tag) {
    if (this.activeTag === tag) {
      this.activeTag = null;
    } else {
      this.activeTag = tag;
    }
    this.filterNotes();
    this.renderTags();
  }

  updateNoteCount() {
    const total = this.notes.length;
    const showing = this.filteredNotes.length;
    if (this.searchQuery || this.activeTag) {
      this.noteCountDisplay.textContent = `Showing ${showing} of ${total} notes`;
    } else {
      this.noteCountDisplay.textContent = `${total} note${total !== 1 ? 's' : ''}`;
    }
  }

  async createNewNote() {
    const response = await this.sendMessage({
      type: 'create-note',
      data: { title: 'New Note', content: '' }
    });

    if (response.success) {
      this.notes.unshift(response.note);
      this.filterNotes();
      this.loadTags();

      // Send message to content script to show widget
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'show-widget',
          note: response.note
        }).catch(() => {});
      }
    }
  }

  async openNote(id) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'open-note',
        noteId: id
      }).catch(() => {
        // If content script not loaded, open in new tab
        chrome.tabs.create({ url: `popup.html?note=${id}` });
      });
    }
    window.close();
  }

  async togglePin(id) {
    const note = this.notes.find(n => n.id === id);
    if (note) {
      note.pinned = !note.pinned;
      await this.sendMessage({
        type: 'update-note',
        id,
        data: { pinned: note.pinned }
      });
      this.filterNotes();
    }
  }

  async deleteNote(id) {
    if (!confirm('Delete this note?')) return;

    await this.sendMessage({ type: 'delete-note', id });
    this.notes = this.notes.filter(n => n.id !== id);
    this.filterNotes();
    this.loadTags();
  }

  showExportMenu() {
    const existing = document.querySelector('.export-dropdown');
    if (existing) {
      existing.remove();
      return;
    }

    const dropdown = document.createElement('div');
    dropdown.className = 'export-dropdown';
    dropdown.innerHTML = `
      <div class="export-menu">
        <button class="export-menu-item" data-format="json">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          Export as JSON
        </button>
        <button class="export-menu-item" data-format="markdown">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          Export as Markdown
        </button>
      </div>
    `;

    document.body.appendChild(dropdown);

    dropdown.addEventListener('click', (e) => {
      const item = e.target.closest('.export-menu-item');
      if (item) {
        this.exportNotes(item.dataset.format);
        dropdown.remove();
      }
    });

    dropdown.addEventListener('click', (e) => {
      if (e.target === dropdown) {
        dropdown.remove();
      }
    });
  }

  async exportNotes(format) {
    let data, filename, type;

    if (format === 'json') {
      const response = await this.sendMessage({ type: 'export-json' });
      data = response.data;
      filename = `quick-notes-export-${Date.now()}.json`;
      type = 'application/json';
    } else {
      const response = await this.sendMessage({ type: 'export-markdown' });
      data = response.data;
      filename = `quick-notes-export-${Date.now()}.md`;
      type = 'text/markdown';
    }

    this.downloadFile(data, filename, type);
  }

  async handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const text = await file.text();
    let response;

    if (file.name.endsWith('.json')) {
      response = await this.sendMessage({ type: 'import-json', data: text });
    } else {
      response = await this.sendMessage({ type: 'import-markdown', data: text });
    }

    if (response.success && response.result.success) {
      alert(`Successfully imported ${response.result.imported} notes`);
      await this.loadNotes();
      await this.loadTags();
    } else {
      alert(`Import failed: ${response.result?.error || 'Unknown error'}`);
    }

    this.importFileInput.value = '';
  }

  downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  getPreview(content) {
    return content
      .replace(/#{1,6}\s+/g, '')
      .replace(/[*_~`]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/!\[[^\]]*\]\([^)]+\)/g, '[Image]')
      .replace(/\n/g, ' ')
      .trim()
      .substring(0, 150) || 'Empty note';
  }

  formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;

    return date.toLocaleDateString();
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  sendMessage(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response) => {
        resolve(response || { success: false });
      });
    });
  }
}
