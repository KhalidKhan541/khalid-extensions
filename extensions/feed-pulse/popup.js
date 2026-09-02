import { FeedParser } from './feed-parser.js';
import { FeedStorage } from './storage.js';

class FeedPulse {
  constructor() {
    this.feeds = [];
    this.articles = [];
    this.folders = [];
    this.currentView = 'all';
    this.currentFeedId = null;
    this.currentArticleIndex = -1;
    this.searchQuery = '';
    this.sortOrder = 'newest';
    this.readerMode = false;
    this.init();
  }

  async init() {
    await this.loadData();
    this.bindEvents();
    this.render();
    this.applyTheme();
  }

  async loadData() {
    this.feeds = await FeedStorage.getFeeds();
    this.folders = await FeedStorage.getFolders();
    const counts = await FeedStorage.getUnreadCounts();
    for (const feed of this.feeds) {
      feed.unreadCount = counts[feed.id] || 0;
    }
  }

  bindEvents() {
    document.getElementById('sidebar-toggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('collapsed');
    });

    document.getElementById('search-input').addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      this.loadArticles();
    });

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('search-input').focus();
      }
      if (e.key === 'Escape') {
        this.closeReader();
        this.closeModals();
      }
    });

    document.getElementById('refresh-btn').addEventListener('click', () => this.refreshAll());

    document.getElementById('theme-toggle').addEventListener('click', () => this.toggleTheme());
    document.getElementById('settings-btn').addEventListener('click', () => this.openModal('settings-modal'));
    document.getElementById('add-feed-btn').addEventListener('click', () => this.openAddFeedModal());
    document.getElementById('empty-add-feed-btn').addEventListener('click', () => this.openAddFeedModal());
    document.getElementById('manage-feeds-btn').addEventListener('click', () => this.openManageFeeds());
    document.getElementById('import-export-btn').addEventListener('click', () => this.openModal('import-export-modal'));

    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentView = btn.dataset.view;
        this.currentFeedId = null;
        this.loadArticles();
        this.renderSidebar();
      });
    });

    document.getElementById('sort-select').addEventListener('change', (e) => {
      this.sortOrder = e.target.value;
      this.loadArticles();
    });

    document.getElementById('mark-all-read-btn').addEventListener('click', () => this.markAllRead());

    document.getElementById('close-reader-btn').addEventListener('click', () => this.closeReader());
    document.getElementById('prev-article-btn').addEventListener('click', () => this.prevArticle());
    document.getElementById('next-article-btn').addEventListener('click', () => this.nextArticle());
    document.getElementById('reader-bookmark-btn').addEventListener('click', () => this.toggleCurrentBookmark());
    document.getElementById('reader-open-btn').addEventListener('click', () => this.openOriginal());
    document.getElementById('reader-share-btn').addEventListener('click', () => this.copyLink());
    document.getElementById('reader-reader-mode-btn').addEventListener('click', () => this.toggleReaderMode());

    document.getElementById('reader-content').addEventListener('scroll', (e) => {
      this.updateReadingProgress(e.target);
    });

    this.bindModalEvents();
  }

  bindModalEvents() {
    document.querySelectorAll('.modal-overlay, .modal-close').forEach(el => {
      el.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal');
        if (modal) modal.classList.add('hidden');
      });
    });

    document.getElementById('detect-feed-btn').addEventListener('click', () => this.detectFeedFromTab());
    document.getElementById('add-feed-confirm').addEventListener('click', () => this.addFeed());

    document.getElementById('save-settings').addEventListener('click', () => this.saveSettings());
    document.getElementById('prune-btn').addEventListener('click', () => this.pruneArticles());

    document.getElementById('export-opml-btn').addEventListener('click', () => this.exportOPML());
    document.getElementById('import-opml-btn').addEventListener('click', () => {
      document.getElementById('import-opml-input').click();
    });
    document.getElementById('import-opml-input').addEventListener('change', (e) => this.importOPML(e));
  }

  render() {
    this.renderSidebar();
    this.loadArticles();
  }

  renderSidebar() {
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === this.currentView && !this.currentFeedId);
    });

    const totalUnread = this.feeds.reduce((sum, f) => sum + (f.unreadCount || 0), 0);
    document.getElementById('all-unread').textContent = this.feeds.length;
    document.getElementById('unread-count').textContent = totalUnread;

    this.renderFolders();
  }

  renderFolders() {
    const container = document.getElementById('folders-container');
    container.innerHTML = '';

    const feedsByFolder = {};
    for (const feed of this.feeds) {
      const fid = feed.folderId || 'default';
      if (!feedsByFolder[fid]) feedsByFolder[fid] = [];
      feedsByFolder[fid].push(feed);
    }

    for (const folder of this.folders) {
      const folderFeeds = feedsByFolder[folder.id] || [];
      if (folderFeeds.length === 0 && folder.id === 'default') continue;

      const group = document.createElement('div');
      group.className = 'folder-group';

      const header = document.createElement('button');
      header.className = 'folder-header';
      const totalInFolder = folderFeeds.reduce((sum, f) => sum + (f.unreadCount || 0), 0);
      header.innerHTML = `
        <span class="folder-icon">${folder.icon}</span>
        <span>${folder.name}</span>
        ${totalInFolder > 0 ? `<span class="folder-count">${totalInFolder}</span>` : ''}
      `;
      header.addEventListener('click', () => {
        const feedsList = group.querySelector('.folder-feeds');
        feedsList.classList.toggle('collapsed');
      });
      group.appendChild(header);

      const feedsList = document.createElement('div');
      feedsList.className = 'folder-feeds';

      for (const feed of folderFeeds) {
        const feedEl = document.createElement('button');
        feedEl.className = 'feed-item' + (this.currentFeedId === feed.id ? ' active' : '');
        const initial = (feed.title || 'F')[0].toUpperCase();
        feedEl.innerHTML = `
          <span class="feed-item-icon">${initial}</span>
          <span class="feed-item-title">${this.escapeHtml(feed.title)}</span>
          ${feed.unreadCount > 0 ? `<span class="feed-item-count">${feed.unreadCount}</span>` : ''}
        `;
        feedEl.addEventListener('click', () => this.selectFeed(feed.id));
        feedsList.appendChild(feedEl);
      }

      group.appendChild(feedsList);
      container.appendChild(group);
    }
  }

  async selectFeed(feedId) {
    this.currentFeedId = feedId;
    this.currentView = 'feed';
    const feed = this.feeds.find(f => f.id === feedId);
    if (feed) {
      document.getElementById('current-view-title').textContent = feed.title;
    }
    this.renderSidebar();
    await this.loadArticles();
  }

  async loadArticles() {
    const options = { sort: this.sortOrder };
    if (this.searchQuery) options.search = this.searchQuery;

    if (this.currentFeedId) {
      this.articles = await FeedStorage.getArticles(this.currentFeedId, options);
      document.getElementById('current-view-title').textContent =
        this.feeds.find(f => f.id === this.currentFeedId)?.title || 'Feed';
    } else if (this.currentView === 'unread') {
      this.articles = await FeedStorage.getArticles(null, { ...options, unreadOnly: true });
      document.getElementById('current-view-title').textContent = 'Unread';
    } else if (this.currentView === 'bookmarks') {
      this.articles = await FeedStorage.getArticles(null, { ...options, bookmarked: true });
      document.getElementById('current-view-title').textContent = 'Bookmarks';
    } else {
      this.articles = await FeedStorage.getArticles(null, options);
      document.getElementById('current-view-title').textContent = 'All Articles';
    }

    document.getElementById('article-count').textContent = `${this.articles.length} articles`;
    this.renderArticleList();
  }

  renderArticleList() {
    const list = document.getElementById('article-list');
    const empty = document.getElementById('empty-state');

    if (this.articles.length === 0) {
      list.innerHTML = '';
      list.appendChild(empty);
      empty.style.display = 'flex';
      return;
    }

    empty.style.display = 'none';
    list.innerHTML = '';

    for (let i = 0; i < this.articles.length; i++) {
      const article = this.articles[i];
      const feed = this.feeds.find(f => f.id === article.feedId);
      const el = document.createElement('div');
      el.className = 'article-item' + (!article.read ? ' unread' : '');

      const timeStr = this.formatTime(article.pubDate);
      const snippet = this.stripHtml(article.description || '').slice(0, 150);

      el.innerHTML = `
        <div class="article-content">
          <div class="article-title">${this.escapeHtml(article.title)}</div>
          <div class="article-snippet">${this.escapeHtml(snippet)}</div>
          <div class="article-meta">
            <span class="article-feed-name">${this.escapeHtml(feed?.title || 'Unknown')}</span>
            <span>${timeStr}</span>
            ${article.author ? `<span>by ${this.escapeHtml(article.author)}</span>` : ''}
          </div>
        </div>
        <div class="article-actions">
          <button class="article-action-btn ${article.bookmarked ? 'bookmarked' : ''}" data-action="bookmark" title="Bookmark">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="${article.bookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
          </button>
          <button class="article-action-btn" data-action="read" title="Mark as read">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
          </button>
        </div>
      `;

      el.addEventListener('click', (e) => {
        if (e.target.closest('.article-action-btn')) return;
        this.openArticle(i);
      });

      el.querySelector('[data-action="bookmark"]').addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleBookmark(article.id, el);
      });

      el.querySelector('[data-action="read"]').addEventListener('click', (e) => {
        e.stopPropagation();
        this.markAsRead(article.id, el);
      });

      list.appendChild(el);
    }
  }

  async openArticle(index) {
    this.currentArticleIndex = index;
    const article = this.articles[index];
    if (!article) return;

    await FeedStorage.markAsRead(article.id);
    article.read = true;

    const panel = document.getElementById('reader-panel');
    panel.classList.remove('hidden');

    document.getElementById('reader-title').textContent = article.title;

    const meta = document.getElementById('reader-meta');
    meta.innerHTML = `
      <span>${this.formatDate(article.pubDate)}</span>
      ${article.author ? `<span>by ${this.escapeHtml(article.author)}</span>` : ''}
      ${article.categories?.length ? `<span>${article.categories.join(', ')}</span>` : ''}
    `;

    const body = document.getElementById('reader-body');
    body.innerHTML = article.content || article.description || '<p>No content available</p>';
    if (this.readerMode) body.classList.add('reader-body-reader');
    else body.classList.remove('reader-body-reader');

    document.getElementById('reader-position').textContent =
      `${index + 1} / ${this.articles.length}`;

    const feed = this.feeds.find(f => f.id === article.feedId);
    const bookmarkBtn = document.getElementById('reader-bookmark-btn');
    bookmarkBtn.innerHTML = article.bookmarked
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';

    const readerContent = document.getElementById('reader-content');
    readerContent.scrollTop = 0;
    document.getElementById('reading-progress').style.width = '0%';

    this.renderArticleList();
    this.updateBadge();
  }

  closeReader() {
    document.getElementById('reader-panel').classList.add('hidden');
    this.currentArticleIndex = -1;
  }

  prevArticle() {
    if (this.currentArticleIndex > 0) {
      this.openArticle(this.currentArticleIndex - 1);
    }
  }

  nextArticle() {
    if (this.currentArticleIndex < this.articles.length - 1) {
      this.openArticle(this.currentArticleIndex + 1);
    }
  }

  updateReadingProgress(container) {
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight - container.clientHeight;
    const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    document.getElementById('reading-progress').style.width = progress + '%';
  }

  async toggleBookmark(articleId, element) {
    const bookmarked = await FeedStorage.toggleBookmark(articleId);
    const article = this.articles.find(a => a.id === articleId);
    if (article) article.bookmarked = bookmarked;

    const btn = element.querySelector('[data-action="bookmark"]');
    btn.classList.toggle('bookmarked', bookmarked);
    btn.querySelector('svg').setAttribute('fill', bookmarked ? 'currentColor' : 'none');

    this.showToast(bookmarked ? 'Article bookmarked' : 'Bookmark removed');
  }

  async markAsRead(articleId, element) {
    await FeedStorage.markAsRead(articleId);
    const article = this.articles.find(a => a.id === articleId);
    if (article) article.read = true;
    element.classList.remove('unread');
    this.updateBadge();
  }

  async markAllRead() {
    const feedId = this.currentFeedId;
    await FeedStorage.markAllAsRead(feedId);
    await this.loadData();
    await this.loadArticles();
    this.renderSidebar();
    this.updateBadge();
    this.showToast('All articles marked as read');
  }

  toggleCurrentBookmark() {
    if (this.currentArticleIndex < 0) return;
    const article = this.articles[this.currentArticleIndex];
    if (!article) return;
    this.toggleBookmark(article.id, document.querySelector(`.article-item:nth-child(${this.currentArticleIndex + 1})`));
    const bookmarkBtn = document.getElementById('reader-bookmark-btn');
    bookmarkBtn.innerHTML = article.bookmarked
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';
  }

  openOriginal() {
    if (this.currentArticleIndex < 0) return;
    const article = this.articles[this.currentArticleIndex];
    if (article?.link) {
      chrome.tabs.create({ url: article.link });
    }
  }

  copyLink() {
    if (this.currentArticleIndex < 0) return;
    const article = this.articles[this.currentArticleIndex];
    if (article?.link) {
      navigator.clipboard.writeText(article.link).then(() => {
        this.showToast('Link copied to clipboard');
      });
    }
  }

  toggleReaderMode() {
    this.readerMode = !this.readerMode;
    const body = document.getElementById('reader-body');
    body.classList.toggle('reader-body-reader', this.readerMode);
  }

  async openAddFeedModal() {
    document.getElementById('feed-url-input').value = '';
    document.getElementById('feed-title-input').value = '';
    document.getElementById('detected-feeds').classList.add('hidden');

    const folderSelect = document.getElementById('feed-folder-select');
    folderSelect.innerHTML = '';
    for (const folder of this.folders) {
      const opt = document.createElement('option');
      opt.value = folder.id;
      opt.textContent = folder.name;
      folderSelect.appendChild(opt);
    }

    this.openModal('add-feed-modal');
  }

  async detectFeedFromTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.url) {
        this.showToast('No active tab found');
        return;
      }

      const result = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'DISCOVER_FEEDS', url: tab.url }, resolve);
      });

      if (result?.success && result.feeds?.length > 0) {
        this.showDetectedFeeds(result.feeds);
      } else {
        this.showToast('No feeds found on this page');
      }
    } catch (e) {
      this.showToast('Error detecting feeds');
    }
  }

  showDetectedFeeds(feeds) {
    const container = document.getElementById('detected-feeds');
    const list = document.getElementById('detected-feeds-list');
    list.innerHTML = '';
    container.classList.remove('hidden');

    feeds.forEach((feed, i) => {
      const item = document.createElement('div');
      item.className = 'detected-feed-item';
      item.innerHTML = `
        <input type="radio" name="detected-feed" id="detected-${i}" value="${feed.url}" ${i === 0 ? 'checked' : ''}>
        <label for="detected-${i}">
          <div>${this.escapeHtml(feed.title)}</div>
          <div class="feed-url">${this.escapeHtml(feed.url)}</div>
        </label>
      `;
      item.addEventListener('click', () => {
        document.getElementById('feed-url-input').value = feed.url;
        document.getElementById('feed-title-input').value = feed.title;
      });
      list.appendChild(item);
    });

    if (feeds[0]) {
      document.getElementById('feed-url-input').value = feeds[0].url;
      document.getElementById('feed-title-input').value = feeds[0].title;
    }
  }

  async addFeed() {
    const url = document.getElementById('feed-url-input').value.trim();
    if (!url) {
      this.showToast('Please enter a feed URL');
      return;
    }

    const title = document.getElementById('feed-title-input').value.trim();
    const folderId = document.getElementById('feed-folder-select').value;

    try {
      this.showToast('Adding feed...');
      const feedData = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: 'FETCH_FEED', url }, (response) => {
          if (response?.success) resolve(response.result);
          else reject(new Error(response?.error || 'Failed to fetch feed'));
        });
      });

      await FeedStorage.addFeed({
        url,
        title: title || feedData?.title || url,
        description: feedData?.description || '',
        image: feedData?.image || '',
        folderId
      });

      await this.loadData();
      this.render();
      document.getElementById('add-feed-modal').classList.add('hidden');
      this.showToast('Feed added successfully');
    } catch (e) {
      this.showToast('Error: ' + e.message);
    }
  }

  async openManageFeeds() {
    const list = document.getElementById('managed-feeds-list');
    list.innerHTML = '';

    for (const feed of this.feeds) {
      const item = document.createElement('div');
      item.className = 'managed-feed-item';
      const initial = (feed.title || 'F')[0].toUpperCase();
      item.innerHTML = `
        <div class="managed-feed-icon">${initial}</div>
        <div class="managed-feed-info">
          <div class="managed-feed-name">${this.escapeHtml(feed.title)}</div>
          <div class="managed-feed-url">${this.escapeHtml(feed.url)}</div>
        </div>
        <div class="managed-feed-actions">
          <select class="input" style="width:auto;padding:4px 8px;font-size:12px;" data-feed-id="${feed.id}">
            ${this.folders.map(f => `<option value="${f.id}" ${f.id === feed.folderId ? 'selected' : ''}>${f.name}</option>`).join('')}
          </select>
          <button class="btn btn-danger btn-sm" data-delete="${feed.id}">Remove</button>
        </div>
      `;

      item.querySelector('select').addEventListener('change', async (e) => {
        await FeedStorage.moveToFolder(feed.id, e.target.value);
        await this.loadData();
        this.renderSidebar();
      });

      item.querySelector('[data-delete]').addEventListener('click', async () => {
        if (confirm(`Remove "${feed.title}"?`)) {
          await FeedStorage.removeFeed(feed.id);
          await this.loadData();
          this.render();
          this.openManageFeeds();
        }
      });

      list.appendChild(item);
    }

    this.openModal('manage-feeds-modal');
  }

  async saveSettings() {
    const settings = {
      pollInterval: parseInt(document.getElementById('poll-interval').value) || 15,
      maxArticlesPerFeed: parseInt(document.getElementById('max-articles').value) || 100,
      retentionDays: parseInt(document.getElementById('retention-days').value) || 30,
      showNotifications: document.getElementById('show-notifications').checked,
      openArticlesInReader: document.getElementById('open-in-reader').checked
    };

    await FeedStorage.updateSettings(settings);
    document.getElementById('settings-modal').classList.add('hidden');
    this.showToast('Settings saved');
  }

  async loadSettings() {
    const settings = await FeedStorage.getSettings();
    document.getElementById('poll-interval').value = settings.pollInterval;
    document.getElementById('max-articles').value = settings.maxArticlesPerFeed;
    document.getElementById('retention-days').value = settings.retentionDays;
    document.getElementById('show-notifications').checked = settings.showNotifications;
    document.getElementById('open-in-reader').checked = settings.openArticlesInReader;
  }

  async pruneArticles() {
    const removed = await FeedStorage.pruneArticles();
    await this.loadArticles();
    this.showToast(`Pruned ${removed} old articles`);
  }

  async exportOPML() {
    const opml = await FeedStorage.exportOPML();
    const blob = new Blob([opml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'feedpulse-subscriptions.opml';
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('OPML exported');
  }

  async importOPML(event) {
    const file = event.target.files[0];
    if (!file) return;

    const text = await file.text();
    try {
      const imported = await FeedStorage.importOPML(text);
      await this.loadData();
      this.render();
      document.getElementById('import-result').classList.remove('hidden');
      document.getElementById('import-result').textContent = `Successfully imported ${imported} feeds`;
      this.showToast(`Imported ${imported} feeds`);
    } catch (e) {
      this.showToast('Error importing OPML: ' + e.message);
    }
    event.target.value = '';
  }

  async refreshAll() {
    const btn = document.getElementById('refresh-btn');
    btn.classList.add('spinning');
    try {
      await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'POLL_FEEDS' }, resolve);
      });
      await this.loadData();
      await this.loadArticles();
      this.renderSidebar();
      this.updateBadge();
      this.showToast('Feeds refreshed');
    } catch (e) {
      this.showToast('Error refreshing feeds');
    }
    btn.classList.remove('spinning');
  }

  async updateBadge() {
    const count = await FeedStorage.getTotalUnread();
    chrome.action.setBadgeText({ text: count > 0 ? (count > 999 ? '999+' : count.toString()) : '' });
    chrome.action.setBadgeBackgroundColor({ color: '#e53e3e' });
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    chrome.storage.local.set({ theme: next });
  }

  async applyTheme() {
    const data = await chrome.storage.local.get('theme');
    if (data.theme) {
      document.documentElement.setAttribute('data-theme', data.theme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }

  openModal(id) {
    const modal = document.getElementById(id);
    modal.classList.remove('hidden');
    if (id === 'settings-modal') this.loadSettings();
    if (id === 'manage-feeds-modal') this.openManageFeeds();
  }

  closeModals() {
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
  }

  showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  formatTime(timestamp) {
    if (!timestamp) return '';
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  }

  formatDate(timestamp) {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  stripHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new FeedPulse();
});
