import rateLimit from 'express-rate-limit';

/**
 * ログイン用レート制限
 * 15分間で5回まで
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 5,
  message: { error: 'ログイン試行回数が上限を超えました。15分後に再試行してください。' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // 成功したリクエストはカウントしない
});

/**
 * サインアップ用レート制限
 * 1時間で3回まで
 */
export const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1時間
  max: 3,
  message: { error: '登録試行回数が上限を超えました。1時間後に再試行してください。' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * パスワードリセット用レート制限
 * 1時間で3回まで
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1時間
  max: 3,
  message: { error: 'パスワードリセット試行回数が上限を超えました。1時間後に再試行してください。' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * メール認証再送用レート制限
 * 15分で2回まで
 */
export const resendVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 2,
  message: { error: '認証メール再送の回数が上限を超えました。15分後に再試行してください。' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * 汎用API用レート制限
 * 15分で100回まで
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100,
  message: { error: 'リクエスト回数が上限を超えました。しばらく待ってから再試行してください。' },
  standardHeaders: true,
  legacyHeaders: false,
});
