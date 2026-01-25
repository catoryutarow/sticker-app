import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { mkdir, writeFile, unlink } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import db from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

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
 * キットの所有者かチェック
 */
const checkKitOwnership = (kitId, userId) => {
  const kit = db.prepare('SELECT creator_id FROM kits WHERE id = ?').get(kitId);
  if (!kit) {
    return { error: 'Kit not found', status: 404 };
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

    res.json({ kits });
  } catch (error) {
    console.error('Get kits error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/kits
 * キット作成
 */
router.post('/', authenticateToken, (req, res) => {
  try {
    const { name, nameJa, description, color, musicalKey } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const id = uuidv4();
    const kitNumber = getNextKitNumber();

    db.prepare(`
      INSERT INTO kits (id, kit_number, name, name_ja, description, color, musical_key, creator_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, kitNumber, name, nameJa || null, description || null, color || '#E0E0E0', musicalKey || 'Am', req.user.id);

    const kit = db.prepare('SELECT * FROM kits WHERE id = ?').get(id);

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

    const ownership = checkKitOwnership(kitId, req.user.id);
    if (ownership.error) {
      return res.status(ownership.status).json({ error: ownership.error });
    }

    const kit = db.prepare('SELECT * FROM kits WHERE id = ?').get(kitId);
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
router.put('/:kitId', authenticateToken, (req, res) => {
  try {
    const { kitId } = req.params;
    const { name, nameJa, description, color, musicalKey, status } = req.body;

    const ownership = checkKitOwnership(kitId, req.user.id);
    if (ownership.error) {
      return res.status(ownership.status).json({ error: ownership.error });
    }

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
    `).run(name, nameJa, description, color, musicalKey, status, kitId);

    const kit = db.prepare('SELECT * FROM kits WHERE id = ?').get(kitId);

    res.json({ kit });
  } catch (error) {
    console.error('Update kit error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/kits/:kitId
 * キット削除
 */
router.delete('/:kitId', authenticateToken, (req, res) => {
  try {
    const { kitId } = req.params;

    const ownership = checkKitOwnership(kitId, req.user.id);
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

    const ownership = checkKitOwnership(kitId, req.user.id);
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

    const ownership = checkKitOwnership(kitId, req.user.id);
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
    const { name, nameJa, color, isPercussion, sortOrder } = req.body;

    const ownership = checkKitOwnership(kitId, req.user.id);
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
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, nameJa, color, isPercussion !== undefined ? (isPercussion ? 1 : 0) : null, sortOrder, stickerId);

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

    const ownership = checkKitOwnership(kitId, req.user.id);
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
// ファイルアップロードAPI
// ================================

/**
 * POST /api/kits/:kitId/stickers/:stickerId/image
 * シール画像アップロード
 */
router.post('/:kitId/stickers/:stickerId/image', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { kitId, stickerId } = req.params;

    const ownership = checkKitOwnership(kitId, req.user.id);
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
 * POST /api/kits/:kitId/stickers/:stickerId/audio
 * シール音声アップロード
 */
router.post('/:kitId/stickers/:stickerId/audio', authenticateToken, upload.single('audio'), async (req, res) => {
  try {
    const { kitId, stickerId } = req.params;

    const ownership = checkKitOwnership(kitId, req.user.id);
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
