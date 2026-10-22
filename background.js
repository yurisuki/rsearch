// Chromium Manifest V3 service worker for multi-tab search.

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'togglePanelFromShortcut' && sender.tab) {
    chrome.tabs.sendMessage(sender.tab.id, { action: 'togglePanel' }, { frameId: 0 })
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.action === 'closePanel' && sender.tab) {
    chrome.tabs.sendMessage(sender.tab.id, { action: 'hidePanel' }, { frameId: 0 }).catch(() => {});
    sendResponse({ success: true });
    return false;
  }

  if (message.action === 'searchAll') {
    handleSearchAll(message.urls)
      .then(sendResponse)
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.action === 'searchSingle') {
    handleSearchSingle(message.url)
      .then(sendResponse)
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  return false;
});

async function handleSearchAll(urls) {
  if (!Array.isArray(urls) || urls.length === 0) {
    throw new Error('No URLs provided');
  }

  const window = await chrome.windows.create({ url: urls[0] });
  for (const url of urls.slice(1)) {
    await chrome.tabs.create({ windowId: window.id, url, active: false });
  }
  return { success: true, tabsOpened: urls.length };
}

async function handleSearchSingle(url) {
  await chrome.tabs.create({ url });
  return { success: true };
}

chrome.action.onClicked.addListener(async (tab) => {
  try {
    if (!tab.id || !/^https?:/.test(tab.url || '')) throw new Error('Restricted page');
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['panel.js'] });
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => globalThis.rsearchTogglePanel() });
  } catch {
    // Internal browser pages cannot host content scripts. A separate window
    // stays open when focus moves elsewhere, unlike an action popup.
    await chrome.windows.create({
      url: chrome.runtime.getURL('popup.html') + '?sourceTabId=' + (tab.id ?? ''),
      type: 'popup', width: 600, height: 660
    });
  }
});
