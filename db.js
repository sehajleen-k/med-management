const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'meds.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS meds (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    category    TEXT    NOT NULL CHECK(category IN ('morning', 'evening', 'as_needed')),
    instructions TEXT,
    active      INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS med_logs (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    med_id   INTEGER NOT NULL REFERENCES meds(id),
    taken_at TEXT    NOT NULL,
    date     TEXT    NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_med_logs_date ON med_logs(date);
`);

// Returns today's date string (YYYY-MM-DD) in Pacific time
function getPacificDate() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const p = {};
  for (const part of parts) p[part.type] = part.value;
  return `${p.year}-${p.month}-${p.day}`;
}

// Returns today's meds grouped by category with taken/pending status
function getStatus() {
  const today = getPacificDate();
  const meds = db.prepare('SELECT * FROM meds WHERE active = 1 ORDER BY id').all();
  const logs = db.prepare('SELECT * FROM med_logs WHERE date = ?').all(today);

  const logsByMedId = {};
  for (const log of logs) {
    // For as_needed, keep the most recent; for others one entry is enough
    if (!logsByMedId[log.med_id]) logsByMedId[log.med_id] = [];
    logsByMedId[log.med_id].push(log);
  }

  const result = { morning: [], evening: [], as_needed: [], date: today };

  for (const med of meds) {
    const medLogs = logsByMedId[med.id] || [];
    const taken = medLogs.length > 0;
    result[med.category].push({
      id: med.id,
      name: med.name,
      instructions: med.instructions,
      category: med.category,
      taken,
      taken_at: taken ? medLogs[medLogs.length - 1].taken_at : null,
      // for as_needed, surface all logs today
      logs_today: med.category === 'as_needed' ? medLogs : undefined,
    });
  }

  return result;
}

// Marks a med as taken. Prevents duplicate logs for scheduled meds.
function takeMed(med_id) {
  const today = getPacificDate();
  const med = db.prepare('SELECT * FROM meds WHERE id = ? AND active = 1').get(med_id);

  if (!med) return { success: false, error: 'Medication not found' };

  if (med.category !== 'as_needed') {
    const existing = db
      .prepare('SELECT * FROM med_logs WHERE med_id = ? AND date = ?')
      .get(med_id, today);
    if (existing) {
      return {
        success: false,
        error: 'Already logged today',
        already_taken: true,
        taken_at: existing.taken_at,
        med_name: med.name,
      };
    }
  }

  const taken_at = new Date().toISOString();
  db.prepare('INSERT INTO med_logs (med_id, taken_at, date) VALUES (?, ?, ?)').run(
    med_id,
    taken_at,
    today
  );

  return { success: true, med_name: med.name, taken_at };
}

// Returns recent log history, default last 7 days
function getHistory(days = 7) {
  // Compute cutoff date in PT
  const cutoffMs = Date.now() - (days - 1) * 24 * 60 * 60 * 1000;
  const cutoffParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(cutoffMs));
  const p = {};
  for (const part of cutoffParts) p[part.type] = part.value;
  const cutoffDate = `${p.year}-${p.month}-${p.day}`;

  return db
    .prepare(
      `SELECT ml.id, ml.taken_at, ml.date, m.name, m.category, m.instructions
       FROM med_logs ml
       JOIN meds m ON ml.med_id = m.id
       WHERE ml.date >= ?
       ORDER BY ml.taken_at DESC`
    )
    .all(cutoffDate);
}

function addMed(name, category, instructions) {
  const result = db
    .prepare('INSERT INTO meds (name, category, instructions) VALUES (?, ?, ?)')
    .run(name, category, instructions || null);
  return { id: result.lastInsertRowid, name, category, instructions };
}

function deleteMed(id) {
  const result = db.prepare('UPDATE meds SET active = 0 WHERE id = ?').run(id);
  return result.changes > 0;
}

module.exports = { db, getPacificDate, getStatus, takeMed, getHistory, addMed, deleteMed };
