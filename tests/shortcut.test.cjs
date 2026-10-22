const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const context = { document: { designMode: 'off' } };
vm.runInNewContext(fs.readFileSync(require.resolve('../shortcut-config.js'), 'utf8'), context);
const config = context.RsearchShortcut;
const event = (overrides = {}) => ({ key: '.', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false, ...overrides });
test('default shortcut requires an exact match and ignores repeats and composition', () => {
  assert.equal(config.matches(event(), config.defaultValue), true);
  for (const override of [{ctrlKey:true}, {shiftKey:true}, {repeat:true}, {isComposing:true}, {key:','}, {getModifierState:()=>true}]) {
    assert.equal(config.matches(event(override), config.defaultValue), false);
  }
  assert.equal(config.matches(event(), null), false);
});
test('editing guard covers fields, editable descendants and shadow DOM paths', () => {
  for (const target of [{tagName:'INPUT'}, {tagName:'TEXTAREA'}, {tagName:'SELECT'}, {isContentEditable:true}, {getAttribute:()=> 'textbox'}]) {
    assert.equal(config.isEditing({composedPath:()=>[{}, target]}), true);
  }
  assert.equal(config.isEditing({composedPath:()=>[{tagName:'DIV'}]}), false);
  context.document.designMode = 'on';
  assert.equal(config.isEditing({composedPath:()=>[]}), true);
});
