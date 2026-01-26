import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const __dirname = dirname(fileURLToPath(import.meta.url));

// データベースファイルのパス
const dbPath = join(__dirname, '..', 'data', 'sticker.db');

// データベース接続
const db = new Database(dbPath);

// WALモードを有効化（パフォーマンス向上）
db.pragma('journal_mode = WAL');

// スキーマを適用
const schemaPath = join(__dirname, 'schema.sql');
const schema = readFileSync(schemaPath, 'utf-8');
db.exec(schema);

console.log('Database initialized at:', dbPath);

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
