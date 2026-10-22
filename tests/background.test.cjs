const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function setup(failInjection = false) {
  const calls = [];
  let onMessage, onClick;
  const chrome = {
    runtime: { onMessage: { addListener(fn) { onMessage = fn; } }, getURL: path => `chrome-extension://test/${path}` },
    action: { onClicked: { addListener(fn) { onClick = fn; } } },
    tabs: {
      create: async args => { calls.push(['tab', args]); },
      update: async () => { throw Error('Must not replace an existing tab'); },
      sendMessage: async (...args) => { calls.push(['message', ...args]); }
    },
    windows: { create: async args => { calls.push(['window', args]); return { id: 123 }; } },
    scripting: { executeScript: async args => { if (failInjection) throw Error('Restricted'); calls.push(['inject', args]); } }
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../background.js'), 'utf8'), { chrome });
  return { calls, click: onClick, message: (message, sender = {}) => new Promise(resolve => onMessage(message, sender, resolve)) };
}
test('a single result creates a new tab without replacing the source', async () => {
  const app = setup();
  assert.equal((await app.message({ action: 'searchSingle', url: 'https://example.com/?q=test' })).success, true);
  assert.equal(app.calls.length, 1);
  assert.equal(app.calls[0][0], 'tab');
  assert.equal(app.calls[0][1].url, 'https://example.com/?q=test');
});
test('multiple results retain the existing new-window behavior', async () => {
  const app = setup();
  const result = await app.message({ action: 'searchAll', urls: ['https://a.test', 'https://b.test'] });
  assert.equal(result.tabsOpened, 2);
  assert.equal(app.calls[0][0], 'window');
  assert.equal(app.calls[1][1].windowId, 123);
  assert.equal(app.calls[1][1].active, false);
});
test('empty searches return a useful error and open nothing', async () => {
  const app = setup();
  assert.equal((await app.message({ action: 'searchAll', urls: [] })).success, false);
  assert.equal(app.calls.length, 0);
});
test('activation injects only into the source tab', async () => {
  const app = setup();
  await app.click({ id: 42, url: 'https://example.com' });
  assert.equal(app.calls[0][0], 'inject');
  assert.equal(app.calls[0][1].target.tabId, 42);
});
for (const [name, url, fail] of [['internal page', 'brave://newtab', false], ['blocked website', 'https://example.com', true]]) {
  test(`${name} uses a persistent window with source tab context`, async () => {
    const app = setup(fail);
    await app.click({ id: 42, url });
    assert.equal(app.calls[0][0], 'window');
    assert.equal(app.calls[0][1].type, 'popup');
    assert.match(app.calls[0][1].url, /sourceTabId=42$/);
  });
}
test('close is routed to the originating tab and top frame', async () => {
  const app = setup();
  await app.message({ action: 'closePanel' }, { tab: { id: 42 } });
  assert.equal(app.calls[0][1], 42);
  assert.equal(app.calls[0][2].action, 'hidePanel');
  assert.equal(app.calls[0][3].frameId, 0);
});
