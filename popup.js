const DEFAULT_ENGINES = [
  { name: '🔍 GOOGLE', url: 'https://www.google.com/search?q=$Q' },
  { name: '🦆 DuckDuckGo', url: 'https://duckduckgo.com/?q=$Q' }
];
let engines = [];
let rememberQuery = true;
let searching = false;
let selected = new Set();
const engineKey = engine => JSON.stringify([engine.name, engine.url]);
const $ = id => document.getElementById(id);
function focusSearch() {
  const input = $('searchInput');
  if (!input || input.classList.contains('hidden')) return;
  input.focus({ preventScroll: true });
  input.select();
}
window.addEventListener('message', event => {
  if (window.parent === window || event.source !== window.parent) return;
  if (event.data?.action === 'rsearch:focusSearch') focusSearch();
  if (event.data?.action === 'rsearch:resetSelection') resetSelection();
});
function resetSelection() {
  selected.clear();
  document.querySelectorAll('.engine-item input').forEach(check => {
    check.checked = false;
    check.closest('.engine-item').classList.remove('selected');
  });
  updateSelectionButton();
}
function closePanel() {
  resetSelection();
  if (window.parent !== window) chrome.runtime.sendMessage({ action: 'closePanel' });
  else window.close();
}
async function openManager() {
  await chrome.tabs.create({ url: chrome.runtime.getURL('manage.html') });
}
async function addCurrentWebsite() {
  const sourceTabId = new URLSearchParams(location.search).get('sourceTabId');
  const tab = sourceTabId ? await chrome.tabs.get(Number(sourceTabId))
    : (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
  if (!tab?.url || !/^https?:/.test(tab.url)) return showNotification('Open a website first');
  const params = new URLSearchParams({ url: tab.url, title: tab.title || '' });
  await chrome.tabs.create({ url: chrome.runtime.getURL('manage.html') + '?' + params + '#add' });
}
function renderEngines() {
  const empty = engines.length === 0;
  for (const id of ['searchInput', 'searchAllBtn', 'searchSelectedBtn', 'engineList']) $(id).classList.toggle('hidden', empty);
  $('emptyEngines').classList.toggle('hidden', !empty);
  $('engineList').replaceChildren();
  engines.forEach(engine => {
    const label = document.createElement('label'); label.className = 'engine-item';
    label.title = 'Double-click to search only this site';
    label.addEventListener('dblclick', event => { event.preventDefault(); searchEngines(false, engine); });
    const check = document.createElement('input'); check.type = 'checkbox'; check.checked = selected.has(engineKey(engine));
    check.addEventListener('change', () => {
      if (check.checked) selected.add(engineKey(engine)); else selected.delete(engineKey(engine));
      label.classList.toggle('selected', check.checked); updateSelectionButton();
    });
    label.classList.toggle('selected', check.checked);
    const details = document.createElement('span'); details.className = 'engine-details';
    const name = document.createElement('span'); name.className = 'engine-name'; name.textContent = engine.name;
    const url = document.createElement('span'); url.className = 'engine-url'; url.textContent = engine.url.replace(/^https?:\/\//, '');
    details.append(name, url);
    label.append(check, details); $('engineList').append(label);
  });
  updateSelectionButton();
}
function updateSelectionButton() {
  const count = engines.filter(engine => selected.has(engineKey(engine))).length;
  $('searchSelectedBtn').disabled = count === 0;
  $('searchSelectedBtn').textContent = count ? `Search selected (${count})` : 'Search selected';
}
function buildSearchUrl(template, query) {
  const url = new URL(template);
  // Geo-Ship embeds the query inside a JSON string in its hash route.
  const jsonQuery = /(^|\.)geo-ship\.com$/.test(url.hostname) && url.hash.includes('searchParams=');
  const value = jsonQuery ? JSON.stringify(query).slice(1, -1) : query;
  return template.replaceAll('$Q', encodeURIComponent(value));
}
async function searchEngines(onlySelected, singleEngine = null) {
  if (searching) return;
  const query = $('searchInput').value.trim();
  if (!query) return showNotification('Please enter a search query');
  const targets = singleEngine ? [singleEngine] : onlySelected ? engines.filter(engine => selected.has(engineKey(engine))) : engines;
  if (!targets.length) return showNotification('Select at least one site');
  const urls = targets.map(engine => buildSearchUrl(engine.url, query));
  searching = true;
  try {
    const result = await chrome.runtime.sendMessage(urls.length === 1 ? { action: 'searchSingle', url: urls[0] } : { action: 'searchAll', urls });
    if (!result?.success) throw Error(result?.error || 'No response from the extension');
    if (!rememberQuery) $('searchInput').value = '';
    closePanel();
  } catch (error) { showNotification(`Search failed: ${error.message}`); }
  finally { searching = false; }
}
let notificationTimer;
function showNotification(message) {
  clearTimeout(notificationTimer); document.querySelector('.notification')?.remove();
  const note = document.createElement('div'); note.className = 'notification'; note.setAttribute('role', 'status'); note.textContent = message;
  document.querySelector('.container').append(note); notificationTimer = setTimeout(() => note.remove(), 4000);
}
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const saved = await chrome.storage.local.get(['engines', 'rememberQuery']); rememberQuery = saved.rememberQuery !== false; engines = saved.engines || DEFAULT_ENGINES;
    if (!saved.engines) await chrome.storage.local.set({ engines });
    $('closePanelBtn').addEventListener('click', closePanel);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); closePanel(); }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const checks = [...document.querySelectorAll('.engine-item input')];
        if (!checks.length) return;
        event.preventDefault();
        const stops = [$('searchInput'), ...checks];
        const index = stops.indexOf(document.activeElement);
        const next = index < 0 ? 0
          : (index + (event.key === 'ArrowDown' ? 1 : -1) + stops.length) % stops.length;
        stops[next].focus();
      }
      if (event.key === 'Enter' && document.activeElement?.matches('.engine-item input')) {
        event.preventDefault(); searchEngines(selected.size > 0);
      }
    });
    $('settingsBtnHeader').addEventListener('click', openManager);
    $('getStartedBtn').addEventListener('click', openManager);
    $('addCurrentWebsiteBtn').addEventListener('click', addCurrentWebsite);
    $('searchAllBtn').addEventListener('click', () => searchEngines(false));
    $('searchSelectedBtn').addEventListener('click', () => searchEngines(true));
    $('searchInput').addEventListener('keydown', event => {
      if (event.key === 'Enter') searchEngines(selected.size > 0);
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      if (changes.rememberQuery) rememberQuery = changes.rememberQuery.newValue !== false;
      if (!changes.engines) return;
      engines = changes.engines.newValue || [];
      selected = new Set([...selected].filter(key => engines.some(engine => engineKey(engine) === key)));
      renderEngines();
    });
    renderEngines(); if (engines.length) focusSearch();
  } catch (error) { showNotification(`Could not load engines: ${error.message}`); }
});
