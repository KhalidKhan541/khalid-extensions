/**
 * Quick Notes - Markdown Parser
 * Lightweight, fast markdown parser with syntax highlighting support
 */

class MarkdownParser {
  constructor() {
    this.rules = {
      // Block-level
      heading: /^(#{1,6})\s+(.+)$/gm,
      hr: /^(\*{3,}|-{3,}|_{3,})$/gm,
      blockquote: /^>\s+(.+)$/gm,
      codeBlock: /^```(\w*)\n([\s\S]*?)^```$/gm,
      table: /^\|(.+)\|\n\|[-| ]+\|\n((?:\|.+\|\n?)*)/gm,

      // Inline
      bold: /(\*{2}|_{2})(.+?)\1/g,
      italic: /(\*|_)(.+?)\1/g,
      strikethrough: /~~(.+?)~~/g,
      inlineCode: /`([^`]+)`/g,
      link: /\[([^\]]+)\]\(([^)]+)\)/g,
      image: /!\[([^\]]*)\]\(([^)]+)\)/g,
      taskItem: /^(\s*)- \[([ x])\] (.+)$/gm,

      // Lists
      unorderedList: /^(\s*)[-*+]\s+(.+)$/gm,
      orderedList: /^(\s*)\d+\.\s+(.+)$/gm
    };
  }

  parse(markdown) {
    if (!markdown) return '';

    let html = markdown;

    // Preserve code blocks
    const codeBlocks = [];
    html = html.replace(this.rules.codeBlock, (match, lang, code) => {
      const id = codeBlocks.length;
      codeBlocks.push({ lang, code: this._escapeHtml(code.trim()) });
      return `%%CODEBLOCK_${id}%%`;
    });

    // Preserve inline code
    const inlineCodes = [];
    html = html.replace(this.rules.inlineCode, (match, code) => {
      const id = inlineCodes.length;
      inlineCodes.push(this._escapeHtml(code));
      return `%%INLINECODE_${id}%%`;
    });

    // Process block-level elements
    html = this._parseHeadings(html);
    html = this._parseHorizontalRules(html);
    html = this._parseBlockquotes(html);
    html = this._parseTables(html);
    html = this._parseTaskItems(html);
    html = this._parseLists(html);

    // Process inline elements
    html = this._parseBold(html);
    html = this._parseItalic(html);
    html = this._parseStrikethrough(html);
    html = this._parseLinks(html);
    html = this._parseImages(html);

    // Handle paragraphs
    html = this._parseParagraphs(html);

    // Restore code blocks
    codeBlocks.forEach((block, i) => {
      const langClass = block.lang ? ` class="language-${block.lang}"` : '';
      html = html.replace(
        `%%CODEBLOCK_${i}%%`,
        `<pre><code${langClass}>${block.code}</code></pre>`
      );
    });

    // Restore inline code
    inlineCodes.forEach((code, i) => {
      html = html.replace(`%%INLINECODE_${i}%%`, `<code>${code}</code>`);
    });

    return html.trim();
  }

  _parseHeadings(html) {
    return html.replace(/^#{1,6}\s+(.+)$/gm, (match, text) => {
      const level = match.split(' ')[0].length;
      const id = text.toLowerCase().replace(/[^\w]+/g, '-');
      return `<h${level} id="${id}">${this._parseInline(text)}</h${level}>`;
    });
  }

  _parseHorizontalRules(html) {
    return html.replace(/^(\*{3,}|-{3,}|_{3,})$/gm, '<hr>');
  }

  _parseBlockquotes(html) {
    const lines = html.split('\n');
    const result = [];
    let inBlockquote = false;

    for (const line of lines) {
      const match = line.match(/^>\s+(.+)/);
      if (match) {
        if (!inBlockquote) {
          result.push('<blockquote>');
          inBlockquote = true;
        }
        result.push(`<p>${this._parseInline(match[1])}</p>`);
      } else {
        if (inBlockquote) {
          result.push('</blockquote>');
          inBlockquote = false;
        }
        result.push(line);
      }
    }

    if (inBlockquote) {
      result.push('</blockquote>');
    }

    return result.join('\n');
  }

  _parseTables(html) {
    return html.replace(/^\|(.+)\|\n\|[-| ]+\|\n((?:\|.+\|\n?)*)/gm, (match, headerRow, bodyRows) => {
      const headers = headerRow.split('|').map(h => h.trim()).filter(Boolean);
      const rows = bodyRows.trim().split('\n').map(row =>
        row.split('|').map(cell => cell.trim()).filter(Boolean)
      );

      let table = '<table><thead><tr>';
      headers.forEach(h => {
        table += `<th>${this._parseInline(h)}</th>`;
      });
      table += '</tr></thead><tbody>';

      rows.forEach(row => {
        table += '<tr>';
        row.forEach(cell => {
          table += `<td>${this._parseInline(cell)}</td>`;
        });
        table += '</tr>';
      });

      table += '</tbody></table>';
      return table;
    });
  }

  _parseTaskItems(html) {
    return html.replace(/^(\s*)- \[([ x])\] (.+)$/gm, (match, indent, checked, text) => {
      const isChecked = checked === 'x';
      return `<div class="task-item"><input type="checkbox" class="task-checkbox" ${isChecked ? 'checked' : ''} disabled><span>${this._parseInline(text)}</span></div>`;
    });
  }

  _parseLists(html) {
    // Unordered lists
    html = html.replace(/^(\s*)[-*+]\s+(.+)$/gm, (match, indent, content) => {
      const level = Math.floor(indent.length / 2);
      return `<li data-level="${level}">${this._parseInline(content)}</li>`;
    });

    // Ordered lists
    html = html.replace(/^(\s*)\d+\.\s+(.+)$/gm, (match, indent, content) => {
      const level = Math.floor(indent.length / 2);
      return `<li data-level="${level}" data-ordered="true">${this._parseInline(content)}</li>`;
    });

    // Wrap consecutive <li> elements in <ul> or <ol>
    const lines = html.split('\n');
    const result = [];
    let inList = false;
    let listType = 'ul';

    for (const line of lines) {
      if (line.includes('<li')) {
        if (!inList) {
          inList = true;
          listType = line.includes('data-ordered') ? 'ol' : 'ul';
          result.push(`<${listType}>`);
        }
        result.push(line);
      } else {
        if (inList) {
          result.push(`</${listType}>`);
          inList = false;
        }
        result.push(line);
      }
    }

    if (inList) {
      result.push(`</${listType}>`);
    }

    return result.join('\n');
  }

  _parseBold(html) {
    return html.replace(/(\*{2}|_{2})(.+?)\1/g, '<strong>$2</strong>');
  }

  _parseItalic(html) {
    return html.replace(/(\*|_)(.+?)\1/g, '<em>$2</em>');
  }

  _parseStrikethrough(html) {
    return html.replace(/~~(.+?)~~/g, '<del>$1</del>');
  }

  _parseLinks(html) {
    return html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }

  _parseImages(html) {
    return html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy">');
  }

  _parseParagraphs(html) {
    const blocks = html.split(/\n\n+/);
    return blocks.map(block => {
      block = block.trim();
      if (!block) return '';
      if (block.startsWith('<h') ||
          block.startsWith('<ul') ||
          block.startsWith('<ol') ||
          block.startsWith('<blockquote') ||
          block.startsWith('<table') ||
          block.startsWith('<pre') ||
          block.startsWith('<hr') ||
          block.startsWith('<div')) {
        return block;
      }
      return `<p>${block}</p>`;
    }).join('\n');
  }

  _parseInline(text) {
    text = text.replace(this.rules.bold, '<strong>$2</strong>');
    text = text.replace(this.rules.italic, '<em>$2</em>');
    text = text.replace(this.rules.strikethrough, '<del>$1</del>');
    text = text.replace(this.rules.inlineCode, '<code>$1</code>');
    text = text.replace(this.rules.link, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    text = text.replace(this.rules.image, '<img src="$2" alt="$1" loading="lazy">');
    return text;
  }

  _escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
}

// Global instance
const markdownParser = new MarkdownParser();
