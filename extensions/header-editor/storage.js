export class Storage {
  constructor() {
    this.capturedHeaders = new Map();
  }

  async initialize() {
    const data = await chrome.storage.local.get(['rules', 'settings']);
    if (!data.rules) {
      await chrome.storage.local.set({ rules: [] });
    }
    if (!data.settings) {
      await chrome.storage.local.set({
        settings: {
          theme: 'light',
          captureEnabled: true,
          maxCapturedHeaders: 1000
        }
      });
    }
  }

  async getRules() {
    const data = await chrome.storage.local.get('rules');
    return data.rules || [];
  }

  async saveRule(rule) {
    const rules = await this.getRules();
    const index = rules.findIndex((r) => r.id === rule.id);
    if (index >= 0) {
      rules[index] = rule;
    } else {
      rule.id = this.generateId();
      rules.push(rule);
    }
    await chrome.storage.local.set({ rules });
  }

  async deleteRule(ruleId) {
    const rules = await this.getRules();
    const filtered = rules.filter((r) => r.id !== ruleId);
    await chrome.storage.local.set({ rules: filtered });
  }

  async toggleRule(ruleId) {
    const rules = await this.getRules();
    const rule = rules.find((r) => r.id === ruleId);
    if (rule) {
      rule.enabled = !rule.enabled;
      await chrome.storage.local.set({ rules });
    }
  }

  async getSettings() {
    const data = await chrome.storage.local.get('settings');
    return data.settings || { theme: 'light', captureEnabled: true, maxCapturedHeaders: 1000 };
  }

  async saveSettings(settings) {
    await chrome.storage.local.set({ settings });
  }

  async importRules(rulesData) {
    const rules = Array.isArray(rulesData) ? rulesData : rulesData.rules || [];
    const existing = await this.getRules();
    const existingIds = new Set(existing.map((r) => r.id));
    const newRules = rules.filter((r) => !existingIds.has(r.id));
    const merged = [...existing, ...newRules];
    await chrome.storage.local.set({ rules: merged });
  }

  async exportRules() {
    return await this.getRules();
  }

  async captureHeaders(url, requestHeaders, responseHeaders) {
    const settings = await this.getSettings();
    if (!settings.captureEnabled) return;

    if (this.capturedHeaders.size >= settings.maxCapturedHeaders) {
      const firstKey = this.capturedHeaders.keys().next().value;
      this.capturedHeaders.delete(firstKey);
    }

    this.capturedHeaders.set(url, {
      requestHeaders: requestHeaders || [],
      responseHeaders: responseHeaders || [],
      timestamp: Date.now()
    });
  }

  async getCapturedHeaders(url) {
    if (url) {
      return this.capturedHeaders.get(url) || null;
    }
    return Array.from(this.capturedHeaders.entries()).map(([url, headers]) => ({
      url,
      ...headers
    }));
  }

  async applyRequestHeaders(details) {
    const rules = await this.getRules();
    const applicableRules = rules.filter(
      (r) => r.enabled && r.type === 'request' && this.matchesPattern(details.url, r.pattern)
    );

    if (applicableRules.length === 0) return { requestHeaders: details.requestHeaders };

    let headers = [...(details.requestHeaders || [])];

    for (const rule of applicableRules) {
      if (rule.action === 'add') {
        headers.push({ name: rule.headerName, value: rule.headerValue });
      } else if (rule.action === 'set') {
        const existingIndex = headers.findIndex(
          (h) => h.name.toLowerCase() === rule.headerName.toLowerCase()
        );
        if (existingIndex >= 0) {
          headers[existingIndex].value = rule.headerValue;
        } else {
          headers.push({ name: rule.headerName, value: rule.headerValue });
        }
      } else if (rule.action === 'remove') {
        headers = headers.filter(
          (h) => h.name.toLowerCase() !== rule.headerName.toLowerCase()
        );
      }
    }

    return { requestHeaders: headers };
  }

  async applyResponseHeaders(details) {
    const rules = await this.getRules();
    const applicableRules = rules.filter(
      (r) => r.enabled && r.type === 'response' && this.matchesPattern(details.url, r.pattern)
    );

    if (applicableRules.length === 0) return { responseHeaders: details.responseHeaders };

    let headers = [...(details.responseHeaders || [])];

    for (const rule of applicableRules) {
      if (rule.action === 'add') {
        headers.push({ name: rule.headerName, value: rule.headerValue });
      } else if (rule.action === 'set') {
        const existingIndex = headers.findIndex(
          (h) => h.name.toLowerCase() === rule.headerName.toLowerCase()
        );
        if (existingIndex >= 0) {
          headers[existingIndex].value = rule.headerValue;
        } else {
          headers.push({ name: rule.headerName, value: rule.headerValue });
        }
      } else if (rule.action === 'remove') {
        headers = headers.filter(
          (h) => h.name.toLowerCase() !== rule.headerName.toLowerCase()
        );
      }
    }

    return { responseHeaders: headers };
  }

  matchesPattern(url, pattern) {
    if (!pattern || pattern === '*') return true;

    try {
      const regexPattern = pattern
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
      const regex = new RegExp(`^${regexPattern}$`, 'i');
      return regex.test(url);
    } catch {
      return url.includes(pattern);
    }
  }

  generateId() {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
