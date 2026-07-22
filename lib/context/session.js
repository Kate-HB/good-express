class PracticeSession {
  constructor({ contextSize = 5 } = {}) {
    this.contextSize = contextSize;
    this.sentences = [];
    this.rawSentences = [];
    this.seenFinals = new Set();
    this.partial = '';
  }

  accept(event) {
    if (!event.isFinal) { this.partial = event.text; return { shouldAnalyze: false, sentence: event.text }; }
    const rawSentence = event.text.trim();
    const sentence = (event.cleanText || event.text).trim();
    this.partial = '';
    if (!sentence || this.seenFinals.has(sentence)) return { shouldAnalyze: false, sentence };
    this.seenFinals.add(sentence);
    this.sentences.push(sentence);
    this.rawSentences.push(rawSentence);
    return { shouldAnalyze: true, sentence, rawSentence, corrections: event.corrections || [], context: this.sentences.slice(-this.contextSize).join('') };
  }

  get transcript() { return this.sentences.join(''); }
  get rawTranscript() { return this.rawSentences.join(''); }
}

module.exports = { PracticeSession };
