const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { formatTranscript, renderTranscriptHtml } = require('../src/transcript-format');

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

test('does not classify 额 or 呢 inside common words', () => {
  const text = '额度、金额、额外、额头、额定、余额、名额、数额、配额、呢喃、花呢、呢绒。嗯，我觉得呢。';
  const result = formatTranscript(text);
  const tokens = result.paragraphs.flatMap((paragraph) => paragraph)
    .flatMap((line) => line.tokens);
  const highlights = tokens
    .filter((token) => token.category)
    .map((token) => [token.text, token.category]);

  assert.equal(tokens.map((token) => token.text).join(''), text);
  assert.deepEqual(result.counts, { filler: 2, hesitation: 1, vague: 0 });
  assert.deepEqual(highlights, [
    ['嗯', 'filler'],
    ['我觉得', 'hesitation'],
    ['呢', 'filler']
  ]);
});

test('does not classify 额 in 超额', () => {
  assert.equal(formatTranscript('超额。').counts.filler, 0);
});

test('does not classify 额 in 全额', () => {
  assert.equal(formatTranscript('全额。').counts.filler, 0);
});

test('does not classify 呢 in 毛呢', () => {
  assert.equal(formatTranscript('毛呢。').counts.filler, 0);
});

test('classifies sentence-final 呢 after 花', () => {
  assert.equal(formatTranscript('这朵花呢？').counts.filler, 1);
});

test('does not classify 额 inside general compound words', () => {
  const text = '面额、前额、额叶、额骨。';
  const result = formatTranscript(text);
  const source = result.paragraphs.flatMap((paragraph) => paragraph)
    .flatMap((line) => line.tokens)
    .map((token) => token.text)
    .join('');

  assert.equal(result.counts.filler, 0);
  assert.equal(source, text);
});

test('does not classify X额 compounds before an unpunctuated clause start', () => {
  const text = '定额、总额、差额、限额、满额、缺额、巨额、份额、税额我觉得。';
  const result = formatTranscript(text);
  const tokens = result.paragraphs.flatMap((paragraph) => paragraph)
    .flatMap((line) => line.tokens);

  assert.equal(result.counts.filler, 0);
  assert.equal(result.counts.hesitation, 1);
  assert.deepEqual(
    tokens.filter((token) => token.category).map((token) => [token.text, token.category]),
    [['我觉得', 'hesitation']]
  );
  assert.equal(tokens.map((token) => token.text).join(''), text);
});

test('does not classify arbitrary amount compounds before a clause start', () => {
  const text = '销售额、营业额、成交额、交易额、投资额我觉得。';
  const result = formatTranscript(text);
  const tokens = result.paragraphs.flatMap((paragraph) => paragraph)
    .flatMap((line) => line.tokens);

  assert.equal(result.counts.filler, 0);
  assert.equal(result.counts.hesitation, 1);
  assert.equal(tokens.map((token) => token.text).join(''), text);
});

test('classifies 呢 before an unpunctuated clause start', () => {
  const text = '这个呢我觉得可以。';
  const result = formatTranscript(text);
  const tokens = result.paragraphs.flatMap((paragraph) => paragraph)
    .flatMap((line) => line.tokens);

  assert.equal(result.counts.filler, 1);
  assert.equal(result.counts.hesitation, 1);
  assert.deepEqual(
    tokens.filter((token) => token.category).map((token) => [token.text, token.category]),
    [['这个', 'vague'], ['呢', 'filler'], ['我觉得', 'hesitation']]
  );
  assert.equal(tokens.map((token) => token.text).join(''), text);
});

test('classifies 额 before an unpunctuated clause start', () => {
  const text = '这个额我觉得可以。';
  const result = formatTranscript(text);
  const tokens = result.paragraphs.flatMap((paragraph) => paragraph)
    .flatMap((line) => line.tokens);

  assert.equal(result.counts.filler, 1);
  assert.equal(result.counts.hesitation, 1);
  assert.deepEqual(
    tokens.filter((token) => token.category).map((token) => [token.text, token.category]),
    [['这个', 'vague'], ['额', 'filler'], ['我觉得', 'hesitation']]
  );
  assert.equal(tokens.map((token) => token.text).join(''), text);
});

for (const text of ['额我觉得。', '然后额我觉得。']) {
  test(`classifies 额 after an allowed discourse context in ${text}`, () => {
    const result = formatTranscript(text);

    assert.equal(result.counts.filler, 1);
    assert.equal(result.counts.hesitation, 1);
  });
}

test('protects longer compounds containing filler characters', () => {
  const text = '呃逆症状和粗花呢。';
  const result = formatTranscript(text);
  const tokens = result.paragraphs.flatMap((paragraph) => paragraph)
    .flatMap((line) => line.tokens);

  assert.equal(result.counts.filler, 0);
  assert.equal(tokens.map((token) => token.text).join(''), text);
});

for (const text of ['呢～', '<呢>', '呢🙂', '这朵花呢～']) {
  test(`classifies 呢 before Unicode symbol boundary in ${text}`, () => {
    const result = formatTranscript(text);
    const source = result.paragraphs.flatMap((paragraph) => paragraph)
      .flatMap((line) => line.tokens)
      .map((token) => token.text)
      .join('');

    assert.equal(result.counts.filler, 1);
    assert.equal(source, text);
  });
}

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
  assert.equal(typeof context.window.TranscriptFormat.renderTranscriptHtml, 'function');
});

test('连续句末标点作为同一句的结尾标点簇', () => {
  const text = '第一句？！第二句。第三句。第四句。';
  const result = formatTranscript(text);

  assert.deepEqual(
    result.paragraphs.map((paragraph) => paragraph.map((line) => line.text).join('')),
    ['第一句？！第二句。第三句。', '第四句。']
  );
  assert.equal(
    result.paragraphs.flat().map((line) => line.text).join(''),
    text
  );
});

test('renders transcript tokens as escaped, allow-listed highlight HTML', () => {
  const html = renderTranscriptHtml(formatTranscript('<img src=x onerror=alert(1)>嗯'));

  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(html, /<img/i);
  assert.doesNotMatch(html, /<[^>]*onerror/i);
  assert.match(html, /<span class="transcript-token filler">嗯<\/span>/);
});

test('renders empty and malformed transcript structures safely', () => {
  assert.equal(renderTranscriptHtml(null), '');
  assert.doesNotThrow(() => renderTranscriptHtml({ paragraphs: [null, [{ tokens: [null, { text: '<x>', category: 'unknown' }] }]] }));
  assert.equal(renderTranscriptHtml({ paragraphs: [[{ tokens: [{ text: '<x>', category: 'unknown' }] }]] }), '<p>&lt;x&gt;</p>');
});
