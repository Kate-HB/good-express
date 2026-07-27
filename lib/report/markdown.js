function formatList(items = [], mapper) {
  const list = Array.isArray(items) ? items : items === undefined || items === null ? [] : [items];
  return list.length ? list.map((item) => `- ${mapper(item)}`).join('\n') : '- 无';
}

function formatEvidence(section = {}) {
  const evidenceItems = Array.isArray(section.evidence) ? section.evidence : section.evidence ? [section.evidence] : [];
  const evidence = evidenceItems.length
    ? `\n  - 证据：${evidenceItems.join('；')}`
    : '';
  return `${section.summary || '无'}${evidence}`;
}

function formatReportMarkdown({ transcript = '', report }) {
  const metrics = report.metrics || {};
  const behavior = report.behaviorPatterns;
  const structure = report.structureAnalysis;
  const score = Number.isFinite(report.score) ? `${report.score}/100` : '未评分';
  const behaviorSection = behavior ? `## 行为模式分析

- 填充词：${formatEvidence(behavior.fillers)}
- 弱化表达：${formatEvidence(behavior.hedging)}
- 直接性：${Number.isFinite(behavior.directness?.score) ? `${behavior.directness.score}/100；` : ''}${formatEvidence(behavior.directness)}
` : '';
  const structureSection = structure ? `## 说服力与结构

- 钩子：${structure.hook || '无'}
- 核心观点：${structure.corePoint || '无'}
- 例子：${structure.examples || '无'}
- 收尾：${structure.closing || '无'}
` : '';
  return `# 本次表达反馈

## 总评

**${score}** ${report.positioning || ''}

${report.summary || ''}

## 完整原文

${transcript || '无转写'}

## 亮点

${formatList(report.highlights, (item) => `${item.quote || ''}：${item.comment || ''}`)}

## 可以提升

${formatList(report.weaknesses, (item) => `${item.quote || ''}；证据：${item.evidence || ''}；改法：${item.action || ''}；改写：${item.revised || ''}`)}

## 句子改写

${formatList(report.rewrites, (item) => `${item.original || ''} -> ${item.revised || ''}；${item.reason || ''}`)}

## 用词精准度

${formatList(report.vocabulary, (item) => `${item.source || ''} -> ${(item.candidates || []).join(' / ')}`)}

${behaviorSection}
${structureSection}
## 数据

${metrics.durationSeconds || 0} 秒 · ${metrics.characters || 0} 字 · ${metrics.charactersPerMinute || 0} 字/分钟 · ${metrics.fillers || 0} 个填充词 · ${metrics.hedges || 0} 个弱化表达 · ${metrics.vagueWords || 0} 个模糊词 · ${metrics.emotionWords || 0} 个情绪词

## 下次练习

${report.exercise || ''}
`;
}

module.exports = { formatReportMarkdown };
