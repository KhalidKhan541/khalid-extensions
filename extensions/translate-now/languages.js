const LANGUAGES = {
  auto: { code: 'auto', name: 'Auto Detect', native: 'Auto', direction: 'ltr', script: 'latin', family: 'auto' },
  en: { code: 'en', name: 'English', native: 'English', direction: 'ltr', script: 'latin', family: 'germanic' },
  es: { code: 'es', name: 'Spanish', native: 'Español', direction: 'ltr', script: 'latin', family: 'romance' },
  fr: { code: 'fr', name: 'French', native: 'Français', direction: 'ltr', script: 'latin', family: 'romance' },
  de: { code: 'de', name: 'German', native: 'Deutsch', direction: 'ltr', script: 'latin', family: 'germanic' },
  it: { code: 'it', name: 'Italian', native: 'Italiano', direction: 'ltr', script: 'latin', family: 'romance' },
  pt: { code: 'pt', name: 'Portuguese', native: 'Português', direction: 'ltr', script: 'latin', family: 'romance' },
  ru: { code: 'ru', name: 'Russian', native: 'Русский', direction: 'ltr', script: 'cyrillic', family: 'slavic' },
  ja: { code: 'ja', name: 'Japanese', native: '日本語', direction: 'ltr', script: 'cjk', family: 'japonic' },
  ko: { code: 'ko', name: 'Korean', native: '한국어', direction: 'ltr', script: 'hangul', family: 'koreanic' },
  zh: { code: 'zh', name: 'Chinese', native: '中文', direction: 'ltr', script: 'cjk', family: 'sino-tibetan' },
  ar: { code: 'ar', name: 'Arabic', native: 'العربية', direction: 'rtl', script: 'arabic', family: 'semitic' },
  hi: { code: 'hi', name: 'Hindi', native: 'हिन्दी', direction: 'ltr', script: 'devanagari', family: 'indo-aryan' },
  bn: { code: 'bn', name: 'Bengali', native: 'বাংলা', direction: 'ltr', script: 'bengali', family: 'indo-aryan' },
  nl: { code: 'nl', name: 'Dutch', native: 'Nederlands', direction: 'ltr', script: 'latin', family: 'germanic' },
  pl: { code: 'pl', name: 'Polish', native: 'Polski', direction: 'ltr', script: 'latin', family: 'slavic' },
  tr: { code: 'tr', name: 'Turkish', native: 'Türkçe', direction: 'ltr', script: 'latin', family: 'turkic' },
  vi: { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt', direction: 'ltr', script: 'latin', family: 'austro-asiatic' },
  th: { code: 'th', name: 'Thai', native: 'ไทย', direction: 'ltr', script: 'thai', family: 'kra-dai' },
  sv: { code: 'sv', name: 'Swedish', native: 'Svenska', direction: 'ltr', script: 'latin', family: 'germanic' },
  no: { code: 'no', name: 'Norwegian', native: 'Norsk', direction: 'ltr', script: 'latin', family: 'germanic' },
  da: { code: 'da', name: 'Danish', native: 'Dansk', direction: 'ltr', script: 'latin', family: 'germanic' },
  fi: { code: 'fi', name: 'Finnish', native: 'Suomi', direction: 'ltr', script: 'latin', family: 'uralic' },
  el: { code: 'el', name: 'Greek', native: 'Ελληνικά', direction: 'ltr', script: 'greek', family: 'hellenic' },
  he: { code: 'he', name: 'Hebrew', native: 'עברית', direction: 'rtl', script: 'hebrew', family: 'semitic' },
  cs: { code: 'cs', name: 'Czech', native: 'Čeština', direction: 'ltr', script: 'latin', family: 'slavic' },
  ro: { code: 'ro', name: 'Romanian', native: 'Română', direction: 'ltr', script: 'latin', family: 'romance' },
  uk: { code: 'uk', name: 'Ukrainian', native: 'Українська', direction: 'ltr', script: 'cyrillic', family: 'slavic' },
  id: { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia', direction: 'ltr', script: 'latin', family: 'austronesian' },
  ms: { code: 'ms', name: 'Malay', native: 'Bahasa Melayu', direction: 'ltr', script: 'latin', family: 'austronesian' },
  fa: { code: 'fa', name: 'Persian', native: 'فارسی', direction: 'rtl', script: 'arabic', family: 'iranian' },
  sv: { code: 'sv', name: 'Swedish', native: 'Svenska', direction: 'ltr', script: 'latin', family: 'germanic' },
  tl: { code: 'tl', name: 'Filipino', native: 'Filipino', direction: 'ltr', script: 'latin', family: 'austronesian' },
  sw: { code: 'sw', name: 'Swahili', native: 'Kiswahili', direction: 'ltr', script: 'latin', family: 'bantu' },
  ta: { code: 'ta', name: 'Tamil', native: 'தமிழ்', direction: 'ltr', script: 'tamil', family: 'dravidian' },
  te: { code: 'te', name: 'Telugu', native: 'తెలుగు', direction: 'ltr', script: 'telugu', family: 'dravidian' },
  mr: { code: 'mr', name: 'Marathi', native: 'मराठी', direction: 'ltr', script: 'devanagari', family: 'indo-aryan' },
  gu: { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી', direction: 'ltr', script: 'gujarati', family: 'indo-aryan' },
  kn: { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', direction: 'ltr', script: 'kannada', family: 'dravidian' },
  ml: { code: 'ml', name: 'Malayalam', native: 'മലയാളം', direction: 'ltr', script: 'malayalam', family: 'dravidian' },
  my: { code: 'my', name: 'Myanmar', native: 'မြန်မာ', direction: 'ltr', script: 'myanmar', family: 'sino-tibetan' },
  km: { code: 'km', name: 'Khmer', native: 'ភាសាខ្មែរ', direction: 'ltr', script: 'khmer', family: 'austroasiatic' },
  lo: { code: 'lo', name: 'Lao', native: 'ລາວ', direction: 'ltr', script: 'lao', family: 'kra-dai' },
  ne: { code: 'ne', name: 'Nepali', native: 'नेपाली', direction: 'ltr', script: 'devanagari', family: 'indo-aryan' },
  si: { code: 'si', name: 'Sinhala', native: 'සිංහල', direction: 'ltr', script: 'sinhala', family: 'indo-aryan' },
  hr: { code: 'hr', name: 'Croatian', native: 'Hrvatski', direction: 'ltr', script: 'latin', family: 'slavic' },
  sk: { code: 'sk', name: 'Slovak', native: 'Slovenčina', direction: 'ltr', script: 'latin', family: 'slavic' },
  bg: { code: 'bg', name: 'Bulgarian', native: 'Български', direction: 'ltr', script: 'cyrillic', family: 'slavic' },
  hu: { code: 'hu', name: 'Hungarian', native: 'Magyar', direction: 'ltr', script: 'latin', family: 'uralic' },
  lt: { code: 'lt', name: 'Lithuanian', native: 'Lietuvių', direction: 'ltr', script: 'latin', family: 'baltic' },
  lv: { code: 'lv', name: 'Latvian', native: 'Latviešu', direction: 'ltr', script: 'latin', family: 'baltic' },
  et: { code: 'et', name: 'Estonian', native: 'Eesti', direction: 'ltr', script: 'latin', family: 'uralic' },
  sl: { code: 'sl', name: 'Slovenian', native: 'Slovenščina', direction: 'ltr', script: 'latin', family: 'slavic' },
  sr: { code: 'sr', name: 'Serbian', native: 'Српски', direction: 'ltr', script: 'cyrillic', family: 'slavic' },
  bs: { code: 'bs', name: 'Bosnian', native: 'Bosanski', direction: 'ltr', script: 'latin', family: 'slavic' },
  ca: { code: 'ca', name: 'Catalan', native: 'Català', direction: 'ltr', script: 'latin', family: 'romance' },
  eu: { code: 'eu', name: 'Basque', native: 'Euskara', direction: 'ltr', script: 'latin', family: 'isolate' },
  gl: { code: 'gl', name: 'Galician', native: 'Galego', direction: 'ltr', script: 'latin', family: 'romance' },
  af: { code: 'af', name: 'Afrikaans', native: 'Afrikaans', direction: 'ltr', script: 'latin', family: 'germanic' },
  zu: { code: 'zu', name: 'Zulu', native: 'isiZulu', direction: 'ltr', script: 'latin', family: 'bantu' },
  am: { code: 'am', name: 'Amharic', native: 'አማርኛ', direction: 'ltr', script: 'ethiopic', family: 'semitic' },
  ha: { code: 'ha', name: 'Hausa', native: 'Hausa', direction: 'ltr', script: 'latin', family: 'afroasiatic' },
  ig: { code: 'ig', name: 'Igbo', native: 'Igbo', direction: 'ltr', script: 'latin', family: 'niger-congo' },
  yo: { code: 'yo', name: 'Yoruba', native: 'Yorùbá', direction: 'ltr', script: 'latin', family: 'niger-congo' },
  sn: { code: 'sn', name: 'Shona', native: 'chiShona', direction: 'ltr', script: 'latin', family: 'bantu' },
  mg: { code: 'mg', name: 'Malagasy', native: 'Malagasy', direction: 'ltr', script: 'latin', family: 'austronesian' },
  so: { code: 'so', name: 'Somali', native: 'Soomaali', direction: 'ltr', script: 'latin', family: 'afroasiatic' },
  mi: { code: 'mi', name: 'Maori', native: 'Te Reo Māori', direction: 'ltr', script: 'latin', family: 'austronesian' },
  haw: { code: 'haw', name: 'Hawaiian', native: 'ʻŌlelo Hawaiʻi', direction: 'ltr', script: 'latin', family: 'austronesian' },
  cy: { code: 'cy', name: 'Welsh', native: 'Cymraeg', direction: 'ltr', script: 'latin', family: 'celtic' },
  ga: { code: 'ga', name: 'Irish', native: 'Gaeilge', direction: 'ltr', script: 'latin', family: 'celtic' },
  gd: { code: 'gd', name: 'Scottish Gaelic', native: 'Gàidhlig', direction: 'ltr', script: 'latin', family: 'celtic' },
  mt: { code: 'mt', name: 'Maltese', native: 'Malti', direction: 'ltr', script: 'latin', family: 'semitic' },
  is: { code: 'is', name: 'Icelandic', native: 'Íslenska', direction: 'ltr', script: 'latin', family: 'germanic' },
  mk: { code: 'mk', name: 'Macedonian', native: 'Македонски', direction: 'ltr', script: 'cyrillic', family: 'slavic' },
  sq: { code: 'sq', name: 'Albanian', native: 'Shqip', direction: 'ltr', script: 'latin', family: 'indo-european' },
  ka: { code: 'ka', name: 'Georgian', native: 'ქართული', direction: 'ltr', script: 'georgian', family: 'kartvelian' },
  hy: { code: 'hy', name: 'Armenian', native: 'Հայերեն', direction: 'ltr', script: 'armenian', family: 'indo-european' },
  kk: { code: 'kk', name: 'Kazakh', native: 'Қазақ', direction: 'ltr', script: 'cyrillic', family: 'turkic' },
  uz: { code: 'uz', name: 'Uzbek', native: 'Oʻzbek', direction: 'ltr', script: 'latin', family: 'turkic' },
  mn: { code: 'mn', name: 'Mongolian', native: 'Монгол', direction: 'ltr', script: 'cyrillic', family: 'mongolic' },
  ps: { code: 'ps', name: 'Pashto', native: 'پښتو', direction: 'rtl', script: 'arabic', family: 'iranian' },
  ur: { code: 'ur', name: 'Urdu', native: 'اردو', direction: 'rtl', script: 'arabic', family: 'indo-aryan' },
  ku: { code: 'ku', name: 'Kurdish', native: 'Kurdî', direction: 'ltr', script: 'latin', family: 'iranian' },
  tg: { code: 'tg', name: 'Tajik', native: 'Тоҷикӣ', direction: 'ltr', script: 'cyrillic', family: 'iranian' },
  tk: { code: 'tk', name: 'Turkmen', native: 'Türkmen', direction: 'ltr', script: 'latin', family: 'turkic' },
  az: { code: 'az', name: 'Azerbaijani', native: 'Azərbaycan', direction: 'ltr', script: 'latin', family: 'turkic' },
  ky: { code: 'ky', name: 'Kyrgyz', native: 'Кыргыз', direction: 'ltr', script: 'cyrillic', family: 'turkic' },
  tt: { code: 'tt', name: 'Tatar', native: 'Татар', direction: 'ltr', script: 'cyrillic', family: 'turkic' },
  bo: { code: 'bo', name: 'Tibetan', native: 'བོད་སྐད', direction: 'ltr', script: 'tibetan', family: 'sino-tibetan' },
  yo: { code: 'yo', name: 'Yoruba', native: 'Yorùbá', direction: 'ltr', script: 'latin', family: 'niger-congo' },
  ig: { code: 'ig', name: 'Igbo', native: 'Igbo', direction: 'ltr', script: 'latin', family: 'niger-congo' },
  rw: { code: 'rw', name: 'Kinyarwanda', native: 'Ikinyarwanda', direction: 'ltr', script: 'latin', family: 'bantu' },
  om: { code: 'om', name: 'Oromo', native: 'Afaan Oromoo', direction: 'ltr', script: 'latin', family: 'cushitic' },
  ti: { code: 'ti', name: 'Tigrinya', native: 'ትግርኛ', direction: 'ltr', script: 'ethiopic', family: 'semitic' },
  ug: { code: 'ug', name: 'Uyghur', native: 'ئۇيغۇرچە', direction: 'rtl', script: 'arabic', family: 'turkic' }
};

const LANGUAGE_FAMILIES = {
  germanic: { name: 'Germanic', languages: ['en', 'de', 'nl', 'sv', 'no', 'da', 'af', 'is'] },
  romance: { name: 'Romance', languages: ['es', 'fr', 'it', 'pt', 'ro', 'ca', 'gl'] },
  slavic: { name: 'Slavic', languages: ['ru', 'pl', 'cs', 'uk', 'bg', 'hr', 'sk', 'sl', 'sr', 'bs', 'mk'] },
  celtic: { name: 'Celtic', languages: ['cy', 'ga', 'gd'] },
  baltic: { name: 'Baltic', languages: ['lt', 'lv'] },
  uralic: { name: 'Uralic', languages: ['fi', 'hu', 'et'] },
  hellenic: { name: 'Hellenic', languages: ['el'] },
  indoaryan: { name: 'Indo-Aryan', languages: ['hi', 'bn', 'mr', 'gu', 'ne', 'si', 'ur'] },
  dravidian: { name: 'Dravidian', languages: ['ta', 'te', 'kn', 'ml'] },
  semitic: { name: 'Semitic', languages: ['ar', 'he', 'am', 'mt'] },
  turkic: { name: 'Turkic', languages: ['tr', 'kk', 'uz', 'az', 'ky', 'tt', 'tk', 'ug'] },
  sinoTibetan: { name: 'Sino-Tibetan', languages: ['zh', 'my', 'bo'] },
  japonic: { name: 'Japonic', languages: ['ja'] },
  koreanic: { name: 'Koreanic', languages: ['ko'] },
  austroasiatic: { name: 'Austroasiatic', languages: ['vi', 'km'] },
  kraDai: { name: 'Kra-Dai', languages: ['th', 'lo'] },
  austronesian: { name: 'Austronesian', languages: ['id', 'ms', 'tl', 'mg', 'mi', 'haw'] },
  bantu: { name: 'Bantu', languages: ['sw', 'zu', 'sn', 'rw'] },
  nigerCongo: { name: 'Niger-Congo', languages: ['ig', 'yo'] },
  afroasiatic: { name: 'Afroasiatic', languages: ['ha', 'so'] },
  iranian: { name: 'Iranian', languages: ['fa', 'ps', 'ku', 'tg'] },
  kartvelian: { name: 'Kartvelian', languages: ['ka'] },
  indoEuropean: { name: 'Indo-European', languages: ['sq', 'hy'] },
  mongolic: { name: 'Mongolic', languages: ['mn'] },
  isolate: { name: 'Isolate', languages: ['eu'] }
};

const SCRIPT_PATTERNS = {
  latin: /[a-zA-Z]/,
  cyrillic: /[\u0400-\u04FF]/,
  arabic: /[\u0600-\u06FF\u0750-\u077F]/,
  hebrew: /[\u0590-\u05FF]/,
  cjk: /[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]/,
  hangul: /[\uAC00-\uD7AF\u1100-\u11FF]/,
  devanagari: /[\u0900-\u097F]/,
  thai: /[\u0E00-\u0E7F]/,
  greek: /[\u0370-\u03FF]/,
  georgian: /[\u10A0-\u10FF]/,
  armenian: /[\u0530-\u058F]/,
  ethiopic: /[\u1200-\u137F]/,
  bengali: /[\u0980-\u09FF]/,
  tamil: /[\u0B80-\u0BFF]/,
  telugu: /[\u0C00-\u0C7F]/,
  kannada: /[\u0C80-\u0CFF]/,
  malayalam: /[\u0D00-\u0D7F]/,
  sinhala: /[\u0D80-\u0DFF]/,
  myanmar: /[\u1000-\u109F]/,
  khmer: /[\u1780-\u17FF]/,
  lao: /[\u0E80-\u0EFF]/,
  tibetan: /[\u0F00-\u0FFF]/,
  gujarati: /[\u0A80-\u0AFF]/
};

class LanguageManager {
  constructor() {
    this.recentKey = 'tn_recentLanguages';
    this.favoriteKey = 'tn_favoriteLanguages';
  }

  getAllLanguages() {
    return Object.values(LANGUAGES).filter(l => l.code !== 'auto');
  }

  getLanguage(code) {
    return LANGUAGES[code] || null;
  }

  detectScript(text) {
    for (const [script, pattern] of Object.entries(SCRIPT_PATTERNS)) {
      if (pattern.test(text)) return script;
    }
    return 'latin';
  }

  detectLanguage(text) {
    if (!text || text.trim().length === 0) return 'auto';
    const script = this.detectScript(text);
    const scriptToLang = {
      cyrillic: 'ru', arabic: 'ar', hebrew: 'he', cjk: 'zh',
      hangul: 'ko', devanagari: 'hi', thai: 'th', greek: 'el',
      georgian: 'ka', armenian: 'hy', ethiopic: 'am', bengali: 'bn',
      tamil: 'ta', telugu: 'te', kannada: 'kn', malayalam: 'ml',
      sinhala: 'si', myanmar: 'my', khmer: 'km', lao: 'lo',
      tibetan: 'bo', gujarati: 'gu'
    };
    return scriptToLang[script] || 'en';
  }

  isRTL(code) {
    const lang = LANGUAGES[code];
    return lang ? lang.direction === 'rtl' : false;
  }

  getRecent() {
    try {
      const stored = localStorage.getItem(this.recentKey);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  }

  addRecent(code) {
    if (code === 'auto') return;
    let recent = this.getRecent();
    recent = recent.filter(r => r !== code);
    recent.unshift(code);
    if (recent.length > 10) recent = recent.slice(0, 10);
    localStorage.setItem(this.recentKey, JSON.stringify(recent));
  }

  getFavorites() {
    try {
      const stored = localStorage.getItem(this.favoriteKey);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  }

  toggleFavorite(code) {
    let favs = this.getFavorites();
    if (favs.includes(code)) {
      favs = favs.filter(f => f !== code);
    } else {
      favs.push(code);
    }
    localStorage.setItem(this.favoriteKey, JSON.stringify(favs));
    return favs.includes(code);
  }

  isFavorite(code) {
    return this.getFavorites().includes(code);
  }

  getLanguagesByFamily(family) {
    const fam = LANGUAGE_FAMILIES[family];
    if (!fam) return [];
    return fam.languages.map(code => LANGUAGES[code]).filter(Boolean);
  }

  searchLanguages(query) {
    if (!query) return this.getAllLanguages();
    const q = query.toLowerCase();
    return this.getAllLanguages().filter(l =>
      l.name.toLowerCase().includes(q) ||
      l.native.toLowerCase().includes(q) ||
      l.code.toLowerCase().includes(q)
    );
  }
}

if (typeof window !== 'undefined') {
  window.LanguageManager = LanguageManager;
  window.LANGUAGES = LANGUAGES;
  window.LANGUAGE_FAMILIES = LANGUAGE_FAMILIES;
  window.SCRIPT_PATTERNS = SCRIPT_PATTERNS;
}
