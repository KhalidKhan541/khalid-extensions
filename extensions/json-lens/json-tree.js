class JsonTreeView {
  constructor(container) {
    this.container = container;
    this.allNodes = [];
    this.expandedPaths = new Set(['$']);
    this.highlightedPaths = new Set();
    this.searchMatches = [];
    this.searchIndex = -1;
    this.nodeHeight = 22;
    this.visibleNodes = [];
    this.scrollTop = 0;
    this.containerHeight = 0;
    this.virtualStart = 0;
    this.virtualEnd = 0;

    this._setupVirtualScroll();
  }

  _setupVirtualScroll() {
    this.container.addEventListener('scroll', () => {
      this.scrollTop = this.container.scrollTop;
      this._renderVisibleNodes();
    });

    const observer = new ResizeObserver(() => {
      this.containerHeight = this.container.clientHeight;
      this._renderVisibleNodes();
    });
    observer.observe(this.container);
  }

  render(data) {
    this.data = data;
    this.allNodes = [];
    this._buildNodeList(data, '$', 0, true);

    this.container.innerHTML = '';
    this.container.style.position = 'relative';

    this.contentDiv = document.createElement('div');
    this.contentDiv.style.height = (this.allNodes.length * this.nodeHeight) + 'px';
    this.contentDiv.style.position = 'relative';
    this.container.appendChild(this.contentDiv);

    this.containerHeight = this.container.clientHeight;
    this.scrollTop = 0;
    this.container.scrollTop = 0;

    this._renderVisibleNodes();
  }

  _buildNodeList(value, path, depth, isLast) {
    const type = this._getType(value);
    const node = {
      path,
      depth,
      type,
      value,
      isLast,
      hasChildren: type === 'object' || type === 'array'
    };

    this.allNodes.push(node);

    if (type === 'object' && value !== null) {
      const keys = Object.keys(value);
      keys.forEach((key, i) => {
        const childPath = `${path}.${key}`;
        this._buildNodeList(value[key], childPath, depth + 1, i === keys.length - 1);
      });
    } else if (type === 'array') {
      value.forEach((item, i) => {
        const childPath = `${path}[${i}]`;
        this._buildNodeList(item, childPath, depth + 1, i === value.length - 1);
      });
    }
  }

  _getType(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }

  _isExpanded(path) {
    return this.expandedPaths.has(path);
  }

  _shouldShow(node) {
    const parts = node.path.replace(/^\$/, '').split(/\.|\[(\d+)\]/).filter(Boolean);
    let checkPath = '$';

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (/^\d+$/.test(part)) {
        checkPath += `[${part}]`;
      } else {
        checkPath += `.${part}`;
      }

      if (!this.expandedPaths.has(checkPath)) {
        return false;
      }
    }
    return true;
  }

  _renderVisibleNodes() {
    if (!this.allNodes.length) return;

    this.visibleNodes = this.allNodes.filter(n => this._shouldShow(n));

    this.contentDiv.style.height = (this.visibleNodes.length * this.nodeHeight) + 'px';

    const totalHeight = this.visibleNodes.length * this.nodeHeight;
    const startNode = Math.floor(this.scrollTop / this.nodeHeight);
    const visibleCount = Math.ceil(this.containerHeight / this.nodeHeight) + 5;

    this.virtualStart = Math.max(0, startNode - 2);
    this.virtualEnd = Math.min(this.visibleNodes.length, startNode + visibleCount + 2);

    const fragment = document.createDocumentFragment();

    for (let i = this.virtualStart; i < this.virtualEnd; i++) {
      const node = this.visibleNodes[i];
      if (!node) continue;

      const el = this._createNodeElement(node);
      el.style.position = 'absolute';
      el.style.top = (i * this.nodeHeight) + 'px';
      el.style.left = '0';
      el.style.right = '0';
      el.style.height = this.nodeHeight + 'px';
      el.style.lineHeight = this.nodeHeight + 'px';
      el.style.whiteSpace = 'nowrap';
      el.style.fontFamily = "'Consolas', 'Monaco', monospace";
      el.style.fontSize = '12px';
      el.style.paddingLeft = (node.depth * 16 + 4) + 'px';
      el.style.boxSizing = 'border-box';

      if (this.highlightedPaths.has(node.path)) {
        el.style.background = 'var(--json-line-highlight)';
      }

      fragment.appendChild(el);
    }

    this.contentDiv.innerHTML = '';
    this.contentDiv.appendChild(fragment);
  }

  _createNodeElement(node) {
    const div = document.createElement('div');
    div.className = 'tree-node';
    div.dataset.path = node.path;

    if (node.hasChildren) {
      const toggle = document.createElement('span');
      toggle.className = 'tree-toggle';
      toggle.textContent = this._isExpanded(node.path) ? '▼' : '▶';
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleNode(node.path);
      });
      div.appendChild(toggle);
    } else {
      const spacer = document.createElement('span');
      spacer.className = 'tree-toggle';
      spacer.textContent = ' ';
      div.appendChild(spacer);
    }

    if (node.path !== '$') {
      const parentPath = node.path.replace(/(\.|[\[\d+\]])$/, '');
      const keyMatch = node.path.match(/\.([^.\[]+)$/);
      const indexMatch = node.path.match(/\[(\d+)\]$/);

      if (keyMatch) {
        const keySpan = document.createElement('span');
        keySpan.className = 'tree-key';
        keySpan.textContent = keyMatch[1];
        div.appendChild(keySpan);

        const colon = document.createElement('span');
        colon.className = 'tree-comma';
        colon.textContent = ': ';
        div.appendChild(colon);
      } else if (indexMatch) {
        const indexSpan = document.createElement('span');
        indexSpan.className = 'tree-comma';
        indexSpan.textContent = `[${indexMatch[1]}]: `;
        div.appendChild(indexSpan);
      }
    }

    if (node.hasChildren) {
      const bracketOpen = document.createElement('span');
      bracketOpen.className = 'json-bracket';
      bracketOpen.textContent = node.type === 'array' ? '[' : '{';
      div.appendChild(bracketOpen);

      if (!this._isExpanded(node.path)) {
        const preview = document.createElement('span');
        preview.className = 'tree-comma';
        const childCount = node.type === 'array' ? node.value.length : Object.keys(node.value).length;
        preview.textContent = node.type === 'array'
          ? ` ${childCount} items `
          : ` ${childCount} keys `;
        div.appendChild(preview);

        const bracketClose = document.createElement('span');
        bracketClose.className = 'json-bracket';
        bracketClose.textContent = node.type === 'array' ? ']' : '}';
        div.appendChild(bracketClose);

        if (!node.isLast) {
          const comma = document.createElement('span');
          comma.className = 'tree-comma';
          comma.textContent = ',';
          div.appendChild(comma);
        }
      }

      const typeBadge = document.createElement('span');
      typeBadge.className = 'tree-type-badge';
      typeBadge.textContent = node.type;
      div.appendChild(typeBadge);
    } else {
      const valueSpan = document.createElement('span');
      valueSpan.className = `tree-value-${node.type}`;

      if (node.type === 'string') {
        const truncated = node.value.length > 100 ? node.value.substring(0, 100) + '...' : node.value;
        valueSpan.textContent = `"${truncated}"`;
      } else {
        valueSpan.textContent = String(node.value);
      }

      div.appendChild(valueSpan);

      if (!node.isLast) {
        const comma = document.createElement('span');
        comma.className = 'tree-comma';
        comma.textContent = ',';
        div.appendChild(comma);
      }
    }

    div.addEventListener('click', (e) => {
      this._onNodeClick(node, e);
    });

    div.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this._onNodeContextMenu(node, e);
    });

    div.addEventListener('mouseenter', () => {
      this._showTooltip(node, div);
    });

    div.addEventListener('mouseleave', () => {
      this._hideTooltip();
    });

    return div;
  }

  toggleNode(path) {
    if (this.expandedPaths.has(path)) {
      this.expandedPaths.delete(path);
      this._collapseChildren(path);
    } else {
      this.expandedPaths.add(path);
    }
    this._renderVisibleNodes();
  }

  _collapseChildren(parentPath) {
    for (const p of this.expandedPaths) {
      if (p.startsWith(parentPath + '.') || p.startsWith(parentPath + '[')) {
        this.expandedPaths.delete(p);
      }
    }
  }

  expandAll() {
    this.allNodes.forEach(n => {
      if (n.hasChildren) this.expandedPaths.add(n.path);
    });
    this._renderVisibleNodes();
  }

  collapseAll() {
    this.expandedPaths.clear();
    this.expandedPaths.add('$');
    this._renderVisibleNodes();
  }

  search(query) {
    this.searchMatches = [];
    this.searchIndex = -1;
    this.highlightedPaths.clear();

    if (!query) {
      this._renderVisibleNodes();
      return 0;
    }

    const lowerQuery = query.toLowerCase();
    this.allNodes.forEach(node => {
      const pathParts = node.path.replace(/^\$/, '').split(/\.|\[(\d+)\]/).filter(Boolean);
      const lastPart = pathParts[pathParts.length - 1];

      const keyMatch = typeof lastPart === 'string' && lastPart.toLowerCase().includes(lowerQuery);
      const valueMatch = !node.hasChildren && String(node.value).toLowerCase().includes(lowerQuery);

      if (keyMatch || valueMatch) {
        this.searchMatches.push(node.path);
        this.highlightedPaths.add(node.path);

        let parentPath = node.path;
        while (parentPath !== '$') {
          this.expandedPaths.add(parentPath);
          parentPath = parentPath.replace(/(\.|[\[\d+\]])$/, '');
        }
      }
    });

    this._renderVisibleNodes();
    return this.searchMatches.length;
  }

  highlightPath(path) {
    this.highlightedPaths.clear();
    this.highlightedPaths.add(path);

    let current = path;
    while (current !== '$') {
      this.expandedPaths.add(current);
      current = current.replace(/(\.|[\[\d+\]])$/, '');
    }

    this._renderVisibleNodes();

    setTimeout(() => {
      this.highlightedPaths.delete(path);
      this._renderVisibleNodes();
    }, 2000);
  }

  _onNodeClick(node, event) {
    if (event.target.closest('.tree-toggle')) return;

    if (node.hasChildren) {
      this.toggleNode(node.path);
    }
  }

  _onNodeContextMenu(node, event) {
    const menu = document.createElement('div');
    menu.style.cssText = `
      position: fixed; background: var(--bg-primary); border: 1px solid var(--border-color);
      border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10000;
      font-size: 12px; min-width: 160px; padding: 4px 0;
    `;

    const items = [
      { label: 'Copy Path', action: () => navigator.clipboard.writeText(node.path) },
      { label: 'Copy Value', action: () => navigator.clipboard.writeText(JSON.stringify(node.value, null, 2)) },
      { label: 'Copy Key', action: () => {
        const keyMatch = node.path.match(/\.([^.\[]+)$/);
        if (keyMatch) navigator.clipboard.writeText(keyMatch[1]);
      }}
    ];

    items.forEach(item => {
      const btn = document.createElement('div');
      btn.style.cssText = 'padding: 6px 12px; cursor: pointer; color: var(--text-primary);';
      btn.textContent = item.label;
      btn.addEventListener('mouseenter', () => btn.style.background = 'var(--bg-secondary)');
      btn.addEventListener('mouseleave', () => btn.style.background = '');
      btn.addEventListener('click', () => {
        item.action();
        menu.remove();
      });
      menu.appendChild(btn);
    });

    menu.style.left = event.clientX + 'px';
    menu.style.top = event.clientY + 'px';
    document.body.appendChild(menu);

    const close = (e) => {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', close);
      }
    };
    setTimeout(() => document.addEventListener('click', close), 10);
  }

  _showTooltip(node, element) {
    this._hideTooltip();

    const tooltip = document.createElement('div');
    tooltip.className = 'json-path-tooltip fade-in';
    tooltip.textContent = node.path;
    tooltip.style.left = element.getBoundingClientRect().left + 'px';
    tooltip.style.top = (element.getBoundingClientRect().top - 28) + 'px';

    document.body.appendChild(tooltip);
    this._tooltip = tooltip;
  }

  _hideTooltip() {
    if (this._tooltip) {
      this._tooltip.remove();
      this._tooltip = null;
    }
  }
}
