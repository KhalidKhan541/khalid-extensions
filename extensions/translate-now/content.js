(() => {
  'use strict';

  let floatingBtn = null;
  let tooltip = null;
  let selectedText = '';
  let selectedRect = null;
  let autoTranslateEnabled = false;
  let hoverTimer = null;

  function init() {
    createFloatingButton();
    createTooltip();
    bindEvents();
    loadSettings();
  }

  function createFloatingButton() {
    floatingBtn = document.createElement('div');
    floatingBtn.id = 'tn-floating-btn';
    floatingBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M2 5h7M5 2v3"/><path d="M14 14l3-8 3 8M14.5 12h5"/>
      </svg>
    `;
    floatingBtn.title = 'Translate Now';
    document.body.appendChild(floatingBtn);
  }

  function createTooltip() {
    tooltip = document.createElement('div');
    tooltip.id = 'tn-tooltip';
    tooltip.innerHTML = `
      <div class="tn-tooltip-header">
        <span class="tn-lang-info"></span>
        <div class="tn-tooltip-actions">
          <button class="tn-btn tn-copy-btn" title="Copy">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </button>
          <button class="tn-btn tn-speak-btn" title="Listen">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
            </svg>
          </button>
          <button class="tn-btn tn-expand-btn" title="Expand">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
            </svg>
          </button>
          <button class="tn-btn tn-close-btn" title="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="tn-tooltip-content">
        <div class="tn-original-text"></div>
        <div class="tn-translated-text"></div>
      </div>
      <div class="tn-tooltip-footer">
        <button class="tn-btn tn-full-translate">Open in panel</button>
      </div>
    `;
    tooltip.classList.add('tn-hidden');
    document.body.appendChild(tooltip);
  }

  function bindEvents() {
    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        hideTooltip();
        hideFloatingBtn();
      }
    });

    floatingBtn.addEventListener('click', handleFloatingBtnClick);

    tooltip.querySelector('.tn-copy-btn').addEventListener('click', copyTranslation);
    tooltip.querySelector('.tn-speak-btn').addEventListener('click', speakTranslation);
    tooltip.querySelector('.tn-close-btn').addEventListener('click', hideTooltip);
    tooltip.querySelector('.tn-expand-btn').addEventListener('click', expandTooltip);
    tooltip.querySelector('.tn-full-translate').addEventListener('click', openFullPanel);

    chrome.runtime?.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'showTranslation') {
        showTranslationResult(request.data);
      }
      if (request.action === 'translatePage') {
        translatePage();
      }
      if (request.action === 'quickTranslate') {
        quickTranslate();
      }
    });
  }

  function handleTextSelection(e) {
    if (tooltip.contains(e.target) || floatingBtn.contains(e.target)) return;

    setTimeout(() => {
      const selection = window.getSelection();
      const text = selection.toString().trim();

      if (text.length > 0 && text.length < 5000) {
        selectedText = text;
        const range = selection.getRangeAt(0);
        selectedRect = range.getBoundingClientRect();
        showFloatingBtn();
      } else {
        if (!tooltip.classList.contains('tn-hidden')) return;
        hideFloatingBtn();
      }
    }, 10);
  }

  function handleOutsideClick(e) {
    if (!tooltip.contains(e.target) && !floatingBtn.contains(e.target)) {
      hideTooltip();
    }
  }

  function showFloatingBtn() {
    const x = selectedRect.left + window.scrollX + (selectedRect.width / 2) - 14;
    const y = selectedRect.top + window.scrollY - 36;
    floatingBtn.style.left = `${x}px`;
    floatingBtn.style.top = `${y}px`;
    floatingBtn.classList.remove('tn-hidden');
  }

  function hideFloatingBtn() {
    floatingBtn.classList.add('tn-hidden');
  }

  function showTooltip() {
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    let x = selectedRect.left + scrollX;
    let y = selectedRect.bottom + scrollY + 8;

    const tooltipWidth = 340;
    if (x + tooltipWidth > window.innerWidth + scrollX) {
      x = window.innerWidth + scrollX - tooltipWidth - 16;
    }
    if (x < scrollX) x = scrollX + 8;

    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
    tooltip.classList.remove('tn-hidden');
    tooltip.classList.add('tn-visible');
  }

  function hideTooltip() {
    tooltip.classList.add('tn-hidden');
    tooltip.classList.remove('tn-visible');
  }

  async function handleFloatingBtnClick() {
    if (!selectedText) return;

    const langManager = new LanguageManager();
    const detected = langManager.detectLanguage(selectedText);
    const targetLang = detected === 'en' ? 'es' : 'en';

    showTooltip();
    showLoading(true);

    try {
      chrome.runtime?.sendMessage(
        { action: 'translate', text: selectedText, from: 'auto', to: targetLang },
        (response) => {
          showLoading(false);
          if (response?.result) {
            showTranslationResult({
              original: selectedText,
              translated: response.result,
              from: detected,
              to: targetLang
            });
          }
        }
      );
    } catch (e) {
      showLoading(false);
    }
    hideFloatingBtn();
  }

  function showTranslationResult(data) {
    const { original, translated, from, to } = data;
    const langManager = new LanguageManager();

    const fromLang = langManager.getLanguage(from) || { name: from, native: from };
    const toLang = langManager.getLanguage(to) || { name: to, native: to };

    tooltip.querySelector('.tn-lang-info').textContent = `${fromLang.name} → ${toLang.name}`;
    tooltip.querySelector('.tn-original-text').textContent = original;
    tooltip.querySelector('.tn-translated-text').textContent = translated;

    if (langManager.isRTL(to)) {
      tooltip.querySelector('.tn-translated-text').classList.add('tn-rtl');
    } else {
      tooltip.querySelector('.tn-translated-text').classList.remove('tn-rtl');
    }

    showTooltip();
  }

  function showLoading(show) {
    const content = tooltip.querySelector('.tn-translated-text');
    if (show) {
      content.textContent = 'Translating...';
      content.classList.add('tn-loading');
    } else {
      content.classList.remove('tn-loading');
    }
  }

  async function copyTranslation() {
    const text = tooltip.querySelector('.tn-translated-text').textContent;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      const btn = tooltip.querySelector('.tn-copy-btn');
      btn.classList.add('tn-copied');
      setTimeout(() => btn.classList.remove('tn-copied'), 1500);
    } catch (e) {}
  }

  function speakTranslation() {
    const text = tooltip.querySelector('.tn-translated-text').textContent;
    if (!text) return;
    const langInfo = tooltip.querySelector('.tn-lang-info').textContent;
    const lang = langInfo.split('→')[1]?.trim().toLowerCase() || 'en';
    chrome.runtime?.sendMessage({ action: 'tts', text, lang });
  }

  function expandTooltip() {
    tooltip.classList.toggle('tn-expanded');
  }

  function openFullPanel() {
    const original = tooltip.querySelector('.tn-original-text').textContent;
    const translated = tooltip.querySelector('.tn-translated-text').textContent;
    chrome.runtime?.sendMessage({
      action: 'openPopup',
      data: { original, translated }
    });
    hideTooltip();
  }

  function loadSettings() {
    chrome.storage?.local.get(['tn_settings'], (result) => {
      const settings = result.tn_settings || {};
      autoTranslateEnabled = settings.autoTranslate || false;
    });
  }

  async function translatePage() {
    const textNodes = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (!parent || parent.isContentEditable) return NodeFilter.FILTER_REJECT;
          const tag = parent.tagName.toLowerCase();
          if (['script', 'style', 'noscript', 'iframe'].includes(tag)) return NodeFilter.FILTER_REJECT;
          if (node.textContent.trim().length < 2) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }

    const container = document.createElement('div');
    container.id = 'tn-page-translator';
    container.innerHTML = `
      <div class="tn-page-header">
        <span>Page Translation</span>
        <button class="tn-btn tn-close-page">Close</button>
      </div>
      <div class="tn-page-content">
        <div class="tn-original-column"></div>
        <div class="tn-translated-column"></div>
      </div>
    `;
    document.body.appendChild(container);

    const originalCol = container.querySelector('.tn-original-column');
    const translatedCol = container.querySelector('.tn-translated-column');

    for (const textNode of textNodes.slice(0, 100)) {
      const text = textNode.textContent.trim();
      if (text.length > 0) {
        const div = document.createElement('div');
        div.className = 'tn-text-pair';
        div.textContent = text;
        originalCol.appendChild(div);
      }
    }

    container.querySelector('.tn-close-page').addEventListener('click', () => {
      container.remove();
    });
  }

  async function quickTranslate() {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    if (text) {
      selectedText = text;
      const range = selection.getRangeAt(0);
      selectedRect = range.getBoundingClientRect();
      await handleFloatingBtnClick();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
