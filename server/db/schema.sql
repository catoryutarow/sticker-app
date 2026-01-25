-- Users table for creator authentication
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'creator',
  display_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for email lookup
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- キットテーブル
CREATE TABLE IF NOT EXISTS kits (
  id TEXT PRIMARY KEY,
  kit_number TEXT UNIQUE NOT NULL,        -- '004', '005' など
  name TEXT NOT NULL,
  name_ja TEXT,
  description TEXT,
  color TEXT DEFAULT '#E0E0E0',
  musical_key TEXT DEFAULT 'Am',
  creator_id TEXT NOT NULL,
  status TEXT DEFAULT 'draft',            -- 'draft', 'published'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES users(id)
);

-- シールテーブル
CREATE TABLE IF NOT EXISTS stickers (
  id TEXT PRIMARY KEY,
  kit_id TEXT NOT NULL,
  sticker_number TEXT NOT NULL,           -- '001', '002' など
  full_id TEXT UNIQUE NOT NULL,           -- '004-001' 形式
  name TEXT NOT NULL,
  name_ja TEXT,
  color TEXT DEFAULT '#CCCCCC',
  is_percussion INTEGER DEFAULT 0,
  image_uploaded INTEGER DEFAULT 0,
  audio_uploaded INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (kit_id) REFERENCES kits(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_kits_creator ON kits(creator_id);
CREATE INDEX IF NOT EXISTS idx_stickers_kit ON stickers(kit_id);
