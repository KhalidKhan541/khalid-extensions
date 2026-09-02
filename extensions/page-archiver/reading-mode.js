if (typeof ReadingMode === 'undefined') {
  const ReadingMode = {
    fontSize: 16,
    isActive: false,

    init() {
      if (this.isActive) return;
      this.injectStyles();
      this.injectOverlay();
      this.isActive = true;
    },

    injectStyles() {
      if (document.getElementById('page-archiver-reading-styles')) return;
      const style = document.createElement('style');
      style.id = 'page-archiver-reading-styles';
      style.textContent = `
        .pa-reading-overlay {
          position: fixed;
          inset: 0;
          z-index: 2147483647;
          background: #1a1b1e;
          overflow-y: auto;
          font-family: Georgia, 'Times New Roman', serif;
          animation: pa-fadeIn 0.3s ease;
        }
        @keyframes pa-fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .pa-reading-header {
          position: sticky;
          top: 0;
          z-index: 10;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 20px;
          background: #25262b;
          border-bottom: 1px solid #373a40;
        }
        .pa-reading-close {
          background: none;
          border: none;
          color: #909296;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pa-reading-close:hover {
          background: #373a40;
          color: #c1c2c5;
        }
        .pa-reading-title {
          flex: 1;
          font-size: 13px;
          font-weight: 500;
          color: #c1c2c5;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pa-reading-controls {
          display: flex;
          gap: 4px;
        }
        .pa-reading-controls button {
          background: #373a40;
          border: 1px solid #4a4d54;
          color: #c1c2c5;
          padding: 4px 10px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
        }
        .pa-reading-controls button:hover {
          background: #4a4d54;
        }
        .pa-reading-body {
          max-width: 680px;
          margin: 0 auto;
          padding: 40px 20px 80px;
        }
        .pa-reading-body h1 {
          font-size: 2em;
          line-height: 1.2;
          margin-bottom: 16px;
          color: #e9ecef;
        }
        .pa-reading-body .pa-meta {
          font-size: 14px;
          color: #868e96;
          margin-bottom: 32px;
          padding-bottom: 16px;
          border-bottom: 1px solid #373a40;
        }
        .pa-reading-body .pa-content {
          font-size: 16px;
          line-height: 1.8;
          color: #c1c2c5;
        }
        .pa-reading-body .pa-content p {
          margin-bottom: 1.2em;
        }
        .pa-reading-body .pa-content h2 {
          font-size: 1.5em;
          margin: 1.5em 0 0.8em;
          color: #e9ecef;
        }
        .pa-reading-body .pa-content h3 {
          font-size: 1.25em;
          margin: 1.3em 0 0.6em;
          color: #e9ecef;
        }
        .pa-reading-body .pa-content img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 1em 0;
        }
        .pa-reading-body .pa-content blockquote {
          border-left: 3px solid #5c7cfa;
          padding-left: 16px;
          margin: 1em 0;
          color: #909296;
          font-style: italic;
        }
        .pa-reading-body .pa-content pre {
          background: #25262b;
          padding: 16px;
          border-radius: 8px;
          overflow-x: auto;
          margin: 1em 0;
        }
        .pa-reading-body .pa-content code {
          background: #25262b;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 0.9em;
        }
        .pa-reading-body .pa-content a {
          color: #5c7cfa;
          text-decoration: none;
        }
        .pa-reading-body .pa-content a:hover {
          text-decoration: underline;
        }
        .pa-reading-body .pa-content ul, .pa-reading-body .pa-content ol {
          padding-left: 24px;
          margin-bottom: 1.2em;
        }
        .pa-reading-body .pa-content li {
          margin-bottom: 0.4em;
        }
        .pa-reading-body .pa-excerpt {
          font-size: 18px;
          color: #909296;
          font-style: italic;
          margin-bottom: 32px;
          line-height: 1.6;
          padding: 16px;
          background: #25262b;
          border-radius: 8px;
          border-left: 3px solid #5c7cfa;
        }
        .pa-reading-body .pa-loading {
          text-align: center;
          padding: 40px;
          color: #868e96;
        }
      `;
      document.head.appendChild(style);
    },

    injectOverlay() {
      const overlay = document.createElement('div');
      overlay.className = 'pa-reading-overlay';
      overlay.id = 'pa-reading-overlay';
      overlay.innerHTML = `
        <div class="pa-reading-header">
          <button class="pa-reading-close" id="pa-reading-close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <span class="pa-reading-title">Reading Mode</span>
          <div class="pa-reading-controls">
            <button id="pa-font-decrease">A-</button>
            <button id="pa-font-increase">A+</button>
          </div>
        </div>
        <div class="pa-reading-body">
          <div class="pa-loading">Extracting content...</div>
        </div>
      `;
      document.body.appendChild(overlay);

      document.getElementById('pa-reading-close').addEventListener('click', () => this.close());
      document.getElementById('pa-font-decrease').addEventListener('click', () => this.adjustFontSize(-2));
      document.getElementById('pa-font-increase').addEventListener('click', () => this.adjustFontSize(2));

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) this.close();
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isActive) this.close();
      });

      this.extractContent();
    },

    extractContent() {
      const body = document.querySelector('.pa-reading-body');
      const content = this.findMainContent();
      const title = document.querySelector('h1')?.textContent?.trim() || document.title;
      const author = document.querySelector('[rel="author"], [class*="author"]')?.textContent?.trim() || '';
      const siteName = document.querySelector('meta[property="og:site_name"]')?.content || window.location.hostname;
      const excerpt = document.querySelector('meta[property="og:description"], meta[name="description"]')?.content || '';

      let html = '';
      if (content) {
        const clone = content.cloneNode(true);
        this.cleanElement(clone);
        html = clone.innerHTML;
      }

      const metaHtml = `
        <h1>${this.escapeHtml(title)}</h1>
        ${excerpt ? `<div class="pa-excerpt">${this.escapeHtml(excerpt)}</div>` : ''}
        <div class="pa-meta">
          ${author ? `<span>${this.escapeHtml(author)}</span> · ` : ''}
          <span>${this.escapeHtml(siteName)}</span>
        </div>
      `;

      body.innerHTML = metaHtml + `<div class="pa-content">${html || '<p>No readable content found.</p>'}</div>`;
    },

    findMainContent() {
      const selectors = [
        'article', '[role="main"]', 'main',
        '.post-content', '.article-content', '.entry-content',
        '.content', '#content', '.post-body', '.story-body'
      ];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent.trim().length > 200) return el;
      }
      const paragraphs = document.querySelectorAll('p');
      if (paragraphs.length >= 3) {
        let best = null, bestScore = 0;
        paragraphs.forEach(p => {
          const parent = p.parentElement;
          if (!parent) return;
          const score = p.textContent.trim().length;
          if (score > bestScore) { bestScore = score; best = parent; }
        });
        if (best && bestScore > 500) return best;
      }
      return null;
    },

    cleanElement(el) {
      el.querySelectorAll('script, style, nav, header, footer, .sidebar, .ad, .ads, [class*="social"], [class*="share"], [class*="comment"], [class*="related"], [class*="popup"], [class*="modal"], [class*="banner"]')
        .forEach(n => n.remove());
      el.querySelectorAll('img').forEach(img => {
        if (img.width < 80 || img.height < 80) img.remove();
      });
    },

    adjustFontSize(delta) {
      this.fontSize = Math.min(28, Math.max(12, this.fontSize + delta));
      const content = document.querySelector('.pa-reading-body .pa-content');
      if (content) content.style.fontSize = this.fontSize + 'px';
    },

    escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    },

    close() {
      const overlay = document.getElementById('pa-reading-overlay');
      if (overlay) overlay.remove();
      const styles = document.getElementById('pa-reading-styles');
      if (styles) styles.remove();
      this.isActive = false;
    }
  };

  window.ReadingMode = ReadingMode;

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'ACTIVATE_READING_MODE') {
      ReadingMode.init();
      sendResponse({ success: true });
    }
  });
}
