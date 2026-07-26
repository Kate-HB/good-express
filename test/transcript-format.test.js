const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { formatTranscript } = require('../src/transcript-format');

test('classifies spoken wording and counts every match', () => {
  const result = formatTranscript('嗯，我觉得这个事情可能很好，那个方案也许可以。');
  const highlights = result.paragraphs.flatMap((paragraph) => paragraph)
    .flatMap((line) => line.tokens)
    .filter((token) => token.category)
    .map((token) => [token.text, token.category]);

  assert.deepEqual(result.counts, { filler: 2, hesitation: 3, vague: 3 });
  assert.deepEqual(highlights, [
    ['嗯', 'filler'], ['我觉得', 'hesitation'], ['这个', 'vague'],
    ['事情', 'vague'], ['可能', 'hesitation'], ['很好', 'vague'],
    ['那个', 'filler'], ['也许', 'hesitation']
  ]);
});

test('tokens preserve every source character in order', () => {
  const text = '<嗯>这个事情。';
  const tokens = formatTranscript(text).paragraphs.flatMap((paragraph) => paragraph)
    .flatMap((line) => line.tokens);

  assert.equal(tokens.map((token) => token.text).join(''), text);
  assert.deepEqual(tokens, [
    { text: '<', category: null }, { text: '嗯', category: 'filler' },
    { text: '>', category: null }, { text: '这个', category: 'vague' },
    { text: '事情', category: 'vague' }, { text: '。', category: null }
  ]);
});

test('按句末标点将三行与下一行分为两段', () => {
  const result = formatTranscript('第一句。第二句！第三句？第四句。');

  assert.deepEqual(
    result.paragraphs.map((paragraph) => paragraph.map((line) => line.text)),
    [['第一句。', '第二句！', '第三句？'], ['第四句。']]
  );
  assert.equal(
    result.paragraphs.flat().map((line) => line.tokens.map((token) => token.text).join('')).join(''),
    '第一句。第二句！第三句？第四句。'
  );
});

test('无标点文本每八十字拆行且不丢失原文', () => {
  const text = '甲'.repeat(81);
  const result = formatTranscript(text);
  const lines = result.paragraphs.flat();

  assert.deepEqual(lines.map((line) => line.text.length), [80, 1]);
  assert.equal(lines.map((line) => line.text).join(''), text);
});

test('单个长句的多行留在同一段', () => {
  const text = '甲'.repeat(161) + '。';
  const result = formatTranscript(text);
  const lines = result.paragraphs.flat();

  assert.equal(result.paragraphs.length, 1);
  assert.deepEqual(lines.map((line) => line.text.length), [80, 80, 2]);
  assert.equal(lines.map((line) => line.text).join(''), text);
});

test('两句后加入过长第三句时提前分段', () => {
  const text = '第一句。第二句。' + '甲'.repeat(161) + '。';
  const result = formatTranscript(text);

  assert.deepEqual(
    result.paragraphs.map((paragraph) => paragraph.map((line) => line.text).join('')),
    ['第一句。第二句。', '甲'.repeat(161) + '。']
  );
});

test('null 和 undefined 按空串处理', () => {
  assert.deepEqual(formatTranscript(null), {
    paragraphs: [],
    counts: { filler: 0, hesitation: 0, vague: 0 }
  });
  assert.deepEqual(formatTranscript(undefined), {
    paragraphs: [],
    counts: { filler: 0, hesitation: 0, vague: 0 }
  });
});

test('浏览器环境挂载 TranscriptFormat', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/transcript-format.js'), 'utf8');
  const context = { window: {} };

  vm.runInNewContext(source, context);

  assert.equal(typeof context.window.TranscriptFormat.formatTranscript, 'function');
});
