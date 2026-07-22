const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('renderer uses AudioWorklet and removes deprecated ScriptProcessor', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/app.js'), 'utf8');
  assert.match(source, /audioWorklet\.addModule/);
  assert.match(source, /new AudioWorkletNode/);
  assert.doesNotMatch(source, /createScriptProcessor/);
});

test('worklet registers capture processor and supports stop flushing', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/audio-capture-worklet.js'), 'utf8');
  assert.match(source, /registerProcessor\(['"]capture-processor/);
  assert.match(source, /event\.data === 'stop'/);
  assert.match(source, /postMessage/);
});
