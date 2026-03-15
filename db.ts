import Database from 'better-sqlite3';

const db = new Database('app.db');

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT UNIQUE NOT NULL,
    username TEXT,
    password TEXT,
    email TEXT UNIQUE,
    firebase_uid TEXT UNIQUE,
    balance REAL DEFAULT 0,
    device_id TEXT,
    install_time TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    number TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, win, lose
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL, -- deposit, withdraw
    amount REAL NOT NULL,
    method TEXT NOT NULL, -- kpay, wave
    proof_image TEXT, -- path to image or base64
    status TEXT DEFAULT 'pending', -- pending, approved, rejected
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Initialize default settings if not exists
const checkSettings = db.prepare("SELECT * FROM settings WHERE key = 'market_status'").get();
if (!checkSettings) {
  db.prepare("INSERT INTO settings (key, value) VALUES ('market_status', 'open')").run();
}

// Migrations
try {
  db.exec("ALTER TABLE users ADD COLUMN device_id TEXT");
} catch (e) {
  // Column might already exist
}

try {
  db.exec("ALTER TABLE users ADD COLUMN install_time TEXT");
} catch (e) {
  // Column might already exist
}

try {
  db.exec("ALTER TABLE users ADD COLUMN email TEXT UNIQUE");
} catch (e) {}

try {
  db.exec("ALTER TABLE users ADD COLUMN firebase_uid TEXT UNIQUE");
} catch (e) {}

try {
  db.exec("ALTER TABLE users ALTER COLUMN password DROP NOT NULL");
} catch (e) {
  // SQLite doesn't support DROP NOT NULL directly, but we can handle it in the schema for new DBs
}

export default db;
