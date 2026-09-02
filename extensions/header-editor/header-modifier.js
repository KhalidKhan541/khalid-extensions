(function () {
  'use strict';

  const capturedData = {
    requestHeaders: [],
    responseHeaders: [],
    url: window.location.href
  };

  function interceptFetch() {
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      const [resource, config] = args;
      const url = typeof resource === 'string' ? resource : resource.url;

      capturedData.requestHeaders = Object.entries(config?.headers || {}).map(([name, value]) => ({
        name,
        value: String(value)
      }));

      const response = await originalFetch.apply(this, args);
      const clone = response.clone();

      clone.headers.forEach((value, name) => {
        capturedData.responseHeaders.push({ name, value });
      });

      sendCapturedData(url, capturedData.requestHeaders, capturedData.responseHeaders);
      return response;
    };
  }

  function interceptXHR() {
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
    const originalGetAllResponseHeaders = XMLHttpRequest.prototype.getAllResponseHeaders;

    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
      this._headerEditorUrl = url;
      this._headerEditorHeaders = [];
      return originalOpen.apply(this, [method, url, ...rest]);
    };

    XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
      this._headerEditorHeaders.push({ name, value: String(value) });
      return originalSetRequestHeader.apply(this, [name, value]);
    };

    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (...args) {
      this.addEventListener('load', function () {
        const responseHeaders = [];
        const headerString = originalGetAllResponseHeaders.call(this);
        headerString.split('\r\n').forEach((line) => {
          if (line) {
            const [name, ...valueParts] = line.split(':');
            responseHeaders.push({ name: name.trim(), value: valueParts.join(':').trim() });
          }
        });

        sendCapturedData(this._headerEditorUrl, this._headerEditorHeaders, responseHeaders);
      });
      return originalSend.apply(this, args);
    };
  }

  function sendCapturedData(url, requestHeaders, responseHeaders) {
    chrome.runtime.sendMessage({
      action: 'captureHeaders',
      url: url || window.location.href,
      requestHeaders,
      responseHeaders
    });
  }

  function init() {
    interceptFetch();
    interceptXHR();
    sendCapturedData(window.location.href, [], []);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
