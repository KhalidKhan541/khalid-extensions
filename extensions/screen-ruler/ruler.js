class RulerEngine {
  constructor() {
    this.settings = {
      unit: 'px',
      baseFontSize: 16,
      decimalPlaces: 2,
      snapEnabled: true,
      showCoordinates: true,
      rulerColor: '#FF4081',
      rulerThickness: 30
    };
    this.devicePixelRatio = window.devicePixelRatio || 1;
    this.scrollX = 0;
    this.scrollY = 0;
    this.viewportWidth = window.innerWidth;
    this.viewportHeight = window.innerHeight;
  }

  updateViewport() {
    this.devicePixelRatio = window.devicePixelRatio || 1;
    this.scrollX = window.scrollX;
    this.scrollY = window.scrollY;
    this.viewportWidth = window.innerWidth;
    this.viewportHeight = window.innerHeight;
  }

  convertUnit(pxValue) {
    const dp = this.settings.decimalPlaces;
    switch (this.settings.unit) {
      case 'rem':
        return (pxValue / this.settings.baseFontSize).toFixed(dp) + 'rem';
      case 'em':
        return (pxValue / this.settings.baseFontSize).toFixed(dp) + 'em';
      case '%':
        return ((pxValue / this.viewportWidth) * 100).toFixed(dp) + '%';
      default:
        return pxValue.toFixed(dp) + 'px';
    }
  }

  convertUnitValue(pxValue) {
    const dp = this.settings.decimalPlaces;
    switch (this.settings.unit) {
      case 'rem':
        return parseFloat((pxValue / this.settings.baseFontSize).toFixed(dp));
      case 'em':
        return parseFloat((pxValue / this.settings.baseFontSize).toFixed(dp));
      case '%':
        return parseFloat(((pxValue / this.viewportWidth) * 100).toFixed(dp));
      default:
        return parseFloat(pxValue.toFixed(dp));
    }
  }

  getUnitLabel() {
    return this.settings.unit;
  }

  measureDistance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    return {
      distance,
      distanceFormatted: this.convertUnit(distance),
      dx: this.convertUnit(Math.abs(dx)),
      dy: this.convertUnit(Math.abs(dy)),
      angle: angle.toFixed(1) + '°',
      raw: { dx: Math.abs(dx), dy: Math.abs(dy), distance }
    };
  }

  getElementBounds(element) {
    const rect = element.getBoundingClientRect();
    const computed = window.getComputedStyle(element);

    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left,
      widthFormatted: this.convertUnit(rect.width),
      heightFormatted: this.convertUnit(rect.height),
      padding: {
        top: parseFloat(computed.paddingTop),
        right: parseFloat(computed.paddingRight),
        bottom: parseFloat(computed.paddingBottom),
        left: parseFloat(computed.paddingLeft)
      },
      margin: {
        top: parseFloat(computed.marginTop),
        right: parseFloat(computed.marginRight),
        bottom: parseFloat(computed.marginBottom),
        left: parseFloat(computed.marginLeft)
      },
      computed: {
        fontSize: computed.fontSize,
        lineHeight: computed.lineHeight,
        display: computed.display,
        position: computed.position
      }
    };
  }

  getElementAtPoint(x, y) {
    const element = document.elementFromPoint(x, y);
    if (!element) return null;

    const bounds = this.getElementBounds(element);
    return {
      element,
      bounds,
      tagName: element.tagName.toLowerCase(),
      className: element.className,
      id: element.id,
      selector: this.getSelector(element)
    };
  }

  getSelector(element) {
    if (element.id) return `#${element.id}`;
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.trim().split(/\s+/).slice(0, 2).map(c => `.${c}`).join('');
      return `${element.tagName.toLowerCase()}${classes}`;
    }
    return element.tagName.toLowerCase();
  }

  snapToGrid(x, y, gridSize) {
    return {
      x: Math.round(x / gridSize) * gridSize,
      y: Math.round(y / gridSize) * gridSize
    };
  }

  snapToElement(x, y, threshold = 10) {
    const elements = document.querySelectorAll('*');
    let closest = null;
    let minDist = threshold;

    for (const el of elements) {
      const rect = el.getBoundingClientRect();
      const points = [
        { x: rect.left, y: rect.top },
        { x: rect.right, y: rect.top },
        { x: rect.left, y: rect.bottom },
        { x: rect.right, y: rect.bottom },
        { x: rect.left + rect.width / 2, y: rect.top },
        { x: rect.left + rect.width / 2, y: rect.bottom },
        { x: rect.left, y: rect.top + rect.height / 2 },
        { x: rect.right, y: rect.top + rect.height / 2 }
      ];

      for (const point of points) {
        const dist = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2);
        if (dist < minDist) {
          minDist = dist;
          closest = { x: point.x, y: point.y, element: el };
        }
      }
    }

    return closest || { x, y, element: null };
  }

  getPixelColor(x, y) {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');

    const html = document.documentElement;
    const body = document.body;

    const dataUrl = this.captureRegion(x, y, 1, 1);
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, 1, 1);
        const pixel = ctx.getImageData(0, 0, 1, 1).data;
        const hex = '#' + [pixel[0], pixel[1], pixel[2]]
          .map(v => v.toString(16).padStart(2, '0'))
          .join('');
        resolve({
          hex,
          rgb: `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`,
          rgba: `rgba(${pixel[0]}, ${pixel[1]}, ${pixel[2]}, ${(pixel[3] / 255).toFixed(2)})`
        });
      };
      img.src = dataUrl;
    });
  }

  captureRegion(x, y, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width * this.devicePixelRatio;
    canvas.height = height * this.devicePixelRatio;
    const ctx = canvas.getContext('2d');

    ctx.scale(this.devicePixelRatio, this.devicePixelRatio);
    ctx.drawWindow(window, x, y, width, height, '#fff');
    return canvas.toDataURL();
  }

  calculateAngle(x1, y1, x2, y2, x3, y3) {
    const v1 = { x: x1 - x2, y: y1 - y2 };
    const v2 = { x: x3 - x2, y: y3 - y2 };

    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x ** 2 + v1.y ** 2);
    const mag2 = Math.sqrt(v2.x ** 2 + v2.y ** 2);

    const cosAngle = dot / (mag1 * mag2);
    const angle = Math.acos(Math.min(1, Math.max(-1, cosAngle)));

    return (angle * 180 / Math.PI).toFixed(1) + '°';
  }

  formatMeasurement(value, type) {
    const dp = this.settings.decimalPlaces;
    switch (type) {
      case 'distance':
        return this.convertUnit(value);
      case 'angle':
        return value.toFixed(1) + '°';
      case 'position':
        return `(${this.convertUnit(value.x)}, ${this.convertUnit(value.y)})`;
      case 'dimensions':
        return `${this.convertUnit(value.width)} × ${this.convertUnit(value.height)}`;
      default:
        return value.toFixed(dp);
    }
  }

  generateRulerTicks(length, interval = 10) {
    const ticks = [];
    for (let i = 0; i <= length; i += interval) {
      const isMajor = i % (interval * 5) === 0;
      const isMinor = i % interval === 0;
      if (isMajor || isMinor) {
        ticks.push({
          position: i,
          isMajor,
          isMinor,
          label: isMajor ? this.convertUnit(i) : null
        });
      }
    }
    return ticks;
  }

  getScrollPosition() {
    return {
      x: window.scrollX,
      y: window.scrollY,
      maxScrollX: document.documentElement.scrollWidth - window.innerWidth,
      maxScrollY: document.documentElement.scrollHeight - window.innerHeight
    };
  }

  getViewportSize() {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: this.devicePixelRatio
    };
  }
}

if (typeof window !== 'undefined') {
  window.RulerEngine = RulerEngine;
}
