(function (root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.TranscriptFormat = api;
  }
}(typeof window === 'undefined' ? null : window, function () {
  const sentenceEndings = new Set(['。', '！', '？', '!', '?', '；', ';']);
  const maxLineLength = 80;
  const maxParagraphLines = 3;
  const earlyParagraphLength = 160;

  function splitSentences(text) {
    const sentences = [];
    let sentence = '';

    for (const character of Array.from(text)) {
      sentence += character;
      if (sentenceEndings.has(character)) {
        sentences.push(sentence);
        sentence = '';
      }
    }
    if (sentence) sentences.push(sentence);

    return sentences;
  }

  function sentenceToLines(sentence) {
    const characters = Array.from(sentence);
    const lines = [];
    for (let index = 0; index < characters.length; index += maxLineLength) {
      lines.push({
        text: characters.slice(index, index + maxLineLength).join(''),
        tokens: []
      });
    }
    return lines;
  }

  function formatTranscript(text) {
    const paragraphs = [];
    let paragraphSentences = [];
    let paragraphLength = 0;

    for (const sentence of splitSentences(text == null ? '' : String(text))) {
      const sentenceLength = Array.from(sentence).length;
      if (
        paragraphSentences.length === maxParagraphLines ||
        (paragraphSentences.length === 2 && paragraphLength + sentenceLength > earlyParagraphLength)
      ) {
        paragraphs.push(paragraphSentences.flatMap(sentenceToLines));
        paragraphSentences = [];
        paragraphLength = 0;
      }

      paragraphSentences.push(sentence);
      paragraphLength += sentenceLength;
    }
    if (paragraphSentences.length) {
      paragraphs.push(paragraphSentences.flatMap(sentenceToLines));
    }

    return { paragraphs: paragraphs };
  }

  return { formatTranscript: formatTranscript };
}));
