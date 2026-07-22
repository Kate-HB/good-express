const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

function verifyArchive(file, manifest) {
  const errors = [];
  if (!fs.existsSync(file)) return { ok: false, errors: ['归档不存在'] };
  const bytes = fs.statSync(file).size;
  if (bytes !== manifest.archiveBytes) errors.push(`体积不符：${bytes}/${manifest.archiveBytes}`);
  const sha256 = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  if (sha256.toLowerCase() !== manifest.archiveSha256.toLowerCase()) errors.push('SHA-256 不符');
  return { ok: errors.length === 0, errors };
}

function verifyModelDirectory(modelDir, manifest) {
  const missing = !modelDir || !fs.existsSync(modelDir)
    ? [...manifest.requiredFiles]
    : manifest.requiredFiles.filter((name) => !fs.existsSync(path.join(modelDir, name)));
  return { ok: missing.length === 0, missing, modelDir };
}

module.exports = { verifyArchive, verifyModelDirectory };
