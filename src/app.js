const byId = (id) => document.getElementById(id);
const state = { phase: 'idle', recording: false, audioContext: null, stream: null, worklet: null, audioQueue: Promise.resolve(), flushResolve: null, startedAt: 0, timer: null };

function escapeHtml(value = '') {
  return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
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
  byId('transcript').textContent = `${update.transcript}${update.partial}` || '正在聆听…';
  byId('purpose').textContent = update.purpose.label;
  byId('purposeReason').textContent = update.purpose.reason;
  renderSuggestion(update.suggestion);
}

async function startRecording() {
  if (!['idle', 'error'].includes(state.phase)) return;
  state.phase = 'starting';
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
  byId('recordButton').classList.add('live'); byId('recordButton').querySelector('b').textContent = '结束并生成报告';
  byId('statusDot').classList.add('live'); byId('status').textContent = '正在聆听';
  state.timer = setInterval(() => {
    const seconds = Math.floor((Date.now() - state.startedAt) / 1000);
    byId('timer').textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }, 500);
}

function renderReport(report) {
  const list = (items, mapper) => `<ul>${items.map((item) => `<li>${mapper(item)}</li>`).join('')}</ul>`;
  byId('report').innerHTML = `<button id="closeReport" class="ghost">返回练习</button><h2>本次表达反馈</h2><p>${escapeHtml(report.summary)}</p><div class="report-grid">
    <article class="report-card"><h3>亮点</h3>${list(report.highlights, (x) => `<b>${escapeHtml(x.quote)}</b><br>${escapeHtml(x.comment)}`)}</article>
    <article class="report-card"><h3>可以提升</h3>${list(report.weaknesses, (x) => `<b>${escapeHtml(x.quote)}</b><br>证据：${escapeHtml(x.evidence)}<br>影响：${escapeHtml(x.impact)}<br>改法：${escapeHtml(x.action)}`)}</article>
    <article class="report-card wide"><h3>句子可以这样改</h3>${list(report.rewrites, (x) => `${escapeHtml(x.original)} → <b>${escapeHtml(x.revised)}</b><br>${escapeHtml(x.reason)}`)}</article>
    <article class="report-card"><h3>数据</h3><p>${report.metrics.characters} 字 · ${report.metrics.charactersPerMinute} 字/分钟 · ${report.metrics.fillers} 个填充词 · ${report.metrics.vagueWords} 个模糊词 · ${report.metrics.emotionWords} 个情绪词</p></article>
    <article class="report-card"><h3>下次只练这一点</h3><p>${escapeHtml(report.exercise)}</p></article></div>`;
  byId('report').classList.remove('hidden');
  byId('closeReport').onclick = () => byId('report').classList.add('hidden');
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
  byId('statusDot').classList.remove('live'); byId('status').textContent = '报告已生成';
  if (result) renderReport(result.report);
}

byId('recordButton').onclick = async () => {
  try { if (state.phase === 'recording') await stopRecording(); else if (['idle', 'error'].includes(state.phase)) await startRecording(); }
  catch (error) { state.phase = 'error'; byId('error').textContent = error.message; state.recording = false; }
};
byId('settingsButton').onclick = async () => {
  const settings = await window.trainer.getSettings();
  ['modelDir', 'llmProvider', 'llmBaseUrl', 'llmModel'].forEach((key) => { byId(key).value = settings[key] || (key === 'llmProvider' ? 'none' : ''); });
  byId('apiKey').value = ''; byId('settingsDialog').showModal();
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
byId('saveSettings').onclick = async (event) => {
  event.preventDefault();
  const old = await window.trainer.getSettings();
  const settings = { ...old, modelDir: byId('modelDir').value.trim(), llmProvider: byId('llmProvider').value, llmBaseUrl: byId('llmBaseUrl').value.trim(), llmModel: byId('llmModel').value.trim() };
  if (byId('apiKey').value) settings.apiKey = byId('apiKey').value;
  await window.trainer.saveSettings(settings); byId('settingsDialog').close();
};
