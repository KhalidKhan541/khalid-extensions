(() => {
  'use strict';

  const TOAST_DURATION = 8000;
  const BANNER_DURATION = 15000;
  const OVERLAY_DURATION = 10000;

  let activeBanners = new Set();
  let activeOverlays = new Set();

  injectContentStyles();

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'REMINDER_FIRED') {
      handleReminderFired(message.reminder);
      sendResponse({ received: true });
    }
    if (message.type === 'REMINDER_CANCELLED') {
      removeBanner(message.reminderId);
      removeOverlay(message.reminderId);
      sendResponse({ received: true });
    }
    return true;
  });

  function handleReminderFired(reminder) {
    if (reminder.shakeTab !== false) {
      shakeTab();
    }

    if (reminder.notifyType === 'popup' || !reminder.notifyType) {
      showBanner(reminder);
    } else if (reminder.notifyType === 'highlight') {
      flashTab();
      showToast(reminder);
    } else if (reminder.notifyType === 'sound') {
      showToast(reminder);
    }

    if (reminder.autoCloseTab) {
      setTimeout(() => {
        try {
          window.close();
        } catch (e) {}
      }, 5000);
    }
  }

  function shakeTab() {
    document.body.style.transition = 'transform 0.1s';
    let count = 0;
    const maxShakes = 6;
    const interval = setInterval(() => {
      if (count >= maxShakes) {
        document.body.style.transform = '';
        clearInterval(interval);
        return;
      }
      const offset = count % 2 === 0 ? -4 : 4;
      document.body.style.transform = `translateX(${offset}px)`;
      count++;
    }, 80);
  }

  function flashTab() {
    const overlay = document.createElement('div');
    overlay.className = 'tab-reminder-flash-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,122,255,0.15);
      z-index: 2147483647;
      pointer-events: none;
      animation: tabReminderFlash 0.5s ease 3;
    `;
    document.body.appendChild(overlay);
    setTimeout(() => overlay.remove(), 2000);
  }

  function showBanner(reminder) {
    if (activeBanners.has(reminder.id)) return;
    activeBanners.add(reminder.id);

    const banner = document.createElement('div');
    banner.className = 'tab-reminder-banner';
    banner.setAttribute('data-reminder-id', reminder.id);
    banner.innerHTML = `
      <div class="tab-reminder-banner-icon">⏰</div>
      <div class="tab-reminder-banner-content">
        <div class="tab-reminder-banner-title">${escapeHtml(reminder.title || 'Reminder')}</div>
        ${reminder.message ? `<div class="tab-reminder-banner-message">${escapeHtml(reminder.message)}</div>` : ''}
        <div class="tab-reminder-banner-time">${new Date().toLocaleTimeString()}</div>
      </div>
      <div class="tab-reminder-banner-actions">
        <button class="tab-reminder-banner-btn dismiss" data-id="${reminder.id}">Dismiss</button>
        <button class="tab-reminder-banner-btn snooze" data-id="${reminder.id}">Snooze 5m</button>
      </div>
    `;

    document.body.appendChild(banner);

    banner.querySelector('.dismiss').addEventListener('click', () => {
      removeBanner(reminder.id);
      chrome.runtime.sendMessage({ type: 'DISMISS_REMINDER', reminderId: reminder.id });
    });

    banner.querySelector('.snooze').addEventListener('click', () => {
      removeBanner(reminder.id);
      chrome.runtime.sendMessage({ type: 'SNOOZE_REMINDER', reminderId: reminder.id, minutes: 5 });
    });

    setTimeout(() => removeBanner(reminder.id), BANNER_DURATION);
  }

  function removeBanner(id) {
    const banner = document.querySelector(`.tab-reminder-banner[data-reminder-id="${id}"]`);
    if (banner) {
      banner.style.animation = 'tabReminderSlideOut 0.3s ease forwards';
      setTimeout(() => banner.remove(), 300);
    }
    activeBanners.delete(id);
  }

  function showToast(reminder) {
    const toast = document.createElement('div');
    toast.className = 'tab-reminder-toast';
    toast.innerHTML = `
      <div class="tab-reminder-toast-icon">⏰</div>
      <div class="tab-reminder-toast-text">
        <strong>${escapeHtml(reminder.title || 'Reminder')}</strong>
        ${reminder.message ? `<br>${escapeHtml(reminder.message)}` : ''}
      </div>
    `;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #1c1c1e;
      color: white;
      padding: 12px 16px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      gap: 10px;
      z-index: 2147483647;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      animation: tabReminderToastIn 0.3s ease;
      font-size: 13px;
      max-width: 350px;
      cursor: pointer;
    `;
    document.body.appendChild(toast);
    toast.addEventListener('click', () => {
      toast.style.animation = 'tabReminderToastOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    });
    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.animation = 'tabReminderToastOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
      }
    }, TOAST_DURATION);
  }

  function showCountdownOverlay(reminder) {
    if (activeOverlays.has(reminder.id)) return;
    activeOverlays.add(reminder.id);

    const overlay = document.createElement('div');
    overlay.className = 'tab-reminder-countdown-overlay';
    overlay.setAttribute('data-reminder-id', reminder.id);

    const targetTime = reminder.fireAt;
    const totalTime = targetTime - reminder.createdAt;
    const radius = 50;
    const circumference = 2 * Math.PI * radius;

    overlay.innerHTML = `
      <div class="tab-reminder-countdown-circle">
        <svg viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="${radius}" fill="none" stroke="#e8e8ed" stroke-width="6"/>
          <circle cx="60" cy="60" r="${radius}" fill="none" stroke="#007aff" stroke-width="6"
            stroke-dasharray="${circumference}" stroke-dashoffset="0"
            transform="rotate(-90 60 60)" class="countdown-progress"/>
        </svg>
        <div class="countdown-text">--:--</div>
      </div>
    `;

    overlay.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      z-index: 2147483647;
      pointer-events: none;
    `;

    document.body.appendChild(overlay);

    const updateInterval = setInterval(() => {
      const remaining = targetTime - Date.now();
      if (remaining <= 0) {
        clearInterval(updateInterval);
        removeOverlay(reminder.id);
        return;
      }
      const progress = 1 - (remaining / totalTime);
      const offset = circumference * (1 - progress);
      const progressCircle = overlay.querySelector('.countdown-progress');
      const textEl = overlay.querySelector('.countdown-text');
      if (progressCircle) progressCircle.style.strokeDashoffset = offset;
      if (textEl) textEl.textContent = formatTime(remaining);
    }, 1000);

    overlay._interval = updateInterval;
  }

  function removeOverlay(id) {
    const overlay = document.querySelector(`.tab-reminder-countdown-overlay[data-reminder-id="${id}"]`);
    if (overlay) {
      if (overlay._interval) clearInterval(overlay._interval);
      overlay.remove();
    }
    activeOverlays.delete(id);
  }

  function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }

  function injectContentStyles() {
    if (document.getElementById('tab-reminder-content-styles')) return;
    const style = document.createElement('style');
    style.id = 'tab-reminder-content-styles';
    style.textContent = `
      @keyframes tabReminderFlash {
        0%, 100% { opacity: 0; }
        50% { opacity: 1; }
      }

      @keyframes tabReminderSlideIn {
        from { transform: translateY(-100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }

      @keyframes tabReminderSlideOut {
        from { transform: translateY(0); opacity: 1; }
        to { transform: translateY(-100%); opacity: 0; }
      }

      @keyframes tabReminderToastIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }

      @keyframes tabReminderToastOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }

      .tab-reminder-banner {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: white;
        color: #1d1d1f;
        padding: 14px 20px;
        display: flex;
        align-items: center;
        gap: 14px;
        z-index: 2147483647;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        animation: tabReminderSlideIn 0.3s ease;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        border-bottom: 2px solid #007aff;
      }

      @media (prefers-color-scheme: dark) {
        .tab-reminder-banner {
          background: #1c1c1e;
          color: #f5f5f7;
        }
      }

      .tab-reminder-banner-icon {
        font-size: 28px;
        flex-shrink: 0;
      }

      .tab-reminder-banner-content {
        flex: 1;
        min-width: 0;
      }

      .tab-reminder-banner-title {
        font-weight: 600;
        font-size: 14px;
        margin-bottom: 2px;
      }

      .tab-reminder-banner-message {
        font-size: 13px;
        color: #6e6e73;
        margin-bottom: 2px;
      }

      .tab-reminder-banner-time {
        font-size: 11px;
        color: #86868b;
      }

      .tab-reminder-banner-actions {
        display: flex;
        gap: 8px;
        flex-shrink: 0;
      }

      .tab-reminder-banner-btn {
        padding: 6px 14px;
        border: 1px solid #d2d2d7;
        border-radius: 6px;
        background: white;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        transition: 0.2s;
        color: #1d1d1f;
      }

      .tab-reminder-banner-btn:hover {
        border-color: #007aff;
        color: #007aff;
      }

      .tab-reminder-banner-btn.dismiss {
        background: #007aff;
        color: white;
        border-color: #007aff;
      }

      .tab-reminder-banner-btn.dismiss:hover {
        background: #0066d6;
      }

      @media (prefers-color-scheme: dark) {
        .tab-reminder-banner-btn {
          background: #2c2c2e;
          color: #f5f5f7;
          border-color: #48484a;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
})();
