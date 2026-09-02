const PassForgeGenerator = (() => {
  const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
  const NUMBERS = '0123456789';
  const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const AMBIGUOUS_CHARS = 'O0Il1';

  const COMMON_PASSWORDS = new Set([
    'password', '123456', '12345678', 'qwerty', 'abc123', 'monkey', 'master',
    'dragon', 'login', 'princess', 'football', 'shadow', 'sunshine', 'trustno1',
    'iloveyou', 'batman', 'access', 'hello', 'charlie', 'letmein', 'welcome',
    'password1', 'password123', 'admin', 'passw0rd', 'p@ssword', 'p@ssw0rd',
    '1234567', '123456789', '1234567890', '12345', '1234', '12345678910',
    'pass', 'test', 'guest', 'master123', 'qwerty123', 'abc1234', '1qaz2wsx',
    'password!', 'changeme', 'secret', '111111', '000000', '654321',
    'mustang', 'michael', 'ashley', 'jessica', 'passwd', 'maggie',
    'summer', 'winter', 'spring', 'autumn', 'samsung', 'superman'
  ]);

  const EFF_WORDS = [
    'academy', 'acrobat', 'action', 'admiral', 'advent', 'agile', 'agreed',
    'airline', 'alarm', 'album', 'alpine', 'always', 'amused', 'anchor',
    'animal', 'annual', 'answer', 'apple', 'arcade', 'arctic', 'arena',
    'armor', 'array', 'arrow', 'asylum', 'attic', 'autumn', 'aviator',
    'azure', 'bagel', 'bakery', 'banana', 'barber', 'basket', 'bath',
    'battle', 'beach', 'beast', 'begin', 'birch', 'bishop', 'bitter',
    'blaze', 'bliss', 'bluff', 'board', 'bonus', 'border', 'breeze',
    'bridge', 'bright', 'bronze', 'brisk', 'brook', 'brush', 'buddy',
    'bunch', 'cabin', 'cable', 'camel', 'candy', 'cargo', 'castle',
    'caulk', 'cedar', 'chain', 'chalk', 'charm', 'chase', 'cheek',
    'chef', 'chess', 'chief', 'child', 'chill', 'china', 'chord',
    'cider', 'cinema', 'circus', 'clerk', 'cliff', 'climb', 'clock',
    'cloth', 'cloud', 'cobalt', 'comet', 'comic', 'coral', 'couch',
    'crane', 'crisp', 'cross', 'crowd', 'crush', 'cubic', 'cycle',
    'daily', 'dance', 'debut', 'delay', 'delta', 'dense', 'depot',
    'depth', 'derby', 'diary', 'dirty', 'disco', 'doing', 'doubt',
    'draft', 'drain', 'drama', 'drank', 'drape', 'dream', 'drift',
    'drill', 'drink', 'drive', 'drown', 'dying', 'eager', 'eagle',
    'earth', 'eight', 'elder', 'elect', 'elite', 'ember', 'empty',
    'ended', 'enemy', 'enjoy', 'enter', 'entry', 'equal', 'error',
    'essay', 'event', 'every', 'exact', 'exile', 'exist', 'extra',
    'fable', 'facet', 'faith', 'fancy', 'fatal', 'feast', 'fence',
    'ferry', 'fetch', 'fever', 'fiber', 'field', 'final', 'first',
    'flame', 'flash', 'fleet', 'flesh', 'float', 'flood', 'floor',
    'flora', 'flour', 'fluid', 'flush', 'flute', 'focal', 'focus',
    'force', 'forge', 'forth', 'forum', 'fossil', 'found', 'frame',
    'frank', 'fraud', 'fresh', 'front', 'frost', 'froze', 'fruit',
    'gauge', 'genre', 'ghost', 'giant', 'given', 'glade', 'glare',
    'gleam', 'globe', 'gloom', 'glory', 'gloss', 'going', 'goose',
    'grace', 'grade', 'grain', 'grand', 'grant', 'grape', 'grasp',
    'grass', 'grave', 'great', 'greed', 'grind', 'groan', 'groom',
    'gross', 'group', 'grove', 'grown', 'guard', 'guess', 'guest',
    'guide', 'guild', 'guilt', 'guise', 'habit', 'happy', 'hardy',
    'harsh', 'hasty', 'haunt', 'haven', 'heart', 'heavy', 'hedge',
    'hence', 'herbs', 'hoist', 'honey', 'honor', 'horse', 'hotel',
    'house', 'human', 'humor', 'hurry', 'ideal', 'image', 'imply',
    'index', 'indie', 'inner', 'input', 'irony', 'ivory', 'jewel',
    'joint', 'joker', 'jolly', 'judge', 'juice', 'karma', 'kayak',
    'knack', 'knelt', 'label', 'lance', 'large', 'laser', 'latch',
    'later', 'laugh', 'layer', 'learn', 'lease', 'legal', 'lemon',
    'level', 'light', 'limit', 'linen', 'liner', 'llama', 'local',
    'lodge', 'logic', 'loose', 'lotus', 'lunar', 'lunch', 'lunge',
    'magic', 'major', 'manor', 'maple', 'march', 'marry', 'marsh',
    'mason', 'match', 'maxim', 'maybe', 'mayor', 'media', 'melon',
    'merge', 'merit', 'metal', 'micro', 'might', 'miner', 'minor',
    'minus', 'mixer', 'model', 'money', 'month', 'moral', 'motor',
    'mound', 'mount', 'mouse', 'mouth', 'movie', 'muddy', 'music',
    'naive', 'nerve', 'never', 'nexus', 'night', 'noble', 'noise',
    'north', 'noted', 'novel', 'nurse', 'nylon', 'ocean', 'offer',
    'often', 'olive', 'onset', 'opera', 'orbit', 'order', 'organ',
    'other', 'outer', 'oxide', 'ozone', 'panic', 'paper', 'party',
    'pasta', 'patch', 'pause', 'peace', 'peach', 'pearl', 'penny',
    'perch', 'phase', 'phone', 'photo', 'piano', 'piece', 'pilot',
    'pinch', 'pixel', 'pizza', 'place', 'plain', 'plane', 'plate',
    'plaza', 'plead', 'pluck', 'plumb', 'point', 'polar', 'pound',
    'power', 'press', 'price', 'pride', 'prime', 'prince', 'print',
    'prior', 'prize', 'probe', 'prone', 'proof', 'prose', 'proud',
    'prove', 'proxy', 'psalm', 'pulse', 'pupil', 'purse', 'quake',
    'queen', 'query', 'quest', 'queue', 'quick', 'quiet', 'quilt',
    'quirk', 'quota', 'quote', 'radar', 'radio', 'raise', 'rally',
    'ranch', 'range', 'rapid', 'ratio', 'reach', 'react', 'ready',
    'realm', 'rebel', 'refer', 'reign', 'relax', 'repay', 'reply',
    'rider', 'ridge', 'rifle', 'right', 'rigid', 'risky', 'rival',
    'river', 'roast', 'robin', 'robot', 'rocky', 'rogue', 'roman',
    'roost', 'round', 'route', 'royal', 'rugby', 'ruler', 'rural',
    'saint', 'salad', 'salon', 'sandy', 'sauce', 'scale', 'scare',
    'scene', 'scent', 'scope', 'score', 'scout', 'scrap', 'sense',
    'serve', 'setup', 'seven', 'shade', 'shaft', 'shake', 'shall',
    'shame', 'shape', 'share', 'shark', 'sharp', 'shawl', 'sheep',
    'sheer', 'shelf', 'shell', 'shift', 'shine', 'shirt', 'shock',
    'shore', 'short', 'shout', 'shown', 'siege', 'sight', 'sigma',
    'silly', 'since', 'sixth', 'sixty', 'skate', 'skill', 'skull',
    'slate', 'slave', 'sleep', 'slice', 'slide', 'slope', 'small',
    'smart', 'smell', 'smile', 'smoke', 'snake', 'solar', 'solid',
    'solve', 'sonic', 'south', 'space', 'spare', 'spark', 'speak',
    'spear', 'speed', 'spend', 'spent', 'spice', 'spine', 'spoke',
    'sport', 'spray', 'squad', 'stack', 'staff', 'stage', 'stain',
    'stair', 'stake', 'stale', 'stall', 'stamp', 'stand', 'stark',
    'start', 'state', 'stays', 'steam', 'steel', 'steep', 'steer',
    'stern', 'stick', 'stiff', 'still', 'stock', 'stole', 'stone',
    'stood', 'stool', 'store', 'storm', 'story', 'stout', 'stove',
    'strap', 'straw', 'stray', 'strip', 'stuck', 'study', 'stuff',
    'style', 'sugar', 'suite', 'sunny', 'super', 'surge', 'swamp',
    'swarm', 'swear', 'sweep', 'sweet', 'swell', 'swept', 'swift',
    'swing', 'swirl', 'sword', 'swore', 'sworn', 'swung', 'table',
    'taste', 'teach', 'tempo', 'tense', 'tenth', 'theft', 'theme',
    'there', 'thick', 'thing', 'think', 'third', 'thorn', 'three',
    'threw', 'throw', 'thumb', 'tiger', 'tight', 'timer', 'tired',
    'title', 'toast', 'today', 'token', 'total', 'touch', 'tough',
    'towel', 'tower', 'toxic', 'trace', 'track', 'trade', 'trail',
    'train', 'trait', 'trash', 'treat', 'trend', 'trial', 'tribe',
    'trick', 'tried', 'troop', 'truck', 'truly', 'trump', 'trunk',
    'trust', 'truth', 'tumor', 'twice', 'twist', 'ultra', 'uncle',
    'under', 'union', 'unite', 'unity', 'until', 'upper', 'upset',
    'urban', 'usage', 'usher', 'usual', 'utter', 'vague', 'valid',
    'value', 'valve', 'vault', 'venue', 'verse', 'vigor', 'vinyl',
    'viola', 'viral', 'virus', 'visit', 'vista', 'vital', 'vivid',
    'vocal', 'vodka', 'voice', 'voter', 'waist', 'waste', 'watch',
    'water', 'weary', 'weave', 'wedge', 'weigh', 'weird', 'whale',
    'wheat', 'wheel', 'where', 'which', 'while', 'white', 'whole',
    'whose', 'widen', 'width', 'witch', 'woman', 'world', 'worry',
    'worse', 'worst', 'worth', 'would', 'wound', 'wrath', 'wrist',
    'write', 'wrong', 'wrote', 'yacht', 'yield', 'young', 'yours',
    'youth', 'zebra', 'zonal'
  ];

  function secureRandom(max) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0] % max;
  }

  function shuffleArray(arr) {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = secureRandom(i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  function generatePassword(options = {}) {
    const {
      length = 16,
      uppercase = true,
      lowercase = true,
      numbers = true,
      symbols = true,
      excludeAmbiguous = false
    } = options;

    let charset = '';
    if (uppercase) charset += UPPERCASE;
    if (lowercase) charset += LOWERCASE;
    if (numbers) charset += NUMBERS;
    if (symbols) charset += SYMBOLS;

    if (charset.length === 0) {
      charset = LOWERCASE;
    }

    if (excludeAmbiguous) {
      charset = charset.split('').filter(c => !AMBIGUOUS_CHARS.includes(c)).join('');
    }

    let password = '';
    let maxAttempts = 1000;

    do {
      password = '';
      for (let i = 0; i < length; i++) {
        password += charset[secureRandom(charset.length)];
      }
      maxAttempts--;
    } while (!isValidPassword(password, options) && maxAttempts > 0);

    return password;
  }

  function isValidPassword(password, options) {
    const { uppercase = true, lowercase = true, numbers = true, symbols = true } = options;

    if (uppercase && !/[A-Z]/.test(password)) return false;
    if (lowercase && !/[a-z]/.test(password)) return false;
    if (numbers && !/[0-9]/.test(password)) return false;
    if (symbols && !/[^A-Za-z0-9]/.test(password)) return false;

    if (hasThreeConsecutiveSameType(password)) return false;

    return true;
  }

  function hasThreeConsecutiveSameType(password) {
    const types = password.split('').map(c => {
      if (/[A-Z]/.test(c)) return 'upper';
      if (/[a-z]/.test(c)) return 'lower';
      if (/[0-9]/.test(c)) return 'number';
      return 'symbol';
    });

    for (let i = 2; i < types.length; i++) {
      if (types[i] === types[i-1] && types[i-1] === types[i-2]) {
        return true;
      }
    }
    return false;
  }

  function generatePassphrase(options = {}) {
    const {
      wordCount = 4,
      separator = '-',
      capitalize = true
    } = options;

    const words = [];
    for (let i = 0; i < wordCount; i++) {
      let word = EFF_WORDS[secureRandom(EFF_WORDS.length)];
      if (capitalize) {
        word = word.charAt(0).toUpperCase() + word.slice(1);
      }
      words.push(word);
    }

    return words.join(separator);
  }

  function generatePronounceable(length = 16) {
    const consonants = 'bcdfghjklmnpqrstvwxz';
    const vowels = 'aeiou';
    let password = '';
    let useConsonant = secureRandom(2) === 0;

    while (password.length < length) {
      if (useConsonant) {
        password += consonants[secureRandom(consonants.length)];
      } else {
        password += vowels[secureRandom(vowels.length)];
      }
      useConsonant = !useConsonant;

      if (secureRandom(3) === 0 && password.length < length) {
        const special = '!@#$%&*';
        password += special[secureRandom(special.length)];
      }
    }

    return password.substring(0, length);
  }

  function calculateStrength(password) {
    if (!password || password.length === 0) {
      return { score: 0, entropy: 0, label: 'None', color: '#555' };
    }

    let charsetSize = 0;
    if (/[a-z]/.test(password)) charsetSize += 26;
    if (/[A-Z]/.test(password)) charsetSize += 26;
    if (/[0-9]/.test(password)) charsetSize += 10;
    if (/[^a-zA-Z0-9]/.test(password)) charsetSize += 33;

    if (charsetSize === 0) charsetSize = 26;

    const entropy = Math.floor(password.length * Math.log2(charsetSize));
    const isCommon = COMMON_PASSWORDS.has(password.toLowerCase());

    let score = 0;
    if (isCommon) {
      score = 1;
    } else {
      if (entropy < 28) score = 1;
      else if (entropy < 36) score = 2;
      else if (entropy < 60) score = 3;
      else if (entropy < 80) score = 4;
      else if (entropy < 100) score = 5;
      else score = 6;

      if (password.length >= 12) score = Math.min(score + 1, 6);
      if (password.length >= 20) score = Math.min(score + 1, 6);
    }

    const labels = ['None', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong', 'Excellent'];
    const colors = ['#555', '#e74c3c', '#e74c3c', '#f39c12', '#2ecc71', '#2ecc71', '#27ae60'];

    return {
      score: score,
      entropy: entropy,
      label: labels[score],
      color: colors[score],
      percentage: Math.min((score / 6) * 100, 100)
    };
  }

  function getCommonPasswords() {
    return COMMON_PASSWORDS;
  }

  return {
    generatePassword,
    generatePassphrase,
    generatePronounceable,
    calculateStrength,
    getCommonPasswords,
    secureRandom,
    shuffleArray
  };
})();
