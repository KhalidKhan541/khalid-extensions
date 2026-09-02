(async () => {
  const searchInput = document.getElementById('search-input');
  const resultsSection = document.getElementById('results-section');
  const resultsList = document.getElementById('results-list');
  const favoritesSection = document.getElementById('favorites-section');
  const favoritesGrid = document.getElementById('favorites-grid');
  const recentSection = document.getElementById('recent-section');
  const recentList = document.getElementById('recent-list');
  const quickActionsGrid = document.getElementById('quick-actions-grid');
  const toolsSection = document.getElementById('tools-section');
  const toolsTitle = document.getElementById('tools-title');
  const toolsContent = document.getElementById('tool-content');
  const toolsBack = document.getElementById('tools-back');
  const clipboardSection = document.getElementById('clipboard-section');
  const clipboardList = document.getElementById('clipboard-list');
  const themeToggle = document.getElementById('theme-toggle');
  const quickActionsSection = document.getElementById('quick-actions');

  let activeIndex = -1;
  let currentResults = [];
  let currentTool = null;

  // Theme
  async function initTheme() {
    const theme = await Utils.getStorage('theme');
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.getElementById('theme-icon-light').classList.add('hidden');
      document.getElementById('theme-icon-dark').classList.remove('hidden');
    }
  }

  themeToggle.addEventListener('click', async () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      document.getElementById('theme-icon-light').classList.remove('hidden');
      document.getElementById('theme-icon-dark').classList.add('hidden');
      await Utils.setStorage('theme', 'light');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.getElementById('theme-icon-light').classList.add('hidden');
      document.getElementById('theme-icon-dark').classList.remove('hidden');
      await Utils.setStorage('theme', 'dark');
    }
  });

  // Quick Actions
  async function renderQuickActions() {
    const actions = await Commands.getQuickActions();
    quickActionsGrid.innerHTML = '';
    for (const act of actions) {
      const btn = document.createElement('button');
      btn.className = 'action-btn';
      btn.innerHTML = `
        <div class="action-icon">${act.icon}</div>
        <div class="action-label">${Utils.escapeHtml(act.label)}</div>
      `;
      btn.addEventListener('click', async () => {
        const cmd = { id: act.id, name: act.label };
        const result = await Commands.executeCommand(cmd);
        if (result === 'calculator') showTool('calculator');
        else if (result === 'color-picker') showTool('color-picker');
        else if (result === 'lorem') showTool('lorem');
        else if (result === 'base64') showTool('base64');
        else if (result === 'json-formatter') showTool('json-formatter');
        else if (result === 'clipboard') showClipboard();
        else window.close();
      });
      quickActionsGrid.appendChild(btn);
    }
  }

  // Favorites
  async function renderFavorites() {
    const favs = await Commands.getFavorites();
    favoritesGrid.innerHTML = '';
    favs.forEach((fav, i) => {
      const btn = document.createElement('button');
      btn.className = 'fav-btn';
      btn.innerHTML = `
        <span class="fav-key">${i < 9 ? i + 1 : ''}</span>
        <div class="fav-icon"><img src="${Utils.getFaviconUrl(fav.url)}" alt="" onerror="this.style.display='none';this.parentNode.textContent='🌐'"></div>
        <span class="fav-name">${Utils.escapeHtml(fav.name)}</span>
      `;
      btn.addEventListener('click', () => {
        chrome.tabs.create({ url: fav.url });
        window.close();
      });
      btn.title = `${fav.name} (${fav.url}) — Press ${i + 1}`;
      favoritesGrid.appendChild(btn);
    });
  }

  // Recent Sites
  async function renderRecent() {
    const sites = await Search.getTopSites();
    recentList.innerHTML = '';
    const shown = sites.slice(0, 8);
    for (const site of shown) {
      const item = document.createElement('div');
      item.className = 'recent-item';
      item.innerHTML = `
        <div class="recent-icon"><img src="${site.favicon}" alt="" onerror="this.style.display='none';this.parentNode.textContent='🌐'"></div>
        <div class="recent-info">
          <div class="recent-title">${Utils.escapeHtml(site.title)}</div>
          <div class="recent-url">${Utils.escapeHtml(Utils.getDomain(site.url))}</div>
        </div>
      `;
      item.addEventListener('click', () => {
        chrome.tabs.create({ url: site.url });
        window.close();
      });
      recentList.appendChild(item);
    }
  }

  // Search
  async function performSearch(query) {
    if (!query.trim()) {
      showDefaultView();
      return;
    }

    const mathResult = Utils.evaluateMath(query);
    if (mathResult !== null) {
      currentResults = [{
        title: `= ${mathResult}`,
        url: '',
        type: 'math',
        badge: 'Calculator',
        icon: '🧮'
      }];
    } else {
      const [searchResults, commandResults] = await Promise.all([
        Search.search(query, 15),
        Commands.searchAll(query)
      ]);

      const merged = [...commandResults, ...searchResults];
      const deduped = [];
      const seen = new Set();
      for (const r of merged) {
        const key = r.url || r.title;
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(r);
        }
      }
      currentResults = deduped;
    }

    renderResults(query);
  }

  function renderResults(query) {
    resultsSection.classList.remove('hidden');
    quickActionsSection.classList.add('hidden');
    favoritesSection.classList.add('hidden');
    recentSection.classList.add('hidden');
    toolsSection.classList.add('hidden');
    clipboardSection.classList.add('hidden');

    if (currentResults.length === 0) {
      resultsList.innerHTML = `<div class="no-results">No results for "${Utils.escapeHtml(query)}"</div>`;
      return;
    }

    resultsList.innerHTML = '';
    currentResults.forEach((result, i) => {
      const item = document.createElement('div');
      item.className = 'result-item' + (i === activeIndex ? ' active' : '');
      item.dataset.index = i;

      let iconHtml;
      if (result.icon && result.icon.startsWith('http')) {
        iconHtml = `<div class="result-icon"><img src="${result.icon}" alt="" onerror="this.style.display='none';this.parentNode.textContent='🌐'"></div>`;
      } else if (result.icon) {
        iconHtml = `<div class="result-icon">${result.icon}</div>`;
      } else {
        iconHtml = `<div class="result-icon"><img src="${Utils.getFaviconUrl(result.url)}" alt="" onerror="this.style.display='none';this.parentNode.textContent='🌐'"></div>`;
      }

      const titleHtml = result.indices && result.indices.length > 0
        ? Utils.highlightMatch(result.title, result.indices)
        : Utils.escapeHtml(result.title);

      const badgeClass = (result.type || '').toLowerCase();
      const badgeHtml = result.badge
        ? `<span class="result-badge ${badgeClass}">${Utils.escapeHtml(result.badge)}</span>`
        : '';

      item.innerHTML = `
        ${iconHtml}
        <div class="result-info">
          <div class="result-title">${titleHtml}</div>
          ${result.url ? `<div class="result-url">${Utils.escapeHtml(Utils.getDomain(result.url))}</div>` : ''}
        </div>
        ${badgeHtml}
      `;

      item.addEventListener('click', () => openResult(result));
      item.addEventListener('mouseenter', () => {
        activeIndex = i;
        updateActiveResult();
      });

      resultsList.appendChild(item);
    });
  }

  function showDefaultView() {
    currentResults = [];
    activeIndex = -1;
    resultsSection.classList.add('hidden');
    quickActionsSection.classList.remove('hidden');
    favoritesSection.classList.remove('hidden');
    recentSection.classList.remove('hidden');
    toolsSection.classList.add('hidden');
    clipboardSection.classList.add('hidden');
  }

  function updateActiveResult() {
    const items = resultsList.querySelectorAll('.result-item');
    items.forEach((el, i) => {
      el.classList.toggle('active', i === activeIndex);
      if (i === activeIndex) el.scrollIntoView({ block: 'nearest' });
    });
  }

  async function openResult(result) {
    if (result.action) {
      result.action();
      window.close();
      return;
    }
    if (result.type === 'math') {
      await navigator.clipboard.writeText(String(result.title.replace('= ', ''))).catch(() => {});
      window.close();
      return;
    }
    if (result.url) {
      if (result.type === 'tab' && result.tabId) {
        chrome.tabs.update(result.tabId, { active: true });
        chrome.windows.update(result.windowId, { focused: true });
      } else {
        chrome.tabs.create({ url: result.url });
      }
      window.close();
    }
  }

  // Tool views
  function showTool(toolId) {
    currentTool = toolId;
    resultsSection.classList.add('hidden');
    quickActionsSection.classList.add('hidden');
    favoritesSection.classList.add('hidden');
    recentSection.classList.add('hidden');
    clipboardSection.classList.add('hidden');
    toolsSection.classList.remove('hidden');

    const toolMap = {
      'calculator': { title: 'Calculator', render: renderCalculatorTool },
      'color-picker': { title: 'Color Picker', render: renderColorPickerTool },
      'lorem': { title: 'Lorem Ipsum Generator', render: renderLoremTool },
      'base64': { title: 'Base64 Encode/Decode', render: renderBase64Tool },
      'json-formatter': { title: 'JSON Formatter', render: renderJsonTool }
    };

    const tool = toolMap[toolId];
    if (!tool) return;
    toolsTitle.textContent = tool.title;
    toolsContent.innerHTML = '';
    tool.render(toolsContent);
  }

  function renderCalculatorTool(container) {
    container.innerHTML = `
      <input type="text" class="tool-input" id="calc-input" placeholder="Enter math expression (e.g., 2 * (3 + 4))" style="min-height:auto">
      <div class="tool-output" id="calc-result" style="min-height:24px"></div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px">
        <button class="tool-btn secondary" data-calc="(">(</button>
        <button class="tool-btn secondary" data-calc=")">)</button>
        <button class="tool-btn secondary" data-calc="%">%</button>
        <button class="tool-btn secondary" data-calc="/">÷</button>
        <button class="tool-btn secondary" data-calc="*">×</button>
        <button class="tool-btn secondary" data-calc="-">−</button>
        <button class="tool-btn secondary" data-calc="+">+</button>
        <button class="tool-btn secondary" data-calc=".">.</button>
        <button class="tool-btn secondary" data-calc="**">^</button>
      </div>
    `;

    const input = container.querySelector('#calc-input');
    const result = container.querySelector('#calc-result');

    input.addEventListener('input', () => {
      const val = Utils.evaluateMath(input.value);
      result.textContent = val !== null ? `= ${val}` : '';
    });

    container.querySelectorAll('[data-calc]').forEach((btn) => {
      btn.addEventListener('click', () => {
        input.value += btn.dataset.calc;
        input.dispatchEvent(new Event('input'));
      });
    });

    input.focus();
  }

  function renderColorPickerTool(container) {
    container.innerHTML = `
      <div class="tool-color-picker">
        <input type="color" id="color-input" value="#4285f4">
        <div class="tool-color-swatch" id="color-swatch" style="background:#4285f4"></div>
        <div style="display:flex;flex-direction:column;gap:2px">
          <input type="text" class="tool-input" id="color-hex" value="#4285f4" style="min-height:auto;padding:4px 8px;width:120px">
          <input type="text" class="tool-input" id="color-rgb" value="rgb(66, 133, 244)" style="min-height:auto;padding:4px 8px;width:120px;font-size:11px">
        </div>
      </div>
      <button class="tool-btn" id="copy-color">Copy HEX</button>
    `;

    const colorInput = container.querySelector('#color-input');
    const swatch = container.querySelector('#color-swatch');
    const hexInput = container.querySelector('#color-hex');
    const rgbInput = container.querySelector('#color-rgb');
    const copyBtn = container.querySelector('#copy-color');

    function updateColor(hex) {
      swatch.style.background = hex;
      hexInput.value = hex;
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      rgbInput.value = `rgb(${r}, ${g}, ${b})`;
      colorInput.value = hex;
    }

    colorInput.addEventListener('input', () => updateColor(colorInput.value));

    hexInput.addEventListener('change', () => {
      if (/^#[0-9a-fA-F]{6}$/.test(hexInput.value)) updateColor(hexInput.value);
    });

    copyBtn.addEventListener('click', async () => {
      await navigator.clipboard.writeText(hexInput.value).catch(() => {});
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = 'Copy HEX'; }, 1500);
    });
  }

  function renderLoremTool(container) {
    container.innerHTML = `
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
        <label style="font-size:12px;color:var(--text-secondary)">Words:</label>
        <input type="number" class="tool-input" id="lorem-count" value="50" min="1" max="1000" style="width:80px;min-height:auto;padding:4px 8px">
        <button class="tool-btn" id="lorem-gen">Generate</button>
      </div>
      <textarea class="tool-input" id="lorem-output" rows="5" readonly></textarea>
      <button class="tool-btn secondary" id="lorem-copy" style="margin-top:4px">Copy</button>
    `;

    const count = container.querySelector('#lorem-count');
    const output = container.querySelector('#lorem-output');
    const genBtn = container.querySelector('#lorem-gen');
    const copyBtn = container.querySelector('#lorem-copy');

    function generate() { output.value = Utils.generateLorem(parseInt(count.value) || 50); }
    generate();
    genBtn.addEventListener('click', generate);
    copyBtn.addEventListener('click', async () => {
      await navigator.clipboard.writeText(output.value).catch(() => {});
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
    });
  }

  function renderBase64Tool(container) {
    container.innerHTML = `
      <textarea class="tool-input" id="b64-input" placeholder="Enter text to encode or base64 to decode..."></textarea>
      <div style="display:flex;gap:4px;margin-top:8px">
        <button class="tool-btn" id="b64-encode">Encode</button>
        <button class="tool-btn" id="b64-decode">Decode</button>
        <button class="tool-btn secondary" id="b64-copy">Copy</button>
      </div>
      <textarea class="tool-input" id="b64-output" rows="3" readonly style="margin-top:8px"></textarea>
    `;

    const input = container.querySelector('#b64-input');
    const output = container.querySelector('#b64-output');
    const encodeBtn = container.querySelector('#b64-encode');
    const decodeBtn = container.querySelector('#b64-decode');
    const copyBtn = container.querySelector('#b64-copy');

    encodeBtn.addEventListener('click', () => {
      try { output.value = btoa(unescape(encodeURIComponent(input.value))); }
      catch { output.value = 'Error encoding'; }
    });

    decodeBtn.addEventListener('click', () => {
      try { output.value = decodeURIComponent(escape(atob(input.value.trim()))); }
      catch { output.value = 'Error decoding — not valid base64'; }
    });

    copyBtn.addEventListener('click', async () => {
      await navigator.clipboard.writeText(output.value).catch(() => {});
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
    });
  }

  function renderJsonTool(container) {
    container.innerHTML = `
      <textarea class="tool-input" id="json-input" placeholder='Paste JSON here...'></textarea>
      <div style="display:flex;gap:4px;margin-top:8px">
        <button class="tool-btn" id="json-format">Format</button>
        <button class="tool-btn secondary" id="json-minify">Minify</button>
        <button class="tool-btn secondary" id="json-copy">Copy</button>
      </div>
      <textarea class="tool-input" id="json-output" rows="5" readonly style="margin-top:8px"></textarea>
    `;

    const input = container.querySelector('#json-input');
    const output = container.querySelector('#json-output');
    const formatBtn = container.querySelector('#json-format');
    const minifyBtn = container.querySelector('#json-minify');
    const copyBtn = container.querySelector('#json-copy');

    formatBtn.addEventListener('click', () => {
      if (Utils.isValidJson(input.value)) output.value = Utils.formatJson(input.value);
      else output.value = 'Invalid JSON';
    });

    minifyBtn.addEventListener('click', () => {
      if (Utils.isValidJson(input.value)) output.value = JSON.stringify(JSON.parse(input.value));
      else output.value = 'Invalid JSON';
    });

    copyBtn.addEventListener('click', async () => {
      await navigator.clipboard.writeText(output.value).catch(() => {});
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
    });
  }

  // Clipboard
  async function showClipboard() {
    resultsSection.classList.add('hidden');
    quickActionsSection.classList.add('hidden');
    favoritesSection.classList.add('hidden');
    recentSection.classList.add('hidden');
    toolsSection.classList.add('hidden');
    clipboardSection.classList.remove('hidden');

    const history = await Utils.getClipboardHistory();
    clipboardList.innerHTML = '';

    if (history.length === 0) {
      clipboardList.innerHTML = '<div class="no-results">No clipboard history yet</div>';
      return;
    }

    for (const entry of history) {
      const item = document.createElement('div');
      item.className = 'clipboard-item';
      item.innerHTML = `
        <span class="clip-text">${Utils.escapeHtml(entry.text)}</span>
        <span class="clip-copy">Copy</span>
      `;
      item.addEventListener('click', async () => {
        await navigator.clipboard.writeText(entry.text).catch(() => {});
        item.querySelector('.clip-copy').textContent = 'Copied!';
        setTimeout(() => {
          item.querySelector('.clip-copy').textContent = 'Copy';
        }, 1000);
      });
      clipboardList.appendChild(item);
    }
  }

  toolsBack.addEventListener('click', showDefaultView);

  // Input handling
  const debouncedSearch = Utils.debounce(performSearch, 80);

  searchInput.addEventListener('input', () => {
    activeIndex = -1;
    debouncedSearch(searchInput.value);
  });

  searchInput.addEventListener('keydown', async (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (currentResults.length > 0) {
        activeIndex = Math.min(activeIndex + 1, currentResults.length - 1);
        updateActiveResult();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentResults.length > 0) {
        activeIndex = Math.max(activeIndex - 1, 0);
        updateActiveResult();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < currentResults.length) {
        openResult(currentResults[activeIndex]);
      } else if (searchInput.value.trim()) {
        const url = Commands.matchSiteShortcut(searchInput.value);
        if (url) {
          chrome.tabs.create({ url });
          window.close();
        } else if (/^https?:\/\//.test(searchInput.value)) {
          chrome.tabs.create({ url: searchInput.value });
          window.close();
        } else {
          chrome.tabs.create({ url: `https://www.google.com/search?q=${encodeURIComponent(searchInput.value)}` });
          window.close();
        }
      }
    } else if (e.key === 'Escape') {
      if (searchInput.value) {
        searchInput.value = '';
        showDefaultView();
      } else {
        window.close();
      }
    }
  });

  // Number keys 1-9 for favorites
  document.addEventListener('keydown', async (e) => {
    if (e.target === searchInput && searchInput.value) return;
    const num = parseInt(e.key);
    if (num >= 1 && num <= 9) {
      e.preventDefault();
      const favs = await Commands.getFavorites();
      if (favs[num - 1]) {
        chrome.tabs.create({ url: favs[num - 1].url });
        window.close();
      }
    }
  });

  // Initialize
  await Commands.loadHistory();
  await Search.refreshCaches();
  await initTheme();
  await Promise.all([
    renderQuickActions(),
    renderFavorites(),
    renderRecent()
  ]);
  searchInput.focus();
})();
