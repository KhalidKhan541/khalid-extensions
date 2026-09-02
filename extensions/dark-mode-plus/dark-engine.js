/**
 * Dark Mode Plus - Core Dark Mode Engine
 * Handles CSS color transformation, theme generation, and dark mode application.
 */

const DarkEngine = (() => {
  const DARK_BG = '#1a1a2e';
  const DARK_TEXT = '#e0e0e0';
  const DARK_SURFACE = '#16213e';
  const DARK_BORDER = '#2a2a4a';

  // Colors to preserve (brand colors, etc.)
  const PRESERVE_COLORS = new Set([
    '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff',
    '#ff6600', '#ff3399', '#00cc66', '#3366ff'
  ]);

  function parseColor(color) {
    if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') return null;
    const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return null;
    return { r: parseInt(m[1]), g: parseInt(m[2]), b: parseInt(m[3]) };
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
    return { h: h * 360, s: s * 100, l: l * 100 };
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
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }

  function transformLightness(hsl, options = {}) {
    const {
      maxLightness = 30,
      minSaturation = 5,
      boostSaturation = 1.2,
      darkenFactor = 0.85
    } = options;

    // Already dark enough
    if (hsl.l <= maxLightness) return hsl;

    // Very light colors -> dark background tones
    if (hsl.l > 85) {
      return {
        h: hsl.h,
        s: Math.min(hsl.s * 0.6, 30),
        l: Math.max(hsl.l * 0.15, 8)
      };
    }

    // Light colors -> reduce lightness significantly
    let newL = Math.max(hsl.l * darkenFactor, 10);
    if (newL > maxLightness) newL = maxLightness;

    // Boost saturation for low-sat colors to maintain vibrancy
    let newS = hsl.s;
    if (hsl.s > minSaturation && hsl.s < 40) {
      newS = Math.min(hsl.s * boostSaturation, 60);
    }

    return { h: hsl.h, s: newS, l: newL };
  }

  function transformColor(color, options = {}) {
    const rgb = parseColor(color);
    if (!rgb) return color;

    // Skip near-black or near-transparent
    if (rgb.r < 10 && rgb.g < 10 && rgb.b < 10) return color;

    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

    // Skip already dark colors
    if (hsl.l <= 25 && hsl.s < 10) return color;

    // Skip highly saturated pure colors (brand colors)
    if (hsl.s > 80 && hsl.l > 40 && hsl.l < 70) return color;

    // Preserve specific hues if configured
    if (options.preserveHues && options.preserveHues.includes(Math.round(hsl.h))) {
      return color;
    }

    const transformed = transformLightness(hsl, options);
    const newRgb = hslToRgb(transformed.h, transformed.s, transformed.l);
    return `rgb(${newRgb.r}, ${newRgb.g}, ${newRgb.b})`;
  }

  function generateCSS(options = {}) {
    const {
      brightness = 100,
      contrast = 100,
      dimImages = false,
      fontSmoothing = false,
      transitionSpeed = '0.3',
      customCSS = ''
    } = options;

    const brightnessFactor = brightness / 100;
    const contrastFactor = contrast / 100;

    let css = `:root {
      --dmp-bg: ${DARK_BG};
      --dmp-surface: ${DARK_SURFACE};
      --dmp-text: ${DARK_TEXT};
      --dmp-border: ${DARK_BORDER};
      --dmp-accent: #667eea;
      --dmp-brightness: ${brightnessFactor};
      --dmp-contrast: ${contrastFactor};
    }

    html.dmp-active {
      color-scheme: dark !important;
    }

    html.dmp-active body {
      background-color: ${DARK_BG} !important;
      color: ${DARK_TEXT} !important;
    }

    html.dmp-active *:not(img):not(video):not(canvas):not(svg):not([class*="dmp-"]) {
      background-color: var(--dmp-bg) !important;
      color: var(--dmp-text) !important;
      border-color: var(--dmp-border) !important;
    }

    html.dmp-active img,
    html.dmp-active video,
    html.dmp-active canvas {
      ${dimImages ? `filter: brightness(0.8) contrast(1.05) !important;` : ''}
      ${transitionSpeed !== '0' ? `transition: filter ${transitionSpeed}s ease !important;` : ''}
    }

    html.dmp-active svg:not([class*="icon"]) {
      filter: brightness(${brightnessFactor}) !important;
    }

    html.dmp-active a {
      color: #667eea !important;
    }

    html.dmp-active a:visited {
      color: #9b59b6 !important;
    }

    html.dmp-active input,
    html.dmp-active textarea,
    html.dmp-active select {
      background-color: #0f0f23 !important;
      color: ${DARK_TEXT} !important;
      border-color: ${DARK_BORDER} !important;
    }

    html.dmp-active button {
      background-color: ${DARK_SURFACE} !important;
      color: ${DARK_TEXT} !important;
    }

    html.dmp-active table,
    html.dmp-active th,
    html.dmp-active td {
      background-color: ${DARK_SURFACE} !important;
      border-color: ${DARK_BORDER} !important;
      color: ${DARK_TEXT} !important;
    }

    html.dmp-active tr:nth-child(even) {
      background-color: #1a1a35 !important;
    }

    html.dmp-active pre,
    html.dmp-active code {
      background-color: #0f0f23 !important;
      color: #a8e6cf !important;
    }

    html.dmp-active ::-webkit-scrollbar {
      width: 10px;
      height: 10px;
    }

    html.dmp-active ::-webkit-scrollbar-track {
      background: #1a1a2e;
    }

    html.dmp-active ::-webkit-scrollbar-thumb {
      background: #3a3a5a;
      border-radius: 5px;
    }

    html.dmp-active ::-webkit-scrollbar-thumb:hover {
      background: #4a4a6a;
    }

    html.dmp-active ::selection {
      background-color: rgba(102, 126, 234, 0.3) !important;
      color: white !important;
    }

    html.dmp-active h1, html.dmp-active h2, html.dmp-active h3,
    html.dmp-active h4, html.dmp-active h5, html.dmp-active h6 {
      color: #ffffff !important;
    }

    html.dmp-active blockquote {
      border-left-color: var(--dmp-accent) !important;
      background-color: rgba(102, 126, 234, 0.05) !important;
    }

    html.dmp-active hr {
      border-color: var(--dmp-border) !important;
    }

    html.dmp-active [style*="background-color"],
    html.dmp-active [style*="background:"] {
      filter: brightness(${brightnessFactor}) !important;
    }`;

    if (fontSmoothing) {
      css += `

    html.dmp-active,
    html.dmp-active body,
    html.dmp-active * {
      -webkit-font-smoothing: antialiased !important;
      -moz-osx-font-smoothing: grayscale !important;
      text-rendering: optimizeLegibility !important;
    }`;
    }

    if (contrast !== 100) {
      css += `

    html.dmp-active body {
      filter: contrast(${contrastFactor}) !important;
    }`;
    }

    if (brightness !== 100) {
      css += `

    html.dmp-active body {
      filter: brightness(${brightnessFactor}) ${contrast !== 100 ? `contrast(${contrastFactor})` : ''} !important;
    }`;
    }

    if (customCSS) {
      css += `

/* User Custom CSS */
${customCSS}`;
    }

    return css;
  }

  function processBackgroundColors(root) {
    if (!root) return;
    const elements = root.querySelectorAll('*');
    for (const el of elements) {
      const style = el.style;
      if (style.backgroundColor && style.backgroundColor !== 'transparent') {
        const transformed = transformColor(style.backgroundColor);
        if (transformed !== style.backgroundColor) {
          el.style.backgroundColor = transformed;
        }
      }
    }
  }

  return {
    parseColor,
    rgbToHsl,
    hslToRgb,
    transformColor,
    transformLightness,
    generateCSS,
    processBackgroundColors,
    DARK_BG,
    DARK_TEXT,
    DARK_SURFACE,
    DARK_BORDER
  };
})();

if (typeof window !== 'undefined') {
  window.DarkEngine = DarkEngine;
}
