class CSSInspector {
  constructor() {
    this.styles = window.getComputedStyle(document.documentElement);
  }

  getComputedStyles(element) {
    const computed = window.getComputedStyle(element);
    const styles = {};

    for (let i = 0; i < computed.length; i++) {
      const prop = computed[i];
      styles[prop] = computed.getPropertyValue(prop);
    }

    return styles;
  }

  getBoxModel(element) {
    const computed = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();

    const getNum = (val) => {
      const num = parseFloat(val);
      return isNaN(num) ? 0 : Math.round(num * 100) / 100;
    };

    return {
      content: {
        width: rect.width,
        height: rect.height
      },
      padding: {
        top: getNum(computed.paddingTop),
        right: getNum(computed.paddingRight),
        bottom: getNum(computed.paddingBottom),
        left: getNum(computed.paddingLeft)
      },
      border: {
        top: getNum(computed.borderTopWidth),
        right: getNum(computed.borderRightWidth),
        bottom: getNum(computed.borderBottomWidth),
        left: getNum(computed.borderLeftWidth)
      },
      margin: {
        top: getNum(computed.marginTop),
        right: getNum(computed.marginRight),
        bottom: getNum(computed.marginBottom),
        left: getNum(computed.marginLeft)
      }
    };
  }

  getCSSVariables(element) {
    const variables = [];
    const roots = [document.documentElement, element];
    const seen = new Set();

    roots.forEach(root => {
      const computed = window.getComputedStyle(root);
      for (let i = 0; i < computed.length; i++) {
        const prop = computed[i];
        if (prop.startsWith('--')) {
          const value = computed.getPropertyValue(prop).trim();
          if (value && !seen.has(prop)) {
            seen.add(prop);
            variables.push({ name: prop, value });
          }
        }
      }
    });

    const walkUp = (el) => {
      const computed = window.getComputedStyle(el);
      for (let i = 0; i < computed.length; i++) {
        const prop = computed[i];
        if (prop.startsWith('--')) {
          const value = computed.getPropertyValue(prop).trim();
          if (value && !seen.has(prop)) {
            seen.add(prop);
            variables.push({ name: prop, value });
          }
        }
      }
      if (el.parentElement && el.parentElement !== document.documentElement) {
        walkUp(el.parentElement);
      }
    };

    if (element !== document.documentElement) {
      walkUp(element);
    }

    return variables;
  }

  getMediaQueries() {
    const queries = [];
    const sheets = document.styleSheets;

    for (let i = 0; i < sheets.length; i++) {
      try {
        const rules = sheets[i].cssRules;
        for (let j = 0; j < rules.length; j++) {
          if (rules[j] instanceof CSSMediaRule) {
            const mediaRule = rules[j];
            queries.push({
              query: mediaRule.conditionText,
              ruleCount: mediaRule.cssRules.length
            });
          }
        }
      } catch (e) {
        // Cross-origin stylesheet
      }
    }

    const unique = [];
    const seen = new Set();
    queries.forEach(q => {
      if (!seen.has(q.query)) {
        seen.add(q.query);
        unique.push(q);
      }
    });

    return unique;
  }

  getFontSummary(element) {
    const fonts = {};
    const elements = element
      ? [element, ...element.querySelectorAll('*')]
      : document.querySelectorAll('*');

    elements.forEach(el => {
      const computed = window.getComputedStyle(el);
      const family = computed.fontFamily;
      const size = computed.fontSize;
      const weight = computed.fontWeight;

      if (!fonts[family]) {
        fonts[family] = {
          family,
          sizes: new Set(),
          weights: new Set(),
          count: 0
        };
      }

      fonts[family].sizes.add(size);
      fonts[family].weights.add(weight);
      fonts[family].count++;
    });

    return Object.values(fonts).map(f => ({
      family: f.family,
      sizes: Array.from(f.sizes),
      weights: Array.from(f.weights),
      count: f.count
    }));
  }

  getColorPalette(element) {
    const colors = new Set();
    const elements = element
      ? [element, ...element.querySelectorAll('*')]
      : document.querySelectorAll('*');

    const colorProps = [
      'color', 'backgroundColor', 'borderColor',
      'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
      'outlineColor', 'textDecorationColor', 'columnRuleColor',
      'fill', 'stroke', 'floodColor', 'lightingColor'
    ];

    elements.forEach(el => {
      const computed = window.getComputedStyle(el);
      colorProps.forEach(prop => {
        const value = computed.getPropertyValue(prop);
        if (value && value !== 'transparent' && value !== 'rgba(0, 0, 0, 0)') {
          colors.add(value);
        }
      });
    });

    return Array.from(colors);
  }

  getCSSRules(element) {
    const rules = [];
    const sheets = document.styleSheets;

    for (let i = 0; i < sheets.length; i++) {
      try {
        const sheetRules = sheets[i].cssRules;
        for (let j = 0; j < sheetRules.length; j++) {
          const rule = sheetRules[j];
          if (rule instanceof CSSStyleRule) {
            try {
              if (element.matches(rule.selectorText)) {
                const properties = [];
                for (let k = 0; k < rule.style.length; k++) {
                  const prop = rule.style[k];
                  properties.push({
                    name: prop,
                    value: rule.style.getPropertyValue(prop)
                  });
                }

                let source = '';
                if (rule.parentRule instanceof CSSMediaRule) {
                  source = `@media ${rule.parentRule.conditionText}`;
                } else if (sheets[i].href) {
                  const url = new URL(sheets[i].href);
                  source = url.pathname.split('/').pop();
                } else {
                  source = '<style>';
                }

                rules.push({
                  selector: rule.selectorText,
                  properties,
                  source,
                  specificity: this.calculateSpecificity(rule.selectorText)
                });
              }
            } catch (e) {
              // Invalid selector
            }
          }
        }
      } catch (e) {
        // Cross-origin stylesheet
      }
    }

    return rules.sort((a, b) => {
      const specA = a.specificity.split(' ').map(Number);
      const specB = b.specificity.split(' ').map(Number);
      for (let i = 0; i < 3; i++) {
        if (specA[i] !== specB[i]) return specB[i] - specA[i];
      }
      return 0;
    });
  }

  calculateSpecificity(selector) {
    let a = 0, b = 0, c = 0;

    const idMatches = selector.match(/#[a-zA-Z0-9_-]+/g);
    if (idMatches) a = idMatches.length;

    const classMatches = selector.match(/\.[a-zA-Z0-9_-]+/g);
    if (classMatches) b = classMatches.length;

    const attrMatches = selector.match(/\[[^\]]+\]/g);
    if (attrMatches) b += attrMatches.length;

    const pseudoClassMatches = selector.match(/:[a-zA-Z0-9_-]+/g);
    if (pseudoClassMatches) b += pseudoClassMatches.length;

    const elementMatches = selector.match(/^[a-zA-Z0-9]+|[\s>+~][a-zA-Z0-9]+/g);
    if (elementMatches) c = elementMatches.length;

    return `${a} ${b} ${c}`;
  }

  generateSelector(element) {
    if (element.id) {
      return `#${CSS.escape(element.id)}`;
    }

    const parts = [];
    let current = element;

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();

      if (current.id) {
        selector = `#${CSS.escape(current.id)}`;
        parts.unshift(selector);
        break;
      }

      if (current.className && typeof current.className === 'string') {
        const classes = current.className.trim().split(/\s+/)
          .filter(c => c && !c.startsWith('css-picker-'))
          .map(c => `.${CSS.escape(c)}`);
        if (classes.length > 0) {
          selector += classes.join('');
        }
      }

      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(
          child => child.tagName === current.tagName
        );
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          selector += `:nth-of-type(${index})`;
        }
      }

      parts.unshift(selector);
      current = current.parentElement;
    }

    return parts.join(' > ');
  }

  getBreadcrumb(element) {
    const parts = [];
    let current = element;

    while (current && current !== document.documentElement) {
      let part = current.tagName.toLowerCase();
      if (current.id) {
        part = `#${current.id}`;
      } else if (current.className && typeof current.className === 'string') {
        const classes = current.className.trim().split(/\s+/)
          .filter(c => c && !c.startsWith('css-picker-'))
          .slice(0, 2);
        if (classes.length > 0) {
          part += '.' + classes.join('.');
        }
      }
      parts.unshift(part);
      current = current.parentElement;
    }

    return parts;
  }

  getElementDimensions(element) {
    const rect = element.getBoundingClientRect();
    const computed = window.getComputedStyle(element);

    return {
      width: rect.width,
      height: rect.height,
      x: rect.x,
      y: rect.y,
      scrollWidth: element.scrollWidth,
      scrollHeight: element.scrollHeight,
      clientWidth: element.clientWidth,
      clientHeight: element.clientHeight,
      offsetWidth: element.offsetWidth,
      offsetHeight: element.offsetHeight
    };
  }

  analyzeCascade(element) {
    const cascade = [];
    const sheets = document.styleSheets;

    for (let i = 0; i < sheets.length; i++) {
      try {
        const rules = sheets[i].cssRules;
        for (let j = 0; j < rules.length; j++) {
          if (rules[j] instanceof CSSStyleRule) {
            try {
              if (element.matches(rules[j].selectorText)) {
                cascade.push({
                  selector: rules[j].selectorText,
                  origin: sheets[i].href ? 'external' : 'inline',
                  specificity: this.calculateSpecificity(rules[j].selectorText)
                });
              }
            } catch (e) {}
          }
        }
      } catch (e) {}
    }

    return cascade;
  }
}

window.CSSInspector = CSSInspector;
