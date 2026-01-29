import { body, validationResult } from 'express-validator';

/**
 * バリデーション結果をチェックするミドルウェア
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  next();
};

/**
 * サインアップ用バリデーション
 */
export const validateSignup = [
  body('email')
    .isEmail()
    .withMessage('有効なメールアドレスを入力してください')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('メールアドレスは255文字以内で入力してください'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('パスワードは8文字以上で入力してください')
    .isLength({ max: 128 })
    .withMessage('パスワードは128文字以内で入力してください')
    .matches(/^(?=.*[a-zA-Z])(?=.*[0-9])/)
    .withMessage('パスワードは英字と数字を両方含む必要があります'),
  body('displayName')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('表示名は1〜50文字で入力してください')
    .escape(),
  handleValidationErrors,
];

/**
 * ログイン用バリデーション
 */
export const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('有効なメールアドレスを入力してください')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('パスワードを入力してください'),
  handleValidationErrors,
];

/**
 * パスワードリセットリクエスト用バリデーション
 */
export const validateForgotPassword = [
  body('email')
    .isEmail()
    .withMessage('有効なメールアドレスを入力してください')
    .normalizeEmail(),
  handleValidationErrors,
];

/**
 * パスワードリセット実行用バリデーション
 */
export const validateResetPassword = [
  body('token')
    .notEmpty()
    .withMessage('トークンが必要です')
    .isLength({ min: 64, max: 64 })
    .withMessage('無効なトークン形式です'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('パスワードは8文字以上で入力してください')
    .isLength({ max: 128 })
    .withMessage('パスワードは128文字以内で入力してください')
    .matches(/^(?=.*[a-zA-Z])(?=.*[0-9])/)
    .withMessage('パスワードは英字と数字を両方含む必要があります'),
  handleValidationErrors,
];

/**
 * パスワード変更用バリデーション
 */
export const validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('現在のパスワードを入力してください'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('新しいパスワードは8文字以上で入力してください')
    .isLength({ max: 128 })
    .withMessage('新しいパスワードは128文字以内で入力してください')
    .matches(/^(?=.*[a-zA-Z])(?=.*[0-9])/)
    .withMessage('新しいパスワードは英字と数字を両方含む必要があります'),
  handleValidationErrors,
];

/**
 * メール認証用バリデーション
 */
export const validateVerifyEmail = [
  body('token')
    .notEmpty()
    .withMessage('トークンが必要です')
    .isLength({ min: 64, max: 64 })
    .withMessage('無効なトークン形式です'),
  handleValidationErrors,
];
