const byId = (id) => document.getElementById(id);
const state = { recording: false, audioContext: null, stream: null, processor: null, startedAt: 0, timer: null };

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
  byId('error').textContent = '';
  await window.trainer.start();
  state.stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
  state.audioContext = new AudioContext();
  const source = state.audioContext.createMediaStreamSource(state.stream);
  state.processor = state.audioContext.createScriptProcessor(4096, 1, 1);
  source.connect(state.processor); state.processor.connect(state.audioContext.destination);
  let sending = false;
  state.processor.onaudioprocess = async (event) => {
    if (sending || !state.recording) return;
    sending = true;
    try {
      const samples = event.inputBuffer.getChannelData(0);
      // 重采样在主进程前完成，减少跨进程传输量。
      const ratio = state.audioContext.sampleRate / 16000;
      const output = new Float32Array(Math.floor(samples.length / ratio));
      for (let i = 0; i < output.length; i += 1) output[i] = samples[Math.floor(i * ratio)];
      renderUpdate(await window.trainer.audio(output));
    } catch (error) { byId('error').textContent = error.message; }
    finally { sending = false; }
  };
  state.recording = true; state.startedAt = Date.now();
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
    <article class="report-card"><h3>可以提升</h3>${list(report.weaknesses, (x) => `<b>${escapeHtml(x.quote)}</b><br>${escapeHtml(x.comment)}`)}</article>
    <article class="report-card wide"><h3>句子可以这样改</h3>${list(report.rewrites, (x) => `${escapeHtml(x.original)} → <b>${escapeHtml(x.revised)}</b><br>${escapeHtml(x.reason)}`)}</article>
    <article class="report-card"><h3>数据</h3><p>${report.metrics.characters} 字 · ${report.metrics.charactersPerMinute} 字/分钟 · ${report.metrics.fillers} 个填充词 · ${report.metrics.vagueWords} 个模糊词 · ${report.metrics.emotionWords} 个情绪词</p></article>
    <article class="report-card"><h3>下次只练这一点</h3><p>${escapeHtml(report.exercise)}</p></article></div>`;
  byId('report').classList.remove('hidden');
  byId('closeReport').onclick = () => byId('report').classList.add('hidden');
}

async function stopRecording() {
  state.recording = false; clearInterval(state.timer);
  state.processor?.disconnect(); state.stream?.getTracks().forEach((track) => track.stop()); await state.audioContext?.close();
  const result = await window.trainer.stop();
  byId('recordButton').classList.remove('live'); byId('recordButton').querySelector('b').textContent = '开始新练习';
  byId('statusDot').classList.remove('live'); byId('status').textContent = '报告已生成';
  if (result) renderReport(result.report);
}

byId('recordButton').onclick = async () => {
  try { if (state.recording) await stopRecording(); else await startRecording(); }
  catch (error) { byId('error').textContent = error.message; state.recording = false; }
};
byId('settingsButton').onclick = async () => {
  const settings = await window.trainer.getSettings();
  ['modelDir', 'llmProvider', 'llmBaseUrl', 'llmModel'].forEach((key) => { byId(key).value = settings[key] || (key === 'llmProvider' ? 'none' : ''); });
  byId('apiKey').value = ''; byId('settingsDialog').showModal();
};
byId('chooseModel').onclick = async () => { const value = await window.trainer.chooseModel(); if (value) byId('modelDir').value = value; };
byId('saveSettings').onclick = async (event) => {
  event.preventDefault();
  const old = await window.trainer.getSettings();
  const settings = { ...old, modelDir: byId('modelDir').value.trim(), llmProvider: byId('llmProvider').value, llmBaseUrl: byId('llmBaseUrl').value.trim(), llmModel: byId('llmModel').value.trim() };
  if (byId('apiKey').value) settings.apiKey = byId('apiKey').value;
  await window.trainer.saveSettings(settings); byId('settingsDialog').close();
};
