const { rankCandidates } = require('./rule-ranker');
const { validateSupplementCandidates } = require('./candidate-validator');

async function rankWithFallback(input, adapter, timeoutMs = 1500) {
  const { dlutIndex, ...publicInput } = input;
  const fallback = { ...rankCandidates(publicInput), sourceType: 'rules' };
  if (!adapter) return { ...fallback, source: fallback.source, candidates: fallback.candidates, sourceType: 'rules' };
  try {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs));
    // LLM 只能重排词库召回的候选，不能脱离词库随意造词。
    const rankingInput = { ...publicInput, source: fallback.source, candidates: fallback.candidates };
    const result = await Promise.race([adapter.rank(rankingInput), timeout]);
    if (!result?.candidates) return fallback;
    const localByWord = new Map(fallback.candidates.map((item) => [item.word, item]));
    const reordered = result.candidates.map((item) => localByWord.get(item.word)).filter(Boolean);
    const supplements = validateSupplementCandidates({ sentence: publicInput.sentence, source: fallback.source, localCandidates: fallback.candidates, dlutIndex }, result.candidates);
    const used = new Set([...reordered, ...supplements].map((item) => item.word));
    const candidates = [...reordered, ...supplements, ...fallback.candidates.filter((item) => !used.has(item.word))].slice(0, 3);
    return candidates.length ? { source: fallback.source, sentence: publicInput.sentence, candidates, sourceType: supplements.length ? 'hybrid' : 'llm' } : fallback;
  } catch {
    // 云端不可用时立即返回本地结果，录音流程不应被网络阻断。
    return { ...fallback, source: fallback.source || 'rules', candidates: fallback.candidates };
  }
}

module.exports = { rankWithFallback };
