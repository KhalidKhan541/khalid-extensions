/**
 * Dark Mode Plus - Content Script
 * Injects and manages dark mode styles on web pages.
 */

(function() {
  'use strict';

  if (window.__DMP_LOADED__) return;
  window.__DMP_LOADED__ = true;

  let isActive = false;
  let styleElement = null;
  let customStyleElement = null;
  let observer = null;
  let currentOptions = {};

  function injectBaseStyles() {
    if (styleElement) return;
    styleElement = document.createElement('style');
    styleElement.id = 'dmp-dark-styles';
    styleElement.setAttribute('data-dmp', 'true');
    (document.head || document.documentElement).appendChild(styleElement);
  }

  function injectCustomStyles(css) {
    if (customStyleElement) customStyleElement.remove();
    if (!css) return;
    customStyleElement = document.createElement('style');
    customStyleElement.id = 'dmp-custom-styles';
    customStyleElement.setAttribute('data-dmp', 'true');
    customStyleElement.textContent = css;
    (document.head || document.documentElement).appendChild(customStyleElement);
  }

  function activate(options = {}) {
    currentOptions = options;
    isActive = true;

    const html = document.documentElement;
    html.classList.add('dmp-active');

    const speed = options.transitionSpeed || '0.3';
    html.classList.remove('dmp-transition-instant', 'dmp-transition-slow');
    if (speed === '0') html.classList.add('dmp-transition-instant');
    else if (speed === '1') html.classList.add('dmp-transition-slow');

    const css = DarkEngine.generateCSS(options);
    injectBaseStyles();
    styleElement.textContent = css;

    if (options.customCSS) {
      injectCustomStyles(options.customCSS);
    } else {
      injectCustomStyles('');
    }

    // Process inline background colors for dynamic elements
    try {
      DarkEngine.processBackgroundColors(document.body);
    } catch (e) {
      // Silently fail for cross-origin or restricted contexts
    }
  }

  function deactivate() {
    isActive = false;
    const html = document.documentElement;
    html.classList.remove('dmp-active', 'dmp-transition-instant', 'dmp-transition-slow');

    if (styleElement) {
      styleElement.textContent = '';
    }
    injectCustomStyles('');
  }

  function updateImageHandling(dimImages) {
    const imgs = document.querySelectorAll('img, video, canvas, svg');
    imgs.forEach(el => {
      if (dimImages) {
        el.style.filter = 'brightness(0.8) contrast(1.05)';
      } else {
        el.style.filter = '';
      }
    });
  }

  function setupObserver() {
    if (observer) return;

    observer = new MutationObserver((mutations) => {
      if (!isActive) return;

      let needsUpdate = false;
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === 1) {
              needsUpdate = true;
              break;
            }
          }
        }
        if (needsUpdate) break;
      }

      if (needsUpdate) {
        // Debounce processing
        clearTimeout(window.__dmpUpdateTimer);
        window.__dmpUpdateTimer = setTimeout(() => {
          try {
            DarkEngine.processBackgroundColors(document.body);
          } catch (e) {}
        }, 100);
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function handleIframes() {
    try {
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach(iframe => {
        try {
          const doc = iframe.contentDocument || iframe.contentWindow.document;
          if (doc && doc.documentElement) {
            if (isActive) {
              doc.documentElement.classList.add('dmp-active');
              const css = DarkEngine.generateCSS(currentOptions);
              let iframeStyle = doc.getElementById('dmp-dark-styles');
              if (!iframeStyle) {
                iframeStyle = doc.createElement('style');
                iframeStyle.id = 'dmp-dark-styles';
                (doc.head || doc.documentElement).appendChild(iframeStyle);
              }
              iframeStyle.textContent = css;
            } else {
              doc.documentElement.classList.remove('dmp-active');
            }
          }
        } catch (e) {
          // Cross-origin iframe, can't access
        }
      });
    } catch (e) {}
  }

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'DMP_ACTIVATE') {
      activate(message.options || {});
      handleIframes();
      setupObserver();
      sendResponse({ success: true });
    } else if (message.type === 'DMP_DEACTIVATE') {
      deactivate();
      handleIframes();
      sendResponse({ success: true });
    } else if (message.type === 'DMP_UPDATE') {
      currentOptions = { ...currentOptions, ...message.options };
      if (isActive) {
        activate(currentOptions);
        handleIframes();
      }
      sendResponse({ success: true });
    } else if (message.type === 'DMP_STATUS') {
      sendResponse({ active: isActive, options: currentOptions });
    }
    return true;
  });

  // Request current state from background
  function requestState() {
    try {
      chrome.runtime.sendMessage({ type: 'DMP_GET_STATE', url: window.location.href }, (response) => {
        if (chrome.runtime.lastError) return;
        if (response && response.shouldActivate) {
          activate(response.options || {});
          setupObserver();
          setTimeout(handleIframes, 500);
        }
      });
    } catch (e) {
      // Extension context invalidated
    }
  }

  // Initialize
  injectBaseStyles();
  requestState();
})();
