const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'songsync.db');
const db = new Database(dbPath);

// Enable WAL mode for high performance concurrent reads and writes
db.pragma('journal_mode = WAL');

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    password_hash TEXT,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    avatar TEXT,
    bio TEXT,
    streaming_platform TEXT DEFAULT 'spotify',
    spotify_access_token TEXT,
    spotify_refresh_token TEXT,
    is_guest INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS room_messages (
    id TEXT PRIMARY KEY,
    room_key TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_avatar TEXT,
    user_source TEXT,
    text TEXT NOT NULL,
    playback_timestamp INTEGER,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_room_messages_key ON room_messages(room_key, created_at);

  CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    user1_id TEXT NOT NULL,
    user2_id TEXT NOT NULL,
    song_title TEXT,
    song_artist TEXT,
    created_at INTEGER NOT NULL,
    UNIQUE(user1_id, user2_id)
  );

  CREATE TABLE IF NOT EXISTS direct_messages (
    id TEXT PRIMARY KEY,
    match_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_direct_messages_match ON direct_messages(match_id, created_at);

  CREATE TABLE IF NOT EXISTS listening_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    song_id TEXT NOT NULL,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    album_art TEXT,
    listened_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_listening_history_user ON listening_history(user_id, listened_at);
`);

console.log('✅ SQLite database initialized at:', dbPath);

module.exports = db;
