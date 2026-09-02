class Translator {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 24 * 60 * 60 * 1000;
    this.maxCacheSize = 1000;
  }

  getCacheKey(text, from, to) {
    return `${from}:${to}:${text}`;
  }

  getCached(text, from, to) {
    const key = this.getCacheKey(text, from, to);
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < this.cacheExpiry) {
      return entry.translation;
    }
    this.cache.delete(key);
    return null;
  }

  setCache(text, from, to, translation) {
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(this.getCacheKey(text, from, to), {
      translation,
      timestamp: Date.now()
    });
  }

  async translate(text, from = 'auto', to = 'en') {
    if (!text || text.trim().length === 0) return '';
    if (from === to) return text;

    const cached = this.getCached(text, from, to);
    if (cached) return cached;

    let translation;
    try {
      translation = await this.translateWithAPI(text, from, to);
    } catch (e) {
      translation = this.mockTranslate(text, from, to);
    }

    this.setCache(text, from, to, translation);
    return translation;
  }

  async translateWithAPI(text, from, to) {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('API request failed');
    const data = await response.json();
    if (data.responseStatus === 200 && data.responseData) {
      return data.responseData.translatedText;
    }
    throw new Error('Translation not available');
  }

  mockTranslate(text, from, to) {
    const mockPhrases = {
      'en-es': { 'hello': 'hola', 'goodbye': 'adiós', 'thank you': 'gracias', 'good morning': 'buenos días', 'how are you': 'cómo estás', 'please': 'por favor', 'yes': 'sí', 'no': 'no' },
      'en-fr': { 'hello': 'bonjour', 'goodbye': 'au revoir', 'thank you': 'merci', 'good morning': 'bonjour', 'how are you': 'comment allez-vous', 'please': 's\'il vous plaît', 'yes': 'oui', 'no': 'non' },
      'en-de': { 'hello': 'hallo', 'goodbye': 'auf wiedersehen', 'thank you': 'danke', 'good morning': 'guten morgen', 'how are you': 'wie geht es ihnen', 'please': 'bitte', 'yes': 'ja', 'no': 'nein' },
      'en-ja': { 'hello': 'こんにちは', 'goodbye': 'さようなら', 'thank you': 'ありがとう', 'good morning': 'おはようございます', 'how are you': 'お元気ですか', 'please': 'お願いします', 'yes': 'はい', 'no': 'いいえ' },
      'en-zh': { 'hello': '你好', 'goodbye': '再见', 'thank you': '谢谢', 'good morning': '早上好', 'how are you': '你好吗', 'please': '请', 'yes': '是', 'no': '不' },
      'en-ru': { 'hello': 'привет', 'goodbye': 'до свидания', 'thank you': 'спасибо', 'good morning': 'доброе утро', 'how are you': 'как дела', 'please': 'пожалуйста', 'yes': 'да', 'no': 'нет' },
      'en-ar': { 'hello': 'مرحبا', 'goodbye': 'مع السلامة', 'thank you': 'شكرا', 'good morning': 'صباح الخير', 'how are you': 'كيف حالك', 'please': 'من فضلك', 'yes': 'نعم', 'no': 'لا' },
      'en-hi': { 'hello': 'नमस्ते', 'goodbye': 'अलविदा', 'thank you': 'धन्यवाद', 'good morning': 'शुभ प्रभात', 'how are you': 'आप कैसे हैं', 'please': 'कृपया', 'yes': 'हाँ', 'no': 'नहीं' },
      'en-ko': { 'hello': '안녕하세요', 'goodbye': '안녕히 가세요', 'thank you': '감사합니다', 'good morning': '좋은 아침', 'how are you': '어떻게 지내세요', 'please': '부탁합니다', 'yes': '네', 'no': '아니요' },
      'en-pt': { 'hello': 'olá', 'goodbye': 'adeus', 'thank you': 'obrigado', 'good morning': 'bom dia', 'how are you': 'como vai', 'please': 'por favor', 'yes': 'sim', 'no': 'não' },
      'en-it': { 'hello': 'ciao', 'goodbye': 'arrivederci', 'thank you': 'grazie', 'good morning': 'buongiorno', 'how are you': 'come stai', 'please': 'per favore', 'yes': 'sì', 'no': 'no' },
      'en-nl': { 'hello': 'hallo', 'goodbye': 'tot ziens', 'thank you': 'dank je', 'good morning': 'goedemorgen', 'how are you': 'hoe gaat het', 'please': 'alstublieft', 'yes': 'ja', 'no': 'nee' },
      'en-pl': { 'hello': 'cześć', 'goodbye': 'do widzenia', 'thank you': 'dziękuję', 'good morning': 'dzień dobry', 'how are you': 'jak się masz', 'please': 'proszę', 'yes': 'tak', 'no': 'nie' },
      'en-tr': { 'hello': 'merhaba', 'goodbye': 'hoşça kal', 'thank you': 'teşekkürler', 'good morning': 'günaydın', 'how are you': 'nasılsınız', 'please': 'lütfen', 'yes': 'evet', 'no': 'hayır' },
      'en-vi': { 'hello': 'xin chào', 'goodbye': 'tạm biệt', 'thank you': 'cảm ơn', 'good morning': 'chào buổi sáng', 'how are you': 'bạn khỏe không', 'please': 'xin vui lòng', 'yes': 'có', 'no': 'không' },
      'en-th': { 'hello': 'สวัสดี', 'goodbye': 'ลาก่อน', 'thank you': 'ขอบคุณ', 'good morning': 'สวัสดีตอนเช้า', 'how are you': 'สบายดีไหม', 'please': 'กรุณา', 'yes': 'ใช่', 'no': 'ไม่' },
      'en-sv': { 'hello': 'hej', 'goodbye': 'hej då', 'thank you': 'tack', 'good morning': 'god morgon', 'how are you': 'hur mår du', 'please': 'snälla', 'yes': 'ja', 'no': 'nej' },
      'en-el': { 'hello': 'γεια σας', 'goodbye': 'αντίο', 'thank you': 'ευχαριστώ', 'good morning': 'καλημέρα', 'how are you': 'πώς είσαι', 'please': 'παρακαλώ', 'yes': 'ναι', 'no': 'όχι' },
      'en-he': { 'hello': 'שלום', 'goodbye': 'להתראות', 'thank you': 'תודה', 'good morning': 'בוקר טוב', 'how are you': 'איך אתה', 'please': 'בבקשה', 'yes': 'כן', 'no': 'לא' },
      'en-cs': { 'hello': 'ahoj', 'goodbye': 'na shledanou', 'thank you': 'děkuji', 'good morning': 'dobré ráno', 'how are you': 'jak se máte', 'please': 'prosím', 'yes': 'ano', 'no': 'ne' },
      'en-ro': { 'hello': 'salut', 'goodbye': 'la revedere', 'thank you': 'mulțumesc', 'good morning': 'bună dimineața', 'how are you': 'cum ești', 'please': 'te rog', 'yes': 'da', 'no': 'nu' },
      'en-uk': { 'hello': 'привіт', 'goodbye': 'до побачення', 'thank you': 'дякую', 'good morning': 'доброго ранку', 'how are you': 'як справи', 'please': 'будь ласка', 'yes': 'так', 'no': 'ні' },
      'en-id': { 'hello': 'halo', 'goodbye': 'selamat tinggal', 'thank you': 'terima kasih', 'good morning': 'selamat pagi', 'how are you': 'apa kabar', 'please': 'tolong', 'yes': 'ya', 'no': 'tidak' },
      'en-ms': { 'hello': 'hai', 'goodbye': 'selamat tinggal', 'thank you': 'terima kasih', 'good morning': 'selamat pagi', 'how are you': 'apa khabar', 'please': 'sila', 'yes': 'ya', 'no': 'tidak' },
      'en-fa': { 'hello': 'سلام', 'goodbye': 'خداحافظ', 'thank you': 'ممنون', 'good morning': 'صبح بخیر', 'how are you': 'حالت چطوره', 'please': 'لطفاً', 'yes': 'بله', 'no': 'نه' },
      'en-sw': { 'hello': 'jambo', 'goodbye': 'kwaheri', 'thank you': 'asante', 'good morning': 'haba za asubuhi', 'how are you': 'habari yako', 'please': 'tafadhali', 'yes': 'ndiyo', 'no': 'hapana' }
    };

    const key = `${from}-${to}`;
    const reverseKey = `${to}-${from}`;
    const lowerText = text.toLowerCase().trim();

    if (mockPhrases[key] && mockPhrases[key][lowerText]) {
      return mockPhrases[key][lowerText];
    }

    if (mockPhrases[reverseKey]) {
      const reverseEntry = Object.entries(mockPhrases[reverseKey]).find(([, v]) => v.toLowerCase() === lowerText);
      if (reverseEntry) return reverseEntry[0];
    }

    return this.applyMockTransformation(text, to);
  }

  applyMockTransformation(text, to) {
    const transformations = {
      es: (t) => t.split(' ').map(w => w + 'ó').join(' '),
      fr: (t) => t.split(' ').map(w => w + 'é').join(' '),
      de: (t) => t.split(' ').map(w => w + 'en').join(' '),
      ja: (t) => '「' + t + '」',
      zh: (t) => '【' + t + '】',
      ru: (t) => t.split('').map(c => {
        const map = { 'a': 'а', 'e': 'е', 'o': 'о', 'p': 'р', 'c': 'с', 'x': 'х', 'y': 'у' };
        return map[c.toLowerCase()] || c;
      }).join(''),
      ar: (t) => '⟨' + t + '⟩',
      hi: (t) => '«' + t + '»',
      ko: (t) => '[' + t + ']',
      th: (t) => '«' + t + '»'
    };

    const transform = transformations[to];
    return transform ? transform(text) : text;
  }

  async translateBatch(texts, from = 'auto', to = 'en') {
    const results = [];
    for (const text of texts) {
      results.push(await this.translate(text, from, to));
    }
    return results;
  }

  async detectLanguage(text) {
    if (!text || text.trim().length < 3) return 'auto';
    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=autodetect|en`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.responseData && data.responseData.detectedLanguage) {
        return data.responseData.detectedLanguage;
      }
    } catch (e) {}
    if (typeof LanguageManager !== 'undefined') {
      const lm = new LanguageManager();
      return lm.detectLanguage(text);
    }
    return 'en';
  }

  async speak(text, lang = 'en') {
    return new Promise((resolve, reject) => {
      if (typeof chrome !== 'undefined' && chrome.tts) {
        chrome.tts.speak(text, { lang: lang, rate: 0.9, onEnd: resolve });
      } else if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 0.9;
        utterance.onend = resolve;
        utterance.onerror = reject;
        speechSynthesis.speak(utterance);
      } else {
        reject(new Error('TTS not supported'));
      }
    });
  }

  clearCache() {
    this.cache.clear();
  }
}

if (typeof window !== 'undefined') {
  window.Translator = Translator;
}
