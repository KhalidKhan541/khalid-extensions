document.addEventListener('DOMContentLoaded', () => {
  const globalToggle = document.getElementById('globalToggle');
  const siteToggle = document.getElementById('siteToggle');
  const siteName = document.getElementById('siteName');
  const statusText = document.getElementById('statusText');
  const themeToggle = document.getElementById('themeToggle');
  const easyListToggle = document.getElementById('easyListToggle');
  const filterCount = document.getElementById('filterCount');

  const statTotal = document.getElementById('statTotal');
  const statAds = document.getElementById('statAds');
  const statTrackers = document.getElementById('statTrackers');
  const statToday = document.getElementById('statToday');

  const perfSaved = document.getElementById('perfSaved');
  const perfTime = document.getElementById('perfTime');

  const logContainer = document.getElementById('logContainer');
  const logCount = document.getElementById('logCount');

  const blockDomainInput = document.getElementById('blockDomainInput');
  const addBlockDomain = document.getElementById('addBlockDomain');
  const blockList = document.getElementById('blockList');

  const allowDomainInput = document.getElementById('allowDomainInput');
  const addAllowDomain = document.getElementById('addAllowDomain');
  const allowList = document.getElementById('allowList');

  const clearStats = document.getElementById('clearStats');
  const clearLog = document.getElementById('clearLog');

  const categoryToggles = document.querySelectorAll('.category-toggle');
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  let currentData = null;

  function init() {
    loadPopupData();
    setupEventListeners();
    loadTheme();
  }

  function setupEventListeners() {
    globalToggle.addEventListener('change', () => {
      chrome.runtime.sendMessage({ action: 'toggleGlobal', enabled: globalToggle.checked }, (response) => {
        updateStatusText();
      });
    });

    siteToggle.addEventListener('change', () => {
      chrome.runtime.sendMessage({ action: 'toggleSite', enabled: siteToggle.checked }, (response) => {
        if (response && response.success) {
          updateSiteName();
        }
      });
    });

    themeToggle.addEventListener('click', toggleTheme);

    easyListToggle.addEventListener('change', () => {
      chrome.runtime.sendMessage({ action: 'toggleEasyList', enabled: easyListToggle.checked }, (response) => {
        if (response && response.filterCount !== undefined) {
          filterCount.textContent = response.filterCount;
        }
      });
    });

    categoryToggles.forEach(toggle => {
      toggle.addEventListener('change', () => {
        const category = toggle.dataset.category;
        chrome.runtime.sendMessage({
          action: 'toggleCategory',
          category,
          enabled: toggle.checked
        });
      });
    });

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        btn.classList.add('active');
        const tabId = btn.dataset.tab + 'Tab';
        document.getElementById(tabId).classList.add('active');
      });
    });

    addBlockDomain.addEventListener('click', () => {
      const domain = blockDomainInput.value.trim();
      if (domain) {
        chrome.runtime.sendMessage({ action: 'addToBlockList', domain }, () => {
          blockDomainInput.value = '';
          loadPopupData();
        });
      }
    });

    blockDomainInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        addBlockDomain.click();
      }
    });

    addAllowDomain.addEventListener('click', () => {
      const domain = allowDomainInput.value.trim();
      if (domain) {
        chrome.runtime.sendMessage({ action: 'addToAllowlist', domain }, () => {
          allowDomainInput.value = '';
          loadPopupData();
        });
      }
    });

    allowDomainInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        addAllowDomain.click();
      }
    });

    clearStats.addEventListener('click', () => {
      if (confirm('Clear all statistics?')) {
        chrome.runtime.sendMessage({ action: 'clearStats' }, () => {
          loadPopupData();
        });
      }
    });

    clearLog.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'clearLog' }, () => {
        loadPopupData();
      });
    });
  }

  function loadPopupData() {
    chrome.runtime.sendMessage({ action: 'getPopupData' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error loading data:', chrome.runtime.lastError);
        return;
      }

      if (response) {
        currentData = response;
        updateUI(response);
      }
    });

    chrome.runtime.sendMessage({ action: 'getSiteState' }, (response) => {
      if (response) {
        siteToggle.checked = response.enabled;
        siteName.textContent = response.hostname || '—';
      }
    });
  }

  function updateUI(data) {
    globalToggle.checked = data.globalEnabled;
    updateStatusText();

    easyListToggle.checked = data.categoryEnabled?.ads ?? true;
    filterCount.textContent = data.filterCount || 0;

    categoryToggles.forEach(toggle => {
      const category = toggle.dataset.category;
      toggle.checked = data.categoryEnabled?.[category] ?? true;
    });

    if (data.stats) {
      statTotal.textContent = formatNumber(data.stats.total || 0);
      statAds.textContent = formatNumber(data.stats.ads || 0);
      statTrackers.textContent = formatNumber(data.stats.trackers || 0);

      const today = new Date().toISOString().split('T')[0];
      statToday.textContent = formatNumber(data.stats.today?.[today] || 0);
    }

    const impact = calculatePerformanceImpact(data.stats);
    perfSaved.textContent = formatBytes(impact.bytesSaved);
    perfTime.textContent = formatTime(impact.timeSaved);

    renderBlockList(data.customBlockList || []);
    renderAllowList(data.allowlist || []);
    renderLog(data.blockedLog || []);
  }

  function updateStatusText() {
    statusText.textContent = globalToggle.checked ? 'Protecting your browsing' : 'Blocking disabled';
  }

  function updateSiteName() {
    chrome.runtime.sendMessage({ action: 'getSiteState' }, (response) => {
      if (response) {
        siteName.textContent = response.hostname || '—';
      }
    });
  }

  function renderBlockList(domains) {
    if (domains.length === 0) {
      blockList.innerHTML = '<div class="domain-empty">No custom blocked domains</div>';
      return;
    }

    blockList.innerHTML = domains.map(domain => `
      <div class="domain-item">
        <span class="domain-text">${escapeHtml(domain)}</span>
        <button class="remove-btn" data-domain="${escapeHtml(domain)}" data-list="block">✕</button>
      </div>
    `).join('');

    blockList.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const domain = btn.dataset.domain;
        chrome.runtime.sendMessage({ action: 'removeFromBlockList', domain }, () => {
          loadPopupData();
        });
      });
    });
  }

  function renderAllowList(domains) {
    if (domains.length === 0) {
      allowList.innerHTML = '<div class="domain-empty">No whitelisted domains</div>';
      return;
    }

    allowList.innerHTML = domains.map(domain => `
      <div class="domain-item">
        <span class="domain-text">${escapeHtml(domain)}</span>
        <button class="remove-btn" data-domain="${escapeHtml(domain)}" data-list="allow">✕</button>
      </div>
    `).join('');

    allowList.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const domain = btn.dataset.domain;
        chrome.runtime.sendMessage({ action: 'removeFromAllowlist', domain }, () => {
          loadPopupData();
        });
      });
    });
  }

  function renderLog(log) {
    logCount.textContent = `(${log.length})`;

    if (log.length === 0) {
      logContainer.innerHTML = '<div class="log-empty">No blocked requests yet</div>';
      return;
    }

    const recentLog = log.slice(-20).reverse();
    logContainer.innerHTML = recentLog.map(entry => {
      const time = new Date(entry.timestamp).toLocaleTimeString();
      let displayUrl = entry.url;
      try {
        const urlObj = new URL(entry.url);
        displayUrl = urlObj.hostname + urlObj.pathname;
        if (displayUrl.length > 50) {
          displayUrl = displayUrl.substring(0, 50) + '...';
        }
      } catch {}

      return `
        <div class="log-item">
          <span class="log-url" title="${escapeHtml(entry.url)}">${escapeHtml(displayUrl)}</span>
          <div class="log-meta">
            <span class="log-type">${escapeHtml(entry.type)}</span>
            <span class="log-time">${time}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  function calculatePerformanceImpact(stats) {
    if (!stats) return { bytesSaved: 0, timeSaved: 0 };

    const total = stats.total || 0;
    const bytesSaved = total * 15000;
    const timeSaved = Math.round(total * 0.1);

    return { bytesSaved, timeSaved };
  }

  function formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  }

  function formatBytes(bytes) {
    if (bytes >= 1073741824) {
      return (bytes / 1073741824).toFixed(1) + ' GB';
    }
    if (bytes >= 1048576) {
      return (bytes / 1048576).toFixed(1) + ' MB';
    }
    if (bytes >= 1024) {
      return (bytes / 1024).toFixed(1) + ' KB';
    }
    return bytes + ' B';
  }

  function formatTime(seconds) {
    if (seconds >= 3600) {
      return (seconds / 3600).toFixed(1) + 'h';
    }
    if (seconds >= 60) {
      return (seconds / 60).toFixed(1) + 'm';
    }
    return seconds + 's';
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('blockade-theme', next);
  }

  function loadTheme() {
    const saved = localStorage.getItem('blockade-theme');
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved);
    }
  }

  init();
});
