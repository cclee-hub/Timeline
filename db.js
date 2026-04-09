// db.js
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'timeline.db');

let db = null;

async function getDb() {
  if (db) return db;
  const SQL = await initSqlJs();
  try {
    const buf = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buf);
  } catch {
    db = new SQL.Database();
    db.run(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE timelines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL DEFAULT '',
        items TEXT NOT NULL DEFAULT '[]',
        name TEXT NOT NULL DEFAULT '',
        site_domain TEXT NOT NULL DEFAULT '',
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);
  }

  // Migration: detect old table structure (user_id UNIQUE constraint, missing name/site_domain)
  const migrationNeeded = checkMigrationNeeded(db);
  if (migrationNeeded) {
    migrateToNewStructure(db);
  }

  return db;
}

function checkMigrationNeeded(database) {
  // Check if timelines table has the old structure by checking column existence
  // Old structure: no 'name' column. New structure: has 'name' column.
  try {
    const result = database.exec("PRAGMA table_info(timelines)");
    if (!result.length || !result[0].values.length) return false;
    const columns = result[0].values.map(row => row[1]);
    // If 'name' column exists, already migrated
    if (columns.includes('name')) return false;
    return true;
  } catch {
    return false;
  }
}

function migrateToNewStructure(database) {
  // Create new table without UNIQUE constraint, with name and site_domain columns
  database.run(`
    CREATE TABLE timelines_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      items TEXT NOT NULL DEFAULT '[]',
      name TEXT NOT NULL DEFAULT '',
      site_domain TEXT NOT NULL DEFAULT '',
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Migrate data: name = title
  database.run(`
    INSERT INTO timelines_new (id, user_id, title, items, name, site_domain, updated_at)
    SELECT id, user_id, title, items, title, '', COALESCE(updated_at, datetime('now'))
    FROM timelines
  `);

  // Drop old table and rename new table
  database.run('DROP TABLE timelines');
  database.run('ALTER TABLE timelines_new RENAME TO timelines');

  // Persist the migrated database
  saveDb();
}

function saveDb() {
  if (!db) return;
  const data = db.export();
  const buf = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buf);
}

module.exports = { getDb, saveDb };
