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
  const categories = [
    { name: 'filler', words: ['就是说', '那个', '就是', '嗯', '呃', '额', '啊', '呢'] },
    { name: 'hesitation', words: ['不一定', '我觉得', '可能', '也许', '大概', '应该', '好像', '似乎', '或许', '感觉'] },
    { name: 'vague', words: ['想要', '觉得', '很好', '非常', '东西', '事情', '这个'] }
  ];
  const matchers = categories.flatMap(function (category, categoryIndex) {
    return category.words.map(function (word) {
      return { text: word, category: category.name, categoryIndex: categoryIndex };
    });
  }).sort(function (left, right) {
    return Array.from(right.text).length - Array.from(left.text).length ||
      left.categoryIndex - right.categoryIndex;
  });

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

  function tokenize(text, counts) {
    const characters = Array.from(text);
    const tokens = [];

    for (let index = 0; index < characters.length;) {
      const match = matchers.find(function (candidate) {
        const candidateCharacters = Array.from(candidate.text);
        return candidateCharacters.every(function (character, offset) {
          return characters[index + offset] === character;
        });
      });

      if (match) {
        tokens.push({ text: match.text, category: match.category });
        counts[match.category] += 1;
        index += Array.from(match.text).length;
        continue;
      }

      const previous = tokens[tokens.length - 1];
      if (previous && previous.category === null) {
        previous.text += characters[index];
      } else {
        tokens.push({ text: characters[index], category: null });
      }
      index += 1;
    }

    return tokens;
  }

  function lineTokens(tokens, start, end) {
    const line = [];
    let position = 0;

    for (const token of tokens) {
      const tokenCharacters = Array.from(token.text);
      const tokenEnd = position + tokenCharacters.length;
      const sliceStart = Math.max(start - position, 0);
      const sliceEnd = Math.min(end - position, tokenCharacters.length);
      if (sliceStart < sliceEnd && tokenEnd > start && position < end) {
        line.push({
          text: tokenCharacters.slice(sliceStart, sliceEnd).join(''),
          category: token.category
        });
      }
      position = tokenEnd;
      if (position >= end) break;
    }

    return line;
  }

  function sentenceToLines(sentence, counts) {
    const characters = Array.from(sentence);
    const tokens = tokenize(sentence, counts);
    const lines = [];
    for (let index = 0; index < characters.length; index += maxLineLength) {
      lines.push({
        text: characters.slice(index, index + maxLineLength).join(''),
        tokens: lineTokens(tokens, index, index + maxLineLength)
      });
    }
    return lines;
  }

  function formatTranscript(text) {
    const paragraphs = [];
    const counts = { filler: 0, hesitation: 0, vague: 0 };
    let paragraphSentences = [];
    let paragraphLength = 0;

    for (const sentence of splitSentences(text == null ? '' : String(text))) {
      const sentenceLength = Array.from(sentence).length;
      if (
        paragraphSentences.length === maxParagraphLines ||
        (paragraphSentences.length === 2 && paragraphLength + sentenceLength > earlyParagraphLength)
      ) {
        paragraphs.push(paragraphSentences.flatMap(function (sentence) {
          return sentenceToLines(sentence, counts);
        }));
        paragraphSentences = [];
        paragraphLength = 0;
      }

      paragraphSentences.push(sentence);
      paragraphLength += sentenceLength;
    }
    if (paragraphSentences.length) {
      paragraphs.push(paragraphSentences.flatMap(function (sentence) {
        return sentenceToLines(sentence, counts);
      }));
    }

    return { paragraphs: paragraphs, counts: counts };
  }

  return { formatTranscript: formatTranscript };
}));
