# PageBrief — AI-Powered Chrome Extension

PageBrief is a Chrome browser extension (Manifest V3) that summarizes any webpage using OpenAI, Anthropic, or Google Gemini APIs. Click the toolbar icon, choose a summary style, and get a concise AI-generated summary in seconds. A built-in history panel lets you revisit and pin recent summaries.

---

Youtube Url: https://youtu.be/lMMnflEO8Jo

## Features

- **One-click summarization** — works on any webpage
- **Three summary styles**
  - Bullet Points — key ideas as a scannable list
  - Brief Overview — 2–4 sentence paragraph
  - Explain Simply — plain-language explanation for any reader
- **Copy to clipboard** — share summaries instantly
- **Copy as Markdown** — export page summaries with source URL and metadata
- **Summary history + pinning** — stores the last 20 summaries locally; pin important entries to keep them prioritized
- **Provider + model settings** — choose provider/model in the Settings view
- **Highlight mode** — highlight likely supporting phrases on the current page
- **Word/character metrics** — see how much content was extracted
- **Dark mode support** — automatic + optional forced dark mode
- **Secure API key storage** — provider keys are kept in `chrome.storage.local` on your device only

---

## Project Structure

```
PageBrief/
├── manifest.json            # Extension config (MV3)
├── generate-icons.js        # Icon generator script (Node.js, one-time use)
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── popup/
│   ├── popup.html           # Extension popup UI
│   ├── popup.css            # Styles
│   └── popup.js             # Popup logic (summarize, history, API calls)
├── content/
│   └── content.js           # Content script — extracts page text
└── background/
    └── background.js        # Service worker — tab checks, install handler
```

---

## Setup & Installation

### Prerequisites
- Google Chrome (or any Chromium browser)
- At least one API key:
  - OpenAI (`sk-...`)
  - Anthropic (`sk-ant-...`)
  - Gemini API key

### Load the extension in Chrome

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `PageBrief/` folder
5. The PageBrief icon will appear in your Chrome toolbar

### Configure your API key

1. Click the PageBrief icon on any webpage
2. Open **Settings** in the popup
3. Choose a provider and model
4. Enter that provider's API key and click **Save**
5. Keys are stored locally and used only for requests to the selected provider

---

## Usage

1. Navigate to any webpage you want to summarize
2. Click the **PageBrief** icon in the toolbar
3. Select a summary style (Bullet Points, Brief Overview, or Explain Simply)
4. Click **Summarize This Page**
5. Read the summary in the popup
6. Optional: click **Re-summarize** to regenerate with a different style/model without re-extracting
7. Optional: click **Highlight Source** to mark likely supporting text on the page
8. Use **Copy** or **Copy as Markdown** to export
9. Click the **clock icon** to view, pin, or reload past summaries

---

## How It Works

| Component | Role |
|---|---|
| `manifest.json` | Declares permissions (`activeTab`, `scripting`, `storage`), registers popup, content script, and service worker |
| `popup.js` | Extracts main content via readability heuristics, routes requests to OpenAI/Anthropic/Gemini, renders summaries, stores settings/history |
| `content.js` | Walks the live DOM to collect visible text, skipping scripts/styles/media |
| `background.js` | Handles install events and checks whether the active tab is a restricted URL |

### API call details

- Default model: `gpt-4o-mini`
- Configurable provider/models in Settings
- Text budget: up to ~22 000 chars of extracted content
- Max response tokens: 500
- Temperature: 0.4

---

## Permissions Explained

| Permission | Why it's needed |
|---|---|
| `activeTab` | Read the URL and title of the current tab |
| `scripting` | Inject the text-extraction function into the page |
| `storage` | Save the API key and summary history locally |
| `host_permissions: <all_urls>` | Allow text extraction on any webpage |

---

## Privacy

- No data is sent to any server except the selected AI provider endpoint
- Your API keys are stored only in your browser's local storage
- No analytics, tracking, or telemetry of any kind

---

## Development Notes

### Regenerating icons

If you want to customize the icons:

```bash
# Install the canvas package (optional, for higher-quality rendering)
npm install canvas
node generate-icons.js
```

The included `generate-icons.js` works without any npm packages using Node's built-in `zlib`.

### Changing the AI model

Edit the `model` field in `popup/popup.js` inside `callOpenAI()`:

```js
model: "gpt-4o-mini",   // change to "gpt-4o" for higher quality
```

---

## License

MIT
