import Database from 'better-sqlite3';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const __dirname = dirname(fileURLToPath(import.meta.url));

// データベースファイルのパス（環境変数またはデフォルト）
const defaultDbPath = join(__dirname, '..', 'data', 'sticker.db');
const dbPath = process.env.DATABASE_PATH || defaultDbPath;

// データディレクトリが存在しない場合は作成
const dbDir = dirname(dbPath);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
  console.log('Created database directory:', dbDir);
}

// データベース接続
const db = new Database(dbPath);

// WALモードを有効化（パフォーマンス向上）
db.pragma('journal_mode = WAL');

// スキーマを適用
const schemaPath = join(__dirname, 'schema.sql');
const schema = readFileSync(schemaPath, 'utf-8');
db.exec(schema);

// 起動時にDB情報を明示的にログ出力
console.log('==================================================');
console.log('Database Configuration:');
console.log('  Path:', dbPath);
console.log('  Exists:', existsSync(dbPath));
const tableCount = db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'").get();
console.log('  Tables:', tableCount.count);
console.log('==================================================');

// マイグレーション: email_verified カラムの追加
const runMigrations = () => {
  try {
    // users テーブルに email_verified カラムがあるか確認
    const tableInfo = db.prepare("PRAGMA table_info(users)").all();
    const hasEmailVerified = tableInfo.some(col => col.name === 'email_verified');

    if (!hasEmailVerified) {
      console.log('Running migration: Add email verification columns...');

      // カラム追加
      db.exec(`
        ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0;
        ALTER TABLE users ADD COLUMN email_verified_at DATETIME;
      `);

      // 既存ユーザーは認証済みとしてマーク
      db.prepare(`
        UPDATE users SET email_verified = 1, email_verified_at = CURRENT_TIMESTAMP
        WHERE email_verified IS NULL OR email_verified = 0
      `).run();

      console.log('Migration complete: email verification columns added');
    }

    // email_verification_tokens テーブルがあるか確認
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const hasVerificationTable = tables.some(t => t.name === 'email_verification_tokens');

    if (!hasVerificationTable) {
      console.log('Running migration: Create email verification tokens table...');
      db.exec(`
        CREATE TABLE IF NOT EXISTS email_verification_tokens (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          token TEXT UNIQUE NOT NULL,
          expires_at DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_email_verification_user ON email_verification_tokens(user_id);
        CREATE INDEX IF NOT EXISTS idx_email_verification_token ON email_verification_tokens(token);
      `);
      console.log('Migration complete: email verification tokens table created');
    }

    // password_reset_tokens テーブルがあるか確認
    const hasResetTable = tables.some(t => t.name === 'password_reset_tokens');

    if (!hasResetTable) {
      console.log('Running migration: Create password reset tokens table...');
      db.exec(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          token TEXT UNIQUE NOT NULL,
          expires_at DATETIME NOT NULL,
          used_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id);
        CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token);
      `);
      console.log('Migration complete: password reset tokens table created');
    }
  } catch (error) {
    console.error('Migration error:', error);
  }
};

// マイグレーション実行
runMigrations();

// Admin自動作成（環境変数が設定されている場合）
const createAdminUser = async () => {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    return;
  }

  // 既存のadminユーザーをチェック
  const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
  if (existingAdmin) {
    console.log('Admin user already exists:', adminEmail);
    return;
  }

  // パスワードをハッシュ化
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const id = uuidv4();

  // Adminユーザーを作成
  db.prepare(`
    INSERT INTO users (id, email, password_hash, display_name, role)
    VALUES (?, ?, ?, ?, 'admin')
  `).run(id, adminEmail, passwordHash, 'Admin');

  console.log('Admin user created:', adminEmail);
};

// 非同期でAdmin作成を実行
createAdminUser().catch(err => {
  console.error('Failed to create admin user:', err);
});

export default db;
