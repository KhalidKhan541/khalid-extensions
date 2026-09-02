const ColorUtils = (() => {
  const CSS_NAMED_COLORS = {
    aliceblue: '#f0f8ff', antiquewhite: '#faebd7', aqua: '#00ffff', aquamarine: '#7fffd4',
    azure: '#f0ffff', beige: '#f5f5dc', bisque: '#ffe4c4', black: '#000000',
    blanchedalmond: '#ffebcd', blue: '#0000ff', blueviolet: '#8a2be2', brown: '#a52a2a',
    burlywood: '#deb887', cadetblue: '#5f9ea0', chartreuse: '#7fff00', chocolate: '#d2691e',
    coral: '#ff7f50', cornflowerblue: '#6495ed', cornsilk: '#fff8dc', crimson: '#dc143c',
    cyan: '#00ffff', darkblue: '#00008b', darkcyan: '#008b8b', darkgoldenrod: '#b8860b',
    darkgray: '#a9a9a9', darkgreen: '#006400', darkkhaki: '#bdb76b', darkmagenta: '#8b008b',
    darkolivegreen: '#556b2f', darkorange: '#ff8c00', darkorchid: '#9932cc', darkred: '#8b0000',
    darksalmon: '#e9967a', darkseagreen: '#8fbc8f', darkslateblue: '#483d8b', darkslategray: '#2f4f4f',
    darkturquoise: '#00ced1', darkviolet: '#9400d3', deeppink: '#ff1493', deepskyblue: '#00bfff',
    dimgray: '#696969', dodgerblue: '#1e90ff', firebrick: '#b22222', floralwhite: '#fffaf0',
    forestgreen: '#228b22', fuchsia: '#ff00ff', gainsboro: '#dcdcdc', ghostwhite: '#f8f8ff',
    gold: '#ffd700', goldenrod: '#daa520', gray: '#808080', green: '#008000',
    greenyellow: '#adff2f', honeydew: '#f0fff0', hotpink: '#ff69b4', indianred: '#cd5c5c',
    indigo: '#4b0082', ivory: '#fffff0', khaki: '#f0e68c', lavender: '#e6e6fa',
    lavenderblush: '#fff0f5', lawngreen: '#7cfc00', lemonchiffon: '#fffacd', lightblue: '#add8e6',
    lightcoral: '#f08080', lightcyan: '#e0ffff', lightgoldenrodyellow: '#fafad2', lightgray: '#d3d3d3',
    lightgreen: '#90ee90', lightpink: '#ffb6c1', lightsalmon: '#ffa07a', lightseagreen: '#20b2aa',
    lightskyblue: '#87cefa', lightslategray: '#778899', lightsteelblue: '#b0c4de', lightyellow: '#ffffe0',
    lime: '#00ff00', limegreen: '#32cd32', linen: '#faf0e6', magenta: '#ff00ff',
    maroon: '#800000', mediumaquamarine: '#66cdaa', mediumblue: '#0000cd', mediumorchid: '#ba55d3',
    mediumpurple: '#9370db', mediumseagreen: '#3cb371', mediumslateblue: '#7b68ee',
    mediumspringgreen: '#00fa9a', mediumturquoise: '#48d1cc', mediumvioletred: '#c71585',
    midnightblue: '#191970', mintcream: '#f5fffa', mistyrose: '#ffe4e1', moccasin: '#ffe4b5',
    navajowhite: '#ffdead', navy: '#000080', oldlace: '#fdf5e6', olive: '#808000',
    olivedrab: '#6b8e23', orange: '#ffa500', orangered: '#ff4500', orchid: '#da70d6',
    palegoldenrod: '#eee8aa', palegreen: '#98fb98', paleturquoise: '#afeeee', palevioletred: '#db7093',
    papayawhip: '#ffefd5', peachpuff: '#ffdab9', peru: '#cd853f', pink: '#ffc0cb',
    plum: '#dda0dd', powderblue: '#b0e0e6', purple: '#800080', rebeccapurple: '#663399',
    red: '#ff0000', rosybrown: '#bc8f8f', royalblue: '#4169e1', saddlebrown: '#8b4513',
    salmon: '#fa8072', sandybrown: '#f4a460', seagreen: '#2e8b57', seashell: '#fff5ee',
    sienna: '#a0522d', silver: '#c0c0c0', skyblue: '#87ceeb', slateblue: '#6a5acd',
    slategray: '#708090', snow: '#fffafa', springgreen: '#00ff7f', steelblue: '#4682b4',
    tan: '#d2b48c', teal: '#008080', thistle: '#d8bfd8', tomato: '#ff6347',
    turquoise: '#40e0d0', violet: '#ee82ee', wheat: '#f5deb3', white: '#ffffff',
    whitesmoke: '#f5f5f5', yellow: '#ffff00', yellowgreen: '#9acd32'
  };

  function hexToRgb(hex) {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const num = parseInt(hex, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  function hslToRgb(h, s, l) {
    h /= 360; s /= 100; l /= 100;
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
  }

  function hexToHsl(hex) {
    const { r, g, b } = hexToRgb(hex);
    return rgbToHsl(r, g, b);
  }

  function hslToHex(h, s, l) {
    const { r, g, b } = hslToRgb(h, s, l);
    return rgbToHex(r, g, b);
  }

  function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, v = max;
    const d = max - min;
    s = max === 0 ? 0 : d / max;
    if (max === min) {
      h = 0;
    } else {
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), v: Math.round(v * 100) };
  }

  function hsvToRgb(h, s, v) {
    h /= 360; s /= 100; v /= 100;
    let r, g, b;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    switch (i % 6) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      case 5: r = v; g = p; b = q; break;
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
  }

  function relativeLuminance(r, g, b) {
    const [rs, gs, bs] = [r, g, b].map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  function contrastRatio(rgb1, rgb2) {
    const l1 = relativeLuminance(rgb1.r, rgb1.g, rgb1.b);
    const l2 = relativeLuminance(rgb2.r, rgb2.g, rgb2.b);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  function wcagCompliance(ratio) {
    return {
      AALarge: ratio >= 3,
      AA: ratio >= 4.5,
      AAALarge: ratio >= 4.5,
      AAA: ratio >= 7
    };
  }

  function colorDistanceCIE76(rgb1, rgb2) {
    const lab1 = rgbToLab(rgb1.r, rgb1.g, rgb1.b);
    const lab2 = rgbToLab(rgb2.r, rgb2.g, rgb2.b);
    return Math.sqrt(
      Math.pow(lab1.L - lab2.L, 2) +
      Math.pow(lab1.a - lab2.a, 2) +
      Math.pow(lab1.b - lab2.b, 2)
    );
  }

  function rgbToLab(r, g, b) {
    let { x, y, z } = rgbToXyz(r, g, b);
    x /= 95.047; y /= 100.000; z /= 108.883;
    x = x > 0.008856 ? Math.cbrt(x) : (7.787 * x) + 16/116;
    y = y > 0.008856 ? Math.cbrt(y) : (7.787 * y) + 16/116;
    z = z > 0.008856 ? Math.cbrt(z) : (7.787 * z) + 16/116;
    return { L: (116 * y) - 16, a: 500 * (x - y), b: 200 * (y - z) };
  }

  function rgbToXyz(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
    r *= 100; g *= 100; b *= 100;
    return {
      x: r * 0.4124564 + g * 0.3575761 + b * 0.1804375,
      y: r * 0.2126729 + g * 0.7151522 + b * 0.0721750,
      z: r * 0.0193339 + g * 0.1191920 + b * 0.9503041
    };
  }

  function colorDistanceCIEDE2000(rgb1, rgb2) {
    const lab1 = rgbToLab(rgb1.r, rgb1.g, rgb1.b);
    const lab2 = rgbToLab(rgb2.r, rgb2.g, rgb2.b);
    return deltaE2000(lab1, lab2);
  }

  function deltaE2000(lab1, lab2) {
    const { L: L1, a: a1, b: b1 } = lab1;
    const { L: L2, a: a2, b: b2 } = lab2;
    const kL = 1, kC = 1, kH = 1;

    const C1 = Math.sqrt(a1 * a1 + b1 * b1);
    const C2 = Math.sqrt(a2 * a2 + b2 * b2);
    const Cab = (C1 + C2) / 2;
    const Cab7 = Math.pow(Cab, 7);
    const G = 0.5 * (1 - Math.sqrt(Cab7 / (Cab7 + Math.pow(25, 7))));

    const a1p = a1 * (1 + G);
    const a2p = a2 * (1 + G);
    const C1p = Math.sqrt(a1p * a1p + b1 * b1);
    const C2p = Math.sqrt(a2p * a2p + b2 * b2);

    let h1p = Math.atan2(b1, a1p) * 180 / Math.PI;
    if (h1p < 0) h1p += 360;
    let h2p = Math.atan2(b2, a2p) * 180 / Math.PI;
    if (h2p < 0) h2p += 360;

    const dLp = L2 - L1;
    const dCp = C2p - C1p;

    let dhp;
    if (C1p * C2p === 0) {
      dhp = 0;
    } else if (Math.abs(h2p - h1p) <= 180) {
      dhp = h2p - h1p;
    } else if (h2p - h1p > 180) {
      dhp = h2p - h1p - 360;
    } else {
      dhp = h2p - h1p + 360;
    }

    const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(dhp * Math.PI / 360);

    const Lp = (L1 + L2) / 2;
    const Cp = (C1p + C2p) / 2;

    let Hp;
    if (C1p * C2p === 0) {
      Hp = h1p + h2p;
    } else if (Math.abs(h1p - h2p) <= 180) {
      Hp = (h1p + h2p) / 2;
    } else if (h1p + h2p < 360) {
      Hp = (h1p + h2p + 360) / 2;
    } else {
      Hp = (h1p + h2p - 360) / 2;
    }

    const T = 1 - 0.17 * Math.cos((Hp - 30) * Math.PI / 180) + 0.24 * Math.cos(2 * Hp * Math.PI / 180)
            + 0.32 * Math.cos((3 * Hp + 6) * Math.PI / 180) - 0.20 * Math.cos((4 * Hp - 63) * Math.PI / 180);

    const SL = 1 + 0.015 * Math.pow(Lp - 50, 2) / Math.sqrt(20 + Math.pow(Lp - 50, 2));
    const SC = 1 + 0.045 * Cp;
    const SH = 1 + 0.015 * Cp * T;

    const Cp7 = Math.pow(Cp, 7);
    const RT = -2 * Math.sqrt(Cp7 / (Cp7 + Math.pow(25, 7)))
             * Math.sin(60 * Math.exp(-Math.pow((Hp - 275) / 25, 2)) * Math.PI / 180);

    return Math.sqrt(
      Math.pow(dLp / (kL * SL), 2) +
      Math.pow(dCp / (kC * SC), 2) +
      Math.pow(dHp / (kH * SH), 2) +
      RT * (dCp / (kC * SC)) * (dHp / (kH * SH))
    );
  }

  function simulateColorBlindness(rgb, type) {
    const { r, g, b } = rgb;
    const matrices = {
      protanopia: [
        [0.152286, 1.052583, -0.204868],
        [0.114503, 0.786281, 0.099216],
        [-0.003882, -0.048116, 1.051998]
      ],
      deuteranopia: [
        [0.367322, 0.860646, -0.227968],
        [0.280085, 0.672501, 0.047413],
        [-0.011820, 0.042940, 0.968881]
      ],
      tritanopia: [
        [1.255528, -0.076749, -0.178779],
        [-0.078411, 0.930809, 0.147602],
        [0.004733, 0.691367, 0.303900]
      ]
    };
    const m = matrices[type];
    if (!m) return rgb;
    return {
      r: Math.round(Math.max(0, Math.min(255, m[0][0] * r + m[0][1] * g + m[0][2] * b))),
      g: Math.round(Math.max(0, Math.min(255, m[1][0] * r + m[1][1] * g + m[1][2] * b))),
      b: Math.round(Math.max(0, Math.min(255, m[2][0] * r + m[2][1] * g + m[2][2] * b)))
    };
  }

  function colorTemperature(rgb) {
    const { r, g, b } = rgb;
    const avg = (r + g + b) / 3;
    const warmCool = (r - b) / 255;
    return {
      kelvin: Math.round(1000 + (1 - warmCool) * 9000),
      label: warmCool > 0.1 ? 'Warm' : warmCool < -0.1 ? 'Cool' : 'Neutral'
    };
  }

  function getComplementary(hex) {
    const hsl = hexToHsl(hex);
    return hslToHex((hsl.h + 180) % 360, hsl.s, hsl.l);
  }

  function getAnalogous(hex) {
    const hsl = hexToHsl(hex);
    return [
      hslToHex((hsl.h + 330) % 360, hsl.s, hsl.l),
      hex,
      hslToHex((hsl.h + 30) % 360, hsl.s, hsl.l)
    ];
  }

  function getTriadic(hex) {
    const hsl = hexToHsl(hex);
    return [
      hex,
      hslToHex((hsl.h + 120) % 360, hsl.s, hsl.l),
      hslToHex((hsl.h + 240) % 360, hsl.s, hsl.l)
    ];
  }

  function getSplitComplementary(hex) {
    const hsl = hexToHsl(hex);
    return [
      hex,
      hslToHex((hsl.h + 150) % 360, hsl.s, hsl.l),
      hslToHex((hsl.h + 210) % 360, hsl.s, hsl.l)
    ];
  }

  function getTetradic(hex) {
    const hsl = hexToHsl(hex);
    return [
      hex,
      hslToHex((hsl.h + 90) % 360, hsl.s, hsl.l),
      hslToHex((hsl.h + 180) % 360, hsl.s, hsl.l),
      hslToHex((hsl.h + 270) % 360, hsl.s, hsl.l)
    ];
  }

  function mixColors(hex1, hex2, weight = 0.5) {
    const c1 = hexToRgb(hex1);
    const c2 = hexToRgb(hex2);
    return rgbToHex(
      Math.round(c1.r * (1 - weight) + c2.r * weight),
      Math.round(c1.g * (1 - weight) + c2.g * weight),
      Math.round(c1.b * (1 - weight) + c2.b * weight)
    );
  }

  function randomColor() {
    return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
  }

  function getColorName(hex) {
    const lower = hex.toLowerCase();
    for (const [name, value] of Object.entries(CSS_NAMED_COLORS)) {
      if (value === lower) return name;
    }
    let closest = '', minDist = Infinity;
    const rgb = hexToRgb(lower);
    for (const [name, value] of Object.entries(CSS_NAMED_COLORS)) {
      const c = hexToRgb(value);
      const dist = Math.sqrt(Math.pow(rgb.r - c.r, 2) + Math.pow(rgb.g - c.g, 2) + Math.pow(rgb.b - c.b, 2));
      if (dist < minDist) { minDist = dist; closest = name; }
    }
    return closest;
  }

  function isLight(hex) {
    const { r, g, b } = hexToRgb(hex);
    return relativeLuminance(r, g, b) > 0.179;
  }

  function sortColorsByHue(colors) {
    return [...colors].sort((a, b) => hexToHsl(a).h - hexToHsl(b).h);
  }

  function sortColorsBySaturation(colors) {
    return [...colors].sort((a, b) => hexToHsl(b).s - hexToHsl(a).s);
  }

  function sortColorsByLuminance(colors) {
    return [...colors].sort((a, b) => hexToHsl(b).l - hexToHsl(a).l);
  }

  return {
    hexToRgb, rgbToHex, rgbToHsl, hslToRgb, hexToHsl, hslToHex,
    rgbToHsv, hsvToRgb, relativeLuminance, contrastRatio, wcagCompliance,
    colorDistanceCIE76, colorDistanceCIEDE2000, simulateColorBlindness,
    colorTemperature, getComplementary, getAnalogous, getTriadic,
    getSplitComplementary, getTetradic, mixColors, randomColor,
    getColorName, isLight, sortColorsByHue, sortColorsBySaturation,
    sortColorsByLuminance, rgbToLab, rgbToXyz
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = ColorUtils;
