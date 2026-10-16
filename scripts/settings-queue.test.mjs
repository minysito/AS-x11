// SPDX-License-Identifier: GPL-3.0-or-later
import { readFileSync } from 'node:fs';
import { transpileModule, ModuleKind } from 'typescript';
import { test } from 'node:test';
import assert from 'node:assert/strict';
const timers = new Map(); let timerId=0;
globalThis.window = { setTimeout: callback=>{ const id=++timerId;timers.set(id,callback);return id; }, clearTimeout:id=>timers.delete(id), dispatchEvent:()=>{} };
const code=transpileModule(readFileSync(new URL('../src/lib/settingsQueue.ts',import.meta.url),'utf8'),{compilerOptions:{module:ModuleKind.ESNext}}).outputText;
const { queueSetting, pendingValue }=await import('data:text/javascript,'+encodeURIComponent(code));
async function runTimers(){const work=[...timers.values()];timers.clear();await Promise.all(work.map(fn=>fn()));}

test('rapid slider changes write only the latest value and resolve every caller',async()=>{
  const writes=[]; const write=async value=>writes.push(value);
  const first=queueSetting('dpi:1',{dpi:800},write),last=queueSetting('dpi:1',{dpi:1600},write);
  assert.deepEqual(pendingValue('dpi:1'),{dpi:1600});
  await runTimers(); await Promise.all([first,last]);
  assert.deepEqual(writes,[{dpi:1600}]);assert.equal(pendingValue('dpi:1'),undefined);
});
test('an edit arriving during a write is preserved and applied afterwards',async()=>{
  let complete;const writes=[];
  const first=queueSetting('polling:1',500,async value=>{writes.push(value);await new Promise(resolve=>complete=resolve);});
  const flushing=runTimers();
  const second=queueSetting('polling:1',1000,async value=>writes.push(value));
  complete();await flushing;await first;await runTimers();await second;
  assert.deepEqual(writes,[500,1000]);
});
test('failures reject callers and remove optimistic state',async()=>{
  const result=queueSetting('lighting:1',{color:'red'},async()=>{throw new Error('disconnected');});
  const rejection=assert.rejects(result,/disconnected/);
  await runTimers();await rejection;assert.equal(pendingValue('lighting:1'),undefined);
});
test('different profiles cannot overwrite one another',async()=>{
  const writes=[];
  const a=queueSetting('buttons:1',1,async value=>writes.push(value));
  const b=queueSetting('buttons:2',2,async value=>writes.push(value));
  await runTimers();await Promise.all([a,b]);assert.deepEqual(writes.sort(),[1,2]);
});
