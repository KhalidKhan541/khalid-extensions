class BoxModelVisualizer {
  constructor() {
    this.overlays = [];
    this.rulers = [];
    this.canvas = null;
    this.ctx = null;
    this.currentBox = null;
    this.animationFrame = null;
    this.init();
  }

  init() {
    this.createCanvas();
    this.bindEvents();
  }

  createCanvas() {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'css-picker-box-canvas';
    this.canvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 2147483645;
    `;
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  calculateBoxModel(element) {
    const computed = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    const getNum = (val) => {
      const num = parseFloat(val);
      return isNaN(num) ? 0 : Math.round(num * 100) / 100;
    };

    const content = {
      width: rect.width,
      height: rect.height,
      x: rect.x + scrollX,
      y: rect.y + scrollY
    };

    const padding = {
      top: getNum(computed.paddingTop),
      right: getNum(computed.paddingRight),
      bottom: getNum(computed.paddingBottom),
      left: getNum(computed.paddingLeft)
    };

    const border = {
      top: getNum(computed.borderTopWidth),
      right: getNum(computed.borderRightWidth),
      bottom: getNum(computed.borderBottomWidth),
      left: getNum(computed.borderLeftWidth)
    };

    const margin = {
      top: getNum(computed.marginTop),
      right: getNum(computed.marginRight),
      bottom: getNum(computed.marginBottom),
      left: getNum(computed.marginLeft)
    };

    return { content, padding, border, margin, rect };
  }

  showBoxModel(element, animate = true) {
    this.clearOverlays();
    this.clearRulers();

    const box = this.calculateBoxModel(element);
    this.currentBox = box;

    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const viewX = box.rect.x;
    const viewY = box.rect.y;

    const marginOverlay = this.createOverlay('margin', {
      x: viewX - margin.left,
      y: viewY - margin.top,
      width: box.content.width + padding.left + padding.right + border.left + border.right + margin.left + margin.right,
      height: box.content.height + padding.top + padding.bottom + border.top + border.bottom + margin.top + margin.bottom
    }, 'rgba(239, 68, 68, 0.2)', 'rgba(239, 68, 68, 0.6)');

    const borderOverlay = this.createOverlay('border', {
      x: viewX - border.left - padding.left,
      y: viewY - border.top - padding.top,
      width: box.content.width + padding.left + padding.right + border.left + border.right,
      height: box.content.height + padding.top + padding.bottom + border.top + border.bottom
    }, 'rgba(245, 158, 11, 0.2)', 'rgba(245, 158, 11, 0.6)');

    const paddingOverlay = this.createOverlay('padding', {
      x: viewX - padding.left,
      y: viewY - padding.top,
      width: box.content.width + padding.left + padding.right,
      height: box.content.height + padding.top + padding.bottom
    }, 'rgba(34, 197, 94, 0.2)', 'rgba(34, 197, 94, 0.6)');

    const contentOverlay = this.createOverlay('content', {
      x: viewX,
      y: viewY,
      width: box.content.width,
      height: box.content.height
    }, 'rgba(99, 102, 241, 0.15)', 'rgba(99, 102, 241, 0.6)');

    this.overlays = [marginOverlay, borderOverlay, paddingOverlay, contentOverlay];

    this.showRulers(box, viewX, viewY);

    if (animate) {
      this.animateOverlays();
    }

    this.drawBoxModelDiagram(box);
  }

  createOverlay(type, rect, bgColor, borderColor) {
    const overlay = document.createElement('div');
    overlay.className = `css-picker-box-overlay css-picker-${type}`;
    overlay.style.cssText = `
      position: absolute;
      left: ${rect.x}px;
      top: ${rect.y}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      background: ${bgColor};
      border: 1px dashed ${borderColor};
      pointer-events: none;
      z-index: 2147483646;
    `;

    overlay.dataset.type = type;
    overlay.dataset.value = JSON.stringify({
      top: type === 'margin' ? this.currentBox.margin.top :
           type === 'border' ? this.currentBox.border.top :
           type === 'padding' ? this.currentBox.padding.top : 0,
      right: type === 'margin' ? this.currentBox.margin.right :
             type === 'border' ? this.currentBox.border.right :
             type === 'padding' ? this.currentBox.padding.right : 0,
      bottom: type === 'margin' ? this.currentBox.margin.bottom :
              type === 'border' ? this.currentBox.border.bottom :
              type === 'padding' ? this.currentBox.padding.bottom : 0,
      left: type === 'margin' ? this.currentBox.margin.left :
            type === 'border' ? this.currentBox.border.left :
            type === 'padding' ? this.currentBox.padding.left : 0
    });

    document.body.appendChild(overlay);
    return overlay;
  }

  showRulers(box, viewX, viewY) {
    const rulerHeight = 20;

    const topRuler = this.createRuler('horizontal', {
      x: viewX,
      y: viewY - rulerHeight - 5,
      width: box.content.width,
      height: rulerHeight,
      text: `${Math.round(box.content.width)}px`
    });

    const leftRuler = this.createRuler('vertical', {
      x: viewX - rulerHeight - 5,
      y: viewY,
      width: rulerHeight,
      height: box.content.height,
      text: `${Math.round(box.content.height)}px`
    });

    this.rulers = [topRuler, leftRuler];
  }

  createRuler(direction, data) {
    const ruler = document.createElement('div');
    ruler.className = `css-picker-ruler css-picker-ruler-${direction === 'horizontal' ? 'h' : 'v'}`;
    ruler.style.cssText = `
      position: absolute;
      left: ${data.x}px;
      top: ${data.y}px;
      width: ${data.width}px;
      height: ${data.height}px;
    `;
    ruler.textContent = data.text;
    document.body.appendChild(ruler);
    return ruler;
  }

  animateOverlays() {
    let progress = 0;
    const duration = 200;
    const start = performance.now();

    const animate = (time) => {
      progress = Math.min((time - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);

      this.overlays.forEach(overlay => {
        overlay.style.opacity = ease;
      });

      if (progress < 1) {
        this.animationFrame = requestAnimationFrame(animate);
      }
    };

    this.overlays.forEach(overlay => {
      overlay.style.opacity = 0;
    });

    this.animationFrame = requestAnimationFrame(animate);
  }

  clearOverlays() {
    this.overlays.forEach(overlay => overlay.remove());
    this.overlays = [];
  }

  clearRulers() {
    this.rulers.forEach(ruler => ruler.remove());
    this.rulers = [];
  }

  clear() {
    this.clearOverlays();
    this.clearRulers();
    this.currentBox = null;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }

  drawBoxModelDiagram(box) {
    const diagramCanvas = document.getElementById('box-model-canvas');
    if (!diagramCanvas) return;

    const ctx = diagramCanvas.getContext('2d');
    const centerX = diagramCanvas.width / 2;
    const centerY = diagramCanvas.height / 2;

    ctx.clearRect(0, 0, diagramCanvas.width, diagramCanvas.height);

    const totalWidth = box.content.width + box.padding.left + box.padding.right +
                      box.border.left + box.border.right + box.margin.left + box.margin.right;
    const totalHeight = box.content.height + box.padding.top + box.padding.bottom +
                       box.border.top + box.border.bottom + box.margin.top + box.margin.bottom;

    const scale = Math.min(
      (diagramCanvas.width - 80) / totalWidth,
      (diagramCanvas.height - 60) / totalHeight,
      1
    );

    const layers = [
      { name: 'margin', color: 'rgba(239, 68, 68, 0.3)', border: '#ef4444', values: box.margin },
      { name: 'border', color: 'rgba(245, 158, 11, 0.3)', border: '#f59e0b', values: box.border },
      { name: 'padding', color: 'rgba(34, 197, 94, 0.3)', border: '#22c55e', values: box.padding },
      { name: 'content', color: 'rgba(99, 102, 241, 0.3)', border: '#6366f1', values: { top: 0, right: 0, bottom: 0, left: 0 } }
    ];

    let currentX = centerX - (box.content.width * scale / 2);
    let currentY = centerY - (box.content.height * scale / 2);

    const drawData = [];

    layers.forEach((layer, i) => {
      let x, y, width, height;

      if (i === 0) {
        x = currentX - layer.values.left * scale;
        y = currentY - layer.values.top * scale;
        width = (box.content.width + box.padding.left + box.padding.right +
                box.border.left + box.border.right + layer.values.left + layer.values.right) * scale;
        height = (box.content.height + box.padding.top + box.padding.bottom +
                 box.border.top + box.border.bottom + layer.values.top + layer.values.bottom) * scale;
      } else if (i === 1) {
        x = currentX - (box.padding.left + layer.values.left) * scale;
        y = currentY - (box.padding.top + layer.values.top) * scale;
        width = (box.content.width + box.padding.left + box.padding.right +
                layer.values.left + layer.values.right) * scale;
        height = (box.content.height + box.padding.top + box.padding.bottom +
                 layer.values.top + layer.values.bottom) * scale;
      } else if (i === 2) {
        x = currentX - layer.values.left * scale;
        y = currentY - layer.values.top * scale;
        width = (box.content.width + layer.values.left + layer.values.right) * scale;
        height = (box.content.height + layer.values.top + layer.values.bottom) * scale;
      } else {
        x = currentX;
        y = currentY;
        width = box.content.width * scale;
        height = box.content.height * scale;
      }

      ctx.fillStyle = layer.color;
      ctx.strokeStyle = layer.border;
      ctx.lineWidth = 1;
      ctx.fillRect(x, y, width, height);
      ctx.strokeRect(x, y, width, height);

      drawData.push({
        name: layer.name,
        values: layer.values,
        x, y, width, height,
        border: layer.border
      });
    });

    ctx.fillStyle = '#6366f1';
    ctx.font = '11px SF Mono, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('content', centerX, centerY - 7);
    ctx.fillText(`${Math.round(box.content.width)} × ${Math.round(box.content.height)}`, centerX, centerY + 7);

    ctx.font = '9px SF Mono, monospace';

    drawData.slice(0, 3).forEach((layer, i) => {
      ctx.fillStyle = layer.border;
      ctx.textAlign = 'left';
      ctx.fillText(layer.name.toUpperCase(), layer.x + 4, layer.y + 10);

      if (layer.values.top > 0) {
        ctx.textAlign = 'center';
        ctx.fillText(layer.values.top, centerX, layer.y + 10);
      }
      if (layer.values.right > 0) {
        ctx.textAlign = 'right';
        ctx.fillText(layer.values.right, layer.x + layer.width - 4, centerY);
      }
      if (layer.values.bottom > 0) {
        ctx.textAlign = 'center';
        ctx.fillText(layer.values.bottom, centerX, layer.y + layer.height - 4);
      }
      if (layer.values.left > 0) {
        ctx.textAlign = 'left';
        ctx.fillText(layer.values.left, layer.x + 4, centerY);
      }
    });
  }
}

window.BoxModelVisualizer = BoxModelVisualizer;
