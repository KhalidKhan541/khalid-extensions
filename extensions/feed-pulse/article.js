class ArticleReader {
  constructor() {
    this.articles = [];
    this.currentIndex = 0;
    this.readerMode = false;
    this.init();
  }

  async init() {
    const params = new URLSearchParams(window.location.search);
    const feedId = params.get('feedId');
    const articleId = params.get('articleId');

    const data = await chrome.storage.local.get('articles');
    this.articles = data.articles || [];

    if (feedId) {
      this.articles = this.articles.filter(a => a.feedId === feedId);
    }

    this.articles.sort((a, b) => {
      const da = a.pubDate || a.dateAdded || 0;
      const db = b.pubDate || b.dateAdded || 0;
      return db - da;
    });

    if (articleId) {
      this.currentIndex = this.articles.findIndex(a => a.id === articleId);
      if (this.currentIndex === -1) this.currentIndex = 0;
    }

    this.applyTheme();
    this.bindEvents();
    this.render();
  }

  bindEvents() {
    document.getElementById('back-btn').addEventListener('click', () => {
      window.close();
    });

    document.getElementById('prev-btn').addEventListener('click', () => this.prev());
    document.getElementById('next-btn').addEventListener('click', () => this.next());
    document.getElementById('bookmark-btn').addEventListener('click', () => this.toggleBookmark());
    document.getElementById('open-btn').addEventListener('click', () => this.openOriginal());
    document.getElementById('share-btn').addEventListener('click', () => this.copyLink());
    document.getElementById('reader-mode-btn').addEventListener('click', () => this.toggleReaderMode());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') this.prev();
      if (e.key === 'ArrowRight') this.next();
      if (e.key === 'Escape') window.close();
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        this.toggleBookmark();
      }
    });

    window.addEventListener('scroll', () => this.updateProgress());
  }

  render() {
    const article = this.articles[this.currentIndex];
    if (!article) {
      document.getElementById('article-title').textContent = 'No article selected';
      return;
    }

    document.title = article.title + ' - FeedPulse';

    document.getElementById('article-title').textContent = article.title;

    const meta = document.getElementById('article-meta');
    meta.innerHTML = `
      <span>${this.formatDate(article.pubDate)}</span>
      ${article.author ? `<span>by ${this.escapeHtml(article.author)}</span>` : ''}
      ${article.categories?.length ? `<span>${article.categories.join(', ')}</span>` : ''}
    `;

    const body = document.getElementById('article-body');
    body.innerHTML = article.content || article.description || '<p>No content available</p>';
    body.classList.toggle('reader-mode', this.readerMode);

    document.getElementById('nav-info').textContent =
      `${this.currentIndex + 1} / ${this.articles.length}`;

    const bookmarkBtn = document.getElementById('bookmark-btn');
    bookmarkBtn.innerHTML = article.bookmarked
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';

    this.markAsRead(article.id);
    window.scrollTo(0, 0);
    document.getElementById('progress-fill').style.width = '0%';
  }

  prev() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.render();
    }
  }

  next() {
    if (this.currentIndex < this.articles.length - 1) {
      this.currentIndex++;
      this.render();
    }
  }

  async toggleBookmark() {
    const article = this.articles[this.currentIndex];
    if (!article) return;

    article.bookmarked = !article.bookmarked;

    const data = await chrome.storage.local.get('articles');
    const articles = data.articles || [];
    const stored = articles.find(a => a.id === article.id);
    if (stored) {
      stored.bookmarked = article.bookmarked;
      await chrome.storage.local.set({ articles });
    }

    const bookmarkBtn = document.getElementById('bookmark-btn');
    bookmarkBtn.innerHTML = article.bookmarked
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';

    this.showToast(article.bookmarked ? 'Article bookmarked' : 'Bookmark removed');
  }

  openOriginal() {
    const article = this.articles[this.currentIndex];
    if (article?.link) {
      chrome.tabs.create({ url: article.link });
    }
  }

  copyLink() {
    const article = this.articles[this.currentIndex];
    if (article?.link) {
      navigator.clipboard.writeText(article.link).then(() => {
        this.showToast('Link copied to clipboard');
      });
    }
  }

  toggleReaderMode() {
    this.readerMode = !this.readerMode;
    document.getElementById('article-body').classList.toggle('reader-mode', this.readerMode);
  }

  async markAsRead(articleId) {
    const data = await chrome.storage.local.get('articles');
    const articles = data.articles || [];
    const article = articles.find(a => a.id === articleId);
    if (article && !article.read) {
      article.read = true;
      await chrome.storage.local.set({ articles });

      const feedsData = await chrome.storage.local.get('feeds');
      const feeds = feedsData.feeds || [];
      const feed = feeds.find(f => f.id === article.feedId);
      if (feed) {
        const feedArticles = articles.filter(a => a.feedId === article.feedId && !a.read);
        feed.unreadCount = feedArticles.length;
        await chrome.storage.local.set({ feeds });
      }

      const totalUnread = articles.filter(a => !a.read).length;
      if (totalUnread > 0) {
        chrome.action.setBadgeText({ text: totalUnread > 999 ? '999+' : totalUnread.toString() });
      } else {
        chrome.action.setBadgeText({ text: '' });
      }
    }
  }

  updateProgress() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    document.getElementById('progress-fill').style.width = progress + '%';
  }

  async applyTheme() {
    const data = await chrome.storage.local.get('theme');
    if (data.theme) {
      document.documentElement.setAttribute('data-theme', data.theme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }

  formatDate(timestamp) {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
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
}

document.addEventListener('DOMContentLoaded', () => {
  new ArticleReader();
});
