const test = require('node:test');
const assert = require('node:assert/strict');

const { formatTranscript } = require('../src/transcript-format');

test('按句末标点将三行与下一行分为两段', () => {
  const result = formatTranscript('第一句。第二句！第三句？第四句。');

  assert.deepEqual(
    result.paragraphs.map((paragraph) => paragraph.map((line) => line.text)),
    [['第一句。', '第二句！', '第三句？'], ['第四句。']]
  );
  assert.deepEqual(
    result.paragraphs.flat().map((line) => line.tokens),
    [[], [], [], []]
  );
});

test('无标点文本每八十字拆行且不丢失原文', () => {
  const text = '甲'.repeat(81);
  const result = formatTranscript(text);
  const lines = result.paragraphs.flat();

  assert.deepEqual(lines.map((line) => line.text.length), [80, 1]);
  assert.equal(lines.map((line) => line.text).join(''), text);
});
