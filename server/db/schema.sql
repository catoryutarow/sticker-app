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

-- ================================
-- タグシステム（2024-01 追加）
-- ================================

-- 固定タグテーブル（admin管理）
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,              -- 小文字正規化: 'ambient', 'lo-fi' など
  name_ja TEXT,                           -- 日本語名
  sort_order INTEGER DEFAULT 0,           -- 表示順
  usage_count INTEGER DEFAULT 0,          -- 使用数（非正規化）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- キット-タグ関連テーブル
CREATE TABLE IF NOT EXISTS kit_tags (
  id TEXT PRIMARY KEY,
  kit_id TEXT NOT NULL,
  tag_name TEXT NOT NULL,                 -- 小文字正規化されたタグ名
  is_custom INTEGER DEFAULT 0,            -- 0=固定タグ, 1=カスタムタグ
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (kit_id) REFERENCES kits(id) ON DELETE CASCADE,
  UNIQUE(kit_id, tag_name)                -- 同一キットに同じタグは1回のみ
);

-- タグ検索用インデックス
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_usage ON tags(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_kit_tags_kit ON kit_tags(kit_id);
CREATE INDEX IF NOT EXISTS idx_kit_tags_tag ON kit_tags(tag_name);
CREATE INDEX IF NOT EXISTS idx_kit_tags_custom ON kit_tags(is_custom);

-- ================================
-- 作品保存・共有システム（2024-01 追加）
-- ================================

-- 作品テーブル（シール配置の保存）
CREATE TABLE IF NOT EXISTS works (
  id TEXT PRIMARY KEY,
  share_id TEXT UNIQUE NOT NULL,           -- 短いID (nanoid 8文字) for URL sharing
  anonymous_id TEXT,                        -- 匿名ユーザーID (localStorage UUID)
  user_id TEXT REFERENCES users(id),       -- ログインユーザー (nullable)
  title TEXT DEFAULT '',
  stickers_json TEXT NOT NULL,             -- JSON配列: シール配置データ
  background_id TEXT DEFAULT 'default',
  aspect_ratio TEXT DEFAULT '3:4',          -- アスペクト比: '3:4'(モバイル), '1:1'(PC)
  video_url TEXT,                           -- エクスポート動画URL (nullable)
  thumbnail_url TEXT,                       -- OGP用サムネイル (nullable)
  view_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 作品検索用インデックス
CREATE INDEX IF NOT EXISTS idx_works_share_id ON works(share_id);
CREATE INDEX IF NOT EXISTS idx_works_anonymous_id ON works(anonymous_id);
CREATE INDEX IF NOT EXISTS idx_works_user_id ON works(user_id);
CREATE INDEX IF NOT EXISTS idx_works_created_at ON works(created_at DESC);
