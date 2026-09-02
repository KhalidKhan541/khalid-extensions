const PageSaver = {
  async saveCurrentPage(type, tab) {
    const progress = { step: '', percent: 0 };
    const updateProgress = (step, percent) => {
      progress.step = step;
      progress.percent = percent;
      chrome.runtime.sendMessage({ type: 'SAVE_PROGRESS', progress });
    };

    try {
      updateProgress('Fetching page...', 10);

      const pageData = await this.getPageData(tab);
      updateProgress('Processing content...', 30);

      let savedData;
      switch (type) {
        case 'full':
          savedData = await this.saveFullPage(pageData, tab, updateProgress);
          break;
        case 'screenshot':
          savedData = await this.saveScreenshot(pageData, tab, updateProgress);
          break;
        case 'text':
          savedData = await this.saveTextOnly(pageData, tab, updateProgress);
          break;
        case 'reading':
          savedData = await this.saveReadingMode(pageData, tab, updateProgress);
          break;
        default:
          throw new Error('Unknown save type: ' + type);
      }

      updateProgress('Saving to storage...', 90);

      const archive = {
        ...savedData,
        type,
        title: pageData.title,
        url: pageData.url,
        description: pageData.description,
        favicon: pageData.favicon,
        savedAt: Date.now(),
        size: new Blob([JSON.stringify(savedData)]).size
      };

      const saved = await StorageManager.addArchive(archive);
      updateProgress('Done!', 100);

      return { success: true, archive: saved };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getPageData(tab) {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        return {
          title: document.title,
          url: window.location.href,
          description: document.querySelector('meta[name="description"]')?.content || '',
          favicon: document.querySelector('link[rel="icon"]')?.href ||
                   document.querySelector('link[rel="shortcut icon"]')?.href ||
                   `https://www.google.com/s2/favicons?domain=${window.location.hostname}`,
          html: document.documentElement.outerHTML,
          text: document.body.innerText,
          mainContent: this.extractMainContent ? this.extractMainContent() : null
        };
      }
    });
    return results[0]?.result || {
      title: tab.title,
      url: tab.url,
      description: '',
      favicon: '',
      html: '',
      text: '',
      mainContent: null
    };
  },

  async saveFullPage(pageData, tab, updateProgress) {
    updateProgress('Extracting HTML...', 40);
    const html = this.processHtml(pageData.html, pageData.url);
    updateProgress('Extracting images...', 60);
    const images = this.extractImages(pageData.html, pageData.url);
    updateProgress('Extracting metadata...', 80);
    const metadata = this.extractMetadata(pageData);

    return {
      content: html,
      text: pageData.text,
      images,
      metadata,
      format: 'text/html'
    };
  },

  async saveScreenshot(pageData, tab, updateProgress) {
    updateProgress('Capturing screenshot...', 50);
    const dataUrl = await chrome.tabs.captureVisibleTab(null, {
      format: 'png',
      quality: 100
    });
    updateProgress('Processing image...', 80);

    return {
      content: dataUrl,
      text: pageData.text,
      metadata: this.extractMetadata(pageData),
      format: 'image/png'
    };
  },

  async saveTextOnly(pageData, tab, updateProgress) {
    updateProgress('Extracting text...', 50);
    const cleanText = this.cleanText(pageData.text);
    updateProgress('Extracting metadata...', 70);
    const metadata = this.extractMetadata(pageData);

    return {
      content: cleanText,
      text: cleanText,
      metadata,
      format: 'text/plain'
    };
  },

  async saveReadingMode(pageData, tab, updateProgress) {
    updateProgress('Extracting article...', 40);
    const content = this.extractReadingContent(pageData);
    updateProgress('Cleaning formatting...', 70);
    const metadata = this.extractMetadata(pageData);

    return {
      content: content.html,
      text: content.text,
      metadata,
      format: 'text/html',
      readingData: {
        title: content.title,
        author: content.author,
        siteName: content.siteName,
        excerpt: content.excerpt
      }
    };
  },

  processHtml(html, baseUrl) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const scripts = doc.querySelectorAll('script, noscript, iframe[src*="analytics"], iframe[src*="tracker"]');
    scripts.forEach(el => el.remove());

    const styles = doc.querySelectorAll('style');
    styles.forEach(style => {
      const text = style.textContent;
      if (text.includes('display:none') || text.includes('visibility:hidden')) {
        style.remove();
      }
    });

    const base = doc.createElement('base');
    base.href = baseUrl;
    doc.head?.prepend(base);

    return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
  },

  extractImages(html, baseUrl) {
    const images = [];
    const regex = /(?:src|data-src|data-lazy-src)=["']([^"']+\.(?:jpg|jpeg|png|gif|webp|svg|avif)[^"']*)["']/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
      let url = match[1];
      if (url.startsWith('//')) url = 'https:' + url;
      else if (url.startsWith('/')) url = new URL(url, baseUrl).href;
      else if (!url.startsWith('http')) url = new URL(url, baseUrl).href;
      if (!images.includes(url)) images.push(url);
    }
    return images.slice(0, 50);
  },

  extractMetadata(pageData) {
    return {
      title: pageData.title,
      url: pageData.url,
      description: pageData.description,
      favicon: pageData.favicon,
      charCount: pageData.text?.length || 0,
      wordCount: (pageData.text?.match(/\S+/g) || []).length
    };
  },

  cleanText(text) {
    return text
      .replace(/\t/g, '  ')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ ]{2,}/g, ' ')
      .trim();
  },

  extractReadingContent(pageData) {
    const html = pageData.html;
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const title = doc.querySelector('h1')?.textContent?.trim() ||
                  doc.querySelector('[class*="title"]')?.textContent?.trim() ||
                  pageData.title;

    const author = doc.querySelector('[rel="author"], [class*="author"], [itemprop="author"]')?.textContent?.trim() || '';
    const siteName = doc.querySelector('meta[property="og:site_name"]')?.content || new URL(pageData.url).hostname;
    const excerpt = doc.querySelector('meta[property="og:description"], meta[name="description"]')?.content || '';

    const contentEl = this.findMainContent(doc);
    let contentHtml = '';
    let contentText = '';

    if (contentEl) {
      this.cleanReadingElement(contentEl);
      contentHtml = contentEl.innerHTML;
      contentText = contentEl.textContent;
    } else {
      contentHtml = doc.body?.innerHTML || '';
      contentText = pageData.text;
    }

    return {
      title,
      author,
      siteName,
      excerpt,
      html: contentHtml,
      text: contentText
    };
  },

  findMainContent(doc) {
    const selectors = [
      'article',
      '[role="main"]',
      'main',
      '.post-content',
      '.article-content',
      '.entry-content',
      '.content',
      '#content',
      '.post-body',
      '.story-body',
      '.article-body'
    ];

    for (const sel of selectors) {
      const el = doc.querySelector(sel);
      if (el && el.textContent.trim().length > 200) return el;
    }

    const paragraphs = doc.querySelectorAll('p');
    if (paragraphs.length >= 3) {
      let bestParent = null;
      let bestScore = 0;
      paragraphs.forEach(p => {
        const parent = p.parentElement;
        if (!parent) return;
        const score = p.textContent.trim().length;
        if (score > bestScore) {
          bestScore = score;
          bestParent = parent;
        }
      });
      if (bestParent && bestScore > 500) return bestParent;
    }

    return null;
  },

  cleanReadingElement(el) {
    const remove = el.querySelectorAll(
      'script, style, nav, header, footer, .sidebar, .ad, .ads, .advertisement, ' +
      '[class*="social"], [class*="share"], [class*="comment"], [class*="related"], ' +
      '[class*="recommend"], [class*="popup"], [class*="modal"], [class*="banner"]'
    );
    remove.forEach(node => node.remove());

    el.querySelectorAll('img').forEach(img => {
      if (img.width < 100 || img.height < 100) {
        img.remove();
      }
    });
  }
};
