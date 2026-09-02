(() => {
  if (window.passForgeInjected) return;
  window.passForgeInjected = true;

  let floatingButton = null;
  let lastDetectedForm = null;

  function detectLoginForm() {
    const passwordFields = document.querySelectorAll('input[type="password"]');
    const results = [];

    for (const pwdField of passwordFields) {
      if (pwdField.value && pwdField.value.length > 0) continue;

      const form = pwdField.closest('form');
      let usernameField = null;

      if (form) {
        const inputs = form.querySelectorAll('input');
        for (const input of inputs) {
          if (input === pwdField) continue;
          const type = (input.type || '').toLowerCase();
          const name = (input.name || '').toLowerCase();
          const autocomplete = (input.autocomplete || '').toLowerCase();

          if (type === 'password') continue;

          if (
            type === 'text' || type === 'email' || type === 'tel' ||
            name.includes('user') || name.includes('email') || name.includes('login') ||
            name.includes('account') || autocomplete.includes('username') ||
            autocomplete.includes('email')
          ) {
            usernameField = input;
            break;
          }
        }

        if (!usernameField) {
          for (const input of inputs) {
            if (input === pwdField) continue;
            const type = (input.type || '').toLowerCase();
            if (type === 'text' || type === 'email') {
              usernameField = input;
              break;
            }
          }
        }
      } else {
        const allInputs = document.querySelectorAll('input');
        const pwdIndex = Array.from(allInputs).indexOf(pwdField);

        for (let i = pwdIndex - 1; i >= 0; i--) {
          const input = allInputs[i];
          const type = (input.type || '').toLowerCase();
          if (type === 'text' || type === 'email' || type === 'tel') {
            usernameField = input;
            break;
          }
        }
      }

      results.push({
        passwordField: pwdField,
        usernameField: usernameField,
        form: form
      });
    }

    return results;
  }

  function createFloatingButton(x, y) {
    if (floatingButton) {
      floatingButton.remove();
    }

    floatingButton = document.createElement('div');
    floatingButton.id = 'passforge-float-btn';
    floatingButton.innerHTML = '&#128274;';
    floatingButton.title = 'PassForge Autofill';

    Object.assign(floatingButton.style, {
      position: 'fixed',
      left: x + 'px',
      top: y + 'px',
      width: '36px',
      height: '36px',
      background: 'linear-gradient(135deg, #e94560, #ff6b81)',
      color: 'white',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      zIndex: '2147483647',
      boxShadow: '0 2px 10px rgba(233, 69, 96, 0.5)',
      fontSize: '16px',
      fontFamily: 'system-ui, sans-serif',
      transition: 'transform 0.2s, box-shadow 0.2s',
      userSelect: 'none'
    });

    floatingButton.addEventListener('mouseenter', () => {
      floatingButton.style.transform = 'scale(1.15)';
      floatingButton.style.boxShadow = '0 4px 16px rgba(233, 69, 96, 0.7)';
    });

    floatingButton.addEventListener('mouseleave', () => {
      floatingButton.style.transform = 'scale(1)';
      floatingButton.style.boxShadow = '0 2px 10px rgba(233, 69, 96, 0.5)';
    });

    floatingButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      requestAutofill();
    });

    document.body.appendChild(floatingButton);
  }

  function removeFloatingButton() {
    if (floatingButton) {
      floatingButton.remove();
      floatingButton = null;
    }
  }

  function requestAutofill() {
    const domain = window.location.hostname;
    chrome.runtime.sendMessage({
      action: 'getCredentialsForDomain',
      domain: domain
    }, (response) => {
      if (chrome.runtime.lastError || !response || !response.credentials || response.credentials.length === 0) {
        showNotification('No saved credentials for this site');
        return;
      }

      if (response.credentials.length === 1) {
        const cred = response.credentials[0];
        chrome.runtime.sendMessage({
          action: 'autofill',
          username: cred.username,
          password: cred.password
        });
        showNotification('Autofilling credentials...');
      } else {
        showCredentialPicker(response.credentials);
      }
    });
  }

  function showCredentialPicker(credentials) {
    const existing = document.getElementById('passforge-picker');
    if (existing) existing.remove();

    const picker = document.createElement('div');
    picker.id = 'passforge-picker';

    let itemsHtml = credentials.map((cred, i) => `
      <div class="pf-picker-item" data-index="${i}">
        <div class="pf-picker-site">${escapeHtml(cred.site || cred.url || 'Unknown')}</div>
        <div class="pf-picker-user">${escapeHtml(cred.username)}</div>
      </div>
    `).join('');

    picker.innerHTML = `
      <div class="pf-picker-title">PassForge - Select Credential</div>
      ${itemsHtml}
      <div class="pf-picker-cancel">Cancel</div>
    `;

    Object.assign(picker.style, {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: '#1a1a2e',
      border: '1px solid #2a2a4a',
      borderRadius: '12px',
      padding: '16px',
      zIndex: '2147483647',
      minWidth: '280px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      fontFamily: 'system-ui, sans-serif',
      color: '#eaeaea'
    });

    const style = document.createElement('style');
    style.textContent = `
      .pf-picker-title {
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 12px;
        color: #e94560;
      }
      .pf-picker-item {
        padding: 10px 12px;
        border: 1px solid #2a2a4a;
        border-radius: 8px;
        margin-bottom: 8px;
        cursor: pointer;
        transition: border-color 0.2s, background 0.2s;
      }
      .pf-picker-item:hover {
        border-color: #e94560;
        background: rgba(233, 69, 96, 0.1);
      }
      .pf-picker-site {
        font-size: 13px;
        font-weight: 500;
      }
      .pf-picker-user {
        font-size: 12px;
        color: #a0a0b0;
        margin-top: 2px;
      }
      .pf-picker-cancel {
        text-align: center;
        padding: 8px;
        color: #a0a0b0;
        cursor: pointer;
        font-size: 13px;
        border-radius: 6px;
        transition: color 0.2s;
      }
      .pf-picker-cancel:hover {
        color: #eaeaea;
      }
    `;
    picker.appendChild(style);

    picker.querySelectorAll('.pf-picker-item').forEach((item) => {
      item.addEventListener('click', () => {
        const idx = parseInt(item.dataset.index);
        const cred = credentials[idx];
        chrome.runtime.sendMessage({
          action: 'autofill',
          username: cred.username,
          password: cred.password
        });
        showNotification('Autofilling credentials...');
        picker.remove();
      });
    });

    picker.querySelector('.pf-picker-cancel').addEventListener('click', () => {
      picker.remove();
    });

    document.body.appendChild(picker);
  }

  function showNotification(message) {
    const existing = document.getElementById('passforge-notification');
    if (existing) existing.remove();

    const notif = document.createElement('div');
    notif.id = 'passforge-notification';
    notif.textContent = message;

    Object.assign(notif.style, {
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: '#2ecc71',
      color: 'white',
      padding: '10px 24px',
      borderRadius: '8px',
      fontSize: '13px',
      fontFamily: 'system-ui, sans-serif',
      zIndex: '2147483647',
      boxShadow: '0 4px 12px rgba(46, 204, 113, 0.4)',
      animation: 'pf-fade-in-out 2.5s forwards'
    });

    const style = document.createElement('style');
    style.textContent = `
      @keyframes pf-fade-in-out {
        0% { opacity: 0; transform: translateX(-50%) translateY(10px); }
        15% { opacity: 1; transform: translateX(-50%) translateY(0); }
        85% { opacity: 1; transform: translateX(-50%) translateY(0); }
        100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(notif);

    setTimeout(() => {
      notif.remove();
      style.remove();
    }, 2600);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function checkForLoginForms() {
    const forms = detectLoginForm();
    if (forms.length > 0 && forms[0].passwordField) {
      const field = forms[0].passwordField;
      const rect = field.getBoundingClientRect();
      createFloatingButton(rect.right + 8, rect.top);
      lastDetectedForm = forms[0];
    } else {
      removeFloatingButton();
      lastDetectedForm = null;
    }
  }

  let debounceTimer = null;
  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(checkForLoginForms, 500);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'openSaveDialog') {
      showSaveDialog(message.data);
    } else if (message.action === 'autofillCredentials') {
      performAutofill(message.username, message.password);
    }
    sendResponse({ received: true });
  });

  function showSaveDialog(data) {
    const existing = document.getElementById('passforge-save-dialog');
    if (existing) existing.remove();

    const dialog = document.createElement('div');
    dialog.id = 'passforge-save-dialog';
    dialog.innerHTML = `
      <div class="pf-save-backdrop"></div>
      <div class="pf-save-modal">
        <div class="pf-save-title">Save to PassForge?</div>
        <div class="pf-save-field">
          <label>Site</label>
          <input type="text" id="pf-save-site" value="${escapeHtml(data.url || '')}">
        </div>
        <div class="pf-save-field">
          <label>Username</label>
          <input type="text" id="pf-save-user" value="${escapeHtml(data.username || '')}">
        </div>
        <div class="pf-save-field">
          <label>Password</label>
          <input type="password" id="pf-save-pass" value="${escapeHtml(data.password || '')}">
        </div>
        <div class="pf-save-actions">
          <button id="pf-save-cancel">Cancel</button>
          <button id="pf-save-confirm">Save</button>
        </div>
      </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
      #passforge-save-dialog { position: fixed; inset: 0; z-index: 2147483647; }
      .pf-save-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.6); }
      .pf-save-modal {
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: #1a1a2e; border: 1px solid #2a2a4a; border-radius: 12px;
        padding: 24px; width: 320px; font-family: system-ui, sans-serif; color: #eaeaea;
      }
      .pf-save-title { font-size: 16px; font-weight: 600; margin-bottom: 16px; color: #e94560; }
      .pf-save-field { margin-bottom: 12px; }
      .pf-save-field label { display: block; font-size: 12px; color: #a0a0b0; margin-bottom: 4px; }
      .pf-save-field input {
        width: 100%; padding: 8px 12px; background: #1a1a3e; border: 1px solid #2a2a4a;
        border-radius: 6px; color: #eaeaea; font-size: 13px; box-sizing: border-box;
      }
      .pf-save-field input:focus { outline: none; border-color: #e94560; }
      .pf-save-actions { display: flex; gap: 8px; margin-top: 16px; }
      .pf-save-actions button {
        flex: 1; padding: 8px; border: none; border-radius: 6px; cursor: pointer;
        font-size: 13px; font-weight: 500;
      }
      #pf-save-cancel { background: #2a2a4a; color: #eaeaea; }
      #pf-save-confirm { background: #e94560; color: white; }
    `;

    document.head.appendChild(style);
    document.body.appendChild(dialog);

    document.getElementById('pf-save-cancel').addEventListener('click', () => {
      dialog.remove();
      style.remove();
    });

    document.getElementById('pf-save-confirm').addEventListener('click', () => {
      const site = document.getElementById('pf-save-site').value;
      const username = document.getElementById('pf-save-user').value;
      const password = document.getElementById('pf-save-pass').value;

      chrome.runtime.sendMessage({
        action: 'saveNewCredential',
        site, username, password
      });

      dialog.remove();
      style.remove();
      showNotification('Credential saved to vault');
    });
  }

  function performAutofill(username, password) {
    const usernameField = document.querySelector(
      'input[type="text"][name*="user"], input[type="email"], input[autocomplete="username"], input[autocomplete="email"]'
    );
    const passwordField = document.querySelector('input[type="password"]');

    if (usernameField && username) {
      usernameField.focus();
      usernameField.value = username;
      usernameField.dispatchEvent(new Event('input', { bubbles: true }));
      usernameField.dispatchEvent(new Event('change', { bubbles: true }));
    }

    if (passwordField && password) {
      passwordField.focus();
      passwordField.value = password;
      passwordField.dispatchEvent(new Event('input', { bubbles: true }));
      passwordField.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkForLoginForms);
  } else {
    checkForLoginForms();
  }

  setInterval(checkForLoginForms, 3000);
})();
