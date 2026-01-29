import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { JWT_SECRET, authenticateToken } from '../middleware/auth.js';
import {
  loginLimiter,
  signupLimiter,
  passwordResetLimiter,
  resendVerificationLimiter,
} from '../middleware/rateLimit.js';
import {
  validateSignup,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateChangePassword,
  validateVerifyEmail,
} from '../middleware/validation.js';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  isEmailEnabled,
} from '../services/email.js';

const router = Router();

// JWT有効期限: 7日
const JWT_EXPIRES_IN = '7d';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7日（ミリ秒）

// bcryptラウンド数
const SALT_ROUNDS = 10;

// トークン有効期限
const VERIFICATION_TOKEN_EXPIRES_HOURS = 24;
const PASSWORD_RESET_TOKEN_EXPIRES_HOURS = 1;

/**
 * セキュアなトークン生成（64文字の16進数文字列）
 */
const generateSecureToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * JWTトークン生成
 */
const generateJwtToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      displayName: user.display_name,
      emailVerified: user.email_verified === 1,
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
 * メール認証トークンを作成
 */
const createVerificationToken = (userId) => {
  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRES_HOURS * 60 * 60 * 1000);

  // 既存のトークンを削除
  db.prepare('DELETE FROM email_verification_tokens WHERE user_id = ?').run(userId);

  // 新しいトークンを作成
  db.prepare(`
    INSERT INTO email_verification_tokens (id, user_id, token, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(uuidv4(), userId, token, expiresAt.toISOString());

  return token;
};

/**
 * パスワードリセットトークンを作成
 */
const createPasswordResetToken = (userId) => {
  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_EXPIRES_HOURS * 60 * 60 * 1000);

  // 既存の未使用トークンを無効化
  db.prepare(`
    UPDATE password_reset_tokens
    SET used_at = CURRENT_TIMESTAMP
    WHERE user_id = ? AND used_at IS NULL
  `).run(userId);

  // 新しいトークンを作成
  db.prepare(`
    INSERT INTO password_reset_tokens (id, user_id, token, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(uuidv4(), userId, token, expiresAt.toISOString());

  return token;
};

/**
 * POST /api/auth/signup
 * 新規ユーザー登録
 */
router.post('/signup', signupLimiter, validateSignup, async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    // 既存ユーザーチェック
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(409).json({ error: 'このメールアドレスは既に登録されています' });
    }

    // パスワードハッシュ化
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // ユーザー作成（メール未認証状態）
    const id = uuidv4();
    const emailVerified = isEmailEnabled() ? 0 : 1; // メール機能無効時は認証済みとする

    db.prepare(`
      INSERT INTO users (id, email, password_hash, display_name, role, email_verified)
      VALUES (?, ?, ?, ?, 'creator', ?)
    `).run(id, email, passwordHash, displayName || null, emailVerified);

    // 作成したユーザーを取得
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);

    // メール認証トークン生成・メール送信
    let verificationSent = false;
    if (isEmailEnabled()) {
      try {
        const verificationToken = createVerificationToken(id);
        await sendVerificationEmail(email, verificationToken);
        verificationSent = true;
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
        // メール送信失敗でもユーザー作成は成功とする
      }
    }

    // JWTトークン生成
    const token = generateJwtToken(user);
    setCookie(res, token);

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        displayName: user.display_name,
        emailVerified: user.email_verified === 1,
      },
      token,
      verificationSent,
      message: verificationSent
        ? '確認メールを送信しました。メールのリンクをクリックして認証を完了してください。'
        : undefined,
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

/**
 * POST /api/auth/login
 * ログイン
 */
router.post('/login', loginLimiter, validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    // ユーザー検索
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'メールアドレスまたはパスワードが正しくありません' });
    }

    // パスワード検証
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'メールアドレスまたはパスワードが正しくありません' });
    }

    // JWTトークン生成
    const token = generateJwtToken(user);
    setCookie(res, token);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        displayName: user.display_name,
        emailVerified: user.email_verified === 1,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
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
  res.json({ message: 'ログアウトしました' });
});

/**
 * GET /api/auth/me
 * 現在のユーザー情報を取得
 */
router.get('/me', authenticateToken, (req, res) => {
  // DBから最新の情報を取得
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

  if (!user) {
    return res.status(404).json({ error: 'ユーザーが見つかりません' });
  }

  res.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      displayName: user.display_name,
      emailVerified: user.email_verified === 1,
    },
  });
});

/**
 * POST /api/auth/verify-email
 * メールアドレス認証
 */
router.post('/verify-email', validateVerifyEmail, async (req, res) => {
  try {
    const { token } = req.body;

    // トークンを検索
    const tokenRecord = db.prepare(`
      SELECT * FROM email_verification_tokens
      WHERE token = ? AND expires_at > datetime('now')
    `).get(token);

    if (!tokenRecord) {
      return res.status(400).json({
        error: 'トークンが無効または期限切れです。認証メールを再送信してください。',
      });
    }

    // ユーザーを認証済みに更新
    db.prepare(`
      UPDATE users
      SET email_verified = 1, email_verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(tokenRecord.user_id);

    // 使用済みトークンを削除
    db.prepare('DELETE FROM email_verification_tokens WHERE user_id = ?').run(tokenRecord.user_id);

    // 更新されたユーザー情報を取得
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(tokenRecord.user_id);

    // 新しいJWTを発行（emailVerifiedフラグを更新）
    const newToken = generateJwtToken(user);
    setCookie(res, newToken);

    res.json({
      message: 'メールアドレスの認証が完了しました',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        displayName: user.display_name,
        emailVerified: true,
      },
      token: newToken,
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

/**
 * POST /api/auth/resend-verification
 * 認証メール再送信
 */
router.post('/resend-verification', authenticateToken, resendVerificationLimiter, async (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'ユーザーが見つかりません' });
    }

    if (user.email_verified === 1) {
      return res.status(400).json({ error: 'メールアドレスは既に認証済みです' });
    }

    if (!isEmailEnabled()) {
      return res.status(400).json({ error: 'メール送信機能が無効です' });
    }

    // 新しいトークン生成・メール送信
    const verificationToken = createVerificationToken(user.id);
    await sendVerificationEmail(user.email, verificationToken);

    res.json({ message: '認証メールを再送信しました' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'メール送信に失敗しました' });
  }
});

/**
 * POST /api/auth/forgot-password
 * パスワードリセットリクエスト
 */
router.post('/forgot-password', passwordResetLimiter, validateForgotPassword, async (req, res) => {
  try {
    const { email } = req.body;

    // ユーザー検索（存在しなくても同じレスポンスを返す = タイミング攻撃対策）
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    // ユーザーが存在する場合のみトークン作成・メール送信
    if (user && isEmailEnabled()) {
      try {
        const resetToken = createPasswordResetToken(user.id);
        await sendPasswordResetEmail(user.email, resetToken);
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
      }
    }

    // 常に同じレスポンスを返す（ユーザー存在の漏洩防止）
    res.json({
      message: 'メールアドレスが登録されている場合、パスワードリセットのメールを送信しました。',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

/**
 * POST /api/auth/reset-password
 * パスワードリセット実行
 */
router.post('/reset-password', validateResetPassword, async (req, res) => {
  try {
    const { token, password } = req.body;

    // トークンを検索
    const tokenRecord = db.prepare(`
      SELECT * FROM password_reset_tokens
      WHERE token = ? AND expires_at > datetime('now') AND used_at IS NULL
    `).get(token);

    if (!tokenRecord) {
      return res.status(400).json({
        error: 'トークンが無効または期限切れです。パスワードリセットを再度リクエストしてください。',
      });
    }

    // パスワードハッシュ化
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // パスワード更新
    db.prepare(`
      UPDATE users
      SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(passwordHash, tokenRecord.user_id);

    // トークンを使用済みにマーク
    db.prepare(`
      UPDATE password_reset_tokens
      SET used_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(tokenRecord.id);

    res.json({ message: 'パスワードが正常にリセットされました。新しいパスワードでログインしてください。' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

/**
 * POST /api/auth/change-password
 * パスワード変更（ログイン中）
 */
router.post('/change-password', authenticateToken, validateChangePassword, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // ユーザー取得
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'ユーザーが見つかりません' });
    }

    // 現在のパスワード検証
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: '現在のパスワードが正しくありません' });
    }

    // 新しいパスワードハッシュ化
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // パスワード更新
    db.prepare(`
      UPDATE users
      SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(passwordHash, user.id);

    res.json({ message: 'パスワードを変更しました' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

/**
 * DELETE /api/auth/delete-account
 * アカウント削除
 */
router.delete('/delete-account', authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;

    // パスワード確認が必要
    if (!password) {
      return res.status(400).json({ error: 'パスワードを入力してください' });
    }

    // ユーザー取得
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'ユーザーが見つかりません' });
    }

    // パスワード検証
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'パスワードが正しくありません' });
    }

    // トランザクションで削除処理
    const deleteUser = db.transaction(() => {
      // ユーザーが作成したキットを削除（stickersはCASCADEで削除される）
      db.prepare('DELETE FROM kits WHERE creator_id = ?').run(user.id);

      // ユーザーの作品を削除
      db.prepare('DELETE FROM works WHERE user_id = ?').run(user.id);

      // 認証トークンを削除
      db.prepare('DELETE FROM email_verification_tokens WHERE user_id = ?').run(user.id);
      db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').run(user.id);

      // ユーザーを削除
      db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
    });

    deleteUser();

    // アカウント削除通知メールを送信（オプション）
    try {
      const { sendAccountDeletedEmail } = await import('../services/email.js');
      await sendAccountDeletedEmail(user.email);
    } catch (emailError) {
      console.error('Failed to send account deletion email:', emailError);
    }

    // Cookieをクリア
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
    });

    res.json({ message: 'アカウントが削除されました' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

export default router;
