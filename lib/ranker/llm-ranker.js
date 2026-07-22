const { rankCandidates } = require('./rule-ranker');

async function rankWithFallback(input, adapter, timeoutMs = 1500) {
  const fallback = { ...rankCandidates(input), sourceType: 'rules' };
  if (!adapter) return { ...fallback, source: fallback.source, candidates: fallback.candidates, sourceType: 'rules' };
  try {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs));
    // LLM 只能重排词库召回的候选，不能脱离词库随意造词。
    const rankingInput = { ...input, source: fallback.source, candidates: fallback.candidates };
    const result = await Promise.race([adapter.rank(rankingInput), timeout]);
    if (!result?.candidates) return fallback;
    const allowed = new Set(fallback.candidates.map((item) => item.word));
    const candidates = result.candidates.filter((item) => allowed.has(item.word)).slice(0, 3);
    return candidates.length ? { source: fallback.source, sentence: input.sentence, candidates, sourceType: 'llm' } : fallback;
  } catch {
    // 云端不可用时立即返回本地结果，录音流程不应被网络阻断。
    return { ...fallback, source: fallback.source || 'rules', candidates: fallback.candidates };
  }
}

module.exports = { rankWithFallback };
