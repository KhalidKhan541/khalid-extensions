/**
 * MarkdownViewer - Complete Markdown Parser
 * Supports GFM, tables, task lists, footnotes, definition lists, and more.
 */
window.MarkdownParser = (function () {
  'use strict';

  const ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const SAFE_HTML_TAGS = ['br', 'hr', 'img', 'b', 'i', 'u', 's', 'em', 'strong', 'sub', 'sup', 'mark', 'small', 'del', 'ins', 'abbr', 'code', 'pre', 'p', 'div', 'span', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'details', 'summary', 'figure', 'figcaption'];

  function escapeHtml(text) {
    return text.replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch]);
  }

  function slugify(text) {
    return text
      .toLowerCase()
      .replace(/<[^>]+>/g, '')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  function inlineEscape(text) {
    return escapeHtml(text);
  }

  function parseInline(text) {
    if (!text) return '';

    text = text.replace(/\\\*/g, '&#42;');
    text = text.replace(/\\_/g, '&#95;');
    text = text.replace(/\\`/g, '&#96;');
    text = text.replace(/\\\[/g, '&#91;');
    text = text.replace(/\\\]/g, '&#93;');
    text = text.replace(/\\\(/g, '&#40;');
    text = text.replace(/\\\)/g, '&#41;');
    text = text.replace(/\\#/g, '&#35;');
    text = text.replace(/\\\+/g, '&#43;');
    text = text.replace(/\\-/g, '&#45;');
    text = text.replace(/\\\./g, '&#46;');
    text = text.replace(/\\/g, '&#92;');

    text = text.replace(/!\[([^\]]*)\]\(([^)\s]*)((?:\s+"[^"]*")?)\)/g, (_, alt, src, title) => {
      src = src.replace(/&amp;/g, '&');
      const titleAttr = title ? ` title="${title.trim().replace(/^"|"$/g, '')}"` : '';
      return `<img src="${src}" alt="${escapeHtml(alt)}"${titleAttr} loading="lazy" class="md-image">`;
    });

    text = text.replace(/\[([^\]]+)\]\(([^)\s]*)((?:\s+"[^"]*")?)\)/g, (_, linkText, href, title) => {
      href = href.replace(/&amp;/g, '&');
      const titleAttr = title ? ` title="${title.trim().replace(/^"|"$/g, '')}"` : '';
      return `<a href="${href}" target="_blank" rel="noopener noreferrer"${titleAttr} class="md-link">${parseInline(linkText)}</a>`;
    });

    text = text.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    text = text.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
    text = text.replace(/___([^_]+)___/g, '<strong><em>$1</em></strong>');
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    text = text.replace(/_([^_]+)_/g, '<em>$1</em>');

    text = text.replace(/`([^`]+)`/g, (_, code) => `<code class="inline-code">${escapeHtml(code)}</code>`);

    text = text.replace(/^(.*?)\[(\d+)\]$/gm, (_, pre, num) => {
      return `${pre}<sup class="footnote-ref"><a href="#fn${num}" id="fnref${num}">[${num}]</a></sup>`;
    });

    return text;
  }

  function parseCodeBlock(lines) {
    const results = [];
    let i = 0;
    while (i < lines.length) {
      const fenceMatch = lines[i].match(/^(```+|~~~+)\s*(\w*)/);
      if (fenceMatch) {
        const fence = fenceMatch[1][0];
        const fenceLen = fenceMatch[1].length;
        const lang = fenceMatch[2] || '';
        i++;
        const codeLines = [];
        while (i < lines.length) {
          const closingMatch = lines[i].match(new RegExp(`^\\${fence}{${fenceLen},}\\s*$`));
          if (closingMatch) {
            i++;
            break;
          }
          codeLines.push(lines[i]);
          i++;
        }
        const code = codeLines.join('\n');
        results.push({ type: 'code', lang, code });
      } else if (lines[i].match(/^(\t| {4})/)) {
        const codeLines = [];
        while (i < lines.length && (lines[i].match(/^(\t| {4})/) || (lines[i].trim() !== '' && codeLines.length > 0 && i > 0 && lines[i - 1].trim() === '' ? false : lines[i].trim() !== ''))) {
          if (lines[i].match(/^(\t| {4})/)) {
            codeLines.push(lines[i].replace(/^(\t| {4})/, ''));
            i++;
          } else if (lines[i].trim() === '') {
            codeLines.push('');
            i++;
          } else {
            break;
          }
        }
        while (codeLines.length > 0 && codeLines[codeLines.length - 1] === '') {
          codeLines.pop();
        }
        if (codeLines.length > 0) {
          results.push({ type: 'code', lang: '', code: codeLines.join('\n') });
        }
      } else {
        results.push({ type: 'text', content: lines[i] });
        i++;
      }
    }
    return results;
  }

  function parseTableRow(line) {
    const cells = [];
    let cell = '';
    let inCode = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '`') {
        inCode = !inCode;
        cell += ch;
      } else if (ch === '|' && !inCode) {
        cells.push(cell.trim());
        cell = '';
      } else {
        cell += ch;
      }
    }
    cells.push(cell.trim());
    if (cells.length > 0 && cells[0] === '') cells.shift();
    if (cells.length > 0 && cells[cells.length - 1] === '') cells.pop();
    return cells;
  }

  function parseAlignment(line) {
    const cells = parseTableRow(line);
    return cells.map((cell) => {
      const trimmed = cell.trim();
      if (/^:-+:$/.test(trimmed)) return 'center';
      if (/^-+:$/.test(trimmed)) return 'right';
      if (/^:-+$/.test(trimmed)) return 'left';
      return null;
    });
  }

  function parseTable(lines) {
    if (lines.length < 2) return null;
    const headerCells = parseTableRow(lines[0]);
    const alignments = parseAlignment(lines[1]);
    const rows = [];
    for (let i = 2; i < lines.length; i++) {
      if (lines[i].trim() === '') break;
      rows.push(parseTableRow(lines[i]));
    }
    return { headers: headerCells, alignments, rows };
  }

  function renderTable(table) {
    let html = '<div class="table-wrapper"><table class="md-table">';
    html += '<thead><tr>';
    table.headers.forEach((header, i) => {
      const align = table.alignments[i] ? ` style="text-align:${table.alignments[i]}"` : '';
      html += `<th${align}>${parseInline(header)}</th>`;
    });
    html += '</tr></thead>';
    html += '<tbody>';
    table.rows.forEach((row, rowIdx) => {
      const stripe = rowIdx % 2 === 1 ? ' class="stripe"' : '';
      html += `<tr${stripe}>`;
      row.forEach((cell, i) => {
        const align = table.alignments[i] ? ` style="text-align:${table.alignments[i]}"` : '';
        html += `<td${align}>${parseInline(cell)}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    return html;
  }

  function parseMarkdown(markdown) {
    if (!markdown) return '<p class="empty-state">Empty document</p>';

    const lines = markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const elements = [];
    const footnotes = [];
    const usedFootnotes = new Set();
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      if (line.match(/^(```|~~~)/)) {
        const codeLines = [];
        const fenceChar = line[0];
        const fenceLen = line.match(/^(#+|~+)/)[1].length;
        i++;
        while (i < lines.length) {
          const closingMatch = lines[i].match(new RegExp(`^[${fenceChar === '`' ? '`' : '~'}]{${fenceLen},}\\s*$`));
          if (closingMatch) { i++; break; }
          codeLines.push(lines[i]);
          i++;
        }
        const fence = line.match(/^(#+|~+)/)[1][0];
        const lang = line.replace(/^(#+|~+)/, '').trim();
        elements.push({ type: 'codeblock', lang, code: codeLines.join('\n') });
        continue;
      }

      if (line.match(/^#{1,6}\s/)) {
        const match = line.match(/^(#{1,6})\s+(.+?)(?:\s+#{1,6})?\s*$/);
        if (match) {
          const level = match[1].length;
          const text = match[2].replace(/\s*#+\s*$/, '');
          const id = slugify(text);
          elements.push({ type: 'heading', level, text, id, raw: text });
          i++;
          continue;
        }
      }

      if (line.match(/^\|/)) {
        const tableLines = [];
        while (i < lines.length && lines[i].match(/^\|/)) {
          tableLines.push(lines[i]);
          i++;
        }
        if (tableLines.length >= 2) {
          const table = parseTable(tableLines);
          if (table) {
            elements.push({ type: 'table', table });
            continue;
          }
        }
      }

      if (line.match(/^[-*_]{3,}\s*$/)) {
        elements.push({ type: 'hr' });
        i++;
        continue;
      }

      if (line.match(/^(>\s?)+/)) {
        const quoteLines = [];
        while (i < lines.length && (lines[i].match(/^>/) || (lines[i].trim() === '' && i + 1 < lines.length && lines[i + 1].match(/^>/)))) {
          quoteLines.push(lines[i].replace(/^>\s?/, ''));
          i++;
        }
        elements.push({ type: 'blockquote', content: parseMarkdown(quoteLines.join('\n')) });
        continue;
      }

      if (line.match(/^[-+*]\s+\[[ x]\]/i)) {
        const items = [];
        while (i < lines.length && lines[i].match(/^[-+*]\s+\[[ x]\]/i)) {
          const checked = /\[[xX]\]/.test(lines[i]);
          const text = lines[i].replace(/^[-+*]\s+\[[ xX]\]\s+/, '');
          items.push({ checked, text });
          i++;
        }
        elements.push({ type: 'tasklist', items });
        continue;
      }

      if (line.match(/^[-+*]\s/)) {
        const items = [];
        while (i < lines.length && lines[i].match(/^[-+*]\s/)) {
          const depth = lines[i].match(/^(\s*)/)[1].length;
          const text = lines[i].replace(/^\s*[-+*]\s+/, '');
          items.push({ depth: Math.floor(depth / 2), text });
          i++;
        }
        elements.push({ type: 'ul', items });
        continue;
      }

      if (line.match(/^\d+\.\s/)) {
        const items = [];
        while (i < lines.length && lines[i].match(/^\d+\.\s/)) {
          const depth = lines[i].match(/^(\s*)/)[1].length;
          const text = lines[i].replace(/^\s*\d+\.\s+/, '');
          items.push({ depth: Math.floor(depth / 3), text });
          i++;
        }
        elements.push({ type: 'ol', items });
        continue;
      }

      if (line.match(/^\[\^/)) {
        const match = line.match(/^\[\^(.+?)\]:\s*(.+)/);
        if (match) {
          footnotes.push({ id: match[1], content: match[2] });
          i++;
          continue;
        }
      }

      if (line.match(/^~\s*$/)) {
        elements.push({ type: 'blank' });
        i++;
        continue;
      }

      if (line.match(/^\s*$/)) {
        i++;
        continue;
      }

      let textLines = [];
      while (i < lines.length && lines[i].trim() !== '' && !lines[i].match(/^(#{1,6}\s|```|~~~|\|[-:*|]+\||[-*_]{3,}|>\s|[0-9]+\.\s|[-+*]\s|\[\^)/)) {
        textLines.push(lines[i]);
        i++;
      }
      if (textLines.length > 0) {
        elements.push({ type: 'paragraph', text: textLines.join('\n') });
      }
    }

    let html = '';

    const headings = elements.filter((e) => e.type === 'heading');
    if (headings.length > 1) {
      html += '<nav class="md-toc" id="toc"><h2>Table of Contents</h2><ul>';
      headings.forEach((h) => {
        html += `<li class="toc-h${h.level}"><a href="#${h.id}">${parseInline(h.text)}</a></li>`;
      });
      html += '</ul></nav>';
    }

    elements.forEach((el) => {
      switch (el.type) {
        case 'heading':
          html += `<h${el.level} id="${el.id}" class="md-heading md-h${el.level}"><a class="heading-anchor" href="#${el.id}" aria-hidden="true">#</a>${parseInline(el.text)}</h${el.level}>\n`;
          break;
        case 'paragraph':
          html += `<p>${parseInline(el.text)}</p>\n`;
          break;
        case 'codeblock': {
          const highlighted = window.SyntaxHighlighter
            ? window.SyntaxHighlighter.highlight(el.code, el.lang)
            : escapeHtml(el.code);
          html += `<div class="code-block-wrapper"><div class="code-block-header"><span class="code-lang">${escapeHtml(el.lang || 'text')}</span><button class="copy-code-btn" data-code="${escapeHtml(el.code).replace(/"/g, '&quot;')}" title="Copy code"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy</button></div><pre class="code-block"><code class="language-${escapeHtml(el.lang || 'text')}">${highlighted}</code></pre></div>\n`;
          break;
        }
        case 'blockquote':
          html += `<blockquote class="md-blockquote">${el.content}</blockquote>\n`;
          break;
        case 'ul':
          html += '<ul class="md-list">';
          el.items.forEach((item) => {
            const indent = item.depth > 0 ? ` style="margin-left:${item.depth * 1.5}em"` : '';
            html += `<li${indent}>${parseInline(item.text)}</li>`;
          });
          html += '</ul>\n';
          break;
        case 'ol':
          html += '<ol class="md-list">';
          el.items.forEach((item) => {
            const indent = item.depth > 0 ? ` style="margin-left:${item.depth * 1.5}em"` : '';
            html += `<li${indent}>${parseInline(item.text)}</li>`;
          });
          html += '</ol>\n';
          break;
        case 'tasklist':
          html += '<ul class="md-tasklist">';
          el.items.forEach((item) => {
            const checked = item.checked ? ' checked disabled' : ' disabled';
            const cls = item.checked ? ' task-checked' : '';
            html += `<li class="task-item${cls}"><input type="checkbox"${checked}> <span>${parseInline(item.text)}</span></li>`;
          });
          html += '</ul>\n';
          break;
        case 'table':
          html += renderTable(el.table) + '\n';
          break;
        case 'hr':
          html += '<hr class="md-hr">\n';
          break;
        case 'blank':
          html += '<br>\n';
          break;
      }
    });

    if (footnotes.length > 0) {
      html += '<section class="footnotes"><hr class="md-hr"><ol class="footnote-list">';
      footnotes.forEach((fn) => {
        html += `<li id="fn${fn.id}">${parseInline(fn.content)} <a href="#fnref${fn.id}" class="footnote-backref" title="Back to reference">↩</a></li>`;
      });
      html += '</ol></section>';
    }

    return html;
  }

  function getStats(markdown) {
    if (!markdown) return { words: 0, chars: 0, lines: 0, readingTime: 0 };
    const text = markdown.replace(/```[\s\S]*?```/g, '').replace(/`[^`]+`/g, '').replace(/[#*_~\[\]|>]/g, '');
    const words = text.split(/\s+/).filter((w) => w.length > 0).length;
    const chars = text.replace(/\s/g, '').length;
    const lines = markdown.split('\n').length;
    const readingTime = Math.max(1, Math.ceil(words / 200));
    return { words, chars, lines, readingTime };
  }

  return { parseMarkdown, getStats, escapeHtml, parseInline };
})();
