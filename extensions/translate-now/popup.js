document.addEventListener('DOMContentLoaded', () => {
  const langManager = new LanguageManager();
  const translator = new Translator();

  const sourceLangEl = document.getElementById('sourceLang');
  const targetLangEl = document.getElementById('targetLang');
  const swapBtn = document.getElementById('swapBtn');
  const inputText = document.getElementById('inputText');
  const translateBtn = document.getElementById('translateBtn');
  const outputArea = document.getElementById('outputArea');
  const translationOutput = document.getElementById('translationOutput');
  const detectedLangEl = document.getElementById('detectedLang');
  const romanization = document.getElementById('romanization');
  const copyBtn = document.getElementById('copyTranslation');
  const speakInputBtn = document.getElementById('speakInputBtn');
  const speakOutputBtn = document.getElementById('speakOutputBtn');
  const favoriteBtn = document.getElementById('favoriteBtn');
  const clearInputBtn = document.getElementById('clearInput');
  const pasteBtn = document.getElementById('pasteBtn');
  const learningMode = document.getElementById('learningMode');
  const loadingOverlay = document.getElementById('loadingOverlay');
  const settingsBtn = document.getElementById('settingsBtn');
  const clearHistoryBtn = document.getElementById('clearHistory');

  let currentTranslation = null;
  let currentFrom = 'auto';
  let currentTo = 'en';

  function populateSelects() {
    const autoOption = '<option value="auto">Auto Detect</option>';
    const languages = langManager.getAllLanguages();

    const recentLangs = langManager.getRecent().filter(c => LANGUAGES[c]);
    const favoriteLangs = langManager.getFavorites().filter(c => LANGUAGES[c]);

    let sourceHtml = autoOption;
    let targetHtml = '';

    if (recentLangs.length > 0) {
      sourceHtml += '<optgroup label="Recent">';
      recentLangs.forEach(code => {
        const lang = LANGUAGES[code];
        sourceHtml += `<option value="${code}">${lang.name}</option>`;
      });
      sourceHtml += '</optgroup>';
    }

    if (favoriteLangs.length > 0) {
      sourceHtml += '<optgroup label="Favorites">';
      targetHtml += '<optgroup label="Favorites">';
      favoriteLangs.forEach(code => {
        const lang = LANGUAGES[code];
        sourceHtml += `<option value="${code}">${lang.name}</option>`;
        targetHtml += `<option value="${code}">${lang.name}</option>`;
      });
      sourceHtml += '</optgroup>';
      targetHtml += '</optgroup>';
    }

    sourceHtml += '<optgroup label="All Languages">';
    targetHtml += '<optgroup label="All Languages">';
    languages.forEach(lang => {
      sourceHtml += `<option value="${lang.code}">${lang.name} (${lang.native})</option>`;
      targetHtml += `<option value="${lang.code}">${lang.name} (${lang.native})</option>`;
    });
    sourceHtml += '</optgroup>';
    targetHtml += '</optgroup>';

    sourceLangEl.innerHTML = sourceHtml;
    targetLangEl.innerHTML = targetHtml;

    sourceLangEl.value = currentFrom;
    targetLangEl.value = currentTo;
  }

  function showLoading(show) {
    loadingOverlay.classList.toggle('hidden', !show);
  }

  function showOutput(show) {
    outputArea.classList.toggle('hidden', !show);
  }

  async function performTranslation() {
    const text = inputText.value.trim();
    if (!text) return;

    showLoading(true);
    try {
      let from = sourceLangEl.value;
      const to = targetLangEl.value;

      if (from === 'auto') {
        from = await translator.detectLanguage(text);
        const detectedLang = LANGUAGES[from];
        if (detectedLang) {
          detectedLangEl.textContent = `Detected: ${detectedLang.name}`;
        }
      } else {
        detectedLangEl.textContent = `${LANGUAGES[from]?.name || from} → ${LANGUAGES[to]?.name || to}`;
      }

      const result = await translator.translate(text, from, to);
      translationOutput.textContent = result;
      currentTranslation = { text, result, from, to };

      if (langManager.isRTL(to)) {
        translationOutput.classList.add('rtl');
      } else {
        translationOutput.classList.remove('rtl');
      }

      if (learningMode.checked) {
        romanization.textContent = `${LANGUAGES[from]?.name || from}: "${text}"`;
        romanization.classList.remove('hidden');
      } else {
        romanization.classList.add('hidden');
      }

      langManager.addRecent(from);
      langManager.addRecent(to);
      showOutput(true);

      chrome.runtime?.sendMessage({
        action: 'saveTranslation',
        data: { text, result, from, to, timestamp: Date.now() }
      });
    } catch (err) {
      translationOutput.textContent = 'Translation failed. Please try again.';
      showOutput(true);
    }
    showLoading(false);
  }

  function loadHistory() {
    const recent = JSON.parse(localStorage.getItem('tn_history') || '[]');
    const favorites = JSON.parse(localStorage.getItem('tn_favorites') || '[]');
    renderHistoryList('recentList', recent);
    renderHistoryList('favoritesList', favorites);
  }

  function renderHistoryList(containerId, items) {
    const container = document.getElementById(containerId);
    if (items.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
          </svg>
          <p>No translations yet</p>
        </div>`;
      return;
    }

    container.innerHTML = items.map((item, i) => `
      <div class="history-item" data-index="${i}">
        <div class="history-item-original">${escapeHtml(item.text)}</div>
        <div class="history-item-translated">${escapeHtml(item.result)}</div>
        <div class="history-item-meta">
          <span>${item.from?.toUpperCase() || 'AUTO'} → ${item.to?.toUpperCase() || 'EN'}</span>
          <button class="history-item-delete" data-index="${i}" data-type="${containerId}">×</button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.history-item').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.classList.contains('history-item-delete')) return;
        const idx = el.dataset.index;
        const item = items[idx];
        inputText.value = item.text;
        sourceLangEl.value = item.from || 'auto';
        targetLangEl.value = item.to || 'en';
        document.querySelector('[data-mode="text"]').click();
        performTranslation();
      });
    });

    container.querySelectorAll('.history-item-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index);
        const type = btn.dataset.type === 'recentList' ? 'tn_history' : 'tn_favorites';
        const arr = JSON.parse(localStorage.getItem(type) || '[]');
        arr.splice(idx, 1);
        localStorage.setItem(type, JSON.stringify(arr));
        loadHistory();
      });
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  sourceLangEl.addEventListener('change', () => {
    currentFrom = sourceLangEl.value;
  });

  targetLangEl.addEventListener('change', () => {
    currentTo = targetLangEl.value;
  });

  swapBtn.addEventListener('click', () => {
    if (sourceLangEl.value === 'auto') return;
    const temp = sourceLangEl.value;
    sourceLangEl.value = targetLangEl.value;
    targetLangEl.value = temp;
    currentFrom = sourceLangEl.value;
    currentTo = targetLangEl.value;
    if (currentTranslation) {
      inputText.value = currentTranslation.result;
      performTranslation();
    }
  });

  translateBtn.addEventListener('click', performTranslation);

  inputText.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      performTranslation();
    }
  });

  clearInputBtn.addEventListener('click', () => {
    inputText.value = '';
    showOutput(false);
    inputText.focus();
  });

  pasteBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      inputText.value = text;
      inputText.focus();
    } catch (err) {}
  });

  copyBtn.addEventListener('click', async () => {
    const text = translationOutput.textContent;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      copyBtn.classList.add('active');
      setTimeout(() => copyBtn.classList.remove('active'), 1500);
    } catch (err) {}
  });

  speakInputBtn.addEventListener('click', () => {
    const text = inputText.value.trim();
    if (!text) return;
    const lang = sourceLangEl.value === 'auto' ? 'en' : sourceLangEl.value;
    translator.speak(text, lang);
  });

  speakOutputBtn.addEventListener('click', () => {
    const text = translationOutput.textContent;
    if (!text) return;
    translator.speak(text, targetLangEl.value);
  });

  favoriteBtn.addEventListener('click', () => {
    if (!currentTranslation) return;
    const favorites = JSON.parse(localStorage.getItem('tn_favorites') || '[]');
    const exists = favorites.findIndex(f =>
      f.text === currentTranslation.text && f.to === currentTranslation.to
    );
    if (exists >= 0) {
      favorites.splice(exists, 1);
      favoriteBtn.classList.remove('active');
    } else {
      favorites.unshift(currentTranslation);
      if (favorites.length > 50) favorites.pop();
      localStorage.setItem('tn_favorites', JSON.stringify(favorites));
      favoriteBtn.classList.add('active');
    }
  });

  learningMode.addEventListener('change', () => {
    if (currentTranslation) {
      if (learningMode.checked) {
        romanization.textContent = `${LANGUAGES[currentTranslation.from]?.name || currentTranslation.from}: "${currentTranslation.text}"`;
        romanization.classList.remove('hidden');
      } else {
        romanization.classList.add('hidden');
      }
    }
  });

  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.mode-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.mode + 'Mode').classList.add('active');
    });
  });

  document.querySelectorAll('.history-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.history-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('recentList').classList.toggle('hidden', tab.dataset.tab !== 'recent');
      document.getElementById('favoritesList').classList.toggle('hidden', tab.dataset.tab !== 'favorites');
    });
  });

  clearHistoryBtn.addEventListener('click', () => {
    localStorage.removeItem('tn_history');
    localStorage.removeItem('tn_favorites');
    loadHistory();
  });

  document.getElementById('translateDocBtn').addEventListener('click', async () => {
    const text = document.getElementById('documentInput').value.trim();
    if (!text) return;
    showLoading(true);
    try {
      const from = sourceLangEl.value === 'auto' ? 'auto' : sourceLangEl.value;
      const to = targetLangEl.value;
      const result = await translator.translate(text, from, to);
      const output = document.getElementById('documentOutput');
      output.textContent = result;
      output.classList.remove('hidden');
    } catch (err) {
      document.getElementById('documentOutput').textContent = 'Translation failed.';
      document.getElementById('documentOutput').classList.remove('hidden');
    }
    showLoading(false);
  });

  chrome.storage?.local.get(['tn_settings'], (result) => {
    const settings = result.tn_settings || {};
    if (settings.autoTranslate) inputText.addEventListener('input', debounce(performTranslation, 500));
  });

  function debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  populateSelects();
  loadHistory();
});
