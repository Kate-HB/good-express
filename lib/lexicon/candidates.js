const precisionMap = require('../../data/precision-map.json');

function recallCandidates(sentence) {
  const source = Object.keys(precisionMap).find((word) => sentence.includes(word));
  if (!source) return null;
  return { source, sentence, candidates: precisionMap[source].map((item) => ({ ...item })) };
}

module.exports = { recallCandidates };
