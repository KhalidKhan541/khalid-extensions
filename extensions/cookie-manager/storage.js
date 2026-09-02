const StorageManager = {
  async get(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (result) => {
        resolve(result[key]);
      });
    });
  },

  async set(key, value) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, resolve);
    });
  },

  async remove(key) {
    return new Promise((resolve) => {
      chrome.storage.local.remove(key, resolve);
    });
  },

  async getTheme() {
    const theme = await this.get('theme');
    return theme || 'light';
  },

  async setTheme(theme) {
    await this.set('theme', theme);
  },

  async getFavorites() {
    const favorites = await this.get('favorites');
    return favorites || [];
  },

  async addFavorite(domain) {
    const favorites = await this.getFavorites();
    if (!favorites.includes(domain)) {
      favorites.push(domain);
      await this.set('favorites', favorites);
    }
    return favorites;
  },

  async removeFavorite(domain) {
    let favorites = await this.getFavorites();
    favorites = favorites.filter((f) => f !== domain);
    await this.set('favorites', favorites);
    return favorites;
  },

  async isFavorite(domain) {
    const favorites = await this.getFavorites();
    return favorites.includes(domain);
  },

  async getExportHistory() {
    const history = await this.get('exportHistory');
    return history || [];
  },

  async addToExportHistory(entry) {
    const history = await this.getExportHistory();
    history.unshift({ ...entry, timestamp: Date.now() });
    if (history.length > 20) history.pop();
    await this.set('exportHistory', history);
    return history;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageManager;
}