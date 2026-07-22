const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

class HistoryStore {
  constructor(root) { this.root = path.resolve(root); fs.mkdirSync(this.root, { recursive: true }); }
  fileFor(id) {
    if (!ID_PATTERN.test(id)) throw new Error('非法会话标识');
    return path.join(this.root, `${id}.json`);
  }
  save(payload) {
    const record = { ...payload, id: randomUUID(), createdAt: payload.createdAt || new Date().toISOString() };
    delete record.audioPath;
    fs.writeFileSync(this.fileFor(record.id), JSON.stringify(record, null, 2), 'utf8');
    return record;
  }
  list() {
    return fs.readdirSync(this.root, { withFileTypes: true })
      .filter((entry) => entry.isFile() && ID_PATTERN.test(path.basename(entry.name, '.json')))
      .map((entry) => { try { return JSON.parse(fs.readFileSync(path.join(this.root, entry.name), 'utf8')); } catch { return null; } })
      .filter(Boolean).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  search(query) {
    const keyword = String(query || '').trim().toLowerCase();
    return keyword ? this.list().filter((item) => `${item.transcript || ''}${item.report?.summary || ''}`.toLowerCase().includes(keyword)) : this.list();
  }
  get(id) { const file = this.fileFor(id); return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null; }
  remove(id) { const file = this.fileFor(id); if (!fs.existsSync(file)) return false; fs.unlinkSync(file); return true; }
  clear() { const records = this.list(); records.forEach((item) => this.remove(item.id)); return records.length; }
}

module.exports = { HistoryStore };
