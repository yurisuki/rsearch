// Runs in the isolated world, once per activation. Keep the frame alive so
// switching focus, copying text, and toggling the panel preserve its state.
globalThis.rsearchTogglePanel = () => {
  if (globalThis.rsearchPanel) {
    globalThis.rsearchPanel.toggle();
    return;
  }
  const previousFocus = () => document.activeElement;
  let returnFocus = previousFocus();
  const host = document.createElement('div');
  host.style.cssText = 'all:initial!important;position:fixed!important;top:18vh!important;left:50%!important;transform:translateX(-50%)!important;width:min(1500px, 78vw)!important;max-width:calc(100vw - 24px)!important;height:min(540px, 76dvh)!important;z-index:2147483647!important;display:block!important;';
  const shadow = host.attachShadow({ mode: 'closed' });
  const frame = document.createElement('iframe');
  frame.src = chrome.runtime.getURL('popup.html') + '?embedded=1';
  frame.title = 'rsearch search panel';
  frame.style.cssText = 'width:100%;height:100%;border:1px solid #45475a;border-radius:5px;box-shadow:0 8px 28px #0009;background:#1e1e2e;color-scheme:normal;';
  function focusSearch() {
    frame.contentWindow.focus();
    frame.contentWindow.postMessage({ action: 'rsearch:focusSearch' }, new URL(frame.src).origin);
  }
  frame.addEventListener('load', () => { if (visible) focusSearch(); });
  shadow.append(frame);
  document.documentElement.append(host);
  let visible = true;
  function hide() {
    visible = false;
    host.style.setProperty('display', 'none', 'important');
    window.focus();
    if (returnFocus?.isConnected) {
      const temporaryTabIndex = !returnFocus.hasAttribute('tabindex') && returnFocus.tabIndex < 0;
      if (temporaryTabIndex) returnFocus.setAttribute('tabindex', '-1');
      returnFocus.focus({ preventScroll: true });
      if (temporaryTabIndex) returnFocus.removeAttribute('tabindex');
    }
  }
  function toggle() {
    if (visible) return hide();
    returnFocus = previousFocus();
    visible = true;
    host.style.setProperty('display', 'block', 'important');
    focusSearch();
  }
  document.addEventListener('keydown', event => {
    if (visible && event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      hide();
    }
  }, true);
  chrome.runtime.onMessage.addListener(message => {
    if (message.action === 'hidePanel') hide();
  });
  globalThis.rsearchPanel = { toggle };
};
