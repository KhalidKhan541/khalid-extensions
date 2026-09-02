(() => {
  'use strict';

  let currentTab = null;
  let activeReminders = [];
  let countdownIntervals = new Map();
  let snoozingReminderId = null;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  function init() {
    loadTheme();
    getCurrentTab();
    setupEventListeners();
    loadActiveReminders();
    loadStats();
    startBadgeUpdate();
  }

  function loadTheme() {
    const saved = localStorage.getItem('tabReminderTheme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeIcon(theme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('tabReminderTheme', next);
    updateThemeIcon(next);
  }

  function updateThemeIcon(theme) {
    const icon = $('#themeToggle .theme-icon');
    icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  async function getCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      currentTab = tab;
      $('#tabTitle').textContent = tab.title || 'Untitled';
      $('#tabUrl').textContent = tab.url || '';
      $('#tabFavicon').src = tab.favIconUrl || '';
      $('#tabFavicon').onerror = () => { $('#tabFavicon').src = ''; };
      const pattern = new URL(tab.url || 'https://example.com').hostname;
      $('#sitePattern').textContent = pattern;
      $('#dateTimePicker').min = new Date().toISOString().slice(0, 16);
    }
  }

  function setupEventListeners() {
    $('#themeToggle').addEventListener('click', toggleTheme);

    $('#statsBtn').addEventListener('click', () => {
      $('#statsPanel').classList.toggle('hidden');
      $('#historyPanel').classList.add('hidden');
      loadStats();
    });

    $('#historyBtn').addEventListener('click', () => {
      $('#historyPanel').classList.toggle('hidden');
      $('#statsPanel').classList.add('hidden');
      loadHistory();
    });

    $$('.close-panel').forEach(btn => {
      btn.addEventListener('click', () => {
        const panelId = btn.getAttribute('data-close');
        $('#' + panelId).classList.add('hidden');
      });
    });

    $$('.type-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.type-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const type = tab.getAttribute('data-type');
        $('#quickButtons').classList.toggle('hidden', type !== 'once');
        $('#customTime').classList.toggle('hidden', type !== 'once');
        $('#recurringOptions').classList.toggle('hidden', type !== 'recurring');
        $('#siteOptions').classList.toggle('hidden', type !== 'site');
        if (type === 'once') {
          $('#dailyTimeRow').classList.add('hidden');
        }
      });
    });

    $$('.quick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.quick-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const minutes = parseInt(btn.getAttribute('data-minutes') || 0);
        const days = parseInt(btn.getAttribute('data-days') || 0);
        const totalMinutes = minutes + (days * 24 * 60);
        const h = Math.floor(totalMinutes / 60) % 24;
        const m = totalMinutes % 60;
        const d = Math.floor(totalMinutes / (24 * 60));
        $('#days').value = d;
        $('#hours').value = h;
        $('#minutes').value = m;
      });
    });

    $('#recurUnit').addEventListener('change', () => {
      const unit = $('#recurUnit').value;
      $('#dailyTimeRow').classList.toggle('hidden', unit !== 'days');
    });

    $('#setReminderBtn').addEventListener('click', createReminder);

    $$('.snooze-btn:not(.cancel)').forEach(btn => {
      btn.addEventListener('click', () => {
        const minutes = parseInt(btn.getAttribute('data-minutes'));
        snoozeReminder(snoozingReminderId, minutes);
      });
    });

    $('#cancelSnooze').addEventListener('click', () => {
      $('#snoozePanel').classList.add('hidden');
      snoozingReminderId = null;
    });
  }

  async function createReminder() {
    if (!currentTab) return;

    const activeType = $('.type-tab.active').getAttribute('data-type');
    let reminder = {
      id: generateId(),
      tabId: currentTab.id,
      url: currentTab.url,
      hostname: new URL(currentTab.url || 'https://example.com').hostname,
      title: currentTab.title || 'Untitled',
      favicon: currentTab.favIconUrl || '',
      message: $('#reminderMessage').value.trim(),
      type: activeType,
      createdAt: Date.now(),
      status: 'active',
      notifyType: document.querySelector('input[name="notifyType"]:checked').value,
      autoCloseTab: $('#autoCloseTab').checked,
      shakeTab: $('#shakeTab').checked,
    };

    if (activeType === 'once') {
      const days = parseInt($('#days').value) || 0;
      const hours = parseInt($('#hours').value) || 0;
      const mins = parseInt($('#minutes').value) || 0;
      const customTime = $('#dateTimePicker').value;

      if (customTime) {
        reminder.fireAt = new Date(customTime).getTime();
      } else {
        const totalMs = ((days * 24 + hours) * 60 + mins) * 60 * 1000;
        if (totalMs <= 0) {
          shakeElement($('#setReminderBtn'));
          return;
        }
        reminder.fireAt = Date.now() + totalMs;
      }
      reminder.remainingMs = reminder.fireAt - Date.now();
    } else if (activeType === 'recurring') {
      const every = parseInt($('#recurEvery').value) || 30;
      const unit = $('#recurUnit').value;
      let intervalMs;
      if (unit === 'minutes') intervalMs = every * 60 * 1000;
      else if (unit === 'hours') intervalMs = every * 60 * 60 * 1000;
      else intervalMs = every * 24 * 60 * 60 * 1000;

      reminder.intervalMs = intervalMs;
      reminder.fireAt = Date.now() + intervalMs;
      reminder.recurUnit = unit;
      reminder.recurEvery = every;
    } else if (activeType === 'site') {
      reminder.fireAt = null;
      reminder.siteTriggered = false;
    }

    await ReminderEngine.createReminder(reminder);
    await loadActiveReminders();
    updateBadgeCount();
    shakeElement($('#setReminderBtn'));
    resetForm();
  }

  function resetForm() {
    $$('.quick-btn').forEach(b => b.classList.remove('active'));
    $('#days').value = 0;
    $('#hours').value = 0;
    $('#minutes').value = 0;
    $('#reminderMessage').value = '';
    $('#dateTimePicker').value = '';
    $('#autoCloseTab').checked = false;
    $('#shakeTab').checked = true;
  }

  async function loadActiveReminders() {
    const reminders = await ReminderEngine.getActiveReminders();
    activeReminders = reminders;
    renderActiveReminders(reminders);
    $('#activeCount').textContent = reminders.length;
  }

  function renderActiveReminders(reminders) {
    const container = $('#activeReminders');
    container.innerHTML = '';

    if (reminders.length === 0) {
      container.innerHTML = `
        <div class="empty-state" id="noActiveReminders">
          <span class="empty-icon">🔔</span>
          <p>No active reminders</p>
        </div>`;
      return;
    }

    reminders.sort((a, b) => (a.fireAt || Infinity) - (b.fireAt || Infinity));

    reminders.forEach(r => {
      const card = document.createElement('div');
      card.className = 'reminder-card' + (r.status === 'paused' ? ' paused' : '');
      card.setAttribute('data-id', r.id);

      const isOverdue = r.fireAt && r.fireAt < Date.now() && r.status === 'active';
      if (isOverdue) card.classList.add('overdue');

      const typeLabel = r.type === 'once' ? 'One-time' :
        r.type === 'recurring' ? `Every ${r.recurEvery} ${r.recurUnit}` : 'On return';

      card.innerHTML = `
        <img class="card-favicon" src="${escapeHtml(r.favicon || '')}" alt="" onerror="this.src=''">
        <div class="card-content">
          <div class="card-title">${escapeHtml(r.title)}</div>
          ${r.message ? `<div class="card-message">${escapeHtml(r.message)}</div>` : ''}
          <div class="card-url">${escapeHtml(r.hostname || r.url)}</div>
          <div class="card-type">${typeLabel}</div>
          <div class="card-countdown" data-id="${r.id}">${formatCountdown(r)}</div>
        </div>
        <div class="card-actions">
          ${r.status === 'active' ? `<button class="card-action-btn pause-btn" data-id="${r.id}" title="Pause">⏸</button>` : ''}
          ${r.status === 'paused' ? `<button class="card-action-btn resume-btn" data-id="${r.id}" title="Resume">▶</button>` : ''}
          <button class="card-action-btn snooze-trigger" data-id="${r.id}" title="Snooze">😴</button>
          <button class="card-action-btn danger delete-btn" data-id="${r.id}" title="Delete">✕</button>
        </div>`;

      container.appendChild(card);
    });

    container.querySelectorAll('.pause-btn').forEach(btn => {
      btn.addEventListener('click', () => pauseReminder(btn.getAttribute('data-id')));
    });

    container.querySelectorAll('.resume-btn').forEach(btn => {
      btn.addEventListener('click', () => resumeReminder(btn.getAttribute('data-id')));
    });

    container.querySelectorAll('.snooze-trigger').forEach(btn => {
      btn.addEventListener('click', () => showSnoozePanel(btn.getAttribute('data-id')));
    });

    container.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteReminder(btn.getAttribute('data-id')));
    });

    startCountdownTimers();
  }

  function startCountdownTimers() {
    countdownIntervals.forEach(id => clearInterval(id));
    countdownIntervals.clear();

    activeReminders.forEach(r => {
      if (r.status !== 'active' || !r.fireAt) return;
      const interval = setInterval(() => {
        const el = document.querySelector(`.card-countdown[data-id="${r.id}"]`);
        if (el) {
          const text = formatCountdown(r);
          el.textContent = text;
          const card = el.closest('.reminder-card');
          if (card && r.fireAt < Date.now()) {
            card.classList.add('overdue');
          }
        }
      }, 1000);
      countdownIntervals.set(r.id, interval);
    });
  }

  function formatCountdown(reminder) {
    if (reminder.status === 'paused') return 'Paused';
    if (reminder.type === 'site') return 'Waiting for visit';
    if (!reminder.fireAt) return '--:--';

    const diff = reminder.fireAt - Date.now();
    if (diff <= 0) return 'OVERDUE';

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    return `${minutes}m ${seconds}s`;
  }

  async function pauseReminder(id) {
    await ReminderEngine.pauseReminder(id);
    await loadActiveReminders();
    updateBadgeCount();
  }

  async function resumeReminder(id) {
    await ReminderEngine.resumeReminder(id);
    await loadActiveReminders();
    updateBadgeCount();
  }

  async function snoozeReminder(id, minutes) {
    await ReminderEngine.snoozeReminder(id, minutes);
    $('#snoozePanel').classList.add('hidden');
    snoozingReminderId = null;
    await loadActiveReminders();
    updateBadgeCount();
  }

  function showSnoozePanel(id) {
    snoozingReminderId = id;
    $('#snoozePanel').classList.remove('hidden');
  }

  async function deleteReminder(id) {
    await ReminderEngine.deleteReminder(id);
    countdownIntervals.delete(id);
    await loadActiveReminders();
    updateBadgeCount();
  }

  async function loadStats() {
    const stats = await ReminderEngine.getStats();
    $('#statTotalSet').textContent = stats.totalSet || 0;
    $('#statTotalCompleted').textContent = stats.totalCompleted || 0;
    $('#statTotalSnoozed').textContent = stats.totalSnoozed || 0;

    const topSitesContainer = $('#topSites');
    const topSites = stats.topSites || [];
    if (topSites.length === 0) {
      topSitesContainer.innerHTML = '<div class="empty-state"><p>No data yet</p></div>';
      return;
    }
    topSitesContainer.innerHTML = topSites.map(s =>
      `<div class="history-item">
        <span class="history-info">
          <span class="history-title">${escapeHtml(s.hostname)}</span>
          <span class="history-time">${s.count} reminders</span>
        </span>
      </div>`
    ).join('');
  }

  async function loadHistory() {
    const history = await ReminderEngine.getHistory();
    const container = $('#historyList');
    if (history.length === 0) {
      container.innerHTML = '<div class="empty-state"><span class="empty-icon">📜</span><p>No history yet</p></div>';
      return;
    }
    container.innerHTML = history.map(h => {
      const statusClass = h.status === 'completed' ? 'completed' :
        h.status === 'snoozed' ? 'snoozed' : 'cancelled';
      return `
        <div class="history-item">
          <span class="history-status ${statusClass}"></span>
          <span class="history-info">
            <span class="history-title">${escapeHtml(h.title)}</span>
            <span class="history-time">${new Date(h.completedAt || h.createdAt).toLocaleString()}</span>
          </span>
        </div>`;
    }).join('');
  }

  async function updateBadgeCount() {
    const reminders = await ReminderEngine.getActiveReminders();
    const count = reminders.length;
    chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
    chrome.action.setBadgeBackgroundColor({ color: '#007aff' });
  }

  function startBadgeUpdate() {
    setInterval(updateBadgeCount, 30000);
    updateBadgeCount();
  }

  function shakeElement(el) {
    el.classList.add('shake');
    setTimeout(() => el.classList.remove('shake'), 500);
  }

  function generateId() {
    return 'rem_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  document.addEventListener('DOMContentLoaded', init);
})();
