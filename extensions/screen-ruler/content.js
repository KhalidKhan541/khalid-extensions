(() => {
  if (window.screenRulerLoaded) return;
  window.screenRulerLoaded = true;

  let ruler = null;
  let overlay = null;
  let enabled = false;
  let currentMode = 'point-to-point';
  let currentUnit = 'px';
  let rulerColor = '#FF4081';
  let gridSize = 50;
  let gridColor = '#2196F3';
  let gridOpacity = 30;
  let rulerThickness = 30;
  let baseFontSize = 16;
  let decimalPlaces = 2;
  let snapEnabled = true;
  let showCoordinates = true;
  let history = [];

  let isDragging = false;
  let startPoint = null;
  let tempLine = null;
  let tempLabel = null;
  let anglePoints = [];

  const savedSettings = {};

  async function loadSettings() {
    try {
      const result = await chrome.storage.local.get('screenRulerSettings');
      if (result.screenRulerSettings) {
        const s = result.screenRulerSettings;
        currentUnit = s.unit || 'px';
        rulerColor = s.rulerColor || '#FF4081';
        gridSize = s.gridSize || 50;
        gridColor = s.gridColor || '#2196F3';
        gridOpacity = s.gridOpacity || 30;
        rulerThickness = s.rulerThickness || 30;
        baseFontSize = s.baseFontSize || 16;
        decimalPlaces = s.decimalPlaces || 2;
        snapEnabled = s.snapEnabled !== false;
        showCoordinates = s.showCoordinates !== false;
        history = s.history || [];
      }
    } catch (e) {
      console.error('Screen Ruler: Failed to load settings', e);
    }
  }

  async function saveHistory() {
    try {
      await chrome.storage.local.set({
        screenRulerSettings: {
          unit: currentUnit,
          rulerColor,
          gridSize,
          gridColor,
          gridOpacity,
          rulerThickness,
          baseFontSize,
          decimalPlaces,
          snapEnabled,
          showCoordinates,
          history: history.slice(-10)
        }
      });
    } catch (e) {
      console.error('Screen Ruler: Failed to save history', e);
    }
  }

  function addToHistory(value) {
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    history.push({ value, time });
    if (history.length > 10) history.shift();
    saveHistory();
  }

  function init() {
    if (!ruler) ruler = new RulerEngine();
    if (!overlay) overlay = new OverlaySystem();

    ruler.settings.unit = currentUnit;
    ruler.settings.baseFontSize = baseFontSize;
    ruler.settings.decimalPlaces = decimalPlaces;
    ruler.settings.snapEnabled = snapEnabled;
    ruler.settings.showCoordinates = showCoordinates;
    ruler.settings.rulerColor = rulerColor;
    ruler.settings.rulerThickness = rulerThickness;
  }

  function activate() {
    init();
    enabled = true;
    overlay.updateCursor(currentMode);
    renderRulers();
    attachListeners();
    updateBadge(true);
  }

  function deactivate() {
    enabled = false;
    if (overlay) {
      overlay.clearAll();
      overlay.resetCursor();
      overlay.hideCrosshair();
    }
    detachListeners();
    updateBadge(false);
  }

  function toggleRuler(state) {
    if (state !== undefined) {
      state ? activate() : deactivate();
    } else {
      enabled ? deactivate() : activate();
    }
  }

  function updateBadge(state) {
    chrome.runtime.sendMessage({
      action: 'rulerToggled',
      enabled: state
    }).catch(() => {});
  }

  function renderRulers() {
    if (!enabled || !overlay) return;
    ruler.updateViewport();
    const scroll = ruler.getScrollPosition();
    overlay.renderRulers(rulerColor, rulerThickness, scroll.x, scroll.y);
  }

  let scrollTimeout;
  function onScroll() {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      renderRulers();
    }, 16);
  }

  let resizeTimeout;
  function onResize() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      renderRulers();
      if (currentMode === 'grid') {
        overlay.showGrid(gridSize, gridColor, gridOpacity);
      }
    }, 100);
  }

  function onMouseMove(e) {
    if (!enabled) return;

    if (showCoordinates) {
      overlay.updateCrosshair(e.clientX, e.clientY, rulerColor);
    }

    if (currentMode === 'element-inspector') {
      const hit = ruler.getElementAtPoint(e.clientX, e.clientY);
      if (hit) {
        overlay.highlightElement(hit.element, rulerColor);
        const b = hit.bounds;
        overlay.showTooltip(e.clientX, e.clientY,
          `${hit.selector} ${b.widthFormatted} × ${b.heightFormatted}`
        );
      }
    } else if (currentMode === 'color-picker') {
      overlay.showTooltip(e.clientX, e.clientY, 'Click to pick color');
    } else if (isDragging && startPoint) {
      const result = ruler.measureDistance(startPoint.x, startPoint.y, e.clientX, e.clientY);
      overlay.showTooltip(e.clientX, e.clientY,
        `${result.distanceFormatted} (${result.dx} × ${result.dy}) ${result.angle}`
      );
    } else if (showCoordinates) {
      overlay.showTooltip(e.clientX, e.clientY,
        `x: ${Math.round(e.clientX + window.scrollX)}, y: ${Math.round(e.clientY + window.scrollY)}`
      );
    }
  }

  function onMouseDown(e) {
    if (!enabled) return;
    if (e.button !== 0) return;

    const target = e.target;
    if (target.closest('#screen-ruler-overlay')) return;

    if (currentMode === 'point-to-point' || currentMode === 'angle') {
      isDragging = true;
      startPoint = { x: e.clientX, y: e.clientY };

      if (currentMode === 'angle') {
        anglePoints.push({ x: e.clientX, y: e.clientY });
        if (anglePoints.length === 3) {
          const angle = ruler.calculateAngle(
            anglePoints[0].x, anglePoints[0].y,
            anglePoints[1].x, anglePoints[1].y,
            anglePoints[2].x, anglePoints[2].y
          );
          overlay.drawMeasurementLine(
            anglePoints[0].x, anglePoints[0].y,
            anglePoints[1].x, anglePoints[1].y,
            rulerColor
          );
          overlay.drawMeasurementLine(
            anglePoints[1].x, anglePoints[1].y,
            anglePoints[2].x, anglePoints[2].y,
            rulerColor
          );
          overlay.showTooltip(anglePoints[1].x, anglePoints[1].y, angle);
          addToHistory(angle);
          anglePoints = [];
        }
        return;
      }
    } else if (currentMode === 'color-picker') {
      const colorData = getPixelColorAtPoint(e.clientX, e.clientY);
      if (colorData) {
        overlay.showColorTooltip(e.clientX, e.clientY, colorData);
        addToHistory(colorData.hex);
      }
    }
  }

  function onMouseUp(e) {
    if (!enabled || !isDragging || !startPoint) return;

    isDragging = false;
    const endPoint = { x: e.clientX, y: e.clientY };

    if (Math.abs(endPoint.x - startPoint.x) > 2 || Math.abs(endPoint.y - startPoint.y) > 2) {
      const result = ruler.measureDistance(startPoint.x, startPoint.y, endPoint.x, endPoint.y);
      overlay.drawMeasurementLine(
        startPoint.x, startPoint.y,
        endPoint.x, endPoint.y,
        rulerColor,
        result.distanceFormatted
      );
      addToHistory(result.distanceFormatted);
    }

    startPoint = null;
    overlay.hideTooltip();
  }

  function onKeyDown(e) {
    if (!enabled) return;

    switch (e.key) {
      case 'Escape':
        if (isDragging) {
          isDragging = false;
          startPoint = null;
          overlay.hideTooltip();
        }
        anglePoints = [];
        overlay.clearMeasurements();
        overlay.hideColorTooltip();
        break;
      case 'r':
      case 'R':
        if (!e.ctrlKey && !e.metaKey) {
          toggleRuler();
        }
        break;
      case 'g':
      case 'G':
        if (!e.ctrlKey && !e.metaKey) {
          if (currentMode === 'grid') {
            currentMode = 'point-to-point';
            overlay.hideGrid();
          } else {
            currentMode = 'grid';
            overlay.showGrid(gridSize, gridColor, gridOpacity);
          }
          overlay.updateCursor(currentMode);
        }
        break;
      case 'c':
      case 'C':
        if (!e.ctrlKey && !e.metaKey) {
          currentMode = 'color-picker';
          overlay.updateCursor(currentMode);
        }
        break;
      case 'Delete':
        overlay.clearAll();
        break;
    }
  }

  function getPixelColorAtPoint(x, y) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = window.innerWidth;
      tempCanvas.height = window.innerHeight;
      const tempCtx = tempCanvas.getContext('2d');

      tempCtx.drawWindow(window, 0, 0, window.innerWidth, window.innerHeight, '#fff');
      const pixel = tempCtx.getImageData(x, y, 1, 1).data;

      const hex = '#' + [pixel[0], pixel[1], pixel[2]]
        .map(v => v.toString(16).padStart(2, '0'))
        .join('');

      return {
        hex,
        rgb: `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`,
        rgba: `rgba(${pixel[0]}, ${pixel[1]}, ${pixel[2]}, ${(pixel[3] / 255).toFixed(2)})`
      };
    } catch (e) {
      return null;
    }
  }

  function onWheel(e) {
    if (!enabled) return;
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      renderRulers();
    }
  }

  let mouseMoveThrottled;
  function onMouseMoveThrottled(e) {
    if (mouseMoveThrottled) return;
    mouseMoveThrottled = true;
    requestAnimationFrame(() => {
      onMouseMove(e);
      mouseMoveThrottled = false;
    });
  }

  function attachListeners() {
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    document.addEventListener('mousemove', onMouseMoveThrottled);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('wheel', onWheel, { passive: false });
  }

  function detachListeners() {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('mousemove', onMouseMoveThrottled);
    document.removeEventListener('mousedown', onMouseDown);
    document.removeEventListener('mouseup', onMouseUp);
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('wheel', onWheel);
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
      case 'toggleRuler':
        toggleRuler(message.enabled);
        sendResponse({ enabled });
        break;

      case 'setMode':
        currentMode = message.mode;
        if (overlay) {
          overlay.updateCursor(currentMode);
          if (currentMode === 'grid') {
            overlay.showGrid(gridSize, gridColor, gridOpacity);
          } else {
            overlay.hideGrid();
          }
        }
        sendResponse({ mode: currentMode });
        break;

      case 'setUnit':
        currentUnit = message.unit;
        if (ruler) ruler.settings.unit = currentUnit;
        sendResponse({ unit: currentUnit });
        break;

      case 'setColor':
        rulerColor = message.color;
        if (ruler) ruler.settings.rulerColor = rulerColor;
        renderRulers();
        sendResponse({ color: rulerColor });
        break;

      case 'setGridSettings':
        gridSize = message.size;
        gridColor = message.color;
        gridOpacity = message.opacity;
        if (currentMode === 'grid' && overlay) {
          overlay.showGrid(gridSize, gridColor, gridOpacity);
        }
        sendResponse({ success: true });
        break;

      case 'takeScreenshot':
        takeScreenshot();
        sendResponse({ success: true });
        break;

      case 'clearMeasurements':
        if (overlay) overlay.clearAll();
        sendResponse({ success: true });
        break;

      case 'updateSettings':
        if (message.baseFontSize !== undefined) baseFontSize = message.baseFontSize;
        if (message.decimalPlaces !== undefined) decimalPlaces = message.decimalPlaces;
        if (message.rulerThickness !== undefined) rulerThickness = message.rulerThickness;
        if (message.snapEnabled !== undefined) snapEnabled = message.snapEnabled;
        if (message.showCoordinates !== undefined) showCoordinates = message.showCoordinates;
        if (ruler) {
          ruler.settings.baseFontSize = baseFontSize;
          ruler.settings.decimalPlaces = decimalPlaces;
          ruler.settings.rulerThickness = rulerThickness;
          ruler.settings.snapEnabled = snapEnabled;
          ruler.settings.showCoordinates = showCoordinates;
        }
        renderRulers();
        sendResponse({ success: true });
        break;

      default:
        sendResponse({ error: 'Unknown action' });
    }
    return true;
  });

  async function takeScreenshot() {
    try {
      const dataUrl = await chrome.runtime.sendMessage({ action: 'captureVisibleTab' });
      if (dataUrl) {
        const link = document.createElement('a');
        link.download = `screen-ruler-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (e) {
      console.error('Screen Ruler: Screenshot failed', e);
    }
  }

  loadSettings().then(() => {
    chrome.runtime.sendMessage({ action: 'getState' }, (state) => {
      if (chrome.runtime.lastError) return;
      if (state && state.enabled) {
        activate();
      }
    });
  });
})();
