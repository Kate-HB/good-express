const { computeStats } = require('../stats');
const { buildWeaknesses, explainCorrections } = require('./evidence');

function groupSuggestions(suggestions) {
  const groups = new Map();
  for (const suggestion of suggestions) {
    const candidates = (suggestion.candidates || []).filter((item) => item.rewritten && item.rewritten !== suggestion.sentence && item.rewritten.includes(item.word));
    const best = candidates[0];
    if (!suggestion.source || !best) continue;
    const key = `${suggestion.source}:${best.word}`;
    if (!groups.has(key)) groups.set(key, { ...suggestion, candidates, count: 0 });
    groups.get(key).count += 1;
  }
  return [...groups.values()];
}

function uniqueMatches(text, pattern) {
  return [...new Set(text.match(pattern) || [])];
}

function generateReport({ transcript, durationSeconds = 0, suggestions = [], emotionMatches = [], corrections = [] }) {
  const metrics = computeStats(transcript, durationSeconds);
  metrics.emotionWords = emotionMatches.length;
  const groupedSuggestions = groupSuggestions(suggestions);
  const evidence = transcript.match(/[^。！？!?]+[。！？!?]?/g) || [transcript];
  const first = evidence.find(Boolean)?.trim() || '本次练习';
  const last = [...evidence].reverse().find(Boolean)?.trim() || first;
  const strengths = suggestions.length ? '能够围绕主题持续表达，并提供了可进一步精确化的内容。' : '表达较自然，未出现需要强行替换的词语。';
  const directnessScore = Math.max(0, Math.min(100, 100 - metrics.fillers * 6 - metrics.hedges * 8 - metrics.vagueWords * 3));
  const score = Math.max(0, Math.min(100, Math.round(70 + directnessScore * 0.2 - metrics.fillers * 2 - metrics.vagueWords)));
  const fillerEvidence = uniqueMatches(transcript, /嗯|呃|额|那个|就是说/g);
  const hedgeEvidence = uniqueMatches(transcript, /可能|也许|大概|应该|我觉得|好像|似乎|或许|不一定|感觉/g);
  const hasExample = /例如|比如|举个例子|以.+为例/.test(transcript);
  return {
    score,
    positioning: metrics.fillers || metrics.hedges
      ? '核心内容可以识别，但填充或弱化表达影响了直接性。'
      : '表达较直接，下一步重点是增强证据和结构。',
    summary: `这段表达共 ${metrics.characters} 字，整体自然，下一步重点是提高用词精确度。`,
    highlights: [{ quote: first, comment: strengths }],
    weaknesses: buildWeaknesses({ transcript, suggestions: groupedSuggestions, metrics }),
    rewrites: groupedSuggestions.slice(0, 5).map((item) => ({ original: item.sentence, revised: item.candidates[0]?.rewritten || item.sentence, reason: item.count > 1 ? `${item.candidates[0]?.reason || '保持原句'}；同类问题共 ${item.count} 处。` : item.candidates[0]?.reason || '保持原句' })),
    vocabulary: groupedSuggestions.map((item) => ({ source: item.source, candidates: item.candidates.map((candidate) => candidate.word) })),
    metrics,
    corrections: explainCorrections(corrections),
    behaviorPatterns: {
      fillers: {
        summary: metrics.fillers ? `检测到 ${metrics.fillers} 个填充词，建议用短暂停顿替代。` : '未检测到明显填充词。',
        evidence: fillerEvidence
      },
      hedging: {
        summary: metrics.hedges ? `检测到 ${metrics.hedges} 处弱化表达，明确立场时可直接陈述。` : '未检测到明显弱化表达。',
        evidence: hedgeEvidence
      },
      directness: {
        score: directnessScore,
        summary: directnessScore >= 80 ? '表达较直接。' : '部分句子存在铺垫、填充或立场弱化。',
        evidence: evidence.slice(0, 2).map((item) => item.trim()).filter(Boolean)
      }
    },
    structureAnalysis: {
      hook: `开头是：“${first}”`,
      corePoint: `当前最先出现的核心信息是：“${first}”`,
      examples: hasExample ? '转写中包含明确的举例信号。' : '转写中未检测到明确的举例信号。',
      closing: `结尾是：“${last}”`
    },
    exercise: groupedSuggestions.length ? `下次练习时，只关注“${groupedSuggestions[0].source}”，每次先停顿半秒，再说出更具体的词。` : '下次连续表达 60 秒，并保留一个清楚的开头和结尾。'
  };
}

module.exports = { generateReport };
