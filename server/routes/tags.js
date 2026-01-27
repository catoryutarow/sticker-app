import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

// 人気カスタムタグの閾値（この数以上のキットで使われていれば人気）
const POPULAR_TAG_THRESHOLD = 3;

// タグ名の正規化（小文字、トリム）
const normalizeTagName = (name) => {
  return String(name).trim().toLowerCase();
};

// タグ名のバリデーション
const validateTagName = (name) => {
  const normalized = normalizeTagName(name);
  // 2-30文字、英数字とハイフンのみ（日本語も許可）
  if (normalized.length < 1 || normalized.length > 30) {
    return { valid: false, error: 'タグは1〜30文字で入力してください' };
  }
  // 空白や特殊文字のチェック（基本的な制限）
  if (/[<>\"\'\\]/.test(normalized)) {
    return { valid: false, error: '使用できない文字が含まれています' };
  }
  return { valid: true, normalized };
};

// ================================
// Public Routes
// ================================

/**
 * GET /api/tags
 * タグ一覧取得（登録タグ + ユーザー作成タグを統合）
 */
router.get('/', async (req, res) => {
  try {
    // 登録タグを取得
    const registeredTags = db.prepare(`
      SELECT id, name, sort_order,
        (SELECT COUNT(*) FROM kit_tags WHERE tag_name = tags.name) as usage_count
      FROM tags
      ORDER BY sort_order ASC, name ASC
    `).all();

    // ユーザー作成タグを取得（登録タグにないもの）
    const registeredNames = registeredTags.map(t => t.name);
    const customTags = db.prepare(`
      SELECT tag_name as name, COUNT(*) as usage_count
      FROM kit_tags
      WHERE is_custom = 1
      GROUP BY tag_name
      ORDER BY usage_count DESC, name ASC
    `).all().filter(t => !registeredNames.includes(t.name));

    // 統合して返す（登録タグを先に、その後ユーザー作成タグを使用数順）
    const allTags = [
      ...registeredTags.map(t => ({ ...t, isRegistered: true })),
      ...customTags.map(t => ({ id: null, name: t.name, sort_order: 9999, usage_count: t.usage_count, isRegistered: false })),
    ];

    res.json({
      tags: allTags,
      popularCustomTags: [], // 互換性のため残す
    });
  } catch (error) {
    console.error('Failed to get tags:', error);
    res.status(500).json({ error: 'タグの取得に失敗しました' });
  }
});

// ================================
// Admin Routes
// ================================

/**
 * GET /api/tags/admin/list
 * 管理用タグ一覧（登録タグ + ユーザー作成タグを統合）
 */
router.get('/admin/list', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // 登録タグを取得
    const registeredTags = db.prepare(`
      SELECT
        t.*,
        (SELECT COUNT(*) FROM kit_tags WHERE tag_name = t.name) as kit_count,
        0 as is_user_created
      FROM tags t
      ORDER BY t.sort_order ASC, t.name ASC
    `).all();

    // ユーザー作成タグを取得（登録タグにないもの）
    const registeredNames = registeredTags.map(t => t.name);
    const userCreatedTags = db.prepare(`
      SELECT
        tag_name as name,
        COUNT(*) as kit_count,
        MIN(created_at) as created_at,
        MAX(created_at) as updated_at
      FROM kit_tags
      WHERE is_custom = 1
      GROUP BY tag_name
      ORDER BY kit_count DESC, name ASC
    `).all()
      .filter(t => !registeredNames.includes(t.name))
      .map(t => ({
        id: null,
        name: t.name,
        sort_order: 9999,
        usage_count: 0,
        kit_count: t.kit_count,
        created_at: t.created_at,
        updated_at: t.updated_at,
        is_user_created: 1,
      }));

    // 統合
    const allTags = [...registeredTags, ...userCreatedTags];

    res.json({
      tags: allTags,
      stats: {
        fixedTagCount: registeredTags.length,
        customTagCount: userCreatedTags.length,
        totalCustomUses: userCreatedTags.reduce((sum, t) => sum + t.kit_count, 0),
      },
    });
  } catch (error) {
    console.error('Failed to get admin tags:', error);
    res.status(500).json({ error: 'タグの取得に失敗しました' });
  }
});

/**
 * POST /api/tags/admin
 * 固定タグ追加
 */
router.post('/admin', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name } = req.body;

    const validation = validateTagName(name);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // 重複チェック
    const existing = db.prepare('SELECT id FROM tags WHERE name = ?').get(validation.normalized);
    if (existing) {
      return res.status(400).json({ error: 'このタグは既に存在します' });
    }

    // 次のsort_orderを取得
    const maxOrder = db.prepare('SELECT MAX(sort_order) as max FROM tags').get();
    const sortOrder = (maxOrder.max || 0) + 1;

    const id = uuidv4();
    db.prepare(`
      INSERT INTO tags (id, name, sort_order)
      VALUES (?, ?, ?)
    `).run(id, validation.normalized, sortOrder);

    const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(id);

    res.status(201).json({ tag });
  } catch (error) {
    console.error('Failed to create tag:', error);
    res.status(500).json({ error: 'タグの作成に失敗しました' });
  }
});

/**
 * PUT /api/tags/admin/:tagId
 * 固定タグ更新
 */
router.put('/admin/:tagId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { tagId } = req.params;
    const { name, sortOrder } = req.body;

    const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(tagId);
    if (!tag) {
      return res.status(404).json({ error: 'タグが見つかりません' });
    }

    let newName = tag.name;
    if (name !== undefined) {
      const validation = validateTagName(name);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }
      // 名前変更時の重複チェック
      if (validation.normalized !== tag.name) {
        const existing = db.prepare('SELECT id FROM tags WHERE name = ? AND id != ?')
          .get(validation.normalized, tagId);
        if (existing) {
          return res.status(400).json({ error: 'このタグ名は既に使用されています' });
        }
      }
      newName = validation.normalized;
    }

    // タグ名が変わった場合、kit_tagsも更新
    const updateTagsTransaction = db.transaction(() => {
      if (newName !== tag.name) {
        db.prepare('UPDATE kit_tags SET tag_name = ? WHERE tag_name = ? AND is_custom = 0')
          .run(newName, tag.name);
      }

      db.prepare(`
        UPDATE tags
        SET name = ?,
            sort_order = COALESCE(?, sort_order),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        newName,
        sortOrder !== undefined ? sortOrder : null,
        tagId
      );
    });

    updateTagsTransaction();

    const updatedTag = db.prepare('SELECT * FROM tags WHERE id = ?').get(tagId);
    res.json({ tag: updatedTag });
  } catch (error) {
    console.error('Failed to update tag:', error);
    res.status(500).json({ error: 'タグの更新に失敗しました' });
  }
});

/**
 * DELETE /api/tags/admin/:tagId
 * 固定タグ削除
 */
router.delete('/admin/:tagId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { tagId } = req.params;

    const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(tagId);
    if (!tag) {
      return res.status(404).json({ error: 'タグが見つかりません' });
    }

    // このタグを使っているキット数
    const usageCount = db.prepare(
      'SELECT COUNT(*) as count FROM kit_tags WHERE tag_name = ?'
    ).get(tag.name);

    // トランザクションで削除（kit_tagsからも削除）
    const deleteTransaction = db.transaction(() => {
      db.prepare('DELETE FROM kit_tags WHERE tag_name = ? AND is_custom = 0').run(tag.name);
      db.prepare('DELETE FROM tags WHERE id = ?').run(tagId);
    });

    deleteTransaction();

    res.json({
      message: 'タグを削除しました',
      affectedKits: usageCount.count,
    });
  } catch (error) {
    console.error('Failed to delete tag:', error);
    res.status(500).json({ error: 'タグの削除に失敗しました' });
  }
});

/**
 * PUT /api/tags/admin/reorder
 * 固定タグの並び順更新
 */
router.put('/admin/reorder', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { tagIds } = req.body;

    if (!Array.isArray(tagIds)) {
      return res.status(400).json({ error: 'tagIdsは配列で指定してください' });
    }

    const updateOrder = db.transaction(() => {
      tagIds.forEach((id, index) => {
        db.prepare('UPDATE tags SET sort_order = ? WHERE id = ?').run(index, id);
      });
    });

    updateOrder();

    res.json({ message: '並び順を更新しました' });
  } catch (error) {
    console.error('Failed to reorder tags:', error);
    res.status(500).json({ error: '並び順の更新に失敗しました' });
  }
});

export default router;
export { normalizeTagName, validateTagName };
