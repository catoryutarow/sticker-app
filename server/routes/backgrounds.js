import { Router } from 'express';
import { mkdir, writeFile, unlink } from 'fs/promises';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

// Upload config
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

// File save location
const projectRoot = process.env.UPLOAD_DIR
  ? process.env.UPLOAD_DIR
  : join(__dirname, '..', '..');

/**
 * GET /api/backgrounds
 * 全背景を取得（認証不要、公開リソース）
 */
router.get('/', (req, res) => {
  try {
    const backgrounds = db.prepare(`
      SELECT * FROM backgrounds
      ORDER BY sort_order ASC, created_at ASC
    `).all();
    res.json({ backgrounds });
  } catch (error) {
    console.error('Get backgrounds error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/backgrounds
 * 背景アップロード（admin専用）
 * multipart: image file + name + nameJa + isSpecial + specialKitId
 */
router.post('/', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const { name, nameJa, isSpecial, specialKitId } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    // Image type check
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = extname(req.file.originalname).toLowerCase();

    if (!allowedTypes.includes(req.file.mimetype) && !allowedExts.includes(ext)) {
      return res.status(400).json({ error: 'Invalid image type. Allowed: JPG, PNG, WebP' });
    }

    // Validate special kit ID if provided
    const isSpecialFlag = isSpecial === 'true' || isSpecial === true || isSpecial === 1;
    let finalSpecialKitId = null;
    if (isSpecialFlag) {
      if (!specialKitId) {
        return res.status(400).json({ error: 'specialKitId is required for special backgrounds' });
      }
      const kit = db.prepare('SELECT id, is_special FROM kits WHERE id = ?').get(specialKitId);
      if (!kit) {
        return res.status(400).json({ error: 'Kit not found' });
      }
      if (!kit.is_special) {
        return res.status(400).json({ error: 'Selected kit is not a special kit' });
      }
      finalSpecialKitId = specialKitId;
    }

    // Save file
    const id = uuidv4();
    const filename = `bg-${id}${ext || '.jpg'}`;
    const dirPath = join(projectRoot, 'public', 'backgrounds');
    await mkdir(dirPath, { recursive: true });
    await writeFile(join(dirPath, filename), req.file.buffer);

    // Get max sort_order
    const maxSort = db.prepare('SELECT MAX(sort_order) as max FROM backgrounds').get();
    const sortOrder = (maxSort.max || 0) + 1;

    // Insert DB record
    db.prepare(`
      INSERT INTO backgrounds (id, name, name_ja, filename, is_special, special_kit_id, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, nameJa || null, filename, isSpecialFlag ? 1 : 0, finalSpecialKitId, sortOrder);

    const background = db.prepare('SELECT * FROM backgrounds WHERE id = ?').get(id);
    res.json({ background });
  } catch (error) {
    console.error('Upload background error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/backgrounds/:id
 * 背景削除（admin専用）
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const { id } = req.params;
    const background = db.prepare('SELECT * FROM backgrounds WHERE id = ?').get(id);
    if (!background) {
      return res.status(404).json({ error: 'Background not found' });
    }

    // Don't delete legacy seeded backgrounds (default, panel, p0436) files
    const legacyIds = ['default', 'panel', 'p0436'];
    if (!legacyIds.includes(id)) {
      try {
        const filePath = join(projectRoot, 'public', 'backgrounds', background.filename);
        await unlink(filePath);
      } catch (e) {
        console.warn('Failed to delete file:', e.message);
      }
    }

    db.prepare('DELETE FROM backgrounds WHERE id = ?').run(id);
    res.json({ message: 'Background deleted' });
  } catch (error) {
    console.error('Delete background error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
