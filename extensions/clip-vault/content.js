(() => {
  if (window.__clipVaultLoaded) return;
  window.__clipVaultLoaded = true;

  const CONFIG = {
    interceptCtrlC: true,
    interceptRightClick: true,
    passwordSelectors: 'input[type="password"], input[name*="pass"], input[name*="pwd"], input[id*="pass"], input[id*="pwd"]'
  };

  let settings = {
    interceptCopy: true,
    interceptRightClick: true,
    excludedSites: []
  };

  async function loadSettings() {
    try {
      const result = await chrome.storage.sync.get('settings');
      if (result.settings) {
        settings = { ...settings, ...result.settings };
      }
    } catch (e) {}
  }

  function isExcluded() {
    const host = window.location.hostname;
    return settings.excludedSites.some(site => host.includes(site));
  }

  function isPasswordField() {
    const el = document.activeElement;
    if (!el) return false;
    if (el.matches(CONFIG.passwordSelectors)) return true;
    if (el.type === 'password') return true;
    if (el.getAttribute('autocomplete') === 'current-password' || el.getAttribute('autocomplete') === 'new-password') return true;
    return false;
  }

  function getSelectedText() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return null;
    const text = selection.toString();
    if (!text || !text.trim()) return null;
    return text;
  }

  function getSource() {
    try {
      return window.location.href;
    } catch {
      return '';
    }
  }

  function sendClip(text, source) {
    if (!text || !text.trim()) return;
    try {
      chrome.runtime.sendMessage({
        action: 'clipCaptured',
        text: text,
        source: source || getSource()
      });
    } catch (e) {}
  }

  document.addEventListener('copy', (e) => {
    if (!settings.interceptCopy || isExcluded()) return;
    if (isPasswordField()) return;

    setTimeout(() => {
      const text = getSelectedText();
      if (text) {
        sendClip(text);
      }
    }, 10);
  }, true);

  document.addEventListener('keydown', (e) => {
    if (!settings.interceptCopy || isExcluded()) return;
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const ctrlKey = isMac ? e.metaKey : e.ctrlKey;

    if (ctrlKey && e.key === 'c' && !e.shiftKey) {
      if (isPasswordField()) return;

      const text = getSelectedText();
      if (text) {
        setTimeout(() => sendClip(text), 10);
      }
    }
  }, true);

  if (CONFIG.interceptRightClick) {
    document.addEventListener('contextmenu', (e) => {
      if (!settings.interceptRightClick || isExcluded()) return;
      if (isPasswordField()) return;

      const text = getSelectedText();
      if (text) {
        const handler = () => {
          sendClip(text);
          document.removeEventListener('mouseup', handler);
        };
        document.addEventListener('mouseup', handler, { once: true, timeout: 500 });
      }
    }, true);
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'updateSettings') {
      settings = { ...settings, ...msg.settings };
      sendResponse({ ok: true });
    } else if (msg.action === 'getSelectedText') {
      const text = getSelectedText();
      sendResponse({ text: text || '' });
    }
    return true;
  });

  loadSettings();
})();