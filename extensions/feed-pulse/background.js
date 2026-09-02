import { FeedParser } from './feed-parser.js';
import { FeedStorage } from './storage.js';

const ALARM_NAME = 'feed-poll';
const PROXY_THRESHOLD = 3;

chrome.runtime.onInstalled.addListener(async () => {
  console.log('FeedPulse installed');
  await chrome.alarms.create(ALARM_NAME, { periodInMinutes: 15 });
  await pollAllFeeds();
});

chrome.runtime.onStartup.addListener(async () => {
  await chrome.alarms.create(ALARM_NAME, { periodInMinutes: 15 });
  await pollAllFeeds();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) {
    await pollAllFeeds();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'POLL_FEEDS') {
    pollAllFeeds().then(() => sendResponse({ success: true }));
    return true;
  }
  if (message.type === 'FETCH_FEED') {
    fetchSingleFeed(message.url, message.feedId)
      .then(result => sendResponse({ success: true, result }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
  if (message.type === 'DISCOVER_FEEDS') {
    FeedParser.discoverFeeds(message.url)
      .then(feeds => sendResponse({ success: true, feeds }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
  if (message.type === 'GET_UNREAD') {
    FeedStorage.getTotalUnread().then(count => sendResponse({ count }));
    return true;
  }
});

async function pollAllFeeds() {
  try {
    const feeds = await FeedStorage.getFeeds();
    const settings = await FeedStorage.getSettings();
    let totalNew = 0;

    for (const feed of feeds) {
      try {
        const newCount = await fetchSingleFeed(feed.url, feed.id, feed);
        totalNew += newCount;
      } catch (e) {
        console.warn(`Failed to poll feed ${feed.title}:`, e.message);
      }
    }

    if (totalNew > 0 && settings.showNotifications) {
      chrome.notifications.create('new-articles-' + Date.now(), {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'FeedPulse',
        message: `${totalNew} new article${totalNew > 1 ? 's' : ''} from your feeds`,
        priority: 1
      });
    }

    await updateBadge();
    await FeedStorage.pruneArticles();
  } catch (e) {
    console.error('Error polling feeds:', e);
  }
}

async function fetchSingleFeed(url, feedId, existingFeed = null) {
  const feeds = await FeedStorage.getFeeds();
  const feed = existingFeed || feeds.find(f => f.id === feedId);
  if (!feed) return 0;

  let feedData;
  let failedAttempts = feed.failedAttempts || 0;

  try {
    feedData = await FeedParser.fetchFeed(url, false);
    failedAttempts = 0;
  } catch (e) {
    failedAttempts++;
    if (failedAttempts >= PROXY_THRESHOLD) {
      try {
        feedData = await FeedParser.fetchFeed(url, true);
        failedAttempts = 0;
      } catch (e2) {
        await FeedStorage.updateFeed(feedId, {
          failedAttempts,
          lastError: e2.message
        });
        throw e2;
      }
    } else {
      await FeedStorage.updateFeed(feedId, { failedAttempts });
      throw e;
    }
  }

  if (feedData) {
    const updates = {
      title: feedData.title || feed.title,
      description: feedData.description || feed.description,
      image: feedData.image || feed.image,
      lastFetched: Date.now(),
      lastError: null,
      failedAttempts: 0
    };
    await FeedStorage.updateFeed(feedId, updates);

    const added = await FeedStorage.addArticles(feedId, feedData.articles);
    await FeedStorage.updateFeedUnreadCount(feedId);
    return added;
  }
  return 0;
}

async function updateBadge() {
  const count = await FeedStorage.getTotalUnread();
  if (count > 0) {
    chrome.action.setBadgeText({ text: count > 999 ? '999+' : count.toString() });
    chrome.action.setBadgeBackgroundColor({ color: '#e53e3e' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

updateBadge().catch(() => {});
