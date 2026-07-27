const test = require('node:test');
const assert = require('node:assert/strict');
const { generateFinalReport, buildLlmReportMessages } = require('../lib/report/llm-report');

test('final report uses LLM JSON when available', async () => {
  const llm = { complete: async () => ({
    score: 68,
    positioning: '观点明确，但铺垫偏长。',
    summary: 'LLM 深度报告',
    highlights: [{ quote: '原文', comment: '亮点' }],
    weaknesses: [],
    rewrites: [],
    vocabulary: [],
    behaviorPatterns: {
      fillers: { summary: '填充词较少', evidence: [] },
      hedging: { summary: '未发现明显弱化', evidence: [] },
      directness: { score: 70, summary: '多数句子直接', evidence: ['原文'] }
    },
    structureAnalysis: { hook: '开头直接', corePoint: '观点清楚', examples: '例子不足', closing: '缺少行动' },
    exercise: '练结论'
  }) };
  const report = await generateFinalReport({ transcript: '原文', durationSeconds: 10, llm });
  assert.equal(report.summary, 'LLM 深度报告');
  assert.equal(report.score, 68);
  assert.equal(report.behaviorPatterns.directness.score, 70);
  assert.equal(report.structureAnalysis.closing, '缺少行动');
  assert.equal(report.metrics.characters, 2);
});

test('LLM report prompt includes training goal', () => {
  const messages = buildLlmReportMessages({ transcript: '我要练习。', metrics: {}, suggestions: [], trainingGoal: '减少口头禅' });
  assert.match(messages[0].content, /减少口头禅/);
  assert.match(messages[0].content, /behaviorPatterns/);
  assert.match(messages[0].content, /structureAnalysis/);
  assert.match(messages[0].content, /ASR/);
  assert.match(messages[0].content, /不得.*人格/);
});

test('incomplete LLM report keeps deterministic deep-analysis fields', async () => {
  const llm = { complete: async () => ({ summary: '只返回总结' }) };
  const report = await generateFinalReport({ transcript: '嗯，我觉得这个事情很好。', durationSeconds: 10, llm });
  assert.equal(report.summary, '只返回总结');
  assert.equal(typeof report.behaviorPatterns.fillers.summary, 'string');
  assert.equal(typeof report.structureAnalysis.corePoint, 'string');
});

test('deep report requests enough output tokens for line-by-line analysis', async () => {
  let options;
  const llm = {
    complete: async (_messages, receivedOptions) => {
      options = receivedOptions;
      return {};
    }
  };
  await generateFinalReport({ transcript: '需要逐句分析的长文本。', durationSeconds: 10, llm });
  assert.equal(options.maxTokens, 8192);
});

test('normalizes model evidence strings and rejects non-array report lists', async () => {
  const llm = { complete: async () => ({
    highlights: '不是数组',
    behaviorPatterns: {
      fillers: { summary: '填充词偏多', evidence: '原文中的“嗯”' },
      hedging: { summary: '存在弱化', evidence: ['我觉得'] },
      directness: { score: 50, summary: '不够直接', evidence: null }
    }
  }) };
  const report = await generateFinalReport({ transcript: '嗯，我觉得可以。', durationSeconds: 5, llm });
  assert.ok(Array.isArray(report.highlights));
  assert.deepEqual(report.behaviorPatterns.fillers.evidence, ['原文中的“嗯”']);
  assert.deepEqual(report.behaviorPatterns.hedging.evidence, ['我觉得']);
  assert.deepEqual(report.behaviorPatterns.directness.evidence, []);
});
