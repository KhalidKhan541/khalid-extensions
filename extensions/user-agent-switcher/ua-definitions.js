/**
 * User Agent Definitions
 * Contains 50+ user agent strings for Chrome, Firefox, Safari, Edge, Opera
 * across Desktop, Mobile, iOS, and Android platforms.
 */

const UA_CATEGORIES = {
  CHROME: 'Chrome',
  FIREFOX: 'Firefox',
  SAFARI: 'Safari',
  EDGE: 'Edge',
  OPERA: 'Opera',
};

const PLATFORM_TYPES = {
  DESKTOP: 'Desktop',
  MOBILE: 'Mobile',
  IOS: 'iOS',
  ANDROID: 'Android',
};

const USER_AGENTS = [
  // === Chrome Desktop ===
  {
    id: 'chrome-win-120',
    name: 'Chrome 120 (Windows)',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    browser: UA_CATEGORIES.CHROME,
    platform: PLATFORM_TYPES.DESKTOP,
    os: 'Windows',
  },
  {
    id: 'chrome-win-119',
    name: 'Chrome 119 (Windows)',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    browser: UA_CATEGORIES.CHROME,
    platform: PLATFORM_TYPES.DESKTOP,
    os: 'Windows',
  },
  {
    id: 'chrome-mac-120',
    name: 'Chrome 120 (macOS)',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    browser: UA_CATEGORIES.CHROME,
    platform: PLATFORM_TYPES.DESKTOP,
    os: 'macOS',
  },
  {
    id: 'chrome-linux-120',
    name: 'Chrome 120 (Linux)',
    ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    browser: UA_CATEGORIES.CHROME,
    platform: PLATFORM_TYPES.DESKTOP,
    os: 'Linux',
  },
  {
    id: 'chrome-chromeos-120',
    name: 'Chrome 120 (ChromeOS)',
    ua: 'Mozilla/5.0 (X11; CrOS x86_64 15236.80.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    browser: UA_CATEGORIES.CHROME,
    platform: PLATFORM_TYPES.DESKTOP,
    os: 'ChromeOS',
  },
  {
    id: 'chrome-edge-win-120',
    name: 'Chrome 120 (Windows, Edge UA)',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    browser: UA_CATEGORIES.CHROME,
    platform: PLATFORM_TYPES.DESKTOP,
    os: 'Windows',
  },

  // === Chrome Mobile ===
  {
    id: 'chrome-android-120',
    name: 'Chrome 120 (Android)',
    ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    browser: UA_CATEGORIES.CHROME,
    platform: PLATFORM_TYPES.ANDROID,
    os: 'Android 14',
  },
  {
    id: 'chrome-android-samsung',
    name: 'Chrome 120 (Samsung Galaxy S24)',
    ua: 'Mozilla/5.0 (Linux; Android 14; SM-S926B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    browser: UA_CATEGORIES.CHROME,
    platform: PLATFORM_TYPES.ANDROID,
    os: 'Android 14',
  },
  {
    id: 'chrome-android-oneplus',
    name: 'Chrome 120 (OnePlus 12)',
    ua: 'Mozilla/5.0 (Linux; Android 14; PHZ110) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    browser: UA_CATEGORIES.CHROME,
    platform: PLATFORM_TYPES.ANDROID,
    os: 'Android 14',
  },
  {
    id: 'chrome-ios-17',
    name: 'Chrome 120 (iOS 17)',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1',
    browser: UA_CATEGORIES.CHROME,
    platform: PLATFORM_TYPES.IOS,
    os: 'iOS 17',
  },
  {
    id: 'chrome-ios-ipad',
    name: 'Chrome 120 (iPad)',
    ua: 'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1',
    browser: UA_CATEGORIES.CHROME,
    platform: PLATFORM_TYPES.IOS,
    os: 'iPadOS 17',
  },

  // === Firefox Desktop ===
  {
    id: 'firefox-win-121',
    name: 'Firefox 121 (Windows)',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    browser: UA_CATEGORIES.FIREFOX,
    platform: PLATFORM_TYPES.DESKTOP,
    os: 'Windows',
  },
  {
    id: 'firefox-mac-121',
    name: 'Firefox 121 (macOS)',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
    browser: UA_CATEGORIES.FIREFOX,
    platform: PLATFORM_TYPES.DESKTOP,
    os: 'macOS',
  },
  {
    id: 'firefox-linux-121',
    name: 'Firefox 121 (Linux)',
    ua: 'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
    browser: UA_CATEGORIES.FIREFOX,
    platform: PLATFORM_TYPES.DESKTOP,
    os: 'Linux',
  },
  {
    id: 'firefox-linux-debian',
    name: 'Firefox 121 (Debian)',
    ua: 'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
    browser: UA_CATEGORIES.FIREFOX,
    platform: PLATFORM_TYPES.DESKTOP,
    os: 'Linux',
  },
  {
    id: 'firefox-esr-115',
    name: 'Firefox ESR 115 (Windows)',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:115.0) Gecko/20100101 Firefox/115.0',
    browser: UA_CATEGORIES.FIREFOX,
    platform: PLATFORM_TYPES.DESKTOP,
    os: 'Windows',
  },

  // === Firefox Mobile ===
  {
    id: 'firefox-android-121',
    name: 'Firefox 121 (Android)',
    ua: 'Mozilla/5.0 (Android 14; Mobile; rv:121.0) Gecko/121.0 Firefox/121.0',
    browser: UA_CATEGORIES.FIREFOX,
    platform: PLATFORM_TYPES.ANDROID,
    os: 'Android 14',
  },
  {
    id: 'firefox-android-tablet',
    name: 'Firefox 121 (Android Tablet)',
    ua: 'Mozilla/5.0 (Android 14; Tablet; rv:121.0) Gecko/121.0 Firefox/121.0',
    browser: UA_CATEGORIES.FIREFOX,
    platform: PLATFORM_TYPES.ANDROID,
    os: 'Android 14',
  },
  {
    id: 'firefox-ios-17',
    name: 'Firefox 121 (iOS 17)',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/121.0 Mobile/15E148 Safari/605.1.15',
    browser: UA_CATEGORIES.FIREFOX,
    platform: PLATFORM_TYPES.IOS,
    os: 'iOS 17',
  },

  // === Safari Desktop ===
  {
    id: 'safari-mac-17',
    name: 'Safari 17 (macOS Sonoma)',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    browser: UA_CATEGORIES.SAFARI,
    platform: PLATFORM_TYPES.DESKTOP,
    os: 'macOS Sonoma',
  },
  {
    id: 'safari-mac-ventura',
    name: 'Safari 16 (macOS Ventura)',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15',
    browser: UA_CATEGORIES.SAFARI,
    platform: PLATFORM_TYPES.DESKTOP,
    os: 'macOS Ventura',
  },
  {
    id: 'safari-mac-monterey',
    name: 'Safari 15 (macOS Monterey)',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Safari/605.1.15',
    browser: UA_CATEGORIES.SAFARI,
    platform: PLATFORM_TYPES.DESKTOP,
    os: 'macOS Monterey',
  },

  // === Safari iOS ===
  {
    id: 'safari-ios-17',
    name: 'Safari 17 (iOS 17)',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
    browser: UA_CATEGORIES.SAFARI,
    platform: PLATFORM_TYPES.IOS,
    os: 'iOS 17',
  },
  {
    id: 'safari-ios-16',
    name: 'Safari 16 (iOS 16)',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_7_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    browser: UA_CATEGORIES.SAFARI,
    platform: PLATFORM_TYPES.IOS,
    os: 'iOS 16',
  },
  {
    id: 'safari-ipad-17',
    name: 'Safari 17 (iPadOS 17)',
    ua: 'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
    browser: UA_CATEGORIES.SAFARI,
    platform: PLATFORM_TYPES.IOS,
    os: 'iPadOS 17',
  },
  {
    id: 'safari-ipad-16',
    name: 'Safari 16 (iPadOS 16)',
    ua: 'Mozilla/5.0 (iPad; CPU OS 16_7_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    browser: UA_CATEGORIES.SAFARI,
    platform: PLATFORM_TYPES.IOS,
    os: 'iPadOS 16',
  },

  // === Edge Desktop ===
  {
    id: 'edge-win-120',
    name: 'Edge 120 (Windows)',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    browser: UA_CATEGORIES.EDGE,
    platform: PLATFORM_TYPES.DESKTOP,
    os: 'Windows',
  },
  {
    id: 'edge-mac-120',
    name: 'Edge 120 (macOS)',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    browser: UA_CATEGORIES.EDGE,
    platform: PLATFORM_TYPES.DESKTOP,
    os: 'macOS',
  },
  {
    id: 'edge-linux-120',
    name: 'Edge 120 (Linux)',
    ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    browser: UA_CATEGORIES.EDGE,
    platform: PLATFORM_TYPES.DESKTOP,
    os: 'Linux',
  },
  {
    id: 'edge-win-119',
    name: 'Edge 119 (Windows)',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0',
    browser: UA_CATEGORIES.EDGE,
    platform: PLATFORM_TYPES.DESKTOP,
    os: 'Windows',
  },

  // === Edge Mobile ===
  {
    id: 'edge-android-120',
    name: 'Edge 120 (Android)',
    ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 EdgA/120.0.0.0',
    browser: UA_CATEGORIES.EDGE,
    platform: PLATFORM_TYPES.ANDROID,
    os: 'Android 14',
  },
  {
    id: 'edge-ios-17',
    name: 'Edge 120 (iOS 17)',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 EdgiOS/120.0.0.0 Mobile/15E148 Safari/604.1',
    browser: UA_CATEGORIES.EDGE,
    platform: PLATFORM_TYPES.IOS,
    os: 'iOS 17',
  },

  // === Opera Desktop ===
  {
    id: 'opera-win-106',
    name: 'Opera 106 (Windows)',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0',
    browser: UA_CATEGORIES.OPERA,
    platform: PLATFORM_TYPES.DESKTOP,
    os: 'Windows',
  },
  {
    id: 'opera-mac-106',
    name: 'Opera 106 (macOS)',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0',
    browser: UA_CATEGORIES.OPERA,
    platform: PLATFORM_TYPES.DESKTOP,
    os: 'macOS',
  },
  {
    id: 'opera-linux-106',
    name: 'Opera 106 (Linux)',
    ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0',
    browser: UA_CATEGORIES.OPERA,
    platform: PLATFORM_TYPES.DESKTOP,
    os: 'Linux',
  },

  // === Opera Mobile ===
  {
    id: 'opera-android-106',
    name: 'Opera 106 (Android)',
    ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 OPR/77.0.0.0',
    browser: UA_CATEGORIES.OPERA,
    platform: PLATFORM_TYPES.ANDROID,
    os: 'Android 14',
  },
  {
    id: 'opera-mini-android',
    name: 'Opera Mini (Android)',
    ua: 'Opera/9.80 (Android 14; Opera Mini/77.0.4051.70356; U; en) Presto/2.12.423 Version/12.16',
    browser: UA_CATEGORIES.OPERA,
    platform: PLATFORM_TYPES.ANDROID,
    os: 'Android 14',
  },
  {
    id: 'opera-ios-17',
    name: 'Opera Touch (iOS 17)',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
    browser: UA_CATEGORIES.OPERA,
    platform: PLATFORM_TYPES.IOS,
    os: 'iOS 17',
  },

  // === Additional Special UAs ===
  {
    id: 'ie-11',
    name: 'Internet Explorer 11',
    ua: 'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko',
    browser: 'Other',
    platform: PLATFORM_TYPES.DESKTOP,
    os: 'Windows',
  },
  {
    id: 'googlebot',
    name: 'Googlebot',
    ua: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    browser: 'Bot',
    platform: PLATFORM_TYPES.DESKTOP,
    os: 'N/A',
  },
  {
    id: 'bingbot',
    name: 'Bingbot',
    ua: 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
    browser: 'Bot',
    platform: PLATFORM_TYPES.DESKTOP,
    os: 'N/A',
  },
  {
    id: 'curl',
    name: 'cURL',
    ua: 'curl/8.4.0',
    browser: 'Other',
    platform: PLATFORM_TYPES.DESKTOP,
    os: 'N/A',
  },
  {
    id: 'wget',
    name: 'Wget',
    ua: 'Wget/1.21.4',
    browser: 'Other',
    platform: PLATFORM_TYPES.DESKTOP,
    os: 'N/A',
  },
  {
    id: 'python-requests',
    name: 'Python Requests',
    ua: 'python-requests/2.31.0',
    browser: 'Other',
    platform: PLATFORM_TYPES.DESKTOP,
    os: 'N/A',
  },
  {
    id: 'node-fetch',
    name: 'Node.js Fetch',
    ua: 'node-fetch/1.0 (+https://github.com/bitinn/node-fetch)',
    browser: 'Other',
    platform: PLATFORM_TYPES.DESKTOP,
    os: 'N/A',
  },
  {
    id: 'vivaldi-windows',
    name: 'Vivaldi (Windows)',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Vivaldi/6.5.3206.50',
    browser: 'Other',
    platform: PLATFORM_TYPES.DESKTOP,
    os: 'Windows',
  },
  {
    id: 'brave-windows',
    name: 'Brave (Windows)',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    browser: 'Other',
    platform: PLATFORM_TYPES.DESKTOP,
    os: 'Windows',
  },
  {
    id: 'samsung-browser',
    name: 'Samsung Internet (Android)',
    ua: 'Mozilla/5.0 (Linux; Android 14; SM-S926B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36',
    browser: 'Other',
    platform: PLATFORM_TYPES.ANDROID,
    os: 'Android 14',
  },
  {
    id: 'uc-browser-android',
    name: 'UC Browser (Android)',
    ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 UCBrowser/15.5.0.1280',
    browser: 'Other',
    platform: PLATFORM_TYPES.ANDROID,
    os: 'Android 14',
  },
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { USER_AGENTS, UA_CATEGORIES, PLATFORM_TYPES };
}
