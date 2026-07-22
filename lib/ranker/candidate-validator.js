function validateSupplementCandidates({ sentence, source, localCandidates = [], dlutIndex = new Map() }, items = []) {
  const localWords = new Set(localCandidates.map((item) => item.word));
  const seen = new Set();
  const sourceEmotion = dlutIndex.get(source);
  return items.filter((item) => {
    if (!item || typeof item.word !== 'string' || !item.word.trim() || item.word === source) return false;
    if (localWords.has(item.word) || seen.has(item.word)) return false;
    if (!item.tone || !item.intensity || !item.reason || item.reason.length < 4) return false;
    if (!Number.isFinite(item.confidence) || item.confidence < 0.65) return false;
    if (item.rewritten !== sentence.replace(source, item.word) || !item.rewritten.includes(item.word)) return false;
    const candidateEmotion = dlutIndex.get(item.word);
    if (sourceEmotion && candidateEmotion) {
      if (sourceEmotion.partOfSpeech && candidateEmotion.partOfSpeech && sourceEmotion.partOfSpeech !== candidateEmotion.partOfSpeech) return false;
      if (sourceEmotion.polarity && candidateEmotion.polarity && sourceEmotion.polarity !== candidateEmotion.polarity) return false;
    }
    seen.add(item.word);
    return true;
  }).map((item) => ({ ...item, sourceType: 'llm-supplement' }));
}

module.exports = { validateSupplementCandidates };
