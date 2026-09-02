/**
 * Quick Notes - Content Script
 * Creates and manages the floating note widget on web pages
 */

(function() {
  'use strict';

  // Prevent multiple injections
  if (window.__quickNotesInjected) return;
  window.__quickNotesInjected = true;

  // ==========================================
  // Configuration
  // ==========================================

  const CONFIG = {
    WIDGET_ID: 'quick-notes-widget',
    MINI_BTN_ID: 'quick-notes-mini-btn',
    PANEL_ID: 'quick-notes-panel',
    EDITOR_ID: 'quick-notes-editor',
    PREVIEW_ID: 'quick-notes-preview',
    TOOLBAR_ID: 'quick-notes-toolbar',
    HEADER_ID: 'quick-notes-header',
    STATUS_ID: 'quick-notes-status',
    TAGS_ID: 'quick-notes-tags',
    TAG_INPUT_ID: 'quick-notes-tag-input',
    SELECT_BAR_ID: 'quick-notes-select-bar',
    NOTE_SELECT_ID: 'quick-notes-note-select',
    NEW_NOTE_BTN_ID: 'quick-notes-new-note-btn',
    RESIZE_ID: 'quick-notes-resize',
    PIN_BTN_CLASS: 'note-pin-btn',
    DEBOUNCE_DELAY: 500,
    DEFAULT_WIDTH: 400,
    DEFAULT_HEIGHT: 500,
    MIN_WIDTH: 300,
    MIN_HEIGHT: 300
  };

  // ==========================================
  // QuickNotesWidget Class
  // ==========================================

  class QuickNotesWidget {
    constructor() {
      this.widget = null;
      this.panel = null;
      this.editor = null;
      this.preview = null;
      this.miniBtn = null;

      this.currentNote = null;
      this.allNotes = [];
      this.isDragging = false;
      this.isResizing = false;
      this.isMinimized = true;
      this.isVisible = false;
      this.isPreviewMode = false;
      this.saveTimeout = null;

      this.dragOffset = { x: 0, y: 0 };
      this.resizeStart = { x: 0, y: 0, width: 0, height: 0 };

      this.domain = window.location.hostname;
    }

    async init() {
      await this.loadState();
      this.createWidget();
      this.bindEvents();
      this.restorePosition();

      // Listen for messages from popup/background
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        this.handleMessage(message, sender, sendResponse);
      });

      // Load notes for selection
      await this.loadNotes();
    }

    // ==========================================
    // Widget Creation
    // ==========================================

    createWidget() {
      // Main container
      this.widget = document.createElement('div');
      this.widget.id = CONFIG.WIDGET_ID;
      this.widget.className = this.isVisible ? 'visible' : 'hidden';

      // Mini button (collapsed state)
      this.miniBtn = document.createElement('button');
      this.miniBtn.id = CONFIG.MINI_BTN_ID;
      this.miniBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
      `;
      this.miniBtn.title = 'Open Quick Notes (Alt+N)';

      // Panel (expanded state)
      this.panel = document.createElement('div');
      this.panel.id = CONFIG.PANEL_ID;
      this.panel.style.display = 'none';

      this.panel.innerHTML = `
        <div id="${CONFIG.RESIZE_ID}"></div>
        <div id="${CONFIG.HEADER_ID}">
          <h3>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            Quick Notes
          </h3>
          <div class="header-buttons">
            <button class="header-btn" id="qn-preview-toggle" title="Toggle preview">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </button>
            <button class="header-btn" id="qn-minimize" title="Minimize">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>

        <div id="${CONFIG.SELECT_BAR_ID}">
          <select id="${CONFIG.NOTE_SELECT_ID}"></select>
          <button id="${CONFIG.NEW_NOTE_BTN_ID}" title="New note">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>

        <div id="${CONFIG.TOOLBAR_ID}">
          <button class="toolbar-btn" data-action="heading1" title="Heading 1">
            <strong>H1</strong>
          </button>
          <button class="toolbar-btn" data-action="heading2" title="Heading 2">
            <strong>H2</strong>
          </button>
          <button class="toolbar-btn" data-action="heading3" title="Heading 3">
            <strong>H3</strong>
          </button>
          <div class="toolbar-divider"></div>
          <button class="toolbar-btn" data-action="bold" title="Bold (Ctrl+B)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
              <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
            </svg>
          </button>
          <button class="toolbar-btn" data-action="italic" title="Italic (Ctrl+I)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="19" y1="4" x2="10" y2="4"></line>
              <line x1="14" y1="20" x2="5" y2="20"></line>
              <line x1="15" y1="4" x2="9" y2="20"></line>
            </svg>
          </button>
          <button class="toolbar-btn" data-action="strikethrough" title="Strikethrough">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 4H9a3 3 0 0 0-2.83 4"></path>
              <path d="M14 12a4 4 0 0 1 0 8H6"></path>
              <line x1="4" y1="12" x2="20" y2="12"></line>
            </svg>
          </button>
          <div class="toolbar-divider"></div>
          <button class="toolbar-btn" data-action="ul" title="Bullet list">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="8" y1="6" x2="21" y2="6"></line>
              <line x1="8" y1="12" x2="21" y2="12"></line>
              <line x1="8" y1="18" x2="21" y2="18"></line>
              <line x1="3" y1="6" x2="3.01" y2="6"></line>
              <line x1="3" y1="12" x2="3.01" y2="12"></line>
              <line x1="3" y1="18" x2="3.01" y2="18"></line>
            </svg>
          </button>
          <button class="toolbar-btn" data-action="ol" title="Numbered list">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="10" y1="6" x2="21" y2="6"></line>
              <line x1="10" y1="12" x2="21" y2="12"></line>
              <line x1="10" y1="18" x2="21" y2="18"></line>
              <path d="M4 6h1v4"></path>
              <path d="M4 10h2"></path>
              <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path>
            </svg>
          </button>
          <button class="toolbar-btn" data-action="checklist" title="Task list">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 11l3 3L22 4"></path>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
            </svg>
          </button>
          <div class="toolbar-divider"></div>
          <button class="toolbar-btn" data-action="code" title="Inline code">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="16 18 22 12 16 6"></polyline>
              <polyline points="8 6 2 12 8 18"></polyline>
            </svg>
          </button>
          <button class="toolbar-btn" data-action="codeblock" title="Code block">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <polyline points="9 8 5 12 9 16"></polyline>
              <polyline points="15 8 19 12 15 16"></polyline>
            </svg>
          </button>
          <button class="toolbar-btn" data-action="link" title="Link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </svg>
          </button>
          <button class="toolbar-btn" data-action="image" title="Image">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
          </button>
          <button class="toolbar-btn" data-action="quote" title="Blockquote">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z"/>
            </svg>
          </button>
          <button class="toolbar-btn" data-action="hr" title="Horizontal rule">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="2" y1="12" x2="22" y2="12"></line>
            </svg>
          </button>
        </div>

        <div id="${CONFIG.TAGS_ID}">
          <input type="text" id="${CONFIG.TAG_INPUT_ID}" placeholder="Add tags (comma separated)...">
        </div>

        <div id="quick-notes-editor-container">
          <div id="${CONFIG.PIN_BTN_CLASS}" class="${CONFIG.PIN_BTN_CLASS}" title="Pin note">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z"></path>
            </svg>
          </div>
          <textarea id="${CONFIG.EDITOR_ID}" placeholder="Start writing your note in Markdown...

# Heading 1
## Heading 2

**Bold text** and *italic text*

- List item
- Another item

> Blockquote

\`inline code\`

```javascript
// Code block
console.log('Hello!');
```"></textarea>
          <div id="${CONFIG.PREVIEW_ID}" class="qn-preview"></div>
        </div>

        <div id="${CONFIG.STATUS_ID}">
          <div class="status-left">
            <span class="save-indicator saved">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              Saved
            </span>
          </div>
          <div class="status-right">
            <span id="qn-word-count">0 words</span>
            <span id="qn-char-count">0 chars</span>
          </div>
        </div>
      `;

      this.widget.appendChild(this.miniBtn);
      this.widget.appendChild(this.panel);
      document.body.appendChild(this.widget);

      // Get references
      this.editor = document.getElementById(CONFIG.EDITOR_ID);
      this.preview = document.getElementById(CONFIG.PREVIEW_ID);
    }

    // ==========================================
    // Event Binding
    // ==========================================

    bindEvents() {
      // Mini button click
      this.miniBtn.addEventListener('click', () => this.toggleWidget());

      // Header buttons
      document.getElementById('qn-minimize').addEventListener('click', () => this.minimize());
      document.getElementById('qn-preview-toggle').addEventListener('click', () => this.togglePreview());

      // Drag handling
      document.getElementById(CONFIG.HEADER_ID).addEventListener('mousedown', (e) => this.startDrag(e));

      // Resize handling
      document.getElementById(CONFIG.RESIZE_ID).addEventListener('mousedown', (e) => this.startResize(e));

      // Editor input
      this.editor.addEventListener('input', () => this.handleEditorInput());

      // Keyboard shortcuts
      this.editor.addEventListener('keydown', (e) => this.handleKeyboard(e));

      // Note selection
      document.getElementById(CONFIG.NOTE_SELECT_ID).addEventListener('change', (e) => {
        this.loadNoteById(e.target.value);
      });

      // New note button
      document.getElementById(CONFIG.NEW_NOTE_BTN_ID).addEventListener('click', () => this.createNewNote());

      // Toolbar buttons
      document.querySelectorAll('.toolbar-btn').forEach(btn => {
        btn.addEventListener('click', () => this.handleToolbarAction(btn.dataset.action));
      });

      // Tag input
      document.getElementById(CONFIG.TAG_INPUT_ID).addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault();
          this.addTag(e.target.value.trim());
          e.target.value = '';
        }
      });

      // Pin button
      document.getElementById(CONFIG.PIN_BTN_CLASS).addEventListener('click', () => this.togglePin());

      // Global keyboard shortcut
      document.addEventListener('keydown', (e) => {
        if (e.altKey && e.key === 'n') {
          e.preventDefault();
          this.toggleWidget();
        }
      });

      // Mouse events for drag/resize
      document.addEventListener('mousemove', (e) => {
        if (this.isDragging) this.drag(e);
        if (this.isResizing) this.resize(e);
      });

      document.addEventListener('mouseup', () => {
        this.isDragging = false;
        this.isResizing = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      });
    }

    // ==========================================
    // Widget State Management
    // ==========================================

    async toggleWidget() {
      if (this.isVisible) {
        this.minimize();
      } else {
        this.show();
      }
    }

    show() {
      this.isVisible = true;
      this.isMinimized = false;
      this.miniBtn.style.display = 'none';
      this.panel.style.display = 'flex';
      this.widget.classList.remove('hidden');
      this.widget.classList.add('visible');

      // Load current note or create new
      if (!this.currentNote) {
        this.createNewNote();
      }

      this.saveState();
    }

    minimize() {
      this.isVisible = false;
      this.isMinimized = true;
      this.miniBtn.style.display = 'flex';
      this.panel.style.display = 'none';
      this.widget.classList.remove('visible');
      this.widget.classList.add('hidden');

      this.saveState();
    }

    // ==========================================
    // Drag & Resize
    // ==========================================

    startDrag(e) {
      if (e.target.closest('.header-btn')) return;
      this.isDragging = true;
      this.dragOffset = {
        x: e.clientX - this.widget.getBoundingClientRect().left,
        y: e.clientY - this.widget.getBoundingClientRect().top
      };
      document.body.style.userSelect = 'none';
    }

    drag(e) {
      if (!this.isDragging) return;
      const x = e.clientX - this.dragOffset.x;
      const y = e.clientY - this.dragOffset.y;

      // Constrain to viewport
      const maxX = window.innerWidth - this.widget.offsetWidth;
      const maxY = window.innerHeight - this.widget.offsetHeight;

      this.widget.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
      this.widget.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
      this.widget.style.right = 'auto';
      this.widget.style.bottom = 'auto';

      this.savePosition();
    }

    startResize(e) {
      e.preventDefault();
      this.isResizing = true;
      this.resizeStart = {
        x: e.clientX,
        y: e.clientY,
        width: this.panel.offsetWidth,
        height: this.panel.offsetHeight
      };
      document.body.style.cursor = 'nw-resize';
      document.body.style.userSelect = 'none';
    }

    resize(e) {
      if (!this.isResizing) return;

      const deltaX = this.resizeStart.x - e.clientX;
      const deltaY = e.clientY - this.resizeStart.y;

      const newWidth = Math.max(CONFIG.MIN_WIDTH, this.resizeStart.width + deltaX);
      const newHeight = Math.max(CONFIG.MIN_HEIGHT, this.resizeStart.height + deltaY);

      this.panel.style.width = `${newWidth}px`;
      this.panel.style.height = `${newHeight}px`;

      this.saveState({ width: newWidth, height: newHeight });
    }

    // ==========================================
    // Note Management
    // ==========================================

    async loadNotes() {
      const response = await this.sendMessage({ type: 'get-notes' });
      if (response.success) {
        this.allNotes = response.notes;
        this.renderNoteSelect();
      }
    }

    renderNoteSelect() {
      const select = document.getElementById(CONFIG.NOTE_SELECT_ID);
      select.innerHTML = this.allNotes.map(note => `
        <option value="${note.id}" ${this.currentNote?.id === note.id ? 'selected' : ''}>
          ${this.escapeHtml(note.title)}
        </option>
      `).join('');
    }

    async loadNoteById(id) {
      const note = this.allNotes.find(n => n.id === id);
      if (note) {
        this.currentNote = note;
        this.editor.value = note.content;
        this.updateTags(note.tags);
        this.updatePinButton(note.pinned);
        this.updateWordCount();
        this.updatePreview();
      }
    }

    async createNewNote() {
      const response = await this.sendMessage({
        type: 'create-note',
        data: { title: 'New Note', content: '' }
      });

      if (response.success) {
        this.currentNote = response.note;
        this.allNotes.unshift(response.note);
        this.renderNoteSelect();
        this.editor.value = '';
        this.updateTags([]);
        this.updatePinButton(false);
        this.updateWordCount();
        this.editor.focus();
      }
    }

    async saveCurrentNote() {
      if (!this.currentNote) return;

      const saveIndicator = document.querySelector('.save-indicator');
      saveIndicator.className = 'save-indicator saving';
      saveIndicator.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
        </svg>
        Saving...
      `;

      // Extract title from first line or heading
      let title = 'Untitled Note';
      const firstLine = this.editor.value.split('\n')[0];
      if (firstLine) {
        title = firstLine.replace(/^#+\s*/, '').substring(0, 100) || 'Untitled Note';
      }

      await this.sendMessage({
        type: 'update-note',
        id: this.currentNote.id,
        data: {
          title,
          content: this.editor.value
        }
      });

      // Update local state
      this.currentNote.title = title;
      this.currentNote.content = this.editor.value;
      this.currentNote.updatedAt = Date.now();

      // Update select
      this.renderNoteSelect();

      setTimeout(() => {
        saveIndicator.className = 'save-indicator saved';
        saveIndicator.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          Saved
        `;
      }, 500);
    }

    async togglePin() {
      if (!this.currentNote) return;

      this.currentNote.pinned = !this.currentNote.pinned;
      await this.sendMessage({
        type: 'update-note',
        id: this.currentNote.id,
        data: { pinned: this.currentNote.pinned }
      });

      this.updatePinButton(this.currentNote.pinned);
    }

    updatePinButton(pinned) {
      const btn = document.getElementById(CONFIG.PIN_BTN_CLASS);
      if (pinned) {
        btn.classList.add('pinned');
        btn.querySelector('svg').setAttribute('fill', 'currentColor');
      } else {
        btn.classList.remove('pinned');
        btn.querySelector('svg').setAttribute('fill', 'none');
      }
    }

    // ==========================================
    // Editor Operations
    // ==========================================

    handleEditorInput() {
      // Debounced auto-save
      clearTimeout(this.saveTimeout);
      this.saveTimeout = setTimeout(() => {
        this.saveCurrentNote();
      }, CONFIG.DEBOUNCE_DELAY);

      this.updateWordCount();
      this.updatePreview();
    }

    handleKeyboard(e) {
      // Ctrl/Cmd + B for bold
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        this.handleToolbarAction('bold');
      }

      // Ctrl/Cmd + I for italic
      if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault();
        this.handleToolbarAction('italic');
      }

      // Ctrl/Cmd + K for link
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        this.handleToolbarAction('link');
      }

      // Tab for indentation
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = this.editor.selectionStart;
        const end = this.editor.selectionEnd;
        this.editor.value = this.editor.value.substring(0, start) + '  ' + this.editor.value.substring(end);
        this.editor.selectionStart = this.editor.selectionEnd = start + 2;
        this.handleEditorInput();
      }
    }

    handleToolbarAction(action) {
      const start = this.editor.selectionStart;
      const end = this.editor.selectionEnd;
      const selectedText = this.editor.value.substring(start, end);
      let replacement = '';
      let cursorOffset = 0;

      switch (action) {
        case 'heading1':
          replacement = `# ${selectedText || 'Heading 1'}`;
          cursorOffset = selectedText ? 0 : 2;
          break;
        case 'heading2':
          replacement = `## ${selectedText || 'Heading 2'}`;
          cursorOffset = selectedText ? 0 : 3;
          break;
        case 'heading3':
          replacement = `### ${selectedText || 'Heading 3'}`;
          cursorOffset = selectedText ? 0 : 4;
          break;
        case 'bold':
          replacement = `**${selectedText || 'bold text'}**`;
          cursorOffset = selectedText ? 0 : 2;
          break;
        case 'italic':
          replacement = `*${selectedText || 'italic text'}*`;
          cursorOffset = selectedText ? 0 : 1;
          break;
        case 'strikethrough':
          replacement = `~~${selectedText || 'strikethrough'}~~`;
          cursorOffset = selectedText ? 0 : 2;
          break;
        case 'ul':
          replacement = `- ${selectedText || 'List item'}`;
          cursorOffset = selectedText ? 0 : 2;
          break;
        case 'ol':
          replacement = `1. ${selectedText || 'List item'}`;
          cursorOffset = selectedText ? 0 : 3;
          break;
        case 'checklist':
          replacement = `- [ ] ${selectedText || 'Task item'}`;
          cursorOffset = selectedText ? 0 : 6;
          break;
        case 'code':
          replacement = `\`${selectedText || 'code'}\``;
          cursorOffset = selectedText ? 0 : 1;
          break;
        case 'codeblock':
          replacement = `\`\`\`\n${selectedText || 'code block'}\n\`\`\``;
          cursorOffset = selectedText ? 0 : 4;
          break;
        case 'link':
          replacement = `[${selectedText || 'link text'}](url)`;
          cursorOffset = selectedText ? -1 : 1;
          break;
        case 'image':
          replacement = `![${selectedText || 'alt text'}](url)`;
          cursorOffset = selectedText ? -1 : 1;
          break;
        case 'quote':
          replacement = `> ${selectedText || 'Blockquote'}`;
          cursorOffset = selectedText ? 0 : 2;
          break;
        case 'hr':
          replacement = `\n---\n`;
          cursorOffset = 0;
          break;
        default:
          return;
      }

      this.editor.value = this.editor.value.substring(0, start) + replacement + this.editor.value.substring(end);
      this.editor.selectionStart = this.editor.selectionEnd = start + replacement.length + cursorOffset;
      this.editor.focus();
      this.handleEditorInput();
    }

    // ==========================================
    // Preview
    // ==========================================

    togglePreview() {
      this.isPreviewMode = !this.isPreviewMode;
      const toggleBtn = document.getElementById('qn-preview-toggle');

      if (this.isPreviewMode) {
        this.editor.style.display = 'none';
        this.preview.classList.add('visible');
        toggleBtn.classList.add('active');
        this.updatePreview();
      } else {
        this.editor.style.display = 'block';
        this.preview.classList.remove('visible');
        toggleBtn.classList.remove('active');
      }
    }

    updatePreview() {
      if (this.isPreviewMode) {
        const html = markdownParser.parse(this.editor.value);
        this.preview.innerHTML = html;
      }
    }

    // ==========================================
    // Tags
    // ==========================================

    updateTags(tags) {
      const container = document.getElementById(CONFIG.TAGS_ID);
      const input = document.getElementById(CONFIG.TAG_INPUT_ID);

      // Remove existing badges
      container.querySelectorAll('.tag-badge').forEach(b => b.remove());

      // Add tag badges before input
      (tags || []).forEach(tag => {
        const badge = document.createElement('span');
        badge.className = 'tag-badge';
        badge.innerHTML = `${this.escapeHtml(tag)}<button>&times;</button>`;
        badge.querySelector('button').addEventListener('click', () => this.removeTag(tag));
        container.insertBefore(badge, input);
      });
    }

    async addTag(tag) {
      if (!tag || !this.currentNote) return;

      const tags = [...(this.currentNote.tags || [])];
      if (!tags.includes(tag)) {
        tags.push(tag);
        this.currentNote.tags = tags;
        await this.sendMessage({
          type: 'update-note',
          id: this.currentNote.id,
          data: { tags }
        });
        this.updateTags(tags);
      }
    }

    async removeTag(tag) {
      if (!this.currentNote) return;

      const tags = (this.currentNote.tags || []).filter(t => t !== tag);
      this.currentNote.tags = tags;
      await this.sendMessage({
        type: 'update-note',
        id: this.currentNote.id,
        data: { tags }
      });
      this.updateTags(tags);
    }

    // ==========================================
    // Utilities
    // ==========================================

    updateWordCount() {
      const text = this.editor.value.trim();
      const words = text ? text.split(/\s+/).length : 0;
      const chars = text.length;

      document.getElementById('qn-word-count').textContent = `${words} word${words !== 1 ? 's' : ''}`;
      document.getElementById('qn-char-count').textContent = `${chars} char${chars !== 1 ? 's' : ''}`;
    }

    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // ==========================================
    // State Persistence
    // ==========================================

    async loadState() {
      try {
        const response = await this.sendMessage({
          type: 'get-widget-state',
          domain: this.domain
        });
        if (response.success && response.state) {
          this.isVisible = response.state.visible || false;
          this.isMinimized = response.state.minimized !== false;
        }
      } catch {}
    }

    async saveState(extra = {}) {
      try {
        await this.sendMessage({
          type: 'set-widget-state',
          domain: this.domain,
          state: {
            visible: this.isVisible,
            minimized: this.isMinimized,
            ...extra
          }
        });
      } catch {}
    }

    async savePosition() {
      const rect = this.widget.getBoundingClientRect();
      try {
        await this.sendMessage({
          type: 'set-position',
          domain: this.domain,
          x: rect.left,
          y: rect.top
        });
      } catch {}
    }

    async restorePosition() {
      try {
        const response = await this.sendMessage({
          type: 'get-position',
          domain: this.domain
        });
        if (response.success && response.position) {
          const { x, y } = response.position;
          if (x !== null && y !== null) {
            this.widget.style.left = `${x}px`;
            this.widget.style.top = `${y}px`;
            this.widget.style.right = 'auto';
            this.widget.style.bottom = 'auto';
          }
        }
      } catch {}
    }

    // ==========================================
    // Message Handling
    // ==========================================

    async handleMessage(message, sender, sendResponse) {
      switch (message.type) {
        case 'show-widget':
          this.show();
          if (message.note) {
            await this.loadNotes();
            await this.loadNoteById(message.note.id);
          }
          sendResponse({ success: true });
          break;

        case 'open-note':
          await this.loadNotes();
          await this.loadNoteById(message.noteId);
          this.show();
          sendResponse({ success: true });
          break;

        case 'note-created':
          await this.loadNotes();
          if (message.note) {
            await this.loadNoteById(message.note.id);
          }
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false });
      }
    }

    sendMessage(message) {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(message, (response) => {
          resolve(response || { success: false });
        });
      });
    }
  }

  // ==========================================
  // Initialize Widget
  // ==========================================

  const widget = new QuickNotesWidget();
  widget.init();
})();
