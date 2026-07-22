const PURPOSE_RULES = [
  { label: '说明计划', words: ['计划', '准备', '打算', '先', '再', '开始', '接下来'] },
  { label: '分享讲解', words: ['分享', '介绍', '方法', '步骤', '首先', '第一'] },
  { label: '表达观点', words: ['认为', '观点', '因为', '所以', '应该'] },
  { label: '讲述经历', words: ['昨天', '当时', '后来', '经历', '曾经'] },
  { label: '表达愿望', words: ['希望', '期待', '梦想', '未来', '想要'] },
  { label: '提出请求', words: ['请', '麻烦', '能否', '希望你'] }
];

function inferPurpose(text) {
  const scored = PURPOSE_RULES.map((rule) => ({ ...rule, hits: rule.words.filter((word) => text.includes(word)) }))
    .sort((a, b) => b.hits.length - a.hits.length);
  const best = scored[0];
  if (!best.hits.length) return { label: '自由表达', reason: '当前线索较少，将继续根据后文更新', confidence: 0.35 };
  return { label: best.label, reason: `检测到“${best.hits.join('、')}”等表达线索`, confidence: Math.min(0.95, 0.55 + best.hits.length * 0.1) };
}

module.exports = { inferPurpose };
