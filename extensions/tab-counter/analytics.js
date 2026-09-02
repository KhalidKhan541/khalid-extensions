const Analytics = (() => {
  function domainFromUrl(url) {
    try {
      const u = new URL(url);
      return u.hostname.replace(/^www\./, '');
    } catch { return null; }
  }

  function hourOfDay(ts) {
    return new Date(ts).getHours();
  }

  function dayOfWeek(ts) {
    return new Date(ts).getDay();
  }

  function dateKey(ts) {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function hourKey(ts) {
    const d = new Date(ts);
    return `${dateKey(ts)} ${String(d.getHours()).padStart(2, '0')}:00`;
  }

  function startOfDay(ts) {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  function startOfWeek(ts) {
    const d = new Date(ts);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  async function getDomainFrequency(opts = {}) {
    const events = await TabStorage.getEvents({ type: 'created', since: opts.since });
    const freq = {};
    for (const ev of events) {
      const domain = ev.domain || domainFromUrl(ev.url || '');
      if (domain) freq[domain] = (freq[domain] || 0) + 1;
    }
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, opts.limit || 20);
  }

  async function getTabsByDomain(currentTabs) {
    const freq = {};
    for (const tab of currentTabs) {
      const domain = domainFromUrl(tab.url || '');
      if (domain) freq[domain] = (freq[domain] || 0) + 1;
    }
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);
  }

  async function getHourlyActivity(opts = {}) {
    const since = opts.since || (Date.now() - 7 * 86400000);
    const events = await TabStorage.getEvents({ since });
    const heatmap = Array.from({ length: 7 }, () => new Array(24).fill(0));
    for (const ev of events) {
      const dow = dayOfWeek(ev.timestamp);
      const hod = hourOfDay(ev.timestamp);
      heatmap[dow][hod]++;
    }
    return heatmap;
  }

  async function getTabsOpenedOverTime(period = '24h') {
    const now = Date.now();
    let since, bucketMs, labelFn;
    if (period === '24h') {
      since = now - 86400000;
      bucketMs = 3600000;
      labelFn = ts => new Date(ts).getHours() + ':00';
    } else if (period === '7d') {
      since = now - 7 * 86400000;
      bucketMs = 86400000;
      labelFn = ts => {
        const d = new Date(ts);
        return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()] + ' ' + d.getDate();
      };
    } else {
      since = now - 30 * 86400000;
      bucketMs = 86400000;
      labelFn = ts => {
        const d = new Date(ts);
        return (d.getMonth() + 1) + '/' + d.getDate();
      };
    }
    const events = await TabStorage.getEvents({ type: 'created', since });
    const buckets = {};
    for (const ev of events) {
      const key = Math.floor(ev.timestamp / bucketMs) * bucketMs;
      buckets[key] = (buckets[key] || 0) + 1;
    }
    const fillStart = Math.floor(since / bucketMs) * bucketMs;
    const fillEnd = Math.floor(now / bucketMs) * bucketMs;
    const labels = [];
    const values = [];
    for (let t = fillStart; t <= fillEnd; t += bucketMs) {
      labels.push(labelFn(t));
      values.push(buckets[t] || 0);
    }
    return { labels, values };
  }

  async function getMostVisitedSites(limit = 10) {
    const events = await TabStorage.getEvents({ type: 'activated' });
    const freq = {};
    for (const ev of events) {
      const domain = ev.domain || domainFromUrl(ev.url || '');
      if (domain) freq[domain] = (freq[domain] || 0) + 1;
    }
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, limit);
    return { labels: sorted.map(s => s[0]), values: sorted.map(s => s[1]) };
  }

  async function getTodayStats() {
    const todayStart = startOfDay(Date.now());
    const created = await TabStorage.getEvents({ type: 'created', since: todayStart });
    const removed = await TabStorage.getEvents({ type: 'removed', since: todayStart });
    const activated = await TabStorage.getEvents({ type: 'activated', since: todayStart });

    const hourCounts = new Array(24).fill(0);
    for (const ev of activated) {
      hourCounts[hourOfDay(ev.timestamp)]++;
    }
    const peakHour = hourCounts.indexOf(Math.max(...hourCounts));

    return {
      tabsOpened: created.length,
      tabsClosed: removed.length,
      tabsActivated: activated.length,
      mostActiveHour: peakHour,
      mostActiveHourLabel: `${String(peakHour).padStart(2, '0')}:00 - ${String(peakHour + 1).padStart(2, '0')}:00`
    };
  }

  async function getWeeklySummary() {
    const now = Date.now();
    const thisWeekStart = startOfWeek(now);
    const lastWeekStart = thisWeekStart - 7 * 86400000;

    const thisWeekCreated = await TabStorage.getEvents({ type: 'created', since: thisWeekStart });
    const lastWeekCreated = await TabStorage.getEvents({ type: 'created', since: lastWeekStart });
    const thisWeekRemoved = await TabStorage.getEvents({ type: 'removed', since: thisWeekStart });
    const lastWeekRemoved = await TabStorage.getEvents({ type: 'removed', since: lastWeekStart });

    const thisDaily = new Array(7).fill(0);
    for (const ev of thisWeekCreated) thisDaily[dayOfWeek(ev.timestamp)]++;
    const lastDaily = new Array(7).fill(0);
    for (const ev of lastWeekCreated) lastDaily[dayOfWeek(ev.timestamp)]++;

    const createdTrend = lastWeekCreated.length
      ? ((thisWeekCreated.length - lastWeekCreated.length) / lastWeekCreated.length * 100).toFixed(1)
      : 0;

    return {
      thisWeek: {
        created: thisWeekCreated.length,
        closed: thisWeekRemoved.length,
        daily: thisDaily
      },
      lastWeek: {
        created: lastWeekCreated.length,
        closed: lastWeekRemoved.length,
        daily: lastDaily
      },
      createdTrend: parseFloat(createdTrend),
      dayLabels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    };
  }

  async function getWindowBreakdown(tabs) {
    const windows = {};
    for (const tab of tabs) {
      const wid = tab.windowId;
      if (!windows[wid]) windows[wid] = { id: wid, count: 0, tabs: [], incognito: tab.incognito };
      windows[wid].count++;
      windows[wid].tabs.push({
        title: tab.title || 'Untitled',
        url: tab.url || '',
        id: tab.id,
        active: tab.active,
        favIconUrl: tab.favIconUrl || '',
        created: tab._created || null
      });
    }
    return Object.values(windows).sort((a, b) => b.count - a.count);
  }

  async function getFocusTimeData() {
    const events = await TabStorage.getEvents({ type: 'focus_update' });
    const focusMap = {};
    for (const ev of events) {
      const key = ev.tabId;
      if (!focusMap[key]) focusMap[key] = { total: 0, domain: ev.domain || '', title: ev.title || '' };
      focusMap[key].total += ev.duration || 0;
    }
    return Object.entries(focusMap)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 20)
      .map(([tabId, data]) => ({
        tabId: parseInt(tabId),
        domain: data.domain,
        title: data.title,
        focusSeconds: Math.round(data.total / 1000)
      }));
  }

  function estimateMemory(tab) {
    let base = 50;
    const url = tab.url || '';
    if (/youtube\.com|netflix\.com|twitch\.tv/.test(url)) base = 350;
    else if (/google\.com\/maps/.test(url)) base = 200;
    else if (/figma\.com|canva\.com/.test(url)) base = 250;
    else if (/docs\.google\.com|notion\.so|airtable\.com/.test(url)) base = 120;
    else if (/mail\.google\.com/.test(url)) base = 150;
    else if (/twitter\.com|x\.com/.test(url)) base = 100;
    else if (/facebook\.com/.test(url)) base = 130;
    else if (/slack\.com/.test(url)) base = 110;
    else if (/github\.com/.test(url)) base = 90;
    else if (/\.pdf$/.test(url)) base = 180;

    if (tab.audible) base += 80;
    if (tab.url && tab.url.startsWith('chrome://')) base = 10;

    const age = tab._created ? (Date.now() - tab._created) : 0;
    base += Math.min(age / 60000, 50);

    return Math.round(base);
  }

  function estimateMemoryForTabs(tabs) {
    const result = [];
    for (const tab of tabs) {
      result.push({
        tabId: tab.id,
        windowId: tab.windowId,
        title: (tab.title || 'Untitled').slice(0, 40),
        url: tab.url || '',
        memoryMB: estimateMemory(tab),
        incognito: tab.incognito
      });
    }
    return result;
  }

  function windowMemorySummary(tabs) {
    const memByWindow = {};
    for (const tab of tabs) {
      const wid = tab.windowId;
      if (!memByWindow[wid]) memByWindow[wid] = { total: 0, count: 0, incognito: tab.incognito };
      const est = estimateMemory(tab);
      memByWindow[wid].total += est;
      memByWindow[wid].count++;
    }
    return Object.entries(memByWindow).map(([wid, d]) => ({
      windowId: parseInt(wid),
      totalMB: d.total,
      avgPerTab: d.count ? Math.round(d.total / d.count) : 0,
      tabCount: d.count,
      incognito: d.incognito
    }));
  }

  async function getTrendData() {
    const now = Date.now();
    const thisWeek = startOfWeek(now);
    const lastWeek = thisWeek - 7 * 86400000;
    const twoWeeksAgo = thisWeek - 14 * 86400000;

    const tw = await TabStorage.getEvents({ type: 'created', since: thisWeek });
    const lw = await TabStorage.getEvents({ type: 'created', since: lastWeek });
    const plw = await TabStorage.getEvents({ type: 'created', since: twoWeeksAgo });
    const lastWeekOnly = lw.filter(e => e.timestamp < thisWeek);

    return {
      thisWeekCount: tw.length,
      lastWeekCount: lastWeekOnly.length,
      twoWeeksAgoCount: plw.length - lastWeekOnly.length,
      weekOverWeekTrend: lastWeekOnly.length
        ? ((tw.length - lastWeekOnly.length) / lastWeekOnly.length * 100).toFixed(1)
        : 0
    };
  }

  async function exportStatsAsJSON() {
    const data = await TabStorage.exportData();
    return JSON.stringify(data, null, 2);
  }

  async function exportStatsAsCSV() {
    const events = await TabStorage.getEvents({ limit: 50000 });
    const headers = ['id', 'type', 'timestamp', 'url', 'domain', 'windowId', 'tabId', 'detail'];
    const rows = [headers.join(',')];
    for (const ev of events) {
      const row = [
        ev.id,
        ev.type,
        new Date(ev.timestamp).toISOString(),
        `"${(ev.url || '').replace(/"/g, '""')}"`,
        ev.domain || '',
        ev.windowId || '',
        ev.tabId || '',
        `"${(ev.detail || '').replace(/"/g, '""')}"`
      ];
      rows.push(row.join(','));
    }
    return rows.join('\n');
  }

  return {
    domainFromUrl, hourOfDay, dayOfWeek, dateKey, hourKey, startOfDay, startOfWeek,
    getDomainFrequency, getTabsByDomain, getHourlyActivity, getTabsOpenedOverTime,
    getMostVisitedSites, getTodayStats, getWeeklySummary, getWindowBreakdown,
    getFocusTimeData, estimateMemory, estimateMemoryForTabs, windowMemorySummary,
    getTrendData, exportStatsAsJSON, exportStatsAsCSV
  };
})();

if (typeof globalThis !== 'undefined') globalThis.Analytics = Analytics;
