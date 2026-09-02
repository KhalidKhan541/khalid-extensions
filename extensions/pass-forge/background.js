let vaultLocked = true;
let lockAlarmName = 'passforge-autolock';
let defaultTimeoutMinutes = 5;

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'passforge-generate',
    title: 'Generate password here',
    contexts: ['editable']
  });

  chrome.contextMenus.create({
    id: 'passforge-save',
    title: 'Save credentials for this site',
    contexts: ['page']
  });

  chrome.storage.local.get(['autoLockTimeout'], (result) => {
    if (result.autoLockTimeout) {
      defaultTimeoutMinutes = result.autoLockTimeout;
    }
  });

  updateBadge('locked');
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'passforge-generate') {
    handleGenerateInField(info, tab);
  } else if (info.menuItemId === 'passforge-save') {
    handleSaveCredentials(info, tab);
  }
});

async function handleGenerateInField(info, tab) {
  try {
    const password = PassForgeGenerator.generatePassword({
      length: 16,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true
    });

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (pw) => {
        const el = document.activeElement;
        if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
          el.focus();
          el.value = pw;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      },
      args: [password]
    });

    chrome.notifications?.create({
      type: 'basic',
      title: 'PassForge',
      message: 'Password generated and inserted'
    });
  } catch (e) {
    console.error('Generate in field error:', e);
  }
}

async function handleSaveCredentials(info, tab) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const url = window.location.href;
        let username = '';
        let password = '';

        const inputs = document.querySelectorAll('input');
        for (const input of inputs) {
          const type = (input.type || '').toLowerCase();
          const name = (input.name || '').toLowerCase();
          const autocomplete = (input.autocomplete || '').toLowerCase();

          if (type === 'password') {
            password = input.value || '';
          } else if (
            type === 'text' || type === 'email' || type === 'tel'
          ) {
            if (
              name.includes('user') || name.includes('email') || name.includes('login') ||
              name.includes('account') || autocomplete.includes('username') ||
              autocomplete.includes('email')
            ) {
              username = input.value || '';
            }
          }
        }

        if (!username) {
          for (const input of inputs) {
            const type = (input.type || '').toLowerCase();
            if (type === 'text' || type === 'email') {
              if (input.value && input.value.includes('@')) {
                username = input.value;
                break;
              }
            }
          }
        }

        return { url, username, password };
      }
    });

    if (results && results[0] && results[0].result) {
      const data = results[0].result;
      chrome.tabs.sendMessage(tab.id, {
        action: 'openSaveDialog',
        data: data
      });
    }
  } catch (e) {
    console.error('Save credentials error:', e);
  }
}

function updateBadge(state) {
  if (state === 'locked') {
    chrome.action.setBadgeText({ text: 'L' });
    chrome.action.setBadgeBackgroundColor({ color: '#e74c3c' });
  } else {
    chrome.action.setBadgeText({ text: 'U' });
    chrome.action.setBadgeBackgroundColor({ color: '#2ecc71' });
  }
}

function startLockTimer() {
  chrome.alarms.clear(lockAlarmName, () => {
    chrome.alarms.create(lockAlarmName, {
      delayInMinutes: defaultTimeoutMinutes
    });
  });
}

function stopLockTimer() {
  chrome.alarms.clear(lockAlarmName);
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === lockAlarmName) {
    vaultLocked = true;
    updateBadge('locked');
    chrome.storage.session?.set({ vaultLocked: true });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'unlock') {
    vaultLocked = false;
    updateBadge('unlocked');
    startLockTimer();
    sendResponse({ success: true });
  } else if (message.action === 'lock') {
    vaultLocked = true;
    updateBadge('locked');
    stopLockTimer();
    sendResponse({ success: true });
  } else if (message.action === 'resetTimer') {
    if (!vaultLocked) {
      startLockTimer();
    }
    sendResponse({ success: true });
  } else if (message.action === 'getLockState') {
    sendResponse({ locked: vaultLocked });
  } else if (message.action === 'updateTimeout') {
    defaultTimeoutMinutes = message.timeout || 5;
    if (!vaultLocked) {
      startLockTimer();
    }
    sendResponse({ success: true });
  } else if (message.action === 'autofill') {
    handleAutofill(message, sender.tab);
    sendResponse({ success: true });
  }
  return true;
});

async function handleAutofill(message, tab) {
  if (!tab) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async (cred) => {
        function delay(ms) {
          return new Promise(resolve => setTimeout(resolve, ms));
        }

        async function typeIntoField(field, text) {
          field.focus();
          field.value = '';
          field.dispatchEvent(new Event('focus', { bubbles: true }));

          for (const char of text) {
            field.value += char;
            field.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
            field.dispatchEvent(new KeyboardEvent('keypress', { key: char, bubbles: true }));
            field.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
            field.dispatchEvent(new Event('input', { bubbles: true }));
            await delay(10 + Math.random() * 20);
          }

          field.dispatchEvent(new Event('change', { bubbles: true }));
        }

        const usernameField = document.querySelector(
          'input[type="text"][name*="user"], input[type="email"], input[type="text"][name*="login"], input[type="text"][name*="account"], input[autocomplete="username"], input[autocomplete="email"]'
        );
        const passwordField = document.querySelector(
          'input[type="password"]:not([value])'
        );

        if (usernameField && cred.username) {
          await typeIntoField(usernameField, cred.username);
        }
        if (passwordField && cred.password) {
          await typeIntoField(passwordField, cred.password);
        }
      },
      args: [{ username: message.username, password: message.password }]
    });
  } catch (e) {
    console.error('Autofill error:', e);
  }
}
