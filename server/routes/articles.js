import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import sharp from 'sharp';
import db from '../db/index.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const projectRoot = process.env.UPLOAD_DIR
  ? process.env.UPLOAD_DIR
  : join(__dirname, '..', '..');

// ================================
// 管理API（admin認証必須）
// ※ /:slug より先に定義しないとキャッチされてしまう
// ================================

/**
 * GET /api/articles/admin/list
 * 全記事一覧（draft含む）
 */
router.get('/admin/list', authenticateToken, requireAdmin, (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const search = req.query.search || '';
    const status = req.query.status || '';
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (title LIKE ? OR description LIKE ?)';
      const pattern = `%${search}%`;
      params.push(pattern, pattern);
    }

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    const countResult = db.prepare(
      `SELECT COUNT(*) as total FROM articles ${whereClause}`
    ).get(...params);

    const articles = db.prepare(`
      SELECT * FROM articles
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    const total = countResult.total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      articles,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Get admin articles error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/articles/admin/upload-image
 * 記事用画像アップロード（WebP変換）
 */
router.post('/admin/upload-image', authenticateToken, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '画像ファイルが必要です' });
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: '対応形式: PNG, JPEG, WebP, GIF' });
    }

    const dirPath = join(projectRoot, 'public', 'assets', 'articles');
    await mkdir(dirPath, { recursive: true });

    const filename = `${Date.now()}-${uuidv4().slice(0, 8)}.webp`;
    const filePath = join(dirPath, filename);

    await sharp(req.file.buffer)
      .webp({ quality: 85 })
      .toFile(filePath);

    const imagePath = `/assets/articles/${filename}`;
    res.json({ imagePath });
  } catch (error) {
    console.error('Upload article image error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/articles/admin/:id
 * 記事詳細取得（admin用、ID指定）
 */
router.get('/admin/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    res.json({ article });
  } catch (error) {
    console.error('Get admin article error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/articles/admin
 * 記事作成
 */
router.post('/admin', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { slug, title, description, content, thumbnail, status } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'タイトルと本文は必須です' });
    }

    if (!slug) {
      return res.status(400).json({ error: 'スラッグは必須です' });
    }

    // スラッグの重複チェック
    const existing = db.prepare('SELECT id FROM articles WHERE slug = ?').get(slug);
    if (existing) {
      return res.status(400).json({ error: 'このスラッグは既に使われています' });
    }

    const id = uuidv4();
    const publishedAt = status === 'published' ? new Date().toISOString() : null;

    db.prepare(`
      INSERT INTO articles (id, slug, title, description, content, thumbnail, status, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, slug, title, description || null, content, thumbnail || null, status || 'draft', publishedAt);

    const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
    res.status(201).json({ article });
  } catch (error) {
    console.error('Create article error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/articles/admin/:id
 * 記事更新
 */
router.put('/admin/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { slug, title, description, content, thumbnail, status } = req.body;

    const current = db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
    if (!current) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // スラッグ変更時の重複チェック
    if (slug && slug !== current.slug) {
      const existing = db.prepare('SELECT id FROM articles WHERE slug = ? AND id != ?').get(slug, id);
      if (existing) {
        return res.status(400).json({ error: 'このスラッグは既に使われています' });
      }
    }

    // 公開時にpublished_atを設定
    let publishedAt = current.published_at;
    if (status === 'published' && current.status !== 'published') {
      publishedAt = new Date().toISOString();
    }

    db.prepare(`
      UPDATE articles
      SET slug = COALESCE(?, slug),
          title = COALESCE(?, title),
          description = ?,
          content = COALESCE(?, content),
          thumbnail = ?,
          status = COALESCE(?, status),
          published_at = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      slug, title, description !== undefined ? description : current.description,
      content, thumbnail !== undefined ? thumbnail : current.thumbnail,
      status, publishedAt, id
    );

    const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
    res.json({ article });
  } catch (error) {
    console.error('Update article error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/articles/admin/:id
 * 記事削除
 */
router.delete('/admin/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM articles WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }
    res.json({ message: '記事を削除しました' });
  } catch (error) {
    console.error('Delete article error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ================================
// 公開API（認証不要）
// ================================

/**
 * GET /api/articles
 * 公開記事一覧（status=published のみ）
 */
router.get('/', (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 12));
    const offset = (page - 1) * limit;

    const countResult = db.prepare(
      "SELECT COUNT(*) as total FROM articles WHERE status = 'published'"
    ).get();

    const articles = db.prepare(`
      SELECT id, slug, title, description, thumbnail, published_at, created_at
      FROM articles
      WHERE status = 'published'
      ORDER BY published_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    const total = countResult.total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      articles,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Get public articles error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/articles/:slug
 * 記事詳細取得（slug指定、published のみ）
 * ※ 必ず /admin/* ルートの後に定義すること
 */
router.get('/:slug', (req, res) => {
  try {
    const { slug } = req.params;

    const article = db.prepare(
      "SELECT * FROM articles WHERE slug = ? AND status = 'published'"
    ).get(slug);

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // 前後の記事を取得
    const prevArticle = db.prepare(`
      SELECT slug, title FROM articles
      WHERE status = 'published' AND published_at < ?
      ORDER BY published_at DESC LIMIT 1
    `).get(article.published_at);

    const nextArticle = db.prepare(`
      SELECT slug, title FROM articles
      WHERE status = 'published' AND published_at > ?
      ORDER BY published_at ASC LIMIT 1
    `).get(article.published_at);

    res.json({
      article,
      prevArticle: prevArticle || null,
      nextArticle: nextArticle || null,
    });
  } catch (error) {
    console.error('Get article error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
