/**
 * Quick Notes - Storage Module
 * Handles all CRUD operations, search indexing, and data persistence
 */

class QuickNotesStorage {
  constructor() {
    this.STORAGE_KEY = 'quicknotes_data';
    this.POSITION_KEY = 'quicknotes_positions';
    this.SETTINGS_KEY = 'quicknotes_settings';
  }

  // ==========================================
  // Core CRUD Operations
  // ==========================================

  async getAllNotes() {
    const data = await this._getData();
    return data.notes || [];
  }

  async getNote(id) {
    const notes = await this.getAllNotes();
    return notes.find(n => n.id === id) || null;
  }

  async createNote(noteData = {}) {
    const notes = await this.getAllNotes();
    const now = Date.now();
    const note = {
      id: this._generateId(),
      title: noteData.title || 'Untitled Note',
      content: noteData.content || '',
      tags: noteData.tags || [],
      pinned: noteData.pinned || false,
      createdAt: now,
      updatedAt: now,
      domain: noteData.domain || null
    };
    notes.unshift(note);
    await this._saveData({ notes });
    return note;
  }

  async updateNote(id, updates) {
    const notes = await this.getAllNotes();
    const index = notes.findIndex(n => n.id === id);
    if (index === -1) return null;

    notes[index] = {
      ...notes[index],
      ...updates,
      updatedAt: Date.now()
    };

    await this._saveData({ notes });
    return notes[index];
  }

  async deleteNote(id) {
    const notes = await this.getAllNotes();
    const filtered = notes.filter(n => n.id !== id);
    await this._saveData({ notes: filtered });
    return filtered.length < notes.length;
  }

  async pinNote(id, pinned = true) {
    return this.updateNote(id, { pinned });
  }

  // ==========================================
  // Search & Filter
  // ==========================================

  async searchNotes(query) {
    const notes = await this.getAllNotes();
    if (!query) return this._sortNotes(notes, 'modified');

    const lowerQuery = query.toLowerCase();
    return notes.filter(note => {
      const titleMatch = note.title.toLowerCase().includes(lowerQuery);
      const contentMatch = note.content.toLowerCase().includes(lowerQuery);
      const tagMatch = note.tags.some(t => t.toLowerCase().includes(lowerQuery));
      return titleMatch || contentMatch || tagMatch;
    });
  }

  async getNotesByTag(tag) {
    const notes = await this.getAllNotes();
    if (!tag) return notes;
    return notes.filter(n => n.tags.includes(tag));
  }

  async getNotesByDomain(domain) {
    const notes = await this.getAllNotes();
    if (!domain) return notes;
    return notes.filter(n => n.domain === domain);
  }

  async getAllTags() {
    const notes = await this.getAllNotes();
    const tagSet = new Set();
    notes.forEach(n => n.tags.forEach(t => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }

  sortNotes(notes, sortBy = 'modified') {
    return this._sortNotes(notes, sortBy);
  }

  _sortNotes(notes, sortBy) {
    const sorted = [...notes];
    switch (sortBy) {
      case 'modified':
        return sorted.sort((a, b) => b.updatedAt - a.updatedAt);
      case 'created':
        return sorted.sort((a, b) => b.createdAt - a.createdAt);
      case 'title':
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      default:
        return sorted;
    }
  }

  // ==========================================
  // Export / Import
  // ==========================================

  async exportAsJSON() {
    const notes = await this.getAllNotes();
    return JSON.stringify({
      version: '1.0',
      exportedAt: Date.now(),
      notes
    }, null, 2);
  }

  async exportAsMarkdown() {
    const notes = await this.getAllNotes();
    let md = `# Quick Notes Export\n\n`;
    md += `*Exported: ${new Date().toLocaleString()}*\n`;
    md += `*Total notes: ${notes.length}*\n\n---\n\n`;

    notes.forEach(note => {
      md += `## ${note.title}\n\n`;
      if (note.tags.length > 0) {
        md += `**Tags:** ${note.tags.join(', ')}\n\n`;
      }
      md += `*Created: ${new Date(note.createdAt).toLocaleString()}*\n`;
      md += `*Modified: ${new Date(note.updatedAt).toLocaleString()}*\n\n`;
      md += `${note.content}\n\n---\n\n`;
    });

    return md;
  }

  async importFromJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (!data.notes || !Array.isArray(data.notes)) {
        throw new Error('Invalid format');
      }

      const existingNotes = await this.getAllNotes();
      const existingIds = new Set(existingNotes.map(n => n.id));

      let imported = 0;
      data.notes.forEach(note => {
        if (existingIds.has(note.id)) {
          note.id = this._generateId();
        }
        existingNotes.push(note);
        imported++;
      });

      await this._saveData({ notes: existingNotes });
      return { success: true, imported };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async importFromMarkdown(mdString) {
    try {
      const sections = mdString.split(/^## /m).filter(s => s.trim());
      const notes = [];

      sections.forEach(section => {
        const lines = section.split('\n');
        const title = lines[0].trim();
        let content = lines.slice(1).join('\n').trim();

        // Clean up markdown formatting
        content = content.replace(/\*Exported:.*?\*\n?/, '');
        content = content.replace(/\*Total notes:.*?\*\n?/, '');
        content = content.replace(/\*Created:.*?\*\n?/g, '');
        content = content.replace(/\*Modified:.*?\*\n?/g, '');
        content = content.replace(/^---$/gm, '');
        content = content.replace(/\*\*Tags:\*\*(.*?)\n/g, (match, tags) => {
          return tags.split(',').map(t => t.trim()).join(',');
        });

        const tagsMatch = content.match(/^([a-zA-Z0-9,\s]+)$/);
        let tags = [];
        if (tagsMatch) {
          tags = tagsMatch[1].split(',').map(t => t.trim()).filter(Boolean);
          content = content.replace(tagsMatch[0], '');
        }

        notes.push({
          id: this._generateId(),
          title: title || 'Imported Note',
          content: content.trim(),
          tags,
          pinned: false,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      });

      const existingNotes = await this.getAllNotes();
      existingNotes.unshift(...notes);
      await this._saveData({ notes: existingNotes });

      return { success: true, imported: notes.length };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // ==========================================
  // Position Memory
  // ==========================================

  async getPosition(domain) {
    const data = await this._getData();
    const positions = data.positions || {};
    return positions[domain] || { x: null, y: null };
  }

  async setPosition(domain, x, y) {
    const data = await this._getData();
    const positions = data.positions || {};
    positions[domain] = { x, y };
    await this._saveData({ ...data, positions });
  }

  async getWidgetState(domain) {
    const data = await this._getData();
    const states = data.widgetStates || {};
    return states[domain] || { visible: false, minimized: false, width: 400, height: 500 };
  }

  async setWidgetState(domain, state) {
    const data = await this._getData();
    const states = data.widgetStates || {};
    states[domain] = { ...states[domain], ...state };
    await this._saveData({ ...data, widgetStates: states });
  }

  // ==========================================
  // Settings
  // ==========================================

  async getSettings() {
    const data = await this._getData();
    return data.settings || {
      defaultView: 'edit',
      autoSaveDelay: 500,
      fontSize: 13,
      theme: 'auto'
    };
  }

  async updateSettings(updates) {
    const data = await this._getData();
    const settings = { ...(data.settings || {}), ...updates };
    await this._saveData({ ...data, settings });
  }

  // ==========================================
  // Note Count
  // ==========================================

  async getNoteCount() {
    const notes = await this.getAllNotes();
    return notes.length;
  }

  // ==========================================
  // Backup
  // ==========================================

  async createBackup() {
    const data = await this._getData();
    return {
      ...data,
      backupAt: Date.now()
    };
  }

  // ==========================================
  // Internal Helpers
  // ==========================================

  async _getData() {
    try {
      const result = await chrome.storage.local.get(this.STORAGE_KEY);
      return result[this.STORAGE_KEY] || { notes: [], positions: {}, widgetStates: {}, settings: {} };
    } catch {
      return { notes: [], positions: {}, widgetStates: {}, settings: {} };
    }
  }

  async _saveData(data) {
    await chrome.storage.local.set({ [this.STORAGE_KEY]: data });
  }

  _generateId() {
    return `qn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Escape HTML for safe preview
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Global instance
const quickNotesStorage = new QuickNotesStorage();
