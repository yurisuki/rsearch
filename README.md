# rsearch

A Chromium extension for searching your favorite websites together.

## Features

- Search all engines or a checked selection of sites.
- Manage engines in a full-size page with filtering and copyable URLs.
- Drag to reorder engines, or use keyboard-accessible arrow buttons.
- Capture the current website as an engine and review its search URL.
- Import and export your engine library as JSON.
- Open the popup with **Alt+Shift+R**.

## Install

No build step or dependencies are required.

1. Download the repository ZIP and extract it into a permanent folder, or clone this repository.
2. Open `chrome://extensions` (Brave: `brave://extensions`, Edge: `edge://extensions`).
3. Enable **Developer mode**.
4. Choose **Load unpacked** and select the folder containing `manifest.json`.
5. Pin rsearch to your toolbar.

Keep the folder in place while the extension is installed. To update, pull the latest changes (or replace the files), then click **Reload** on the extension card. Export your engines before changing installation location or reinstalling: a different extension identity can have separate storage.

Chrome Web Store publication would provide one-click installation and automatic updates. This repository is currently installed manually.

## Use

Enter a query, check sites, and choose **Search selected**. **Search All Engines** always searches the whole library. Enter searches the checked sites when any are checked, otherwise all engines. Selection lasts while the popup is open. One result opens in the current tab; multiple results open in a new window.

Click the gear to open the engine library. Drag the ⠿ handle above or below another site to reorder; the insertion line previews the new position. Changes save automatically.

To add a website, first run a search on that site, then choose **Add current website** in rsearch. Common search parameters are replaced with `$Q`. Review the draft before saving. For other search URLs, manually replace the search words with `$Q`.

## Engine format

Import a JSON array of objects with `name` and HTTP/HTTPS `url` fields. Each search URL must contain `$Q`. Import replaces the current library; export a backup first.

```json
[
  {
    "name": "Google",
    "url": "https://www.google.com/search?q=$Q"
  }
]
```

Engine settings are saved locally using the browser extension storage API. Search queries are sent to the sites you choose.

## Development

Edit the HTML, CSS, and JavaScript directly, then reload the unpacked extension.

```sh
node --check popup.js
node --check manage.js
node --check background.js
```

Installation reference: https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked
