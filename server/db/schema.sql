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
  musical_key TEXT DEFAULT 'random',
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
  -- レイアウト情報（シールパレット内の配置）
  layout_x REAL DEFAULT 10,               -- x座標（パーセント: 0-100）
  layout_y REAL DEFAULT 10,               -- y座標（パーセント: 0-100）
  layout_size INTEGER DEFAULT 80,         -- サイズ（ピクセル: 40-120）
  layout_rotation INTEGER DEFAULT 0,      -- 回転（度: -45 to 45）
  layout_count INTEGER DEFAULT 2,         -- 表示個数（1-4）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (kit_id) REFERENCES kits(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_kits_creator ON kits(creator_id);
CREATE INDEX IF NOT EXISTS idx_kits_status ON kits(status);
CREATE INDEX IF NOT EXISTS idx_kits_name ON kits(name);
CREATE INDEX IF NOT EXISTS idx_kits_created_at ON kits(created_at);
CREATE INDEX IF NOT EXISTS idx_stickers_kit ON stickers(kit_id);

-- シールレイアウトテーブル（各シールの配置インスタンス）
CREATE TABLE IF NOT EXISTS sticker_layouts (
  id TEXT PRIMARY KEY,
  sticker_id TEXT NOT NULL,
  x REAL DEFAULT 10,                       -- x座標（パーセント: 0-100）
  y REAL DEFAULT 10,                       -- y座標（パーセント: 0-100）
  size INTEGER DEFAULT 80,                 -- サイズ（ピクセル: 40-140）
  rotation INTEGER DEFAULT 0,              -- 回転（度: -45 to 45）
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sticker_id) REFERENCES stickers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sticker_layouts_sticker ON sticker_layouts(sticker_id);
