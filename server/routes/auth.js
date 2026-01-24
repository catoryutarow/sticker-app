import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { JWT_SECRET, authenticateToken } from '../middleware/auth.js';

const router = Router();

// JWT有効期限: 7日
const JWT_EXPIRES_IN = '7d';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7日（ミリ秒）

// bcryptラウンド数
const SALT_ROUNDS = 10;

/**
 * トークン生成
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      displayName: user.display_name
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

/**
 * Cookie設定
 */
const setCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
};

/**
 * POST /api/auth/signup
 * 新規ユーザー登録
 */
router.post('/signup', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    // バリデーション
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // メールアドレスの簡易バリデーション
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // 既存ユーザーチェック
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // パスワードハッシュ化
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // ユーザー作成
    const id = uuidv4();
    db.prepare(`
      INSERT INTO users (id, email, password_hash, display_name, role)
      VALUES (?, ?, ?, ?, 'creator')
    `).run(id, email, passwordHash, displayName || null);

    // 作成したユーザーを取得
    const user = db.prepare('SELECT id, email, role, display_name FROM users WHERE id = ?').get(id);

    // トークン生成
    const token = generateToken(user);
    setCookie(res, token);

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        displayName: user.display_name,
      },
      token,
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/login
 * ログイン
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // バリデーション
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // ユーザー検索
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // パスワード検証
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // トークン生成
    const token = generateToken(user);
    setCookie(res, token);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        displayName: user.display_name,
      },
      token,
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/logout
 * ログアウト
 */
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  });
  res.json({ message: 'Logged out successfully' });
});

/**
 * GET /api/auth/me
 * 現在のユーザー情報を取得
 */
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      displayName: req.user.displayName,
    },
  });
});

export default router;
