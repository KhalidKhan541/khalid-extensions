const mockStorage = {
  data: {},
  listeners: [],

  get(keys, callback) {
    if (typeof keys === 'string') keys = [keys];
    if (keys === null || keys === undefined) keys = Object.keys(this.data);

    const result = {};
    keys.forEach(key => {
      if (this.data.hasOwnProperty(key)) {
        result[key] = this.data[key];
      }
    });

    setTimeout(() => callback(result), 0);
    return Promise.resolve(result);
  },

  set(items, callback) {
    Object.assign(this.data, items);
    this.listeners.forEach(listener => listener(items, 'local'));
    if (callback) setTimeout(callback, 0);
    return Promise.resolve();
  },

  remove(keys, callback) {
    if (typeof keys === 'string') keys = [keys];
    keys.forEach(key => delete this.data[key]);
    if (callback) setTimeout(callback, 0);
    return Promise.resolve();
  },

  clear(callback) {
    this.data = {};
    if (callback) setTimeout(callback, 0);
    return Promise.resolve();
  },

  onChanged: {
    addListener(listener) {
      mockStorage.listeners.push(listener);
    },
    removeListener(listener) {
      const index = mockStorage.listeners.indexOf(listener);
      if (index > -1) mockStorage.listeners.splice(index, 1);
    }
  },

  _reset() {
    this.data = {};
    this.listeners = [];
  }
};

const mockAlarms = {
  alarms: {},
  listeners: [],

  create(name, alarmInfo, callback) {
    const alarm = {
      name,
      scheduledTime: Date.now() + (alarmInfo.delayInMinutes || alarmInfo.periodInMinutes || 0) * 60 * 1000,
      periodInMinutes: alarmInfo.periodInMinutes
    };
    this.alarms[name] = alarm;
    if (callback) setTimeout(callback, 0);
    return Promise.resolve();
  },

  clear(name, callback) {
    delete this.alarms[name];
    if (callback) setTimeout(() => callback(true), 0);
    return Promise.resolve(true);
  },

  clearAll(callback) {
    this.alarms = {};
    if (callback) setTimeout(callback, 0);
    return Promise.resolve();
  },

  get(name, callback) {
    const alarm = this.alarms[name] || null;
    if (callback) setTimeout(() => callback(alarm), 0);
    return Promise.resolve(alarm);
  },

  getAll(callback) {
    const alarms = Object.values(this.alarms);
    if (callback) setTimeout(() => callback(alarms), 0);
    return Promise.resolve(alarms);
  },

  onAlarm: {
    addListener(listener) {
      this.listeners.push(listener);
    },
    removeListener(listener) {
      const index = this.listeners.indexOf(listener);
      if (index > -1) this.listeners.splice(index, 1);
    }
  },

  _triggerAlarm(name) {
    const alarm = this.alarms[name];
    if (alarm) {
      this.listeners.forEach(listener => listener(alarm));
    }
  },

  _reset() {
    this.alarms = {};
    this.listeners = [];
  }
};

const mockRuntime = {
  listeners: [],
  lastError: null,

  sendMessage(message, options, callback) {
    if (typeof options === 'function') {
      callback = options;
    }
    this.listeners.forEach(listener => {
      try {
        const response = listener(message, {}, callback);
        if (callback && response !== undefined) callback(response);
      } catch (e) {
        if (callback) callback({ error: e.message });
      }
    });
    return Promise.resolve();
  },

  onMessage: {
    addListener(listener) {
      this.listeners.push(listener);
    },
    removeListener(listener) {
      const index = this.listeners.indexOf(listener);
      if (index > -1) this.listeners.splice(index, 1);
    }
  },

  onInstalled: {
    addListener(listener) {
      this.installedListeners = this.installedListeners || [];
      this.installedListeners.push(listener);
    },
    removeListener(listener) {
      if (this.installedListeners) {
        const index = this.installedListeners.indexOf(listener);
        if (index > -1) this.installedListeners.splice(index, 1);
      }
    }
  },

  onStartup: {
    addListener(listener) {
      this.startupListeners = this.startupListeners || [];
      this.startupListeners.push(listener);
    }
  },

  _triggerInstalled() {
    if (this.installedListeners) {
      this.installedListeners.forEach(listener => listener({ reason: 'install' }));
    }
  },

  _reset() {
    this.listeners = [];
    this.installedListeners = [];
    this.startupListeners = [];
    this.lastError = null;
  }
};

const mockAction = {
  badgeText: '',
  badgeBackgroundColor: '#000000',
  badgeTextColor: '#FFFFFF',

  setBadgeText(details, callback) {
    this.badgeText = details.text || '';
    if (callback) setTimeout(callback, 0);
    return Promise.resolve();
  },

  setBadgeBackgroundColor(details, callback) {
    this.badgeBackgroundColor = details.color || '#000000';
    if (callback) setTimeout(callback, 0);
    return Promise.resolve();
  },

  setBadgeTextColor(details, callback) {
    this.badgeTextColor = details.color || '#FFFFFF';
    if (callback) setTimeout(callback, 0);
    return Promise.resolve();
  },

  _reset() {
    this.badgeText = '';
    this.badgeBackgroundColor = '#000000';
    this.badgeTextColor = '#FFFFFF';
  }
};

const mockNotifications = {
  notifications: {},

  create(notificationId, options, callback) {
    const id = notificationId || `notification-${Date.now()}`;
    this.notifications[id] = { id, ...options };
    if (callback) setTimeout(() => callback(id), 0);
    return Promise.resolve(id);
  },

  clear(notificationId, callback) {
    delete this.notifications[notificationId];
    if (callback) setTimeout(() => callback(true), 0);
    return Promise.resolve(true);
  },

  getAll(callback) {
    const notifications = Object.values(this.notifications);
    if (callback) setTimeout(() => callback(notifications), 0);
    return Promise.resolve(notifications);
  },

  onClicked: {
    listeners: [],
    addListener(listener) {
      this.listeners.push(listener);
    },
    removeListener(listener) {
      const index = this.listeners.indexOf(listener);
      if (index > -1) this.listeners.splice(index, 1);
    }
  },

  _reset() {
    this.notifications = {};
    this.onClicked.listeners = [];
  }
};

const mockTabs = {
  tabs: [],

  query(queryInfo, callback) {
    let results = [...this.tabs];
    if (queryInfo.active !== undefined) {
      results = results.filter(tab => tab.active === queryInfo.active);
    }
    if (queryInfo.currentWindow !== undefined) {
      results = results.filter(tab => tab.windowId === 1);
    }
    if (callback) setTimeout(() => callback(results), 0);
    return Promise.resolve(results);
  },

  sendMessage(tabId, message, options, callback) {
    if (typeof options === 'function') {
      callback = options;
    }
    if (callback) setTimeout(() => callback({ success: true }), 0);
    return Promise.resolve({ success: true });
  },

  _addTab(tab) {
    this.tabs.push({ id: Date.now(), windowId: 1, active: true, ...tab });
  },

  _reset() {
    this.tabs = [];
  }
};

const mockTabsQuery = mockTabs.query.bind(mockTabs);

const mockWebNavigation = {
  onCompleted: {
    listeners: [],
    addListener(listener) {
      this.listeners.push(listener);
    },
    removeListener(listener) {
      const index = this.listeners.indexOf(listener);
      if (index > -1) this.listeners.splice(index, 1);
    }
  },
  _reset() {
    this.onCompleted.listeners = [];
  }
};

const mockRuntimeGetURL = (path) => `chrome-extension://mock-id/${path}`;

module.exports = {
  storage: {
    local: mockStorage,
    sync: mockStorage,
    managed: mockStorage
  },
  alarms: mockAlarms,
  runtime: mockRuntime,
  action: mockAction,
  notifications: mockNotifications,
  tabs: mockTabs,
  webNavigation: mockWebNavigation,
  runtime: {
    ...mockRuntime,
    getURL: mockRuntimeGetURL
  }
};