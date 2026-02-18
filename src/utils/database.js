const path = require('path');
const Database = require('better-sqlite3');
const config = require('../config');

const defaultPath = path.join(__dirname, '..', '..', 'giveaways.db');
const dbPath = config.dbPath
  ? path.join(config.dbPath, 'giveaways.db')
  : defaultPath;
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS giveaways (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    channel_message_id TEXT,
    eligible_role_ids TEXT,
    winner_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    ended_at TEXT
  );

  CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    giveaway_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    entered_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(giveaway_id, user_id),
    FOREIGN KEY (giveaway_id) REFERENCES giveaways(id)
  );
`);

function getActiveGiveaway() {
  return db.prepare('SELECT * FROM giveaways WHERE status = ?').get('active');
}

function createGiveaway(name, roleIds, messageId) {
  const stmt = db.prepare(
    'INSERT INTO giveaways (name, eligible_role_ids, channel_message_id) VALUES (?, ?, ?)',
  );
  const result = stmt.run(
    name,
    roleIds ? JSON.stringify(roleIds) : null,
    messageId || null,
  );
  return db.prepare('SELECT * FROM giveaways WHERE id = ?').get(result.lastInsertRowid);
}

function addEntry(giveawayId, userId) {
  const stmt = db.prepare(
    'INSERT OR IGNORE INTO entries (giveaway_id, user_id) VALUES (?, ?)',
  );
  const result = stmt.run(giveawayId, userId);
  return result.changes > 0;
}

function getEntries(giveawayId) {
  return db.prepare('SELECT * FROM entries WHERE giveaway_id = ?').all(giveawayId);
}

function endGiveaway(giveawayId, winnerId) {
  const stmt = db.prepare(
    "UPDATE giveaways SET status = 'ended', winner_id = ?, ended_at = datetime('now') WHERE id = ?",
  );
  stmt.run(winnerId || null, giveawayId);
}

module.exports = {
  getActiveGiveaway,
  createGiveaway,
  addEntry,
  getEntries,
  endGiveaway,
};
