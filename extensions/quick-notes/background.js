/**
 * Quick Notes - Background Service Worker
 * Handles context menus, message passing, and badge updates
 */

// ==========================================
// Context Menu Setup
// ==========================================

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'quicknotes-save-selection',
    title: 'Save selection as Quick Note',
    contexts: ['selection']
  });

  chrome.contextMenus.create({
    id: 'quicknotes-save-page',
    title: 'Save page URL as Quick Note',
    contexts: ['page', 'link']
  });

  // Initialize badge
  updateBadge();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'quicknotes-save-selection') {
    saveSelectionAsNote(info, tab);
  } else if (info.menuItemId === 'quicknotes-save-page') {
    savePageAsNote(info, tab);
  }
});

async function saveSelectionAsNote(info, tab) {
  const selectedText = info.selectionText || '';
  const note = await quickNotesStorage.createNote({
    title: selectedText.substring(0, 50) + (selectedText.length > 50 ? '...' : ''),
    content: selectedText,
    domain: new URL(tab.url).hostname
  });

  updateBadge();
  notifyContentScript(tab.id, { type: 'note-created', note });
}

async function savePageAsNote(info, tab) {
  const url = info.linkUrl || info.pageUrl;
  const title = tab.title || 'Page Note';
  const content = `# ${title}\n\n${url}`;

  const note = await quickNotesStorage.createNote({
    title,
    content,
    domain: new URL(tab.url).hostname
  });

  updateBadge();
  notifyContentScript(tab.id, { type: 'note-created', note });
}

// ==========================================
// Message Handling
// ==========================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse);
  return true; // Keep channel open for async response
});

async function handleMessage(message, sender, sendResponse) {
  try {
    switch (message.type) {
      case 'get-notes':
        const notes = await quickNotesStorage.getAllNotes();
        sendResponse({ success: true, notes });
        break;

      case 'get-note':
        const note = await quickNotesStorage.getNote(message.id);
        sendResponse({ success: true, note });
        break;

      case 'create-note':
        const newNote = await quickNotesStorage.createNote(message.data);
        updateBadge();
        sendResponse({ success: true, note: newNote });
        break;

      case 'update-note':
        const updated = await quickNotesStorage.updateNote(message.id, message.data);
        updateBadge();
        sendResponse({ success: true, note: updated });
        break;

      case 'delete-note':
        const deleted = await quickNotesStorage.deleteNote(message.id);
        updateBadge();
        sendResponse({ success: true, deleted });
        break;

      case 'pin-note':
        const pinned = await quickNotesStorage.pinNote(message.id, message.pinned);
        sendResponse({ success: true, note: pinned });
        break;

      case 'search-notes':
        const results = await quickNotesStorage.searchNotes(message.query);
        sendResponse({ success: true, notes: results });
        break;

      case 'get-tags':
        const tags = await quickNotesStorage.getAllTags();
        sendResponse({ success: true, tags });
        break;

      case 'export-json':
        const json = await quickNotesStorage.exportAsJSON();
        sendResponse({ success: true, data: json });
        break;

      case 'export-markdown':
        const md = await quickNotesStorage.exportAsMarkdown();
        sendResponse({ success: true, data: md });
        break;

      case 'import-json':
        const jsonResult = await quickNotesStorage.importFromJSON(message.data);
        updateBadge();
        sendResponse({ success: true, result: jsonResult });
        break;

      case 'import-markdown':
        const mdResult = await quickNotesStorage.importFromMarkdown(message.data);
        updateBadge();
        sendResponse({ success: true, result: mdResult });
        break;

      case 'get-note-count':
        const count = await quickNotesStorage.getNoteCount();
        sendResponse({ success: true, count });
        break;

      case 'update-badge':
        await updateBadge();
        sendResponse({ success: true });
        break;

      default:
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// ==========================================
// Badge Management
// ==========================================

async function updateBadge() {
  try {
    const count = await quickNotesStorage.getNoteCount();
    const text = count > 0 ? count.toString() : '';
    const color = count > 0 ? '#6366f1' : '#94a3b8';

    await chrome.action.setBadgeText({ text });
    await chrome.action.setBadgeBackgroundColor({ color });
  } catch (error) {
    console.error('Failed to update badge:', error);
  }
}

// ==========================================
// Content Script Communication
// ==========================================

async function notifyContentScript(tabId, message) {
  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch {
    // Content script might not be loaded
  }
}

// Listen for tab updates to refresh badge
chrome.tabs.onActivated.addListener(async () => {
  await updateBadge();
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.status === 'complete') {
    await updateBadge();
  }
});

// Auto-backup reminder (once per day)
chrome.alarms.create('quicknotes-backup', { periodInMinutes: 1440 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'quicknotes-backup') {
    await quickNotesStorage.createBackup();
  }
});

// ==========================================
// Import Storage for Badge Updates
// ==========================================

// Re-import storage since background scripts run in separate context
importScripts('storage.js');
