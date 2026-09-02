document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const modeBtns = document.querySelectorAll('.mode-btn');
  const timerText = document.querySelector('.timer-text');
  const timerCircle = document.querySelector('.timer-circle');
  const timerProgress = document.querySelector('.timer-progress');
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const resetBtn = document.getElementById('resetBtn');
  const sessionCount = document.getElementById('sessionCount');
  const dailyGoal = document.getElementById('dailyGoal');
  const quoteEl = document.getElementById('quote');
  const quickBlockBtns = document.querySelectorAll('.quick-block-btn');
  const newSiteInput = document.getElementById('newSiteInput');
  const addSiteBtn = document.getElementById('addSiteBtn');
  const blockedSitesList = document.getElementById('blockedSitesList');
  const todayFocus = document.getElementById('todayFocus');
  const weekFocus = document.getElementById('weekFocus');
  const allTimeFocus = document.getElementById('allTimeFocus');
  const currentStreak = document.getElementById('currentStreak');
  const exportStatsBtn = document.getElementById('exportStatsBtn');
  const ambientToggle = document.getElementById('ambientToggle');
  const soundBtns = document.querySelectorAll('.sound-btn');
  const volumeSlider = document.getElementById('volumeSlider');
  const volumeValue = document.getElementById('volumeValue');
  const soundToggle = document.getElementById('soundToggle');
  const tickToggle = document.getElementById('tickToggle');
  const autoStartToggle = document.getElementById('autoStartToggle');
  const dailyGoalInput = document.getElementById('dailyGoalInput');
  const pomodoroDuration = document.getElementById('pomodoroDuration');
  const shortBreakDuration = document.getElementById('shortBreakDuration');
  const longBreakDuration = document.getElementById('longBreakDuration');

  // State
  let currentMode = 'pomodoro';
  let isRunning = false;
  let timeRemaining = 25 * 60;
  let totalTime = 25 * 60;
  let alarmName = null;

  // Motivational quotes
  const quotes = [
    "The secret of getting ahead is getting started. - Mark Twain",
    "Focus is a matter of deciding what things you're not going to do. - John Carmack",
    "It's not that I'm so smart, it's just that I stay with problems longer. - Albert Einstein",
    "The way to get started is to quit talking and begin doing. - Walt Disney",
    "Don't watch the clock; do what it does. Keep going. - Sam Levenson",
    "Concentrate all your thoughts upon the work at hand. - Alexander Graham Bell",
    "You don't have to see the whole staircase, just take the first step. - Martin Luther King Jr.",
    "The only way to do great work is to love what you do. - Steve Jobs",
    "Start where you are. Use what you have. Do what you can. - Arthur Ashe",
    "It always seems impossible until it's done. - Nelson Mandela"
  ];

  // Quick block sites
  const quickSites = ['youtube.com', 'twitter.com', 'reddit.com', 'facebook.com', 'instagram.com'];

  // Initialize
  async function init() {
    await loadSettings();
    await loadBlockedSites();
    await updateStats();
    showRandomQuote();
    updateTimerDisplay();
    updateProgressCircle();
  }

  // Load settings from storage
  async function loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get([
        'blockedSites', 'pomodoroDuration', 'shortBreakDuration', 'longBreakDuration',
        'soundEnabled', 'tickEnabled', 'autoStart', 'dailyGoal', 'sessionsToday',
        'lastSessionDate', 'ambientEnabled', 'ambientSound', 'volume'
      ], (result) => {
        // Update durations
        pomodoroDuration.value = result.pomodoroDuration || 25;
        shortBreakDuration.value = result.shortBreakDuration || 5;
        longBreakDuration.value = result.longBreakDuration || 15;
        
        // Update settings
        soundToggle.checked = result.soundEnabled !== false;
        tickToggle.checked = result.tickEnabled || false;
        autoStartToggle.checked = result.autoStart || false;
        dailyGoalInput.value = result.dailyGoal || 4;
        dailyGoal.textContent = result.dailyGoal || 4;
        
        // Update ambient settings
        ambientToggle.checked = result.ambientEnabled || false;
        const ambientSound = result.ambientSound || 'rain';
        soundBtns.forEach(btn => {
          btn.classList.toggle('active', btn.dataset.sound === ambientSound);
        });
        volumeSlider.value = result.volume || 50;
        volumeValue.textContent = `${result.volume || 50}%`;
        
        // Update session count
        const today = new Date().toDateString();
        if (result.lastSessionDate === today) {
          sessionCount.textContent = result.sessionsToday || 0;
        } else {
          sessionCount.textContent = 0;
        }

        // Set initial timer
        totalTime = (result.pomodoroDuration || 25) * 60;
        timeRemaining = totalTime;

        resolve();
      });
    });
  }

  // Load blocked sites
  async function loadBlockedSites() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['blockedSites'], (result) => {
        const sites = result.blockedSites || [];
        
        // Update quick block buttons
        quickBlockBtns.forEach(btn => {
          const site = btn.dataset.site;
          btn.classList.toggle('blocked', sites.includes(site));
        });
        
        // Update custom sites list
        blockedSitesList.innerHTML = '';
        const customSites = sites.filter(site => !quickSites.includes(site));
        customSites.forEach(site => {
          const li = document.createElement('li');
          li.innerHTML = `
            <span>${site}</span>
            <button class="remove-btn" data-site="${site}">×</button>
          `;
          blockedSitesList.appendChild(li);
        });
        
        // Add remove button listeners
        document.querySelectorAll('.remove-btn').forEach(btn => {
          btn.addEventListener('click', () => removeSite(btn.dataset.site));
        });
        
        resolve(sites);
      });
    });
  }

  // Update statistics display
  async function updateStats() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['stats'], (result) => {
        const stats = result.stats || { daily: {}, weekly: {}, allTime: 0, streak: 0 };
        const statsManager = new StatsManager();
        
        const today = statsManager.formatTime(statsManager.getTodayFocus(stats));
        const week = statsManager.formatTime(statsManager.getWeekFocus(stats));
        const allTime = statsManager.formatTime(stats.allTime);
        const streak = statsManager.calculateStreak(stats);
        
        todayFocus.textContent = today;
        weekFocus.textContent = week;
        allTimeFocus.textContent = allTime;
        currentStreak.textContent = streak;
        
        resolve();
      });
    });
  }

  // Show random quote
  function showRandomQuote() {
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    quoteEl.textContent = `"${randomQuote}"`;
  }

  // Update timer display
  function updateTimerDisplay() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    timerText.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Update badge
    if (isRunning) {
      chrome.runtime.sendMessage({
        action: 'updateBadge',
        text: `${minutes}:${seconds.toString().padStart(2, '0')}`
      });
    }
  }

  // Update progress circle
  function updateProgressCircle() {
    const circumference = 2 * Math.PI * 110;
    const progress = (totalTime - timeRemaining) / totalTime;
    const offset = circumference * progress;
    timerProgress.style.strokeDashoffset = offset;
  }

  // Start timer
  async function startTimer() {
    if (isRunning) return;
    
    isRunning = true;
    timerCircle.classList.add('timer-running');
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    resetBtn.disabled = false;
    
    // Get current settings
    const settings = await new Promise(resolve => {
      chrome.storage.local.get(['soundEnabled', 'tickEnabled'], resolve);
    });
    
    // Create alarm
    alarmName = `focus-zone-${Date.now()}`;
    chrome.alarms.create(alarmName, {
      periodInMinutes: 1/60 // Every second for accurate timing
    });
    
    // Start tick sound if enabled
    if (settings.tickEnabled) {
      chrome.runtime.sendMessage({ action: 'startTick' });
    }
    
    // Notify background
    chrome.runtime.sendMessage({
      action: 'startTimer',
      mode: currentMode,
      duration: timeRemaining,
      alarmName: alarmName
    });
  }

  // Pause timer
  function pauseTimer() {
    if (!isRunning) return;
    
    isRunning = false;
    timerCircle.classList.remove('timer-running');
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    
    // Clear alarm
    if (alarmName) {
      chrome.alarms.clear(alarmName);
      alarmName = null;
    }
    
    // Stop tick sound
    chrome.runtime.sendMessage({ action: 'stopTick' });
    
    // Notify background
    chrome.runtime.sendMessage({ action: 'pauseTimer' });
  }

  // Reset timer
  function resetTimer() {
    pauseTimer();
    timeRemaining = totalTime;
    updateTimerDisplay();
    updateProgressCircle();
    resetBtn.disabled = true;
    
    // Clear badge
    chrome.runtime.sendMessage({ action: 'clearBadge' });
  }

  // Switch mode
  function switchMode(mode) {
    currentMode = mode;
    modeBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.mode === mode));
    
    // Get duration for mode
    chrome.storage.local.get(['pomodoroDuration', 'shortBreakDuration', 'longBreakDuration', 'customDuration'], (result) => {
      switch (mode) {
        case 'pomodoro':
          totalTime = (result.pomodoroDuration || 25) * 60;
          break;
        case 'shortBreak':
          totalTime = (result.shortBreakDuration || 5) * 60;
          break;
        case 'longBreak':
          totalTime = (result.longBreakDuration || 15) * 60;
          break;
        case 'custom':
          totalTime = (result.customDuration || 25) * 60;
          break;
      }
      
      timeRemaining = totalTime;
      updateTimerDisplay();
      updateProgressCircle();
    });
  }

  // Add site to block list
  async function addSite(site) {
    site = site.trim().toLowerCase();
    if (!site) return;
    
    // Remove protocol and www if present
    site = site.replace(/^(https?:\/\/)?(www\.)?/, '');
    // Remove path if present
    site = site.split('/')[0];
    
    chrome.storage.local.get(['blockedSites'], (result) => {
      const sites = result.blockedSites || [];
      if (!sites.includes(site)) {
        sites.push(site);
        chrome.storage.local.set({ blockedSites: sites });
        loadBlockedSites();
      }
    });
    
    newSiteInput.value = '';
  }

  // Remove site from block list
  function removeSite(site) {
    chrome.storage.local.get(['blockedSites'], (result) => {
      const sites = result.blockedSites || [];
      const updatedSites = sites.filter(s => s !== site);
      chrome.storage.local.set({ blockedSites: updatedSites });
      loadBlockedSites();
    });
  }

  // Toggle quick block site
  function toggleQuickBlock(site) {
    chrome.storage.local.get(['blockedSites'], (result) => {
      const sites = result.blockedSites || [];
      let updatedSites;
      
      if (sites.includes(site)) {
        updatedSites = sites.filter(s => s !== site);
      } else {
        updatedSites = [...sites, site];
      }
      
      chrome.storage.local.set({ blockedSites: updatedSites });
      loadBlockedSites();
    });
  }

  // Event Listeners
  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => switchMode(btn.dataset.mode));
  });

  startBtn.addEventListener('click', startTimer);
  pauseBtn.addEventListener('click', pauseTimer);
  resetBtn.addEventListener('click', resetTimer);

  quickBlockBtns.forEach(btn => {
    btn.addEventListener('click', () => toggleQuickBlock(btn.dataset.site));
  });

  addSiteBtn.addEventListener('click', () => addSite(newSiteInput.value));
  newSiteInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addSite(newSiteInput.value);
  });

  exportStatsBtn.addEventListener('click', async () => {
    const statsManager = new StatsManager();
    const stats = await new Promise(resolve => {
      chrome.storage.local.get(['stats'], resolve);
    });
    statsManager.exportCSV(stats.stats || {});
  });

  ambientToggle.addEventListener('change', () => {
    chrome.storage.local.set({ ambientEnabled: ambientToggle.checked });
    chrome.runtime.sendMessage({
      action: ambientToggle.checked ? 'startAmbient' : 'stopAmbient',
      sound: document.querySelector('.sound-btn.active').dataset.sound,
      volume: volumeSlider.value / 100
    });
  });

  soundBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      soundBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      chrome.storage.local.set({ ambientSound: btn.dataset.sound });
      
      if (ambientToggle.checked) {
        chrome.runtime.sendMessage({
          action: 'changeAmbient',
          sound: btn.dataset.sound,
          volume: volumeSlider.value / 100
        });
      }
    });
  });

  volumeSlider.addEventListener('input', () => {
    volumeValue.textContent = `${volumeSlider.value}%`;
    chrome.storage.local.set({ volume: volumeSlider.value });
    
    if (ambientToggle.checked) {
      chrome.runtime.sendMessage({
        action: 'setVolume',
        volume: volumeSlider.value / 100
      });
    }
  });

  soundToggle.addEventListener('change', () => {
    chrome.storage.local.set({ soundEnabled: soundToggle.checked });
  });

  tickToggle.addEventListener('change', () => {
    chrome.storage.local.set({ tickEnabled: tickToggle.checked });
  });

  autoStartToggle.addEventListener('change', () => {
    chrome.storage.local.set({ autoStart: autoStartToggle.checked });
  });

  dailyGoalInput.addEventListener('change', () => {
    const goal = parseInt(dailyGoalInput.value) || 4;
    dailyGoal.textContent = goal;
    chrome.storage.local.set({ dailyGoal: goal });
  });

  // Duration change handlers
  pomodoroDuration.addEventListener('change', () => {
    const duration = parseInt(pomodoroDuration.value) || 25;
    chrome.storage.local.set({ pomodoroDuration: duration });
    if (currentMode === 'pomodoro' && !isRunning) {
      totalTime = duration * 60;
      timeRemaining = totalTime;
      updateTimerDisplay();
      updateProgressCircle();
    }
  });

  shortBreakDuration.addEventListener('change', () => {
    const duration = parseInt(shortBreakDuration.value) || 5;
    chrome.storage.local.set({ shortBreakDuration: duration });
    if (currentMode === 'shortBreak' && !isRunning) {
      totalTime = duration * 60;
      timeRemaining = totalTime;
      updateTimerDisplay();
      updateProgressCircle();
    }
  });

  longBreakDuration.addEventListener('change', () => {
    const duration = parseInt(longBreakDuration.value) || 15;
    chrome.storage.local.set({ longBreakDuration: duration });
    if (currentMode === 'longBreak' && !isRunning) {
      totalTime = duration * 60;
      timeRemaining = totalTime;
      updateTimerDisplay();
      updateProgressCircle();
    }
  });

  // Listen for messages from background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'timerTick') {
      timeRemaining = message.timeRemaining;
      updateTimerDisplay();
      updateProgressCircle();
    } else if (message.action === 'timerComplete') {
      handleTimerComplete();
    } else if (message.action === 'updateSessionCount') {
      sessionCount.textContent = message.count;
    }
  });

  // Handle timer completion
  async function handleTimerComplete() {
    isRunning = false;
    timerCircle.classList.remove('timer-running');
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    
    showRandomQuote();
    
    // Update stats
    if (currentMode === 'pomodoro') {
      const statsManager = new StatsManager();
      await statsManager.recordFocusSession(totalTime);
      await updateStats();
    }
    
    // Auto-start next session if enabled
    const settings = await new Promise(resolve => {
      chrome.storage.local.get(['autoStart'], resolve);
    });
    
    if (settings.autoStart) {
      setTimeout(() => {
        if (currentMode === 'pomodoro') {
          switchMode('shortBreak');
        } else {
          switchMode('pomodoro');
        }
        startTimer();
      }, 2000);
    }
  }

  // Initialize
  init();
});
