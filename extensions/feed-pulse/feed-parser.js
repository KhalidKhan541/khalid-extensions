export class FeedParser {
  static CORS_PROXIES = [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
    'https://api.codetabs.com/v1/proxy?quest='
  ];

  static async fetchFeed(url, useProxy = false) {
    const urls = useProxy
      ? this.CORS_PROXIES.map(p => p + encodeURIComponent(url))
      : [url];

    let lastError;
    for (const fetchUrl of urls) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        const response = await fetch(fetchUrl, {
          signal: controller.signal,
          headers: { 'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml' }
        });
        clearTimeout(timeout);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const text = await response.text();
        return this.parseFeed(text, url);
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError || new Error('Failed to fetch feed');
  }

  static parseFeed(xmlString, sourceUrl) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'text/xml');
    const parseError = doc.querySelector('parsererror');
    if (parseError) throw new Error('Invalid XML: ' + parseError.textContent.slice(0, 100));

    const root = doc.documentElement.tagName.toLowerCase();
    if (root === 'rss') return this.parseRSS(doc, sourceUrl);
    if (root === 'rdf:rdf' || root === 'rdf') return this.parseRSS1(doc, sourceUrl);
    if (root === 'feed') return this.parseAtom(doc, sourceUrl);
    throw new Error('Unknown feed format');
  }

  static parseRSS(doc, sourceUrl) {
    const channel = doc.querySelector('channel');
    if (!channel) throw new Error('No channel found in RSS feed');

    const feed = {
      title: this.getText(channel, 'title') || 'Untitled Feed',
      link: this.getText(channel, 'link') || sourceUrl,
      description: this.getText(channel, 'description') || '',
      image: this.getText(channel, 'image > url') || '',
      language: this.getText(channel, 'language') || '',
      lastBuildDate: this.parseDate(this.getText(channel, 'lastBuildDate')),
      articles: []
    };

    doc.querySelectorAll('item').forEach(item => {
      const contentEncoded = this.getEncodedContent(item, 'content:encoded');
      const description = this.getText(item, 'description') || contentEncoded || '';

      const article = {
        id: this.generateId(this.getText(item, 'link') || this.getText(item, 'guid') || this.getText(item, 'title')),
        title: this.getText(item, 'title') || 'Untitled',
        link: this.getText(item, 'link') || '',
        description: description,
        content: contentEncoded || description,
        pubDate: this.parseDate(this.getText(item, 'pubDate') || this.getText(item, 'dc:date')),
        author: this.getText(item, 'dc:creator') || this.getText(item, 'author') || '',
        categories: this.getCategories(item),
        enclosures: this.getEnclosures(item),
        guid: this.getText(item, 'guid') || ''
      };
      feed.articles.push(article);
    });

    return feed;
  }

  static parseRSS1(doc, sourceUrl) {
    const feed = {
      title: this.getText(doc, 'channel > title') || 'Untitled Feed',
      link: this.getText(doc, 'channel > link') || sourceUrl,
      description: this.getText(doc, 'channel > description') || '',
      image: '',
      language: '',
      lastBuildDate: this.parseDate(this.getText(doc, 'channel > dc:date')),
      articles: []
    };

    doc.querySelectorAll('item').forEach(item => {
      const description = this.getText(item, 'description') || '';
      const article = {
        id: this.generateId(this.getText(item, 'link') || this.getText(item, 'title')),
        title: this.getText(item, 'title') || 'Untitled',
        link: this.getText(item, 'link') || '',
        description: description,
        content: description,
        pubDate: this.parseDate(this.getText(item, 'dc:date')),
        author: this.getText(item, 'dc:creator') || '',
        categories: this.getCategories(item),
        enclosures: [],
        guid: this.getText(item, 'rdf:about') || ''
      };
      feed.articles.push(article);
    });

    return feed;
  }

  static parseAtom(doc, sourceUrl) {
    const ns = { a: 'http://www.w3.org/2005/Atom' };

    const feed = {
      title: this.getTextNS(doc, 'a:title') || 'Untitled Feed',
      link: this.getAtomLink(doc) || sourceUrl,
      description: this.getTextNS(doc, 'a:subtitle') || this.getTextNS(doc, 'a:summary') || '',
      image: this.getAtomImage(doc),
      language: '',
      lastBuildDate: this.parseDate(this.getTextNS(doc, 'a:updated')),
      articles: []
    };

    doc.querySelectorAll('entry').forEach(entry => {
      const content = this.getTextNS(entry, 'a:content') ||
        this.getTextNS(entry, 'a:summary') || '';

      const article = {
        id: this.getTextNS(entry, 'a:id') ||
          this.getTextNS(entry, 'a:link[rel="alternate"]') ||
          this.generateId(this.getTextNS(entry, 'a:title')),
        title: this.getTextNS(entry, 'a:title') || 'Untitled',
        link: this.getEntryLink(entry) || '',
        description: this.getTextNS(entry, 'a:summary') || content,
        content: content,
        pubDate: this.parseDate(this.getTextNS(entry, 'a:published') || this.getTextNS(entry, 'a:updated')),
        author: this.getTextNS(entry, 'a:author/a:name') || '',
        categories: this.getAtomCategories(entry),
        enclosures: this.getAtomEnclosures(entry),
        guid: this.getTextNS(entry, 'a:id') || ''
      };
      feed.articles.push(article);
    });

    return feed;
  }

  static getText(parent, selector) {
    const el = parent.querySelector(selector);
    return el ? el.textContent.trim() : '';
  }

  static getTextNS(parent, selector) {
    const el = parent.querySelector(selector);
    return el ? el.textContent.trim() : '';
  }

  static getEncodedContent(item, tagName) {
    const el = item.getElementsByTagName(tagName)[0];
    if (!el) return '';
    const cdata = el.textContent;
    return cdata.trim();
  }

  static getCategories(item) {
    const cats = [];
    item.querySelectorAll('category').forEach(cat => {
      const text = cat.textContent.trim();
      if (text) cats.push(text);
    });
    return cats;
  }

  static getAtomCategories(entry) {
    const cats = [];
    entry.querySelectorAll('category').forEach(cat => {
      const term = cat.getAttribute('term') || cat.textContent.trim();
      if (term) cats.push(term);
    });
    return cats;
  }

  static getEnclosures(item) {
    const encs = [];
    item.querySelectorAll('enclosure').forEach(enc => {
      encs.push({
        url: enc.getAttribute('url') || '',
        type: enc.getAttribute('type') || '',
        length: parseInt(enc.getAttribute('length') || '0')
      });
    });
    return encs;
  }

  static getAtomEnclosures(entry) {
    const encs = [];
    entry.querySelectorAll('link[rel="enclosure"]').forEach(link => {
      encs.push({
        url: link.getAttribute('href') || '',
        type: link.getAttribute('type') || '',
        length: parseInt(link.getAttribute('length') || '0')
      });
    });
    return encs;
  }

  static getAtomLink(doc) {
    const link = doc.querySelector('link[rel="alternate"]') || doc.querySelector('link');
    return link ? link.getAttribute('href') : '';
  }

  static getAtomImage(doc) {
    const logo = doc.querySelector('logo');
    if (logo) return logo.textContent.trim();
    const icon = doc.querySelector('icon');
    if (icon) return icon.textContent.trim();
    return '';
  }

  static getEntryLink(entry) {
    const link = entry.querySelector('link[rel="alternate"]') || entry.querySelector('link');
    return link ? link.getAttribute('href') : '';
  }

  static parseDate(dateStr) {
    if (!dateStr) return Date.now();
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? Date.now() : d.getTime();
  }

  static generateId(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  static async discoverFeeds(pageUrl) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(pageUrl, { signal: controller.signal });
      clearTimeout(timeout);
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const feeds = [];

      doc.querySelectorAll('link[type="application/rss+xml"], link[type="application/atom+xml"]').forEach(link => {
        const href = link.getAttribute('href');
        if (href) {
          let url = href;
          if (href.startsWith('/')) {
            const base = new URL(pageUrl);
            url = base.origin + href;
          } else if (!href.startsWith('http')) {
            url = new URL(href, pageUrl).href;
          }
          feeds.push({
            title: link.getAttribute('title') || 'Discovered Feed',
            url: url,
            type: link.getAttribute('type') || ''
          });
        }
      });

      return feeds;
    } catch (e) {
      return [];
    }
  }
}
