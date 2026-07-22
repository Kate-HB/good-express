const INTENTIONAL_REDUPLICATIONS = new Set([
  '人人', '看看', '试试', '慢慢', '好好', '常常', '刚刚', '渐渐', '仅仅',
  '天天', '年年', '处处', '个个', '偏偏', '轻轻', '稳稳', '清清', '明明'
]);

function cleanAsrText(rawText, { purpose = '' } = {}) {
  let cleanText = String(rawText || '').trim();
  const edits = [];
  const replace = (pattern, replacement, rule, confidence) => {
    cleanText = cleanText.replace(pattern, (matched, ...args) => {
      const offset = args.at(-2);
      const target = typeof replacement === 'function' ? replacement(matched, ...args) : replacement;
      if (target === matched) return matched;
      edits.push({ offset, original: matched, replacement: target, rule, confidence });
      return target;
    });
  };

  // 仅当句中已有行动顺序线索时，才把高频 ASR 同音重复“在在开始”修成“再开始”。
  if (purpose.includes('计划') || (cleanText.includes('先') && cleanText.includes('开始'))) {
    replace(/在在开始/g, '再开始', 'plan-homophone', 0.88);
  }
  replace(/([\p{Script=Han}])\1/gu, (pair, char) => INTENTIONAL_REDUPLICATIONS.has(pair) ? pair : char, 'duplicate-tail', 0.9);
  if (cleanText && !/[。！？!?]$/.test(cleanText)) {
    edits.push({ offset: cleanText.length, original: '', replacement: '。', rule: 'terminal-punctuation', confidence: 0.95 });
    cleanText += '。';
  }
  return { rawText: String(rawText || '').trim(), cleanText, edits };
}

module.exports = { cleanAsrText };
