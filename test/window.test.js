const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { windowSizeFor } = require('../lib/window-options');

test('desktop window stays inside a small Windows work area', () => {
  const size = windowSizeFor({ width: 1220, height: 720 });
  assert.ok(size.width <= 1180);
  assert.ok(size.height <= 680);
  assert.ok(size.width >= 980);
});

test('renderer displays realtime feedback and replaces partial text with stop-flushed transcript', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/app.js'), 'utf8');
  const main = fs.readFileSync(path.join(__dirname, '../main.js'), 'utf8');
  assert.match(source, /update\.realtimeFeedback/);
  assert.match(source, /result\.transcript/);
  assert.match(main, /transcript:\s*trainer\.session\.transcript/);
});

test('renderer supports deep report fields without breaking old history', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/app.js'), 'utf8');
  assert.match(source, /report\.score/);
  assert.match(source, /report\.behaviorPatterns/);
  assert.match(source, /report\.structureAnalysis/);
  assert.match(source, /if \(report\.behaviorPatterns\)/);
  assert.match(source, /function toArray/);
});

test('report is a full-screen isolated scroll layer', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/app.js'), 'utf8');
  const styles = fs.readFileSync(path.join(__dirname, '../src/styles.css'), 'utf8');
  assert.match(styles, /\.report\s*\{[^}]*position:fixed;[^}]*inset:0;/s);
  assert.match(styles, /body\.report-open\s*\{[^}]*overflow:hidden;/s);
  assert.match(source, /document\.body\.classList\.add\('report-open'\)/);
  assert.match(source, /document\.body\.classList\.remove\('report-open'\)/);
});

test('Electron defers report generation and history saving to a manual IPC', () => {
  const main = fs.readFileSync(path.join(__dirname, '../main.js'), 'utf8');
  const preload = fs.readFileSync(path.join(__dirname, '../preload.js'), 'utf8');
  const stopStart = main.indexOf("ipcMain.handle('practice:stop'");
  const stopEnd = main.indexOf("ipcMain.handle('practice:upload-start'");
  const stopBlock = main.slice(stopStart, stopEnd);
  assert.match(stopBlock, /trainer\.finish\(/);
  assert.doesNotMatch(stopBlock, /generateReport\(/);
  assert.doesNotMatch(stopBlock, /historyStore\(\)\.save/);
  assert.match(main, /let pendingReport = null/);
  assert.match(main, /ipcMain\.handle\('practice:generate-report'/);
  assert.match(main, /pendingReport\.orchestrator\.generateReport/);
  assert.match(preload, /generateReport: \(\) => ipcRenderer\.invoke\('practice:generate-report'\)/);
});

test('new recording, upload, or text preparation discards an older pending report', () => {
  const main = fs.readFileSync(path.join(__dirname, '../main.js'), 'utf8');
  assert.match(main, /function discardPendingReport\(\)/);
  assert.ok((main.match(/discardPendingReport\(\);/g) || []).length >= 3);
  assert.match(main, /preparePastedText/);
});

test('renderer exposes one manual report button after transcription', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/app.js'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '../src/index.html'), 'utf8');
  assert.match(html, /id="generateReportButton"[^>]*hidden/);
  assert.match(source, /window\.trainer\.generateReport\(\)/);
  assert.match(source, /转写已完成/);
  assert.match(source, /结束录音/);
  assert.doesNotMatch(source, /结束并生成报告/);
});

test('renderer formats transcripts with highlights and count indicators', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/app.js'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '../src/index.html'), 'utf8');
  const formatSource = fs.readFileSync(path.join(__dirname, '../src/transcript-format.js'), 'utf8');
  const formatScript = html.indexOf('src="transcript-format.js"');
  const appScript = html.indexOf('src="app.js"');

  assert.ok(formatScript >= 0 && formatScript < appScript);
  ['fillerCount', 'hesitationCount', 'vagueCount'].forEach((id) => assert.match(html, new RegExp(`id="${id}"[^>]*>0<`)));
  assert.match(source, /function renderTranscript\(text, fallback\)/);
  const block = (start, end) => {
    const startIndex = source.indexOf(start);
    return source.slice(startIndex, source.indexOf(end, startIndex + start.length));
  };
  assert.match(block('function renderUpdate', 'async function startRecording'), /scheduleTranscriptRender\(/);
  assert.match(source, /const TRANSCRIPT_RENDER_INTERVAL_MS = 250;/);
  assert.match(block('function renderTranscript', 'function toArray'), /clearTimeout\(transcriptRenderTimeout\)/);
  assert.doesNotMatch(source, /requestAnimationFrame|cancelAnimationFrame/);
  assert.match(block('async function startRecording', 'function normalizeReportItem'), /renderTranscript\('', '正在聆听…'\)/);
  assert.match(block('async function stopRecording', 'async function decodeAudioFile'), /renderTranscript\(result \? result\.transcript : ''/);
  const upload = block('async function analyzeUploadedFile', "byId('recordButton').onclick");
  assert.match(upload, /renderTranscript\('', '正在解码并识别音频…'\)/);
  assert.match(upload, /renderTranscript\(result \? result\.transcript : ''/);
  const paste = block("byId('analyzePaste').onclick", "byId('generateReportButton').onclick");
  assert.match(paste, /renderTranscript\(text, '正在整理文本'\)/);
  assert.match(paste, /renderTranscript\(\(result \? result\.transcript : ''\) \|\| text/);
  assert.match(block("byId('generateReportButton').onclick", 'async function loadHistory'), /renderTranscript\(result \? result\.transcript : ''/);
  assert.match(formatSource, /transcript-token filler/);
  assert.match(formatSource, /transcript-token hesitation/);
  assert.match(formatSource, /transcript-token vague/);
  assert.match(source, /window\.TranscriptFormat\.renderTranscriptHtml\(formatted\)/);
  assert.match(formatSource, /function renderTranscriptHtml/);
});

test('transcript scheduling renders only the latest throttled update', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/app.js'), 'utf8');
  const schedulerSource = source.slice(
    source.indexOf('const TRANSCRIPT_RENDER_INTERVAL_MS'),
    source.indexOf('function renderTranscript')
  );
  const timers = [];
  const rendered = [];
  const scheduler = vm.runInNewContext(`${schedulerSource}; ({ scheduleTranscriptRender, getState: () => ({ timeout: transcriptRenderTimeout, pending: pendingTranscriptRender }) })`, {
    setTimeout(callback, delay) { timers.push({ callback, delay }); return timers.length; },
    clearTimeout() {},
    renderTranscript(text, fallback) { rendered.push({ text, fallback }); }
  });

  scheduler.scheduleTranscriptRender('first', '等待');
  scheduler.scheduleTranscriptRender('latest', '等待');
  assert.equal(timers.length, 1);
  assert.equal(timers[0].delay, 250);
  assert.equal(scheduler.getState().pending.text, 'latest');
  timers[0].callback();
  assert.deepEqual(rendered, [{ text: 'latest', fallback: '等待' }]);
  assert.equal(scheduler.getState().timeout, null);
  assert.equal(scheduler.getState().pending, null);
});

test('report list normalizes malformed LLM list members before mapping', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/app.js'), 'utf8');
  const start = source.indexOf('function normalizeReportItem');
  const end = source.indexOf('function renderReport');
  const context = {};

  vm.runInNewContext(source.slice(start, end), context);
  [null, 'bad', 3].forEach((item) => assert.equal(Object.keys(context.normalizeReportItem(item)).length, 0));
  assert.match(source.slice(end, source.indexOf('async function stopRecording')), /mapper\(normalizeReportItem\(item\)\)/);
});
