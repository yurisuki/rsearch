// Chromium Manifest V3 service worker for multi-tab search.

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    await chrome.tabs.update(tab.id, { url });
  } else {
    await chrome.tabs.create({ url });
  }
  return { success: true };
}
