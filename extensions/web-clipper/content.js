class WebClipperContent {
  constructor() {
    this.floatingToolbar = null;
    this.selectionHighlight = null;
    this.highlightMode = false;
    this.pendingClip = null;
    this.init();
  }

  init() {
    this.createStyles();
    this.setupMessageListener();
  }

  createStyles() {
    if (document.getElementById('web-clipper-content-styles')) return;
    const style = document.createElement('style');
    style.id = 'web-clipper-content-styles';
    style.textContent = `
      .wc-floating-toolbar {
        position: fixed;
        z-index: 2147483647;
        background: #1a1a2e;
        color: #fff;
        border-radius: 10px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        padding: 6px;
        display: flex;
        gap: 4px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
        pointer-events: auto;
        animation: wc-fadeIn 0.15s ease;
      }
      @keyframes wc-fadeIn {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .wc-toolbar-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 14px;
        border: none;
        border-radius: 6px;
        background: transparent;
        color: #fff;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        transition: background 0.15s;
        white-space: nowrap;
      }
      .wc-toolbar-btn:hover {
        background: rgba(255,255,255,0.12);
      }
      .wc-toolbar-btn.primary {
        background: #4a90d9;
      }
      .wc-toolbar-btn.primary:hover {
        background: #5da0e9;
      }
      .wc-toolbar-btn svg {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
      }
      .wc-toolbar-divider {
        width: 1px;
        background: rgba(255,255,255,0.15);
        margin: 4px 2px;
      }
      .wc-selection-highlight {
        background: rgba(74, 144, 217, 0.2);
        border: 2px solid rgba(74, 144, 217, 0.5);
        border-radius: 3px;
        position: relative;
      }
      .wc-preview-modal {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        z-index: 2147483647;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0,0,0,0.6);
        animation: wc-fadeIn 0.2s ease;
      }
      .wc-preview-content {
        background: #fff;
        border-radius: 12px;
        width: 90%;
        max-width: 600px;
        max-height: 80vh;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        display: flex;
        flex-direction: column;
      }
      [data-theme="dark"] .wc-preview-content {
        background: #1a1a2e;
        color: #e0e0e0;
      }
      .wc-preview-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        border-bottom: 1px solid #e0e0e0;
      }
      [data-theme="dark"] .wc-preview-header {
        border-color: #2a2a4a;
      }
      .wc-preview-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }
      .wc-preview-body {
        padding: 20px;
        overflow-y: auto;
        flex: 1;
        font-size: 14px;
        line-height: 1.6;
      }
      .wc-preview-body img {
        max-width: 100%;
        border-radius: 6px;
        margin: 8px 0;
      }
      .wc-preview-body blockquote {
        border-left: 3px solid #4a90d9;
        padding-left: 12px;
        color: #666;
        margin: 8px 0;
      }
      .wc-preview-body code {
        background: #f0f0f0;
        padding: 2px 6px;
        border-radius: 3px;
        font-family: 'Monaco', 'Consolas', monospace;
        font-size: 13px;
      }
      .wc-preview-body pre {
        background: #f5f5f5;
        padding: 12px;
        border-radius: 6px;
        overflow-x: auto;
      }
      .wc-preview-body table {
        width: 100%;
        border-collapse: collapse;
        margin: 8px 0;
      }
      .wc-preview-body th, .wc-preview-body td {
        border: 1px solid #e0e0e0;
        padding: 8px 12px;
        text-align: left;
      }
      .wc-preview-body th {
        background: #f5f5f5;
        font-weight: 600;
      }
      .wc-preview-footer {
        display: flex;
        gap: 8px;
        padding: 12px 20px;
        border-top: 1px solid #e0e0e0;
        background: #f9f9f9;
      }
      [data-theme="dark"] .wc-preview-footer {
        border-color: #2a2a4a;
        background: #16213e;
      }
      .wc-annotation-input {
        width: 100%;
        min-height: 60px;
        padding: 10px;
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        font-size: 13px;
        resize: vertical;
        margin-top: 10px;
        font-family: inherit;
      }
      [data-theme="dark"] .wc-annotation-input {
        background: #16213e;
        border-color: #2a2a4a;
        color: #e0e0e0;
      }
      .wc-highlight-active {
        outline: 2px dashed #f39c12 !important;
        outline-offset: 2px;
        cursor: crosshair !important;
      }
      .wc-highlight-mark {
        background: rgba(243, 156, 18, 0.3);
        border-bottom: 2px solid #f39c12;
        cursor: pointer;
      }
      .wc-toast {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: #1a1a2e;
        color: #fff;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 2147483647;
        box-shadow: 0 4px 16px rgba(0,0,0,0.3);
        animation: wc-fadeIn 0.2s ease;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      .wc-toast.success { border-left: 4px solid #27ae60; }
      .wc-toast.error { border-left: 4px solid #e74c3c; }
    `;
    document.head.appendChild(style);
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      switch (msg.action) {
        case 'getSelection':
          const sel = this.getSelectionData();
          sendResponse(sel);
          break;
        case 'getFullPage':
          const full = window.clipperEngine.extractFullPage();
          sendResponse(full);
          break;
        case 'getArticle':
          const article = window.clipperEngine.extractArticleContentFromPage();
          sendResponse(article);
          break;
        case 'showPreview':
          this.showPreviewModal(msg.clipData);
          sendResponse({ ok: true });
          break;
        case 'showFloatingToolbar':
          this.showFloatingToolbar(msg.position);
          sendResponse({ ok: true });
          break;
        case 'hideFloatingToolbar':
          this.hideFloatingToolbar();
          sendResponse({ ok: true });
          break;
        case 'enableHighlightMode':
          this.enableHighlightMode();
          sendResponse({ ok: true });
          break;
        case 'disableHighlightMode':
          this.disableHighlightMode();
          sendResponse({ ok: true });
          break;
        case 'showToast':
          this.showToast(msg.message, msg.type);
          sendResponse({ ok: true });
          break;
      }
      return true;
    });
  }

  getSelectionData() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return null;
    }
    return window.clipperEngine.extractSelection();
  }

  showFloatingToolbar(position) {
    this.hideFloatingToolbar();

    const toolbar = document.createElement('div');
    toolbar.className = 'wc-floating-toolbar';
    toolbar.style.left = (position?.x || 100) + 'px';
    toolbar.style.top = (position?.y || 100) + 'px';

    toolbar.innerHTML = `
      <button class="wc-toolbar-btn primary" data-action="clip-selection">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 3h12M6 3v4M18 3v4M6 3l12 18M6 21l12-18"/>
        </svg>
        Clip Selection
      </button>
      <div class="wc-toolbar-divider"></div>
      <button class="wc-toolbar-btn" data-action="clip-fullpage">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
        </svg>
        Full Page
      </button>
      <div class="wc-toolbar-divider"></div>
      <button class="wc-toolbar-btn" data-action="clip-article">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        Article
      </button>
      <div class="wc-toolbar-divider"></div>
      <button class="wc-toolbar-btn" data-action="cancel">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;

    toolbar.addEventListener('click', (e) => {
      const btn = e.target.closest('.wc-toolbar-btn');
      if (!btn) return;

      const action = btn.dataset.action;
      switch (action) {
        case 'clip-selection':
          this.clipSelection();
          break;
        case 'clip-fullpage':
          this.clipFullPage();
          break;
        case 'clip-article':
          this.clipArticle();
          break;
        case 'cancel':
          break;
      }
      this.hideFloatingToolbar();
    });

    document.body.appendChild(toolbar);
    this.floatingToolbar = toolbar;

    this.makeDraggable(toolbar);
  }

  makeDraggable(element) {
    let isDragging = false;
    let offsetX, offsetY;

    element.addEventListener('mousedown', (e) => {
      if (e.target.closest('.wc-toolbar-btn')) return;
      isDragging = true;
      offsetX = e.clientX - element.getBoundingClientRect().left;
      offsetY = e.clientY - element.getBoundingClientRect().top;
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      element.style.left = (e.clientX - offsetX) + 'px';
      element.style.top = (e.clientY - offsetY) + 'px';
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  hideFloatingToolbar() {
    if (this.floatingToolbar) {
      this.floatingToolbar.remove();
      this.floatingToolbar = null;
    }
  }

  async clipSelection() {
    const data = window.clipperEngine.extractSelection();
    if (!data) {
      this.showToast('No text selected. Please select some content first.', 'error');
      return;
    }
    this.showPreviewModal(data);
  }

  async clipFullPage() {
    const data = window.clipperEngine.extractFullPage();
    this.showPreviewModal(data);
  }

  async clipArticle() {
    const data = window.clipperEngine.extractArticleContentFromPage();
    this.showPreviewModal(data);
  }

  showPreviewModal(clipData) {
    this.removePreviewModal();

    const modal = document.createElement('div');
    modal.className = 'wc-preview-modal';
    modal.id = 'wc-preview-modal';

    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDark) modal.setAttribute('data-theme', 'dark');

    const previewHtml = this.createPreviewHtml(clipData);

    modal.innerHTML = `
      <div class="wc-preview-content">
        <div class="wc-preview-header">
          <h3>Clip Preview</h3>
          <button class="wc-toolbar-btn" id="wc-preview-close" style="padding:4px 8px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="wc-preview-body">
          <div style="margin-bottom:12px;">
            <div style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Title</div>
            <div style="font-size:16px;font-weight:600;" id="wc-clip-title">${this.escapeHtml(clipData.meta?.title || 'Untitled')}</div>
          </div>
          <div style="margin-bottom:12px;">
            <div style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Source</div>
            <a href="${this.escapeHtml(clipData.meta?.url || '#')}" target="_blank" style="color:#4a90d9;font-size:13px;text-decoration:none;word-break:break-all;">${this.escapeHtml(clipData.meta?.url || '')}</a>
          </div>
          ${clipData.meta?.author ? `<div style="margin-bottom:12px;"><div style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Author</div><div style="font-size:13px;">${this.escapeHtml(clipData.meta.author)}</div></div>` : ''}
          <div style="margin-bottom:12px;">
            <div style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Preview</div>
            <div class="wc-clip-preview-text" style="max-height:200px;overflow-y:auto;font-size:13px;line-height:1.6;color:#555;padding:10px;background:#f9f9f9;border-radius:6px;">${previewHtml}</div>
          </div>
          <div>
            <div style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Add Note</div>
            <textarea class="wc-annotation-input" id="wc-annotation" placeholder="Add a note to this clip..."></textarea>
          </div>
          <div style="margin-top:12px;">
            <div style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Tags</div>
            <input type="text" id="wc-tags-input" placeholder="Add tags (comma separated)..." style="width:100%;padding:8px 10px;border:1px solid #e0e0e0;border-radius:6px;font-size:13px;">
          </div>
          <div style="margin-top:12px;">
            <div style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Collection</div>
            <select id="wc-collection-select" style="width:100%;padding:8px 10px;border:1px solid #e0e0e0;border-radius:6px;font-size:13px;">
              <option value="Uncategorized">Uncategorized</option>
            </select>
          </div>
        </div>
        <div class="wc-preview-footer">
          <button class="wc-toolbar-btn primary" id="wc-save-clip" style="flex:1;justify-content:center;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
            Save Clip
          </button>
          <button class="wc-toolbar-btn" id="wc-copy-markdown" style="border:1px solid #ddd;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            Copy MD
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.loadCollections();

    modal.querySelector('#wc-preview-close').addEventListener('click', () => this.removePreviewModal());

    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.removePreviewModal();
    });

    modal.querySelector('#wc-save-clip').addEventListener('click', () => {
      this.saveClipFromPreview(clipData);
    });

    modal.querySelector('#wc-copy-markdown').addEventListener('click', () => {
      navigator.clipboard.writeText(clipData.markdown || clipData.content);
      this.showToast('Markdown copied to clipboard', 'success');
    });

    document.addEventListener('keydown', this._escHandler = (e) => {
      if (e.key === 'Escape') this.removePreviewModal();
    });
  }

  async loadCollections() {
    try {
      const collections = await window.clipStorage.getAllCollections();
      const select = document.getElementById('wc-collection-select');
      if (select) {
        select.innerHTML = collections.map(c =>
          `<option value="${this.escapeHtml(c.name)}">${c.icon} ${this.escapeHtml(c.name)}</option>`
        ).join('');
      }
    } catch (e) {}
  }

  async saveClipFromPreview(clipData) {
    const annotation = document.getElementById('wc-annotation')?.value || '';
    const tagsInput = document.getElementById('wc-tags-input')?.value || '';
    const collection = document.getElementById('wc-collection-select')?.value || 'Uncategorized';
    const title = document.getElementById('wc-clip-title')?.textContent || clipData.meta?.title || 'Untitled';

    const tags = tagsInput.split(',').map(t => t.trim()).filter(t => t);

    const clip = {
      url: clipData.meta?.url || window.location.href,
      title: title,
      content: clipData.content,
      html: clipData.html,
      markdown: clipData.markdown,
      excerpt: clipData.excerpt,
      type: clipData.type || 'selection',
      collection,
      tags,
      annotation,
      highlights: [],
      images: clipData.images || [],
      metadata: clipData.meta || {},
      date: Date.now()
    };

    try {
      await window.clipStorage.saveClip(clip);
      this.showToast('Clip saved successfully!', 'success');
      this.removePreviewModal();

      chrome.runtime.sendMessage({ action: 'clipSaved', clip });
    } catch (e) {
      this.showToast('Failed to save clip', 'error');
    }
  }

  createPreviewHtml(clipData) {
    let html = clipData.excerpt || clipData.content || '';
    if (clipData.images && clipData.images.length > 0) {
      const mainImg = clipData.images.find(img => {
        const w = parseInt(img.width);
        return w > 200;
      }) || clipData.images[0];
      if (mainImg) {
        html = `<img src="${this.escapeHtml(mainImg.src)}" alt="${this.escapeHtml(mainImg.alt)}" style="max-width:100%;border-radius:4px;margin-bottom:8px;">` + html;
      }
    }
    return html.substring(0, 1000);
  }

  removePreviewModal() {
    const modal = document.getElementById('wc-preview-modal');
    if (modal) modal.remove();
    if (this._escHandler) {
      document.removeEventListener('keydown', this._escHandler);
      this._escHandler = null;
    }
  }

  enableHighlightMode() {
    this.highlightMode = true;
    document.body.style.cursor = 'crosshair';
    document.body.classList.add('wc-highlight-active');
    this.showToast('Highlight mode: Select text to highlight', 'success');
  }

  disableHighlightMode() {
    this.highlightMode = false;
    document.body.style.cursor = '';
    document.body.classList.remove('wc-highlight-active');
  }

  showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `wc-toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }
}

if (!window._webClipperContentLoaded) {
  window._webClipperContentLoaded = true;
  window._webClipperContent = new WebClipperContent();
}
