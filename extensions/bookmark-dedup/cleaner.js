/* cleaner.js — Bookmark operations with undo support */

const BookmarkCleaner = (() => {
  // Create a backup before any destructive operation
  async function createBackup() {
    const tree = await chrome.bookmarks.getTree();
    const backup = JSON.parse(JSON.stringify(tree));
    await StorageManager.saveBackup(backup);
    return backup;
  }

  // Restore from backup
  async function restoreFromBackup() {
    const backup = await StorageManager.getBackup();
    if (!backup) throw new Error('No backup available');

    // Remove all current bookmarks
    const tree = await chrome.bookmarks.getTree();
    async function removeAll(nodes) {
      for (const node of nodes) {
        if (node.children) {
          await removeAll(node.children);
        }
        // Don't delete root folders
        if (node.id === '0' || node.id === '1' || node.id === '2') continue;
        try {
          await chrome.bookmarks.removeTree(node.id);
        } catch { /* ignore */ }
      }
    }
    await removeAll(tree[0].children);

    // Recreate from backup
    async function recreate(nodes, parentId) {
      for (const node of nodes) {
        if (node.children) {
          const folder = await chrome.bookmarks.create({
            parentId,
            title: node.title || '',
            index: node.index
          });
          await recreate(node.children, folder.id);
        } else if (node.url) {
          await chrome.bookmarks.create({
            parentId,
            title: node.title || '',
            url: node.url,
            index: node.index,
            dateAdded: node.dateAdded
          });
        }
      }
    }

    await recreate(backup[0].children, '0');
    return true;
  }

  // Delete a single bookmark
  async function deleteBookmark(id) {
    try {
      await chrome.bookmarks.remove(id, true);
      return true;
    } catch {
      return false;
    }
  }

  // Delete multiple bookmarks
  async function deleteBookmarks(ids, onProgress = null) {
    let deleted = 0;
    for (let i = 0; i < ids.length; i++) {
      const ok = await deleteBookmark(ids[i]);
      if (ok) deleted++;
      if (onProgress) onProgress(i + 1, ids.length);
    }
    return deleted;
  }

  // Delete all bookmarks in a duplicate group except one
  function pickKeepers(group, strategy = 'first') {
    const items = group.items;
    switch (strategy) {
      case 'first':
        return { keep: items[0].id, delete: items.slice(1).map(b => b.id) };
      case 'last':
        return { keep: items[items.length - 1].id, delete: items.slice(0, -1).map(b => b.id) };
      case 'newest': {
        const sorted = [...items].sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
        return { keep: sorted[0].id, delete: sorted.slice(1).map(b => b.id) };
      }
      case 'oldest': {
        const sorted = [...items].sort((a, b) => (a.dateAdded || 0) - (b.dateAdded || 0));
        return { keep: sorted[0].id, delete: sorted.slice(1).map(b => b.id) };
      }
      default:
        return { keep: items[0].id, delete: items.slice(1).map(b => b.id) };
    }
  }

  // Merge names: keep bookmark with longest title, delete others
  function pickByMerge(group) {
    const items = group.items;
    const sorted = [...items].sort((a, b) => (b.title || '').length - (a.title || '').length);
    return { keep: sorted[0].id, delete: sorted.slice(1).map(b => b.id) };
  }

  // Delete empty folders
  async function deleteEmptyFolders(folders, onProgress = null) {
    let deleted = 0;
    // Sort deepest folders first so children are deleted before parents
    const sorted = [...folders].sort((a, b) => {
      const depthA = (a.path.match(/\//g) || []).length;
      const depthB = (b.path.match(/\//g) || []).length;
      return depthB - depthA;
    });

    for (let i = 0; i < sorted.length; i++) {
      const folder = sorted[i];
      try {
        // Re-check it's still empty
        const contents = await chrome.bookmarks.getChildren(folder.id);
        if (contents.length === 0) {
          await chrome.bookmarks.removeTree(folder.id);
          deleted++;
        }
      } catch { /* folder may have been deleted already */ }
      if (onProgress) onProgress(i + 1, sorted.length);
    }
    return deleted;
  }

  // Move bookmark to a different folder
  async function moveBookmark(bookmarkId, targetFolderId) {
    try {
      await chrome.bookmarks.move(bookmarkId, { parentId: targetFolderId });
      return true;
    } catch {
      return false;
    }
  }

  // Batch operation with progress tracking
  async function batchOperation(items, operation, onProgress = null) {
    let completed = 0;
    let failed = 0;

    for (let i = 0; i < items.length; i++) {
      try {
        await operation(items[i], i);
        completed++;
      } catch {
        failed++;
      }
      if (onProgress) onProgress(completed + failed, items.length, failed);
    }

    return { completed, failed, total: items.length };
  }

  // Full cleanup: duplicates + broken + empty folders
  async function fullCleanup(report, options = {}, onProgress = null) {
    await createBackup();
    const results = { duplicates: 0, broken: 0, emptyFolders: 0, errors: [] };

    const totalSteps =
      (report.stats.duplicates || 0) +
      (report.stats.broken || 0) +
      (report.stats.emptyFolders || 0);
    let done = 0;

    // 1. Remove duplicates (keep first by default)
    if (report.duplicates && report.duplicates.length > 0) {
      for (const group of report.duplicates) {
        const { delete: toDelete } = pickKeepers(group, options.dedupStrategy || 'first');
        for (const id of toDelete) {
          try {
            await deleteBookmark(id);
            results.duplicates++;
          } catch (e) {
            results.errors.push({ type: 'duplicate', id, error: e.message });
          }
          done++;
          if (onProgress) onProgress(done, totalSteps, results.errors.length);
        }
      }
    }

    // 2. Remove broken bookmarks
    if (report.broken && report.broken.length > 0) {
      for (const bm of report.broken) {
        try {
          await deleteBookmark(bm.id);
          results.broken++;
        } catch (e) {
          results.errors.push({ type: 'broken', id: bm.id, error: e.message });
        }
        done++;
        if (onProgress) onProgress(done, totalSteps, results.errors.length);
      }
    }

    // 3. Remove empty folders
    if (report.emptyFolders && report.emptyFolders.length > 0) {
      const deleted = await deleteEmptyFolders(report.emptyFolders, (cur, total) => {
        if (onProgress) onProgress(done + cur, totalSteps, results.errors.length);
      });
      results.emptyFolders = deleted;
      done += report.emptyFolders.length;
    }

    if (onProgress) onProgress(totalSteps, totalSteps, results.errors.length);
    return results;
  }

  return {
    createBackup,
    restoreFromBackup,
    deleteBookmark,
    deleteBookmarks,
    pickKeepers,
    pickByMerge,
    deleteEmptyFolders,
    moveBookmark,
    batchOperation,
    fullCleanup
  };
})();
