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
  const highlightClasses = {
    filler: 'transcript-token filler',
    hesitation: 'transcript-token hesitation',
    vague: 'transcript-token vague'
  };
  const categories = [
    { name: 'filler', words: ['就是说', '那个', '就是', '嗯', '呃', '额', '啊', '呢'] },
    { name: 'hesitation', words: ['不一定', '我觉得', '可能', '也许', '大概', '应该', '好像', '似乎', '或许', '感觉'] },
    { name: 'vague', words: ['想要', '觉得', '很好', '非常', '东西', '事情', '这个'] }
  ];
  const clauseStartCharacters = new Set(Array.from('我你他她它这那可但就还也因所如会能应要想觉'));
  const fillerLeftContexts = ['这个', '那个', '然后', '但是', '就是', '所以', '其实', '那么']
    .map(function (text) {
      return Array.from(text);
    });
  const protectedTerms = [
    '粗花呢', '呃逆', '呢喃', '呢绒', '毛呢', '花呢',
    '额度', '金额', '额外', '额头', '额定', '余额', '名额', '数额', '配额',
    '超额', '全额', '面额', '前额', '额叶', '额骨'
  ].map(function (text) {
    return { text: text, characters: Array.from(text) };
  }).sort(function (left, right) {
    return right.characters.length - left.characters.length;
  });
  const matchers = categories.flatMap(function (category, categoryIndex) {
    return category.words.map(function (word) {
      return {
        text: word,
        characters: Array.from(word),
        category: category.name,
        categoryIndex: categoryIndex
      };
    });
  }).sort(function (left, right) {
    return right.characters.length - left.characters.length ||
      left.categoryIndex - right.categoryIndex;
  });

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character];
    });
  }

  function renderTranscriptHtml(formatted) {
    const paragraphs = Array.isArray(formatted?.paragraphs) ? formatted.paragraphs : [];
    return paragraphs.map(function (paragraph) {
      if (!Array.isArray(paragraph)) return '';
      const lines = paragraph.map(function (line) {
        const tokens = Array.isArray(line?.tokens) ? line.tokens : [];
        return tokens.map(function (token) {
          const text = token && typeof token === 'object' ? token.text : '';
          const category = token && typeof token === 'object' && highlightClasses[token.category] ? token.category : '';
          const content = escapeHtml(text);
          return category ? `<span class="${highlightClasses[category]}">${content}</span>` : content;
        }).join('');
      }).filter(Boolean);
      return lines.length ? `<p>${lines.join('<br>')}</p>` : '';
    }).filter(Boolean).join('');
  }

  function splitSentences(text) {
    const sentences = [];
    let sentence = '';
    let hasEnding = false;

    for (const character of Array.from(text)) {
      if (hasEnding && !sentenceEndings.has(character)) {
        sentences.push(sentence);
        sentence = '';
        hasEnding = false;
      }
      sentence += character;
      if (sentenceEndings.has(character)) {
        hasEnding = true;
      }
    }
    if (sentence) sentences.push(sentence);

    return sentences;
  }

  function isBoundaryCharacter(character) {
    return character === undefined || /[\s\p{P}\p{S}]/u.test(character);
  }

  function hasFillerLeftContext(index, characters) {
    return fillerLeftContexts.some(function (context) {
      const start = index - context.length;
      return start >= 0 && context.every(function (character, offset) {
        return characters[start + offset] === character;
      });
    });
  }

  function isStandaloneSingleCharacter(candidate, index, characters) {
    const previous = characters[index - 1];
    const next = characters[index + 1];

    if (candidate === '额') {
      const hasLeftBoundary = isBoundaryCharacter(previous) ||
        hasFillerLeftContext(index, characters);
      const hasRightBoundary = isBoundaryCharacter(next) ||
        clauseStartCharacters.has(next);
      return hasLeftBoundary && hasRightBoundary;
    }
    if (candidate === '呢') {
      if (next === '喃' || next === '绒' || next === '子' || previous === '毛') {
        return false;
      }
      const isolatedFabricWord = previous === '花' &&
        isBoundaryCharacter(characters[index - 2]) &&
        isBoundaryCharacter(next);
      return !isolatedFabricWord &&
        (isBoundaryCharacter(next) || clauseStartCharacters.has(next));
    }
    return true;
  }

  function appendPlainText(tokens, text) {
    const previous = tokens[tokens.length - 1];
    if (previous && previous.category === null) {
      previous.text += text;
    } else {
      tokens.push({ text: text, category: null });
    }
  }

  function tokenize(text, counts) {
    const characters = Array.from(text);
    const tokens = [];

    for (let index = 0; index < characters.length;) {
      const protectedTerm = protectedTerms.find(function (term) {
        if (characters[index] !== term.characters[0]) {
          return false;
        }
        if (term.text === '花呢' && !isBoundaryCharacter(characters[index - 1])) {
          return false;
        }
        return term.characters.every(function (character, offset) {
          return characters[index + offset] === character;
        });
      });
      if (protectedTerm) {
        appendPlainText(tokens, protectedTerm.text);
        index += protectedTerm.characters.length;
        continue;
      }

      const match = matchers.find(function (candidate) {
        const candidateCharacters = candidate.characters;
        if (characters[index] !== candidateCharacters[0]) {
          return false;
        }
        const matchesText = candidateCharacters.every(function (character, offset) {
          return characters[index + offset] === character;
        });
        if (!matchesText) {
          return false;
        }
        return candidateCharacters.length > 1 ||
          isStandaloneSingleCharacter(candidate.text, index, characters);
      });

      if (match) {
        tokens.push({ text: match.text, category: match.category });
        counts[match.category] += 1;
        index += match.characters.length;
        continue;
      }

      appendPlainText(tokens, characters[index]);
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

  return { formatTranscript: formatTranscript, renderTranscriptHtml: renderTranscriptHtml };
}));
