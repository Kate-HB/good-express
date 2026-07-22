class PracticeSession {
  constructor({ contextSize = 5 } = {}) {
    this.contextSize = contextSize;
    this.sentences = [];
    this.seenFinals = new Set();
    this.partial = '';
  }

  accept(event) {
    if (!event.isFinal) { this.partial = event.text; return { shouldAnalyze: false, sentence: event.text }; }
    const sentence = event.text.trim();
    this.partial = '';
    if (!sentence || this.seenFinals.has(sentence)) return { shouldAnalyze: false, sentence };
    this.seenFinals.add(sentence);
    this.sentences.push(sentence);
    return { shouldAnalyze: true, sentence, context: this.sentences.slice(-this.contextSize).join('') };
  }

  get transcript() { return this.sentences.join(''); }
}

module.exports = { PracticeSession };
