const TabStorage = (() => {
  const DB_NAME = 'tabcounter-db';
  const DB_VERSION = 1;
  const STORE_EVENTS = 'events';
  const STORE_STATS = 'stats';
  const STORE_SETTINGS = 'settings';
  const MAX_EVENTS = 50000;
  const PRUNE_THRESHOLD = 45000;
  let db = null;
  let cache = {};

  function openDB() {
    return new Promise((resolve, reject) => {
      if (db) { resolve(db); return; }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = e => {
        const d = e.target.result;
        if (!d.objectStoreNames.contains(STORE_EVENTS)) {
          const s = d.createObjectStore(STORE_EVENTS, { keyPath: 'id', autoIncrement: true });
          s.createIndex('type', 'type', { unique: false });
          s.createIndex('timestamp', 'timestamp', { unique: false });
          s.createIndex('domain', 'domain', { unique: false });
        }
        if (!d.objectStoreNames.contains(STORE_STATS)) {
          d.createObjectStore(STORE_STATS, { keyPath: 'key' });
        }
        if (!d.objectStoreNames.contains(STORE_SETTINGS)) {
          d.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
        }
      };
      req.onsuccess = e => { db = e.target.result; resolve(db); };
      req.onerror = e => reject(e.target.error);
    });
  }

  async function addEvent(event) {
    const d = await openDB();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE_EVENTS, 'readwrite');
      const store = tx.objectStore(STORE_EVENTS);
      const record = {
        ...event,
        timestamp: event.timestamp || Date.now(),
        compressed: false
      };
      const req = store.add(record);
      req.onsuccess = () => {
        cache.events = (cache.events || 0) + 1;
        resolve(req.result);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async function getEvents(opts = {}) {
    const d = await openDB();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE_EVENTS, 'readonly');
      const store = tx.objectStore(STORE_EVENTS);
      const results = [];
      let req;
      if (opts.type) {
        const idx = store.index('type');
        req = idx.openCursor(IDBKeyRange.only(opts.type));
      } else if (opts.since) {
        const idx = store.index('timestamp');
        req = idx.openCursor(IDBKeyRange.lowerBound(opts.since));
      } else if (opts.domain) {
        const idx = store.index('domain');
        req = idx.openCursor(IDBKeyRange.only(opts.domain));
      } else {
        req = store.openCursor();
      }
      let count = 0;
      const limit = opts.limit || Infinity;
      req.onsuccess = e => {
        const cursor = e.target.result;
        if (cursor && count < limit) {
          results.push(cursor.value);
          count++;
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  async function getEventCount() {
    if (cache.events !== undefined) return cache.events;
    const d = await openDB();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE_EVENTS, 'readonly');
      const req = tx.objectStore(STORE_EVENTS).count();
      req.onsuccess = () => { cache.events = req.result; resolve(req.result); };
      req.onerror = () => reject(req.error);
    });
  }

  async function pruneOldEvents(keepDays = 30) {
    const cutoff = Date.now() - keepDays * 86400000;
    const d = await openDB();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE_EVENTS, 'readwrite');
      const store = tx.objectStore(STORE_EVENTS);
      const idx = store.index('timestamp');
      const range = IDBKeyRange.upperBound(cutoff);
      const req = idx.openCursor(range);
      let deleted = 0;
      req.onsuccess = e => {
        const cursor = e.target.result;
        if (cursor) {
          cursor.delete();
          deleted++;
          cursor.continue();
        } else {
          cache.events = Math.max(0, (cache.events || 0) - deleted);
          resolve(deleted);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  async function compressOldEvents(daysOld = 7) {
    const cutoff = Date.now() - daysOld * 86400000;
    const d = await openDB();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE_EVENTS, 'readwrite');
      const store = tx.objectStore(STORE_EVENTS);
      const idx = store.index('timestamp');
      const range = IDBKeyRange.upperBound(cutoff);
      const req = idx.openCursor(range);
      let compressed = 0;
      req.onsuccess = e => {
        const cursor = e.target.result;
        if (cursor) {
          const val = cursor.value;
          if (!val.compressed && val.type !== 'created' && val.type !== 'removed') {
            val.compressed = true;
            val.detail = undefined;
            cursor.update(val);
            compressed++;
          }
          cursor.continue();
        } else {
          resolve(compressed);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  async function setStat(key, value) {
    const d = await openDB();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE_STATS, 'readwrite');
      tx.objectStore(STORE_STATS).put({ key, value, updated: Date.now() });
      tx.oncomplete = () => { cache[key] = value; resolve(); };
      tx.onerror = () => reject(tx.error);
    });
  }

  async function getStat(key) {
    if (cache[key] !== undefined) return cache[key];
    const d = await openDB();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE_STATS, 'readonly');
      const req = tx.objectStore(STORE_STATS).get(key);
      req.onsuccess = () => {
        const val = req.result ? req.result.value : null;
        cache[key] = val;
        resolve(val);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async function setSetting(key, value) {
    const d = await openDB();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE_SETTINGS, 'readwrite');
      tx.objectStore(STORE_SETTINGS).put({ key, value });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function getSetting(key, defaultVal) {
    const d = await openDB();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE_SETTINGS, 'readonly');
      const req = tx.objectStore(STORE_SETTINGS).get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value : defaultVal);
      req.onerror = () => reject(req.error);
    });
  }

  async function exportData() {
    const events = await getEvents();
    const d = await openDB();
    const stats = await new Promise((resolve, reject) => {
      const tx = d.transaction(STORE_STATS, 'readonly');
      const req = tx.objectStore(STORE_STATS).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const settings = await new Promise((resolve, reject) => {
      const tx = d.transaction(STORE_SETTINGS, 'readonly');
      const req = tx.objectStore(STORE_SETTINGS).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return { version: DB_VERSION, exportedAt: Date.now(), events, stats, settings };
  }

  async function importData(data) {
    if (!data || !data.events) throw new Error('Invalid data format');
    const d = await openDB();
    return new Promise((resolve, reject) => {
      const tx = d.transaction([STORE_EVENTS, STORE_STATS, STORE_SETTINGS], 'readwrite');
      const eStore = tx.objectStore(STORE_EVENTS);
      const sStore = tx.objectStore(STORE_STATS);
      const tStore = tx.objectStore(STORE_SETTINGS);
      for (const ev of data.events) {
        const { id, ...rest } = ev;
        eStore.add(rest);
      }
      if (data.stats) {
        for (const s of data.stats) sStore.put(s);
      }
      if (data.settings) {
        for (const s of data.settings) tStore.put(s);
      }
      tx.oncomplete = () => { cache = {}; resolve(); };
      tx.onerror = () => reject(tx.error);
    });
  }

  async function clearAll() {
    const d = await openDB();
    return new Promise((resolve, reject) => {
      const tx = d.transaction([STORE_EVENTS, STORE_STATS, STORE_SETTINGS], 'readwrite');
      tx.objectStore(STORE_EVENTS).clear();
      tx.objectStore(STORE_STATS).clear();
      tx.objectStore(STORE_SETTINGS).clear();
      tx.oncomplete = () => { cache = {}; resolve(); };
      tx.onerror = () => reject(tx.error);
    });
  }

  async function ensureCapacity() {
    const count = await getEventCount();
    if (count > PRUNE_THRESHOLD) {
      await pruneOldEvents(14);
      await compressOldEvents(7);
    }
  }

  return {
    openDB, addEvent, getEvents, getEventCount,
    pruneOldEvents, compressOldEvents, ensureCapacity,
    setStat, getStat, setSetting, getSetting,
    exportData, importData, clearAll
  };
})();

if (typeof globalThis !== 'undefined') globalThis.TabStorage = TabStorage;
