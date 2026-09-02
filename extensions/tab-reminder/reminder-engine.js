const ReminderEngine = (() => {
  'use strict';

  const STORAGE_KEY = 'tab_reminder_data';
  const HISTORY_KEY = 'tab_reminder_history';
  const STATS_KEY = 'tab_reminder_stats';
  const MAX_HISTORY = 30;
  const ALARM_PREFIX = 'tab_reminder_';

  async function getData() {
    const result = await chrome.storage.local.get([STORAGE_KEY]);
    return result[STORAGE_KEY] || { reminders: [], history: [], stats: { totalSet: 0, totalCompleted: 0, totalSnoozed: 0, topSites: {} } };
  }

  async function saveData(data) {
    await chrome.storage.local.set({ [STORAGE_KEY]: data });
  }

  async function createReminder(reminder) {
    const data = await getData();
    data.reminders.push(reminder);
    data.stats.totalSet = (data.stats.totalSet || 0) + 1;
    await saveData(data);

    if (reminder.fireAt && reminder.status === 'active') {
      scheduleAlarm(reminder);
    }

    return reminder;
  }

  async function getAllReminders() {
    const data = await getData();
    return data.reminders || [];
  }

  async function getActiveReminders() {
    const reminders = await getAllReminders();
    return reminders.filter(r => r.status === 'active' || r.status === 'paused' || r.status === 'snoozed');
  }

  async function pauseReminder(id) {
    const data = await getData();
    const reminder = data.reminders.find(r => r.id === id);
    if (!reminder) return false;

    reminder.status = 'paused';
    reminder.pausedAt = Date.now();
    await saveData(data);
    cancelAlarm(id);
    return true;
  }

  async function resumeReminder(id) {
    const data = await getData();
    const reminder = data.reminders.find(r => r.id === id);
    if (!reminder) return false;

    reminder.status = 'active';
    if (reminder.pausedAt && reminder.fireAt) {
      const pausedDuration = Date.now() - reminder.pausedAt;
      reminder.fireAt += pausedDuration;
    }
    delete reminder.pausedAt;
    await saveData(data);

    if (reminder.fireAt) {
      scheduleAlarm(reminder);
    }
    return true;
  }

  async function snoozeReminder(id, minutes) {
    const data = await getData();
    const reminder = data.reminders.find(r => r.id === id);
    if (!reminder) return false;

    reminder.status = 'active';
    reminder.fireAt = Date.now() + (minutes * 60 * 1000);
    reminder.snoozedCount = (reminder.snoozedCount || 0) + 1;
    reminder.lastSnoozedAt = Date.now();
    data.stats.totalSnoozed = (data.stats.totalSnoozed || 0) + 1;
    await saveData(data);

    scheduleAlarm(reminder);
    return true;
  }

  async function deleteReminder(id) {
    const data = await getData();
    const index = data.reminders.findIndex(r => r.id === id);
    if (index === -1) return false;

    const removed = data.reminders.splice(index, 1)[0];
    await saveData(data);
    cancelAlarm(id);

    return removed;
  }

  async function fireReminder(id) {
    const data = await getData();
    const reminder = data.reminders.find(r => r.id === id);
    if (!reminder) return false;

    if (reminder.type === 'once') {
      reminder.status = 'completed';
      data.stats.totalCompleted = (data.stats.totalCompleted || 0) + 1;
      addToHistory(data, { ...reminder, completedAt: Date.now() });
      pruneHistory(data);
      trackSite(data, reminder.hostname);
    } else if (reminder.type === 'recurring') {
      reminder.lastFiredAt = Date.now();
    } else if (reminder.type === 'site') {
      reminder.status = 'completed';
      reminder.siteTriggered = true;
      data.stats.totalCompleted = (data.stats.totalCompleted || 0) + 1;
      addToHistory(data, { ...reminder, completedAt: Date.now() });
      pruneHistory(data);
      trackSite(data, reminder.hostname);
    }

    await saveData(data);
    cancelAlarm(id);
    return true;
  }

  async function getHistory() {
    const data = await getData();
    return (data.history || []).slice(-MAX_HISTORY).reverse();
  }

  async function getStats() {
    const data = await getData();
    const topSites = Object.entries(data.stats.topSites || {})
      .map(([hostname, count]) => ({ hostname, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalSet: data.stats.totalSet || 0,
      totalCompleted: data.stats.totalCompleted || 0,
      totalSnoozed: data.stats.totalSnoozed || 0,
      topSites
    };
  }

  async function getOverdueReminders() {
    const reminders = await getActiveReminders();
    const now = Date.now();
    return reminders.filter(r =>
      r.status === 'active' && r.fireAt && r.fireAt < now
    );
  }

  async function deduplicateReminders(url, withinMs = 60000) {
    const data = await getData();
    const cutoff = Date.now() - withinMs;
    return data.reminders.filter(r =>
      r.url === url &&
      r.createdAt > cutoff &&
      r.status === 'active'
    );
  }

  function scheduleAlarm(reminder) {
    if (!reminder.fireAt) return;
    const delay = Math.max(0, reminder.fireAt - Date.now());
    chrome.alarms.create(ALARM_PREFIX + reminder.id, {
      delayInMinutes: delay / 60000
    });
  }

  function cancelAlarm(id) {
    chrome.alarms.clear(ALARM_PREFIX + id);
  }

  function addToHistory(data, reminder) {
    if (!data.history) data.history = [];
    data.history.push({
      id: reminder.id,
      title: reminder.title,
      url: reminder.url,
      hostname: reminder.hostname,
      message: reminder.message,
      type: reminder.type,
      status: reminder.status,
      createdAt: reminder.createdAt,
      completedAt: reminder.completedAt
    });
  }

  function pruneHistory(data) {
    if (data.history && data.history.length > MAX_HISTORY) {
      data.history = data.history.slice(-MAX_HISTORY);
    }
  }

  function trackSite(data, hostname) {
    if (!hostname) return;
    if (!data.stats.topSites) data.stats.topSites = {};
    data.stats.topSites[hostname] = (data.stats.topSites[hostname] || 0) + 1;
  }

  async function checkOverdueReminders() {
    const overdue = await getOverdueReminders();
    for (const r of overdue) {
      await fireReminder(r.id);
    }
    return overdue;
  }

  return {
    createReminder,
    getAllReminders,
    getActiveReminders,
    pauseReminder,
    resumeReminder,
    snoozeReminder,
    deleteReminder,
    fireReminder,
    getHistory,
    getStats,
    getOverdueReminders,
    deduplicateReminders,
    checkOverdueReminders
  };
})();

if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
  // Already in extension context
} else if (typeof window !== 'undefined') {
  window.ReminderEngine = ReminderEngine;
}
