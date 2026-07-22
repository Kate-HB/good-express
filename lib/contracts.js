function requireFields(value, fields, label) {
  if (!value || fields.some((field) => value[field] === undefined)) {
    throw new TypeError(`${label} 数据不完整`);
  }
}

function validateAsrEvent(event) {
  requireFields(event, ['text', 'isFinal', 'confidence', 'timestamp'], 'ASR');
  return true;
}

function validateSuggestion(suggestion) {
  requireFields(suggestion, ['source', 'sentence', 'candidates'], '建议');
  if (suggestion.candidates.length > 3) throw new RangeError('候选最多 3 个');
  suggestion.candidates.forEach((item) => requireFields(item, ['word', 'tone', 'intensity', 'reason', 'rewritten'], '候选'));
  return true;
}

module.exports = { validateAsrEvent, validateSuggestion };
