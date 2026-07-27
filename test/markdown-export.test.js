const test = require('node:test');
const assert = require('node:assert/strict');
const { formatReportMarkdown } = require('../lib/report/markdown');

test('formats report as markdown with transcript and metrics', () => {
  const markdown = formatReportMarkdown({
    transcript: '我想要完成项目。',
    report: {
      score: 72,
      positioning: '观点明确，但需要更直接。',
      summary: '总结',
      highlights: [],
      weaknesses: [],
      rewrites: [],
      vocabulary: [{ source: '想要', candidates: ['打算'] }],
      behaviorPatterns: {
        fillers: { summary: '填充词较少', evidence: ['嗯'] },
        hedging: { summary: '存在弱化', evidence: ['我觉得'] },
        directness: { score: 75, summary: '多数句子直接', evidence: ['我想要完成项目。'] }
      },
      structureAnalysis: { hook: '开头直接', corePoint: '目标明确', examples: '缺少例子', closing: '结尾明确' },
      metrics: { durationSeconds: 4, characters: 8, charactersPerMinute: 120, fillers: 0, hedges: 1, vagueWords: 1, emotionWords: 0 },
      exercise: '练习'
    }
  });
  assert.match(markdown, /## 完整原文/);
  assert.match(markdown, /总结/);
  assert.match(markdown, /72\/100/);
  assert.match(markdown, /## 行为模式分析/);
  assert.match(markdown, /## 说服力与结构/);
  assert.match(markdown, /4 秒/);
  assert.match(markdown, /8 字/);
});

test('old reports without deep fields still export safely', () => {
  const markdown = formatReportMarkdown({
    transcript: '旧记录',
    report: { summary: '旧总结', highlights: [], weaknesses: [], rewrites: [], metrics: {} }
  });
  assert.match(markdown, /旧总结/);
  assert.match(markdown, /旧记录/);
});
