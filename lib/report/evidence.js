const CORRECTION_EXPLANATIONS = {
  'duplicate-tail': '删除 ASR 产生的异常重复字',
  'plan-homophone': '根据行动顺序修正常见同音识别',
  'terminal-punctuation': '根据终句信号补全句末标点'
};

function buildWeaknesses({ transcript, suggestions, metrics }) {
  const items = [];
  for (const suggestion of suggestions) {
    const best = suggestion.candidates[0];
    if (!best) continue;
    items.push({
      quote: suggestion.sentence,
      evidence: `“${suggestion.source}”未说明具体意图，候选排序首位为“${best.word}”${suggestion.count > 1 ? `，同类问题共 ${suggestion.count} 处` : ''}。`,
      impact: '听众需要结合上下文猜测，信息到达速度会变慢。',
      action: `把“${suggestion.source}”替换为能直接表达目的的“${best.word}”。`,
      revised: best.rewritten,
      comment: `影响：听众需要猜测。改法：${best.reason}`
    });
  }
  if (metrics.fillers > 0) {
    const quote = (transcript.match(/[^。！？!?]+[。！？!?]?/) || [transcript])[0];
    items.push({ quote, evidence: `检测到 ${metrics.fillers} 个填充词。`, impact: '频繁停顿会削弱句子重心。', action: '用短暂停顿替代“嗯、呃、那个”等填充词。', revised: quote.replace(/嗯|呃|额|那个|就是说/g, ''), comment: '用停顿替代填充词。' });
  }
  if (!items.length) {
    const quote = transcript || '本次表达';
    items.push({ quote, evidence: '当前有效样本较短。', impact: '证据不足时难以判断稳定的表达习惯。', action: '下一次连续表达至少 60 秒。', revised: quote, comment: '延长练习以获得更可靠反馈。' });
  }
  const seen = new Set();
  return items.filter((item) => !seen.has(item.quote) && seen.add(item.quote));
}

function explainCorrections(corrections) {
  return corrections.map((item) => ({ ...item, explanation: CORRECTION_EXPLANATIONS[item.rule] || '保守修正识别文本' }));
}

module.exports = { buildWeaknesses, explainCorrections };
