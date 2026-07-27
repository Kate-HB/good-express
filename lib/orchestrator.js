const { PracticeSession } = require('./context/session');
const { inferPurpose } = require('./context/purpose');
const { rankWithFallback } = require('./ranker/llm-ranker');
const { generateFinalReport } = require('./report/llm-report');
const { loadDlut, findEmotionWords, buildDlutIndex } = require('./lexicon/dlut');
const path = require('node:path');
const { cleanAsrText } = require('./asr/conservative-cleaner');
const { RealtimeFeedbackGate, requestRealtimeFeedback } = require('./feedback/realtime');

let defaultEmotionRows;
function getDefaultEmotionRows() {
  if (!defaultEmotionRows) defaultEmotionRows = loadDlut(path.join(__dirname, '../data/dlut-emotion-ontology.csv'));
  return defaultEmotionRows;
}

class PracticeOrchestrator {
  constructor({ asr, llm = null, rankTimeoutMs = 1500, emotionRows = null }) {
    this.asr = asr; this.llm = llm; this.rankTimeoutMs = rankTimeoutMs;
    this.emotionRows = emotionRows || getDefaultEmotionRows();
    this.dlutIndex = buildDlutIndex(this.emotionRows);
    this.session = new PracticeSession(); this.suggestions = []; this.emotionMatches = []; this.corrections = []; this.startedAt = 0;
    this.feedbackGate = new RealtimeFeedbackGate(30);
    this.finished = false;
    this.durationSeconds = 0;
  }
  async start() { this.startedAt = Date.now(); await this.asr.start(); }
  async acceptAudio(samples) {
    const asr = await this.asr.acceptAudio(samples);
    return this.processAsrEvent(asr);
  }
  async processAsrEvent(asr) {
    const preliminaryPurpose = inferPurpose(`${this.session.transcript}${asr.text}`);
    const cleaned = asr.isFinal ? cleanAsrText(asr.text, { purpose: preliminaryPurpose.label }) : { rawText: asr.text, cleanText: asr.text, edits: [] };
    const normalizedAsr = { ...asr, rawText: cleaned.rawText, cleanText: cleaned.cleanText, corrections: cleaned.edits };
    const accepted = this.session.accept(normalizedAsr);
    if (asr.isFinal && normalizedAsr.corrections.length) this.corrections.push(...normalizedAsr.corrections);
    const purpose = inferPurpose(this.session.transcript || normalizedAsr.cleanText);
    let emotions = [];
    let suggestion = null;
    let realtimeFeedback = '';
    if (accepted.shouldAnalyze && asr.confidence >= 0.55) {
      emotions = findEmotionWords(accepted.sentence, this.emotionRows);
      const seen = new Set(this.emotionMatches.map((item) => `${item.word}:${item.category}`));
      for (const item of emotions) if (!seen.has(`${item.word}:${item.category}`)) this.emotionMatches.push(item);
      suggestion = await rankWithFallback({ sentence: accepted.sentence, context: accepted.context, purpose: purpose.label, dlutIndex: this.dlutIndex }, this.llm, this.rankTimeoutMs);
      if (!suggestion.candidates.length) suggestion = null;
      else this.suggestions.push(suggestion);
    }
    if (accepted.shouldAnalyze && this.feedbackGate.claim(this.session.transcript)) {
      realtimeFeedback = await requestRealtimeFeedback({ transcript: this.session.transcript, llm: this.llm, timeoutMs: this.rankTimeoutMs });
    }
    return { asr: normalizedAsr, transcript: this.session.transcript, rawTranscript: this.session.rawTranscript, partial: this.session.partial, purpose, emotions, suggestion, realtimeFeedback };
  }
  async finish({ durationSeconds = null } = {}) {
    if (this.finished) {
      return { transcript: this.session.transcript, rawTranscript: this.session.rawTranscript, durationSeconds: this.durationSeconds };
    }
    const finalEvent = await this.asr.stop();
    // 用户点击停止时也要冲刷识别器，避免最后一句因没有足够静音而丢失。
    if (finalEvent?.text) await this.processAsrEvent(finalEvent);
    this.durationSeconds = Number.isFinite(durationSeconds) && durationSeconds >= 0
      ? durationSeconds
      : Math.max(1, (Date.now() - this.startedAt) / 1000);
    this.finished = true;
    return { transcript: this.session.transcript, rawTranscript: this.session.rawTranscript, durationSeconds: this.durationSeconds };
  }
  async generateReport({ trainingGoal = '' } = {}) {
    if (!this.finished) await this.finish();
    return generateFinalReport({ transcript: this.session.transcript, durationSeconds: this.durationSeconds, suggestions: this.suggestions, emotionMatches: this.emotionMatches, corrections: this.corrections, llm: this.llm, trainingGoal });
  }
  async stop({ trainingGoal = '', durationSeconds = null } = {}) {
    await this.finish({ durationSeconds });
    return this.generateReport({ trainingGoal });
  }
}

module.exports = { PracticeOrchestrator };
