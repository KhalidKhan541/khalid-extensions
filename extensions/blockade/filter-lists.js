export class FilterLists {
  constructor() {
    this.easyListEnabled = true;
    this.adDomains = new Set();
    this.trackerDomains = new Set();
    this.cryptominerDomains = new Set();
    this.fingerprinterDomains = new Set();
    this.malwareDomains = new Set();
    this.adPatterns = [];
    this.trackerPatterns = [];
    this.customDomains = new Set();
    this.filterCount = 0;
    this.loaded = false;
  }

  async loadFilters() {
    if (this.loaded) return;

    this.loadBuiltInAdDomains();
    this.loadBuiltInTrackerDomains();
    this.loadBuiltInCryptominerDomains();
    this.loadBuiltInFingerprinterDomains();
    this.loadBuiltInMalwareDomains();
    this.loadBuiltInAdPatterns();
    this.loadBuiltInTrackerPatterns();

    await this.loadEasyList();
    this.loaded = true;
  }

  loadBuiltInAdDomains() {
    const domains = [
      'doubleclick.net',
      'googlesyndication.com',
      'googleadservices.com',
      'adnxs.com',
      'adsrvr.org',
      'advertising.com',
      'adskeeper.com',
      'adsterra.com',
      'buysellads.com',
      'carbonads.com',
      'clickadu.com',
      'propellerads.com',
      'revcontent.com',
      'richmediaads.com',
      'serving-sys.com',
      'trafficjunky.com',
      'tribalfusion.com',
      'exponential.com',
      'outbrain.com',
      'taboola.com',
      'mgid.com',
      'bidvertiser.com',
      'chitika.com',
      'infolinks.com',
      'kontera.com',
      'adbrite.com',
      'adzerk.net',
      'casalemedia.com',
      'indexexchange.com',
      'pubmatic.com',
      'rubiconproject.com',
      'openx.net',
      'sharethrough.com',
      'sonobi.com',
      'spotxchange.com',
      'teads.tv',
      'yieldmo.com',
      'contextweb.com',
      'lijit.com',
      'sovrn.com',
      'meridian.microsoft.com',
      'bingads.microsoft.com',
      'amazon-adsystem.com',
      'media.net',
      'disqusads.com',
      'prebid.adnxs.com',
      'a.vidible.tv',
      'cdn.taboola.com',
      'cdn.outbrain.com',
      'images.taboola.com',
      'widgets.outbrain.com',
      'static.criteo.net',
      'cdn.taboola.com',
      'cdn.outbrain.com'
    ];
    domains.forEach(d => this.adDomains.add(d));
  }

  loadBuiltInTrackerDomains() {
    const domains = [
      'google-analytics.com',
      'googletagmanager.com',
      'googletagservices.com',
      'google.com/pagead',
      'facebook.com/tr',
      'facebook.net',
      'connect.facebook.net',
      'analytics.twitter.com',
      'ads-twitter.com',
      't.co',
      'linkedin.com/insight',
      'bing.com/bat.js',
      'clarity.ms',
      'hotjar.com',
      'mouseflow.com',
      'heap.io',
      'mixpanel.com',
      'segment.io',
      'segment.com',
      'amplitude.com',
      'fullstory.com',
      'logrocket.com',
      'sentry.io',
      'bugsnag.com',
      'rollbar.com',
      'datadoghq.com',
      'newrelic.com',
      'nr-data.net',
      'chartbeat.com',
      'parsely.com',
      'blueconic.net',
      'optimizely.com',
      'adobedtm.com',
      'demdex.net',
      'everesttech.net',
      'doubleclick.net',
      'quantserve.com',
      'scorecardresearch.com',
      'bluekai.com',
      'rubiconproject.com',
      'rubicon.com',
      'tapad.com',
      'turn.com',
      'adform.net',
      'mathtag.com',
      'bidswitch.net',
      'sharethrough.com',
      '=contextweb.com',
      'lijit.com',
      'pubmatic.com',
      'openx.net',
      'casalemedia.com',
      'indexexchange.com',
      'spotxchange.com',
      'teads.tv',
      'yieldmo.com',
      'outbrain.com',
      'taboola.com',
      'mgid.com',
      'zergnet.com',
      'nativo.com',
      'powerinbox.com',
      'web content viewer',
      'chartbeat.net',
      'chartbeat.com',
      'parsely.com',
      'permutive.com',
      'permutive.app',
      'adsrvr.org',
      'eyeota.net',
      'bidswitch.net',
      'crwdcntrl.net',
      'rlcdn.com',
      'adsymptotic.com',
      'adnxs.com',
      'adsrvr.org',
      'bidswitch.net'
    ];
    domains.forEach(d => this.trackerDomains.add(d));
  }

  loadBuiltInCryptominerDomains() {
    const domains = [
      'coin-hive.com',
      'coinhive.com',
      'coin-hive.com',
      'cryptojackingtest.com',
      'jsecoin.com',
      'webminepool.com',
      'minero.pw',
      'minr.pw',
      'authedmine.com',
      'ppoi.org',
      'rocks.io',
      'reauther.com',
      'gridcash.net',
      'ad-miner.com',
      'minero.cc',
      'minero.pw',
      'jsecoin.com',
      'webmine.cz',
      'minero.cc',
      'minero.pw',
      'coinimp.com',
      'www.coinimp.com',
      'miner.pr0gramm.com',
      'crypto-pool.fr',
      'tortoiseshell solutions',
      'monerominer.rocks',
      '2giga.link',
      'webminepool.com',
      'minero.cc',
      'jsecoin.com',
      'coinhive.com',
      'coin-hive.com',
      'authedmine.com',
      'cryptoloot.pro',
      'cryptoloot.com',
      'webassembly.stream',
      'minero.pw',
      'webminepool.com',
      'webmine.cz',
      'monerominer.rocks',
      'coinimp.com',
      'miner.pr0gramm.com'
    ];
    domains.forEach(d => this.cryptominerDomains.add(d));
  }

  loadBuiltInFingerprinterDomains() {
    const domains = [
      'fingerprints.com',
      'fpjs.io',
      'fp.techpunch.com',
      'fingerprintjs.com',
      'browserleaks.com',
      'panopticlick.eff.org',
      'cdn fingerprintjs.com',
      'fp.43z.top',
      'abrahamjuliot.github.io/creepjs',
      'attribute.csdb.cv',
      'ipfrom.me',
      'javascript-browser-fingerprinting.com',
      'valve.github.io',
      'cdn.jsdelivr.net/npm/fingerprintjs',
      'unpkg.com/fingerprintjs',
      'cdn.jsdelivr.net/npm/fingerprintjs2',
      'unpkg.com/fingerprintjs2',
      'github.com/nickytonline/browser-fingerprinting',
      'browserleaks.com/canvas',
      'webglreport.com',
      'clientjs.org',
      'openfpc.org',
      'fpdx.io',
      'csprng.xyz',
      'random-js.org'
    ];
    domains.forEach(d => this.fingerprinterDomains.add(d));
  }

  loadBuiltInMalwareDomains() {
    const domains = [
      'malware.com',
      'phishing.com',
      'virus.com',
      'ransomware.com',
      'trojan.com',
      'spyware.com',
      'adware.com',
      'scam.com',
      'phish.com',
      'malicious.com',
      'evil.com',
      'hack.com',
      'exploit.com',
      'botnet.com',
      'keylogger.com',
      'rootkit.com',
      'backdoor.com',
      'worm.com',
      'cryptolocker.com',
      'wannacry.com',
      'locky.com',
      'cerber.com',
      'zepto.com',
      'dridex.com',
      'zeus.com',
      'tinba.com',
      'kuluoz.com',
      'necurs.com',
      'cutwail.com',
      'rustock.com',
      'storm.com'
    ];
    domains.forEach(d => this.malwareDomains.add(d));
  }

  loadBuiltInAdPatterns() {
    this.adPatterns = [
      '||doubleclick.net^',
      '||googlesyndication.com^',
      '||googleadservices.com^',
      '||adnxs.com^',
      '||adsrvr.org^',
      '||advertising.com^',
      '||adskeeper.com^',
      '||adsterra.com^',
      '||buysellads.com^',
      '||carbonads.com^',
      '||clickadu.com^',
      '||propellerads.com^',
      '||revcontent.com^',
      '||richmediaads.com^',
      '||serving-sys.com^',
      '||trafficjunky.com^',
      '||tribalfusion.com^',
      '||exponential.com^',
      '||outbrain.com^',
      '||taboola.com^',
      '||mgid.com^',
      '||bidvertiser.com^',
      '||chitika.com^',
      '||infolinks.com^',
      '||kontera.com^',
      '||adbrite.com^',
      '||adzerk.net^',
      '||casalemedia.com^',
      '||indexexchange.com^',
      '||pubmatic.com^',
      '||rubiconproject.com^',
      '||openx.net^',
      '||sharethrough.com^',
      '||sonobi.com^',
      '||spotxchange.com^',
      '||teads.tv^',
      '||yieldmo.com^',
      '||contextweb.com^',
      '||lijit.com^',
      '||sovrn.com^',
      '||amazon-adsystem.com^',
      '||media.net^',
      '||disqusads.com^',
      '/ad-banner.',
      '/banner/ad.',
      '/popup/ad.',
      '/ads/banner.',
      'ad.js',
      'ads.js',
      'advertisement.js',
      'advertising.js',
      '/pagead/',
      '/adsense/',
      '/adserver/',
      '/adclick/',
      '/adsense/',
      '/adframe/',
      '/adbanner/',
      '/adserving/',
      '/*banner*ad*',
      '*/*/ads/*',
      '*/*/ad/*',
      '*/ad/*',
      '*/ads/*',
      '/ad?',
      '/ads?',
      '?ad_id=',
      '&ad_id=',
      '/adview?',
      '/adserver?',
      'adcampaign=',
      'adgroup=',
      'adkeyword=',
      'adplacement=',
      'adslot=',
      'adunit=',
      'adzone='
    ];
  }

  loadBuiltInTrackerPatterns() {
    this.trackerPatterns = [
      '||google-analytics.com^',
      '||googletagmanager.com^',
      '||googletagservices.com^',
      '||facebook.com/tr^',
      '||facebook.net^',
      '||connect.facebook.net^',
      '||analytics.twitter.com^',
      '||ads-twitter.com^',
      '||linkedin.com/insight^',
      '||clarity.ms^',
      '||hotjar.com^',
      '||mouseflow.com^',
      '||heap.io^',
      '||mixpanel.com^',
      '||segment.io^',
      '||segment.com^',
      '||amplitude.com^',
      '||fullstory.com^',
      '||logrocket.com^',
      '||sentry.io^',
      '||bugsnag.com^',
      '||rollbar.com^',
      '||datadoghq.com^',
      '||newrelic.com^',
      '||nr-data.net^',
      '||chartbeat.com^',
      '||parsely.com^',
      '||blueconic.net^',
      '||optimizely.com^',
      '||adobedtm.com^',
      '||demdex.net^',
      '||everesttech.net^',
      '||quantserve.com^',
      '||scorecardresearch.com^',
      '||bluekai.com^',
      '||tapad.com^',
      '||turn.com^',
      '||adform.net^',
      '||mathtag.com^',
      '||bidswitch.net^',
      '||crwdcntrl.net^',
      '||rlcdn.com^',
      '||adsymptotic.com^',
      '||eyeota.net^',
      '||permutive.com^',
      '||permutive.app^',
      '/analytics.js',
      '/gtag/',
      '/gtm.js',
      '/tagmanager.',
      '/tracking.',
      '/track.',
      'pixel.gif',
      'pixel.jpg',
      '/beacon/',
      '/collect?',
      '/stats?',
      '/track?',
      '/visitor?',
      '/event?'
    ];
  }

  async loadEasyList() {
    if (!this.easyListEnabled) return;

    try {
      const easyListDomains = [
        'ad.doubleclick.net',
        'pagead2.googlesyndication.com',
        'www.googleadservices.com',
        'ad.turn.com',
        'ads.yahoo.com',
        'ad.yieldmanager.com',
        'ad.yieldmanager.com',
        'b.scorecardresearch.com',
        'pixel.quantserve.com',
        'tags.bluekai.com',
        'adform.net',
        'ads.linkedin.com',
        'bat.bing.com',
        'analytics.twitter.com',
        'platform.twitter.com',
        'connect.facebook.net',
        'static.ads-twitter.com',
        'analytics.tiktok.com',
        'ads.tiktok.com',
        'tracking.mixpanel.com',
        'cdn.segment.com',
        'www.fullstory.com',
        'browser-intake-logs.airbrake.io',
        'js.datadoghq.com',
        'bam.nr-data.net',
        'js-agent.newrelic.com',
        'sb.scorecardresearch.com',
        'cdn.blueconic.net',
        'app.optimizely.com',
        'cdn.demdex.net',
        'cm.everesttech.net',
        'cm.g.doubleclick.net',
        'www.googletagmanager.com',
        'www.googletagservices.com',
        'static.chartbeat.com',
        'www.google-analytics.com',
        'ssl.google-analytics.com',
        'stats.g.doubleclick.net',
        'www.googletagmanager.com',
        'www.googleadservices.com'
      ];
      easyListDomains.forEach(d => this.adDomains.add(d));
      this.filterCount += easyListDomains.length;

      const easyPrivacyDomains = [
        'www.google-analytics.com',
        'ssl.google-analytics.com',
        'analytics.google.com',
        'stats.g.doubleclick.net',
        'www.googletagmanager.com',
        'www.googleadservices.com',
        'connect.facebook.net',
        'analytics.twitter.com',
        'ads-twitter.com',
        'linkedin.com/insight',
        'bat.bing.com',
        'clarity.ms',
        'www.hotjar.com',
        'static.hotjar.com',
        'cdn.mouseflow.com',
        'heapanalytics.com',
        'api.mixpanel.com',
        'cdn.segment.com',
        'www.fullstory.com',
        'rs.fullstory.com',
        'js.datadoghq.com',
        'bam.nr-data.net',
        'browser-intake-datadoghq.com',
        'cdn.blueconic.net',
        'app.optimizely.com',
        'cdn.demdex.net',
        'cm.everesttech.net',
        'tags.bluekai.com',
        'pixel.quantserve.com',
        'sb.scorecardresearch.com',
        'www.chartbeat.com',
        'static.chartbeat.com',
        'cdn.permutive.com',
        'collector.githubapp.com',
        'analytics.plex.tv',
        'stats.wp.com',
        'pixel.wp.com',
        'sb.scorecardresearch.com'
      ];
      easyPrivacyDomains.forEach(d => this.trackerDomains.add(d));
      this.filterCount += easyPrivacyDomains.length;

    } catch (err) {
      console.error('Failed to load EasyList:', err);
    }
  }

  async toggleEasyList(enabled) {
    this.easyListEnabled = enabled;
    this.loaded = false;

    if (enabled) {
      await this.loadFilters();
    } else {
      this.adDomains.clear();
      this.trackerDomains.clear();
      this.cryptominerDomains.clear();
      this.fingerprinterDomains.clear();
      this.malwareDomains.clear();
      this.loadBuiltInAdDomains();
      this.loadBuiltInTrackerDomains();
      this.loadBuiltInCryptominerDomains();
      this.loadBuiltInFingerprinterDomains();
      this.loadBuiltInMalwareDomains();
      this.loaded = true;
    }
  }

  getAdDomains() { return this.adDomains; }
  getTrackerDomains() { return this.trackerDomains; }
  getCryptominerDomains() { return this.cryptominerDomains; }
  getFingerprinterDomains() { return this.fingerprinterDomains; }
  getMalwareDomains() { return this.malwareDomains; }
  getAdPatterns() { return this.adPatterns; }
  getTrackerPatterns() { return this.trackerPatterns; }
  getFilterCount() {
    return this.adDomains.size + this.trackerDomains.size +
           this.cryptominerDomains.size + this.fingerprinterDomains.size +
           this.malwareDomains.size + this.filterCount;
  }
}
