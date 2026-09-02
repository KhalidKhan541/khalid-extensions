(() => {
  if (window.__colorCraftLoaded) return;
  window.__colorCraftLoaded = true;

  let isActive = false;
  let magnifier, magnifierCtx, magnifierCanvas;
  let tooltip, notification, customCursor, cursorColor;
  let gridOverlay;
  let lastColor = '#000000';
  const ZOOM = 4;
  const LENS_SIZE = 160;
  const GRID_SIZE = 10;

  function createElements() {
    if (document.getElementById('cc-magnifier')) return;

    magnifier = document.createElement('div');
    magnifier.id = 'cc-magnifier';
    magnifierCanvas = document.createElement('canvas');
    magnifierCanvas.width = LENS_SIZE;
    magnifierCanvas.height = LENS_SIZE;
    magnifierCtx = magnifierCanvas.getContext('2d', { willReadFrequently: true });
    magnifier.appendChild(magnifierCanvas);

    gridOverlay = document.createElement('canvas');
    gridOverlay.id = 'cc-magnifier-grid';
    gridOverlay.width = LENS_SIZE;
    gridOverlay.height = LENS_SIZE;
    magnifier.appendChild(gridOverlay);

    const crosshair = document.createElement('div');
    crosshair.id = 'cc-crosshair';
    magnifier.appendChild(crosshair);

    const centerDot = document.createElement('div');
    centerDot.id = 'cc-center-dot';
    magnifier.appendChild(centerDot);

    tooltip = document.createElement('div');
    tooltip.id = 'cc-color-tooltip';

    notification = document.createElement('div');
    notification.id = 'cc-copy-notification';

    customCursor = document.createElement('div');
    customCursor.id = 'cc-custom-cursor';
    const cursorRing = document.createElement('div');
    cursorRing.id = 'cc-cursor-ring';
    cursorColor = document.createElement('div');
    cursorColor.id = 'cc-cursor-color';
    cursorRing.appendChild(cursorColor);
    customCursor.appendChild(cursorRing);

    document.documentElement.appendChild(magnifier);
    document.documentElement.appendChild(tooltip);
    document.documentElement.appendChild(notification);
    document.documentElement.appendChild(customCursor);
  }

  function drawGrid(ctx, width, height) {
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 0.5;
    const centerX = width / 2;
    const centerY = height / 2;
    for (let x = centerX % GRID_SIZE; x < width; x += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = centerY % GRID_SIZE; y < height; y += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  function getPixelColor(x, y) {
    const canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    try {
      ctx.drawWindow(window, x - LENS_SIZE / (2 * ZOOM), y - LENS_SIZE / (2 * ZOOM),
        LENS_SIZE / ZOOM, LENS_SIZE / ZOOM, '', 0);
    } catch {
      return null;
    }
    const pixel = ctx.getImageData(LENS_SIZE / 2, LENS_SIZE / 2, 1, 1).data;
    return { r: pixel[0], g: pixel[1], b: pixel[2] };
  }

  function getPixelColorFromPage(x, y) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawWindow(window, x, y, 1, 1, '', 0);
      const pixel = ctx.getImageData(0, 0, 1, 1).data;
      return { r: pixel[0], g: pixel[1], b: pixel[2] };
    } catch {
      return null;
    }
  }

  function updateMagnifier(e) {
    const x = e.clientX;
    const y = e.clientY;

    magnifier.style.display = 'block';
    tooltip.style.display = 'block';
    customCursor.style.display = 'block';
    document.body.style.cursor = 'none';

    magnifier.style.left = (x - LENS_SIZE / 2) + 'px';
    magnifier.style.top = (y - LENS_SIZE / 2) + 'px';

    customCursor.style.left = (x - 14) + 'px';
    customCursor.style.top = (y - 14) + 'px';

    magnifierCtx.clearRect(0, 0, LENS_SIZE, LENS_SIZE);
    magnifierCtx.save();
    magnifierCtx.beginPath();
    magnifierCtx.arc(LENS_SIZE / 2, LENS_SIZE / 2, LENS_SIZE / 2, 0, Math.PI * 2);
    magnifierCtx.clip();
    magnifierCtx.imageSmoothingEnabled = false;

    const srcSize = LENS_SIZE / ZOOM;
    try {
      magnifierCtx.drawWindow(window, x - srcSize / 2, y - srcSize / 2, srcSize, srcSize, '', 0);
    } catch {
      magnifierCtx.fillStyle = '#333';
      magnifierCtx.fillRect(0, 0, LENS_SIZE, LENS_SIZE);
    }
    magnifierCtx.restore();

    const gridCtx = gridOverlay.getContext('2d');
    drawGrid(gridCtx, LENS_SIZE, LENS_SIZE);

    const color = getPixelColorFromPage(x, y);
    if (color) {
      const hex = ColorUtils.rgbToHex(color.r, color.g, color.b);
      const hsl = ColorUtils.rgbToHsl(color.r, color.g, color.b);
      lastColor = hex;

      tooltip.innerHTML = `
        <div class="cc-hex"><span class="cc-preview" style="background:${hex}"></span>${hex.toUpperCase()}</div>
        <div class="cc-rgb">RGB(${color.r}, ${color.g}, ${color.b})</div>
        <div class="cc-hsl">HSL(${hsl.h}, ${hsl.s}%, ${hsl.l}%)</div>
      `;

      let tx = x + 20;
      let ty = y + 20;
      if (tx + 180 > window.innerWidth) tx = x - 190;
      if (ty + 80 > window.innerHeight) ty = y - 90;
      tooltip.style.left = tx + 'px';
      tooltip.style.top = ty + 'px';

      cursorColor.style.background = hex;
    }
  }

  function pickColor(e) {
    const color = getPixelColorFromPage(e.clientX, e.clientY);
    if (color) {
      const hex = ColorUtils.rgbToHex(color.r, color.g, color.b);
      navigator.clipboard.writeText(hex).then(() => {
        showNotification(`Copied ${hex.toUpperCase()}`);
      }).catch(() => {
        showNotification(hex.toUpperCase());
      });

      chrome.runtime.sendMessage({
        type: 'EYEDROPPER_COLOR_PICKED',
        color: hex
      });
      deactivate();
    }
  }

  function showNotification(text) {
    notification.textContent = text;
    notification.classList.add('show');
    setTimeout(() => notification.classList.remove('show'), 1500);
  }

  function onMouseMove(e) {
    if (!isActive) return;
    e.preventDefault();
    e.stopPropagation();
    updateMagnifier(e);
  }

  function onClick(e) {
    if (!isActive) return;
    e.preventDefault();
    e.stopPropagation();
    pickColor(e);
  }

  function onKeyDown(e) {
    if (e.key === 'Escape' && isActive) {
      deactivate();
      chrome.runtime.sendMessage({ type: 'DEACTIVATE_EYEDROPPER' });
    }
  }

  function activate() {
    if (isActive) return;
    isActive = true;
    createElements();
    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown, true);
  }

  function deactivate() {
    isActive = false;
    if (magnifier) magnifier.style.display = 'none';
    if (tooltip) tooltip.style.display = 'none';
    if (customCursor) customCursor.style.display = 'none';
    document.body.style.cursor = '';
    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKeyDown, true);
  }

  chrome.runtime.onMessage.addListener((message) => {
    switch (message.type) {
      case 'START_EYEDROPPER':
        activate();
        break;
      case 'STOP_EYEDROPPER':
        deactivate();
        break;
      case 'SHOW_COPY_NOTIFICATION':
        showNotification(message.text);
        break;
    }
  });
})();
