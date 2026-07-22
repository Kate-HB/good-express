const fs = require('node:fs');

function splitCsvLine(line) {
  const cells = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { cells.push(cell.trim()); cell = ''; }
    else cell += char;
  }
  cells.push(cell.trim());
  return cells;
}

function loadDlut(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    return {
      word: cells[0], partOfSpeech: cells[1], category: cells[4],
      intensity: Number(cells[5]), polarity: Number(cells[6]),
      auxiliaryCategory: cells[7] || ''
    };
  }).filter((row) => row.word);
}

function findEmotionWords(text, rows) {
  // 长词优先，避免“高兴”和“高兴得”同时造成重复命中。
  const matches = rows.filter((row) => text.includes(row.word)).sort((a, b) => b.word.length - a.word.length);
  return matches.filter((row, index) => !matches.slice(0, index).some((item) => item.word.includes(row.word)));
}

function buildDlutIndex(rows) {
  const index = new Map();
  for (const row of rows) {
    const current = index.get(row.word);
    if (!current || row.intensity > current.intensity) index.set(row.word, row);
  }
  return index;
}

module.exports = { loadDlut, findEmotionWords, buildDlutIndex };
