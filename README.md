# rsearch

A Chromium extension for searching your favorite websites together.

## Features

- Search all engines or a checked selection of sites.
- Manage engines in a full-size page with filtering and copyable URLs.
- Drag to reorder engines, or use keyboard-accessible arrow buttons.
- Capture the current website as an engine and review its search URL.
- Import and export your engine library as JSON.
- Assign a keyboard shortcut to open the popup in your browser’s extension shortcut settings.

## Install

Download a versioned package from [GitHub Releases](https://github.com/yurisuki/rsearch/releases/latest). Each release includes a ZIP, a signed CRX, and SHA-256 checksums. No build step or dependencies are required.

### ZIP installation (Chrome, Brave, and Edge)

1. Download the release ZIP (for example, `rsearch-2.2.0.zip`) and extract it into a permanent folder.
2. Open `chrome://extensions` (Brave: `brave://extensions`, Edge: `edge://extensions`).
3. Enable **Developer mode**.
4. Choose **Load unpacked** and select the folder containing `manifest.json`.
5. Pin rsearch to your toolbar.

Keep the folder in place while the extension is installed. To update, download the latest release ZIP, replace the files in the same folder, then click **Reload** on the extension card. Export your engines before changing installation location or reinstalling: a different extension identity can have separate storage.

### CRX installation (Brave on Linux)

1. Download the release CRX (for example, `rsearch-2.2.0.crx`).
2. Open `brave://extensions` and enable **Developer mode**.
3. Drag the CRX from your file manager onto the extensions page and confirm installation.
4. Pin rsearch to your toolbar.

CRX installation depends on your browser and its policies. If installation is blocked, use the ZIP instructions above. See [Brave's installation guidance](https://support.brave.com/hc/en-us/articles/360017914832-Why-am-I-seeing-the-message-extensions-disabled-by-Brave).

You can also clone this repository or extract its source ZIP and follow the **Load unpacked** steps above. For a cloned installation, update with `git pull`, then click **Reload**.

GitHub release installations are updated manually. Chrome Web Store publication would provide one-click installation and automatic updates.

## Keyboard shortcut

In Brave, open `brave://extensions/shortcuts`, find **rsearch**, and assign a shortcut to **Activate the extension**. If the suggested **Alt+Shift+R** binding does not work, set your preferred shortcut there.

In Chrome or Edge, use `chrome://extensions/shortcuts` or `edge://extensions/shortcuts`.

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
