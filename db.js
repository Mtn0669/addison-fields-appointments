const sqlite = require('sqlite');
const path = require('path');
const { Database } = require('sqlite3');

const dbPath = path.join(__dirname, 'database.sqlite');
let db;

// Initialize database
async function initDb() {
  db = await sqlite.open({
    filename: dbPath,
    driver: Database
  });

  // Create tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      date_of_birth TEXT NOT NULL,
      id_number TEXT NOT NULL,
      id_type TEXT NOT NULL,
      is_admin INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS promo_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      discount_value INTEGER NOT NULL,
      discount_type TEXT DEFAULT 'percentage',
      expires_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      appointment_date TEXT NOT NULL,
      appointment_time TEXT NOT NULL,
      service_type TEXT NOT NULL,
      status TEXT DEFAULT 'scheduled',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS webcast_registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      webcast_date TEXT NOT NULL,
      registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      attendance_status TEXT DEFAULT 'registered',
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Insert sample promo codes
  try {
    await db.run(`INSERT OR IGNORE INTO promo_codes (code, discount_value, discount_type) VALUES (?, ?, ?)`,
      ['WELCOME10', 10, 'percentage']);
  } catch (e) { /* ignore if exists */ }

  try {
    await db.run(`INSERT OR IGNORE INTO promo_codes (code, discount_value, discount_type) VALUES (?, ?, ?)`,
      ['SAVE20', 20, 'percentage']);
  } catch (e) { /* ignore if exists */ }

  console.log('Database initialized');
  return db;
}

// Helper to ensure db is ready
async function ensureReady() {
  if (!db) {
    await initDb();
  }
  return db;
}

// Callback-compatible get
async function get(sql, params, callback) {
  await ensureReady();
  if (typeof callback === 'function') {
    try {
      const row = await db.get(sql, ...params);
      callback(null, row);
    } catch (err) {
      callback(err, null);
    }
  } else {
    return db.get(sql, ...params);
  }
}

// Callback-compatible all
async function all(sql, params, callback) {
  await ensureReady();
  if (typeof callback === 'function') {
    try {
      const rows = await db.all(sql, ...params);
      callback(null, rows);
    } catch (err) {
      callback(err, null);
    }
  } else {
    return db.all(sql, ...params);
  }
}

// Callback-compatible run
async function run(sql, params, callback) {
  await ensureReady();
  if (typeof callback === 'function') {
    try {
      const info = await db.run(sql, ...params);
      // Mimic sqlite3 where `this` in callback contains lastID and changes
      callback.call({ lastID: info.lastID, changes: info.changes }, null);
    } catch (err) {
      callback(err);
    }
  } else {
    return db.run(sql, ...params);
  }
}

// Initialize on module load
initDb().catch(console.error);

module.exports = { get, all, run };
