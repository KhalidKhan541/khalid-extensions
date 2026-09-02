(() => {
  let isUnlocked = false;
  let isFirstTime = false;
  let masterKey = null;
  let credentials = [];

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // Initialization
  async function init() {
    const stored = await chrome.storage.local.get(['masterHash', 'masterSalt', 'vault', 'settings']);

    if (!stored.masterHash) {
      isFirstTime = true;
      $('#firstTimeSetup').classList.remove('hidden');
      $('#setupBtn').classList.remove('hidden');
      $('#unlockBtn').classList.add('hidden');
    }

    await loadSettings(stored.settings || {});
    setupEventListeners();
  }

  function setupEventListeners() {
    // Lock screen
    $('#unlockBtn').addEventListener('click', handleUnlock);
    $('#setupBtn').addEventListener('click', handleSetup);
    $('#masterPasswordInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (isFirstTime) {
          handleSetup();
        } else {
          handleUnlock();
        }
      }
    });
    $('#confirmMasterPassword').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSetup();
    });
    $('#toggleMasterVisibility').addEventListener('click', () => {
      const input = $('#masterPasswordInput');
      input.type = input.type === 'password' ? 'text' : 'password';
    });

    // Tabs
    $$('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Generator
    $('#passwordLength').addEventListener('input', (e) => {
      $('#lengthValue').textContent = e.target.value;
    });
    $('#passwordCount').addEventListener('input', (e) => {
      $('#countValue').textContent = e.target.value;
    });
    $('#wordCount').addEventListener('input', (e) => {
      $('#wordCountValue').textContent = e.target.value;
    });
    $('#modePassword').addEventListener('click', () => switchGeneratorMode('password'));
    $('#modePassphrase').addEventListener('click', () => switchGeneratorMode('passphrase'));
    $('#generateBtn').addEventListener('click', handleGenerate);

    // Vault
    $('#addCredentialBtn').addEventListener('click', () => openCredentialModal());
    $('#vaultSearch').addEventListener('input', (e) => filterVault(e.target.value));
    $('#saveCredBtn').addEventListener('click', handleSaveCredential);
    $('#cancelCredBtn').addEventListener('click', closeCredentialModal);
    $('#toggleCredPassword').addEventListener('click', () => {
      const input = $('#credPassword');
      input.type = input.type === 'password' ? 'text' : 'password';
    });
    $('#generateForCred').addEventListener('click', () => {
      const pw = PassForgeGenerator.generatePassword({
        length: 16, uppercase: true, lowercase: true, numbers: true, symbols: true
      });
      $('#credPassword').value = pw;
      $('#credPassword').type = 'text';
    });

    // Settings
    $('#changeMasterBtn').addEventListener('click', () => {
      $('#changeMasterModal').classList.remove('hidden');
    });
    $('#cancelChangeMasterBtn').addEventListener('click', () => {
      $('#changeMasterModal').classList.add('hidden');
    });
    $('#confirmChangeMasterBtn').addEventListener('click', handleChangeMaster);
    $('#saveDefaultsBtn').addEventListener('click', handleSaveDefaults);
    $('#exportVaultBtn').addEventListener('click', handleExport);
    $('#importVaultBtn').addEventListener('click', () => $('#importFileInput').click());
    $('#importFileInput').addEventListener('change', handleImport);

    // Lock
    $('#lockBtn').addEventListener('click', handleLock);

    // Auto-lock timer reset on activity
    document.addEventListener('click', () => {
      if (isUnlocked) {
        chrome.runtime.sendMessage({ action: 'resetTimer' });
      }
    });
  }

  // Lock screen handlers
  async function handleUnlock() {
    const password = $('#masterPasswordInput').value;
    if (!password) {
      $('#lockError').textContent = 'Please enter your master password';
      return;
    }

    try {
      const stored = await chrome.storage.local.get(['masterHash', 'masterSalt']);
      const valid = await PassForgeCrypto.verifyPassword(password, stored.masterHash, stored.masterSalt);

      if (valid) {
        masterKey = password;
        isUnlocked = true;
        showMainApp();
        await loadVault();
        chrome.runtime.sendMessage({ action: 'unlock' });
        $('#masterPasswordInput').value = '';
      } else {
        $('#lockError').textContent = 'Incorrect master password';
      }
    } catch (e) {
      $('#lockError').textContent = 'Error unlocking vault';
      console.error(e);
    }
  }

  async function handleSetup() {
    const password = $('#masterPasswordInput').value;
    const confirm = $('#confirmMasterPassword').value;

    if (!password || password.length < 8) {
      $('#lockError').textContent = 'Password must be at least 8 characters';
      return;
    }

    if (password !== confirm) {
      $('#lockError').textContent = 'Passwords do not match';
      return;
    }

    try {
      const { hash, salt } = await PassForgeCrypto.hashPassword(password);
      await chrome.storage.local.set({
        masterHash: hash,
        masterSalt: salt,
        vault: await PassForgeCrypto.encrypt('[]', password),
        settings: getDefaultSettings()
      });

      masterKey = password;
      isUnlocked = true;
      isFirstTime = false;
      showMainApp();
      await loadVault();
      chrome.runtime.sendMessage({ action: 'unlock' });
      $('#masterPasswordInput').value = '';
      $('#confirmMasterPassword').value = '';
    } catch (e) {
      $('#lockError').textContent = 'Error setting up vault';
      console.error(e);
    }
  }

  function showMainApp() {
    $('#lockScreen').classList.remove('active');
    $('#mainApp').classList.add('active');
    $('#lockStatus').innerHTML = '&#128275; Unlocked';
  }

  async function handleLock() {
    isUnlocked = false;
    masterKey = null;
    credentials = [];
    $('#mainApp').classList.remove('active');
    $('#lockScreen').classList.add('active');
    $('#lockError').textContent = '';
    $('#masterPasswordInput').value = '';
    chrome.runtime.sendMessage({ action: 'lock' });
  }

  // Tab switching
  function switchTab(tabName) {
    $$('.tab-btn').forEach(b => b.classList.remove('active'));
    $$('.tab-content').forEach(c => c.classList.remove('active'));
    $(`.tab-btn[data-tab="${tabName}"]`).classList.add('active');
    $(`#${tabName}Tab`).classList.add('active');
  }

  // Generator
  function switchGeneratorMode(mode) {
    if (mode === 'password') {
      $('#modePassword').classList.add('active');
      $('#modePassphrase').classList.remove('active');
      $('#passwordMode').classList.remove('hidden');
      $('#passphraseMode').classList.add('hidden');
    } else {
      $('#modePassword').classList.remove('active');
      $('#modePassphrase').classList.add('active');
      $('#passwordMode').classList.add('hidden');
      $('#passphraseMode').classList.remove('hidden');
    }
  }

  function handleGenerate() {
    const isPassphrase = $('#modePassphrase').classList.contains('active');
    const count = parseInt($('#passwordCount').value);
    const results = [];

    for (let i = 0; i < count; i++) {
      let password;
      if (isPassphrase) {
        password = PassForgeGenerator.generatePassphrase({
          wordCount: parseInt($('#wordCount').value),
          separator: $('#separator').value,
          capitalize: $('#capitalizeWords').checked
        });
      } else {
        password = PassForgeGenerator.generatePassword({
          length: parseInt($('#passwordLength').value),
          uppercase: $('#includeUppercase').checked,
          lowercase: $('#includeLowercase').checked,
          numbers: $('#includeNumbers').checked,
          symbols: $('#includeSymbols').checked,
          excludeAmbiguous: $('#excludeAmbiguous').checked
        });
      }
      results.push(password);
    }

    displayGeneratedPasswords(results);
  }

  function displayGeneratedPasswords(passwords) {
    const container = $('#passwordList');
    container.innerHTML = '';

    passwords.forEach(pw => {
      const strength = PassForgeGenerator.calculateStrength(pw);
      const item = document.createElement('div');
      item.className = 'password-item';
      item.innerHTML = `
        <div style="flex:1">
          <div class="password-text">${escapeHtml(pw)}</div>
          <div class="strength-bar">
            <div class="strength-fill" style="width:${strength.percentage}%;background:${strength.color}"></div>
          </div>
          <div class="strength-label" style="color:${strength.color}">${strength.label} (${strength.entropy} bits)</div>
        </div>
        <div class="password-actions">
          <button class="btn-icon copy-btn" title="Copy">&#128203;</button>
        </div>
      `;

      item.querySelector('.copy-btn').addEventListener('click', () => {
        copyToClipboard(pw);
        showToast('Password copied');
      });

      container.appendChild(item);
    });

    $('#generatedResults').classList.remove('hidden');
  }

  // Vault
  async function loadVault() {
    try {
      const stored = await chrome.storage.local.get(['vault']);
      if (stored.vault) {
        const decrypted = await PassForgeCrypto.decrypt(stored.vault, masterKey);
        credentials = JSON.parse(decrypted);
      } else {
        credentials = [];
      }
      renderVault(credentials);
    } catch (e) {
      console.error('Error loading vault:', e);
      credentials = [];
      renderVault([]);
    }
  }

  function renderVault(creds) {
    const container = $('#credentialList');

    if (!creds || creds.length === 0) {
      container.innerHTML = '<p class="empty-state">No credentials saved yet.</p>';
      return;
    }

    container.innerHTML = '';
    creds.forEach((cred, index) => {
      const item = document.createElement('div');
      item.className = 'credential-item';
      item.innerHTML = `
        <div class="credential-site">${escapeHtml(cred.site || 'Unknown')}</div>
        <div class="credential-username">${escapeHtml(cred.username)}</div>
        <div class="credential-actions">
          <button class="btn-small copy-user" title="Copy username">User</button>
          <button class="btn-small copy-pass" title="Copy password">Pass</button>
          <button class="btn-small autofill-btn" title="Autofill">Fill</button>
          <button class="btn-small edit-btn" title="Edit">Edit</button>
          <button class="btn-small" style="background:#e74c3c" title="Delete">Del</button>
        </div>
      `;

      item.querySelector('.copy-user').addEventListener('click', (e) => {
        e.stopPropagation();
        copyToClipboard(cred.username);
        showToast('Username copied');
      });

      item.querySelector('.copy-pass').addEventListener('click', (e) => {
        e.stopPropagation();
        copyToClipboard(cred.password);
        showToast('Password copied');
      });

      item.querySelector('.autofill-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        performAutofill(cred);
      });

      item.querySelector('.edit-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        openCredentialModal(cred, index);
      });

      item.querySelector('[title="Delete"]').addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm('Delete this credential?')) {
          credentials.splice(index, 1);
          await saveVault();
          renderVault(credentials);
          showToast('Credential deleted');
        }
      });

      container.appendChild(item);
    });
  }

  function filterVault(query) {
    if (!query) {
      renderVault(credentials);
      return;
    }

    const q = query.toLowerCase();
    const filtered = credentials.filter(c =>
      (c.site || '').toLowerCase().includes(q) ||
      (c.username || '').toLowerCase().includes(q) ||
      (c.notes || '').toLowerCase().includes(q)
    );
    renderVault(filtered);
  }

  async function saveVault() {
    try {
      const encrypted = await PassForgeCrypto.encrypt(JSON.stringify(credentials), masterKey);
      await chrome.storage.local.set({ vault: encrypted });
    } catch (e) {
      console.error('Error saving vault:', e);
      showToast('Error saving vault');
    }
  }

  function openCredentialModal(cred = null, index = -1) {
    $('#modalTitle').textContent = cred ? 'Edit Credential' : 'Add Credential';
    $('#credentialId').value = index >= 0 ? index : '';
    $('#credSite').value = cred ? cred.site || '' : window.location?.hostname || '';
    $('#credUsername').value = cred ? cred.username || '' : '';
    $('#credPassword').value = cred ? cred.password || '' : '';
    $('#credPassword').type = 'password';
    $('#credNotes').value = cred ? cred.notes || '' : '';
    $('#credentialModal').classList.remove('hidden');
  }

  function closeCredentialModal() {
    $('#credentialModal').classList.add('hidden');
    $('#credSite').value = '';
    $('#credUsername').value = '';
    $('#credPassword').value = '';
    $('#credNotes').value = '';
    $('#credentialId').value = '';
  }

  async function handleSaveCredential() {
    const site = $('#credSite').value.trim();
    const username = $('#credUsername').value.trim();
    const password = $('#credPassword').value;
    const notes = $('#credNotes').value.trim();
    const editId = $('#credentialId').value;

    if (!site || !username || !password) {
      showToast('Please fill in site, username, and password');
      return;
    }

    const cred = { site, username, password, notes, updatedAt: Date.now() };

    if (editId !== '') {
      credentials[parseInt(editId)] = { ...credentials[parseInt(editId)], ...cred };
    } else {
      cred.createdAt = Date.now();
      credentials.push(cred);
    }

    await saveVault();
    renderVault(credentials);
    closeCredentialModal();
    showToast(editId ? 'Credential updated' : 'Credential saved');
  }

  function performAutofill(cred) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'autofillCredentials',
          username: cred.username,
          password: cred.password
        });
        showToast('Autofilling...');
      }
    });
  }

  // Settings
  async function loadSettings(settings) {
    $('#autoLockTimeout').value = settings.autoLockTimeout || 5;
    $('#defaultLength').value = settings.defaultLength || 16;
    $('#defaultUppercase').checked = settings.defaultUppercase !== false;
    $('#defaultLowercase').checked = settings.defaultLowercase !== false;
    $('#defaultNumbers').checked = settings.defaultNumbers !== false;
    $('#defaultSymbols').checked = settings.defaultSymbols !== false;

    if (settings.defaultLength) {
      $('#passwordLength').value = settings.defaultLength;
      $('#lengthValue').textContent = settings.defaultLength;
    }
  }

  function getDefaultSettings() {
    return {
      autoLockTimeout: 5,
      defaultLength: 16,
      defaultUppercase: true,
      defaultLowercase: true,
      defaultNumbers: true,
      defaultSymbols: true
    };
  }

  async function handleSaveDefaults() {
    const settings = {
      autoLockTimeout: parseInt($('#autoLockTimeout').value) || 5,
      defaultLength: parseInt($('#defaultLength').value) || 16,
      defaultUppercase: $('#defaultUppercase').checked,
      defaultLowercase: $('#defaultLowercase').checked,
      defaultNumbers: $('#defaultNumbers').checked,
      defaultSymbols: $('#defaultSymbols').checked
    };

    await chrome.storage.local.set({ settings });
    chrome.runtime.sendMessage({ action: 'updateTimeout', timeout: settings.autoLockTimeout });

    $('#passwordLength').value = settings.defaultLength;
    $('#lengthValue').textContent = settings.defaultLength;
    $('#includeUppercase').checked = settings.defaultUppercase;
    $('#includeLowercase').checked = settings.defaultLowercase;
    $('#includeNumbers').checked = settings.defaultNumbers;
    $('#includeSymbols').checked = settings.defaultSymbols;

    showToast('Settings saved');
  }

  async function handleChangeMaster() {
    const current = $('#currentMasterInput').value;
    const newPass = $('#newMasterInput').value;
    const confirm = $('#confirmNewMasterInput').value;
    const errorEl = $('#changeMasterError');

    if (!current || !newPass) {
      errorEl.textContent = 'Please fill in all fields';
      return;
    }

    if (newPass.length < 8) {
      errorEl.textContent = 'New password must be at least 8 characters';
      return;
    }

    if (newPass !== confirm) {
      errorEl.textContent = 'New passwords do not match';
      return;
    }

    try {
      const stored = await chrome.storage.local.get(['masterHash', 'masterSalt', 'vault']);
      const valid = await PassForgeCrypto.verifyPassword(current, stored.masterHash, stored.masterSalt);

      if (!valid) {
        errorEl.textContent = 'Current password is incorrect';
        return;
      }

      const decrypted = await PassForgeCrypto.decrypt(stored.vault, current);
      const newEncrypted = await PassForgeCrypto.encrypt(decrypted, newPass);
      const { hash, salt } = await PassForgeCrypto.hashPassword(newPass);

      await chrome.storage.local.set({
        masterHash: hash,
        masterSalt: salt,
        vault: newEncrypted
      });

      masterKey = newPass;
      $('#changeMasterModal').classList.add('hidden');
      $('#currentMasterInput').value = '';
      $('#newMasterInput').value = '';
      $('#confirmNewMasterInput').value = '';
      errorEl.textContent = '';
      showToast('Master password changed');
    } catch (e) {
      errorEl.textContent = 'Error changing password';
      console.error(e);
    }
  }

  async function handleExport() {
    if (!masterKey) return;

    try {
      const stored = await chrome.storage.local.get(['vault']);
      const exportData = {
        version: 1,
        format: 'passforge-encrypted',
        exportedAt: new Date().toISOString(),
        vault: stored.vault
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `passforge-vault-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Vault exported (encrypted)');
    } catch (e) {
      console.error('Export error:', e);
      showToast('Error exporting vault');
    }
  }

  async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (data.format !== 'passforge-encrypted' || !data.vault) {
        showToast('Invalid import file');
        return;
      }

      const importedKey = prompt('Enter the master password for this vault:');
      if (!importedKey) return;

      const decrypted = await PassForgeCrypto.decrypt(data.vault, importedKey);

      if (confirm('This will replace your current vault. Continue?')) {
        await chrome.storage.local.set({ vault: data.vault });
        await loadVault();
        showToast('Vault imported successfully');
      }
    } catch (e) {
      console.error('Import error:', e);
      showToast('Error importing vault - wrong password or corrupted file');
    }

    e.target.value = '';
  }

  // Utilities
  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(() => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    });
  }

  function showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 2100);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  init();
})();
