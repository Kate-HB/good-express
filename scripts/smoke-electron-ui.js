async function waitFor(check, timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const value = await check();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`等待界面状态超时：${timeoutMs} ms`);
}

async function main() {
  const port = process.argv[2] || '9223';
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = pages.find((item) => item.type === 'page' && item.url.includes('index.html'));
  if (!page) throw new Error('未找到 Electron 页面');
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let id = 0;
  const pending = new Map();
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message)); else resolve(message.result);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const callId = ++id;
    pending.set(callId, { resolve, reject });
    socket.send(JSON.stringify({ id: callId, method, params }));
  });
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  };

  await send('Runtime.enable');
  await waitFor(() => evaluate("document.readyState === 'complete'"));
  const title = await evaluate('document.title');
  if (process.argv.includes('--download-model')) {
    await evaluate("document.getElementById('settingsButton').click()");
    await waitFor(() => evaluate("document.getElementById('settingsDialog').open"));
    const ready = await evaluate("document.getElementById('modelStatus').textContent.includes('可离线识别')");
    if (!ready) {
      await evaluate("document.getElementById('downloadModel').click()");
      await waitFor(() => evaluate("document.getElementById('modelStatus').textContent.includes('校验通过')"), 120000);
    }
    await evaluate("document.getElementById('settingsDialog').close()");
  }
  await evaluate("document.getElementById('recordButton').click()");
  await waitFor(() => evaluate("document.getElementById('status').textContent.includes('正在聆听')"), 20000);
  // 假麦克风播放 5.6 秒真人 WAV，留足时间让 AudioWorklet 和 ASR 完成。
  await new Promise((resolve) => setTimeout(resolve, 7500));
  await evaluate("document.getElementById('recordButton').click()");
  await waitFor(() => evaluate("!document.getElementById('generateReportButton').hidden"), 30000);
  await evaluate("document.getElementById('generateReportButton').click()");
  await waitFor(() => evaluate("!document.getElementById('report').classList.contains('hidden')"), 30000);
  const result = await evaluate(`(() => ({
    error: document.getElementById('error').textContent,
    transcript: document.getElementById('transcript').textContent,
    reportTitle: document.querySelector('#report h2')?.textContent || '',
    reportTextLength: document.getElementById('report').textContent.length
  }))()`);
  await evaluate("document.getElementById('closeReport').click(); document.getElementById('historyButton').click()");
  await waitFor(() => evaluate("document.querySelectorAll('.history-item').length > 0"));
  result.historyItems = await evaluate("document.querySelectorAll('.history-item').length");
  socket.close();
  if (result.error || !result.transcript.trim() || !result.reportTitle || !result.historyItems) throw new Error(JSON.stringify(result));
  console.log(JSON.stringify({ title, ...result }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
