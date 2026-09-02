(function() {
  let state = null;
  let currentPeriod = '24h';
  let refreshTimer = null;

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    await loadTheme();
    setupEventListeners();
    await loadState();
    await renderAll();
    refreshTimer = setInterval(renderAll, 5000);
  }

  function loadTheme() {
    return new Promise(resolve => {
      chrome.runtime.sendMessage({ type: 'GET_THEME' }, resp => {
        if (resp && resp.theme) {
          document.documentElement.setAttribute('data-theme', resp.theme);
        }
        resolve();
      });
    });
  }

  function loadState() {
    return new Promise(resolve => {
      chrome.runtime.sendMessage({ type: 'GET_CURRENT_STATE' }, resp => {
        state = resp || { totalTabs: 0, totalWindows: 0, incognitoTabs: 0, tabs: [] };
        resolve();
      });
    });
  }

  function setupEventListeners() {
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('exportBtn').addEventListener('click', () => toggleModal('exportModal', true));
    document.getElementById('settingsBtn').addEventListener('click', () => {
      loadSettings();
      toggleModal('settingsModal', true);
    });
    document.getElementById('closeSettings').addEventListener('click', () => toggleModal('settingsModal', false));
    document.getElementById('closeExport').addEventListener('click', () => toggleModal('exportModal', false));
    document.getElementById('saveSettings').addEventListener('click', saveSettings);
    document.getElementById('exportJSON').addEventListener('click', exportJSON);
    document.getElementById('exportCSV').addEventListener('click', exportCSV);
    document.getElementById('clearData').addEventListener('click', clearData);
    document.getElementById('importFile').addEventListener('change', importData);

    document.querySelectorAll('#timePeriodTabs .tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#timePeriodTabs .tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentPeriod = btn.dataset.period;
        renderTimeChart();
      });
    });
  }

  async function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    chrome.runtime.sendMessage({ type: 'SET_THEME', theme: next });
    setTimeout(renderAll, 100);
  }

  function toggleModal(id, show) {
    document.getElementById(id).classList.toggle('hidden', !show);
  }

  async function loadSettings() {
    document.getElementById('trackFocus').checked = await getSetting('trackFocus', true);
    document.getElementById('pruneDays').value = await getSetting('pruneDays', 30);
  }

  function getSetting(key, defaultVal) {
    return new Promise(resolve => {
      chrome.runtime.sendMessage({ type: 'GET_THEME' }, () => resolve(defaultVal));
    });
  }

  async function saveSettings() {
    toggleModal('settingsModal', false);
  }

  async function renderAll() {
    await loadState();
    renderCounters();
    renderTodayStats();
    renderTimeChart();
    renderDomainPieChart();
    renderVisitedBarChart();
    renderHeatmap();
    renderWeeklySummary();
    renderWindowBreakdown();
    renderDomainLeaderboard();
    renderMemoryChart();
    renderFocusTime();
  }

  function renderCounters() {
    document.getElementById('totalTabs').textContent = state.totalTabs;
    document.getElementById('totalWindows').textContent = state.totalWindows;
    document.getElementById('incognitoTabs').textContent = state.incognitoTabs;

    let totalMem = 0;
    for (const tab of state.tabs) {
      totalMem += Analytics.estimateMemory(tab);
    }
    const memStr = totalMem >= 1000 ? (totalMem / 1000).toFixed(1) + ' GB' : totalMem + ' MB';
    document.getElementById('estMemory').textContent = memStr;
  }

  async function renderTodayStats() {
    try {
      const stats = await Analytics.getTodayStats();
      document.getElementById('todayOpened').textContent = stats.tabsOpened;
      document.getElementById('todayClosed').textContent = stats.tabsClosed;
      document.getElementById('todayPeakHour').textContent = stats.mostActiveHourLabel.split(' - ')[0];
    } catch (e) {
      console.error('Today stats error:', e);
    }
  }

  async function renderTimeChart() {
    try {
      const data = await Analytics.getTabsOpenedOverTime(currentPeriod);
      const canvas = document.getElementById('timeChart');
      ChartLib.drawLineChart(canvas, data, {
        labels: data.labels,
        values: data.values,
        height: 160,
        animate: true,
        formatY: v => Math.round(v)
      });
      ChartLib.addTooltip(canvas, 'line');
    } catch (e) {
      console.error('Time chart error:', e);
    }
  }

  async function renderDomainPieChart() {
    try {
      const domainData = await Analytics.getTabsByDomain(state.tabs);
      const canvas = document.getElementById('domainPieChart');
      ChartLib.drawPieChart(canvas, domainData, {
        labels: domainData.map(d => d[0]),
        values: domainData.map(d => d[1]),
        height: 200,
        animate: true
      });
    } catch (e) {
      console.error('Domain pie chart error:', e);
    }
  }

  async function renderVisitedBarChart() {
    try {
      const data = await Analytics.getMostVisitedSites(10);
      const canvas = document.getElementById('visitedBarChart');
      ChartLib.drawBarChart(canvas, data, {
        labels: data.labels,
        values: data.values,
        height: 200,
        horizontal: true,
        animate: true,
        formatY: v => Math.round(v)
      });
    } catch (e) {
      console.error('Visited bar chart error:', e);
    }
  }

  async function renderHeatmap() {
    try {
      const data = await Analytics.getHourlyActivity({ since: Date.now() - 7 * 86400000 });
      const canvas = document.getElementById('heatmapChart');
      ChartLib.drawHeatmap(canvas, data, { height: 160 });
    } catch (e) {
      console.error('Heatmap error:', e);
    }
  }

  async function renderWeeklySummary() {
    try {
      const summary = await Analytics.getWeeklySummary();
      document.getElementById('weekOpened').textContent = summary.thisWeek.created;
      document.getElementById('weekClosed').textContent = summary.thisWeek.closed;
      document.getElementById('lastWeekOpened').textContent = summary.lastWeek.created;
      document.getElementById('lastWeekClosed').textContent = summary.lastWeek.closed;

      const badge = document.getElementById('trendBadge');
      const trend = summary.createdTrend;
      if (trend > 0) {
        badge.textContent = '+' + trend + '%';
        badge.className = 'trend-badge up';
      } else if (trend < 0) {
        badge.textContent = trend + '%';
        badge.className = 'trend-badge down';
      } else {
        badge.textContent = '0%';
        badge.className = 'trend-badge flat';
      }

      const canvas = document.getElementById('weeklyBarChart');
      ChartLib.drawBarChart(canvas, {
        labels: summary.dayLabels,
        values: summary.thisWeek.daily
      }, {
        labels: summary.dayLabels,
        values: summary.thisWeek.daily,
        height: 140,
        barColor: '#6c5ce7',
        animate: true,
        formatY: v => Math.round(v)
      });
    } catch (e) {
      console.error('Weekly summary error:', e);
    }
  }

  async function renderWindowBreakdown() {
    try {
      const windows = await Analytics.getWindowBreakdown(state.tabs);
      const container = document.getElementById('windowBreakdown');
      const maxTabs = Math.max(...windows.map(w => w.count), 1);

      container.innerHTML = windows.map((w, i) => {
        const pct = (w.count / maxTabs * 100).toFixed(0);
        const firstTab = w.tabs.find(t => t.active) || w.tabs[0];
        const title = firstTab ? (firstTab.title || 'Untitled').slice(0, 35) : 'Window ' + (i + 1);
        return `
          <div class="window-item">
            <div class="window-badge ${w.incognito ? 'incognito' : 'normal'}">${w.incognito ? 'PI' : 'W' + (i + 1)}</div>
            <div class="window-info">
              <div class="window-title">${escHtml(title)}</div>
              <div class="window-tabs">${w.count} tab${w.count !== 1 ? 's' : ''} ${w.incognito ? '· incognito' : ''}</div>
            </div>
            <div class="window-bar"><div class="window-bar-fill" style="width:${pct}%"></div></div>
          </div>`;
      }).join('');
    } catch (e) {
      console.error('Window breakdown error:', e);
    }
  }

  async function renderDomainLeaderboard() {
    try {
      const domains = await Analytics.getDomainFrequency({ limit: 10 });
      const container = document.getElementById('domainLeaderboard');

      container.innerHTML = domains.map(([domain, count], i) => {
        const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : 'other';
        return `
          <div class="leaderboard-item">
            <div class="leaderboard-rank ${rankClass}">${i + 1}</div>
            <div class="leaderboard-domain">${escHtml(domain)}</div>
            <div class="leaderboard-count">${count}</div>
          </div>`;
      }).join('') || '<div style="color:var(--text-muted);padding:10px;text-align:center">No data yet</div>';
    } catch (e) {
      console.error('Domain leaderboard error:', e);
    }
  }

  async function renderMemoryChart() {
    try {
      const memSummary = Analytics.windowMemorySummary(state.tabs);
      const canvas = document.getElementById('memoryBarChart');
      ChartLib.drawBarChart(canvas, {
        labels: memSummary.map(m => 'W' + m.windowId),
        values: memSummary.map(m => m.totalMB)
      }, {
        labels: memSummary.map(m => 'Window ' + m.windowId),
        values: memSummary.map(m => m.totalMB),
        height: 160,
        barColor: '#0984e3',
        animate: true,
        formatY: v => Math.round(v) + ' MB'
      });
    } catch (e) {
      console.error('Memory chart error:', e);
    }
  }

  async function renderFocusTime() {
    try {
      const focusData = await Analytics.getFocusTimeData();
      const container = document.getElementById('focusTimeList');
      if (!focusData.length) {
        container.innerHTML = '<div style="color:var(--text-muted);padding:10px;text-align:center;font-size:12px">Focus tracking will appear after using tabs</div>';
        return;
      }
      const maxFocus = Math.max(...focusData.map(f => f.focusSeconds), 1);
      container.innerHTML = focusData.slice(0, 10).map(f => {
        const pct = (f.focusSeconds / maxFocus * 100).toFixed(0);
        const mins = Math.floor(f.focusSeconds / 60);
        const secs = f.focusSeconds % 60;
        const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
        const domain = f.domain || f.title || 'Unknown';
        return `
          <div class="focus-item">
            <div class="focus-domain" title="${escHtml(f.title || f.domain)}">${escHtml(domain.slice(0, 30))}</div>
            <div class="focus-bar"><div class="focus-bar-fill" style="width:${pct}%"></div></div>
            <div class="focus-time">${timeStr}</div>
          </div>`;
      }).join('');
    } catch (e) {
      console.error('Focus time error:', e);
    }
  }

  async function exportJSON() {
    chrome.runtime.sendMessage({ type: 'EXPORT_JSON' }, data => {
      downloadFile(data, 'tabcounter-export.json', 'application/json');
      toggleModal('exportModal', false);
    });
  }

  async function exportCSV() {
    chrome.runtime.sendMessage({ type: 'EXPORT_CSV' }, data => {
      downloadFile(data, 'tabcounter-export.csv', 'text/csv');
      toggleModal('exportModal', false);
    });
  }

  function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function clearData() {
    if (!confirm('Clear all tab counter data? This cannot be undone.')) return;
    chrome.runtime.sendMessage({ type: 'CLEAR_DATA' }, () => {
      toggleModal('exportModal', false);
      renderAll();
    });
  }

  function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(reader.result);
        chrome.runtime.sendMessage({ type: 'IMPORT_DATA', data }, resp => {
          if (resp && resp.ok) {
            toggleModal('exportModal', false);
            renderAll();
          } else {
            alert('Import failed: ' + (resp?.error || 'Unknown error'));
          }
        });
      } catch (err) {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  }

  function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
})();
