class CSSPickerPopup {
  constructor() {
    this.inspectorActive = false;
    this.currentElement = null;
    this.currentTab = 'info';
    this.inspectorData = null;
    this.init();
  }

  init() {
    this.bindTabs();
    this.bindButtons();
    this.bindFilters();
    this.checkInspectorState();
    this.setupMessageListener();
    this.createElementCount();
  }

  bindTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentTab = tab.dataset.tab;
        this.showPanel(this.currentTab);
      });
    });
  }

  showPanel(panelName) {
    document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
    const panel = document.getElementById(`panel-${panelName}`);
    if (panel) panel.classList.remove('hidden');
  }

  bindButtons() {
    document.getElementById('toggle-inspector').addEventListener('click', () => {
      this.toggleInspector();
    });

    document.getElementById('refresh').addEventListener('click', () => {
      this.refreshData();
    });

    document.querySelectorAll('.btn-copy').forEach(btn => {
      btn.addEventListener('click', () => {
        this.handleCopy(btn.dataset.copy);
      });
    });
  }

  bindFilters() {
    const styleFilter = document.getElementById('style-filter');
    if (styleFilter) {
      styleFilter.addEventListener('input', (e) => {
        this.filterRules(e.target.value);
      });
    }

    const computedFilter = document.getElementById('computed-filter');
    if (computedFilter) {
      computedFilter.addEventListener('input', (e) => {
        this.filterComputed(e.target.value);
      });
    }

    const computedSort = document.getElementById('computed-sort');
    if (computedSort) {
      computedSort.addEventListener('change', (e) => {
        this.sortComputed(e.target.value);
      });
    }
  }

  async checkInspectorState() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_STATE' });
      if (response && response.active) {
        this.inspectorActive = true;
        this.updateInspectorUI(true);
        if (response.selectedElement) {
          this.currentElement = response.selectedElement;
          this.updateAllPanels(response.inspectorData);
        }
      }
    } catch (e) {
      console.log('Inspector not active');
    }
  }

  async toggleInspector() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_INSPECTOR' });
      this.inspectorActive = !this.inspectorActive;
      this.updateInspectorUI(this.inspectorActive);
    } catch (e) {
      console.error('Failed to toggle inspector:', e);
      this.showStatus('Failed to toggle inspector');
    }
  }

  updateInspectorUI(active) {
    const btn = document.getElementById('toggle-inspector');
    const status = document.getElementById('inspector-status');

    if (active) {
      btn.classList.add('active');
      status.textContent = 'Stop Inspector';
      this.showStatus('Inspector active - click an element');
    } else {
      btn.classList.remove('active');
      status.textContent = 'Start Inspector';
      this.showStatus('Inspector stopped');
    }
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'ELEMENT_SELECTED') {
        this.handleElementSelected(message.data);
      } else if (message.type === 'INSPECTOR_TOGGLED') {
        this.inspectorActive = message.active;
        this.updateInspectorUI(message.active);
      }
      sendResponse({ ok: true });
    });
  }

  handleElementSelected(data) {
    this.inspectorData = data;
    this.currentElement = data;
    this.updateAllPanels(data);
    document.getElementById('no-selection').classList.add('hidden');
    this.showPanel(this.currentTab);
  }

  updateAllPanels(data) {
    this.updateInfoPanel(data);
    this.updateStylesPanel(data);
    this.updateComputedPanel(data);
    this.updateBoxModelPanel(data);
    this.updatePalettePanel(data);
    this.updateFontPanel(data);
    this.updateVariablesPanel(data);
    this.updateMediaPanel(data);
  }

  updateInfoPanel(data) {
    if (!data) return;

    document.getElementById('el-tag').textContent = `<${data.tagName.toLowerCase()}>`;
    document.getElementById('el-id').textContent = data.id || '(none)';
    document.getElementById('el-classes').textContent = data.classes.join(', ') || '(none)';
    document.getElementById('el-selector').textContent = data.selector;
    document.getElementById('el-dimensions').textContent =
      `${Math.round(data.dimensions.width)} × ${Math.round(data.dimensions.height)} px`;
    document.getElementById('el-position').textContent =
      `x: ${Math.round(data.dimensions.x)}, y: ${Math.round(data.dimensions.y)}`;

    this.updateBreadcrumb(data.breadcrumb);
  }

  updateBreadcrumb(breadcrumb) {
    const container = document.getElementById('el-breadcrumb');
    container.innerHTML = '';

    breadcrumb.forEach((item, index) => {
      if (index > 0) {
        const sep = document.createElement('span');
        sep.className = 'breadcrumb-sep';
        sep.textContent = ' › ';
        container.appendChild(sep);
      }

      const span = document.createElement('span');
      span.className = 'breadcrumb-item';
      span.textContent = item;
      container.appendChild(span);
    });
  }

  updateStylesPanel(data) {
    if (!data || !data.cssRules) return;

    const container = document.getElementById('css-rules');
    container.innerHTML = '';

    data.cssRules.forEach(rule => {
      const ruleEl = document.createElement('div');
      ruleEl.className = 'rule-item';
      ruleEl.dataset.selector = rule.selector;

      const selectorEl = document.createElement('div');
      selectorEl.className = 'rule-selector';
      selectorEl.textContent = rule.selector;
      ruleEl.appendChild(selectorEl);

      if (rule.source) {
        const sourceEl = document.createElement('div');
        sourceEl.className = 'rule-source';
        sourceEl.textContent = rule.source;
        ruleEl.appendChild(sourceEl);
      }

      const specificity = this.calculateSpecificity(rule.selector);
      const specBadge = document.createElement('span');
      specBadge.className = 'specificity-badge';
      specBadge.innerHTML = `<span class="specificity-value">${specificity}</span>`;
      ruleEl.appendChild(specBadge);

      rule.properties.forEach(prop => {
        const entry = document.createElement('div');
        entry.className = 'style-entry';
        entry.dataset.property = prop.name;

        entry.innerHTML = `
          <span class="style-property">${prop.name}</span>
          <span class="style-value">${prop.value}</span>
          <span class="style-copy" title="Copy">📋</span>
        `;

        entry.addEventListener('click', () => {
          this.copyToClipboard(`${prop.name}: ${prop.value};`);
        });

        ruleEl.appendChild(entry);
      });

      container.appendChild(ruleEl);
    });
  }

  updateComputedPanel(data) {
    if (!data || !data.computedStyles) return;

    const container = document.getElementById('computed-styles');
    container.innerHTML = '';

    const styles = Object.entries(data.computedStyles)
      .filter(([_, value]) => value && value !== 'auto' && value !== 'normal')
      .sort(([a], [b]) => a.localeCompare(b));

    styles.forEach(([property, value]) => {
      const entry = document.createElement('div');
      entry.className = 'style-entry';
      entry.dataset.property = property;
      entry.dataset.value = value;

      entry.innerHTML = `
        <span class="style-property">${property}</span>
        <span class="style-value">${value}</span>
        <span class="style-copy" title="Copy">📋</span>
      `;

      entry.addEventListener('click', () => {
        this.copyToClipboard(`${property}: ${value};`);
      });

      container.appendChild(entry);
    });
  }

  updateBoxModelPanel(data) {
    if (!data || !data.boxModel) return;

    const container = document.getElementById('box-model-container');
    container.innerHTML = '';

    const box = data.boxModel;
    document.getElementById('box-sizing').textContent = data.boxSizing || 'content-box';

    const canvas = document.createElement('canvas');
    canvas.width = 380;
    canvas.height = 260;
    canvas.className = 'box-model-canvas';
    container.appendChild(canvas);

    this.drawBoxModel(canvas, box);
  }

  drawBoxModel(canvas, box) {
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    const scale = Math.min(
      (canvas.width - 80) / (box.content.width + box.padding.left + box.padding.right + box.border.left + box.border.right + box.margin.left + box.margin.right),
      (canvas.height - 60) / (box.content.height + box.padding.top + box.padding.bottom + box.border.top + box.border.bottom + box.margin.top + box.margin.bottom),
      1
    );

    const layers = [
      { name: 'margin', color: 'rgba(239, 68, 68, 0.3)', border: '#ef4444', top: box.margin.top, right: box.margin.right, bottom: box.margin.bottom, left: box.margin.left },
      { name: 'border', color: 'rgba(245, 158, 11, 0.3)', border: '#f59e0b', top: box.border.top, right: box.border.right, bottom: box.border.bottom, left: box.border.left },
      { name: 'padding', color: 'rgba(34, 197, 94, 0.3)', border: '#22c55e', top: box.padding.top, right: box.padding.right, bottom: box.padding.bottom, left: box.padding.left },
      { name: 'content', color: 'rgba(99, 102, 241, 0.3)', border: '#6366f1', top: 0, right: 0, bottom: 0, left: 0 }
    ];

    let currentX = centerX - (box.content.width * scale / 2);
    let currentY = centerY - (box.content.height * scale / 2);

    const values = [];

    layers.forEach((layer, i) => {
      const x = currentX - (layer.left + (i < 2 ? box.border.left : 0) + (i < 1 ? box.padding.left : 0)) * scale;
      const y = currentY - (layer.top + (i < 2 ? box.border.top : 0) + (i < 1 ? box.padding.top : 0)) * scale;
      const width = (box.content.width + (i > 0 ? (layer.left + layer.right) : 0) +
        (i === 2 ? box.border.left + box.border.right : 0)) * scale;
      const height = (box.content.height + (i > 0 ? (layer.top + layer.bottom) : 0) +
        (i === 2 ? box.border.top + box.border.bottom : 0)) * scale;

      ctx.fillStyle = layer.color;
      ctx.strokeStyle = layer.border;
      ctx.lineWidth = 1;
      ctx.fillRect(x, y, width, height);
      ctx.strokeRect(x, y, width, height);

      values.push({
        name: layer.name,
        top: layer.top, right: layer.right, bottom: layer.bottom, left: layer.left,
        x, y, width, height
      });
    });

    ctx.fillStyle = '#6366f1';
    ctx.font = '11px SF Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('content', centerX, centerY);
    ctx.fillText(`${Math.round(box.content.width)} × ${Math.round(box.content.height)}`, centerX, centerY + 14);

    const labels = [
      { text: 'margin', y: values[0].y + 10, color: '#ef4444' },
      { text: 'border', y: values[1].y + 10, color: '#f59e0b' },
      { text: 'padding', y: values[2].y + 10, color: '#22c55e' }
    ];

    ctx.font = '9px SF Mono, monospace';
    ctx.textAlign = 'left';

    labels.forEach((label, i) => {
      ctx.fillStyle = label.color;
      ctx.fillText(label.text.toUpperCase(), values[i].x + 4, label.y + 4);

      const box = values[i];
      if (box.top > 0) {
        ctx.textAlign = 'center';
        ctx.fillText(box.top, centerX, box.y + 10);
      }
      if (box.right > 0) {
        ctx.textAlign = 'right';
        ctx.fillText(box.right, box.x + box.width - 4, centerY);
      }
      if (box.bottom > 0) {
        ctx.textAlign = 'center';
        ctx.fillText(box.bottom, centerX, box.y + box.height - 4);
      }
      if (box.left > 0) {
        ctx.textAlign = 'left';
        ctx.fillText(box.left, box.x + 4, centerY);
      }
      ctx.textAlign = 'left';
    });

    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      values.forEach(layer => {
        if (x >= layer.x && x <= layer.x + layer.width &&
            y >= layer.y && y <= layer.y + layer.height) {
          this.copyToClipboard(`${layer.name}: ${layer.top}px ${layer.right}px ${layer.bottom}px ${layer.left}px`);
        }
      });
    });
  }

  updatePalettePanel(data) {
    if (!data || !data.colors) return;

    const container = document.getElementById('color-palette');
    container.innerHTML = '';

    const colorCounts = {};
    data.colors.forEach(color => {
      const normalized = this.normalizeColor(color);
      colorCounts[normalized] = (colorCounts[normalized] || 0) + 1;
    });

    const sorted = Object.entries(colorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30);

    sorted.forEach(([color, count]) => {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      swatch.innerHTML = `
        <div class="color-preview" style="background-color: ${color}"></div>
        <span class="color-label">${color}</span>
        <span class="color-count">${count}×</span>
      `;
      swatch.addEventListener('click', () => {
        this.copyToClipboard(color);
      });
      container.appendChild(swatch);
    });
  }

  normalizeColor(color) {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    if (a < 255) {
      return `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(2)})`;
    }
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  updateFontPanel(data) {
    if (!data || !data.fonts) return;

    const container = document.getElementById('font-summary');
    container.innerHTML = '';

    data.fonts.forEach(font => {
      const item = document.createElement('div');
      item.className = 'font-item';
      item.innerHTML = `
        <div class="font-name" style="font-family: ${font.family}">${font.family}</div>
        <div class="font-details">
          <span class="font-detail">Size: <span class="font-detail-value">${font.sizes.join(', ')}</span></span>
          <span class="font-detail">Weight: <span class="font-detail-value">${font.weights.join(', ')}</span></span>
          <span class="font-detail">Elements: <span class="font-detail-value">${font.count}</span></span>
        </div>
      `;
      item.addEventListener('click', () => {
        this.copyToClipboard(`font-family: ${font.family};`);
      });
      container.appendChild(item);
    });
  }

  updateVariablesPanel(data) {
    if (!data || !data.variables) return;

    const container = document.getElementById('css-variables');
    container.innerHTML = '';

    data.variables.forEach(variable => {
      const item = document.createElement('div');
      item.className = 'variable-item';
      item.innerHTML = `
        <span class="variable-name">${variable.name}</span>
        <span class="variable-value">${variable.value}</span>
      `;
      item.addEventListener('click', () => {
        this.copyToClipboard(`${variable.name}: ${variable.value};`);
      });
      container.appendChild(item);
    });
  }

  updateMediaPanel(data) {
    if (!data || !data.mediaQueries) return;

    const container = document.getElementById('media-queries');
    container.innerHTML = '';

    data.mediaQueries.forEach(mq => {
      const item = document.createElement('div');
      item.className = 'media-item';
      const isActive = this.isMediaQueryActive(mq.query);
      item.innerHTML = `
        <div class="media-query">
          <span class="${isActive ? 'media-active' : 'media-inactive'}"></span>
          ${mq.query}
        </div>
        <div class="media-rules">${mq.ruleCount} rules</div>
      `;
      container.appendChild(item);
    });
  }

  isMediaQueryActive(query) {
    return window.matchMedia(query).matches;
  }

  calculateSpecificity(selector) {
    let a = 0, b = 0, c = 0;

    const idMatches = selector.match(/#[a-zA-Z0-9_-]+/g);
    if (idMatches) a = idMatches.length;

    const classMatches = selector.match(/\.[a-zA-Z0-9_-]+/g);
    if (classMatches) b = classMatches.length;

    const attrMatches = selector.match(/\[[^\]]+\]/g);
    if (attrMatches) b += attrMatches.length;

    const pseudoClassMatches = selector.match(/:[a-zA-Z0-9_-]+/g);
    if (pseudoClassMatches) b += pseudoClassMatches.length;

    const elementMatches = selector.match(/[a-zA-Z0-9]+/g);
    if (elementMatches) c = elementMatches.length;

    return `${a} ${b} ${c}`;
  }

  filterRules(query) {
    const items = document.querySelectorAll('#css-rules .rule-item');
    items.forEach(item => {
      const selector = item.dataset.selector || '';
      const matches = selector.toLowerCase().includes(query.toLowerCase());
      item.style.display = matches ? '' : 'none';
    });
  }

  filterComputed(query) {
    const items = document.querySelectorAll('#computed-styles .style-entry');
    items.forEach(item => {
      const property = item.dataset.property || '';
      const value = item.dataset.value || '';
      const matches = property.toLowerCase().includes(query.toLowerCase()) ||
                     value.toLowerCase().includes(query.toLowerCase());
      item.style.display = matches ? '' : 'none';
    });
  }

  sortComputed(sortBy) {
    const container = document.getElementById('computed-styles');
    const items = Array.from(container.querySelectorAll('.style-entry'));

    items.sort((a, b) => {
      if (sortBy === 'name') {
        return a.dataset.property.localeCompare(b.dataset.property);
      }
      return a.dataset.value.localeCompare(b.dataset.value);
    });

    items.forEach(item => container.appendChild(item));
  }

  async handleCopy(type) {
    let text = '';

    switch (type) {
      case 'selector':
        text = this.inspectorData?.selector || '';
        break;
      case 'all-rules':
        text = this.getAllRulesText();
        break;
      case 'computed':
        text = this.getAllComputedText();
        break;
      case 'colors':
        text = this.inspectorData?.colors?.join('\n') || '';
        break;
      case 'fonts':
        text = this.inspectorData?.fonts?.map(f =>
          `${f.family} (${f.sizes.join(', ')}, weights: ${f.weights.join(', ')})`
        ).join('\n') || '';
        break;
      case 'variables':
        text = this.inspectorData?.variables?.map(v =>
          `${v.name}: ${v.value};`
        ).join('\n') || '';
        break;
      case 'media':
        text = this.inspectorData?.mediaQueries?.map(mq =>
          `@media ${mq.query} { /* ${mq.ruleCount} rules */ }`
        ).join('\n') || '';
        break;
    }

    if (text) {
      await this.copyToClipboard(text);
    }
  }

  getAllRulesText() {
    if (!this.inspectorData?.cssRules) return '';
    return this.inspectorData.cssRules.map(rule => {
      const props = rule.properties.map(p => `  ${p.name}: ${p.value};`).join('\n');
      return `${rule.selector} {\n${props}\n}`;
    }).join('\n\n');
  }

  getAllComputedText() {
    if (!this.inspectorData?.computedStyles) return '';
    return Object.entries(this.inspectorData.computedStyles)
      .filter(([_, v]) => v && v !== 'auto' && v !== 'normal')
      .map(([k, v]) => `${k}: ${v};`)
      .join('\n');
  }

  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showCopiedToast();
    } catch (e) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      this.showCopiedToast();
    }
  }

  showCopiedToast() {
    let toast = document.querySelector('.copied-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'copied-toast';
      toast.textContent = 'Copied!';
      document.body.appendChild(toast);
    }
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1500);
  }

  async refreshData() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_STATE' });
      if (response && response.inspectorData) {
        this.handleElementSelected(response.inspectorData);
        this.showStatus('Data refreshed');
      }
    } catch (e) {
      this.showStatus('No element selected');
    }
  }

  async createElementCount() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_ELEMENT_COUNT' });
      if (response) {
        document.getElementById('element-count').textContent = `${response.count} elements on page`;
      }
    } catch (e) {
      document.getElementById('element-count').textContent = '';
    }
  }

  showStatus(text) {
    document.getElementById('status-text').textContent = text;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new CSSPickerPopup();
});
