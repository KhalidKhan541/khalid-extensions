# khalid-extensions

> A comprehensive collection of 150 Chrome extensions by **KhalidKhan541**

## Overview

This repository contains all my Chrome extensions in one place. Each extension is a standalone Manifest V3 Chrome extension with full test coverage, CI/CD, and documentation.

## Extensions Included

### Productivity (30)
| Extension | Description |
|-----------|-------------|
| `tab-master-pro` | Advanced tab management |
| `quick-notes` | Quick note-taking |
| `json-lens` | JSON viewer/editor |
| `focus-zone` | Focus/distraction blocker |
| `color-craft` | Color palette tool |
| `clip-vault` | Clipboard manager |
| `snapshot-pro` | Screenshot tool |
| `feed-pulse` | RSS feed reader |
| `pass-forge` | Password generator |
| `tab-snooze` | Tab hibernation |

### Navigation (30)
| Extension | Description |
|-----------|-------------|
| `link-sentinel` | Link checker |
| `page-archiver` | Page saver |
| `form-filler` | Auto-form filler |
| `screen-ruler` | Screen measurement |
| `dark-mode-plus` | Dark mode enforcer |
| `translate-now` | Quick translation |
| `bookmark-dedup` | Bookmark cleaner |
| `tab-counter` | Tab counter |
| `css-picker` | CSS inspector |
| `web-clipper` | Web clipper |

### Developer Tools (30)
| Extension | Description |
|-----------|-------------|
| `tab-group-organizer` | Tab group manager |
| `session-saver` | Session manager |
| `quick-launcher` | Quick launcher |
| `blockade` | Content blocker |
| `leak-guard` | Privacy guard |
| `page-annotator` | Page annotations |
| `markdown-viewer` | Markdown renderer |
| `qr-forge` | QR code generator |
| `perf-profiler` | Performance profiler |
| `tab-reminder` | Tab reminder |

### Tab Management (60)
| Extension | Description |
|-----------|-------------|
| `history-nav` | History navigator |
| `download-manager` | Download manager |
| `cookie-manager` | Cookie manager |
| `header-editor` | HTTP header editor |
| `user-agent-switcher` | UA switcher |
| `viewport-resizer` | Viewport resizer |
| `element-screenshot` | Element capture |
| `text-analyzer` | Text analysis |
| `link-graph` | Link visualization |
| `accessibility-auditor` | A11y checker |
| `reading-mode` | Reader mode |
| `tab-snapshot` | Tab snapshot |
| `css-darkroom` | CSS sandbox |
| `link-highlights` | Link highlighter |
| `page-timer` | Time tracker |
| `smart-search` | Smart search |
| `tab-bookmarks` | Tab bookmarks |
| `color-scheme` | Color scheme |
| `resize-window` | Window resizer |
| `note-capture` | Note capture |
| `scroll-anchor` | Scroll position |
| `tab-lock` | Tab locker |
| `focus-clock` | Focus timer |
| `link-checker` | Link validator |
| `zoom-manager` | Zoom control |
| `tab-saver` | Tab saver |
| `color-picker` | Color picker |
| `page-search` | Page search |
| `tab-hibernate` | Tab hibernation |
| `link-preview` | Link preview |
| `auto-scroll` | Auto scroll |
| `tab-clipboard` | Tab clipboard |
| `page-diff` | Page diff |
| `font-changer` | Font changer |
| `link-opener` | Link opener |
| `tab-count` | Tab counter |
| `highlighter` | Text highlighter |
| `form-saver` | Form saver |
| `page-monitor` | Page monitor |
| `scroll-saver` | Scroll saver |
| `tab-group` | Tab grouping |
| `quick-dial` | Quick dial |
| `page-export` | Page export |
| `dom-inspector` | DOM inspector |
| `link-cleaner` | Link cleaner |
| `tab-focus` | Tab focus |
| `page-screenshot` | Page capture |
| `text-to-speech` | TTS reader |
| `tab-sorter` | Tab sorter |
| `note-pad` | Notepad |
| `tab-archive` | Tab archive |
| `quick-copy` | Quick copy |
| `page-ruler` | Page ruler |
| `link-finder` | Link finder |
| `tab-mirror` | Tab mirror |
| `focus-mode` | Focus mode |
| `page-notes` | Page notes |
| `tab-keeper` | Tab keeper |
| `link-saver` | Link saver |
| `scroll-master` | Scroll master |

### Ultimate/Pro/Elite (30)
| Extension | Description |
|-----------|-------------|
| `tab-split` | Split tabs |
| `quick-search` | Quick search |
| `page-print` | Page printer |
| `link-copy` | Link copier |
| `tab-move` | Tab mover |
| `focus-timer` | Focus timer |
| `page-info` | Page info |
| `tab-shuffle` | Tab shuffler |
| `link-stats` | Link statistics |
| `scroll-lock` | Scroll lock |
| `tab-layout` | Tab layout |
| `quick-form` | Quick form |
| `page-color` | Page color |
| `link-organizer` | Link organizer |
| `tab-history` | Tab history |
| `focus-blocker` | Focus blocker |
| `page-layout` | Page layout |
| `tab-resize` | Tab resizer |
| `link-manager` | Link manager |
| `scroll-pro` | Scroll pro |
| `tab-focus-plus` | Tab focus plus |
| `quick-note` | Quick note |
| `page-zoom` | Page zoom |
| `link-favorites` | Link favorites |
| `tab-groups-plus` | Tab groups plus |
| `focus-pomodoro` | Pomodoro timer |
| `page-tools` | Page tools |
| `tab-manager-pro` | Tab manager pro |
| `link-checker-plus` | Link checker plus |
| `scroll-tools` | Scroll tools |

## Project Structure

```
extensions/
├── tab-master-pro/
│   ├── manifest.json
│   ├── background.js
│   ├── content.js
│   ├── popup.html
│   ├── popup.css
│   ├── popup.js
│   ├── icons/
│   ├── tests/
│   │   ├── setup.js
│   │   └── tab-master-pro.test.js
│   ├── .github/
│   │   └── workflows/
│   │       └── ci.yml
│   ├── package.json
│   ├── jest.config.js
│   ├── .eslintrc.js
│   ├── .prettierrc
│   ├── README.md
│   ├── LICENSE
│   ├── CONTRIBUTING.md
│   ├── SECURITY.md
│   └── CHANGELOG.md
└── ... (150 extensions total)
```

## Features

- **Manifest V3** - Latest Chrome extension standard
- **ES Modules** - Modern JavaScript
- **Tested** - Jest with chrome API mocks
- **CI/CD** - GitHub Actions workflow
- **Linted** - ESLint + Prettier
- **Documented** - Full README, LICENSE, CHANGELOG

## Installation

### From Source
1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select any extension directory

### Individual Extensions
Each extension can also be found in its own repository:
```
https://github.com/KhalidKhan541/[extension-name]
```

## Development

```bash
# Clone the repo
git clone https://github.com/KhalidKhan541/khalid-extensions.git
cd khalid-extensions

# Navigate to an extension
cd extensions/tab-master-pro

# Install dependencies
npm install

# Run tests
npm test

# Run lint
npm run lint

# Build
npm run build
```

## Extension API Usage

Most extensions use Chrome APIs:

```javascript
// Background script
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

// Content script
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_DATA') {
    sendResponse({ data: 'some data' });
  }
});

// Popup
document.getElementById('btn').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { type: 'ACTION' });
  });
});
```

## Chrome Storage

Extensions use chrome.storage for persistence:

```javascript
// Save data
chrome.storage.local.set({ key: value });

// Get data
chrome.storage.local.get('key', (result) => {
  console.log(result.key);
});

// Remove data
chrome.storage.local.remove('key');
```

## CI/CD

Each extension includes a GitHub Actions workflow that:
- Validates manifest.json
- Runs ESLint
- Runs Jest tests
- Checks for security vulnerabilities

## License

MIT License - see individual extensions for details

## Author

**KhalidKhan541**
- GitHub: [@KhalidKhan541](https://github.com/KhalidKhan541)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run `npm test` and `npm run lint`
6. Submit a pull request

## Support

For issues or questions:
- Open an issue on GitHub
- Contact: khalidkhan46572@gmail.com
