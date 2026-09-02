document.addEventListener('DOMContentLoaded', () => {
  const jsonInput = document.getElementById('jsonInput');
  const lineNumbers = document.getElementById('lineNumbers');
  const formatBtn = document.getElementById('formatBtn');
  const minifyBtn = document.getElementById('minifyBtn');
  const validateBtn = document.getElementById('validateBtn');
  const copyBtn = document.getElementById('copyBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const collapseAllBtn = document.getElementById('collapseAllBtn');
  const expandAllBtn = document.getElementById('expandAllBtn');
  const convertCsvBtn = document.getElementById('convertCsvBtn');
  const convertYamlBtn = document.getElementById('convertYamlBtn');
  const pathQueryBtn = document.getElementById('pathQueryBtn');
  const indentSize = document.getElementById('indentSize');
  const sortKeys = document.getElementById('sortKeys');
  const darkTheme = document.getElementById('darkTheme');
  const rawViewBtn = document.getElementById('rawViewBtn');
  const treeViewBtn = document.getElementById('treeViewBtn');
  const rawView = document.getElementById('rawView');
  const treeView = document.getElementById('treeView');
  const searchInput = document.getElementById('searchInput');
  const searchCount = document.getElementById('searchCount');
  const searchPrev = document.getElementById('searchPrev');
  const searchNext = document.getElementById('searchNext');
  const statsPanel = document.getElementById('statsPanel');
  const statKeys = document.getElementById('statKeys');
  const statDepth = document.getElementById('statDepth');
  const statSize = document.getElementById('statSize');
  const statTypes = document.getElementById('statTypes');
  const errorDisplay = document.getElementById('errorDisplay');
  const historyToggle = document.getElementById('historyToggle');
  const historyList = document.getElementById('historyList');
  const pathBreadcrumb = document.getElementById('pathBreadcrumb');

  let currentParsed = null;
  let searchMatches = [];
  let searchIndex = -1;
  let history = [];
  let treeRenderer = null;

  function init() {
    loadSettings();
    loadHistory();
    setupEventListeners();
    updateLineNumbers();
    updateHistoryUI();
  }

  function loadSettings() {
    chrome.storage.local.get(['indentSize', 'sortKeys', 'darkTheme'], (result) => {
      if (result.indentSize) indentSize.value = result.indentSize;
      if (result.sortKeys) sortKeys.checked = result.sortKeys;
      if (result.darkTheme) {
        darkTheme.checked = true;
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    });
  }

  function saveSettings() {
    chrome.storage.local.set({
      indentSize: indentSize.value,
      sortKeys: sortKeys.checked,
      darkTheme: darkTheme.checked
    });
  }

  function setupEventListeners() {
    formatBtn.addEventListener('click', formatJSON);
    minifyBtn.addEventListener('click', minifyJSON);
    validateBtn.addEventListener('click', validateJSON);
    copyBtn.addEventListener('click', copyJSON);
    downloadBtn.addEventListener('click', downloadJSON);
    collapseAllBtn.addEventListener('click', collapseAll);
    expandAllBtn.addEventListener('click', expandAll);
    convertCsvBtn.addEventListener('click', convertToCSV);
    convertYamlBtn.addEventListener('click', convertToYAML);
    pathQueryBtn.addEventListener('click', runPathQuery);

    indentSize.addEventListener('change', () => {
      if (currentParsed) formatJSON();
      saveSettings();
    });
    sortKeys.addEventListener('change', () => {
      if (currentParsed) formatJSON();
      saveSettings();
    });
    darkTheme.addEventListener('change', () => {
      document.documentElement.setAttribute('data-theme', darkTheme.checked ? 'dark' : '');
      saveSettings();
    });

    rawViewBtn.addEventListener('click', switchToRawView);
    treeViewBtn.addEventListener('click', switchToTreeView);

    searchInput.addEventListener('input', performSearch);
    searchPrev.addEventListener('click', () => navigateSearch(-1));
    searchNext.addEventListener('click', () => navigateSearch(1));

    historyToggle.addEventListener('click', () => {
      historyList.style.display = historyList.style.display === 'none' ? 'block' : 'none';
    });

    jsonInput.addEventListener('input', () => {
      updateLineNumbers();
      clearError();
    });
    jsonInput.addEventListener('scroll', syncLineNumberScroll);
    jsonInput.addEventListener('keydown', handleTab);

    jsonInput.addEventListener('dragover', (e) => {
      e.preventDefault();
      jsonInput.style.borderColor = 'var(--accent-color)';
    });
    jsonInput.addEventListener('dragleave', () => {
      jsonInput.style.borderColor = '';
    });
    jsonInput.addEventListener('drop', handleDrop);
  }

  function handleTab(e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = jsonInput.selectionStart;
      const end = jsonInput.selectionEnd;
      jsonInput.value = jsonInput.value.substring(0, start) + '  ' + jsonInput.value.substring(end);
      jsonInput.selectionStart = jsonInput.selectionEnd = start + 2;
      updateLineNumbers();
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    jsonInput.style.borderColor = '';
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const reader = new FileReader();
      reader.onload = (event) => {
        jsonInput.value = event.target.result;
        updateLineNumbers();
      };
      reader.readAsText(files[0]);
    }
  }

  function updateLineNumbers() {
    const lines = jsonInput.value.split('\n');
    const numbers = lines.map((_, i) => i + 1).join('\n');
    lineNumbers.textContent = numbers;
  }

  function syncLineNumberScroll() {
    lineNumbers.scrollTop = jsonInput.scrollTop;
  }

  function getIndent() {
    const val = indentSize.value;
    return val === 'tab' ? '\t' : parseInt(val);
  }

  function formatJSON() {
    clearError();
    const raw = jsonInput.value.trim();
    if (!raw) {
      showError('No JSON to format');
      return;
    }

    try {
      const parsed = JSONFormatter.parse(raw);
      currentParsed = parsed;

      let formatted;
      if (sortKeys.checked) {
        formatted = JSONFormatter.sortKeys(parsed, getIndent());
      } else {
        formatted = JSONFormatter.format(parsed, getIndent());
      }

      jsonInput.value = formatted;
      updateLineNumbers();
      updateStats(raw, parsed);
      addToHistory(formatted.substring(0, 100) + (formatted.length > 100 ? '...' : ''));
    } catch (e) {
      showError(e.message);
    }
  }

  function minifyJSON() {
    clearError();
    const raw = jsonInput.value.trim();
    if (!raw) return;

    try {
      const parsed = JSONFormatter.parse(raw);
      currentParsed = parsed;
      const minified = JSONFormatter.minify(parsed);
      jsonInput.value = minified;
      updateLineNumbers();
      updateStats(raw, parsed);
    } catch (e) {
      showError(e.message);
    }
  }

  function validateJSON() {
    clearError();
    const raw = jsonInput.value.trim();
    if (!raw) {
      showError('No JSON to validate');
      return;
    }

    try {
      const parsed = JSONFormatter.parse(raw);
      currentParsed = parsed;
      showSuccess('Valid JSON ✓');
      updateStats(raw, parsed);
    } catch (e) {
      showError(e.message);
    }
  }

  function copyJSON() {
    const text = jsonInput.value;
    if (!text) return;

    navigator.clipboard.writeText(text).then(() => {
      const original = copyBtn.innerHTML;
      copyBtn.innerHTML = '<span class="btn-icon">✓</span> Copied!';
      setTimeout(() => { copyBtn.innerHTML = original; }, 1500);
    });
  }

  function downloadJSON() {
    const text = jsonInput.value;
    if (!text) return;

    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'formatted.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function collapseAll() {
    if (treeRenderer && treeViewBtn.classList.contains('active')) {
      treeRenderer.collapseAll();
    }
  }

  function expandAll() {
    if (treeRenderer && treeViewBtn.classList.contains('active')) {
      treeRenderer.expandAll();
    }
  }

  function convertToCSV() {
    clearError();
    const raw = jsonInput.value.trim();
    if (!raw) return;

    try {
      const parsed = JSONFormatter.parse(raw);
      const csv = JSONFormatter.toCSV(parsed);
      if (csv === null) {
        showError('Cannot convert: JSON is not an array of objects');
        return;
      }
      jsonInput.value = csv;
      updateLineNumbers();
    } catch (e) {
      showError(e.message);
    }
  }

  function convertToYAML() {
    clearError();
    const raw = jsonInput.value.trim();
    if (!raw) return;

    try {
      const parsed = JSONFormatter.parse(raw);
      const yaml = JSONFormatter.toYAML(parsed);
      jsonInput.value = yaml;
      updateLineNumbers();
    } catch (e) {
      showError(e.message);
    }
  }

  function runPathQuery() {
    clearError();
    const raw = jsonInput.value.trim();
    if (!raw) return;

    const query = prompt('Enter JSONPath expression (e.g., $.store.book[*].title):');
    if (!query) return;

    try {
      const parsed = JSONFormatter.parse(raw);
      currentParsed = parsed;
      const results = JSONFormatter.jsonPath(parsed, query);
      jsonInput.value = JSONFormatter.format(results, getIndent());
      updateLineNumbers();
      updateStats(jsonInput.value, results);
    } catch (e) {
      showError(e.message);
    }
  }

  function performSearch() {
    const query = searchInput.value.toLowerCase();
    searchMatches = [];
    searchIndex = -1;

    clearHighlights();

    if (!query || !jsonInput.value) {
      searchCount.textContent = '';
      return;
    }

    const text = jsonInput.value;
    let pos = 0;
    while ((pos = text.toLowerCase().indexOf(query, pos)) !== -1) {
      searchMatches.push(pos);
      pos++;
    }

    searchCount.textContent = searchMatches.length ? `${searchMatches.length} matches` : 'No matches';

    if (searchMatches.length > 0) {
      searchIndex = 0;
      highlightCurrent();
    }
  }

  function highlightCurrent() {
    clearHighlights();
    if (searchIndex < 0 || searchIndex >= searchMatches.length) return;

    const pos = searchMatches[searchIndex];
    const queryLen = searchInput.value.length;
    jsonInput.focus();
    jsonInput.setSelectionRange(pos, pos + queryLen);
  }

  function navigateSearch(direction) {
    if (searchMatches.length === 0) return;
    searchIndex = (searchIndex + direction + searchMatches.length) % searchMatches.length;
    highlightCurrent();
  }

  function clearHighlights() {
    jsonInput.style.background = '';
  }

  function switchToRawView() {
    rawViewBtn.classList.add('active');
    treeViewBtn.classList.remove('active');
    rawView.style.display = 'flex';
    treeView.style.display = 'none';
  }

  function switchToTreeView() {
    rawViewBtn.classList.remove('active');
    treeViewBtn.classList.add('active');
    rawView.style.display = 'none';
    treeView.style.display = 'block';

    const raw = jsonInput.value.trim();
    if (!raw) return;

    try {
      const parsed = JSONFormatter.parse(raw);
      currentParsed = parsed;
      treeRenderer = new JsonTreeView(treeView);
      treeRenderer.render(parsed);
    } catch (e) {
      showError(e.message);
      switchToRawView();
    }
  }

  function updateStats(raw, parsed) {
    statsPanel.style.display = 'flex';
    const stats = JSONFormatter.getStats(parsed);
    statKeys.textContent = stats.keyCount;
    statDepth.textContent = stats.depth;
    statSize.textContent = formatSize(new Blob([raw]).size);

    const typeList = Object.entries(stats.types)
      .map(([t, c]) => `${t}: ${c}`)
      .join(', ');
    statTypes.textContent = typeList || '-';
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  function showError(msg) {
    errorDisplay.style.display = 'block';
    errorDisplay.textContent = 'Error: ' + msg;
    errorDisplay.className = 'error-display';
  }

  function showSuccess(msg) {
    errorDisplay.style.display = 'block';
    errorDisplay.textContent = msg;
    errorDisplay.style.background = '#f0fdf4';
    errorDisplay.style.color = 'var(--success-color)';
  }

  function clearError() {
    errorDisplay.style.display = 'none';
    errorDisplay.textContent = '';
  }

  function addToHistory(preview) {
    history.unshift({
      text: jsonInput.value,
      preview: preview,
      time: Date.now()
    });
    if (history.length > 10) history.pop();
    chrome.storage.local.set({ jsonHistory: history });
    updateHistoryUI();
  }

  function loadHistory() {
    chrome.storage.local.get(['jsonHistory'], (result) => {
      history = result.jsonHistory || [];
      updateHistoryUI();
    });
  }

  function updateHistoryUI() {
    historyToggle.textContent = `Recent (${history.length})`;
    historyList.innerHTML = '';

    history.forEach((item, index) => {
      const div = document.createElement('div');
      div.className = 'history-item';

      const textSpan = document.createElement('span');
      textSpan.className = 'history-item-text';
      textSpan.textContent = item.preview;

      const timeSpan = document.createElement('span');
      timeSpan.className = 'history-item-time';
      timeSpan.textContent = formatTime(item.time);

      const delBtn = document.createElement('button');
      delBtn.className = 'history-item-delete';
      delBtn.textContent = '×';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        history.splice(index, 1);
        chrome.storage.local.set({ jsonHistory: history });
        updateHistoryUI();
      });

      div.appendChild(textSpan);
      div.appendChild(timeSpan);
      div.appendChild(delBtn);

      div.addEventListener('click', () => {
        jsonInput.value = item.text;
        updateLineNumbers();
        historyList.style.display = 'none';
      });

      historyList.appendChild(div);
    });
  }

  function formatTime(ts) {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  init();
});
