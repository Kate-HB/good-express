const INTENTIONAL_REDUPLICATIONS = new Set([
  '人人', '看看', '试试', '慢慢', '好好', '常常', '刚刚', '渐渐', '仅仅',
  '天天', '年年', '处处', '个个', '偏偏', '轻轻', '稳稳', '清清', '明明'
]);

function collapseRepeatedPhrases(text, edits) {
  let cleanText = text;
  let index = 0;
  while (index < cleanText.length) {
    let collapsed = false;
    const maxUnitLength = Math.min(80, Math.floor((cleanText.length - index) / 2));
    for (let unitLength = maxUnitLength; unitLength >= 2; unitLength -= 1) {
      const unit = cleanText.slice(index, index + unitLength);
      if (!/\p{Script=Han}/u.test(unit) || /[。！？!?，,；;]/.test(unit) || INTENTIONAL_REDUPLICATIONS.has(unit)) continue;
      let repeatEnd = index + unitLength;
      while (cleanText.slice(repeatEnd, repeatEnd + unitLength) === unit) repeatEnd += unitLength;
      if (repeatEnd <= index + unitLength) continue;
      const original = cleanText.slice(index, repeatEnd);
      cleanText = `${cleanText.slice(0, index)}${unit}${cleanText.slice(repeatEnd)}`;
      edits.push({ offset: index, original, replacement: unit, rule: 'duplicate-phrase', confidence: 0.86 });
      collapsed = true;
      break;
    }
    if (!collapsed) index += 1;
  }
  return cleanText;
}

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
  cleanText = collapseRepeatedPhrases(cleanText, edits);
  replace(/([\p{Script=Han}])\1{2,}/gu, (_matched, char) => char, 'duplicate-tail', 0.9);
  // ICU 中文分词能识别“爸爸、谢谢、星星”等合法词；只压缩未被识别为完整词的双字。
  const segments = typeof Intl.Segmenter === 'function'
    ? [...new Intl.Segmenter('zh-CN', { granularity: 'word' }).segment(cleanText)]
    : [];
  replace(/([\p{Script=Han}])\1/gu, (pair, char, offset) => {
    const isKnownWord = segments.some((item) => item.index === offset && item.segment === pair && item.isWordLike);
    return isKnownWord || INTENTIONAL_REDUPLICATIONS.has(pair) ? pair : char;
  }, 'duplicate-tail', 0.9);
  if (cleanText && !/[。！？!?]$/.test(cleanText)) {
    edits.push({ offset: cleanText.length, original: '', replacement: '。', rule: 'terminal-punctuation', confidence: 0.95 });
    cleanText += '。';
  }
  return { rawText: String(rawText || '').trim(), cleanText, edits };
}

module.exports = { cleanAsrText, collapseRepeatedPhrases };
