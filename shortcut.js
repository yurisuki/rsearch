(() => {
  let shortcut = null;
  chrome.storage.local.get('pageShortcut').then(saved => {
    shortcut = saved.pageShortcut === undefined ? RsearchShortcut.defaultValue : saved.pageShortcut;
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.pageShortcut) {
      shortcut = changes.pageShortcut.newValue === undefined ? RsearchShortcut.defaultValue : changes.pageShortcut.newValue;
    }
  });
  if (window === window.top) {
    chrome.runtime.onMessage.addListener(message => {
      if (message.action === 'togglePanel') globalThis.rsearchTogglePanel();
    });
  }
  document.addEventListener('keydown', event => {
    if (!event.isTrusted || RsearchShortcut.isEditing(event) || !RsearchShortcut.matches(event, shortcut)) return;
    if (!chrome.runtime.id) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (window === window.top) globalThis.rsearchTogglePanel();
    else chrome.runtime.sendMessage({ action: 'togglePanelFromShortcut' }).catch(() => {});
  }, true);
})();
