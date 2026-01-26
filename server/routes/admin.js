import { Router } from 'express';
import { unlink, rmdir, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import db from '../db/index.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..', '..');

const router = Router();

// 全ルートにadmin認証を適用
router.use(authenticateToken, requireAdmin);

// ================================
// 統計API
// ================================

/**
 * GET /api/admin/stats
 * ダッシュボード統計情報
 */
router.get('/stats', (req, res) => {
  try {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const kitCount = db.prepare('SELECT COUNT(*) as count FROM kits').get().count;
    const publishedKitCount = db.prepare("SELECT COUNT(*) as count FROM kits WHERE status = 'published'").get().count;
    const stickerCount = db.prepare('SELECT COUNT(*) as count FROM stickers').get().count;

    res.json({
      stats: {
        users: userCount,
        kits: kitCount,
        publishedKits: publishedKitCount,
        stickers: stickerCount,
      }
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ================================
// ユーザー管理API
// ================================

/**
 * GET /api/admin/users
 * ユーザー一覧取得（検索・ページネーション対応）
 */
router.get('/users', (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (email LIKE ? OR display_name LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
    }

    // 総件数を取得
    const countResult = db.prepare(`
      SELECT COUNT(*) as total FROM users ${whereClause}
    `).get(...params);

    // ユーザー一覧を取得
    const users = db.prepare(`
      SELECT id, email, role, display_name, created_at, updated_at,
        (SELECT COUNT(*) FROM kits WHERE creator_id = users.id) as kit_count
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    const total = countResult.total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/users/:userId
 * ユーザー詳細取得（投稿キット一覧含む）
 */
router.get('/users/:userId', (req, res) => {
  try {
    const { userId } = req.params;

    const user = db.prepare(`
      SELECT id, email, role, display_name, created_at, updated_at
      FROM users WHERE id = ?
    `).get(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // ユーザーのキット一覧
    const kits = db.prepare(`
      SELECT k.*,
        (SELECT COUNT(*) FROM stickers WHERE kit_id = k.id) as sticker_count
      FROM kits k
      WHERE k.creator_id = ?
      ORDER BY k.created_at DESC
    `).all(userId);

    res.json({ user, kits });
  } catch (error) {
    console.error('Get user detail error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/admin/users/:userId
 * ユーザー削除（関連キットも削除）
 */
router.delete('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 自分自身は削除できない
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    // ユーザーのキットを取得
    const kits = db.prepare('SELECT * FROM kits WHERE creator_id = ?').all(userId);

    // キットに関連するファイルを削除し、DBからも削除
    for (const kit of kits) {
      try {
        const stickerDir = join(projectRoot, 'public', 'assets', 'stickers', `kit-${kit.kit_number}`);
        const audioDir = join(projectRoot, 'public', 'assets', 'audio', `kit-${kit.kit_number}`);

        await removeDirectoryIfExists(stickerDir);
        await removeDirectoryIfExists(audioDir);
      } catch (err) {
        console.error(`Failed to delete kit files for kit-${kit.kit_number}:`, err);
      }

      // キットをDBから削除（CASCADE でシール・レイアウトも削除される）
      db.prepare('DELETE FROM kits WHERE id = ?').run(kit.id);
    }

    // ユーザーを削除
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ================================
// キット管理API
// ================================

/**
 * GET /api/admin/kits
 * 全キット一覧取得（検索・ページネーション対応）
 */
router.get('/kits', (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const search = req.query.search || '';
    const status = req.query.status || '';
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (k.name LIKE ? OR k.name_ja LIKE ? OR k.description LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (status) {
      whereClause += ' AND k.status = ?';
      params.push(status);
    }

    // 総件数を取得
    const countResult = db.prepare(`
      SELECT COUNT(*) as total FROM kits k ${whereClause}
    `).get(...params);

    // キット一覧を取得（クリエイター情報付き）
    const kits = db.prepare(`
      SELECT k.*,
        u.email as creator_email,
        u.display_name as creator_name,
        (SELECT COUNT(*) FROM stickers WHERE kit_id = k.id) as sticker_count
      FROM kits k
      LEFT JOIN users u ON k.creator_id = u.id
      ${whereClause}
      ORDER BY k.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    const total = countResult.total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      kits,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      }
    });
  } catch (error) {
    console.error('Get admin kits error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/admin/kits/:kitId
 * キット削除（管理者権限）
 */
router.delete('/kits/:kitId', async (req, res) => {
  try {
    const { kitId } = req.params;

    const kit = db.prepare('SELECT * FROM kits WHERE id = ?').get(kitId);
    if (!kit) {
      return res.status(404).json({ error: 'Kit not found' });
    }

    // 関連ファイルを削除
    try {
      const stickerDir = join(projectRoot, 'public', 'assets', 'stickers', `kit-${kit.kit_number}`);
      const audioDir = join(projectRoot, 'public', 'assets', 'audio', `kit-${kit.kit_number}`);

      await removeDirectoryIfExists(stickerDir);
      await removeDirectoryIfExists(audioDir);
    } catch (err) {
      console.error(`Failed to delete kit files for kit-${kit.kit_number}:`, err);
    }

    // データベースから削除（CASCADE でシールも削除される）
    db.prepare('DELETE FROM kits WHERE id = ?').run(kitId);

    res.json({ message: 'Kit deleted successfully' });
  } catch (error) {
    console.error('Delete admin kit error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ================================
// ヘルパー関数
// ================================

/**
 * ディレクトリが存在する場合に削除
 */
async function removeDirectoryIfExists(dirPath) {
  try {
    const files = await readdir(dirPath);
    for (const file of files) {
      await unlink(join(dirPath, file));
    }
    await rmdir(dirPath);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
  }
}

export default router;
