const { PracticeOrchestrator } = require('./orchestrator');
const { MockAsrAdapter } = require('./asr/mock');

function splitSentences(text) {
  return String(text || '').match(/[^。！？!?]+[。！？!?]?/g)?.map((item) => item.trim()).filter(Boolean) || [];
}

async function preparePastedText({ text, llm = null }) {
  if (!String(text || '').trim()) throw new Error('文本内容为空');
  const orchestrator = new PracticeOrchestrator({ asr: new MockAsrAdapter([]), llm });
  await orchestrator.start();
  for (const sentence of splitSentences(text)) {
    await orchestrator.processAsrEvent({ text: sentence, isFinal: true, confidence: 1, timestamp: Date.now() });
  }
  await orchestrator.finish({ durationSeconds: 0 });
  return {
    orchestrator,
    transcript: orchestrator.session.transcript,
    rawTranscript: orchestrator.session.rawTranscript
  };
}

async function analyzePastedText({ text, llm = null, trainingGoal = '', saveRecord }) {
  const prepared = await preparePastedText({ text, llm });
  const { orchestrator } = prepared;
  const report = await orchestrator.generateReport({ trainingGoal });
  const record = saveRecord({
    sourceType: 'text',
    startedAt: new Date().toISOString(),
    rawTranscript: orchestrator.session.rawTranscript,
    transcript: orchestrator.session.transcript,
    corrections: orchestrator.corrections,
    suggestions: orchestrator.suggestions,
    report
  });
  return { report, sessionId: record.id, transcript: orchestrator.session.transcript, rawTranscript: orchestrator.session.rawTranscript };
}

module.exports = { analyzePastedText, preparePastedText, splitSentences };
