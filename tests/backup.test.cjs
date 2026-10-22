const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const ctx = {};
for (const name of ['shortcut-config.js', 'backup.js']) vm.runInNewContext(fs.readFileSync(require.resolve('../'+name),'utf8'),ctx);
const backup = ctx.RsearchBackup;
const engines = [{name:'Example',url:'https://example.com?q=$Q'}];
test('backup round-trip restores disabled shortcuts and false preferences',()=>{
 const result=backup.parse(backup.create(engines,{pageShortcut:null,rememberQuery:false}));
 assert.equal(result.pageShortcut,null);assert.equal(result.rememberQuery,false);assert.equal(result.engines,engines);
});
test('legacy arrays do not overwrite preferences',()=>{
 const result=backup.parse(engines);assert.deepEqual(Object.keys(result),['engines']);
});
test('reject corrupt backups before storage changes',()=>{
 for (const value of [{}, {format:'rsearch',version:99,engines}, {format:'rsearch',version:1,engines,settings:{rememberQuery:false,pageShortcut:{key:'.'}}}]) assert.throws(()=>backup.parse(value));
});
test('exports only supported settings, never query text',()=>{
 const result=backup.create(engines,{query:'private',rememberQuery:true});
 assert.equal(JSON.stringify(result).includes('private'),false);
 assert.equal(result.settings.pageShortcut.key,'.');
});
