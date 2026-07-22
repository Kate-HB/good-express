const { computeStats } = require('../stats');
const { buildWeaknesses, explainCorrections } = require('./evidence');

function generateReport({ transcript, durationSeconds = 0, suggestions = [], emotionMatches = [], corrections = [] }) {
  const metrics = computeStats(transcript, durationSeconds);
  metrics.emotionWords = emotionMatches.length;
  const evidence = transcript.match(/[^。！？!?]+[。！？!?]?/g) || [transcript];
  const first = evidence.find(Boolean)?.trim() || '本次练习';
  const strengths = suggestions.length ? '能够围绕主题持续表达，并提供了可进一步精确化的内容。' : '表达较自然，未出现需要强行替换的词语。';
  return {
    summary: `这段表达共 ${metrics.characters} 字，整体自然，下一步重点是提高用词精确度。`,
    highlights: [{ quote: first, comment: strengths }],
    weaknesses: buildWeaknesses({ transcript, suggestions, metrics }),
    rewrites: suggestions.map((item) => ({ original: item.sentence, revised: item.candidates[0]?.rewritten || item.sentence, reason: item.candidates[0]?.reason || '保持原句' })),
    vocabulary: suggestions.map((item) => ({ source: item.source, candidates: item.candidates.map((candidate) => candidate.word) })),
    metrics,
    corrections: explainCorrections(corrections),
    exercise: suggestions.length ? `下次练习时，只关注“${suggestions[0].source}”，每次先停顿半秒，再说出更具体的词。` : '下次连续表达 60 秒，并保留一个清楚的开头和结尾。'
  };
}

module.exports = { generateReport };
