const test = require('node:test');
const assert = require('node:assert/strict');
const { createModelDownloadCommand } = require('../lib/models/download-command');

test('model downloader runs hidden PowerShell and writes to persistent user data', () => {
  const command = createModelDownloadCommand('C:\\Program Files\\言析\\resources\\scripts\\download-model.ps1', 'C:\\Users\\user\\AppData\\Roaming\\expression-trainer-desktop\\models');
  assert.equal(command.executable, 'powershell.exe');
  assert.deepEqual(command.args.slice(0, 4), ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File']);
  assert.equal(command.args.at(-2), '-ModelRoot');
  assert.match(command.args.at(-1), /AppData.*models/);
  assert.equal(command.options.windowsHide, true);
});
