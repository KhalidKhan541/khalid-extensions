(function() {
  'use strict';

  // Check if overlay already exists
  if (document.getElementById('focus-zone-overlay')) return;

  // Get current hostname
  const hostname = window.location.hostname;

  // Check if timer is active and site should be blocked
  chrome.storage.local.get(['blockedSites', 'timerActive', 'timerMode'], (result) => {
    const blockedSites = result.blockedSites || [];
    const timerActive = result.timerActive || false;
    const timerMode = result.timerMode || 'pomodoro';

    // Only block during pomodoro sessions
    if (!timerActive || timerMode !== 'pomodoro') return;

    // Check if current site is blocked
    const isBlocked = blockedSites.some(site => {
      return hostname.includes(site) || site.includes(hostname);
    });

    if (!isBlocked) return;

    // Check for cooldown override
    chrome.storage.local.get(['cooldownUntil'], (cooldownResult) => {
      const cooldownUntil = cooldownResult.cooldownUntil || 0;
      if (Date.now() < cooldownUntil) return;

      // Create and show overlay
      createBlockOverlay();
    });
  });

  function createBlockOverlay() {
    // Inject styles if not already present
    if (!document.getElementById('focus-zone-styles')) {
      const link = document.createElement('link');
      link.id = 'focus-zone-styles';
      link.rel = 'stylesheet';
      link.href = chrome.runtime.getURL('blocker.css');
      document.head.appendChild(link);
    }

    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'focus-zone-overlay';
    overlay.innerHTML = `
      <div class="fz-container">
        <div class="fz-particles"></div>
        <div class="fz-content">
          <div class="fz-icon">🎯</div>
          <h1 class="fz-title">Focus Zone Active</h1>
          <p class="fz-subtitle">Stay focused! This site is blocked during your work session.</p>
          
          <div class="fz-timer-info">
            <div class="fz-timer-display">
              <svg class="fz-timer-svg" viewBox="0 0 100 100">
                <circle class="fz-timer-bg" cx="50" cy="50" r="45"></circle>
                <circle class="fz-timer-progress" cx="50" cy="50" r="45" id="fz-timer-progress"></circle>
              </svg>
              <div class="fz-time-remaining" id="fz-time-remaining">25:00</div>
            </div>
            <p class="fz-time-label">Time Remaining</p>
          </div>

          <div class="fz-motivational">
            <p class="fz-quote" id="fz-quote"></p>
          </div>

          <div class="fz-actions">
            <button class="fz-btn fz-btn-primary" id="fz-surf-btn">
              <span class="fz-btn-icon">🌊</span>
              I Really Need This
            </button>
            <p class="fz-cooldown-info" id="fz-cooldown-info"></p>
          </div>

          <div class="fz-stats-mini">
            <div class="fz-stat">
              <span class="fz-stat-value" id="fz-sessions-today">0</span>
              <span class="fz-stat-label">Sessions Today</span>
            </div>
            <div class="fz-stat">
              <span class="fz-stat-value" id="fz-focus-today">0h</span>
              <span class="fz-stat-label">Focus Today</span>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Animate in
    requestAnimationFrame(() => {
      overlay.classList.add('fz-active');
    });

    // Initialize
    initializeOverlay();
  }

  function initializeOverlay() {
    const timeRemainingEl = document.getElementById('fz-time-remaining');
    const timerProgress = document.getElementById('fz-timer-progress');
    const quoteEl = document.getElementById('fz-quote');
    const surfBtn = document.getElementById('fz-surf-btn');
    const cooldownInfo = document.getElementById('fz-cooldown-info');
    const sessionsToday = document.getElementById('fz-sessions-today');
    const focusToday = document.getElementById('fz-focus-today');

    // Motivational quotes
    const quotes = [
      "The only way to do great work is to love what you do. - Steve Jobs",
      "Focus is a matter of deciding what things you're not going to do. - John Carmack",
      "It's not that I'm so smart, it's just that I stay with problems longer. - Albert Einstein",
      "The secret of getting ahead is getting started. - Mark Twain",
      "Don't watch the clock; do what it does. Keep going. - Sam Levenson",
      "Concentrate all your thoughts upon the work at hand. - Alexander Graham Bell",
      "You don't have to see the whole staircase, just take the first step. - Martin Luther King Jr.",
      "Start where you are. Use what you have. Do what you can. - Arthur Ashe",
      "It always seems impossible until it's done. - Nelson Mandela",
      "The way to get started is to quit talking and begin doing. - Walt Disney"
    ];

    // Show random quote
    quoteEl.textContent = `"${quotes[Math.floor(Math.random() * quotes.length)]}"`;

    // Load stats
    chrome.storage.local.get(['sessionsToday', 'todayFocusTime', 'lastSessionDate'], (result) => {
      const today = new Date().toDateString();
      if (result.lastSessionDate === today) {
        sessionsToday.textContent = result.sessionsToday || 0;
        const hours = Math.floor((result.todayFocusTime || 0) / 3600);
        const minutes = Math.floor(((result.todayFocusTime || 0) % 3600) / 60);
        focusToday.textContent = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      }
    });

    // Timer update
    chrome.storage.local.get(['timerEndTime', 'timerActive'], (result) => {
      if (!result.timerActive || !result.timerEndTime) return;

      const circumference = 2 * Math.PI * 45;
      timerProgress.style.strokeDasharray = circumference;

      function updateTimer() {
        const now = Date.now();
        const remaining = Math.max(0, result.timerEndTime - now);
        
        if (remaining <= 0) {
          timeRemainingEl.textContent = "00:00";
          timerProgress.style.strokeDashoffset = circumference;
          return;
        }

        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        timeRemainingEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        const progress = (result.timerEndTime - now) / (result.timerEndTime - (result.timerEndTime - remaining));
        const offset = circumference * (1 - progress);
        timerProgress.style.strokeDashoffset = offset;

        requestAnimationFrame(updateTimer);
      }

      updateTimer();
    });

    // Surf button
    surfBtn.addEventListener('click', () => {
      chrome.storage.local.get(['cooldownUntil', 'cooldownCount'], (result) => {
        const cooldownUntil = result.cooldownUntil || 0;
        
        if (Date.now() < cooldownUntil) {
          const remaining = Math.ceil((cooldownUntil - Date.now()) / 60000);
          cooldownInfo.textContent = `Cooldown active. Try again in ${remaining} minutes.`;
          return;
        }

        // Set 5 minute cooldown
        const newCooldownUntil = Date.now() + 5 * 60 * 1000;
        const newCooldownCount = (result.cooldownCount || 0) + 1;
        
        chrome.storage.local.set({
          cooldownUntil: newCooldownUntil,
          cooldownCount: newCooldownCount
        });

        // Remove overlay
        const overlay = document.getElementById('focus-zone-overlay');
        if (overlay) {
          overlay.classList.remove('fz-active');
          setTimeout(() => overlay.remove(), 300);
        }
      });
    });

    // Update cooldown info
    chrome.storage.local.get(['cooldownUntil'], (result) => {
      const cooldownUntil = result.cooldownUntil || 0;
      if (Date.now() < cooldownUntil) {
        const remaining = Math.ceil((cooldownUntil - Date.now()) / 60000);
        cooldownInfo.textContent = `Cooldown active. Try again in ${remaining} minutes.`;
        surfBtn.disabled = true;
      }
    });

    // Listen for timer updates
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === 'timerComplete') {
        const overlay = document.getElementById('focus-zone-overlay');
        if (overlay) {
          overlay.classList.remove('fz-active');
          setTimeout(() => overlay.remove(), 300);
        }
      } else if (message.action === 'timerUpdate') {
        const remaining = message.timeRemaining;
        const minutes = Math.floor(remaining / 60);
        const seconds = remaining % 60;
        timeRemainingEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }
    });
  }
})();
