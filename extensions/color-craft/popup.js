(() => {
  let currentColor = '#E94560';
  let palettes = [];
  let history = [];
  let favorites = [];

  const $ = id => document.getElementById(id);
  const $$ = sel => document.querySelectorAll(sel);

  function init() {
    loadData();
    setupTabs();
    setupPicker();
    setupPalettes();
    setupContrast();
    setupHarmony();
    setupMixer();
    setupAccessibility();
    updateAll(currentColor);
  }

  function loadData() {
    chrome.storage.local.get({ palettes: [], history: [], favorites: [] }, data => {
      palettes = data.palettes;
      history = data.history;
      favorites = data.favorites;
      renderHistory();
      renderFavorites();
      renderPalettes();
    });
  }

  function saveData() {
    chrome.storage.local.set({ palettes, history, favorites });
  }

  function showToast(text) {
    const t = $('toast');
    t.textContent = text;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 1500);
  }

  function updateAll(hex) {
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return;
    currentColor = hex.toUpperCase();
    const rgb = ColorUtils.hexToRgb(hex);
    const hsl = ColorUtils.rgbToHsl(rgb.r, rgb.g, rgb.b);

    $('inputHex').value = hex.toUpperCase();
    $('inputR').value = rgb.r;
    $('inputG').value = rgb.g;
    $('inputB').value = rgb.b;
    $('inputH').value = hsl.h;
    $('inputS').value = hsl.s;
    $('inputL').value = hsl.l;

    const preview = $('colorPreview');
    preview.style.background = hex;
    $('previewText').textContent = hex.toUpperCase();
    preview.style.color = ColorUtils.isLight(hex) ? '#000' : '#fff';

    updateMixerPreview();
    updateTemperature();
  }

  // Tabs
  function setupTabs() {
    $$('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.tab').forEach(t => t.classList.remove('active'));
        $$('.panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        $(`panel-${tab.dataset.tab}`).classList.add('active');
      });
    });
  }

  // Picker
  function setupPicker() {
    $('inputHex').addEventListener('input', e => {
      let v = e.target.value;
      if (!v.startsWith('#')) v = '#' + v;
      if (/^#[0-9a-fA-F]{6}$/.test(v)) updateAll(v);
    });

    ['inputR', 'inputG', 'inputB'].forEach(id => {
      $(id).addEventListener('input', () => {
        const r = parseInt($('inputR').value) || 0;
        const g = parseInt($('inputG').value) || 0;
        const b = parseInt($('inputB').value) || 0;
        updateAll(ColorUtils.rgbToHex(r, g, b));
      });
    });

    ['inputH', 'inputS', 'inputL'].forEach(id => {
      $(id).addEventListener('input', () => {
        const h = parseInt($('inputH').value) || 0;
        const s = parseInt($('inputS').value) || 0;
        const l = parseInt($('inputL').value) || 0;
        updateAll(ColorUtils.hslToHex(h, s, l));
      });
    });

    $('colorPreview').addEventListener('click', () => {
      navigator.clipboard.writeText(currentColor);
      showToast(`Copied ${currentColor}`);
    });

    $('btnEyedropper').addEventListener('click', activateEyedropper);
    $('btnEyedropper2').addEventListener('click', activateEyedropper);

    $('btnRandom').addEventListener('click', () => updateAll(ColorUtils.randomColor()));

    $('btnFav').addEventListener('click', () => {
      if (!favorites.includes(currentColor)) {
        favorites.unshift(currentColor);
        if (favorites.length > 30) favorites.length = 30;
        saveData();
        renderFavorites();
        showToast('Added to favorites');
      }
    });

    $('btnCopyHex').addEventListener('click', () => {
      navigator.clipboard.writeText(currentColor);
      showToast(`Copied ${currentColor}`);
    });

    $('btnCopyRgb').addEventListener('click', () => {
      const rgb = ColorUtils.hexToRgb(currentColor);
      navigator.clipboard.writeText(`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`);
      showToast('Copied RGB');
    });

    $('btnCopyHsl').addEventListener('click', () => {
      const hsl = ColorUtils.hexToHsl(currentColor);
      navigator.clipboard.writeText(`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`);
      showToast('Copied HSL');
    });

    $('btnClearHistory').addEventListener('click', () => {
      history = [];
      saveData();
      renderHistory();
    });

    $('btnClearFavs').addEventListener('click', () => {
      favorites = [];
      saveData();
      renderFavorites();
    });
  }

  function activateEyedropper() {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]) {
        chrome.runtime.sendMessage({
          type: 'ACTIVATE_EYEDROPPER',
          tabId: tabs[0].id
        });
        window.close();
      }
    });
  }

  function renderHistory() {
    const grid = $('historyGrid');
    grid.innerHTML = history.map(hex =>
      `<div class="history-swatch" style="background:${hex}" data-color="${hex}" title="${hex}"></div>`
    ).join('');
    grid.querySelectorAll('.history-swatch').forEach(sw => {
      sw.addEventListener('click', () => updateAll(sw.dataset.color));
    });
  }

  function renderFavorites() {
    const grid = $('favoritesGrid');
    grid.innerHTML = favorites.map(hex =>
      `<div class="favorite-swatch" style="background:${hex}" data-color="${hex}" title="${hex}"></div>`
    ).join('');
    grid.querySelectorAll('.favorite-swatch').forEach(sw => {
      sw.addEventListener('click', () => updateAll(sw.dataset.color));
    });
  }

  // Palettes
  function setupPalettes() {
    $('btnNewPalette').addEventListener('click', () => {
      $('modalNewPalette').classList.add('show');
      $('newPaletteName').value = '';
      $('newPaletteName').focus();
    });

    $('btnCancelPalette').addEventListener('click', () => {
      $('modalNewPalette').classList.remove('show');
    });

    $('btnConfirmPalette').addEventListener('click', () => {
      const name = $('newPaletteName').value.trim();
      if (name) {
        const p = PaletteManager.createPalette(name, [currentColor]);
        palettes.push(p);
        saveData();
        renderPalettes();
        $('modalNewPalette').classList.remove('show');
        showToast('Palette created');
      }
    });

    $('btnSavePalette').addEventListener('click', () => {
      if (palettes.length === 0) {
        const p = PaletteManager.createPalette('My Palette', [currentColor]);
        palettes.push(p);
      } else {
        palettes[0].colors.push(currentColor);
        if (palettes[0].colors.length > 20) palettes[0].colors = palettes[0].colors.slice(-20);
      }
      saveData();
      renderPalettes();
      showToast('Color saved to palette');
    });

    $('btnExportPalette').addEventListener('click', () => {
      if (palettes.length === 0) {
        showToast('No palettes to export');
        return;
      }
      $('modalExport').classList.add('show');
    });

    $('btnCloseExport').addEventListener('click', () => {
      $('modalExport').classList.remove('show');
    });

    $$('.export-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        exportPalette(btn.dataset.format);
        $('modalExport').classList.remove('show');
      });
    });

    $('paletteSource').addEventListener('change', renderPalettes);
    $('paletteSort').addEventListener('change', renderPalettes);
  }

  function renderPalettes() {
    const source = $('paletteSource').value;
    const sort = $('paletteSort').value;
    let list = [];

    if (source === 'custom') {
      list = palettes;
    } else if (source === 'beautiful') {
      list = PaletteManager.getBeautifulPalettes();
    } else if (source === 'material') {
      list = PaletteManager.getMaterialPalette();
    } else if (source === 'tailwind') {
      list = PaletteManager.getTailwindPalette();
    }

    $('paletteCount').textContent = `${list.length} palettes`;

    const container = $('paletteList');
    container.innerHTML = list.map((p, i) => {
      let colors = p.colors;
      if (sort !== 'default') colors = PaletteManager.sortColors(colors, sort);
      const swatches = colors.map(c =>
        `<span style="background:${c}" data-color="${c}"></span>`
      ).join('');
      return `
        <div class="color-row palette-card" data-idx="${i}" data-source="${source}">
          <div class="palette-colors" style="display:flex;height:32px;border-radius:6px;overflow:hidden;flex:1">
            ${swatches}
          </div>
          <div style="padding:6px 8px;font-size:11px;min-width:80px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</div>
          ${source === 'custom' ? `<button class="btn btn-sm btn-icon btn-secondary" data-del="${i}" title="Delete">✕</button>` : ''}
        </div>`;
    }).join('');

    container.querySelectorAll('.palette-card').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.dataset.del !== undefined) {
          palettes.splice(parseInt(e.target.dataset.del), 1);
          saveData();
          renderPalettes();
          return;
        }
        const source = card.dataset.source;
        let colors;
        if (source === 'custom') colors = palettes[parseInt(card.dataset.idx)].colors;
        else if (source === 'beautiful') colors = PaletteManager.getBeautifulPalettes()[parseInt(card.dataset.idx)].colors;
        else if (source === 'material') colors = PaletteManager.getMaterialPalette()[parseInt(card.dataset.idx)].colors;
        else if (source === 'tailwind') colors = PaletteManager.getTailwindPalette()[parseInt(card.dataset.idx)].colors;

        if (colors && colors.length > 0) {
          const swatches = card.querySelectorAll('.palette-colors span');
          swatches.forEach(s => {
            s.addEventListener('click', e2 => {
              e2.stopPropagation();
              updateAll(s.dataset.color);
            });
          });
        }
      });

      const swatches = card.querySelectorAll('.palette-colors span');
      swatches.forEach(s => {
        s.addEventListener('click', e2 => {
          e2.stopPropagation();
          updateAll(s.dataset.color);
        });
      });
    });
  }

  function exportPalette(format) {
    const p = palettes[0];
    if (!p) return;
    let content = '';
    let ext = 'txt';
    let mime = 'text/plain';

    switch (format) {
      case 'css':
        ext = 'css'; mime = 'text/css';
        content = `:root {\n${p.colors.map((c, i) => `  --color-${i + 1}: ${c};`).join('\n')}\n}`;
        break;
      case 'tailwind':
        ext = 'js'; mime = 'text/javascript';
        content = `module.exports = {\n  theme: {\n    extend: {\n      colors: {\n${p.colors.map((c, i) => `        '${p.name.toLowerCase().replace(/\s+/g, '-')}-${i + 1}': '${c}',`).join('\n')}\n      }\n    }\n  }\n}`;
        break;
      case 'scss':
        ext = 'scss'; mime = 'text/plain';
        content = p.colors.map((c, i) => `$color-${i + 1}: ${c};`).join('\n');
        break;
      case 'json':
        ext = 'json'; mime = 'application/json';
        content = JSON.stringify({ name: p.name, colors: p.colors }, null, 2);
        break;
      case 'ase':
        const data = new Uint8Array(12 + p.colors.length * 12);
        const view = new DataView(data.buffer);
        data.set([0x41, 0x53, 0x45, 0x46], 0);
        view.setUint32(4, p.colors.length, false);
        let offset = 8;
        p.colors.forEach(c => {
          const rgb = ColorUtils.hexToRgb(c);
          const nameBytes = new TextEncoder().encode(c);
          view.setUint16(offset, nameBytes.length, false);
          offset += 2;
          data.set(nameBytes, offset);
          offset += nameBytes.length;
          data[offset++] = 0;
          data[offset++] = 0x52, 0x47, 0x42, 0x20;
          const fView = new DataView(data.buffer);
          fView.setFloat32(offset, rgb.r / 255, false); offset += 4;
          fView.setFloat32(offset, rgb.g / 255, false); offset += 4;
          fView.setFloat32(offset, rgb.b / 255, false); offset += 4;
        });
        const blob = new Blob([data], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${p.name.replace(/\s+/g, '-')}.ase`; a.click();
        URL.revokeObjectURL(url);
        showToast('Exported ASE file');
        return;
    }

    if (content) {
      navigator.clipboard.writeText(content);
      showToast(`Copied ${format.toUpperCase()} to clipboard`);
    }
  }

  // Contrast
  function setupContrast() {
    const update = () => {
      const fg = $('contrastFg').value;
      const bg = $('contrastBg').value;
      if (!/^#[0-9a-fA-F]{6}$/.test(fg) || !/^#[0-9a-fA-F]{6}$/.test(bg)) return;

      const fgRgb = ColorUtils.hexToRgb(fg);
      const bgRgb = ColorUtils.hexToRgb(bg);
      const ratio = ColorUtils.contrastRatio(fgRgb, bgRgb);
      const wcag = ColorUtils.wcagCompliance(ratio);

      $('contrastPreview').style.background = bg;
      $('contrastPreview').style.color = fg;

      $('contrastResults').innerHTML = `
        <div class="contrast-item">
          <div class="label">Ratio</div>
          <div class="value">${ratio.toFixed(2)}</div>
        </div>
        <div class="contrast-item">
          <div class="label">WCAG AA</div>
          <div class="value">${wcag.AA ? '✓' : '✕'}</div>
          <div class="status ${wcag.AA ? 'pass' : 'fail'}">${wcag.AA ? 'PASS' : 'FAIL'}</div>
        </div>
        <div class="contrast-item">
          <div class="label">WCAG AAA</div>
          <div class="value">${wcag.AAA ? '✓' : '✕'}</div>
          <div class="status ${wcag.AAA ? 'pass' : 'fail'}">${wcag.AAA ? 'PASS' : 'FAIL'}</div>
        </div>
        <div class="contrast-item">
          <div class="label">AA Large</div>
          <div class="value">${wcag.AALarge ? '✓' : '✕'}</div>
          <div class="status ${wcag.AALarge ? 'pass' : 'fail'}">${wcag.AALarge ? 'PASS' : 'FAIL'}</div>
        </div>`;
    };

    $('contrastFg').addEventListener('input', update);
    $('contrastBg').addEventListener('input', update);

    $('btnSwapColors').addEventListener('click', () => {
      const tmp = $('contrastFg').value;
      $('contrastFg').value = $('contrastBg').value;
      $('contrastBg').value = tmp;
      update();
    });

    $('btnUseCurrentFg').addEventListener('click', () => {
      $('contrastFg').value = currentColor;
      update();
    });

    update();
  }

  // Harmony
  function setupHarmony() {
    const update = () => {
      const hex = $('harmonyBase').value;
      if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return;

      const renderHarmony = (id, colors) => {
        $(id).innerHTML = colors.map(c =>
          `<div class="harmony-color" style="background:${c};color:${ColorUtils.isLight(c) ? '#000' : '#fff'}" data-color="${c}">${c}</div>`
        ).join('');
        $(id).querySelectorAll('.harmony-color').forEach(el => {
          el.addEventListener('click', () => updateAll(el.dataset.color));
        });
      };

      renderHarmony('harmonyComplementary', [hex, ColorUtils.getComplementary(hex)]);
      renderHarmony('harmonyAnalogous', ColorUtils.getAnalogous(hex));
      renderHarmony('harmonyTriadic', ColorUtils.getTriadic(hex));
      renderHarmony('harmonySplit', ColorUtils.getSplitComplementary(hex));
      renderHarmony('harmonyTetradic', ColorUtils.getTetradic(hex));
    };

    $('harmonyBase').addEventListener('input', update);
    update();
  }

  // Mixer
  function setupMixer() {
    const update = () => {
      const a = $('mixerA').value;
      const b = $('mixerB').value;
      const ratio = parseInt($('mixRatio').value) / 100;
      $('mixRatioLabel').textContent = `${Math.round(ratio * 100)}%`;

      if (/^#[0-9a-fA-F]{6}$/.test(a) && /^#[0-9a-fA-F]{6}$/.test(b)) {
        const mixed = ColorUtils.mixColors(a, b, ratio);
        $('mixerPreview').style.setProperty('--mixer-from', a);
        $('mixerPreview').style.setProperty('--mixer-to', b);
        $('mixerResult').textContent = mixed.toUpperCase();
        $('mixerResult').style.color = mixed;
      }
    };

    $('mixerA').addEventListener('input', update);
    $('mixerB').addEventListener('input', update);
    $('mixRatio').addEventListener('input', update);

    $('btnMixCopy').addEventListener('click', () => {
      navigator.clipboard.writeText($('mixerResult').textContent);
      showToast('Copied mixed color');
    });

    $('btnMixUseA').addEventListener('click', () => {
      $('mixerA').value = $('mixerResult').textContent;
      update();
    });

    $('btnMixUseB').addEventListener('click', () => {
      $('mixerB').value = $('mixerResult').textContent;
      update();
    });

    update();
  }

  function updateMixerPreview() {
    const a = $('mixerA').value;
    const b = $('mixerB').value;
    const preview = $('mixerPreview');
    if (preview) {
      preview.style.background = `linear-gradient(to right, ${a}, ${b})`;
    }
  }

  // Temperature
  function updateTemperature() {
    const rgb = ColorUtils.hexToRgb(currentColor);
    const temp = ColorUtils.colorTemperature(rgb);
    $('tempValue').textContent = `${temp.label} (~${temp.kelvin}K)`;

    const pct = Math.min(100, Math.max(0, ((temp.kelvin - 1000) / 9000) * 100));
    $('tempMarker').style.left = `${pct}%`;
  }

  // Accessibility
  function setupAccessibility() {
    $('a11yColor').addEventListener('input', updateAccessibility);

    // Add click handler for picker color to sync
    $('colorPreview').addEventListener('click', () => {
      $('a11yColor').value = currentColor;
      $('harmonyBase').value = currentColor;
      updateAccessibility();
    });
  }

  function updateAccessibility() {
    const hex = $('a11yColor').value;
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return;

    const rgb = ColorUtils.hexToRgb(hex);

    const types = ['protanopia', 'deuteranopia', 'tritanopia'];
    $('blindnessSim').innerHTML = types.map(type => {
      const sim = ColorUtils.simulateColorBlindness(rgb, type);
      const simHex = ColorUtils.rgbToHex(sim.r, sim.g, sim.b);
      return `
        <div class="blindness-card">
          <div class="preview" style="background:${simHex}"></div>
          <div class="label">${type}</div>
          <div style="font-size:10px;font-family:monospace;margin-top:2px">${simHex.toUpperCase()}</div>
        </div>`;
    }).join('');

    const whiteRatio = ColorUtils.contrastRatio(rgb, { r: 255, g: 255, b: 255 });
    const blackRatio = ColorUtils.contrastRatio(rgb, { r: 0, g: 0, b: 0 });
    const whiteWcag = ColorUtils.wcagCompliance(whiteRatio);
    const blackWcag = ColorUtils.wcagCompliance(blackRatio);

    $('wcagSummary').innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div>
          <div style="font-size:10px;color:var(--text2);margin-bottom:4px">On White Background</div>
          <div style="font-size:18px;font-weight:700">${whiteRatio.toFixed(2)}</div>
          <div style="display:flex;gap:4px;margin-top:4px">
            <span class="tag ${whiteWcag.AA ? 'pass' : 'fail'}">AA ${whiteWcag.AA ? '✓' : '✕'}</span>
            <span class="tag ${whiteWcag.AAA ? 'pass' : 'fail'}">AAA ${whiteWcag.AAA ? '✓' : '✕'}</span>
          </div>
        </div>
        <div>
          <div style="font-size:10px;color:var(--text2);margin-bottom:4px">On Black Background</div>
          <div style="font-size:18px;font-weight:700">${blackRatio.toFixed(2)}</div>
          <div style="display:flex;gap:4px;margin-top:4px">
            <span class="tag ${blackWcag.AA ? 'pass' : 'fail'}">AA ${blackWcag.AA ? '✓' : '✕'}</span>
            <span class="tag ${blackWcag.AAA ? 'pass' : 'fail'}">AAA ${blackWcag.AAA ? '✓' : '✕'}</span>
          </div>
        </div>
      </div>`;
  }

  // Listen for color from eyedropper
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'COLOR_FROM_EYEDROPPER') {
      updateAll(msg.color);
    }
  });

  // Listen for storage changes to pick up eyedropper color
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.history) {
      history = changes.history.newValue;
      renderHistory();
      if (history.length > 0 && history[0] !== currentColor) {
        updateAll(history[0]);
      }
    }
  });

  init();
})();
