const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { MODEL_MANIFEST } = require('../lib/models/model-manifest');
const { verifyArchive, verifyModelDirectory } = require('../lib/models/verify-model');

test('模型清单固定下载源、体积、哈希和运行文件', () => {
  assert.match(MODEL_MANIFEST.url, /^https:\/\/github\.com\/k2-fsa\/sherpa-onnx\/releases\//);
  assert.equal(MODEL_MANIFEST.archiveBytes, 511274346);
  assert.match(MODEL_MANIFEST.archiveSha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(MODEL_MANIFEST.requiredFiles, [
    'encoder-epoch-99-avg-1.int8.onnx',
    'decoder-epoch-99-avg-1.int8.onnx',
    'joiner-epoch-99-avg-1.int8.onnx',
    'tokens.txt'
  ]);
});

test('下载归档同时校验体积与 SHA-256', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'good-express-model-'));
  const file = path.join(dir, 'model.bin');
  fs.writeFileSync(file, 'verified model');
  const expected = {
    archiveBytes: fs.statSync(file).size,
    archiveSha256: crypto.createHash('sha256').update('verified model').digest('hex')
  };
  assert.deepEqual(verifyArchive(file, expected), { ok: true, errors: [] });
  assert.equal(verifyArchive(file, { ...expected, archiveBytes: 1 }).ok, false);
  assert.equal(verifyArchive(file, { ...expected, archiveSha256: '0'.repeat(64) }).ok, false);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('模型目录明确报告缺失文件', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'good-express-model-'));
  fs.writeFileSync(path.join(dir, MODEL_MANIFEST.requiredFiles[0]), 'x');
  const result = verifyModelDirectory(dir, MODEL_MANIFEST);
  assert.equal(result.ok, false);
  assert.deepEqual(result.missing, MODEL_MANIFEST.requiredFiles.slice(1));
  fs.rmSync(dir, { recursive: true, force: true });
});
