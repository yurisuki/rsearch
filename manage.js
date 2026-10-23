const $ = id => document.getElementById(id);
let engines = [], editIndex = -1, busy = false, statusTimer, draggedIndex = null;
function notify(text) { $('status').textContent = text; clearTimeout(statusTimer); statusTimer = setTimeout(() => $('status').textContent = '', 5000); }
function validate(items) {
  if (!Array.isArray(items)) throw Error('Expected a JSON array of engines.');
  items.forEach((e, i) => {
    if (!e || typeof e.name !== 'string' || !e.name.trim() || typeof e.url !== 'string') throw Error(`Engine ${i + 1} needs a name and URL.`);
    const url = new URL(e.url);
    if (!['https:', 'http:'].includes(url.protocol)) throw Error(`Engine ${i + 1} must use an HTTP or HTTPS URL.`);
    if (!e.url.includes('$Q')) throw Error(`Engine ${i + 1}: replace the search words with $Q.`);
  });
}
async function commit(next, message) {
  if (busy) return false;
  busy = true;
  try { await chrome.storage.local.set({ engines: next }); engines = next; render(); if (message) notify(message); return true; }
  catch (e) { notify(`Could not save: ${e.message}`); return false; }
  finally { busy = false; }
}
function button(text, label, fn, disabled = false, className = '') {
  const b = document.createElement('button'); b.textContent = text; b.title = label; b.setAttribute('aria-label', label); b.disabled = disabled; b.className = className; b.addEventListener('click', fn); return b;
}
function render() {
  const filter = $('filter').value.toLowerCase(); $('list').replaceChildren(); let shown = 0;
  engines.forEach((e, index) => {
    if (!`${e.name} ${e.url}`.toLowerCase().includes(filter)) return;
    shown++;
    const row = document.createElement('div'); row.className = 'row';
    const handle = document.createElement('span'); handle.className = 'drag-handle'; handle.textContent = '⠿'; handle.draggable = true; handle.title = 'Drag to reorder'; handle.setAttribute('aria-hidden', 'true');
    handle.addEventListener('dragstart', event => {
      if (busy) { event.preventDefault(); return; }
      draggedIndex = index; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', String(index));
      row.classList.add('dragging');
    });
    handle.addEventListener('dragend', () => { draggedIndex = null; document.querySelectorAll('.dragging, .drop-before, .drop-after').forEach(row => row.classList.remove('dragging', 'drop-before', 'drop-after')); });
    row.addEventListener('dragover', event => {
      if (draggedIndex === null || draggedIndex === index) return;
      event.preventDefault(); event.dataTransfer.dropEffect = 'move';
      const after = event.clientY > row.getBoundingClientRect().top + row.getBoundingClientRect().height / 2;
      row.classList.toggle('drop-before', !after); row.classList.toggle('drop-after', after);
    });
    row.addEventListener('dragleave', event => { if (!row.contains(event.relatedTarget)) row.classList.remove('drop-before', 'drop-after'); });
    row.addEventListener('drop', async event => {
      if (draggedIndex === null) return;
      event.preventDefault();
      const after = event.clientY > row.getBoundingClientRect().top + row.getBoundingClientRect().height / 2;
      const from = draggedIndex; draggedIndex = null;
      row.classList.remove('drop-before', 'drop-after');
      await reorder(from, index, after);
    });
    const number = document.createElement('span'); number.className = 'number'; number.textContent = String(index + 1).padStart(2, '0');
    const details = document.createElement('div'); details.className = 'details';
    const name = document.createElement('div'); name.className = 'name'; name.textContent = e.name;
    const url = document.createElement('span'); url.className = 'url'; url.textContent = e.url; url.title = e.url;
    details.append(name, url);
    const actions = document.createElement('div'); actions.className = 'actions';
    actions.append(button('↑', `Move ${e.name} up`, () => move(index, -1), index === 0), button('↓', `Move ${e.name} down`, () => move(index, 1), index === engines.length - 1), button('Edit', `Edit ${e.name}`, () => edit(index)), button('Remove', `Remove ${e.name}`, () => commit(engines.filter((_, i) => i !== index), 'Engine removed'), false, 'danger'));
    row.append(handle, number, details, actions); $('list').append(row);
  });
  $('count').textContent = `${engines.length} engines`;
  $('empty').hidden = shown > 0;
  $('empty').textContent = engines.length ? 'No engines match your search.' : 'No engines here yet. Add a site or import your library.';
  $('deleteAll').disabled = !engines.length;
}
function reordered(items, from, to, after) {
  const next = [...items];
  let destination = to + (after ? 1 : 0);
  const [item] = next.splice(from, 1);
  if (from < destination) destination--;
  next.splice(destination, 0, item);
  return next;
}
async function reorder(from, to, after) {
  if (from === to || from < 0 || to < 0 || from >= engines.length || to >= engines.length) return;
  await commit(reordered(engines, from, to, after), 'Engine order saved');
}
async function move(index, delta) {
  const target = index + delta; if (target < 0 || target >= engines.length) return;
  const next = [...engines]; [next[index], next[target]] = [next[target], next[index]];
  if (await commit(next)) {
    const rows = [...$('list').children];
    const row = rows.find(row => Number(row.querySelector('.number').textContent) === target + 1);
    row?.scrollIntoView({ block: 'nearest' });
    const buttons = row?.querySelectorAll('button');
    if (buttons) (buttons[delta < 0 ? 0 : 1].disabled ? buttons[delta < 0 ? 1 : 0] : buttons[delta < 0 ? 0 : 1]).focus();
  }
}
function edit(index = -1, draft = {}) {
  editIndex = index; const engine = index >= 0 ? engines[index] : draft;
  $('editorTitle').textContent = index >= 0 ? 'Edit engine' : 'Add engine';
  $('name').value = engine.name || ''; $('url').value = engine.url || ''; $('editorError').textContent = '';
  $('editor').showModal(); $('name').focus();
}
function draftFromWebsite(raw, title) {
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol)) throw Error('Open an HTTP or HTTPS website first.');
  if (/(^|\.)geo-ship\.com$/.test(url.hostname) && url.hash.includes('?')) {
    const split = url.hash.indexOf('?');
    const params = new URLSearchParams(url.hash.slice(split + 1));
    if (params.has('searchParams')) {
      const search = JSON.parse(params.get('searchParams'));
      if (search.commonOptions && typeof search.commonOptions.keywords === 'string') {
        search.commonOptions.keywords = '$Q';
        params.set('searchParams', JSON.stringify(search));
        url.hash = url.hash.slice(0, split + 1) + params.toString();
      }
    }
  }
  const keys = ['q', 'query', 'search', 's', 'search_query', 'searchTerm', 'keyword', 'keywords', '_nkw', 'phrase', 'string'];
  const key = keys.find(key => url.searchParams.has(key));
  if (key) url.searchParams.set(key, '$Q');
  return { name: title || url.hostname, url: url.toString().replace(/%24Q/g, '$Q') };
}
async function init() {
  await initShortcutSettings();
  const preferences = await chrome.storage.local.get('rememberQuery');
  $('rememberQuery').checked = preferences.rememberQuery !== false;
  $('rememberQuery').addEventListener('change', async () => {
    try { await chrome.storage.local.set({ rememberQuery: $('rememberQuery').checked }); notify('Search preference saved'); }
    catch (error) { $('rememberQuery').checked = !$('rememberQuery').checked; notify(`Could not save: ${error.message}`); }
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.rememberQuery) $('rememberQuery').checked = changes.rememberQuery.newValue !== false;
  });
  const saved = await chrome.storage.local.get('engines'); engines = saved.engines || []; render();
  $('filter').addEventListener('input', render);
  $('add').addEventListener('click', () => edit());
  for (const id of ['close', 'cancel']) $(id).addEventListener('click', () => $('editor').close());
  $('form').addEventListener('submit', async event => {
    event.preventDefault(); const engine = { name: $('name').value.trim(), url: $('url').value.trim() };
    try { validate([engine]); } catch (e) { $('editorError').textContent = e.message; return; }
    const next = [...engines]; if (editIndex >= 0) next[editIndex] = engine; else next.push(engine);
    if (await commit(next, 'Engine saved')) $('editor').close();
  });
  $('import').addEventListener('click', () => $('file').click());
  $('file').addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file) return;
    if (busy) return;
    busy = true;
    try {
      const data = RsearchBackup.parse(JSON.parse((await file.text()).replace(/^\uFEFF/, '')));
      validate(data.engines);
      await chrome.storage.local.set(data);
      engines = data.engines; render();
      notify(`Imported ${engines.length} engines${'pageShortcut' in data ? ' and settings' : ''}`);
    }
    catch (e) { notify(`Import failed: ${e.message}`); }
    finally { busy = false; event.target.value = ''; }
  });
  function downloadJSON(value, prefix) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `${prefix}-${new Date().toISOString().slice(0, 10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  $('export').addEventListener('click', async () => {
    try {
      const saved = await chrome.storage.local.get(['engines', 'pageShortcut', 'rememberQuery']);
      downloadJSON(RsearchBackup.create(saved.engines || [], saved), 'rsearch-backup');
    } catch (error) { notify(`Export failed: ${error.message}`); }
  });
  $('exportEngines').addEventListener('click', () => downloadJSON(engines, 'rsearch-engines'));
  $('deleteAll').addEventListener('click', () => $('confirm').showModal());
  $('cancelDelete').addEventListener('click', () => $('confirm').close());
  $('confirmDelete').addEventListener('click', async () => { if (await commit([], 'Library cleared')) $('confirm').close(); });
  const params = new URLSearchParams(location.search);
  if (location.hash === '#add' && params.has('url')) {
    try { edit(-1, draftFromWebsite(params.get('url'), params.get('title'))); history.replaceState(null, '', 'manage.html'); }
    catch (e) { notify(e.message); }
  }
  if (location.hash === '#import') notify('Choose Import JSON to replace your engine library with an exported file.');
}
init().catch(e => notify(`Could not load engines: ${e.message}`));

async function initShortcutSettings() {
  const saved = await chrome.storage.local.get('pageShortcut');
  let shortcut = saved.pageShortcut === undefined ? RsearchShortcut.defaultValue : saved.pageShortcut;
  let recording = false;
  const renderShortcut = () => { $('recordShortcut').textContent = RsearchShortcut.label(shortcut); };
  async function saveShortcut(next) {
    recording = false;
    try {
      await chrome.storage.local.set({ pageShortcut: next });
      shortcut = next; renderShortcut();
      $('shortcutHelp').textContent = 'Saved. Applies to open websites immediately.';
    } catch (error) { renderShortcut(); notify(`Could not save shortcut: ${error.message}`); }
  }
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.pageShortcut) return;
    shortcut = changes.pageShortcut.newValue === undefined ? RsearchShortcut.defaultValue : changes.pageShortcut.newValue;
    recording = false; renderShortcut();
  });
  renderShortcut();
  $('recordShortcut').addEventListener('click', () => {
    recording = true; $('recordShortcut').textContent = 'Press a key…';
    $('shortcutHelp').textContent = 'Press a key or combination. Esc cancels.';
  });
  $('recordShortcut').addEventListener('blur', () => { recording = false; renderShortcut(); });
  $('recordShortcut').addEventListener('keydown', event => {
    if (!recording || event.repeat || event.isComposing) return;
    event.preventDefault(); event.stopPropagation();
    if (event.key === 'Escape') { recording = false; renderShortcut(); return; }
    if (['Control', 'Alt', 'Shift', 'Meta', 'Dead', 'Unidentified'].includes(event.key)) return;
    if (event.key === 'Tab' || event.getModifierState('AltGraph')) {
      $('shortcutHelp').textContent = 'Choose another key; Tab and AltGr are reserved for navigation and typing.'; return;
    }
    saveShortcut(RsearchShortcut.fromEvent(event));
  });
  $('resetShortcut').addEventListener('click', () => saveShortcut(RsearchShortcut.defaultValue));
  $('disableShortcut').addEventListener('click', () => saveShortcut(null));
}
