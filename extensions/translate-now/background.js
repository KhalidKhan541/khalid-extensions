const TRANSLATIONS_CACHE = new Map();
const CACHE_MAX = 500;

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'translate-selection',
    title: 'Translate "%s"',
    contexts: ['selection']
  });

  chrome.contextMenus.create({
    id: 'translate-page',
    title: 'Translate this page',
    contexts: ['page']
  });

  chrome.storage.local.get(['tn_settings'], (result) => {
    if (!result.tn_settings) {
      chrome.storage.local.set({
        tn_settings: {
          defaultTarget: 'en',
          autoTranslate: false,
          showBadge: true,
          learningMode: false
        }
      });
    }
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'translate-selection') {
    const selectedText = info.selectionText;
    if (selectedText) {
      translateAndShow(selectedText, tab);
    }
  } else if (info.menuItemId === 'translate-page') {
    chrome.tabs.sendMessage(tab.id, { action: 'translatePage' });
  }
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'quick-translate') {
    chrome.tabs.sendMessage(tab.id, { action: 'quickTranslate' });
  }
});

async function translateAndShow(text, tab) {
  try {
    const translation = await translateText(text, 'auto', 'en');
    TRANSLATIONS_CACHE.set(text, translation);

    chrome.tabs.sendMessage(tab.id, {
      action: 'showTranslation',
      data: { original: text, translated: translation, from: 'auto', to: 'en' }
    });

    chrome.storage.local.get(['tn_settings'], (result) => {
      if (result.tn_settings?.showBadge) {
        chrome.action.setBadgeText({ text: '✓', tabId: tab.id });
        chrome.action.setBadgeBackgroundColor({ color: '#10b981', tabId: tab.id });
        setTimeout(() => {
          chrome.action.setBadgeText({ text: '', tabId: tab.id });
        }, 2000);
      }
    });
  } catch (err) {
    console.error('Translation failed:', err);
  }
}

async function translateText(text, from = 'auto', to = 'en') {
  const cacheKey = `${from}:${to}:${text}`;
  if (TRANSLATIONS_CACHE.has(cacheKey)) {
    return TRANSLATIONS_CACHE.get(cacheKey);
  }

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.responseStatus === 200 && data.responseData) {
      const result = data.responseData.translatedText;
      TRANSLATIONS_CACHE.set(cacheKey, result);
      if (TRANSLATIONS_CACHE.size > CACHE_MAX) {
        const firstKey = TRANSLATIONS_CACHE.keys().next().value;
        TRANSLATIONS_CACHE.delete(firstKey);
      }
      return result;
    }
  } catch (e) {}

  return text;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'translate') {
    const { text, from, to } = request;
    translateText(text, from, to).then(result => {
      sendResponse({ result });
    });
    return true;
  }

  if (request.action === 'detectLanguage') {
    const text = request.text;
    detectLanguage(text).then(lang => {
      sendResponse({ language: lang });
    });
    return true;
  }

  if (request.action === 'tts') {
    chrome.tts.speak(request.text, {
      lang: request.lang || 'en',
      rate: 0.9
    });
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'saveTranslation') {
    chrome.storage.local.get(['tn_history'], (result) => {
      const history = result.tn_history || [];
      history.unshift(request.data);
      if (history.length > 100) history.pop();
      chrome.storage.local.set({ tn_history: history });
    });
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'getHistory') {
    chrome.storage.local.get(['tn_history'], (result) => {
      sendResponse({ history: result.tn_history || [] });
    });
    return true;
  }

  if (request.action === 'getSettings') {
    chrome.storage.local.get(['tn_settings'], (result) => {
      sendResponse({ settings: result.tn_settings || {} });
    });
    return true;
  }

  if (request.action === 'saveSettings') {
    chrome.storage.local.set({ tn_settings: request.settings });
    sendResponse({ success: true });
    return true;
  }
});

async function detectLanguage(text) {
  if (!text || text.trim().length < 3) return 'auto';

  const scriptPatterns = {
    cyrillic: /[\u0400-\u04FF]/,
    arabic: /[\u0600-\u06FF\u0750-\u077F]/,
    hebrew: /[\u0590-\u05FF]/,
    cjk: /[\u4E00-\u9FFF]/,
    hangul: /[\uAC00-\uD7AF]/,
    devanagari: /[\u0900-\u097F]/,
    thai: /[\u0E00-\u0E7F]/,
    greek: /[\u0370-\u03FF]/,
    georgian: /[\u10A0-\u10FF]/,
    armenian: /[\u0530-\u058F]/,
    ethiopic: /[\u1200-\u137F]/
  };

  for (const [script, pattern] of Object.entries(scriptPatterns)) {
    if (pattern.test(text)) {
      const scriptToLang = {
        cyrillic: 'ru', arabic: 'ar', hebrew: 'he', cjk: 'zh',
        hangul: 'ko', devanagari: 'hi', thai: 'th', greek: 'el',
        georgian: 'ka', armenian: 'hy', ethiopic: 'am'
      };
      return scriptToLang[script] || 'en';
    }
  }

  return 'en';
}
