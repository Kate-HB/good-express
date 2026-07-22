const { PracticeSession } = require('./context/session');
const { inferPurpose } = require('./context/purpose');
const { rankWithFallback } = require('./ranker/llm-ranker');
const { generateReport } = require('./report/generator');
const { loadDlut, findEmotionWords, buildDlutIndex } = require('./lexicon/dlut');
const path = require('node:path');
const { cleanAsrText } = require('./asr/conservative-cleaner');

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
    this.session = new PracticeSession(); this.suggestions = []; this.emotionMatches = []; this.startedAt = 0;
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
    const purpose = inferPurpose(this.session.transcript || normalizedAsr.cleanText);
    let emotions = [];
    let suggestion = null;
    if (accepted.shouldAnalyze && asr.confidence >= 0.55) {
      emotions = findEmotionWords(accepted.sentence, this.emotionRows);
      const seen = new Set(this.emotionMatches.map((item) => `${item.word}:${item.category}`));
      for (const item of emotions) if (!seen.has(`${item.word}:${item.category}`)) this.emotionMatches.push(item);
      suggestion = await rankWithFallback({ sentence: accepted.sentence, context: accepted.context, purpose: purpose.label, dlutIndex: this.dlutIndex }, this.llm, this.rankTimeoutMs);
      if (!suggestion.candidates.length) suggestion = null;
      else this.suggestions.push(suggestion);
    }
    return { asr: normalizedAsr, transcript: this.session.transcript, rawTranscript: this.session.rawTranscript, partial: this.session.partial, purpose, emotions, suggestion };
  }
  async stop() {
    const finalEvent = await this.asr.stop();
    // 用户点击停止时也要冲刷识别器，避免最后一句因没有足够静音而丢失。
    if (finalEvent?.text) await this.processAsrEvent(finalEvent);
    return generateReport({ transcript: this.session.transcript, durationSeconds: Math.max(1, (Date.now() - this.startedAt) / 1000), suggestions: this.suggestions, emotionMatches: this.emotionMatches });
  }
}

module.exports = { PracticeOrchestrator };
