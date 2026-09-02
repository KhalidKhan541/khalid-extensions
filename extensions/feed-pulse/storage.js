export class FeedStorage {
  static DEFAULTS = {
    feeds: [],
    articles: [],
    folders: [
      { id: 'default', name: 'All Feeds', icon: '📰' },
      { id: 'tech', name: 'Technology', icon: '💻' },
      { id: 'news', name: 'News', icon: '📰' },
      { id: 'blogs', name: 'Blogs', icon: '✍️' },
      { id: 'dev', name: 'Development', icon: '🚀' }
    ],
    settings: {
      pollInterval: 15,
      maxArticlesPerFeed: 100,
      retentionDays: 30,
      theme: 'auto',
      showNotifications: true,
      openArticlesInReader: true
    }
  };

  static async get(key) {
    const data = await chrome.storage.local.get(key || this.DEFAULTS);
    return key ? data[key] : { ...this.DEFAULTS, ...data };
  }

  static async set(data) {
    return chrome.storage.local.set(data);
  }

  static async getFeeds() {
    const data = await this.get('feeds');
    return data || [];
  }

  static async addFeed(feed) {
    const feeds = await this.getFeeds();
    if (feeds.some(f => f.url === feed.url)) {
      throw new Error('Feed already exists');
    }
    const newFeed = {
      id: 'feed_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      url: feed.url,
      title: feed.title || 'Untitled Feed',
      description: feed.description || '',
      image: feed.image || '',
      folderId: feed.folderId || 'default',
      dateAdded: Date.now(),
      lastFetched: 0,
      unreadCount: 0
    };
    feeds.push(newFeed);
    await this.set({ feeds });
    return newFeed;
  }

  static async updateFeed(id, updates) {
    const feeds = await this.getFeeds();
    const idx = feeds.findIndex(f => f.id === id);
    if (idx === -1) throw new Error('Feed not found');
    feeds[idx] = { ...feeds[idx], ...updates };
    await this.set({ feeds });
    return feeds[idx];
  }

  static async removeFeed(id) {
    const feeds = await this.getFeeds();
    const filtered = feeds.filter(f => f.id !== id);
    await this.set({ feeds: filtered });
    const articles = await this.getArticles();
    const filteredArticles = articles.filter(a => a.feedId !== id);
    await this.set({ articles: filteredArticles });
  }

  static async getArticles(feedId = null, options = {}) {
    const data = await this.get('articles');
    let articles = data || [];
    if (feedId) {
      articles = articles.filter(a => a.feedId === feedId);
    }
    if (options.unreadOnly) {
      articles = articles.filter(a => !a.read);
    }
    if (options.bookmarked) {
      articles = articles.filter(a => a.bookmarked);
    }
    if (options.search) {
      const q = options.search.toLowerCase();
      articles = articles.filter(a =>
        (a.title && a.title.toLowerCase().includes(q)) ||
        (a.description && a.description.toLowerCase().includes(q)) ||
        (a.author && a.author.toLowerCase().includes(q))
      );
    }
    if (options.category) {
      articles = articles.filter(a =>
        a.categories && a.categories.some(c => c.toLowerCase() === options.category.toLowerCase())
      );
    }
    const sort = options.sort || 'newest';
    articles.sort((a, b) => {
      const da = a.pubDate || a.dateAdded || 0;
      const db = b.pubDate || b.dateAdded || 0;
      return sort === 'oldest' ? da - db : db - da;
    });
    if (options.limit) {
      articles = articles.slice(0, options.limit);
    }
    return articles;
  }

  static async addArticles(feedId, newArticles) {
    const articles = await this.getArticles();
    const existingIds = new Set(articles.map(a => a.id));
    let added = 0;
    for (const article of newArticles) {
      if (!existingIds.has(article.id)) {
        articles.push({
          ...article,
          feedId,
          read: false,
          bookmarked: false,
          dateAdded: Date.now()
        });
        added++;
      }
    }
    if (added > 0) {
      await this.set({ articles });
    }
    return added;
  }

  static async markAsRead(articleId) {
    const articles = await this.get('articles');
    const article = articles.find(a => a.id === articleId);
    if (article && !article.read) {
      article.read = true;
      await this.set({ articles });
      await this.updateFeedUnreadCount(article.feedId);
    }
  }

  static async markAllAsRead(feedId = null) {
    const articles = await this.get('articles');
    let changed = false;
    const feedIds = new Set();
    for (const article of articles) {
      if (!article.read && (!feedId || article.feedId === feedId)) {
        article.read = true;
        changed = true;
        feedIds.add(article.feedId);
      }
    }
    if (changed) {
      await this.set({ articles });
      for (const fid of feedIds) {
        await this.updateFeedUnreadCount(fid);
      }
    }
  }

  static async toggleBookmark(articleId) {
    const articles = await this.get('articles');
    const article = articles.find(a => a.id === articleId);
    if (article) {
      article.bookmarked = !article.bookmarked;
      await this.set({ articles });
      return article.bookmarked;
    }
    return false;
  }

  static async updateFeedUnreadCount(feedId) {
    const articles = await this.getArticles(feedId);
    const unread = articles.filter(a => !a.read).length;
    await this.updateFeed(feedId, { unreadCount: unread });
  }

  static async getTotalUnread() {
    const articles = await this.get('articles');
    return articles.filter(a => !a.read).length;
  }

  static async getUnreadCounts() {
    const articles = await this.get('articles');
    const counts = {};
    for (const article of articles) {
      if (!article.read) {
        counts[article.feedId] = (counts[article.feedId] || 0) + 1;
      }
    }
    return counts;
  }

  static async pruneArticles(maxAge = null) {
    const settings = (await this.get('settings')) || this.DEFAULTS.settings;
    const retentionMs = (maxAge || settings.retentionDays) * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - retentionMs;
    const articles = await this.get('articles');
    const filtered = articles.filter(a =>
      a.bookmarked || (a.dateAdded && a.dateAdded > cutoff)
    );
    const removed = articles.length - filtered.length;
    if (removed > 0) {
      await this.set({ articles: filtered });
    }
    return removed;
  }

  static async getFolders() {
    const data = await this.get('folders');
    return data || this.DEFAULTS.folders;
  }

  static async addFolder(name, icon = '📁') {
    const folders = await this.getFolders();
    const folder = {
      id: 'folder_' + Date.now(),
      name,
      icon
    };
    folders.push(folder);
    await this.set({ folders });
    return folder;
  }

  static async removeFolder(id) {
    if (id === 'default') throw new Error('Cannot remove default folder');
    const folders = await this.getFolders();
    await this.set({ folders: folders.filter(f => f.id !== id) });
    const feeds = await this.getFeeds();
    for (const feed of feeds) {
      if (feed.folderId === id) {
        feed.folderId = 'default';
      }
    }
    await this.set({ feeds });
  }

  static async moveToFolder(feedId, folderId) {
    await this.updateFeed(feedId, { folderId });
  }

  static async getSettings() {
    const data = await this.get('settings');
    return { ...this.DEFAULTS.settings, ...data };
  }

  static async updateSettings(updates) {
    const settings = await this.getSettings();
    await this.set({ settings: { ...settings, ...updates } });
  }

  static async exportOPML() {
    const feeds = await this.getFeeds();
    const folders = await this.getFolders();

    let opml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>FeedPulse Subscriptions</title>
    <dateCreated>${new Date().toUTCString()}</dateCreated>
  </head>
  <body>`;

    const folderMap = {};
    for (const folder of folders) {
      folderMap[folder.id] = folder;
    }

    const feedsByFolder = {};
    for (const feed of feeds) {
      const fid = feed.folderId || 'default';
      if (!feedsByFolder[fid]) feedsByFolder[fid] = [];
      feedsByFolder[fid].push(feed);
    }

    for (const [folderId, folderFeeds] of Object.entries(feedsByFolder)) {
      const folder = folderMap[folderId];
      if (folder && folderId !== 'default') {
        opml += `\n    <outline text="${this.escapeXml(folder.name)}" title="${this.escapeXml(folder.name)}">`;
      }
      for (const feed of folderFeeds) {
        opml += `\n      <outline type="rss" text="${this.escapeXml(feed.title)}" title="${this.escapeXml(feed.title)}" xmlUrl="${this.escapeXml(feed.url)}" htmlUrl="${this.escapeXml(feed.url)}"/>`;
      }
      if (folder && folderId !== 'default') {
        opml += `\n    </outline>`;
      }
    }

    opml += `\n  </body>\n</opml>`;
    return opml;
  }

  static async importOPML(opmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(opmlString, 'text/xml');
    const error = doc.querySelector('parsererror');
    if (error) throw new Error('Invalid OPML file');

    const feeds = [];
    doc.querySelectorAll('outline[xmlUrl]').forEach(outline => {
      feeds.push({
        url: outline.getAttribute('xmlUrl'),
        title: outline.getAttribute('title') || outline.getAttribute('text') || 'Imported Feed',
        folderId: 'default'
      });
    });

    let imported = 0;
    for (const feed of feeds) {
      try {
        await this.addFeed(feed);
        imported++;
      } catch (e) {
        // skip duplicates
      }
    }
    return imported;
  }

  static async getStats() {
    const feeds = await this.getFeeds();
    const articles = await this.getArticles();
    const read = articles.filter(a => a.read).length;
    const bookmarked = articles.filter(a => a.bookmarked).length;

    return {
      totalFeeds: feeds.length,
      totalArticles: articles.length,
      unreadArticles: articles.length - read,
      readArticles: read,
      bookmarkedArticles: bookmarked
    };
  }

  static escapeXml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
