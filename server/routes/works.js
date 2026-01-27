import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { nanoid } from 'nanoid';
import db from '../db/index.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

/**
 * Generate a unique 8-character share ID
 */
function generateShareId() {
  return nanoid(8);
}

/**
 * Check if the requester owns the work
 * Works can be owned by authenticated users OR anonymous users
 */
function checkWorkOwnership(work, userId, anonymousId) {
  if (userId && work.user_id === userId) {
    return true;
  }
  if (anonymousId && work.anonymous_id === anonymousId) {
    return true;
  }
  return false;
}

// ================================
// Public API (no auth required)
// ================================

/**
 * GET /api/works/:shareId
 * Get a work by its share ID (public)
 */
router.get('/:shareId', async (req, res) => {
  try {
    const { shareId } = req.params;

    const work = db.prepare(`
      SELECT id, share_id, title, stickers_json, background_id, aspect_ratio,
             video_url, thumbnail_url, view_count, created_at, updated_at
      FROM works
      WHERE share_id = ?
    `).get(shareId);

    if (!work) {
      return res.status(404).json({ error: 'Work not found' });
    }

    // Increment view count (fire-and-forget)
    db.prepare(`
      UPDATE works SET view_count = view_count + 1, updated_at = CURRENT_TIMESTAMP
      WHERE share_id = ?
    `).run(shareId);

    // Parse stickers JSON
    const stickers = JSON.parse(work.stickers_json);

    res.json({
      id: work.id,
      shareId: work.share_id,
      title: work.title,
      stickers,
      backgroundId: work.background_id,
      aspectRatio: work.aspect_ratio || '3:4',
      videoUrl: work.video_url,
      thumbnailUrl: work.thumbnail_url,
      viewCount: work.view_count + 1, // Include the current view
      createdAt: work.created_at,
      updatedAt: work.updated_at,
    });
  } catch (error) {
    console.error('Get work error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ================================
// Protected/Optional Auth API
// ================================

/**
 * POST /api/works
 * Save a new work (anonymous or authenticated)
 * Body: { title, stickers, backgroundId, aspectRatio?, anonymousId?, videoUrl?, thumbnailUrl? }
 */
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { title, stickers, backgroundId, aspectRatio, anonymousId, videoUrl, thumbnailUrl } = req.body;

    // Validate required fields
    if (!stickers || !Array.isArray(stickers)) {
      return res.status(400).json({ error: 'Stickers array is required' });
    }

    if (stickers.length === 0) {
      return res.status(400).json({ error: 'At least one sticker is required' });
    }

    const id = uuidv4();
    const shareId = generateShareId();
    const userId = req.user?.userId || null;
    const stickersJson = JSON.stringify(stickers);

    // Validate aspectRatio
    const validAspectRatio = ['3:4', '1:1'].includes(aspectRatio) ? aspectRatio : '3:4';

    db.prepare(`
      INSERT INTO works (id, share_id, anonymous_id, user_id, title, stickers_json, background_id, aspect_ratio, video_url, thumbnail_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      shareId,
      anonymousId || null,
      userId,
      title || '',
      stickersJson,
      backgroundId || 'default',
      validAspectRatio,
      videoUrl || null,
      thumbnailUrl || null
    );

    res.status(201).json({
      id,
      shareId,
      title: title || '',
      stickers,
      backgroundId: backgroundId || 'default',
      aspectRatio: validAspectRatio,
      videoUrl: videoUrl || null,
      thumbnailUrl: thumbnailUrl || null,
      viewCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Save work error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/works/:shareId/video
 * Attach a video URL to an existing work
 * Body: { videoUrl, anonymousId? }
 */
router.put('/:shareId/video', optionalAuth, async (req, res) => {
  try {
    const { shareId } = req.params;
    const { videoUrl, anonymousId } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ error: 'Video URL is required' });
    }

    const work = db.prepare(`
      SELECT id, user_id, anonymous_id FROM works WHERE share_id = ?
    `).get(shareId);

    if (!work) {
      return res.status(404).json({ error: 'Work not found' });
    }

    // Check ownership
    if (!checkWorkOwnership(work, req.user?.userId, anonymousId)) {
      return res.status(403).json({ error: 'Not authorized to update this work' });
    }

    db.prepare(`
      UPDATE works SET video_url = ?, updated_at = CURRENT_TIMESTAMP WHERE share_id = ?
    `).run(videoUrl, shareId);

    res.json({ message: 'Video URL updated successfully' });
  } catch (error) {
    console.error('Update work video error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/works/:shareId
 * Update a work's metadata (title, thumbnail)
 * Body: { title?, thumbnailUrl?, anonymousId? }
 */
router.put('/:shareId', optionalAuth, async (req, res) => {
  try {
    const { shareId } = req.params;
    const { title, thumbnailUrl, anonymousId } = req.body;

    const work = db.prepare(`
      SELECT id, user_id, anonymous_id FROM works WHERE share_id = ?
    `).get(shareId);

    if (!work) {
      return res.status(404).json({ error: 'Work not found' });
    }

    // Check ownership
    if (!checkWorkOwnership(work, req.user?.userId, anonymousId)) {
      return res.status(403).json({ error: 'Not authorized to update this work' });
    }

    // Build update query dynamically
    const updates = [];
    const params = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }
    if (thumbnailUrl !== undefined) {
      updates.push('thumbnail_url = ?');
      params.push(thumbnailUrl);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(shareId);

    db.prepare(`
      UPDATE works SET ${updates.join(', ')} WHERE share_id = ?
    `).run(...params);

    res.json({ message: 'Work updated successfully' });
  } catch (error) {
    console.error('Update work error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/works/:shareId
 * Delete a work (owner only)
 * Query: ?anonymousId=xxx
 */
router.delete('/:shareId', optionalAuth, async (req, res) => {
  try {
    const { shareId } = req.params;
    const { anonymousId } = req.query;

    const work = db.prepare(`
      SELECT id, user_id, anonymous_id FROM works WHERE share_id = ?
    `).get(shareId);

    if (!work) {
      return res.status(404).json({ error: 'Work not found' });
    }

    // Check ownership
    if (!checkWorkOwnership(work, req.user?.userId, anonymousId)) {
      return res.status(403).json({ error: 'Not authorized to delete this work' });
    }

    db.prepare(`DELETE FROM works WHERE share_id = ?`).run(shareId);

    res.json({ message: 'Work deleted successfully' });
  } catch (error) {
    console.error('Delete work error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/works/user/my
 * Get works by the current user (authenticated or anonymous)
 * Query: ?anonymousId=xxx&limit=20&offset=0
 */
router.get('/user/my', optionalAuth, async (req, res) => {
  try {
    const { anonymousId, limit = 20, offset = 0 } = req.query;
    const userId = req.user?.userId;

    if (!userId && !anonymousId) {
      return res.status(400).json({ error: 'Either authentication or anonymousId is required' });
    }

    let whereClause = '';
    const params = [];

    if (userId && anonymousId) {
      // Return works from either authenticated user or anonymous session
      whereClause = 'WHERE user_id = ? OR anonymous_id = ?';
      params.push(userId, anonymousId);
    } else if (userId) {
      whereClause = 'WHERE user_id = ?';
      params.push(userId);
    } else {
      whereClause = 'WHERE anonymous_id = ?';
      params.push(anonymousId);
    }

    const works = db.prepare(`
      SELECT id, share_id, title, stickers_json, background_id, aspect_ratio,
             video_url, thumbnail_url, view_count, created_at, updated_at
      FROM works
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit, 10), parseInt(offset, 10));

    const result = works.map(work => ({
      id: work.id,
      shareId: work.share_id,
      title: work.title,
      stickers: JSON.parse(work.stickers_json),
      backgroundId: work.background_id,
      aspectRatio: work.aspect_ratio || '3:4',
      videoUrl: work.video_url,
      thumbnailUrl: work.thumbnail_url,
      viewCount: work.view_count,
      createdAt: work.created_at,
      updatedAt: work.updated_at,
    }));

    res.json({ works: result });
  } catch (error) {
    console.error('Get my works error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
