class WebClipperEngine {
  constructor() {
    this.titleSelectors = [
      'h1', 'h2.title', '.post-title', '.entry-title', '.article-title',
      '[class*="title"]', 'title'
    ];
    this.authorSelectors = [
      '.author', '.byline', '[rel="author"]', '.post-author',
      '[class*="author"]', 'meta[name="author"]'
    ];
    this.dateSelectors = [
      'time', '.date', '.post-date', '[datetime]', '.publish-date',
      '[class*="date"]', 'meta[name="date"]'
    ];
    this.contentSelectors = [
      'article', '.post-content', '.entry-content', '.article-content',
      '.content', 'main', '#content', '[role="main"]'
    ];
    this.removeSelectors = [
      'script', 'style', 'noscript', 'iframe:not([src*="youtube"]):not([src*="vimeo"])',
      '.ad', '.ads', '.advertisement', '.sidebar', '.nav', '.navigation',
      '.menu', '.footer', '.header', '[class*="sidebar"]', '[class*="menu"]',
      '[class*="nav"]', '[class*="footer"]', '[class*="header"]',
      '[class*="social"]', '[class*="share"]', '[class*="comment"]',
      '[class*="related"]', '[class*="recommend"]', '[class*="promo"]',
      '[class*="banner"]', '[class*="popup"]', '[class*="modal"]',
      '[id*="sidebar"]', '[id*="menu"]', '[id*="nav"]', '[id*="footer"]',
      '[id*="header"]', '[id*="comment"]'
    ];
  }

  extractPageMetadata(doc) {
    const meta = {};

    const titleEl = this.findFirst(doc, this.titleSelectors);
    meta.title = titleEl ? titleEl.textContent.trim() : doc.title || '';

    for (const sel of this.authorSelectors) {
      const el = doc.querySelector(sel);
      if (el) {
        meta.author = el.getAttribute('content') || el.textContent.trim();
        break;
      }
    }

    for (const sel of this.dateSelectors) {
      const el = doc.querySelector(sel);
      if (el) {
        meta.date = el.getAttribute('datetime') || el.getAttribute('content') || el.textContent.trim();
        break;
      }
    }

    const descMeta = doc.querySelector('meta[name="description"]');
    meta.description = descMeta ? descMeta.getAttribute('content') : '';

    const ogImage = doc.querySelector('meta[property="og:image"]');
    meta.image = ogImage ? ogImage.getAttribute('content') : '';

    meta.url = doc.location ? doc.location.href : '';
    meta.siteName = doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content') || '';

    return meta;
  }

  findFirst(doc, selectors) {
    for (const sel of selectors) {
      try {
        const el = doc.querySelector(sel);
        if (el && el.textContent.trim().length > 0) return el;
      } catch (e) {}
    }
    return null;
  }

  extractArticleContent(doc) {
    let contentEl = null;

    for (const sel of this.contentSelectors) {
      try {
        const el = doc.querySelector(sel);
        if (el && el.textContent.trim().length > 200) {
          contentEl = el;
          break;
        }
      } catch (e) {}
    }

    if (!contentEl) {
      contentEl = doc.body || doc.documentElement;
    }

    const clone = contentEl.cloneNode(true);
    this.removeUnwantedElements(clone);
    this.cleanContent(clone);

    return clone;
  }

  removeUnwantedElements(element) {
    for (const sel of this.removeSelectors) {
      try {
        const els = element.querySelectorAll(sel);
        els.forEach(el => el.remove());
      } catch (e) {}
    }

    element.querySelectorAll('[aria-hidden="true"]').forEach(el => el.remove());
    element.querySelectorAll('[hidden]').forEach(el => el.remove());
    element.querySelectorAll('button:not([type="submit"])').forEach(el => {
      if (el.textContent.trim().length < 3) el.remove();
    });
  }

  cleanContent(element) {
    const allElements = element.querySelectorAll('*');
    for (const el of allElements) {
      const text = el.textContent.trim();
      if (text.length === 0 && !['IMG', 'BR', 'HR', 'INPUT', 'VIDEO', 'AUDIO', 'IFRAME'].includes(el.tagName)) {
        el.remove();
        continue;
      }

      if (el.style) {
        el.style.cssText = '';
      }
      el.removeAttribute('class');
      el.removeAttribute('id');
      el.removeAttribute('style');
    }
  }

  extractArticle(doc) {
    const meta = this.extractPageMetadata(doc);
    const content = this.extractArticleContent(doc);

    const images = this.extractImages(content);
    const html = content.innerHTML;
    const text = this.htmlToText(content);
    const markdown = this.htmlToMarkdown(content);
    const excerpt = text.substring(0, 500).trim();

    return {
      meta,
      content: text,
      html,
      markdown,
      excerpt,
      images,
      tables: this.extractTables(content),
      codeBlocks: this.extractCodeBlocks(content)
    };
  }

  extractImages(element) {
    const images = [];
    const seen = new Set();

    element.querySelectorAll('img').forEach(img => {
      const src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
      if (src && !seen.has(src) && !src.startsWith('data:')) {
        seen.add(src);
        images.push({
          src: this.resolveUrl(src),
          alt: img.getAttribute('alt') || '',
          title: img.getAttribute('title') || '',
          width: img.getAttribute('width') || img.naturalWidth || '',
          height: img.getAttribute('height') || img.naturalHeight || ''
        });
      }
    });

    return images;
  }

  resolveUrl(url) {
    try {
      return new URL(url, window.location.href).href;
    } catch (e) {
      return url;
    }
  }

  extractTables(element) {
    const tables = [];
    element.querySelectorAll('table').forEach((table, index) => {
      const headers = [];
      table.querySelectorAll('th').forEach(th => headers.push(th.textContent.trim()));

      const rows = [];
      table.querySelectorAll('tbody tr, tr').forEach(tr => {
        const cells = [];
        tr.querySelectorAll('td').forEach(td => cells.push(td.textContent.trim()));
        if (cells.length > 0) rows.push(cells);
      });

      if (headers.length || rows.length) {
        tables.push({ index, headers, rows });
      }
    });

    return tables;
  }

  extractCodeBlocks(element) {
    const blocks = [];
    element.querySelectorAll('pre, code').forEach((block, index) => {
      const text = block.textContent.trim();
      if (text.length > 10) {
        const language = block.className.match(/language-(\w+)/)?.[1] ||
                        block.className.match(/lang-(\w+)/)?.[1] || '';
        blocks.push({ index, language, text });
      }
    });

    return blocks;
  }

  htmlToText(element) {
    const clone = element.cloneNode(true);
    this.removeUnwantedElements(clone);

    let text = '';
    const walk = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, null, false);

    let node;
    while (node = walk.nextNode()) {
      if (node.nodeType === Node.TEXT_NODE) {
        const t = node.textContent.trim();
        if (t) text += t + ' ';
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = node.tagName.toLowerCase();
        if (['P', 'DIV', 'BR', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'TR'].includes(tag)) {
          text += '\n';
        }
        if (tag === 'blockquote') text += '\n> ';
        if (tag === 'li') text += '- ';
      }
    }

    return text.replace(/\n{3,}/g, '\n\n').replace(/\s+/g, ' ').trim();
  }

  htmlToMarkdown(element) {
    const clone = element.cloneNode(true);
    this.removeUnwantedElements(clone);

    return this.nodeToMarkdown(clone).replace(/\n{3,}/g, '\n\n').trim();
  }

  nodeToMarkdown(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const tag = node.tagName.toLowerCase();
    const children = Array.from(node.childNodes).map(n => this.nodeToMarkdown(n)).join('');

    switch (tag) {
      case 'h1': return `\n# ${children.trim()}\n\n`;
      case 'h2': return `\n## ${children.trim()}\n\n`;
      case 'h3': return `\n### ${children.trim()}\n\n`;
      case 'h4': return `\n#### ${children.trim()}\n\n`;
      case 'h5': return `\n##### ${children.trim()}\n\n`;
      case 'h6': return `\n###### ${children.trim()}\n\n`;
      case 'p': return `\n${children.trim()}\n\n`;
      case 'br': return '\n';
      case 'strong': case 'b': return `**${children.trim()}**`;
      case 'em': case 'i': return `*${children.trim()}*`;
      case 'del': case 's': return `~~${children.trim()}~~`;
      case 'code':
        if (node.parentElement && node.parentElement.tagName.toLowerCase() === 'pre') return children;
        return `\`${children.trim()}\``;
      case 'pre': {
        const code = node.querySelector('code');
        const lang = code?.className?.match(/language-(\w+)/)?.[1] || '';
        return `\n\`\`\`${lang}\n${(code || node).textContent.trim()}\n\`\`\`\n\n`;
      }
      case 'a': {
        const href = node.getAttribute('href');
        const text = children.trim();
        if (!href || href.startsWith('javascript:')) return text;
        return `[${text}](${href})`;
      }
      case 'img': {
        const src = node.getAttribute('src') || node.getAttribute('data-src');
        const alt = node.getAttribute('alt') || '';
        return src ? `![${alt}](${src})` : '';
      }
      case 'blockquote': return `\n> ${children.trim()}\n\n`;
      case 'ul': return '\n' + children + '\n';
      case 'ol': return '\n' + children + '\n';
      case 'li': return `- ${children.trim()}\n`;
      case 'hr': return '\n---\n\n';
      case 'table': return this.tableToMarkdown(node);
      case 'tr': case 'thead': case 'tbody': case 'tfoot': return children;
      case 'th': case 'td': return `| ${children.trim()} `;
      case 'div': case 'section': case 'article': return children;
      case 'span': return children;
      default: return children;
    }
  }

  tableToMarkdown(tableNode) {
    let markdown = '\n';
    const rows = tableNode.querySelectorAll('tr');

    rows.forEach((row, rowIndex) => {
      const cells = row.querySelectorAll('th, td');
      const cellTexts = Array.from(cells).map(c => c.textContent.trim());
      markdown += '| ' + cellTexts.join(' | ') + ' |\n';

      if (rowIndex === 0) {
        markdown += '| ' + cellTexts.map(() => '---').join(' | ') + ' |\n';
      }
    });

    return markdown + '\n';
  }

  cleanContentForClip(content) {
    let cleaned = content
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    cleaned = cleaned
      .replace(/\[.*?\]\(javascript:.*?\)/g, '')
      .replace(/https?:\/\/[^\s]+/g, (url) => {
        return url.length > 80 ? url.substring(0, 77) + '...' : url;
      });

    return cleaned;
  }

  extractSelection() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    const fragment = range.cloneContents();
    const div = document.createElement('div');
    div.appendChild(fragment);

    const meta = this.extractPageMetadata(document);
    const images = this.extractImages(div);
    const html = div.innerHTML;
    const text = this.htmlToText(div);
    const markdown = this.htmlToMarkdown(div);

    return {
      meta,
      content: text,
      html,
      markdown,
      excerpt: text.substring(0, 500).trim(),
      images,
      type: 'selection'
    };
  }

  extractFullPage() {
    const meta = this.extractPageMetadata(document);
    const content = document.body.cloneNode(true);
    this.removeUnwantedElements(content);

    const images = this.extractImages(content);
    const html = content.innerHTML;
    const text = this.htmlToText(content);
    const markdown = this.htmlToMarkdown(content);

    return {
      meta,
      content: text,
      html,
      markdown,
      excerpt: text.substring(0, 500).trim(),
      images,
      type: 'fullpage'
    };
  }

  extractArticleContentFromPage() {
    const meta = this.extractPageMetadata(document);
    const content = this.extractArticleContent(document);

    const images = this.extractImages(content);
    const html = content.innerHTML;
    const text = this.htmlToText(content);
    const markdown = this.htmlToMarkdown(content);

    return {
      meta,
      content: text,
      html,
      markdown,
      excerpt: text.substring(0, 500).trim(),
      images,
      type: 'article'
    };
  }

  async captureScreenshot() {
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: 'captureScreenshot' }, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response?.dataUrl);
          }
        });
      });
      return dataUrl;
    } catch (e) {
      return null;
    }
  }
}

window.clipperEngine = new WebClipperEngine();
