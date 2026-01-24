import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-key-change-in-production';

/**
 * JWT検証ミドルウェア
 * Cookieまたは Authorization ヘッダーからトークンを取得して検証
 */
export const authenticateToken = (req, res, next) => {
  // CookieまたはAuthorizationヘッダーからトークンを取得
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(403).json({ error: 'Invalid token' });
  }
};

/**
 * オプショナル認証ミドルウェア
 * トークンがあれば検証するが、なくてもエラーにしない
 */
export const optionalAuth = (req, res, next) => {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch {
      // トークンが無効でも続行
    }
  }
  next();
};

/**
 * ロールベースアクセス制御
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

export { JWT_SECRET };
