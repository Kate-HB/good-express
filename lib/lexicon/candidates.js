const precisionMap = require('../../data/precision-map.json');
const additions = require('../../data/precision-additions.json');

function normalizeCandidate(source, item) {
  return {
    tone: '中性明确', intensity: '中', formality: '通用',
    purposes: item.tags?.length ? item.tags : ['通用'],
    positiveExample: `在语义明确时，用“${item.word}”替换“${source}”。`,
    negativeExample: `语境不匹配时，不机械替换“${source}”。`,
    ...item,
    tags: item.tags || item.purposes || ['通用']
  };
}

function loadPrecisionMap() {
  const merged = { ...precisionMap, ...additions };
  return Object.fromEntries(Object.entries(merged).map(([source, items]) => [source, items.map((item) => normalizeCandidate(source, item))]));
}

const normalizedMap = loadPrecisionMap();

function recallCandidates(sentence) {
  const source = Object.keys(normalizedMap).find((word) => sentence.includes(word));
  if (!source) return null;
  return { source, sentence, candidates: normalizedMap[source].map((item) => ({ ...item })) };
}

function recallAllCandidates(sentence) {
  return Object.entries(normalizedMap)
    .flatMap(([source, candidates]) => {
      const matches = [];
      let offset = sentence.indexOf(source);
      while (offset !== -1) {
        matches.push({ source, sentence, offset, candidates: candidates.map((item) => ({ ...item })) });
        offset = sentence.indexOf(source, offset + source.length);
      }
      return matches;
    })
    .sort((a, b) => a.offset - b.offset || b.source.length - a.source.length);
}

module.exports = { loadPrecisionMap, recallCandidates, recallAllCandidates };
