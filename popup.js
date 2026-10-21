const DEFAULT_ENGINES = [
  { name: '🔍 GOOGLE', url: 'https://www.google.com/search?q=$Q' },
  { name: '🦆 DuckDuckGo', url: 'https://duckduckgo.com/?q=$Q' }
];
let engines = [];
let selected = new Set();
const engineKey = engine => JSON.stringify([engine.name, engine.url]);
const $ = id => document.getElementById(id);
async function openManager() {
  await chrome.tabs.create({ url: chrome.runtime.getURL('manage.html') });
}
async function addCurrentWebsite() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
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
    const check = document.createElement('input'); check.type = 'checkbox'; check.checked = selected.has(engineKey(engine));
    check.addEventListener('change', () => {
      if (check.checked) selected.add(engineKey(engine)); else selected.delete(engineKey(engine));
      label.classList.toggle('selected', check.checked); updateSelectionButton();
    });
    label.classList.toggle('selected', check.checked);
    const name = document.createElement('span'); name.textContent = engine.name;
    label.append(check, name); $('engineList').append(label);
  });
  updateSelectionButton();
}
function updateSelectionButton() {
  const count = engines.filter(engine => selected.has(engineKey(engine))).length;
  $('searchSelectedBtn').disabled = count === 0;
  $('searchSelectedBtn').textContent = count ? `Search selected (${count})` : 'Select sites to search';
}
async function searchEngines(onlySelected) {
  const query = $('searchInput').value.trim();
  if (!query) return showNotification('Please enter a search query');
  const targets = onlySelected ? engines.filter(engine => selected.has(engineKey(engine))) : engines;
  if (!targets.length) return showNotification('Select at least one site');
  const urls = targets.map(engine => engine.url.replaceAll('$Q', encodeURIComponent(query)));
  try {
    const result = await chrome.runtime.sendMessage(urls.length === 1 ? { action: 'searchSingle', url: urls[0] } : { action: 'searchAll', urls });
    if (result?.success === false) throw Error(result.error);
    window.close();
  } catch (error) { showNotification(`Search failed: ${error.message}`); }
}
let notificationTimer;
function showNotification(message) {
  clearTimeout(notificationTimer); document.querySelector('.notification')?.remove();
  const note = document.createElement('div'); note.className = 'notification'; note.setAttribute('role', 'status'); note.textContent = message;
  document.querySelector('.container').append(note); notificationTimer = setTimeout(() => note.remove(), 4000);
}
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const saved = await chrome.storage.local.get('engines'); engines = saved.engines || DEFAULT_ENGINES;
    if (!saved.engines) await chrome.storage.local.set({ engines });
    $('settingsBtnHeader').addEventListener('click', openManager);
    $('getStartedBtn').addEventListener('click', openManager);
    $('addCurrentWebsiteBtn').addEventListener('click', addCurrentWebsite);
    $('searchAllBtn').addEventListener('click', () => searchEngines(false));
    $('searchSelectedBtn').addEventListener('click', () => searchEngines(true));
    $('searchInput').addEventListener('keydown', event => {
      if (event.key === 'Enter') searchEngines(selected.size > 0);
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local' || !changes.engines) return;
      engines = changes.engines.newValue || [];
      selected = new Set([...selected].filter(key => engines.some(engine => engineKey(engine) === key)));
      renderEngines();
    });
    renderEngines(); if (engines.length) $('searchInput').focus();
  } catch (error) { showNotification(`Could not load engines: ${error.message}`); }
});
