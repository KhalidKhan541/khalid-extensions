import { FilterLists } from './filter-lists.js';

export class Blocker {
  constructor() {
    this.initialized = false;
    this.adDomains = new Set();
    this.trackerDomains = new Set();
    this.cryptominerDomains = new Set();
    this.fingerprinterDomains = new Set();
    this.malwareDomains = new Set();
    this.customDomains = new Set();
    this.adPatterns = [];
    this.trackerPatterns = [];
    this.resourceTypeMap = {
      'script': 'ads',
      'image': 'ads',
      'stylesheet': 'ads',
      'xmlhttprequest': 'trackers',
      'sub_frame': 'trackers',
      'font': 'ads',
      'media': 'ads',
      'websocket': 'trackers',
      'webtransport': 'trackers',
      'webbundle': 'trackers',
      'other': 'ads'
    };
    this.blockStats = {
      ads: 0,
      trackers: 0,
      cryptominers: 0,
      fingerprinters: 0,
      malware: 0
    };
    this.falsePositiveCache = new Map();
    this.tabStats = {};
  }

  async initialize(filterLists) {
    if (this.initialized) return;

    await filterLists.loadFilters();
    this.adDomains = filterLists.getAdDomains();
    this.trackerDomains = filterLists.getTrackerDomains();
    this.cryptominerDomains = filterLists.getCryptominerDomains();
    this.fingerprinterDomains = filterLists.getFingerprinterDomains();
    this.malwareDomains = filterLists.getMalwareDomains();
    this.adPatterns = filterLists.getAdPatterns();
    this.trackerPatterns = filterLists.getTrackerPatterns();
    this.initialized = true;
  }

  checkUrl(url, resourceType, tabId) {
    if (!this.initialized) {
      return { blocked: false };
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return { blocked: false };
    }

    const hostname = parsedUrl.hostname;
    const fullUrl = url.toLowerCase();
    const path = parsedUrl.pathname.toLowerCase();
    const query = parsedUrl.search.toLowerCase();

    if (this.isFalsePositive(hostname, url)) {
      return { blocked: false };
    }

    if (this.malwareDomains.has(hostname)) {
      this.recordBlock(tabId, 'malware');
      return { blocked: true, category: 'malware' };
    }

    if (this.cryptominerDomains.has(hostname)) {
      this.recordBlock(tabId, 'cryptominers');
      return { blocked: true, category: 'cryptominers' };
    }

    if (this.fingerprinterDomains.has(hostname)) {
      this.recordBlock(tabId, 'fingerprinters');
      return { blocked: true, category: 'fingerprinters' };
    }

    if (this.adDomains.has(hostname)) {
      this.recordBlock(tabId, 'ads');
      return { blocked: true, category: 'ads' };
    }

    if (this.trackerDomains.has(hostname)) {
      this.recordBlock(tabId, 'trackers');
      return { blocked: true, category: 'trackers' };
    }

    if (this.customDomains.has(hostname)) {
      const category = this.guessCategoryFromUrl(url);
      this.recordBlock(tabId, category);
      return { blocked: true, category };
    }

    if (this.customDomains.has(hostname)) {
      return { blocked: true, category: 'ads' };
    }

    if (this.checkPatterns(fullUrl, path, query, resourceType)) {
      const category = this.guessCategoryFromUrl(url);
      this.recordBlock(tabId, category);
      return { blocked: true, category };
    }

    if (this.checkSubdomains(hostname)) {
      const category = this.guessCategoryFromUrl(url);
      this.recordBlock(tabId, category);
      return { blocked: true, category };
    }

    return { blocked: false };
  }

  checkPatterns(fullUrl, path, query, resourceType) {
    for (const pattern of this.adPatterns) {
      if (this.matchPattern(fullUrl, path, query, pattern)) {
        return 'ads';
      }
    }

    for (const pattern of this.trackerPatterns) {
      if (this.matchPattern(fullUrl, path, query, pattern)) {
        return 'trackers';
      }
    }

    return null;
  }

  matchPattern(fullUrl, path, query, pattern) {
    if (pattern.startsWith('||')) {
      const domain = pattern.slice(2).replace(/\^.*$/, '');
      if (fullUrl.includes(domain)) return true;
    }

    if (pattern.startsWith('|')) {
      const rest = pattern.slice(1);
      if (fullUrl.endsWith(rest) || path.endsWith(rest)) return true;
    }

    if (pattern.endsWith('|')) {
      const rest = pattern.slice(0, -1);
      if (fullUrl.startsWith(rest) || path.startsWith(rest)) return true;
    }

    if (pattern.includes('*')) {
      const regex = new RegExp(
        pattern
          .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
          .replace(/\*/g, '.*'),
        'i'
      );
      if (regex.test(fullUrl) || regex.test(path)) return true;
    }

    if (fullUrl.includes(pattern) || path.includes(pattern)) {
      return true;
    }

    if (query.includes(pattern)) {
      return true;
    }

    return false;
  }

  checkSubdomains(hostname) {
    const parts = hostname.split('.');
    for (let i = 1; i < parts.length; i++) {
      const parent = parts.slice(i).join('.');
      if (this.adDomains.has(parent) || this.trackerDomains.has(parent)) {
        return true;
      }
    }
    return false;
  }

  isFalsePositive(hostname, url) {
    const cacheKey = hostname;
    if (this.falsePositiveCache.has(cacheKey)) {
      return this.falsePositiveCache.get(cacheKey);
    }

    const trustedDomains = [
      'google.com', 'googleapis.com', 'gstatic.com',
      'youtube.com', 'ytimg.com',
      'facebook.com', 'fbcdn.net',
      'twitter.com', 'twimg.com',
      'github.com', 'github.io',
      'cloudflare.com',
      'amazon.com', 'amazonaws.com',
      'microsoft.com', 'live.com',
      'apple.com',
      'mozilla.org', 'firefox.com',
      'wikipedia.org',
      'stackoverflow.com',
      'reddit.com', 'redd.it',
      'linkedin.com',
      'instagram.com',
      'tiktok.com'
    ];

    for (const trusted of trustedDomains) {
      if (hostname === trusted || hostname.endsWith('.' + trusted)) {
        this.falsePositiveCache.set(cacheKey, true);
        return true;
      }
    }

    this.falsePositiveCache.set(cacheKey, false);
    return false;
  }

  guessCategoryFromUrl(url) {
    const lower = url.toLowerCase();
    if (lower.includes('ad') || lower.includes('banner') || lower.includes('popup')) return 'ads';
    if (lower.includes('track') || lower.includes('analytics') || lower.includes('pixel')) return 'trackers';
    if (lower.includes('miner') || lower.includes('crypto')) return 'cryptominers';
    if (lower.includes('fingerprint') || lower.includes('canvas')) return 'fingerprinters';
    if (lower.includes('malware') || lower.includes('phish') || lower.includes('virus')) return 'malware';
    return 'ads';
  }

  recordBlock(tabId, category) {
    this.blockStats[category]++;
    if (!this.tabStats[tabId]) {
      this.tabStats[tabId] = { ads: 0, trackers: 0, cryptominers: 0, fingerprinters: 0, malware: 0 };
    }
    this.tabStats[tabId][category]++;
  }

  setCustomDomains(domains) {
    this.customDomains = new Set(domains);
  }

  async updateRules(filterLists, categoryEnabled) {
    await filterLists.loadFilters();

    const rules = [];
    let ruleId = 1;

    if (categoryEnabled.ads) {
      for (const domain of filterLists.getAdDomains()) {
        rules.push(this.createBlockRule(ruleId++, domain, 'ads'));
      }
    }

    if (categoryEnabled.trackers) {
      for (const domain of filterLists.getTrackerDomains()) {
        rules.push(this.createBlockRule(ruleId++, domain, 'trackers'));
      }
    }

    if (categoryEnabled.cryptominers) {
      for (const domain of filterLists.getCryptominerDomains()) {
        rules.push(this.createBlockRule(ruleId++, domain, 'cryptominers'));
      }
    }

    if (categoryEnabled.fingerprinters) {
      for (const domain of filterLists.getFingerprinterDomains()) {
        rules.push(this.createBlockRule(ruleId++, domain, 'fingerprinters'));
      }
    }

    if (categoryEnabled.malware) {
      for (const domain of filterLists.getMalwareDomains()) {
        rules.push(this.createBlockRule(ruleId++, domain, 'malware'));
      }
    }

    const.updateDynamicRules = {
      removeRuleIds: Array.from({ length: 1000 }, (_, i) => i + 1),
      addRules: rules.slice(0, 1000)
    };

    try {
      await chrome.declarativeNetRequest.updateDynamicRules(updateDynamicRules);
    } catch (err) {
      console.error('Failed to update rules:', err);
    }
  }

  createBlockRule(id, domain, category) {
    return {
      id,
      priority: 1,
      action: {
        type: 'block',
        meta: { category }
      },
      condition: {
        urlFilter: `||${domain}`,
        resourceTypes: [
          'script', 'image', 'stylesheet', 'xmlhttprequest',
          'sub_frame', 'font', 'media', 'websocket', 'other'
        ]
      }
    };
  }

  getStats() {
    return { ...this.blockStats };
  }

  getTabStats(tabId) {
    return this.tabStats[tabId] || { ads: 0, trackers: 0, cryptominers: 0, fingerprinters: 0, malware: 0 };
  }

  getPerformanceImpact() {
    const total = Object.values(this.blockStats).reduce((a, b) => a + b, 0);
    const savedBytes = total * 15000;
    return {
      requestsBlocked: total,
      estimatedBytesSaved: savedBytes,
      estimatedTimeSaved: Math.round(total * 0.1)
    };
  }
}
