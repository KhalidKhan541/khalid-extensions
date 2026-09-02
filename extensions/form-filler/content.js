(() => {
  'use strict';

  let settings = {
    skipEmptyFields: true,
    highlightFields: true,
    showFloatingButton: true,
    simulateTyping: true,
    typingSpeed: 30,
    highlightColor: '#4285f4'
  };

  let floatingButton = null;
  let highlightOverlay = null;
  let detectedForms = [];
  let isHighlighted = false;

  // Settings listener
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.settings) {
      settings = { ...settings, ...changes.settings.newValue };
      updateFloatingButton();
      if (isHighlighted) highlightFillableFields();
    }
  });

  // Load initial settings
  chrome.storage.local.get('settings', (data) => {
    if (data.settings) {
      settings = { ...settings, ...data.settings };
    }
    init();
  });

  function init() {
    detectAndNotify();
    createFloatingButton();

    const observer = new MutationObserver(() => {
      detectAndNotify();
      updateFloatingButton();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });
  }

  function detectAndNotify() {
    detectedForms = fieldDetector.findForms();
    const count = detectedForms.reduce((sum, f) => sum + f.fields.length, 0);

    chrome.runtime.sendMessage({
      action: 'updateBadge',
      count: count
    });
  }

  function createFloatingButton() {
    if (floatingButton) {
      floatingButton.remove();
    }

    floatingButton = document.createElement('div');
    floatingButton.id = 'form-filler-floating';
    floatingButton.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      <span>Fill Form</span>
    `;
    floatingButton.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #4285f4;
      color: white;
      padding: 10px 16px;
      border-radius: 24px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(66, 133, 244, 0.4);
      z-index: 2147483647;
      transition: all 0.2s ease;
      user-select: none;
    `;

    floatingButton.addEventListener('mouseenter', () => {
      floatingButton.style.transform = 'scale(1.05)';
      floatingButton.style.boxShadow = '0 6px 16px rgba(66, 133, 244, 0.5)';
    });

    floatingButton.addEventListener('mouseleave', () => {
      floatingButton.style.transform = 'scale(1)';
      floatingButton.style.boxShadow = '0 4px 12px rgba(66, 133, 244, 0.4)';
    });

    floatingButton.addEventListener('click', handleFloatingButtonClick);

    document.body.appendChild(floatingButton);
    updateFloatingButton();
  }

  function updateFloatingButton() {
    if (!floatingButton) return;
    floatingButton.style.display = settings.showFloatingButton && detectedForms.length > 0 ? 'flex' : 'none';
  }

  async function handleFloatingButtonClick() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getDefaultProfile' });
      if (response && response.profile) {
        fillAllForms(response.profile, settings);
      } else {
        showNotification('No default profile set. Open the extension to set one.', 'warning');
      }
    } catch (e) {
      showNotification('Could not access profile data.', 'error');
    }
  }

  // Message listener
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'fillForm') {
      fillAllForms(message.profile, message.settings || settings);
      sendResponse({ success: true });
    } else if (message.action === 'highlightFields') {
      toggleHighlight();
      sendResponse({ success: true });
    } else if (message.action === 'getFormsInfo') {
      sendResponse({
        forms: detectedForms.map(f => ({
          fieldCount: f.fields.length,
          fields: fieldDetector.getFormFieldsInfo(f.element)
        }))
      });
    }
    return true;
  });

  function toggleHighlight() {
    if (isHighlighted) {
      removeHighlights();
    } else {
      highlightFillableFields();
    }
    isHighlighted = !isHighlighted;
  }

  function highlightFillableFields() {
    removeHighlights();

    detectedForms.forEach(form => {
      form.fields.forEach(field => {
        const el = field.element;
        const rect = el.getBoundingClientRect();

        const highlight = document.createElement('div');
        highlight.className = 'form-filler-highlight';
        highlight.style.cssText = `
          position: fixed;
          left: ${rect.left - 2}px;
          top: ${rect.top - 2}px;
          width: ${rect.width + 4}px;
          height: ${rect.height + 4}px;
          border: 2px solid ${settings.highlightColor};
          border-radius: 4px;
          pointer-events: none;
          z-index: 2147483646;
          opacity: 0;
          transition: opacity 0.2s ease;
        `;

        document.body.appendChild(highlight);
        requestAnimationFrame(() => {
          highlight.style.opacity = '1';
        });

        const label = document.createElement('div');
        label.className = 'form-filler-label';
        label.textContent = field.fieldType;
        label.style.cssText = `
          position: fixed;
          left: ${rect.left - 2}px;
          top: ${rect.top - 20}px;
          background: ${settings.highlightColor};
          color: white;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 10px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          pointer-events: none;
          z-index: 2147483646;
          opacity: 0;
          transition: opacity 0.2s ease;
          white-space: nowrap;
        `;

        document.body.appendChild(label);
        requestAnimationFrame(() => {
          label.style.opacity = '1';
        });
      });
    });
  }

  function removeHighlights() {
    document.querySelectorAll('.form-filler-highlight, .form-filler-label').forEach(el => el.remove());
  }

  async function fillAllForms(profileData, fillSettings) {
    const skipEmpty = fillSettings.skipEmptyFields !== false;
    const simulate = fillSettings.simulateTyping !== false;
    const delay = fillSettings.typingSpeed || 30;

    for (const form of detectedForms) {
      for (const field of form.fields) {
        const value = profileData[field.fieldType];
        if (!value) continue;

        const el = field.element;

        if (skipEmpty && el.value && el.value.trim() !== '') {
          continue;
        }

        if (simulate) {
          await simulateTyping(el, value, delay);
        } else {
          setNativeValue(el, value);
        }
      }
    }
  }

  function setNativeValue(element, value) {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    )?.set;

    const nativeTextareaValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    )?.set;

    const setter = element.tagName === 'TEXTAREA'
      ? nativeTextareaValueSetter
      : nativeInputValueSetter;

    if (setter) {
      setter.call(element, value);
    } else {
      element.value = value;
    }

    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  function simulateTyping(element, value, delay) {
    return new Promise((resolve) => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value'
      )?.set;

      const nativeTextareaValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype, 'value'
      )?.set;

      const setter = element.tagName === 'TEXTAREA'
        ? nativeTextareaValueSetter
        : nativeInputValueSetter;

      element.focus();
      element.dispatchEvent(new Event('focus', { bubbles: true }));

      if (setter) {
        setter.call(element, '');
      } else {
        element.value = '';
      }

      let i = 0;
      const chars = value.split('');

      function typeNext() {
        if (i < chars.length) {
          const currentValue = value.substring(0, i + 1);

          if (setter) {
            setter.call(element, currentValue);
          } else {
            element.value = currentValue;
          }

          element.dispatchEvent(new KeyboardEvent('keydown', { key: chars[i], bubbles: true }));
          element.dispatchEvent(new KeyboardEvent('keypress', { key: chars[i], bubbles: true }));
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new KeyboardEvent('keyup', { key: chars[i], bubbles: true }));

          i++;
          setTimeout(typeNext, delay + Math.random() * delay * 0.5);
        } else {
          element.dispatchEvent(new Event('change', { bubbles: true }));
          element.dispatchEvent(new Event('blur', { bubbles: true }));
          resolve();
        }
      }

      typeNext();
    });
  }

  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'error' ? '#ea4335' : type === 'warning' ? '#fbbc04' : '#34a853'};
      color: ${type === 'warning' ? '#333' : 'white'};
      padding: 12px 20px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      z-index: 2147483647;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: ffSlideIn 0.3s ease;
    `;
    notification.textContent = message;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes ffSlideIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateY(-10px)';
      notification.style.transition = 'all 0.3s ease';
      setTimeout(() => {
        notification.remove();
        style.remove();
      }, 300);
    }, 3000);
  }
})();
