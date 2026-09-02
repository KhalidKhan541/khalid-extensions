chrome.runtime.onInstalled.addListener(async () => {
  const settings = await StorageManager.getSettings();
  await StorageManager.saveSettings(settings);

  if (settings.autoCleanupDays > 0) {
    chrome.alarms.create('cleanup', { periodInMinutes: 60 });
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'cleanup') {
    await StorageManager.cleanupOldArchives();
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    const settings = await StorageManager.getSettings();
    if (settings.autoSave && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
      try {
        await PageSaver.saveCurrentPage(settings.defaultSaveType, tab);
      } catch (e) {
        // silently fail for auto-save
      }
    }
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'SAVE_PAGE') {
    handleSavePage(msg).then(sendResponse).catch(err => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }

  if (msg.type === 'SAVE_PROGRESS') {
    chrome.runtime.sendMessage(msg);
    return false;
  }

  if (msg.type === 'GET_ARCHIVES') {
    StorageManager.getArchives().then(sendResponse);
    return true;
  }

  if (msg.type === 'DELETE_ARCHIVE') {
    StorageManager.removeArchive(msg.id).then(() => sendResponse({ success: true }));
    return true;
  }

  if (msg.type === 'SEARCH_ARCHIVES') {
    StorageManager.searchArchives(msg.query).then(sendResponse);
    return true;
  }

  if (msg.type === 'GET_STATS') {
    StorageManager.getStats().then(sendResponse);
    return true;
  }

  if (msg.type === 'GET_SETTINGS') {
    StorageManager.getSettings().then(sendResponse);
    return true;
  }

  if (msg.type === 'SAVE_SETTINGS') {
    StorageManager.saveSettings(msg.settings).then(() => sendResponse({ success: true }));
    return true;
  }

  if (msg.type === 'EXPORT_DATA') {
    StorageManager.exportData().then(sendResponse);
    return true;
  }

  if (msg.type === 'IMPORT_DATA') {
    StorageManager.importData(msg.data).then(sendResponse);
    return true;
  }

  if (msg.type === 'CLEAR_ALL') {
    StorageManager.clearAll().then(() => sendResponse({ success: true }));
    return true;
  }

  if (msg.type === 'CLEANUP_OLD') {
    StorageManager.cleanupOldArchives().then(removed => sendResponse({ removed }));
    return true;
  }

  if (msg.type === 'DOWNLOAD_ARCHIVE') {
    handleDownloadArchive(msg.archive).then(sendResponse);
    return true;
  }
});

async function handleSavePage(msg) {
  const tab = await chrome.tabs.get(msg.tabId);
  if (!tab) throw new Error('Tab not found');
  return await PageSaver.saveCurrentPage(msg.saveType, tab);
}

async function handleDownloadArchive(archive) {
  let content = archive.content;
  let filename = archive.title?.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50) || 'archive';
  let mimeType = 'text/html';

  switch (archive.type) {
    case 'full':
      mimeType = 'text/html';
      filename += '.html';
      break;
    case 'screenshot':
      mimeType = 'image/png';
      filename += '.png';
      if (content && content.startsWith('data:')) {
        content = content.split(',')[1];
      }
      break;
    case 'text':
      mimeType = 'text/plain';
      filename += '.txt';
      break;
    case 'reading':
      mimeType = 'text/html';
      filename += '_reading.html';
      content = this.buildReadingHtml(archive);
      break;
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  await chrome.downloads.download({
    url,
    filename,
    saveAs: true
  });

  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return { success: true };
}

function buildReadingHtml(archive) {
  const data = archive.readingData || {};
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(archive.title || 'Saved Article')}</title>
  <style>
    body { max-width: 680px; margin: 40px auto; padding: 0 20px; font-family: Georgia, serif; line-height: 1.8; color: #333; }
    h1 { line-height: 1.2; margin-bottom: 8px; }
    .meta { color: #666; font-size: 14px; margin-bottom: 24px; padding-bottom: 12px; border-bottom: 1px solid #eee; }
    .content p { margin-bottom: 1.2em; }
    .content img { max-width: 100%; height: auto; }
    .content blockquote { border-left: 3px solid #4A90D9; padding-left: 16px; color: #666; font-style: italic; }
    a { color: #4A90D9; }
  </style>
</head>
<body>
  <h1>${escapeHtml(archive.title || '')}</h1>
  <div class="meta">
    ${data.author ? `<span>${escapeHtml(data.author)}</span> · ` : ''}
    <span>${escapeHtml(data.siteName || '')}</span>
    <br><small>Archived: ${new Date(archive.savedAt).toLocaleDateString()}</small>
  </div>
  ${data.excerpt ? `<blockquote>${escapeHtml(data.excerpt)}</blockquote>` : ''}
  <div class="content">${archive.content || ''}</div>
</body>
</html>`;
}

function escapeHtml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
