const { computeStats } = require('../stats');

function generateReport({ transcript, durationSeconds = 0, suggestions = [], emotionMatches = [] }) {
  const metrics = computeStats(transcript, durationSeconds);
  metrics.emotionWords = emotionMatches.length;
  const evidence = transcript.match(/[^。！？!?]+[。！？!?]?/g) || [transcript];
  const first = evidence.find(Boolean)?.trim() || '本次练习';
  const strengths = suggestions.length ? '能够围绕主题持续表达，并提供了可进一步精确化的内容。' : '表达较自然，未出现需要强行替换的词语。';
  const weakness = metrics.fillers
    ? `“${first}”中出现停顿填充词，可能分散听众注意力。`
    : suggestions.length ? `“${suggestions[0].sentence}”中的“${suggestions[0].source}”较笼统，可进一步明确意图。` : '目前证据较少，建议延长下一次练习。';
  return {
    summary: `这段表达共 ${metrics.characters} 字，整体自然，下一步重点是提高用词精确度。`,
    highlights: [{ quote: first, comment: strengths }],
    weaknesses: [{ quote: first, comment: weakness }],
    rewrites: suggestions.map((item) => ({ original: item.sentence, revised: item.candidates[0]?.rewritten || item.sentence, reason: item.candidates[0]?.reason || '保持原句' })),
    vocabulary: suggestions.map((item) => ({ source: item.source, candidates: item.candidates.map((candidate) => candidate.word) })),
    metrics,
    exercise: suggestions.length ? `下次练习时，只关注“${suggestions[0].source}”，每次先停顿半秒，再说出更具体的词。` : '下次连续表达 60 秒，并保留一个清楚的开头和结尾。'
  };
}

module.exports = { generateReport };
