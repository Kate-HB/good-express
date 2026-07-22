const { recallCandidates } = require('../lexicon/candidates');

const CONTEXT_HINTS = {
  希望: ['愿望', '未来', '目标', '考上', '成为'],
  期待: ['见面', '结果', '活动', '感受'],
  打算: ['计划', '步骤', '先', '再', '执行', '完成'],
  渴望: ['强烈', '梦想', '长期', '迫切']
};

function score(item, allText, purpose) {
  let value = 0;
  for (const hint of [...(CONTEXT_HINTS[item.word] || []), ...item.tags]) {
    if (allText.includes(hint)) value += 2;
  }
  if (purpose.includes('计划') && item.word === '打算') value += 5;
  if (purpose.includes('愿望') && item.word === '希望') value += 5;
  return value;
}

function rankCandidates({ sentence, context = '', purpose = '' }) {
  const recalled = recallCandidates(sentence);
  if (!recalled) return { source: null, sentence, candidates: [] };
  const allText = `${context}${sentence}${purpose}`;
  const candidates = recalled.candidates
    .map((item, index) => ({ ...item, _score: score(item, allText, purpose), _index: index }))
    .sort((a, b) => b._score - a._score || a._index - b._index)
    .slice(0, 3)
    .map(({ _score, _index, tags, ...item }) => ({ ...item, sourceType: 'local', confidence: Math.min(0.95, 0.72 + _score * 0.03), rewritten: sentence.replace(recalled.source, item.word) }));
  return { source: recalled.source, sentence, candidates };
}

module.exports = { rankCandidates };
