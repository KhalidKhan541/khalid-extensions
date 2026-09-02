// Focus Zone Background Service Worker

let activeAlarm = null;
let timerInterval = null;
let tickInterval = null;

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Focus Zone installed');
  
  // Set default settings
  chrome.storage.local.get([
    'blockedSites', 'pomodoroDuration', 'shortBreakDuration', 'longBreakDuration',
    'soundEnabled', 'tickEnabled', 'autoStart', 'dailyGoal', 'sessionsToday',
    'lastSessionDate', 'timerActive', 'timerMode', 'ambientEnabled', 'ambientSound', 'volume'
  ], (result) => {
    const defaults = {
      blockedSites: result.blockedSites || ['youtube.com', 'twitter.com', 'reddit.com'],
      pomodoroDuration: result.pomodoroDuration || 25,
      shortBreakDuration: result.shortBreakDuration || 5,
      longBreakDuration: result.longBreakDuration || 15,
      soundEnabled: result.soundEnabled !== false,
      tickEnabled: result.tickEnabled || false,
      autoStart: result.autoStart || false,
      dailyGoal: result.dailyGoal || 4,
      sessionsToday: result.sessionsToday || 0,
      lastSessionDate: result.lastSessionDate || null,
      timerActive: result.timerActive || false,
      timerMode: result.timerMode || 'pomodoro',
      ambientEnabled: result.ambientEnabled || false,
      ambientSound: result.ambientSound || 'rain',
      volume: result.volume || 50,
      stats: result.stats || { daily: {}, weekly: {}, allTime: 0, streak: 0 }
    };
    
    chrome.storage.local.set(defaults);
  });
});

// Listen for alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name.startsWith('focus-zone-')) {
    handleTimerTick();
  }
});

// Handle timer tick
function handleTimerTick() {
  chrome.storage.local.get(['timerEndTime', 'timerActive'], (result) => {
    if (!result.timerActive || !result.timerEndTime) {
      clearTimer();
      return;
    }

    const now = Date.now();
    const remaining = Math.max(0, result.timerEndTime - now);

    if (remaining <= 0) {
      handleTimerComplete();
      return;
    }

    // Update badge with remaining time
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    const badgeText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    chrome.action.setBadgeText({ text: badgeText });
    chrome.action.setBadgeBackgroundColor({ color: '#00d9ff' });

    // Notify popup and content scripts
    chrome.runtime.sendMessage({
      action: 'timerUpdate',
      timeRemaining: Math.ceil(remaining / 1000)
    }).catch(() => {});

    // Notify content scripts
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'timerUpdate',
          timeRemaining: Math.ceil(remaining / 1000)
        }).catch(() => {});
      });
    });
  });
}

// Handle timer complete
function handleTimerComplete() {
  chrome.storage.local.get(['timerMode', 'soundEnabled', 'autoStart', 'sessionsToday', 'lastSessionDate'], (result) => {
    const mode = result.timerMode || 'pomodoro';
    
    // Clear timer
    clearTimer();

    // Play completion sound
    if (result.soundEnabled !== false) {
      playCompletionSound();
    }

    // Send notification
    if (mode === 'pomodoro') {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'Focus Zone',
        message: 'Great work! Time for a break.',
        priority: 2
      });
    } else {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'Focus Zone',
        message: 'Break over! Ready to focus?',
        priority: 2
      });
    }

    // Update session count if pomodoro completed
    if (mode === 'pomodoro') {
      const today = new Date().toDateString();
      let sessionsToday = result.sessionsToday || 0;
      
      if (result.lastSessionDate === today) {
        sessionsToday++;
      } else {
        sessionsToday = 1;
      }
      
      chrome.storage.local.set({
        sessionsToday: sessionsToday,
        lastSessionDate: today
      });

      // Notify popup
      chrome.runtime.sendMessage({
        action: 'updateSessionCount',
        count: sessionsToday
      }).catch(() => {});
    }

    // Auto-start next session
    if (result.autoStart) {
      setTimeout(() => {
        const nextMode = mode === 'pomodoro' ? 'shortBreak' : 'pomodoro';
        startTimer(nextMode);
      }, 3000);
    }

    // Notify popup
    chrome.runtime.sendMessage({
      action: 'timerComplete'
    }).catch(() => {});

    // Notify content scripts
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'timerComplete'
        }).catch(() => {});
      });
    });
  });
}

// Start timer
function startTimer(mode) {
  chrome.storage.local.get([`${mode}Duration`, 'pomodoroDuration', 'shortBreakDuration', 'longBreakDuration'], (result) => {
    let duration;
    switch (mode) {
      case 'pomodoro':
        duration = (result.pomodoroDuration || 25) * 60 * 1000;
        break;
      case 'shortBreak':
        duration = (result.shortBreakDuration || 5) * 60 * 1000;
        break;
      case 'longBreak':
        duration = (result.longBreakDuration || 15) * 60 * 1000;
        break;
      default:
        duration = 25 * 60 * 1000;
    }

    const endTime = Date.now() + duration;
    
    chrome.storage.local.set({
      timerActive: true,
      timerMode: mode,
      timerEndTime: endTime
    });

    // Create alarm for tick updates
    const alarmName = `focus-zone-${Date.now()}`;
    chrome.alarms.create(alarmName, {
      periodInMinutes: 1/60 // Every second
    });
    activeAlarm = alarmName;

    // Update badge
    chrome.action.setBadgeText({ text: '▶' });
    chrome.action.setBadgeBackgroundColor({ color: '#00ff88' });
  });
}

// Pause timer
function pauseTimer() {
  chrome.storage.local.get(['timerEndTime', 'timerActive'], (result) => {
    if (!result.timerActive) return;
    
    const remaining = Math.max(0, result.timerEndTime - Date.now());
    
    chrome.storage.local.set({
      timerActive: false,
      pausedTime: remaining
    });

    clearTimer();
    
    // Update badge
    chrome.action.setBadgeText({ text: '⏸' });
    chrome.action.setBadgeBackgroundColor({ color: '#ffa502' });
  });
}

// Clear timer
function clearTimer() {
  if (activeAlarm) {
    chrome.alarms.clear(activeAlarm);
    activeAlarm = null;
  }
  
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  chrome.storage.local.set({
    timerActive: false,
    timerEndTime: null
  });

  chrome.action.setBadgeText({ text: '' });
}

// Play completion sound
function playCompletionSound() {
  // Send message to popup to play sound
  chrome.runtime.sendMessage({
    action: 'playCompletionSound'
  }).catch(() => {});
}

// Play tick sound
function playTickSound() {
  chrome.runtime.sendMessage({
    action: 'playTickSound'
  }).catch(() => {});
}

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'startTimer':
      startTimer(message.mode);
      sendResponse({ success: true });
      break;
      
    case 'pauseTimer':
      pauseTimer();
      sendResponse({ success: true });
      break;
      
    case 'resetTimer':
      clearTimer();
      sendResponse({ success: true });
      break;
      
    case 'updateBadge':
      chrome.action.setBadgeText({ text: message.text });
      sendResponse({ success: true });
      break;
      
    case 'clearBadge':
      chrome.action.setBadgeText({ text: '' });
      sendResponse({ success: true });
      break;
      
    case 'startTick':
      if (tickInterval) clearInterval(tickInterval);
      tickInterval = setInterval(playTickSound, 1000);
      sendResponse({ success: true });
      break;
      
    case 'stopTick':
      if (tickInterval) {
        clearInterval(tickInterval);
        tickInterval = null;
      }
      sendResponse({ success: true });
      break;
      
    case 'startAmbient':
    case 'stopAmbient':
    case 'changeAmbient':
    case 'setVolume':
      // These are handled by the popup's sound system
      sendResponse({ success: true });
      break;
      
    default:
      sendResponse({ error: 'Unknown action' });
  }
  
  return true;
});

// Handle notification clicks
chrome.notifications.onClicked.addListener((notificationId) => {
  chrome.notifications.clear(notificationId);
});

// Update badge on startup
chrome.storage.local.get(['timerActive', 'timerEndTime', 'sessionsToday', 'lastSessionDate'], (result) => {
  if (result.timerActive && result.timerEndTime) {
    const remaining = Math.max(0, result.timerEndTime - Date.now());
    if (remaining > 0) {
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      chrome.action.setBadgeText({ text: `${minutes}:${seconds.toString().padStart(2, '0')}` });
      chrome.action.setBadgeBackgroundColor({ color: '#00d9ff' });
    } else {
      handleTimerComplete();
    }
  } else {
    // Show session count
    const today = new Date().toDateString();
    if (result.lastSessionDate === today && result.sessionsToday > 0) {
      chrome.action.setBadgeText({ text: result.sessionsToday.toString() });
      chrome.action.setBadgeBackgroundColor({ color: '#00ff88' });
    }
  }
});
