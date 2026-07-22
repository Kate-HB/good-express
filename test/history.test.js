const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { HistoryStore } = require('../lib/storage/history-index');

test('history saves text reports without audio and supports search', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'good-express-history-'));
  const history = new HistoryStore(root);
  const older = history.save({ transcript: '复习机器学习', report: { summary: '第一份' }, createdAt: '2026-01-01T00:00:00.000Z' });
  const newer = history.save({ transcript: '练习项目表达', report: { summary: '第二份' }, createdAt: '2026-01-02T00:00:00.000Z' });
  assert.deepEqual(history.list().map((item) => item.id), [newer.id, older.id]);
  assert.equal(history.search('复习')[0].id, older.id);
  assert.equal(history.get(older.id).audioPath, undefined);
});

test('history deletion stays inside session directory', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'good-express-history-'));
  const history = new HistoryStore(root);
  const saved = history.save({ transcript: '测试' });
  assert.throws(() => history.remove('../outside'), /非法会话/);
  assert.equal(history.remove(saved.id), true);
  history.save({ transcript: '一' }); history.save({ transcript: '二' });
  assert.equal(history.clear(), 2);
  assert.deepEqual(history.list(), []);
});
