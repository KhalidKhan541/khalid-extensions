class WebClipperBackground {
  constructor() {
    this.init();
  }

  init() {
    this.setupContextMenu();
    this.setupMessageListener();
    this.setupCommandListener();
    this.updateBadge();
  }

  setupContextMenu() {
    chrome.runtime.onInstalled.addListener(() => {
      chrome.contextMenus.create({
        id: 'web-clipper-root',
        title: 'Clip to Web Clipper',
        contexts: ['page', 'selection', 'link', 'image']
      });

      chrome.contextMenus.create({
        id: 'clip-selection',
        parentId: 'web-clipper-root',
        title: 'Clip Selection',
        contexts: ['selection']
      });

      chrome.contextMenus.create({
        id: 'clip-page',
        parentId: 'web-clipper-root',
        title: 'Clip Full Page',
        contexts: ['page']
      });

      chrome.contextMenus.create({
        id: 'clip-article',
        parentId: 'web-clipper-root',
        title: 'Clip Article',
        contexts: ['page']
      });

      chrome.contextMenus.create({
        id: 'clip-link',
        parentId: 'web-clipper-root',
        title: 'Clip Link',
        contexts: ['link']
      });

      chrome.contextMenus.create({
        id: 'clip-image',
        parentId: 'web-clipper-root',
        title: 'Clip Image',
        contexts: ['image']
      });

      chrome.contextMenus.create({
        id: 'screenshot-clip',
        parentId: 'web-clipper-root',
        title: 'Screenshot Clip',
        contexts: ['page']
      });
    });

    chrome.contextMenus.onClicked.addListener((info, tab) => {
      this.handleContextMenuClick(info, tab);
    });
  }

  async handleContextMenuClick(info, tab) {
    switch (info.menuItemId) {
      case 'clip-selection':
        await this.clipSelection(tab);
        break;
      case 'clip-page':
        await this.clipFullPage(tab);
        break;
      case 'clip-article':
        await this.clipArticle(tab);
        break;
      case 'clip-link':
        await this.clipLink(info.linkUrl, tab);
        break;
      case 'clip-image':
        await this.clipImage(info.srcUrl, tab);
        break;
      case 'screenshot-clip':
        await this.screenshotClip(tab);
        break;
    }
  }

  async clipSelection(tab) {
    try {
      const response = await this.sendToTab(tab.id, { action: 'getSelection' });
      if (response) {
        this.showPreview(tab.id, response);
      }
    } catch (e) {
      console.error('Clip selection failed:', e);
    }
  }

  async clipFullPage(tab) {
    try {
      const response = await this.sendToTab(tab.id, { action: 'getFullPage' });
      if (response) {
        this.showPreview(tab.id, response);
      }
    } catch (e) {
      console.error('Clip full page failed:', e);
    }
  }

  async clipArticle(tab) {
    try {
      const response = await this.sendToTab(tab.id, { action: 'getArticle' });
      if (response) {
        this.showPreview(tab.id, response);
      }
    } catch (e) {
      console.error('Clip article failed:', e);
    }
  }

  async clipLink(url, tab) {
    try {
      const response = await fetch(url);
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const title = doc.title || url;
      const description = doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';

      const clip = {
        url,
        title,
        content: description,
        html: '',
        markdown: '',
        excerpt: description,
        type: 'link',
        collection: 'Uncategorized',
        tags: [],
        annotation: '',
        highlights: [],
        images: [],
        metadata: { url, title, description },
        date: Date.now()
      };

      const storage = await this.getStorage();
      await storage.saveClip(clip);

      this.showToast(tab.id, 'Link clipped successfully!');
      this.updateBadge();
    } catch (e) {
      console.error('Clip link failed:', e);
    }
  }

  async clipImage(imageUrl, tab) {
    try {
      const clip = {
        url: tab.url,
        title: `Image from ${new URL(tab.url).hostname}`,
        content: `![Image](${imageUrl})`,
        html: `<img src="${imageUrl}" alt="Clipped image">`,
        markdown: `![Image](${imageUrl})`,
        excerpt: `Image clipped from ${tab.url}`,
        type: 'image',
        collection: 'Uncategorized',
        tags: [],
        annotation: '',
        highlights: [],
        images: [{ src: imageUrl, alt: 'Clipped image' }],
        metadata: { imageUrl, sourceUrl: tab.url },
        date: Date.now()
      };

      const storage = await this.getStorage();
      await storage.saveClip(clip);

      this.showToast(tab.id, 'Image clipped successfully!');
      this.updateBadge();
    } catch (e) {
      console.error('Clip image failed:', e);
    }
  }

  async screenshotClip(tab) {
    try {
      const dataUrl = await this.captureVisibleTab(tab);

      const clip = {
        url: tab.url,
        title: `Screenshot - ${tab.title || 'Untitled'}`,
        content: `Screenshot of: ${tab.url}\n${tab.title || ''}`,
        html: `<img src="${dataUrl}" alt="Screenshot" style="max-width:100%;">`,
        markdown: `![Screenshot](${dataUrl})`,
        excerpt: `Screenshot of ${tab.url}`,
        type: 'screenshot',
        collection: 'Uncategorized',
        tags: [],
        annotation: '',
        highlights: [],
        images: [{ src: dataUrl, alt: 'Screenshot' }],
        metadata: { screenshotUrl: dataUrl, sourceUrl: tab.url },
        date: Date.now()
      };

      const storage = await this.getStorage();
      await storage.saveClip(clip);

      this.showToast(tab.id, 'Screenshot saved!');
      this.updateBadge();
    } catch (e) {
      console.error('Screenshot failed:', e);
    }
  }

  async captureVisibleTab(tab) {
    return new Promise((resolve, reject) => {
      chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png', quality: 100 }, (dataUrl) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(dataUrl);
        }
      });
    });
  }

  showPreview(tabId, clipData) {
    this.sendToTab(tabId, { action: 'showPreview', clipData });
  }

  async getStorage() {
    if (!window._bgStorage) {
      window._bgStorage = new WebClipperStorage();
      await window._bgStorage.init();
    }
    return window._bgStorage;
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      switch (msg.action) {
        case 'clipSaved':
          this.updateBadge();
          sendResponse({ ok: true });
          break;

        case 'captureScreenshot':
          if (sender.tab) {
            this.captureVisibleTab(sender.tab)
              .then(dataUrl => sendResponse({ dataUrl }))
              .catch(() => sendResponse({ dataUrl: null }));
          } else {
            sendResponse({ dataUrl: null });
          }
          return true;

        case 'getClipCount':
          this.getStorage().then(storage => {
            storage.getAllClips().then(clips => {
              sendResponse({ count: clips.length });
            });
          });
          return true;

        case 'openPopup':
          chrome.action.openPopup();
          sendResponse({ ok: true });
          break;
      }
      return true;
    });
  }

  setupCommandListener() {
    chrome.commands.onCommand.addListener(async (command) => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) return;

      switch (command) {
        case 'clip-selection':
          await this.clipSelection(tab);
          break;
        case 'clip-page':
          await this.clipFullPage(tab);
          break;
      }
    });
  }

  async updateBadge() {
    try {
      const storage = await this.getStorage();
      const clips = await storage.getAllClips();
      const count = clips.length;

      chrome.action.setBadgeText({ text: count > 0 ? count.toString() : '' });
      chrome.action.setBadgeBackgroundColor({ color: '#4a90d9' });
    } catch (e) {}
  }

  showToast(tabId, message) {
    this.sendToTab(tabId, { action: 'showToast', message, type: 'success' }).catch(() => {});
  }

  async sendToTab(tabId, message) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }
}

new WebClipperBackground();
