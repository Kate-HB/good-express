const { generateReport } = require('./generator');

function buildLlmReportMessages({ transcript, metrics, suggestions = [], trainingGoal = '' }) {
  return [
    {
      role: 'system',
      content: `你是严格、具体、尊重证据的中文表达教练。输出严格 JSON，字段为 score, positioning, summary, highlights, weaknesses, rewrites, vocabulary, behaviorPatterns, structureAnalysis, exercise。
score 是 0-100 整数；positioning 是一句整体定位。
highlights 每项包含 quote/comment；weaknesses 每项包含 quote/evidence/impact/action/revised；rewrites 每项包含 original/revised/reason；vocabulary 每项包含 source/candidates。
behaviorPatterns 必须包含 fillers, hedging, directness；每项包含 summary/evidence，evidence 必须是字符串数组，directness 还包含 0-100 的 score。
structureAnalysis 必须包含 hook, corePoint, examples, closing。
exercise 只给一个最关键方向和可执行步骤。
所有判断必须引用输入原文或 metrics。输入来自 ASR，可能含识别乱码；不得把疑似 ASR 错误直接判定为口误、能力、心理或人格问题，不得编造姓名、事实、数字和时长，不得进行人格诊断。训练目标：${trainingGoal || '提高表达清晰度和用词准确度'}。`
    },
    { role: 'user', content: JSON.stringify({ transcript, metrics, suggestions }) }
  ];
}

function toStringArray(value) {
  if (Array.isArray(value)) return value.filter((item) => typeof item === 'string' && item.trim());
  return typeof value === 'string' && value.trim() ? [value.trim()] : [];
}

function mergeBehaviorSection(fallback, value) {
  if (!value || typeof value !== 'object') return fallback;
  return {
    ...fallback,
    ...value,
    summary: typeof value.summary === 'string' ? value.summary : fallback.summary,
    evidence: toStringArray(value.evidence)
  };
}

function mergeBehaviorPatterns(fallback, value) {
  if (!value || typeof value !== 'object') return fallback;
  return {
    fillers: mergeBehaviorSection(fallback.fillers, value.fillers),
    hedging: mergeBehaviorSection(fallback.hedging, value.hedging),
    directness: mergeBehaviorSection(fallback.directness, value.directness)
  };
}

async function generateFinalReport({ transcript, durationSeconds = 0, suggestions = [], emotionMatches = [], corrections = [], llm = null, trainingGoal = '' }) {
  const fallback = generateReport({ transcript, durationSeconds, suggestions, emotionMatches, corrections });
  if (!llm) return fallback;
  try {
    const result = await llm.complete(
      buildLlmReportMessages({ transcript, metrics: fallback.metrics, suggestions, trainingGoal }),
      { maxTokens: 8192 }
    );
    return {
      ...fallback,
      score: Number.isFinite(result.score) ? Math.max(0, Math.min(100, Math.round(result.score))) : fallback.score,
      positioning: typeof result.positioning === 'string' && result.positioning.trim() ? result.positioning : fallback.positioning,
      summary: result.summary || fallback.summary,
      highlights: Array.isArray(result.highlights) && result.highlights.length ? result.highlights : fallback.highlights,
      weaknesses: Array.isArray(result.weaknesses) && result.weaknesses.length ? result.weaknesses : fallback.weaknesses,
      rewrites: Array.isArray(result.rewrites) ? result.rewrites : fallback.rewrites,
      vocabulary: Array.isArray(result.vocabulary) ? result.vocabulary : fallback.vocabulary,
      behaviorPatterns: mergeBehaviorPatterns(fallback.behaviorPatterns, result.behaviorPatterns),
      structureAnalysis: result.structureAnalysis && typeof result.structureAnalysis === 'object'
        ? { ...fallback.structureAnalysis, ...result.structureAnalysis }
        : fallback.structureAnalysis,
      exercise: result.exercise || fallback.exercise,
      sourceType: 'llm-report'
    };
  } catch {
    return fallback;
  }
}

module.exports = { generateFinalReport, buildLlmReportMessages };
