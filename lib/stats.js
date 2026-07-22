function computeStats(text, durationSeconds = 0) {
  const compact = text.replace(/\s/g, '');
  const count = (pattern) => (text.match(pattern) || []).length;
  return {
    characters: compact.length,
    durationSeconds,
    charactersPerMinute: durationSeconds ? Math.round(compact.length * 60 / durationSeconds) : 0,
    fillers: count(/嗯|呃|额|那个|就是说/g),
    vagueWords: count(/想要|觉得|很好|非常|东西|事情/g)
  };
}

module.exports = { computeStats };
