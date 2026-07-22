const fs = require('node:fs');
const path = require('node:path');

function saveSession(directory, payload) {
  fs.mkdirSync(directory, { recursive: true });
  const file = path.join(directory, `${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(file, JSON.stringify(payload, null, 2), 'utf8');
  return file;
}

module.exports = { saveSession };
