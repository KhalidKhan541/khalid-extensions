(function() {
  'use strict';

  let inspectorActive = false;
  let selectedElement = null;
  let highlightedElement = null;
  let tooltip = null;
  let domNav = null;
  let breakpointIndicator = null;
  let breakpointLabel = null;
  let inspector;
  let boxModel;
  let navTarget = null;

  function init() {
    inspector = new CSSInspector();
    boxModel = new BoxModelVisualizer();
    createTooltip();
    createDOMNav();
    createBreakpointIndicator();
    bindEvents();
    setupMessageListener();
  }

  function createTooltip() {
    tooltip = document.createElement('div');
    tooltip.className = 'css-picker-tooltip';
    tooltip.style.display = 'none';
    document.body.appendChild(tooltip);
  }

  function createDOMNav() {
    domNav = document.createElement('div');
    domNav.className = 'css-picker-dom-nav';
    domNav.innerHTML = `
      <span><kbd>↑</kbd> Parent</span>
      <span><kbd>↓</kbd> Child</span>
      <span><kbd>←</kbd> Prev</span>
      <span><kbd>→</kbd> Next</span>
      <span><kbd>Esc</kbd> Deselect</span>
    `;
    domNav.style.display = 'none';
    document.body.appendChild(domNav);
  }

  function createBreakpointIndicator() {
    breakpointIndicator = document.createElement('div');
    breakpointIndicator.className = 'css-picker-breakpoint-indicator';
    breakpointIndicator.style.display = 'none';
    document.body.appendChild(breakpointIndicator);

    breakpointLabel = document.createElement('div');
    breakpointLabel.className = 'css-picker-breakpoint-label';
    breakpointLabel.style.display = 'none';
    document.body.appendChild(breakpointLabel);
  }

  function bindEvents() {
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mouseout', handleMouseOut, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize, true);
  }

  function setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case 'TOGGLE_INSPECTOR':
          toggleInspector();
          sendResponse({ ok: true });
          break;

        case 'GET_STATE':
          sendResponse({
            active: inspectorActive,
            selectedElement: selectedElement ? getElementData(selectedElement) : null,
            inspectorData: selectedElement ? getFullInspectorData(selectedElement) : null
          });
          break;

        case 'GET_ELEMENT_COUNT':
          sendResponse({ count: document.querySelectorAll('*').length });
          break;

        case 'HIGHLIGHT_SELECTOR':
          highlightSelector(message.selector);
          sendResponse({ ok: true });
          break;

        default:
          sendResponse({ ok: true });
      }
      return true;
    });

    chrome.runtime.sendMessage({
      type: 'INSPECTOR_TOGGLED',
      active: false
    });
  }

  function toggleInspector() {
    inspectorActive = !inspectorActive;

    if (inspectorActive) {
      document.body.style.cursor = 'crosshair';
      domNav.style.display = 'flex';
      breakpointIndicator.style.display = 'block';
      breakpointLabel.style.display = 'block';
      updateBreakpointLabel();
      showStatus('Inspector active');
    } else {
      document.body.style.cursor = '';
      deselectElement();
      domNav.style.display = 'none';
      breakpointIndicator.style.display = 'none';
      breakpointLabel.style.display = 'none';
      clearSelectorHighlight();
      showStatus('Inspector stopped');
    }

    chrome.runtime.sendMessage({
      type: 'INSPECTOR_TOGGLED',
      active: inspectorActive
    });
  }

  function handleMouseOver(e) {
    if (!inspectorActive) return;

    const element = e.target;
    if (element === highlightedElement) return;
    if (element.closest('.css-picker-tooltip') || element.closest('.css-picker-dom-nav')) return;

    unhighlightElement();
    highlightedElement = element;
    highlightElement(element);
    showTooltip(element, e);
  }

  function handleMouseOut(e) {
    if (!inspectorActive) return;

    const element = e.target;
    if (element === highlightedElement) {
      unhighlightElement();
      highlightedElement = null;
      hideTooltip();
    }
  }

  function handleClick(e) {
    if (!inspectorActive) return;

    const element = e.target;
    if (element.closest('.css-picker-tooltip') || element.closest('.css-picker-dom-nav')) return;

    e.preventDefault();
    e.stopPropagation();

    selectElement(element);
  }

  function handleKeyDown(e) {
    if (!inspectorActive && !selectedElement) return;

    if (e.key === 'Escape') {
      if (selectedElement) {
        deselectElement();
      } else if (inspectorActive) {
        toggleInspector();
      }
      return;
    }

    if (!selectedElement) return;

    let target = null;

    switch (e.key) {
      case 'ArrowUp':
        target = selectedElement.parentElement;
        break;

      case 'ArrowDown':
        target = selectedElement.firstElementChild;
        break;

      case 'ArrowLeft':
        target = selectedElement.previousElementSibling;
        break;

      case 'ArrowRight':
        target = selectedElement.nextElementSibling;
        break;
    }

    if (target) {
      e.preventDefault();
      selectElement(target);
    }
  }

  function handleScroll() {
    if (selectedElement) {
      boxModel.showBoxModel(selectedElement, false);
    }
  }

  function handleResize() {
    boxModel.resizeCanvas();
    if (selectedElement) {
      boxModel.showBoxModel(selectedElement, false);
    }
    updateBreakpointLabel();
  }

  function highlightElement(element) {
    element.classList.add('css-picker-highlight');
  }

  function unhighlightElement() {
    if (highlightedElement) {
      highlightedElement.classList.remove('css-picker-highlight');
    }
  }

  function selectElement(element) {
    if (selectedElement) {
      selectedElement.classList.remove('css-picker-selected');
    }

    unhighlightElement();
    selectedElement = element;
    element.classList.add('css-picker-selected');

    boxModel.showBoxModel(element);

    const data = getFullInspectorData(element);
    chrome.runtime.sendMessage({
      type: 'ELEMENT_SELECTED',
      data: data
    });

    showStatus(`Selected: ${element.tagName.toLowerCase()}`);
  }

  function deselectElement() {
    if (selectedElement) {
      selectedElement.classList.remove('css-picker-selected');
      selectedElement = null;
    }

    boxModel.clear();
    hideTooltip();

    chrome.runtime.sendMessage({
      type: 'ELEMENT_DESELECTED'
    });
  }

  function showTooltip(element, event) {
    const tag = element.tagName.toLowerCase();
    const id = element.id ? `#${element.id}` : '';
    const classes = element.className && typeof element.className === 'string'
      ? element.className.trim().split(/\s+/)
          .filter(c => c && !c.startsWith('css-picker-'))
          .map(c => `.${c}`)
          .join('')
      : '';
    const rect = element.getBoundingClientRect();
    const dimensions = `${Math.round(rect.width)} × ${Math.round(rect.height)}`;

    tooltip.innerHTML = `
      <span class="tooltip-tag">${tag}</span>
      <span class="tooltip-id">${id}</span>
      <span class="tooltip-class">${classes}</span>
      <div class="tooltip-dimensions">${dimensions} px</div>
    `;

    const tooltipRect = tooltip.getBoundingClientRect();
    let x = event.clientX + 15;
    let y = event.clientY + 15;

    if (x + tooltipRect.width > window.innerWidth) {
      x = event.clientX - tooltipRect.width - 15;
    }
    if (y + tooltipRect.height > window.innerHeight) {
      y = event.clientY - tooltipRect.height - 15;
    }

    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
    tooltip.style.display = 'block';
  }

  function hideTooltip() {
    tooltip.style.display = 'none';
  }

  function getElementData(element) {
    const rect = element.getBoundingClientRect();
    return {
      tagName: element.tagName,
      id: element.id,
      classes: element.className && typeof element.className === 'string'
        ? element.className.trim().split(/\s+/).filter(c => !c.startsWith('css-picker-'))
        : [],
      selector: inspector.generateSelector(element),
      breadcrumb: inspector.getBreadcrumb(element),
      dimensions: inspector.getElementDimensions(element)
    };
  }

  function getFullInspectorData(element) {
    const basicData = getElementData(element);
    const computed = inspector.getComputedStyles(element);

    return {
      ...basicData,
      computedStyles: computed,
      boxModel: inspector.getBoxModel(element),
      boxSizing: computed.boxSizing,
      cssRules: inspector.getCSSRules(element),
      colors: inspector.getColorPalette(element),
      fonts: inspector.getFontSummary(element),
      variables: inspector.getCSSVariables(element),
      mediaQueries: inspector.getMediaQueries(),
      cascade: inspector.analyzeCascade(element)
    };
  }

  function highlightSelector(selector) {
    clearSelectorHighlight();

    try {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        el.classList.add('css-picker-selector-match');
      });

      setTimeout(() => {
        clearSelectorHighlight();
      }, 3000);
    } catch (e) {
      console.error('Invalid selector:', e);
    }
  }

  function clearSelectorHighlight() {
    document.querySelectorAll('.css-picker-selector-match').forEach(el => {
      el.classList.remove('css-picker-selector-match');
    });
  }

  function updateBreakpointLabel() {
    const width = window.innerWidth;
    let breakpoint = 'xs';

    if (width >= 1280) breakpoint = 'xl';
    else if (width >= 1024) breakpoint = 'lg';
    else if (width >= 768) breakpoint = 'md';
    else if (width >= 576) breakpoint = 'sm';

    breakpointLabel.textContent = `${width}px - ${breakpoint.toUpperCase()}`;
  }

  function showStatus(text) {
    chrome.runtime.sendMessage({
      type: 'STATUS_UPDATE',
      text: text
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
