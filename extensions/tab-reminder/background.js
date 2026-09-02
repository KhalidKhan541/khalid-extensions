(() => {
  'use strict';

  const ALARM_PREFIX = 'tab_reminder_';
  const BADGE_UPDATE_INTERVAL = 15000;
  const SITE_CHECK_DEBOUNCE = 1000;

  let siteCheckTimeout = null;

  chrome.runtime.onInstalled.addListener(() => {
    setupContextMenus();
    initBadge();
    migrateLegacyData();
  });

  chrome.runtime.onStartup.addListener(() => {
    initBadge();
    rescheduleAllAlarms();
  });

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (!alarm.name.startsWith(ALARM_PREFIX)) return;
    const reminderId = alarm.name.replace(ALARM_PREFIX, '');
    handleAlarmFired(reminderId);
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete' || !tab.url) return;

    clearTimeout(siteCheckTimeout);
    siteCheckTimeout = setTimeout(() => {
      checkSiteBasedReminders(tab);
    }, SITE_CHECK_DEBOUNCE);
  });

  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'tab-reminder-add') {
      chrome.action.openPopup();
    }
  });

  chrome.notifications.onClicked.addListener((notificationId) => {
    if (!notificationId.startsWith(ALARM_PREFIX)) return;
    const reminderId = notificationId.replace(ALARM_PREFIX, '');
    handleNotificationClicked(reminderId);
  });

  chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    if (!notificationId.startsWith(ALARM_PREFIX)) return;
    const reminderId = notificationId.replace(ALARM_PREFIX, '');
    if (buttonIndex === 0) {
      snoozeFromNotification(reminderId, 5);
    } else if (buttonIndex === 1) {
      dismissNotification(reminderId);
    }
  });

  function setupContextMenus() {
    chrome.contextMenus.create({
      id: 'tab-reminder-add',
      title: 'Set Tab Reminder',
      contexts: ['page', 'link']
    });
  }

  async function initBadge() {
    const reminders = await ReminderEngine.getActiveReminders();
    const activeReminders = reminders.filter(r => r.status === 'active' && r.fireAt);
    if (activeReminders.length > 0) {
      const next = activeReminders.reduce((min, r) => r.fireAt < min.fireAt ? r : min);
      const remaining = next.fireAt - Date.now();
      if (remaining > 0) {
        updateBadgeTime(remaining);
      }
    }
    updateBadgeCount(reminders.length);
  }

  function updateBadgeTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const hours = Math.floor(minutes / 60);
    let text;
    if (hours > 24) {
      text = `${Math.floor(hours / 24)}d`;
    } else if (hours > 0) {
      text = `${hours}h`;
    } else {
      text = `${minutes}m`;
    }
    chrome.action.setBadgeText({ text });
    chrome.action.setBadgeBackgroundColor({ color: '#007aff' });
  }

  function updateBadgeCount(count) {
    if (count === 0) {
      chrome.action.setBadgeText({ text: '' });
    }
  }

  setInterval(async () => {
    const reminders = await ReminderEngine.getActiveReminders();
    const activeReminders = reminders.filter(r => r.status === 'active' && r.fireAt);
    if (activeReminders.length > 0) {
      const next = activeReminders.reduce((min, r) => r.fireAt < min.fireAt ? r : min);
      const remaining = next.fireAt - Date.now();
      if (remaining > 0) {
        updateBadgeTime(remaining);
      } else {
        chrome.action.setBadgeText({ text: '!' });
        chrome.action.setBadgeBackgroundColor({ color: '#ff3b30' });
      }
    }
  }, BADGE_UPDATE_INTERVAL);

  async function handleAlarmFired(reminderId) {
    const reminders = await ReminderEngine.getAllReminders();
    const reminder = reminders.find(r => r.id === reminderId);
    if (!reminder || reminder.status !== 'active') return;

    await ReminderEngine.fireReminder(reminderId);

    if (reminder.notifyType === 'popup' || !reminder.notifyType) {
      showDesktopNotification(reminder);
    }

    notifyContentScript(reminder);

    if (reminder.type === 'recurring' && reminder.status !== 'completed') {
      const updatedReminders = await ReminderEngine.getAllReminders();
      const updated = updatedReminders.find(r => r.id === reminderId);
      if (updated && updated.status === 'active') {
        scheduleAlarm(updated);
      }
    }

    updateBadgeCount((await ReminderEngine.getActiveReminders()).length);
  }

  async function showDesktopNotification(reminder) {
    const notificationId = ALARM_PREFIX + reminder.id;
    const iconUrl = reminder.favicon || chrome.runtime.getURL('icons/icon128.png');

    chrome.notifications.create(notificationId, {
      type: 'basic',
      iconUrl,
      title: reminder.title || 'Tab Reminder',
      message: reminder.message || 'Time is up!',
      priority: 2,
      requireInteraction: true,
      buttons: [
        { title: 'Snooze 5 min' },
        { title: 'Dismiss' }
      ]
    });

    if (reminder.notifyType === 'sound' || !reminder.notifyType) {
      playNotificationSound(reminder);
    }

    if (reminder.autoCloseTab && reminder.tabId) {
      setTimeout(async () => {
        try {
          await chrome.tabs.remove(reminder.tabId);
        } catch (e) {}
      }, 5000);
    }
  }

  function notifyContentScript(reminder) {
    if (!reminder.tabId) return;
    chrome.tabs.sendMessage(reminder.tabId, {
      type: 'REMINDER_FIRED',
      reminder
    }).catch(() => {});
  }

  async function handleNotificationClicked(reminderId) {
    const reminders = await ReminderEngine.getAllReminders();
    const reminder = reminders.find(r => r.id === reminderId);
    if (!reminder) return;

    if (reminder.tabId) {
      try {
        await chrome.tabs.update(reminder.tabId, { active: true });
        chrome.windows.update(
          (await chrome.tabs.get(reminder.tabId)).windowId,
          { focused: true }
        );
      } catch (e) {}
    }

    chrome.notifications.clear(ALARM_PREFIX + reminderId);
  }

  async function snoozeFromNotification(reminderId, minutes) {
    await ReminderEngine.snoozeReminder(reminderId, minutes);
    chrome.notifications.clear(ALARM_PREFIX + reminderId);
  }

  async function dismissNotification(reminderId) {
    chrome.notifications.clear(ALARM_PREFIX + reminderId);
  }

  function scheduleAlarm(reminder) {
    if (!reminder.fireAt) return;
    const delay = Math.max(0, reminder.fireAt - Date.now());
    chrome.alarms.create(ALARM_PREFIX + reminder.id, {
      delayInMinutes: delay / 60000
    });
  }

  async function rescheduleAllAlarms() {
    const reminders = await ReminderEngine.getActiveReminders();
    for (const r of reminders) {
      if (r.status === 'active' && r.fireAt) {
        scheduleAlarm(r);
      }
    }
  }

  async function checkSiteBasedReminders(tab) {
    if (!tab.url || tab.url.startsWith('chrome://')) return;

    const hostname = new URL(tab.url).hostname;
    const reminders = await ReminderEngine.getActiveReminders();
    const siteReminders = reminders.filter(r =>
      r.type === 'site' &&
      r.status === 'active' &&
      r.hostname === hostname
    );

    for (const r of siteReminders) {
      await ReminderEngine.fireReminder(r.id);
      showDesktopNotification({ ...r, tabId: tab.id });
      notifyContentScript({ ...r, tabId: tab.id, shakeTab: r.shakeTab });
    }
  }

  async function migrateLegacyData() {
    try {
      const data = await chrome.storage.local.get('reminders');
      if (data.reminders && !Array.isArray(data.reminders)) {
        await chrome.storage.local.set({ reminders: Object.values(data.reminders) });
      }
    } catch (e) {}
  }

  function playNotificationSound(reminder) {
    chrome.tabs.sendMessage(reminder.tabId || 0, {
      type: 'PLAY_SOUND',
      soundType: 'default'
    }).catch(() => {
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 800;
        gain.gain.value = 0.3;
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.stop(ctx.currentTime + 0.5);
      } catch (e) {}
    });
  }
})();
