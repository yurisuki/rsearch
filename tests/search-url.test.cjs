const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const ctx = {URL, URLSearchParams, window: {addEventListener() {}}, document: {addEventListener() {}}};
vm.runInNewContext(fs.readFileSync(require.resolve('../popup.js'), 'utf8'), ctx);
const template = 'https://www.geo-ship.com/#/search-results?searchParams=' + encodeURIComponent(JSON.stringify({commonOptions: {keywords: '$Q'}, advancedOptions: {displayCurrency: 'CZK'}})).replace('%24Q', '$Q');
for (const query of ['EVF8218-E', '"EVF8218-E"', 'a\\b', 'český & + % #', 'line\nnext']) {
  test('Geo-Ship JSON round trip: ' + JSON.stringify(query), () => {
    const result = ctx.buildSearchUrl(template, query);
    const data = JSON.parse(new URLSearchParams(new URL(result).hash.split('?')[1]).get('searchParams'));
    assert.equal(data.commonOptions.keywords, query);
    assert.equal(data.advancedOptions.displayCurrency, 'CZK');
  });
}
test('ordinary engines keep standard URL encoding', () => {
  assert.equal(ctx.buildSearchUrl('https://www.ebay.com/?q=$Q', '"abc"'), 'https://www.ebay.com/?q=%22abc%22');
});
const manage = fs.readFileSync(require.resolve('../manage.js'), 'utf8');
vm.runInNewContext(manage.slice(manage.indexOf('function draftFromWebsite('), manage.indexOf('async function init()')), ctx);
test('capture Geo-Ship replaces keywords and preserves filters', () => {
  const draft = ctx.draftFromWebsite(ctx.buildSearchUrl(template, 'old query'), 'Geo');
  assert.ok(draft.url.includes('$Q'));
  const result = ctx.buildSearchUrl(draft.url, '"new"');
  const data = JSON.parse(new URLSearchParams(new URL(result).hash.split('?')[1]).get('searchParams'));
  assert.equal(data.commonOptions.keywords, '"new"');
  assert.equal(data.advancedOptions.displayCurrency, 'CZK');
});
