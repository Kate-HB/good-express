# Transcript Formatting and Highlights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实时转写按句分段，并突出显示填充词、犹豫词和笼统词及其数量。

**Architecture:** 新建可同时被浏览器和 Node 测试加载的纯格式化模块，输出段落、分类 token 和计数。渲染器统一处理实时录音、停止录音、上传和粘贴文本，原始 transcript 数据保持不变。

**Tech Stack:** Electron、原生 JavaScript、HTML/CSS、Node.js test runner

---

### Task 1: 纯文本格式化模块

**Files:**
- Create: `src/transcript-format.js`
- Create: `test/transcript-format.test.js`

- [ ] **Step 1: 写断句和分段失败测试**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { formatTranscript } = require('../src/transcript-format');

test('splits sentences and groups at most three sentences per paragraph', () => {
  const result = formatTranscript('第一句。第二句！第三句？第四句。');
  assert.equal(result.paragraphs.length, 2);
  assert.deepEqual(result.paragraphs.map((paragraph) => paragraph.map((line) => line.text).join('')), [
    '第一句。第二句！第三句？',
    '第四句。'
  ]);
});

test('splits unpunctuated text every 80 characters without changing content', () => {
  const text = '甲'.repeat(81);
  const result = formatTranscript(text);
  assert.deepEqual(result.paragraphs.flat().map((line) => line.text.length), [80, 1]);
  assert.equal(result.paragraphs.flat().map((line) => line.text).join(''), text);
});
```

- [ ] **Step 2: 验证测试因模块缺失而失败**

Run: `node --test test/transcript-format.test.js`

Expected: FAIL，提示找不到 `../src/transcript-format`。

- [ ] **Step 3: 实现确定性断句和分段**

```js
const SENTENCE_END = /[^。！？!?；;]+[。！？!?；;]*/g;

function splitLines(text) {
  return (String(text || '').match(SENTENCE_END) || []).flatMap((sentence) => {
    const lines = [];
    for (let index = 0; index < sentence.length; index += 80) lines.push(sentence.slice(index, index + 80));
    return lines;
  });
}

function groupParagraphs(lines) {
  const paragraphs = [];
  let paragraph = [];
  let length = 0;
  for (const line of lines) {
    if (paragraph.length >= 3 || (paragraph.length >= 2 && length + line.length > 160)) {
      paragraphs.push(paragraph);
      paragraph = [];
      length = 0;
    }
    paragraph.push({ text: line, tokens: [] });
    length += line.length;
  }
  if (paragraph.length) paragraphs.push(paragraph);
  return paragraphs;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test test/transcript-format.test.js`

Expected: 2 tests PASS。

- [ ] **Step 5: 提交断句实现**

```powershell
git add -- src/transcript-format.js test/transcript-format.test.js
git commit -m "feat: format transcript paragraphs"
```

### Task 2: 分类高亮与计数

**Files:**
- Modify: `src/transcript-format.js`
- Modify: `test/transcript-format.test.js`

- [ ] **Step 1: 写分类、重叠优先级和原文保持测试**

```js
test('classifies filler hesitation and vague words with counts', () => {
  const result = formatTranscript('嗯，我觉得这个事情可能很好，那个方案也许可以。');
  assert.deepEqual(result.counts, { filler: 2, hesitation: 3, vague: 3 });
  const highlighted = result.paragraphs.flat().flatMap((line) => line.tokens).filter((token) => token.category);
  assert.deepEqual(highlighted.map(({ text, category }) => [text, category]), [
    ['嗯', 'filler'], ['我觉得', 'hesitation'], ['这个', 'vague'], ['事情', 'vague'],
    ['可能', 'hesitation'], ['很好', 'vague'], ['那个', 'filler'], ['也许', 'hesitation']
  ]);
});

test('keeps every source character exactly once', () => {
  const text = '<嗯>这个事情。';
  const result = formatTranscript(text);
  assert.equal(result.paragraphs.flat().flatMap((line) => line.tokens).map((token) => token.text).join(''), text);
});
```

- [ ] **Step 2: 运行测试确认缺少分类而失败**

Run: `node --test test/transcript-format.test.js`

Expected: FAIL，实际计数为空或 token 未分类。

- [ ] **Step 3: 实现最长词优先分类**

```js
const WORDS = {
  filler: ['就是说', '那个', '就是', '嗯', '呃', '额', '啊', '呢'],
  hesitation: ['不一定', '我觉得', '可能', '也许', '大概', '应该', '好像', '似乎', '或许', '感觉'],
  vague: ['想要', '觉得', '很好', '非常', '东西', '事情', '这个']
};
const PRIORITY = ['filler', 'hesitation', 'vague'];
const MATCHERS = PRIORITY.flatMap((category) => WORDS[category].map((text) => ({ text, category })))
  .sort((left, right) => right.text.length - left.text.length || PRIORITY.indexOf(left.category) - PRIORITY.indexOf(right.category));

function tokenize(text, counts) {
  const tokens = [];
  let plain = '';
  for (let index = 0; index < text.length;) {
    const match = MATCHERS.find((item) => text.startsWith(item.text, index));
    if (!match) { plain += text[index]; index += 1; continue; }
    if (plain) { tokens.push({ text: plain, category: null }); plain = ''; }
    tokens.push(match);
    counts[match.category] += 1;
    index += match.text.length;
  }
  if (plain) tokens.push({ text: plain, category: null });
  return tokens;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test test/transcript-format.test.js`

Expected: 4 tests PASS。

- [ ] **Step 5: 提交分类实现**

```powershell
git add -- src/transcript-format.js test/transcript-format.test.js
git commit -m "feat: classify transcript wording"
```

### Task 3: 转写区统一渲染

**Files:**
- Modify: `src/index.html`
- Modify: `src/styles.css`
- Modify: `src/app.js`
- Modify: `test/window.test.js`

- [ ] **Step 1: 写界面接入失败测试**

```js
test('renderer formats every transcript entry point and displays category counters', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/app.js'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '../src/index.html'), 'utf8');
  assert.match(html, /src="transcript-format\.js"/);
  assert.match(html, /id="fillerCount"/);
  assert.match(html, /id="hesitationCount"/);
  assert.match(html, /id="vagueCount"/);
  assert.match(source, /function renderTranscript/);
  assert.ok((source.match(/renderTranscript\(/g) || []).length >= 6);
  assert.match(source, /transcript-token filler/);
  assert.match(source, /transcript-token hesitation/);
  assert.match(source, /transcript-token vague/);
});
```

- [ ] **Step 2: 运行测试确认界面尚未接入而失败**

Run: `node --test test/window.test.js`

Expected: FAIL，缺少计数元素或 `renderTranscript`。

- [ ] **Step 3: 添加计数栏和脚本加载**

```html
<div class="transcript-stats">
  <span class="filler">填充词 <b id="fillerCount">0</b></span>
  <span class="hesitation">犹豫词 <b id="hesitationCount">0</b></span>
  <span class="vague">笼统词 <b id="vagueCount">0</b></span>
</div>
<article id="transcript" class="transcript">你的实时字幕会出现在这里。</article>
<script src="transcript-format.js"></script>
<script src="app.js"></script>
```

- [ ] **Step 4: 添加统一安全渲染并替换所有直接赋值**

```js
function renderTranscript(text, fallback = '你的实时字幕会出现在这里。') {
  const formatted = window.TranscriptFormat.formatTranscript(text);
  ['filler', 'hesitation', 'vague'].forEach((category) => {
    byId(`${category}Count`).textContent = formatted.counts[category];
  });
  byId('transcript').innerHTML = formatted.paragraphs.length
    ? formatted.paragraphs.map((paragraph) => `<p>${paragraph.map((line) =>
        line.tokens.map((token) => token.category
          ? `<span class="transcript-token ${token.category}">${escapeHtml(token.text)}</span>`
          : escapeHtml(token.text)).join('')).join('<br>')}</p>`).join('')
    : escapeHtml(fallback);
}
```

将实时 `renderUpdate`、录音停止、上传开始与完成、粘贴开始与完成、报告生成返回处的 `transcript.textContent` 改为 `renderTranscript(...)`。

- [ ] **Step 5: 添加三类视觉样式**

```css
.transcript-stats { display:flex; gap:10px; margin:10px 0; font-size:13px; }
.transcript-stats span { padding:5px 9px; border-radius:999px; background:#fff; border:1px solid var(--line); }
.transcript p { margin:0 0 1em; }
.transcript-token { border-bottom:2px solid currentColor; border-radius:2px; padding:0 .04em; }
.transcript-token.filler, .transcript-stats .filler { color:#c75050; }
.transcript-token.hesitation, .transcript-stats .hesitation { color:#b18100; }
.transcript-token.vague, .transcript-stats .vague { color:#356fa3; }
```

- [ ] **Step 6: 运行界面和格式化测试**

Run: `node --test test/window.test.js test/transcript-format.test.js`

Expected: 全部 PASS。

- [ ] **Step 7: 提交界面接入**

```powershell
git add -- src/index.html src/styles.css src/app.js test/window.test.js
git commit -m "feat: highlight realtime transcript wording"
```

### Task 4: 全量验证

**Files:**
- Modify only if a regression is found in files already listed above.

- [ ] **Step 1: 检查语法**

Run: `node --check src/transcript-format.js; node --check src/app.js`

Expected: exit code 0。

- [ ] **Step 2: 运行全量测试**

Run: `npm.cmd test`

Expected: 所有测试 PASS，0 failures。

- [ ] **Step 3: 验证真实 ASR 未回归**

Run: `npm.cmd run verify:asr`

Expected: 输出 `ASR_REAL_MODEL_OK`。

- [ ] **Step 4: 检查变更范围**

Run: `git diff --check; git status --short`

Expected: 无空白错误；仅包含本功能文件与用户此前未提交改动。
