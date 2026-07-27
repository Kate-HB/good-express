const byId = (id) => document.getElementById(id);
const state = { phase: 'idle', recording: false, audioContext: null, stream: null, worklet: null, audioQueue: Promise.resolve(), flushResolve: null, startedAt: 0, timer: null };
let lastReportPayload = null;
const TRANSCRIPT_RENDER_INTERVAL_MS = 250;
let transcriptRenderTimeout = null;
let pendingTranscriptRender = null;
let lastTranscriptRenderKey = null;

function clearPendingReportUi() {
  byId('generateReportButton').hidden = true;
}

function showPendingReportUi() {
  byId('generateReportButton').hidden = false;
}

function escapeHtml(value = '') {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function scheduleTranscriptRender(text, fallback) {
  pendingTranscriptRender = { text, fallback };
  if (transcriptRenderTimeout !== null) return;
  transcriptRenderTimeout = setTimeout(() => {
    transcriptRenderTimeout = null;
    const pending = pendingTranscriptRender;
    pendingTranscriptRender = null;
    if (pending) renderTranscript(pending.text, pending.fallback);
  }, TRANSCRIPT_RENDER_INTERVAL_MS);
}

function renderTranscript(text, fallback) {
  if (transcriptRenderTimeout !== null) {
    clearTimeout(transcriptRenderTimeout);
    transcriptRenderTimeout = null;
    pendingTranscriptRender = null;
  }
  const transcript = byId('transcript');
  const source = String(text ?? '');
  const renderKey = JSON.stringify([source, fallback ?? '']);
  if (lastTranscriptRenderKey === renderKey) return;
  if (!source) {
    transcript.textContent = fallback;
    ['filler', 'hesitation', 'vague'].forEach((category) => { byId(`${category}Count`).textContent = '0'; });
    lastTranscriptRenderKey = renderKey;
    return;
  }

  const formatted = window.TranscriptFormat.formatTranscript(source);
  const counts = formatted?.counts || {};
  ['filler', 'hesitation', 'vague'].forEach((category) => { byId(`${category}Count`).textContent = String(counts[category] || 0); });
  transcript.innerHTML = window.TranscriptFormat.renderTranscriptHtml(formatted) || escapeHtml(source);
  lastTranscriptRenderKey = renderKey;
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  return value === undefined || value === null || value === '' ? [] : [value];
}

function renderSuggestion(suggestion) {
  if (!suggestion) return;
  byId('suggestions').innerHTML = suggestion.candidates.map((item) => `
    <article class="suggestion">
      <div class="word-line"><strong>${escapeHtml(item.word)}</strong><span class="tag">${escapeHtml(item.tone)}</span><span class="tag">${escapeHtml(item.intensity)}</span></div>
      <p>${escapeHtml(item.reason)}</p><p class="rewrite">${escapeHtml(item.rewritten)}</p>
    </article>`).join('');
}

function renderUpdate(update) {
  if (!update) return;
  scheduleTranscriptRender(`${update.transcript || ''}${update.partial || ''}`, '正在聆听…');
  byId('purpose').textContent = update.purpose.label;
  byId('purposeReason').textContent = update.purpose.reason;
  renderSuggestion(update.suggestion);
  if (update.realtimeFeedback) {
    const existing = [...byId('suggestions').querySelectorAll('.suggestion')].slice(0, 2).map((item) => item.outerHTML).join('');
    byId('suggestions').innerHTML = `<article class="suggestion"><p>${escapeHtml(update.realtimeFeedback)}</p></article>${existing}`;
  }
}

async function startRecording() {
  if (!['idle', 'error'].includes(state.phase)) return;
  state.phase = 'starting';
  clearPendingReportUi();
  renderTranscript('', '正在聆听…');
  byId('error').textContent = '';
  await window.trainer.start();
  state.stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
  state.audioContext = new AudioContext();
  await state.audioContext.audioWorklet.addModule('audio-capture-worklet.js');
  const source = state.audioContext.createMediaStreamSource(state.stream);
  state.worklet = new AudioWorkletNode(state.audioContext, 'capture-processor', { processorOptions: { targetRate: 16000, chunkSize: 1600 } });
  state.worklet.port.onmessage = (event) => {
    if (event.data.type === 'stopped') { state.flushResolve?.(); return; }
    if (event.data.type !== 'audio') return;
    state.audioQueue = state.audioQueue
      .then(() => window.trainer.audio(event.data.samples))
      .then(renderUpdate)
      .catch((error) => { state.phase = 'error'; byId('error').textContent = error.message; });
  };
  source.connect(state.worklet); state.worklet.connect(state.audioContext.destination);
  state.recording = true; state.startedAt = Date.now();
  state.phase = 'recording';
  byId('recordButton').classList.add('live'); byId('recordButton').querySelector('b').textContent = '结束录音';
  byId('statusDot').classList.add('live'); byId('status').textContent = '正在聆听';
  state.timer = setInterval(() => {
    const seconds = Math.floor((Date.now() - state.startedAt) / 1000);
    byId('timer').textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }, 500);
}

function normalizeReportItem(item) {
  return item && typeof item === 'object' && !Array.isArray(item) ? item : {};
}

function renderReport(report) {
  lastReportPayload = { report, transcript: byId('transcript').textContent };
  const list = (items, mapper) => `<ul>${toArray(items).map((item) => `<li>${mapper(normalizeReportItem(item))}</li>`).join('')}</ul>`;
  const metrics = report.metrics || {};
  let behaviorHtml = '';
  if (report.behaviorPatterns) {
    const behavior = report.behaviorPatterns;
    const evidence = (section) => toArray(section?.evidence).map(escapeHtml).join('、');
    behaviorHtml = `<article class="report-card wide"><h3>行为模式分析</h3>
      <p><b>填充词：</b>${escapeHtml(behavior.fillers?.summary || '')}${evidence(behavior.fillers) ? `<br>证据：${evidence(behavior.fillers)}` : ''}</p>
      <p><b>弱化表达：</b>${escapeHtml(behavior.hedging?.summary || '')}${evidence(behavior.hedging) ? `<br>证据：${evidence(behavior.hedging)}` : ''}</p>
      <p><b>直接性：</b>${Number.isFinite(behavior.directness?.score) ? `${behavior.directness.score}/100 · ` : ''}${escapeHtml(behavior.directness?.summary || '')}</p>
    </article>`;
  }
  let structureHtml = '';
  if (report.structureAnalysis) {
    const structure = report.structureAnalysis;
    structureHtml = `<article class="report-card wide"><h3>说服力与结构</h3>
      <p><b>钩子：</b>${escapeHtml(structure.hook || '')}</p><p><b>核心观点：</b>${escapeHtml(structure.corePoint || '')}</p>
      <p><b>例子：</b>${escapeHtml(structure.examples || '')}</p><p><b>收尾：</b>${escapeHtml(structure.closing || '')}</p>
    </article>`;
  }
  const score = Number.isFinite(report.score) ? `${report.score}/100 · ` : '';
  byId('report').innerHTML = `<div class="report-actions"><button id="closeReport" class="ghost">返回练习</button><button id="saveMarkdown" class="ghost">导出 Markdown</button></div><h2>本次表达反馈</h2><p><b>${score}${escapeHtml(report.positioning || '')}</b></p><p>${escapeHtml(report.summary || '')}</p><div class="report-grid">
    <article class="report-card"><h3>亮点</h3>${list(report.highlights, (x) => `<b>${escapeHtml(x.quote)}</b><br>${escapeHtml(x.comment)}`)}</article>
    <article class="report-card"><h3>可以提升</h3>${list(report.weaknesses, (x) => `<b>${escapeHtml(x.quote)}</b><br>证据：${escapeHtml(x.evidence)}<br>影响：${escapeHtml(x.impact)}<br>改法：${escapeHtml(x.action)}<br>改写：${escapeHtml(x.revised)}`)}</article>
    <article class="report-card wide"><h3>句子可以这样改</h3>${list(report.rewrites, (x) => `${escapeHtml(x.original)} → <b>${escapeHtml(x.revised)}</b><br>${escapeHtml(x.reason)}`)}</article>
    <article class="report-card"><h3>用词精准度</h3>${list(report.vocabulary, (x) => `${escapeHtml(x.source)} → ${toArray(x.candidates).map(escapeHtml).join(' / ')}`)}</article>
    ${behaviorHtml}${structureHtml}
    <article class="report-card"><h3>数据</h3><p>${metrics.durationSeconds || 0} 秒 · ${metrics.characters || 0} 字 · ${metrics.charactersPerMinute || 0} 字/分钟 · ${metrics.fillers || 0} 个填充词 · ${metrics.hedges || 0} 个弱化表达 · ${metrics.vagueWords || 0} 个模糊词 · ${metrics.emotionWords || 0} 个情绪词</p></article>
    <article class="report-card"><h3>下次只练这一点</h3><p>${escapeHtml(report.exercise)}</p></article></div>`;
  const reportElement = byId('report');
  reportElement.scrollTop = 0;
  reportElement.classList.remove('hidden');
  document.body.classList.add('report-open');
  byId('closeReport').onclick = () => {
    reportElement.classList.add('hidden');
    document.body.classList.remove('report-open');
  };
  byId('saveMarkdown').onclick = async () => { if (lastReportPayload) await window.trainer.saveReportMarkdown(lastReportPayload); };
}

async function stopRecording() {
  if (state.phase !== 'recording') return;
  state.phase = 'stopping';
  state.recording = false; clearInterval(state.timer);
  const flushed = new Promise((resolve) => { state.flushResolve = resolve; });
  state.worklet.port.postMessage('stop');
  await flushed; await state.audioQueue;
  state.worklet?.disconnect(); state.stream?.getTracks().forEach((track) => track.stop()); await state.audioContext?.close();
  const result = await window.trainer.stop();
  state.phase = 'idle'; state.flushResolve = null;
  byId('recordButton').classList.remove('live'); byId('recordButton').querySelector('b').textContent = '开始新练习';
  byId('statusDot').classList.remove('live'); byId('status').textContent = '转写已完成';
  renderTranscript(result ? result.transcript : '', '未识别到有效内容。');
  if (result?.canGenerateReport) showPendingReportUi();
}

async function decodeAudioFile(file) {
  const context = new AudioContext();
  try {
    const buffer = await context.decodeAudioData(await file.arrayBuffer());
    const samples = new Float32Array(buffer.length);
    for (let channelIndex = 0; channelIndex < buffer.numberOfChannels; channelIndex += 1) {
      const channel = buffer.getChannelData(channelIndex);
      for (let index = 0; index < channel.length; index += 1) samples[index] += channel[index] / buffer.numberOfChannels;
    }
    return { samples, sampleRate: buffer.sampleRate };
  } finally {
    await context.close();
  }
}

function resampleTo16kClient(samples, sampleRate) {
  if (sampleRate === 16000) return Float32Array.from(samples);
  if (sampleRate < 16000) throw new RangeError('采样率不得低于 16 kHz');
  const ratio = sampleRate / 16000;
  const output = new Float32Array(Math.floor(samples.length / ratio));
  for (let index = 0; index < output.length; index += 1) {
    const start = Math.floor(index * ratio);
    const end = Math.min(samples.length, Math.floor((index + 1) * ratio));
    let sum = 0;
    for (let cursor = start; cursor < end; cursor += 1) sum += samples[cursor];
    output[index] = sum / Math.max(1, end - start);
  }
  return output;
}

async function analyzeUploadedFile(file) {
  if (!['idle', 'error'].includes(state.phase)) return;
  state.phase = 'uploading';
  clearPendingReportUi();
  byId('error').textContent = '';
  byId('status').textContent = '正在分析音频';
  renderTranscript('', '正在解码并识别音频…');
  const { samples, sampleRate } = await decodeAudioFile(file);
  const pcm16k = resampleTo16kClient(samples, sampleRate);
  const chunkSize = 1600;
  await window.trainer.startUpload();
  for (let offset = 0; offset < pcm16k.length; offset += chunkSize) {
    const update = await window.trainer.uploadChunk(pcm16k.slice(offset, offset + chunkSize));
    renderUpdate(update);
  }
  const result = await window.trainer.stopUpload(file.name);
  renderTranscript(result ? result.transcript : '', '未识别到有效内容。');
  byId('status').textContent = '转写已完成';
  state.phase = 'idle';
  if (result?.canGenerateReport) showPendingReportUi();
}

byId('recordButton').onclick = async () => {
  try { if (state.phase === 'recording') await stopRecording(); else if (['idle', 'error'].includes(state.phase)) await startRecording(); }
  catch (error) { state.phase = 'error'; byId('error').textContent = error.message; state.recording = false; }
};
byId('uploadAudioButton').onclick = () => {
  if (['idle', 'error'].includes(state.phase)) byId('uploadAudioInput').click();
};
byId('uploadAudioInput').onchange = async (event) => {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  try { await analyzeUploadedFile(file); }
  catch (error) { state.phase = 'error'; byId('error').textContent = error.message; }
};
byId('settingsButton').onclick = async () => {
  const settings = await window.trainer.getSettings();
  ['modelDir', 'llmProvider', 'llmBaseUrl', 'llmModel', 'trainingGoal'].forEach((key) => { byId(key).value = settings[key] || (key === 'llmProvider' ? 'none' : ''); });
  const modelStatus = await window.trainer.getModelStatus();
  byId('modelStatus').textContent = modelStatus.ok ? '模型完整，可离线识别。' : `模型不完整，缺少：${modelStatus.missing.join('、')}。运行 scripts/download-model.ps1 下载。`;
  byId('apiKey').value = ''; byId('settingsDialog').showModal();
};
function collectSettings() {
  const settings = { modelDir: byId('modelDir').value.trim(), llmProvider: byId('llmProvider').value, llmBaseUrl: byId('llmBaseUrl').value.trim(), llmModel: byId('llmModel').value.trim(), trainingGoal: byId('trainingGoal').value.trim() };
  if (byId('apiKey').value) settings.apiKey = byId('apiKey').value;
  return settings;
}
const providerDefaults = {
  deepseek: { llmBaseUrl: 'https://api.deepseek.com/v1', llmModel: 'deepseek-chat' },
  openai: { llmBaseUrl: 'https://api.openai.com/v1', llmModel: 'gpt-4o-mini' },
  ollama: { llmBaseUrl: 'http://127.0.0.1:11434/v1', llmModel: 'qwen2.5:7b' }
};
byId('llmProvider').onchange = () => {
  const preset = providerDefaults[byId('llmProvider').value];
  if (!preset) return;
  byId('llmBaseUrl').value = preset.llmBaseUrl;
  byId('llmModel').value = preset.llmModel;
};
byId('pasteButton').onclick = () => {
  byId('pasteText').value = '';
  byId('pasteDialog').showModal();
};
byId('analyzePaste').onclick = async (event) => {
  event.preventDefault();
  const text = byId('pasteText').value.trim();
  if (!text) return;
  byId('pasteDialog').close();
  state.phase = 'text';
  clearPendingReportUi();
  byId('status').textContent = '正在整理文本';
  renderTranscript(text, '正在整理文本');
  try {
    const result = await window.trainer.analyzeText(text);
    state.phase = 'idle';
    byId('status').textContent = '转写已完成';
    byId('purpose').textContent = '文本分析';
    byId('purposeReason').textContent = '已整理粘贴文本';
    renderTranscript((result ? result.transcript : '') || text, '未识别到有效内容。');
    if (result?.canGenerateReport) showPendingReportUi();
  } catch (error) {
    state.phase = 'error';
    byId('error').textContent = error.message;
  }
};
byId('generateReportButton').onclick = async () => {
  const button = byId('generateReportButton');
  button.disabled = true;
  byId('error').textContent = '';
  byId('status').textContent = '正在生成报告';
  try {
    const result = await window.trainer.generateReport();
    clearPendingReportUi();
    byId('status').textContent = '报告已生成';
    renderTranscript(result ? result.transcript : '', '未识别到有效内容。');
    renderReport(result.report);
  } catch (error) {
    byId('status').textContent = '报告生成失败，可重试';
    byId('error').textContent = error.message;
  } finally {
    button.disabled = false;
  }
};
async function loadHistory(query = '') {
  const items = await window.trainer.listHistory(query);
  byId('historyList').innerHTML = items.length ? items.map((item) => `<article class="history-item" data-id="${item.id}"><div><time>${escapeHtml(new Date(item.createdAt).toLocaleString())}</time><p>${escapeHtml((item.transcript || '').slice(0, 80) || '无转写')}</p><small>${escapeHtml(item.summary)}</small></div><button class="delete-history" data-id="${item.id}">删除</button></article>`).join('') : '<div class="history-empty">暂无练习记录</div>';
  byId('historyList').querySelectorAll('.history-item').forEach((element) => { element.onclick = async () => { const record = await window.trainer.getHistory(element.dataset.id); if (record?.report) { byId('historyDialog').close(); renderReport(record.report); } }; });
  byId('historyList').querySelectorAll('.delete-history').forEach((button) => { button.onclick = async (event) => { event.stopPropagation(); if (confirm('确认删除这次练习？')) { await window.trainer.removeHistory(button.dataset.id); await loadHistory(byId('historySearch').value); } }; });
}
byId('historyButton').onclick = async () => { byId('historyDialog').showModal(); await loadHistory(); };
byId('closeHistory').onclick = () => byId('historyDialog').close();
byId('historySearch').oninput = () => loadHistory(byId('historySearch').value);
byId('clearHistory').onclick = async () => { if (confirm('确认清空全部练习历史？此操作不可撤销。')) { await window.trainer.clearHistory(); await loadHistory(); } };
byId('chooseModel').onclick = async () => { const value = await window.trainer.chooseModel(); if (value) byId('modelDir').value = value; };
byId('downloadModel').onclick = async () => {
  const button = byId('downloadModel'); button.disabled = true;
  byId('modelStatus').textContent = '正在下载并校验 488 MB 离线模型，请保持网络连接…';
  try {
    const status = await window.trainer.downloadModel();
    byId('modelDir').value = status.modelDir; byId('modelStatus').textContent = '模型下载完成且校验通过。';
  } catch (error) { byId('modelStatus').textContent = error.message; }
  finally { button.disabled = false; }
};
byId('saveSettings').onclick = async (event) => {
  event.preventDefault();
  const old = await window.trainer.getSettings();
  const settings = { ...old, ...collectSettings() };
  await window.trainer.saveSettings(settings); byId('settingsDialog').close();
};
byId('testLlm').onclick = async () => {
  const button = byId('testLlm'); button.disabled = true; byId('llmStatus').textContent = '正在测试模型…';
  try {
    const result = await window.trainer.testLlm(collectSettings());
    byId('llmStatus').textContent = result.message || '模型连接成功。';
  } catch (error) {
    byId('llmStatus').textContent = error.message;
  } finally {
    button.disabled = false;
  }
};
