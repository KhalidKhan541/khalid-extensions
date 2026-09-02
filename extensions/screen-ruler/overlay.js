class OverlaySystem {
  constructor() {
    this.svgNS = 'http://www.w3.org/2000/svg';
    this.container = null;
    this.rulerH = null;
    this.rulerV = null;
    this.measurementLayer = null;
    this.gridLayer = null;
    this.guideLayer = null;
    this.highlightLayer = null;
    this.tooltip = null;
    this.colorTooltip = null;
    this.annotations = [];
    this.guideLines = [];
    this.measurements = [];
    this.init();
  }

  init() {
    this.createContainer();
    this.createRulers();
    this.createMeasurementLayer();
    this.createGridLayer();
    this.createGuideLayer();
    this.createHighlightLayer();
    this.createTooltip();
    this.createColorTooltip();
  }

  createContainer() {
    this.container = document.createElement('div');
    this.container.id = 'screen-ruler-overlay';
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 2147483647;
      overflow: hidden;
    `;
    document.body.appendChild(this.container);
  }

  createRulers() {
    const rulerThickness = 30;

    this.rulerH = document.createElement('canvas');
    this.rulerH.id = 'sr-ruler-h';
    this.rulerH.style.cssText = `
      position: fixed;
      top: 0;
      left: ${rulerThickness}px;
      width: calc(100% - ${rulerThickness}px);
      height: ${rulerThickness}px;
      background: rgba(26, 26, 46, 0.95);
      border-bottom: 1px solid #333;
      pointer-events: auto;
      z-index: 2147483647;
    `;
    this.container.appendChild(this.rulerH);

    this.rulerV = document.createElement('canvas');
    this.rulerV.id = 'sr-ruler-v';
    this.rulerV.style.cssText = `
      position: fixed;
      top: ${rulerThickness}px;
      left: 0;
      width: ${rulerThickness}px;
      height: calc(100% - ${rulerThickness}px);
      background: rgba(26, 26, 46, 0.95);
      border-right: 1px solid #333;
      pointer-events: auto;
      z-index: 2147483646;
    `;
    this.container.appendChild(this.rulerV);

    this.corner = document.createElement('div');
    this.corner.id = 'sr-corner';
    this.corner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: ${rulerThickness}px;
      height: ${rulerThickness}px;
      background: rgba(26, 26, 46, 0.95);
      border-right: 1px solid #333;
      border-bottom: 1px solid #333;
      z-index: 2147483648;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    this.corner.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF4081" stroke-width="2">
        <path d="M2 2h20v20H2z"/>
        <path d="M2 8h4M2 14h4M2 20h4"/>
        <path d="M8 2v4M14 2v4M20 2v4"/>
      </svg>
    `;
    this.container.appendChild(this.corner);
  }

  createMeasurementLayer() {
    this.measurementLayer = document.createElementNS(this.svgNS, 'svg');
    this.measurementLayer.id = 'sr-measurement-layer';
    this.measurementLayer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 2147483645;
    `;
    this.container.appendChild(this.measurementLayer);
  }

  createGridLayer() {
    this.gridLayer = document.createElementNS(this.svgNS, 'svg');
    this.gridLayer.id = 'sr-grid-layer';
    this.gridLayer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 2147483644;
      display: none;
    `;
    this.container.appendChild(this.gridLayer);
  }

  createGuideLayer() {
    this.guideLayer = document.createElementNS(this.svgNS, 'svg');
    this.guideLayer.id = 'sr-guide-layer';
    this.guideLayer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 2147483643;
    `;
    this.container.appendChild(this.guideLayer);
  }

  createHighlightLayer() {
    this.highlightLayer = document.createElement('div');
    this.highlightLayer.id = 'sr-highlight-layer';
    this.highlightLayer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 2147483642;
    `;
    this.container.appendChild(this.highlightLayer);
  }

  createTooltip() {
    this.tooltip = document.createElement('div');
    this.tooltip.id = 'sr-tooltip';
    this.tooltip.style.cssText = `
      position: fixed;
      display: none;
      background: rgba(26, 26, 46, 0.95);
      border: 1px solid #FF4081;
      border-radius: 6px;
      padding: 6px 10px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      color: #fff;
      white-space: nowrap;
      pointer-events: none;
      z-index: 2147483647;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    `;
    this.container.appendChild(this.tooltip);
  }

  createColorTooltip() {
    this.colorTooltip = document.createElement('div');
    this.colorTooltip.id = 'sr-color-tooltip';
    this.colorTooltip.style.cssText = `
      position: fixed;
      display: none;
      background: rgba(26, 26, 46, 0.95);
      border: 1px solid #333;
      border-radius: 6px;
      padding: 8px 10px;
      font-family: 'Courier New', monospace;
      font-size: 11px;
      color: #fff;
      white-space: nowrap;
      pointer-events: none;
      z-index: 2147483647;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    `;
    this.container.appendChild(this.colorTooltip);
  }

  renderRulers(color, thickness, scrollX, scrollY) {
    const dpr = window.devicePixelRatio || 1;

    this.rulerH.width = window.innerWidth * dpr;
    this.rulerH.height = thickness * dpr;
    this.rulerH.style.height = `${thickness}px`;
    const ctxH = this.rulerH.getContext('2d');
    ctxH.scale(dpr, dpr);
    this.drawRuler(ctxH, window.innerWidth, thickness, scrollX, false, color);

    this.rulerV.width = thickness * dpr;
    this.rulerV.height = window.innerHeight * dpr;
    this.rulerV.style.width = `${thickness}px`;
    this.rulerV.style.top = `${thickness}px`;
    const ctxV = this.rulerV.getContext('2d');
    ctxV.scale(dpr, dpr);
    this.drawRuler(ctxV, window.innerHeight, thickness, scrollY, true, color);

    this.corner.style.width = `${thickness}px`;
    this.corner.style.height = `${thickness}px`;
  }

  drawRuler(ctx, length, thickness, scrollOffset, vertical, color) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = 'rgba(26, 26, 46, 0.95)';
    ctx.fillRect(0, 0, length, thickness);

    const interval = this.getTickInterval();
    const startTick = Math.floor(scrollOffset / interval) * interval;

    for (let pos = startTick; pos <= scrollOffset + length + interval; pos += interval) {
      const screenPos = pos - scrollOffset;
      if (screenPos < 0 || screenPos > length) continue;

      const isMajor = pos % (interval * 5) === 0;
      const tickHeight = isMajor ? thickness * 0.6 : thickness * 0.3;
      const tickWidth = isMajor ? 1.5 : 0.5;

      ctx.strokeStyle = isMajor ? color : '#555';
      ctx.lineWidth = tickWidth;
      ctx.beginPath();

      if (vertical) {
        ctx.moveTo(0, screenPos);
        ctx.lineTo(tickHeight, screenPos);
      } else {
        ctx.moveTo(screenPos, thickness);
        ctx.lineTo(screenPos, thickness - tickHeight);
      }
      ctx.stroke();

      if (isMajor) {
        ctx.fillStyle = isMajor ? '#ccc' : '#666';
        ctx.font = '9px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = vertical ? 'middle' : 'bottom';

        const label = Math.round(pos);
        if (vertical) {
          ctx.save();
          ctx.translate(thickness * 0.4, screenPos);
          ctx.rotate(-Math.PI / 2);
          ctx.fillText(label, 0, 0);
          ctx.restore();
        } else {
          ctx.fillText(label, screenPos, thickness - 2);
        }
      }
    }
  }

  getTickInterval() {
    const zoom = window.devicePixelRatio || 1;
    if (zoom >= 2) return 20;
    if (zoom >= 1.5) return 10;
    return 10;
  }

  showTooltip(x, y, text) {
    this.tooltip.style.display = 'block';
    this.tooltip.textContent = text;
    this.tooltip.style.left = `${x + 15}px`;
    this.tooltip.style.top = `${y + 15}px`;

    const rect = this.tooltip.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      this.tooltip.style.left = `${x - rect.width - 10}px`;
    }
    if (rect.bottom > window.innerHeight) {
      this.tooltip.style.top = `${y - rect.height - 10}px`;
    }
  }

  hideTooltip() {
    this.tooltip.style.display = 'none';
  }

  showColorTooltip(x, y, colorData) {
    this.colorTooltip.style.display = 'block';
    this.colorTooltip.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;">
        <div style="width:24px;height:24px;border-radius:4px;border:1px solid #555;background:${colorData.hex};"></div>
        <div>
          <div>${colorData.hex}</div>
          <div style="color:#888;">${colorData.rgb}</div>
        </div>
      </div>
    `;
    this.colorTooltip.style.left = `${x + 20}px`;
    this.colorTooltip.style.top = `${y + 20}px`;

    const rect = this.colorTooltip.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      this.colorTooltip.style.left = `${x - rect.width - 10}px`;
    }
    if (rect.bottom > window.innerHeight) {
      this.colorTooltip.style.top = `${y - rect.height - 10}px`;
    }
  }

  hideColorTooltip() {
    this.colorTooltip.style.display = 'none';
  }

  drawMeasurementLine(x1, y1, x2, y2, color, label) {
    const line = document.createElementNS(this.svgNS, 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', '2');
    line.setAttribute('stroke-dasharray', '4,3');
    this.measurementLayer.appendChild(line);

    const endCircle1 = document.createElementNS(this.svgNS, 'circle');
    endCircle1.setAttribute('cx', x1);
    endCircle1.setAttribute('cy', y1);
    endCircle1.setAttribute('r', '4');
    endCircle1.setAttribute('fill', color);
    this.measurementLayer.appendChild(endCircle1);

    const endCircle2 = document.createElementNS(this.svgNS, 'circle');
    endCircle2.setAttribute('cx', x2);
    endCircle2.setAttribute('cy', y2);
    endCircle2.setAttribute('r', '4');
    endCircle2.setAttribute('fill', color);
    this.measurementLayer.appendChild(endCircle2);

    if (label) {
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;

      const bg = document.createElementNS(this.svgNS, 'rect');
      const text = document.createElementNS(this.svgNS, 'text');
      text.textContent = label;
      text.setAttribute('x', midX);
      text.setAttribute('y', midY - 8);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', '#fff');
      text.setAttribute('font-size', '12');
      text.setAttribute('font-family', 'Courier New, monospace');
      text.setAttribute('font-weight', 'bold');
      this.measurementLayer.appendChild(text);

      const bbox = text.getBBox();
      bg.setAttribute('x', bbox.x - 4);
      bg.setAttribute('y', bbox.y - 2);
      bg.setAttribute('width', bbox.width + 8);
      bg.setAttribute('height', bbox.height + 4);
      bg.setAttribute('rx', '3');
      bg.setAttribute('fill', 'rgba(26, 26, 46, 0.9)');
      bg.setAttribute('stroke', color);
      bg.setAttribute('stroke-width', '1');
      this.measurementLayer.insertBefore(bg, text);
    }

    return { line, endCircle1, endCircle2 };
  }

  drawDimensionBox(x, y, width, height, color, label) {
    const g = document.createElementNS(this.svgNS, 'g');

    const rect = document.createElementNS(this.svgNS, 'rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', width);
    rect.setAttribute('height', height);
    rect.setAttribute('fill', 'none');
    rect.setAttribute('stroke', color);
    rect.setAttribute('stroke-width', '1');
    rect.setAttribute('stroke-dasharray', '4,3');
    g.appendChild(rect);

    if (label) {
      const text = document.createElementNS(this.svgNS, 'text');
      text.textContent = label;
      text.setAttribute('x', x + width / 2);
      text.setAttribute('y', y + height / 2);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('fill', '#fff');
      text.setAttribute('font-size', '12');
      text.setAttribute('font-family', 'Courier New, monospace');
      text.setAttribute('font-weight', 'bold');
      g.appendChild(text);

      const bbox = text.getBBox();
      const bg = document.createElementNS(this.svgNS, 'rect');
      bg.setAttribute('x', bbox.x - 4);
      bg.setAttribute('y', bbox.y - 2);
      bg.setAttribute('width', bbox.width + 8);
      bg.setAttribute('height', bbox.height + 4);
      bg.setAttribute('rx', '3');
      bg.setAttribute('fill', 'rgba(26, 26, 46, 0.9)');
      g.insertBefore(bg, text);
    }

    this.measurementLayer.appendChild(g);
    return g;
  }

  highlightElement(element, color) {
    const rect = element.getBoundingClientRect();
    this.clearHighlight();

    const highlight = document.createElement('div');
    highlight.className = 'sr-element-highlight';
    highlight.style.cssText = `
      position: fixed;
      left: ${rect.left}px;
      top: ${rect.top}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      border: 2px solid ${color};
      background: ${color}22;
      pointer-events: none;
      box-sizing: border-box;
    `;
    this.highlightLayer.appendChild(highlight);

    const dimensions = document.createElement('div');
    dimensions.className = 'sr-element-dimensions';
    dimensions.style.cssText = `
      position: fixed;
      left: ${rect.left}px;
      top: ${rect.top - 24}px;
      background: rgba(26, 26, 46, 0.95);
      border: 1px solid ${color};
      border-radius: 4px;
      padding: 2px 6px;
      font-family: 'Courier New', monospace;
      font-size: 11px;
      color: #fff;
      white-space: nowrap;
      pointer-events: none;
      z-index: 2147483647;
    `;
    dimensions.textContent = `${Math.round(rect.width)} × ${Math.round(rect.height)}`;
    this.highlightLayer.appendChild(dimensions);
  }

  clearHighlight() {
    this.highlightLayer.innerHTML = '';
  }

  showGrid(size, color, opacity) {
    this.gridLayer.style.display = 'block';
    this.gridLayer.innerHTML = '';

    const width = window.innerWidth;
    const height = window.innerHeight;

    const defs = document.createElementNS(this.svgNS, 'defs');
    const pattern = document.createElementNS(this.svgNS, 'pattern');
    pattern.setAttribute('id', 'sr-grid-pattern');
    pattern.setAttribute('width', size);
    pattern.setAttribute('height', size);
    pattern.setAttribute('patternUnits', 'userSpaceOnUse');

    const pathH = document.createElementNS(this.svgNS, 'path');
    pathH.setAttribute('d', `M ${size} 0 L 0 0 0 ${size}`);
    pathH.setAttribute('fill', 'none');
    pathH.setAttribute('stroke', color);
    pathH.setAttribute('stroke-width', '0.5');
    pathH.setAttribute('stroke-opacity', opacity / 100);
    pattern.appendChild(pathH);

    defs.appendChild(pattern);
    this.gridLayer.appendChild(defs);

    const rect = document.createElementNS(this.svgNS, 'rect');
    rect.setAttribute('width', '100%');
    rect.setAttribute('height', '100%');
    rect.setAttribute('fill', 'url(#sr-grid-pattern)');
    this.gridLayer.appendChild(rect);
  }

  hideGrid() {
    this.gridLayer.style.display = 'none';
    this.gridLayer.innerHTML = '';
  }

  addGuideLine(orientation, position, color) {
    const line = document.createElementNS(this.svgNS, 'line');
    const isHorizontal = orientation === 'horizontal';

    line.setAttribute('x1', isHorizontal ? 0 : position);
    line.setAttribute('y1', isHorizontal ? position : 0);
    line.setAttribute('x2', isHorizontal ? '100%' : position);
    line.setAttribute('y2', isHorizontal ? position : '100%');
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', '1');
    line.setAttribute('stroke-dasharray', '5,5');
    line.style.pointerEvents = 'auto';
    line.style.cursor = isHorizontal ? 'ns-resize' : 'ew-resize';

    line.dataset.orientation = orientation;
    line.dataset.position = position;

    this.guideLayer.appendChild(line);
    this.guideLines.push(line);
    return line;
  }

  clearGuides() {
    this.guideLayer.innerHTML = '';
    this.guideLines = [];
  }

  clearMeasurements() {
    this.measurementLayer.innerHTML = '';
    this.measurements = [];
  }

  clearAll() {
    this.clearMeasurements();
    this.clearHighlight();
    this.clearGuides();
    this.hideGrid();
    this.hideTooltip();
    this.hideColorTooltip();
  }

  remove() {
    this.container.remove();
  }

  updateCursor(mode) {
    const cursorMap = {
      'point-to-point': 'crosshair',
      'element-inspector': 'pointer',
      'grid': 'default',
      'color-picker': 'crosshair',
      'angle': 'crosshair'
    };
    document.body.style.cursor = cursorMap[mode] || 'default';
  }

  resetCursor() {
    document.body.style.cursor = '';
  }

  updateCrosshair(x, y, color) {
    let crosshair = document.getElementById('sr-crosshair');
    if (!crosshair) {
      crosshair = document.createElement('div');
      crosshair.id = 'sr-crosshair';
      crosshair.style.cssText = `
        position: fixed;
        pointer-events: none;
        z-index: 2147483641;
      `;
      crosshair.innerHTML = `
        <div class="sr-crosshair-h" style="position:fixed;height:1px;background:${color};opacity:0.5;left:0;right:0;"></div>
        <div class="sr-crosshair-v" style="position:fixed;width:1px;background:${color};opacity:0.5;top:0;bottom:0;"></div>
      `;
      this.container.appendChild(crosshair);
    }

    const h = crosshair.querySelector('.sr-crosshair-h');
    const v = crosshair.querySelector('.sr-crosshair-v');
    h.style.top = `${y}px`;
    h.style.background = color;
    v.style.left = `${x}px`;
    v.style.background = color;
    crosshair.style.display = 'block';
  }

  hideCrosshair() {
    const crosshair = document.getElementById('sr-crosshair');
    if (crosshair) crosshair.style.display = 'none';
  }
}

if (typeof window !== 'undefined') {
  window.OverlaySystem = OverlaySystem;
}
