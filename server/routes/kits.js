import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { mkdir, writeFile, unlink, copyFile, access } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { constants } from 'fs';
import multer from 'multer';
import db from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';
import { AUDIO_LIBRARY, libraryPath, getRandomMatchingSound } from './audioLibrary.js';
import { generateKitThumbnail } from '../utils/thumbnail.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

// ================================
// 公開API（認証不要）
// ================================

/**
 * GET /api/kits/public
 * 公開キット一覧取得（認証不要、ページネーション対応）
 */
router.get('/public', (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    // 検索条件のベースクエリ
    let whereClause = 'WHERE k.status = ?';
    const params = ['published'];

    if (search) {
      whereClause += ' AND (k.name LIKE ? OR k.name_ja LIKE ? OR k.description LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    // 総件数を取得
    const countResult = db.prepare(`
      SELECT COUNT(*) as total
      FROM kits k
      ${whereClause}
    `).get(...params);

    // ページネーション付きでキット取得
    const kits = db.prepare(`
      SELECT k.*,
        (SELECT COUNT(*) FROM stickers WHERE kit_id = k.id) as sticker_count
      FROM kits k
      ${whereClause}
      ORDER BY k.kit_number ASC
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
    console.error('Get public kits error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/kits/public/:kitId/stickers
 * 公開キットのシール一覧取得（認証不要）
 */
router.get('/public/:kitId/stickers', (req, res) => {
  try {
    const { kitId } = req.params;

    // キットが公開されているか確認
    const kit = db.prepare('SELECT * FROM kits WHERE id = ? AND status = ?').get(kitId, 'published');
    if (!kit) {
      return res.status(404).json({ error: 'Kit not found or not published' });
    }

    const stickers = db.prepare(`
      SELECT * FROM stickers WHERE kit_id = ? ORDER BY sort_order, sticker_number
    `).all(kitId);

    res.json({ kit, stickers });
  } catch (error) {
    console.error('Get public stickers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/kits/public/all
 * 全公開キットとシールを一括取得（認証不要）
 */
router.get('/public/all', (req, res) => {
  try {
    const kits = db.prepare(`
      SELECT * FROM kits WHERE status = 'published' ORDER BY kit_number ASC
    `).all();

    const result = kits.map(kit => {
      const stickers = db.prepare(`
        SELECT * FROM stickers WHERE kit_id = ? ORDER BY sort_order, sticker_number
      `).all(kit.id);

      // 各シールにレイアウト情報を追加
      const stickersWithLayouts = stickers.map(sticker => {
        const layouts = db.prepare(`
          SELECT * FROM sticker_layouts WHERE sticker_id = ? ORDER BY sort_order
        `).all(sticker.id);
        return { ...sticker, layouts };
      });

      return { ...kit, stickers: stickersWithLayouts };
    });

    res.json({ kits: result });
  } catch (error) {
    console.error('Get all public kits error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 画像と音声のアップロード設定
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// プロジェクトルートのパス
const projectRoot = join(__dirname, '..', '..');

/**
 * 次のキット番号を取得
 */
const getNextKitNumber = () => {
  const result = db.prepare(`
    SELECT kit_number FROM kits
    ORDER BY kit_number DESC
    LIMIT 1
  `).get();

  if (result) {
    const num = parseInt(result.kit_number, 10) + 1;
    return String(num).padStart(3, '0');
  }
  // 001-003は既存キットなので004から開始
  return '004';
};

/**
 * 次のシール番号を取得
 */
const getNextStickerNumber = (kitId) => {
  const result = db.prepare(`
    SELECT sticker_number FROM stickers
    WHERE kit_id = ?
    ORDER BY sticker_number DESC
    LIMIT 1
  `).get(kitId);

  if (result) {
    const num = parseInt(result.sticker_number, 10) + 1;
    return String(num).padStart(3, '0');
  }
  return '001';
};

/**
 * キットの所有者かチェック（adminは全キットにアクセス可能）
 */
const checkKitOwnership = (kitId, userId, userRole) => {
  const kit = db.prepare('SELECT creator_id FROM kits WHERE id = ?').get(kitId);
  if (!kit) {
    return { error: 'Kit not found', status: 404 };
  }
  // adminは全キットにアクセス可能
  if (userRole === 'admin') {
    return { kit };
  }
  if (kit.creator_id !== userId) {
    return { error: 'Not authorized', status: 403 };
  }
  return { kit };
};

// ================================
// キットAPI
// ================================

/**
 * GET /api/kits
 * キット一覧取得（自分のキットのみ）
 */
router.get('/', authenticateToken, (req, res) => {
  try {
    const kits = db.prepare(`
      SELECT k.*,
        (SELECT COUNT(*) FROM stickers WHERE kit_id = k.id) as sticker_count
      FROM kits k
      WHERE k.creator_id = ?
      ORDER BY k.created_at DESC
    `).all(req.user.id);

    // 各キットのレイアウト情報を取得（プレビュー用）
    const kitsWithLayouts = kits.map(kit => {
      // sticker_layouts経由で全レイアウトを取得
      const layouts = db.prepare(`
        SELECT sl.id, sl.x, sl.y, sl.size, sl.rotation,
               s.id as sticker_id, s.full_id, s.name, s.color, s.image_uploaded
        FROM sticker_layouts sl
        JOIN stickers s ON sl.sticker_id = s.id
        WHERE s.kit_id = ?
        ORDER BY sl.sort_order
      `).all(kit.id);

      return { ...kit, layouts };
    });

    res.json({ kits: kitsWithLayouts });
  } catch (error) {
    console.error('Get kits error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 利用可能なキー一覧
const AVAILABLE_KEYS = [
  'C/Am', 'G/Em', 'D/Bm', 'A/F#m', 'E/C#m', 'B/G#m',
  'F#/D#m', 'F/Dm', 'Bb/Gm', 'Eb/Cm', 'Ab/Fm', 'Db/Bbm'
];

/**
 * POST /api/kits
 * キット作成（トランザクションでレースコンディション対策）
 */
router.post('/', authenticateToken, (req, res) => {
  try {
    const { name, nameJa, description, color, musicalKey } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // 「おまかせ」（random）の場合は作成時にランダムにキーを決定
    let finalMusicalKey = musicalKey || 'random';
    if (finalMusicalKey === 'random') {
      finalMusicalKey = AVAILABLE_KEYS[Math.floor(Math.random() * AVAILABLE_KEYS.length)];
    }

    // トランザクションでキット番号取得と挿入をアトミックに実行
    const createKit = db.transaction(() => {
      const id = uuidv4();
      const kitNumber = getNextKitNumber();

      db.prepare(`
        INSERT INTO kits (id, kit_number, name, name_ja, description, color, musical_key, creator_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, kitNumber, name, nameJa || null, description || null, color || '#E0E0E0', finalMusicalKey, req.user.id);

      return db.prepare('SELECT * FROM kits WHERE id = ?').get(id);
    });

    const kit = createKit();
    res.status(201).json({ kit });
  } catch (error) {
    console.error('Create kit error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/kits/:kitId
 * キット詳細取得
 */
router.get('/:kitId', authenticateToken, (req, res) => {
  try {
    const { kitId } = req.params;

    const ownership = checkKitOwnership(kitId, req.user.id, req.user.role);
    if (ownership.error) {
      return res.status(ownership.status).json({ error: ownership.error });
    }

    let kit = db.prepare('SELECT * FROM kits WHERE id = ?').get(kitId);

    // musical_keyが'random'の場合、ランダムにキーを決定して保存
    if (kit.musical_key === 'random') {
      const newKey = AVAILABLE_KEYS[Math.floor(Math.random() * AVAILABLE_KEYS.length)];
      db.prepare('UPDATE kits SET musical_key = ? WHERE id = ?').run(newKey, kitId);
      kit = db.prepare('SELECT * FROM kits WHERE id = ?').get(kitId);
    }

    const stickers = db.prepare(`
      SELECT * FROM stickers WHERE kit_id = ? ORDER BY sort_order, sticker_number
    `).all(kitId);

    res.json({ kit, stickers });
  } catch (error) {
    console.error('Get kit error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/kits/:kitId
 * キット更新
 */
router.put('/:kitId', authenticateToken, async (req, res) => {
  try {
    const { kitId } = req.params;
    const { name, nameJa, description, color, musicalKey, status } = req.body;

    const ownership = checkKitOwnership(kitId, req.user.id, req.user.role);
    if (ownership.error) {
      return res.status(ownership.status).json({ error: ownership.error });
    }

    // 現在のキット情報を取得
    const currentKit = db.prepare('SELECT * FROM kits WHERE id = ?').get(kitId);

    // 公開済みキットは編集不可（adminは除外）
    if (currentKit.status === 'published' && req.user.role !== 'admin') {
      return res.status(400).json({ error: '公開済みキットは編集できません' });
    }

    // 公開しようとしている場合、音声未設定のシールにフォールバック処理
    const fallbackResults = [];
    let finalMusicalKey = musicalKey || currentKit.musical_key || 'random';

    if (status === 'published') {
      const stickers = db.prepare('SELECT * FROM stickers WHERE kit_id = ?').all(kitId);

      // レイアウトに1枚以上シールが配置されているかチェック
      const layoutCount = db.prepare(`
        SELECT COUNT(*) as count FROM sticker_layouts sl
        JOIN stickers s ON sl.sticker_id = s.id
        WHERE s.kit_id = ?
      `).get(kitId);

      if (layoutCount.count === 0) {
        return res.status(400).json({
          error: 'レイアウトにシールが1枚も配置されていません。シールを配置してから公開してください。',
        });
      }

      // 「おまかせ」の場合、ランダムなキーを選択（通常は作成時に決定済みだがフォールバック）
      if (finalMusicalKey === 'random') {
        finalMusicalKey = AVAILABLE_KEYS[Math.floor(Math.random() * AVAILABLE_KEYS.length)];
      }

      // 並行調フォーマットをそのまま使用
      const kitKey = finalMusicalKey;

      for (const sticker of stickers) {
        // 画像が未設定の場合はエラー
        if (!sticker.image_uploaded) {
          return res.status(400).json({
            error: `シール「${sticker.name}」に画像が設定されていません`,
            stickerId: sticker.id,
          });
        }

        // 音声が未設定の場合、ライブラリからランダム割り当て
        if (!sticker.audio_uploaded) {
          const isPercussion = sticker.is_percussion === 1;
          const randomSound = getRandomMatchingSound(kitKey, isPercussion);

          if (!randomSound) {
            return res.status(400).json({
              error: `シール「${sticker.name}」に適合する音声がライブラリにありません。音声をアップロードするか、ライブラリに音声ファイルを追加してください。`,
              stickerId: sticker.id,
            });
          }

          // ライブラリファイルのコピー
          const sourceFile = join(libraryPath, randomSound.file);
          try {
            await access(sourceFile, constants.R_OK);
          } catch {
            return res.status(500).json({
              error: `ライブラリ音声ファイルが見つかりません: ${randomSound.file}`,
            });
          }

          const dirPath = join(projectRoot, 'public', 'assets', 'audio', `kit-${currentKit.kit_number}`);
          const destFile = join(dirPath, `${sticker.full_id}.mp3`);

          await mkdir(dirPath, { recursive: true });
          await copyFile(sourceFile, destFile);

          // データベース更新
          db.prepare(`
            UPDATE stickers
            SET audio_uploaded = 1, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(sticker.id);

          fallbackResults.push({
            stickerId: sticker.id,
            stickerName: sticker.name,
            assignedSound: randomSound.nameJa || randomSound.name,
          });
        }
      }

      // サムネイル画像を生成
      try {
        await generateKitThumbnail(kitId, currentKit.kit_number, currentKit.color);
      } catch (thumbnailError) {
        console.error('Thumbnail generation failed:', thumbnailError);
        // サムネイル生成失敗は公開をブロックしない（警告のみ）
      }
    }

    // 公開時は確定したキーを保存、それ以外は元のmusicalKeyを使用
    const keyToSave = (status === 'published') ? finalMusicalKey : musicalKey;

    db.prepare(`
      UPDATE kits
      SET name = COALESCE(?, name),
          name_ja = COALESCE(?, name_ja),
          description = COALESCE(?, description),
          color = COALESCE(?, color),
          musical_key = COALESCE(?, musical_key),
          status = COALESCE(?, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, nameJa, description, color, keyToSave, status, kitId);

    const kit = db.prepare('SELECT * FROM kits WHERE id = ?').get(kitId);

    res.json({
      kit,
      fallbackAssignments: fallbackResults.length > 0 ? fallbackResults : undefined,
    });
  } catch (error) {
    console.error('Update kit error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

/**
 * DELETE /api/kits/:kitId
 * キット削除
 */
router.delete('/:kitId', authenticateToken, (req, res) => {
  try {
    const { kitId } = req.params;

    const ownership = checkKitOwnership(kitId, req.user.id, req.user.role);
    if (ownership.error) {
      return res.status(ownership.status).json({ error: ownership.error });
    }

    db.prepare('DELETE FROM kits WHERE id = ?').run(kitId);

    res.json({ message: 'Kit deleted successfully' });
  } catch (error) {
    console.error('Delete kit error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/kits/:kitId/regenerate-thumbnail
 * サムネイル再生成
 */
router.post('/:kitId/regenerate-thumbnail', authenticateToken, async (req, res) => {
  try {
    const { kitId } = req.params;

    const ownership = checkKitOwnership(kitId, req.user.id, req.user.role);
    if (ownership.error) {
      return res.status(ownership.status).json({ error: ownership.error });
    }

    const kit = db.prepare('SELECT * FROM kits WHERE id = ?').get(kitId);
    if (!kit) {
      return res.status(404).json({ error: 'Kit not found' });
    }

    await generateKitThumbnail(kitId, kit.kit_number, kit.color);

    res.json({
      message: 'Thumbnail regenerated successfully',
      thumbnailPath: `/assets/thumbnails/kit-${kit.kit_number}.png?t=${Date.now()}`,
    });
  } catch (error) {
    console.error('Regenerate thumbnail error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ================================
// シールAPI
// ================================

/**
 * GET /api/kits/:kitId/stickers
 * シール一覧取得
 */
router.get('/:kitId/stickers', authenticateToken, (req, res) => {
  try {
    const { kitId } = req.params;

    const ownership = checkKitOwnership(kitId, req.user.id, req.user.role);
    if (ownership.error) {
      return res.status(ownership.status).json({ error: ownership.error });
    }

    const stickers = db.prepare(`
      SELECT * FROM stickers WHERE kit_id = ? ORDER BY sort_order, sticker_number
    `).all(kitId);

    res.json({ stickers });
  } catch (error) {
    console.error('Get stickers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/kits/:kitId/stickers
 * シール追加
 */
router.post('/:kitId/stickers', authenticateToken, (req, res) => {
  try {
    const { kitId } = req.params;
    const { name, nameJa, color, isPercussion } = req.body;

    const ownership = checkKitOwnership(kitId, req.user.id, req.user.role);
    if (ownership.error) {
      return res.status(ownership.status).json({ error: ownership.error });
    }

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const kit = db.prepare('SELECT kit_number FROM kits WHERE id = ?').get(kitId);
    const id = uuidv4();
    const stickerNumber = getNextStickerNumber(kitId);
    const fullId = `${kit.kit_number}-${stickerNumber}`;

    // 現在の最大sort_orderを取得
    const maxOrder = db.prepare('SELECT MAX(sort_order) as max FROM stickers WHERE kit_id = ?').get(kitId);
    const sortOrder = (maxOrder?.max ?? -1) + 1;

    db.prepare(`
      INSERT INTO stickers (id, kit_id, sticker_number, full_id, name, name_ja, color, is_percussion, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, kitId, stickerNumber, fullId, name, nameJa || null, color || '#CCCCCC', isPercussion ? 1 : 0, sortOrder);

    const sticker = db.prepare('SELECT * FROM stickers WHERE id = ?').get(id);

    res.status(201).json({ sticker });
  } catch (error) {
    console.error('Create sticker error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/kits/:kitId/stickers/:stickerId
 * シール更新
 */
router.put('/:kitId/stickers/:stickerId', authenticateToken, (req, res) => {
  try {
    const { kitId, stickerId } = req.params;
    const { name, nameJa, color, isPercussion, sortOrder, layoutX, layoutY, layoutSize, layoutRotation, layoutCount } = req.body;

    const ownership = checkKitOwnership(kitId, req.user.id, req.user.role);
    if (ownership.error) {
      return res.status(ownership.status).json({ error: ownership.error });
    }

    const sticker = db.prepare('SELECT * FROM stickers WHERE id = ? AND kit_id = ?').get(stickerId, kitId);
    if (!sticker) {
      return res.status(404).json({ error: 'Sticker not found' });
    }

    db.prepare(`
      UPDATE stickers
      SET name = COALESCE(?, name),
          name_ja = COALESCE(?, name_ja),
          color = COALESCE(?, color),
          is_percussion = COALESCE(?, is_percussion),
          sort_order = COALESCE(?, sort_order),
          layout_x = COALESCE(?, layout_x),
          layout_y = COALESCE(?, layout_y),
          layout_size = COALESCE(?, layout_size),
          layout_rotation = COALESCE(?, layout_rotation),
          layout_count = COALESCE(?, layout_count),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name,
      nameJa,
      color,
      isPercussion !== undefined ? (isPercussion ? 1 : 0) : null,
      sortOrder,
      layoutX,
      layoutY,
      layoutSize,
      layoutRotation,
      layoutCount,
      stickerId
    );

    const updatedSticker = db.prepare('SELECT * FROM stickers WHERE id = ?').get(stickerId);

    res.json({ sticker: updatedSticker });
  } catch (error) {
    console.error('Update sticker error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/kits/:kitId/stickers/:stickerId
 * シール削除
 */
router.delete('/:kitId/stickers/:stickerId', authenticateToken, (req, res) => {
  try {
    const { kitId, stickerId } = req.params;

    const ownership = checkKitOwnership(kitId, req.user.id, req.user.role);
    if (ownership.error) {
      return res.status(ownership.status).json({ error: ownership.error });
    }

    const sticker = db.prepare('SELECT * FROM stickers WHERE id = ? AND kit_id = ?').get(stickerId, kitId);
    if (!sticker) {
      return res.status(404).json({ error: 'Sticker not found' });
    }

    db.prepare('DELETE FROM stickers WHERE id = ?').run(stickerId);

    res.json({ message: 'Sticker deleted successfully' });
  } catch (error) {
    console.error('Delete sticker error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ================================
// シールレイアウトAPI
// ================================

/**
 * GET /api/kits/:kitId/stickers/:stickerId/layouts
 * シールのレイアウト一覧取得
 */
router.get('/:kitId/stickers/:stickerId/layouts', authenticateToken, (req, res) => {
  try {
    const { kitId, stickerId } = req.params;

    const ownership = checkKitOwnership(kitId, req.user.id, req.user.role);
    if (ownership.error) {
      return res.status(ownership.status).json({ error: ownership.error });
    }

    const sticker = db.prepare('SELECT * FROM stickers WHERE id = ? AND kit_id = ?').get(stickerId, kitId);
    if (!sticker) {
      return res.status(404).json({ error: 'Sticker not found' });
    }

    const layouts = db.prepare('SELECT * FROM sticker_layouts WHERE sticker_id = ? ORDER BY sort_order').all(stickerId);

    res.json({ layouts });
  } catch (error) {
    console.error('Get sticker layouts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/kits/:kitId/stickers/:stickerId/layouts
 * シールレイアウト追加（複製）
 */
router.post('/:kitId/stickers/:stickerId/layouts', authenticateToken, (req, res) => {
  try {
    const { kitId, stickerId } = req.params;
    const { x, y, size, rotation } = req.body;

    const ownership = checkKitOwnership(kitId, req.user.id, req.user.role);
    if (ownership.error) {
      return res.status(ownership.status).json({ error: ownership.error });
    }

    const kit = db.prepare('SELECT * FROM kits WHERE id = ?').get(kitId);
    if (kit.status === 'published' && req.user.role !== 'admin') {
      return res.status(400).json({ error: 'Cannot modify published kit' });
    }

    const sticker = db.prepare('SELECT * FROM stickers WHERE id = ? AND kit_id = ?').get(stickerId, kitId);
    if (!sticker) {
      return res.status(404).json({ error: 'Sticker not found' });
    }

    // 既存レイアウトの最大sort_orderを取得
    const maxOrder = db.prepare('SELECT MAX(sort_order) as max FROM sticker_layouts WHERE sticker_id = ?').get(stickerId);
    const sortOrder = (maxOrder?.max ?? -1) + 1;

    const layoutId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO sticker_layouts (id, sticker_id, x, y, size, rotation, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(layoutId, stickerId, x ?? 10, y ?? 10, size ?? 80, rotation ?? 0, sortOrder);

    const layout = db.prepare('SELECT * FROM sticker_layouts WHERE id = ?').get(layoutId);

    res.status(201).json({ layout });
  } catch (error) {
    console.error('Create sticker layout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/kits/:kitId/stickers/:stickerId/layouts/:layoutId
 * シールレイアウト更新
 */
router.put('/:kitId/stickers/:stickerId/layouts/:layoutId', authenticateToken, (req, res) => {
  try {
    const { kitId, stickerId, layoutId } = req.params;
    const { x, y, size, rotation } = req.body;

    const ownership = checkKitOwnership(kitId, req.user.id, req.user.role);
    if (ownership.error) {
      return res.status(ownership.status).json({ error: ownership.error });
    }

    const kit = db.prepare('SELECT * FROM kits WHERE id = ?').get(kitId);
    if (kit.status === 'published' && req.user.role !== 'admin') {
      return res.status(400).json({ error: 'Cannot modify published kit' });
    }

    const layout = db.prepare(`
      SELECT sl.* FROM sticker_layouts sl
      JOIN stickers s ON sl.sticker_id = s.id
      WHERE sl.id = ? AND s.id = ? AND s.kit_id = ?
    `).get(layoutId, stickerId, kitId);

    if (!layout) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    db.prepare(`
      UPDATE sticker_layouts
      SET x = COALESCE(?, x),
          y = COALESCE(?, y),
          size = COALESCE(?, size),
          rotation = COALESCE(?, rotation)
      WHERE id = ?
    `).run(x, y, size, rotation, layoutId);

    const updatedLayout = db.prepare('SELECT * FROM sticker_layouts WHERE id = ?').get(layoutId);

    res.json({ layout: updatedLayout });
  } catch (error) {
    console.error('Update sticker layout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/kits/:kitId/stickers/:stickerId/layouts/:layoutId
 * シールレイアウト削除
 */
router.delete('/:kitId/stickers/:stickerId/layouts/:layoutId', authenticateToken, (req, res) => {
  try {
    const { kitId, stickerId, layoutId } = req.params;

    const ownership = checkKitOwnership(kitId, req.user.id, req.user.role);
    if (ownership.error) {
      return res.status(ownership.status).json({ error: ownership.error });
    }

    const kit = db.prepare('SELECT * FROM kits WHERE id = ?').get(kitId);
    if (kit.status === 'published' && req.user.role !== 'admin') {
      return res.status(400).json({ error: 'Cannot modify published kit' });
    }

    const layout = db.prepare(`
      SELECT sl.* FROM sticker_layouts sl
      JOIN stickers s ON sl.sticker_id = s.id
      WHERE sl.id = ? AND s.id = ? AND s.kit_id = ?
    `).get(layoutId, stickerId, kitId);

    if (!layout) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    db.prepare('DELETE FROM sticker_layouts WHERE id = ?').run(layoutId);

    res.json({ message: 'Layout deleted successfully' });
  } catch (error) {
    console.error('Delete sticker layout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ================================
// ファイルアップロードAPI
// ================================

/**
 * POST /api/kits/:kitId/stickers/:stickerId/image
 * シール画像アップロード
 */
router.post('/:kitId/stickers/:stickerId/image', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { kitId, stickerId } = req.params;

    const ownership = checkKitOwnership(kitId, req.user.id, req.user.role);
    if (ownership.error) {
      return res.status(ownership.status).json({ error: ownership.error });
    }

    const sticker = db.prepare('SELECT * FROM stickers WHERE id = ? AND kit_id = ?').get(stickerId, kitId);
    if (!sticker) {
      return res.status(404).json({ error: 'Sticker not found' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    // 画像形式チェック
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Invalid image type. Allowed: PNG, JPEG, WebP' });
    }

    const kit = db.prepare('SELECT kit_number FROM kits WHERE id = ?').get(kitId);
    const dirPath = join(projectRoot, 'public', 'assets', 'stickers', `kit-${kit.kit_number}`);
    const filePath = join(dirPath, `${sticker.full_id}.png`);

    // ディレクトリ作成
    await mkdir(dirPath, { recursive: true });

    // ファイル保存
    await writeFile(filePath, req.file.buffer);

    // データベース更新
    db.prepare('UPDATE stickers SET image_uploaded = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(stickerId);

    const updatedSticker = db.prepare('SELECT * FROM stickers WHERE id = ?').get(stickerId);

    res.json({
      sticker: updatedSticker,
      imagePath: `/assets/stickers/kit-${kit.kit_number}/${sticker.full_id}.png`
    });
  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/kits/:kitId/stickers/:stickerId/audio-from-library
 * ライブラリ音声をシールに割り当て
 */
router.post('/:kitId/stickers/:stickerId/audio-from-library', authenticateToken, async (req, res) => {
  try {
    const { kitId, stickerId } = req.params;
    const { soundId } = req.body;

    if (!soundId) {
      return res.status(400).json({ error: 'soundId is required' });
    }

    const ownership = checkKitOwnership(kitId, req.user.id, req.user.role);
    if (ownership.error) {
      return res.status(ownership.status).json({ error: ownership.error });
    }

    const sticker = db.prepare('SELECT * FROM stickers WHERE id = ? AND kit_id = ?').get(stickerId, kitId);
    if (!sticker) {
      return res.status(404).json({ error: 'Sticker not found' });
    }

    // ライブラリから音声を検索
    let librarySound = null;
    for (const sounds of Object.values(AUDIO_LIBRARY)) {
      const found = sounds.find(s => s.id === soundId);
      if (found) {
        librarySound = found;
        break;
      }
    }

    if (!librarySound) {
      return res.status(404).json({ error: 'Library sound not found' });
    }

    // ライブラリファイルの存在確認
    const sourceFile = join(libraryPath, librarySound.file);
    try {
      await access(sourceFile, constants.R_OK);
    } catch {
      return res.status(404).json({ error: 'Library audio file not available' });
    }

    // コピー先のパスを準備（常に.mp3として保存）
    const kit = db.prepare('SELECT kit_number FROM kits WHERE id = ?').get(kitId);
    const dirPath = join(projectRoot, 'public', 'assets', 'audio', `kit-${kit.kit_number}`);
    const destFile = join(dirPath, `${sticker.full_id}.mp3`);

    // ディレクトリ作成
    await mkdir(dirPath, { recursive: true });

    // ファイルをコピー
    await copyFile(sourceFile, destFile);

    // データベース更新（is_percussionも更新）
    db.prepare(`
      UPDATE stickers
      SET audio_uploaded = 1,
          is_percussion = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(librarySound.isPercussion ? 1 : 0, stickerId);

    const updatedSticker = db.prepare('SELECT * FROM stickers WHERE id = ?').get(stickerId);

    res.json({
      sticker: updatedSticker,
      audioPath: `/assets/audio/kit-${kit.kit_number}/${sticker.full_id}.mp3`,
      sourceSound: librarySound,
    });
  } catch (error) {
    console.error('Assign library audio error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/kits/:kitId/stickers/:stickerId/audio
 * シール音声アップロード
 */
router.post('/:kitId/stickers/:stickerId/audio', authenticateToken, upload.single('audio'), async (req, res) => {
  try {
    const { kitId, stickerId } = req.params;

    const ownership = checkKitOwnership(kitId, req.user.id, req.user.role);
    if (ownership.error) {
      return res.status(ownership.status).json({ error: ownership.error });
    }

    const sticker = db.prepare('SELECT * FROM stickers WHERE id = ? AND kit_id = ?').get(stickerId, kitId);
    if (!sticker) {
      return res.status(404).json({ error: 'Sticker not found' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    // 音声形式チェック（application/octet-streamも許可 - ファイル名で判定）
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav', 'application/octet-stream'];
    const allowedExtensions = ['.mp3', '.wav'];
    const ext = req.file.originalname.toLowerCase().slice(req.file.originalname.lastIndexOf('.'));

    if (!allowedTypes.includes(req.file.mimetype) && !allowedExtensions.includes(ext)) {
      return res.status(400).json({ error: 'Invalid audio type. Allowed: MP3, WAV' });
    }

    const kit = db.prepare('SELECT kit_number FROM kits WHERE id = ?').get(kitId);
    const dirPath = join(projectRoot, 'public', 'assets', 'audio', `kit-${kit.kit_number}`);
    const filePath = join(dirPath, `${sticker.full_id}.mp3`);

    // ディレクトリ作成
    await mkdir(dirPath, { recursive: true });

    // ファイル保存
    await writeFile(filePath, req.file.buffer);

    // データベース更新
    db.prepare('UPDATE stickers SET audio_uploaded = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(stickerId);

    const updatedSticker = db.prepare('SELECT * FROM stickers WHERE id = ?').get(stickerId);

    res.json({
      sticker: updatedSticker,
      audioPath: `/assets/audio/kit-${kit.kit_number}/${sticker.full_id}.mp3`
    });
  } catch (error) {
    console.error('Upload audio error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
