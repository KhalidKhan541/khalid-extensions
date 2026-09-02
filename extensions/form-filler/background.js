chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'form-filler-root',
    title: 'Fill with Form Filler',
    contexts: ['page', 'frame']
  });

  chrome.contextMenus.create({
    id: 'form-filler-highlight',
    parentId: 'form-filler-root',
    title: 'Highlight Fillable Fields',
    contexts: ['page', 'frame']
  });

  chrome.contextMenus.create({
    id: 'form-filler-separator',
    parentId: 'form-filler-root',
    type: 'separator',
    contexts: ['page', 'frame']
  });

  updateContextMenuProfiles();
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.profiles) {
    updateContextMenuProfiles();
  }
});

async function updateContextMenuProfiles() {
  const data = await chrome.storage.local.get('profiles');
  const profiles = data.profiles || [];

  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'form-filler-root',
      title: 'Fill with Form Filler',
      contexts: ['page', 'frame']
    });

    chrome.contextMenus.create({
      id: 'form-filler-highlight',
      parentId: 'form-filler-root',
      title: 'Highlight Fillable Fields',
      contexts: ['page', 'frame']
    });

    chrome.contextMenus.create({
      id: 'form-filler-separator',
      parentId: 'form-filler-root',
      type: 'separator',
      contexts: ['page', 'frame']
    });

    profiles.forEach(profile => {
      chrome.contextMenus.create({
        id: `form-filler-fill-${profile.id}`,
        parentId: 'form-filler-root',
        title: profile.name,
        contexts: ['page', 'frame']
      });
    });

    if (profiles.length > 0) {
      chrome.contextMenus.create({
        id: 'form-filler-separator2',
        parentId: 'form-filler-root',
        type: 'separator',
        contexts: ['page', 'frame']
      });

      chrome.contextMenus.create({
        id: 'form-filler-default',
        parentId: 'form-filler-root',
        title: 'Fill with Default Profile',
        contexts: ['page', 'frame']
      });
    }
  });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!info.menuItemId.startsWith('form-filler-')) return;

  if (info.menuItemId === 'form-filler-highlight') {
    chrome.tabs.sendMessage(tab.id, { action: 'highlightFields' });
    return;
  }

  let profileId = null;

  if (info.menuItemId === 'form-filler-default') {
    const data = await chrome.storage.local.get('defaultProfileId');
    profileId = data.defaultProfileId;
  } else if (info.menuItemId.startsWith('form-filler-fill-')) {
    profileId = info.menuItemId.replace('form-filler-fill-', '');
  }

  if (profileId) {
    const data = await chrome.storage.local.get(['profiles', 'settings']);
    const profile = (data.profiles || []).find(p => p.id === profileId);
    const settings = data.settings || {};

    if (profile) {
      const fieldMap = buildFieldMap(profile);
      chrome.tabs.sendMessage(tab.id, {
        action: 'fillForm',
        profile: fieldMap,
        settings
      });

      recordRecentFill(profileId, tab.url);
    }
  }
});

function buildFieldMap(profile) {
  const map = {};
  if (!profile) return map;

  const f = profile.fields;

  if (f.firstName) map['first-name'] = f.firstName;
  if (f.lastName) map['last-name'] = f.lastName;
  if (f.firstName && f.lastName) map['full-name'] = `${f.firstName} ${f.lastName}`;
  if (f.email) map['email'] = f.email;
  if (f.phone) map['phone'] = f.phone;
  if (f.address) map['street'] = f.address;
  if (f.city) map['city'] = f.city;
  if (f.state) map['state'] = f.state;
  if (f.zip) map['zip'] = f.zip;
  if (f.country) map['country'] = f.country;
  if (f.company) map['company'] = f.company;
  if (f.jobTitle) map['job-title'] = f.jobTitle;
  if (f.website) map['website'] = f.website;

  if (profile.customFields) {
    for (const cf of profile.customFields) {
      if (cf.key && cf.value) {
        map[cf.key.toLowerCase().replace(/\s+/g, '-')] = cf.value;
      }
    }
  }

  return map;
}

async function recordRecentFill(profileId, url) {
  const data = await chrome.storage.local.get('recentFills');
  let recentFills = data.recentFills || [];

  recentFills = recentFills.filter(r => !(r.profileId === profileId && r.url === url));
  recentFills.unshift({
    profileId,
    url,
    timestamp: Date.now()
  });
  recentFills = recentFills.slice(0, 20);

  await chrome.storage.local.set({ recentFills });
}

// Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateBadge') {
    const count = message.count || 0;
    const text = count > 0 ? count.toString() : '';
    const color = count > 0 ? '#4285f4' : '#80868b';

    chrome.action.setBadgeText({ text, tabId: sender.tab?.id });
    chrome.action.setBadgeBackgroundColor({ color });
    sendResponse({ success: true });
  }

  if (message.action === 'getDefaultProfile') {
    chrome.storage.local.get(['profiles', 'defaultProfileId'], (data) => {
      const profile = (data.profiles || []).find(p => p.id === data.defaultProfileId);
      if (profile) {
        sendResponse({ profile: buildFieldMap(profile) });
      } else {
        sendResponse({ profile: null });
      }
    });
    return true;
  }

  return false;
});

// Keyboard shortcut
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'quick-fill') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    const data = await chrome.storage.local.get(['profiles', 'defaultProfileId', 'settings']);
    const profile = (data.profiles || []).find(p => p.id === data.defaultProfileId);

    if (profile) {
      const fieldMap = buildFieldMap(profile);
      chrome.tabs.sendMessage(tab.id, {
        action: 'fillForm',
        profile: fieldMap,
        settings: data.settings || {}
      });
      recordRecentFill(profile.id, tab.url);
    }
  }
});

// Handle tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    chrome.tabs.sendMessage(tabId, { action: 'ping' }).catch(() => {});
  }
});
