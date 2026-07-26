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

  function splitLines(text) {
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

    return sentences.flatMap(function (value) {
      const characters = Array.from(value);
      const lines = [];
      for (let index = 0; index < characters.length; index += maxLineLength) {
        lines.push(characters.slice(index, index + maxLineLength).join(''));
      }
      return lines;
    });
  }

  function formatTranscript(text) {
    const paragraphs = [];
    let paragraph = [];
    let paragraphLength = 0;

    for (const lineText of splitLines(text)) {
      if (
        paragraph.length === maxParagraphLines ||
        (paragraph.length === 2 && paragraphLength + lineText.length > earlyParagraphLength)
      ) {
        paragraphs.push(paragraph);
        paragraph = [];
        paragraphLength = 0;
      }

      paragraph.push({ text: lineText, tokens: [] });
      paragraphLength += lineText.length;
    }
    if (paragraph.length) paragraphs.push(paragraph);

    return { paragraphs: paragraphs };
  }

  return { formatTranscript: formatTranscript };
}));
