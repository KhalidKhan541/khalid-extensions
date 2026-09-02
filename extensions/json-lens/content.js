(() => {
  'use strict';

  let floatingToolbar = null;
  let jsonOverlay = null;
  let currentParsedData = null;
  let breadcrumbBar = null;

  function init() {
    detectAndInjectJSON();
    setupMessageListeners();
    setupDragAndDrop();
  }

  function detectAndInjectJSON() {
    const body = document.body;
    if (!body) return;

    const preElements = document.querySelectorAll('pre, code, .json, [data-type="json"]');
    for (const pre of preElements) {
      const text = pre.textContent.trim();
      if (isJSON(text)) {
        injectJSONViewer(pre, text);
      }
    }

    if (document.contentType === 'application/json' ||
        document.contentType === 'text/json' ||
        document.contentType === 'application/vnd.api+json') {
      const text = body.innerText || body.textContent;
      if (text && isJSON(text.trim())) {
        injectJSONOverlay(text.trim());
      }
    }

    const firstChild = body.children[0];
    if (firstChild && firstChild.tagName === 'PRE') {
      const text = firstChild.textContent.trim();
      if (isJSON(text)) {
        injectJSONOverlay(text);
      }
    }
  }

  function isJSON(text) {
    if (!text || text.length < 2) return false;
    const trimmed = text.trim();
    if ((trimmed[0] === '{' && trimmed[trimmed.length - 1] === '}') ||
        (trimmed[0] === '[' && trimmed[trimmed.length - 1] === ']')) {
      try {
        JSON.parse(trimmed);
        return true;
      } catch (e) {}
    }
    return false;
  }

  function injectJSONViewer(element, text) {
    const container = document.createElement('div');
    container.className = 'json-lens-container';
    container.style.cssText = `
      position: relative; margin: 8px 0; border: 1px solid #d0d0d0;
      border-radius: 6px; overflow: hidden;
    `;

    const toolbar = createToolbar(text);
    container.appendChild(toolbar);

    const content = document.createElement('div');
    content.className = 'json-lens-content';
    content.style.cssText = `
      padding: 12px; overflow: auto; max-height: 600px;
      background: #fafafa; font-family: 'Consolas', 'Monaco', monospace;
      font-size: 13px; line-height: 1.5;
    `;

    const highlighted = syntaxHighlight(text);
    content.innerHTML = `<pre style="margin:0; white-space:pre-wrap;">${highlighted}</pre>`;

    container.appendChild(content);
    element.replaceWith(container);

    addClickToCopy(content);
    makeCollapsible(content);
  }

  function injectJSONOverlay(text) {
    if (jsonOverlay) jsonOverlay.remove();

    try {
      currentParsedData = JSON.parse(text);
    } catch (e) {
      return;
    }

    jsonOverlay = document.createElement('div');
    jsonOverlay.className = 'json-lens-overlay';
    jsonOverlay.style.cssText = `
      position: fixed; top: 0; right: 0; width: 50%; height: 100%;
      background: #ffffff; box-shadow: -4px 0 20px rgba(0,0,0,0.2);
      z-index: 2147483647; display: flex; flex-direction: column;
      font-family: 'Segoe UI', -apple-system, sans-serif;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 16px; background: #f5f5f5; border-bottom: 1px solid #d0d0d0;
    `;
    header.innerHTML = `
      <span style="font-weight: 600; font-size: 14px;">JSON Lens</span>
      <div style="display: flex; gap: 6px;">
        <button class="jl-btn jl-format" style="padding: 5px 10px; border: 1px solid #d0d0d0;
          border-radius: 4px; background: #2563eb; color: white; cursor: pointer; font-size: 12px;">
          Format
        </button>
        <button class="jl-btn jl-tree" style="padding: 5px 10px; border: 1px solid #d0d0d0;
          border-radius: 4px; background: white; cursor: pointer; font-size: 12px;">
          Tree View
        </button>
        <button class="jl-btn jl-copy" style="padding: 5px 10px; border: 1px solid #d0d0d0;
          border-radius: 4px; background: white; cursor: pointer; font-size: 12px;">
          Copy
        </button>
        <button class="jl-btn jl-download" style="padding: 5px 10px; border: 1px solid #d0d0d0;
          border-radius: 4px; background: white; cursor: pointer; font-size: 12px;">
          Download
        </button>
        <button class="jl-btn jl-close" style="padding: 5px 10px; border: 1px solid #d0d0d0;
          border-radius: 4px; background: #ef4444; color: white; cursor: pointer; font-size: 12px;">
          ✕
        </button>
      </div>
    `;

    const body = document.createElement('div');
    body.className = 'json-lens-body';
    body.style.cssText = `
      flex: 1; overflow: auto; padding: 16px;
      font-family: 'Consolas', 'Monaco', monospace; font-size: 13px; line-height: 1.5;
    `;

    body.innerHTML = `<pre style="margin:0; white-space:pre-wrap;">${syntaxHighlight(JSON.stringify(currentParsedData, null, 2))}</pre>`;

    jsonOverlay.appendChild(header);
    jsonOverlay.appendChild(body);
    document.body.appendChild(jsonOverlay);

    header.querySelector('.jl-format').addEventListener('click', () => {
      const formatted = JSON.stringify(currentParsedData, null, 2);
      body.innerHTML = `<pre style="margin:0; white-space:pre-wrap;">${syntaxHighlight(formatted)}</pre>`;
      addClickToCopy(body);
    });

    header.querySelector('.jl-tree').addEventListener('click', () => {
      const treeHTML = buildTreeHTML(currentParsedData, '$');
      body.innerHTML = treeHTML;
      setupTreeInteractions(body);
    });

    header.querySelector('.jl-copy').addEventListener('click', () => {
      navigator.clipboard.writeText(JSON.stringify(currentParsedData, null, 2));
      const btn = header.querySelector('.jl-copy');
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
    });

    header.querySelector('.jl-download').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(currentParsedData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'data.json';
      a.click();
      URL.revokeObjectURL(url);
    });

    header.querySelector('.jl-close').addEventListener('click', () => {
      jsonOverlay.remove();
      jsonOverlay = null;
    });

    addClickToCopy(body);
  }

  function createToolbar(text) {
    const toolbar = document.createElement('div');
    toolbar.style.cssText = `
      display: flex; gap: 4px; padding: 8px 12px;
      background: #f0f0f0; border-bottom: 1px solid #d0d0d0;
    `;

    const buttons = [
      { label: 'Format', color: '#2563eb', action: () => formatInPlace(toolbar) },
      { label: 'Copy', color: '#16a34a', action: () => copyValue(text) },
      { label: 'Download', color: '#6b7280', action: () => downloadJSON(text) },
      { label: 'Tree View', color: '#9333ea', action: () => toggleTreeView(toolbar) }
    ];

    buttons.forEach(btn => {
      const el = document.createElement('button');
      el.textContent = btn.label;
      el.style.cssText = `
        padding: 4px 10px; border: 1px solid #d0d0d0; border-radius: 4px;
        background: ${btn.color}; color: white; cursor: pointer;
        font-size: 12px; transition: opacity 0.15s;
      `;
      el.addEventListener('mouseenter', () => el.style.opacity = '0.8');
      el.addEventListener('mouseleave', () => el.style.opacity = '1');
      el.addEventListener('click', btn.action);
      toolbar.appendChild(el);
    });

    return toolbar;
  }

  function formatInPlace(toolbar) {
    const container = toolbar.parentElement;
    const content = container.querySelector('.json-lens-content');
    if (!content) return;

    const text = content.textContent.trim();
    try {
      const parsed = JSON.parse(text);
      const formatted = JSON.stringify(parsed, null, 2);
      content.innerHTML = `<pre style="margin:0; white-space:pre-wrap;">${syntaxHighlight(formatted)}</pre>`;
      addClickToCopy(content);
    } catch (e) {}
  }

  function copyValue(text) {
    navigator.clipboard.writeText(text);
  }

  function downloadJSON(text) {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleTreeView(toolbar) {
    const container = toolbar.parentElement;
    const content = container.querySelector('.json-lens-content');
    if (!content) return;

    const isTreeView = content.querySelector('.jl-tree-node');

    if (isTreeView) {
      const text = content.getAttribute('data-original') || content.textContent.trim();
      content.innerHTML = `<pre style="margin:0; white-space:pre-wrap;">${syntaxHighlight(text)}</pre>`;
      addClickToCopy(content);
    } else {
      try {
        const text = content.textContent.trim();
        content.setAttribute('data-original', text);
        const parsed = JSON.parse(text);
        const treeHTML = buildTreeHTML(parsed, '$');
        content.innerHTML = treeHTML;
        setupTreeInteractions(content);
      } catch (e) {}
    }
  }

  function buildTreeHTML(data, path, isLast = true) {
    const type = getType(data);
    let html = '';

    if (type === 'object' || type === 'array') {
      const entries = type === 'object' ? Object.entries(data) : data.map((v, i) => [i, v]);
      const openBracket = type === 'array' ? '[' : '{';
      const closeBracket = type === 'array' ? ']' : '}';

      html += `<div class="jl-tree-node" data-path="${path}">`;
      html += `<span class="jl-toggle" style="cursor:pointer;color:#6b7280;margin-right:4px;">▼</span>`;
      html += `<span class="json-bracket">${openBracket}</span>`;
      html += ` <span style="color:#6b7280;font-size:11px;">(${entries.length} ${type === 'array' ? 'items' : 'keys'})</span>`;
      html += `<div class="jl-tree-children" style="margin-left:20px;">`;

      entries.forEach(([key, value], index) => {
        const childPath = type === 'array' ? `${path}[${index}]` : `${path}.${key}`;
        const childIsLast = index === entries.length - 1;

        html += `<div class="jl-tree-node" data-path="${childPath}">`;

        if (type === 'object') {
          html += `<span class="json-key">"${key}"</span>: `;
        }

        const childType = getType(value);
        if (childType === 'object' || childType === 'array') {
          html += buildTreeHTML(value, childPath, childIsLast);
        } else {
          html += `<span class="json-${childType}">${formatValue(value)}</span>`;
        }

        if (!childIsLast) html += ',';
        html += '</div>';
      });

      html += `</div>`;
      html += `<span class="json-bracket">${closeBracket}</span>`;
      if (!isLast) html += ',';
      html += '</div>';
    } else {
      html += `<span class="json-${type}">${formatValue(data)}</span>`;
      if (!isLast) html += ',';
    }

    return html;
  }

  function setupTreeInteractions(container) {
    container.querySelectorAll('.jl-toggle').forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const node = toggle.closest('.jl-tree-node');
        const children = node.querySelector('.jl-tree-children');
        if (children) {
          const isHidden = children.style.display === 'none';
          children.style.display = isHidden ? '' : 'none';
          toggle.textContent = isHidden ? '▼' : '▶';
        }
      });
    });

    container.querySelectorAll('.jl-tree-node').forEach(node => {
      node.addEventListener('dblclick', () => {
        const path = node.dataset.path;
        if (path) {
          navigator.clipboard.writeText(path);
          node.style.background = '#dbeafe';
          setTimeout(() => { node.style.background = ''; }, 500);
        }
      });
    });
  }

  function addClickToCopy(container) {
    container.querySelectorAll('.json-string, .json-number, .json-boolean, .json-null').forEach(el => {
      el.style.cursor = 'pointer';
      el.title = 'Click to copy';

      el.addEventListener('click', () => {
        let value = el.textContent;
        if (el.classList.contains('json-string')) {
          value = value.slice(1, -1);
        }
        navigator.clipboard.writeText(value);

        const orig = el.style.background;
        el.style.background = '#fef08a';
        setTimeout(() => { el.style.background = orig; }, 300);
      });
    });
  }

  function makeCollapsible(container) {
    container.querySelectorAll('.json-bracket').forEach(bracket => {
      const parent = bracket.parentElement;
      const text = bracket.textContent;

      if (text === '{' || text === '[') {
        const endBracket = text === '{' ? '}' : ']';

        bracket.style.cursor = 'pointer';
        bracket.title = 'Click to collapse';

        bracket.addEventListener('click', () => {
          const children = parent.querySelector('.jl-tree-children, pre');
          if (children) {
            const isHidden = children.style.display === 'none';
            children.style.display = isHidden ? '' : 'none';
          }
        });
      }
    });
  }

  function syntaxHighlight(json) {
    if (typeof json !== 'string') {
      json = JSON.stringify(json, null, 2);
    }

    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    return json.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = 'json-number';
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'json-key';
          } else {
            cls = 'json-string';
          }
        } else if (/true|false/.test(match)) {
          cls = 'json-boolean';
        } else if (/null/.test(match)) {
          cls = 'json-null';
        }
        return `<span class="${cls}">${match}</span>`;
      }
    );
  }

  function getType(val) {
    if (val === null) return 'null';
    if (Array.isArray(val)) return 'array';
    return typeof val;
  }

  function formatValue(val) {
    if (val === null) return 'null';
    if (typeof val === 'string') return `"${val.replace(/"/g, '\\"')}"`;
    return String(val);
  }

  function setupMessageListeners() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'formatSelection') {
        try {
          const parsed = JSON.parse(request.text);
          const formatted = JSON.stringify(parsed, null, 2);
          navigator.clipboard.writeText(formatted);

          showToast('JSON formatted and copied to clipboard!');
        } catch (e) {
          showToast('Invalid JSON: ' + e.message);
        }
      }

      if (request.action === 'viewSelection') {
        try {
          const parsed = JSON.parse(request.text);
          injectJSONOverlay(request.text);
        } catch (e) {
          showToast('Invalid JSON: ' + e.message);
        }
      }

      if (request.action === 'checkForJSON') {
        detectAndInjectJSON();
      }
    });
  }

  function setupDragAndDrop() {
    document.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    document.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files.length > 0 && files[0].type === 'application/json') {
        e.preventDefault();
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const parsed = JSON.parse(event.target.result);
            currentParsedData = parsed;
            injectJSONOverlay(event.target.result);
          } catch (err) {
            showToast('Invalid JSON file');
          }
        };
        reader.readAsText(files[0]);
      }
    });
  }

  function showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
      background: #1e1e2e; color: white; padding: 10px 20px; border-radius: 6px;
      font-size: 13px; z-index: 2147483647; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      animation: fadeIn 0.2s ease-in;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
