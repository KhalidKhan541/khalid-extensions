document.addEventListener('DOMContentLoaded', async () => {
  await profileManager.init();

  const elements = {
    searchInput: document.getElementById('searchInput'),
    tabs: document.querySelectorAll('.tab'),
    profilesTab: document.getElementById('profilesTab'),
    recentTab: document.getElementById('recentTab'),
    templatesTab: document.getElementById('templatesTab'),
    profilesList: document.getElementById('profilesList'),
    recentList: document.getElementById('recentList'),
    templatesList: document.getElementById('templatesList'),
    defaultProfileSelect: document.getElementById('defaultProfileSelect'),
    btnNewProfile: document.getElementById('btnNewProfile'),
    btnImport: document.getElementById('btnImport'),
    btnExport: document.getElementById('btnExport'),
    btnSettings: document.getElementById('btnSettings'),
    fileImport: document.getElementById('fileImport'),
    profileEditor: document.getElementById('profileEditor'),
    editorTitle: document.getElementById('editorTitle'),
    btnCloseEditor: document.getElementById('btnCloseEditor'),
    btnCancelEditor: document.getElementById('btnCancelEditor'),
    btnSaveProfile: document.getElementById('btnSaveProfile'),
    btnAddCustomField: document.getElementById('btnAddCustomField'),
    customFieldsList: document.getElementById('customFieldsList'),
    settingsModal: document.getElementById('settingsModal'),
    btnCloseSettings: document.getElementById('btnCloseSettings'),
    btnSaveSettings: document.getElementById('btnSaveSettings'),
    toast: document.getElementById('toast')
  };

  let editingProfileId = null;

  function showToast(message, type = 'success') {
    elements.toast.textContent = message;
    elements.toast.className = `toast ${type}`;
    setTimeout(() => {
      elements.toast.className = 'toast hidden';
    }, 2000);
  }

  function renderProfiles(query = '') {
    const profiles = query ? profileManager.searchProfiles(query) : profileManager.getAllProfiles();
    const defaultId = profileManager.defaultProfileId;

    if (profiles.length === 0) {
      elements.profilesList.innerHTML = `
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
          <p>${query ? 'No matching profiles' : 'No profiles yet'}</p>
          <span>${query ? 'Try a different search' : 'Create your first profile to get started'}</span>
        </div>
      `;
      return;
    }

    elements.profilesList.innerHTML = profiles.map(p => `
      <div class="profile-card ${p.id === defaultId ? 'default' : ''}" data-id="${p.id}">
        <div class="profile-color" style="background:${p.color}"></div>
        <div class="profile-info">
          <div class="profile-name">${escapeHtml(p.name)}</div>
          <div class="profile-details">${escapeHtml(p.fields.email || p.fields.company || 'No details')}</div>
        </div>
        <div class="profile-actions-btns">
          <button class="btn-fill" data-id="${p.id}" title="Fill form">Fill</button>
          <button class="btn-edit" data-id="${p.id}" title="Edit">Edit</button>
          <button class="btn-delete" data-id="${p.id}" title="Delete">Del</button>
        </div>
      </div>
    `).join('');

    elements.profilesList.querySelectorAll('.btn-fill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        fillWithProfile(btn.dataset.id);
      });
    });

    elements.profilesList.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditor(btn.dataset.id);
      });
    });

    elements.profilesList.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Delete this profile?')) {
          profileManager.deleteProfile(btn.dataset.id);
          renderProfiles(elements.searchInput.value);
          renderDefaultSelect();
          showToast('Profile deleted');
        }
      });
    });
  }

  function renderRecent() {
    const recent = profileManager.getRecentFills();

    if (recent.length === 0) {
      elements.recentList.innerHTML = `
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p>No recent fills</p>
          <span>Forms you fill will appear here</span>
        </div>
      `;
      return;
    }

    elements.recentList.innerHTML = recent.map(r => `
      <div class="profile-card" data-id="${r.profileId}">
        <div class="profile-color" style="background:${r.profile.color}"></div>
        <div class="profile-info">
          <div class="profile-name">${escapeHtml(r.profile.name)}</div>
          <div class="profile-details">${timeAgo(r.timestamp)} - ${new URL(r.url).hostname}</div>
        </div>
        <div class="profile-actions-btns">
          <button class="btn-fill" data-id="${r.profileId}" title="Fill form">Fill</button>
        </div>
      </div>
    `).join('');

    elements.recentList.querySelectorAll('.btn-fill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        fillWithProfile(btn.dataset.id);
      });
    });
  }

  function renderTemplates() {
    const templates = profileManager.getTemplates();

    elements.templatesList.innerHTML = templates.map(t => `
      <div class="template-card" data-template="${t.id}">
        <h3>${escapeHtml(t.name)}</h3>
        <p>${escapeHtml(t.description)}</p>
      </div>
    `).join('');

    elements.templatesList.querySelectorAll('.template-card').forEach(card => {
      card.addEventListener('click', () => {
        const template = templates.find(t => t.id === card.dataset.template);
        if (template) {
          openEditor(null, template);
        }
      });
    });
  }

  function renderDefaultSelect() {
    const profiles = profileManager.getAllProfiles();
    const defaultId = profileManager.defaultProfileId;

    elements.defaultProfileSelect.innerHTML = '<option value="">Set Default</option>' +
      profiles.map(p => `<option value="${p.id}" ${p.id === defaultId ? 'selected' : ''}>${escapeHtml(p.name)}</option>`);
  }

  function openEditor(profileId = null, template = null) {
    editingProfileId = profileId;
    const profile = profileId ? profileManager.getProfile(profileId) : null;

    elements.editorTitle.textContent = profile ? 'Edit Profile' : 'New Profile';

    document.getElementById('profileName').value = profile ? profile.name : (template ? template.name : '');
    document.getElementById('firstName').value = profile ? profile.fields.firstName : (template ? template.fields.firstName || '' : '');
    document.getElementById('lastName').value = profile ? profile.fields.lastName : (template ? template.fields.lastName || '' : '');
    document.getElementById('email').value = profile ? profile.fields.email : (template ? template.fields.email || '' : '');
    document.getElementById('phone').value = profile ? profile.fields.phone : (template ? template.fields.phone || '' : '');
    document.getElementById('address').value = profile ? profile.fields.address : (template ? template.fields.address || '' : '');
    document.getElementById('city').value = profile ? profile.fields.city : (template ? template.fields.city || '' : '');
    document.getElementById('state').value = profile ? profile.fields.state : (template ? template.fields.state || '' : '');
    document.getElementById('zip').value = profile ? profile.fields.zip : (template ? template.fields.zip || '' : '');
    document.getElementById('country').value = profile ? profile.fields.country : (template ? template.fields.country || '' : '');
    document.getElementById('company').value = profile ? profile.fields.company : (template ? template.fields.company || '' : '');
    document.getElementById('jobTitle').value = profile ? profile.fields.jobTitle : (template ? template.fields.jobTitle || '' : '');
    document.getElementById('website').value = profile ? profile.fields.website : (template ? template.fields.website || '' : '');
    document.getElementById('notes').value = profile ? profile.fields.notes : (template ? template.fields.notes || '' : '');

    const color = profile ? profile.color : '#4285f4';
    document.querySelectorAll('.color-option').forEach(opt => {
      opt.classList.toggle('selected', opt.dataset.color === color);
    });

    const customFields = profile ? profile.customFields : (template ? [] : []);
    renderCustomFields(customFields);

    elements.profileEditor.classList.remove('hidden');
  }

  function renderCustomFields(fields) {
    elements.customFieldsList.innerHTML = fields.map((f, i) => `
      <div class="custom-field-row" data-index="${i}">
        <input type="text" placeholder="Key" value="${escapeAttr(f.key || '')}" class="cf-key">
        <input type="text" placeholder="Value" value="${escapeAttr(f.value || '')}" class="cf-value">
        <button class="btn-remove" data-index="${i}">&times;</button>
      </div>
    `).join('');

    elements.customFieldsList.querySelectorAll('.btn-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const rows = elements.customFieldsList.querySelectorAll('.custom-field-row');
        rows[btn.dataset.index].remove();
        reindexCustomFields();
      });
    });
  }

  function reindexCustomFields() {
    elements.customFieldsList.querySelectorAll('.custom-field-row').forEach((row, i) => {
      row.dataset.index = i;
      row.querySelector('.btn-remove').dataset.index = i;
    });
  }

  function getCustomFieldsFromForm() {
    const fields = [];
    elements.customFieldsList.querySelectorAll('.custom-field-row').forEach(row => {
      const key = row.querySelector('.cf-key').value.trim();
      const value = row.querySelector('.cf-value').value.trim();
      if (key) {
        fields.push({ key, value });
      }
    });
    return fields;
  }

  function saveProfile() {
    const name = document.getElementById('profileName').value.trim();
    const color = document.querySelector('.color-option.selected')?.dataset.color || '#4285f4';

    const data = {
      name,
      color,
      fields: {
        firstName: document.getElementById('firstName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        address: document.getElementById('address').value.trim(),
        city: document.getElementById('city').value.trim(),
        state: document.getElementById('state').value.trim(),
        zip: document.getElementById('zip').value.trim(),
        country: document.getElementById('country').value.trim(),
        company: document.getElementById('company').value.trim(),
        jobTitle: document.getElementById('jobTitle').value.trim(),
        website: document.getElementById('website').value.trim(),
        notes: document.getElementById('notes').value.trim()
      },
      customFields: getCustomFieldsFromForm()
    };

    const errors = profileManager.validateProfile(data);
    if (errors.length > 0) {
      showToast(errors[0], 'error');
      return;
    }

    if (editingProfileId) {
      profileManager.updateProfile(editingProfileId, data);
      showToast('Profile updated');
    } else {
      profileManager.createProfile(data);
      showToast('Profile created');
    }

    elements.profileEditor.classList.add('hidden');
    renderProfiles(elements.searchInput.value);
    renderDefaultSelect();
  }

  async function fillWithProfile(profileId) {
    const profile = profileManager.getProfile(profileId);
    if (!profile) return;

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) return;

      await chrome.tabs.sendMessage(tab.id, {
        action: 'fillForm',
        profile: profileManager.getProfileFieldMap(profile),
        settings: profileManager.getSettings()
      });

      profileManager.addRecentFill(profileId, tab.url);
      showToast(`Filled form with "${profile.name}"`);
    } catch (e) {
      showToast('Could not fill form on this page', 'error');
    }
  }

  function exportProfiles() {
    const json = profileManager.exportProfiles();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `form-filler-profiles-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Profiles exported');
  }

  function openSettings() {
    const s = profileManager.getSettings();
    document.getElementById('settingSkipEmpty').checked = s.skipEmptyFields;
    document.getElementById('settingHighlight').checked = s.highlightFields;
    document.getElementById('settingFloatingBtn').checked = s.showFloatingButton;
    document.getElementById('settingSimulateTyping').checked = s.simulateTyping;
    document.getElementById('settingTypingSpeed').value = s.typingSpeed;
    document.getElementById('settingColor').value = s.highlightColor;
    elements.settingsModal.classList.remove('hidden');
  }

  function saveSettings() {
    profileManager.updateSettings({
      skipEmptyFields: document.getElementById('settingSkipEmpty').checked,
      highlightFields: document.getElementById('settingHighlight').checked,
      showFloatingButton: document.getElementById('settingFloatingBtn').checked,
      simulateTyping: document.getElementById('settingSimulateTyping').checked,
      typingSpeed: parseInt(document.getElementById('settingTypingSpeed').value) || 30,
      highlightColor: document.getElementById('settingColor').value
    });
    elements.settingsModal.classList.add('hidden');
    showToast('Settings saved');
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function timeAgo(ts) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  // Tab switching
  elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      elements.tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
      document.getElementById(`${tab.dataset.tab}Tab`).classList.remove('hidden');

      if (tab.dataset.tab === 'recent') renderRecent();
      if (tab.dataset.tab === 'templates') renderTemplates();
    });
  });

  // Search
  elements.searchInput.addEventListener('input', (e) => {
    renderProfiles(e.target.value);
  });

  // New profile
  elements.btnNewProfile.addEventListener('click', () => openEditor());

  // Editor actions
  elements.btnCloseEditor.addEventListener('click', () => {
    elements.profileEditor.classList.add('hidden');
  });

  elements.btnCancelEditor.addEventListener('click', () => {
    elements.profileEditor.classList.add('hidden');
  });

  elements.btnSaveProfile.addEventListener('click', saveProfile);

  // Color picker
  document.querySelectorAll('.color-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
    });
  });

  // Add custom field
  elements.btnAddCustomField.addEventListener('click', () => {
    const index = elements.customFieldsList.children.length;
    const row = document.createElement('div');
    row.className = 'custom-field-row';
    row.dataset.index = index;
    row.innerHTML = `
      <input type="text" placeholder="Key" class="cf-key">
      <input type="text" placeholder="Value" class="cf-value">
      <button class="btn-remove" data-index="${index}">&times;</button>
    `;
    elements.customFieldsList.appendChild(row);

    row.querySelector('.btn-remove').addEventListener('click', () => {
      row.remove();
      reindexCustomFields();
    });
  });

  // Import
  elements.btnImport.addEventListener('click', () => {
    elements.fileImport.click();
  });

  elements.fileImport.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const text = await file.text();
    const result = await profileManager.importProfiles(text);

    if (result.success) {
      showToast(`Imported ${result.imported} profiles`);
      renderProfiles();
      renderDefaultSelect();
    } else {
      showToast(`Import failed: ${result.error}`, 'error');
    }

    elements.fileImport.value = '';
  });

  // Export
  elements.btnExport.addEventListener('click', exportProfiles);

  // Settings
  elements.btnSettings.addEventListener('click', openSettings);
  elements.btnCloseSettings.addEventListener('click', () => {
    elements.settingsModal.classList.add('hidden');
  });
  elements.btnSaveSettings.addEventListener('click', saveSettings);

  // Default profile select
  elements.defaultProfileSelect.addEventListener('change', (e) => {
    profileManager.setDefault(e.target.value || null);
    renderProfiles(elements.searchInput.value);
    showToast(e.target.value ? 'Default profile set' : 'Default profile cleared');
  });

  // Close modals on backdrop click
  [elements.profileEditor, elements.settingsModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
      }
    });
  });

  // Initial render
  renderProfiles();
  renderDefaultSelect();
  renderTemplates();
});
