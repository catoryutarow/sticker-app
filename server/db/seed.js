/**
 * 初期キット・シールデータをDBに追加するスクリプト
 * 実行: node server/db/seed.js
 */

import db from './index.js';
import { v4 as uuidv4 } from 'uuid';

// 初期キットデータ（フロントエンドのkitConfig.tsと同期）
// musical_keyは並行調フォーマット（メジャー/マイナー）
const INITIAL_KITS = [
  { kit_number: '001', name: 'Basic Shapes', name_ja: 'ベーシック', color: '#FFE4E1', musical_key: 'C/Am' },
  { kit_number: '002', name: 'Holographic', name_ja: 'ホログラム', color: '#E6E6FA', musical_key: 'D/Bm' },
  { kit_number: '003', name: 'Neon', name_ja: 'ネオン', color: '#E0FFE0', musical_key: 'Bb/Gm' },
];

// 初期シールデータ（フロントエンドのstickerConfig.tsと同期）
const INITIAL_STICKERS = [
  // === kit-001 ===
  { full_id: '001-001', name: 'Star', name_ja: 'スター', color: '#FFD700', is_percussion: 1 },
  { full_id: '001-002', name: 'Heart', name_ja: 'ハート', color: '#FF69B4', is_percussion: 0 },
  { full_id: '001-003', name: 'Circle', name_ja: 'サークル', color: '#87CEEB', is_percussion: 0 },
  { full_id: '001-004', name: 'Square', name_ja: 'スクエア', color: '#90EE90', is_percussion: 0 },
  { full_id: '001-005', name: 'Triangle', name_ja: 'トライアングル', color: '#DDA0DD', is_percussion: 0 },
  { full_id: '001-006', name: 'Flower', name_ja: 'フラワー', color: '#FFB6C1', is_percussion: 1 },

  // === kit-002 ===
  { full_id: '002-001', name: 'Sticker 1', name_ja: 'シール1', color: '#FF6B6B', is_percussion: 1 },
  { full_id: '002-002', name: 'Sticker 2', name_ja: 'シール2', color: '#4ECDC4', is_percussion: 1 },
  { full_id: '002-003', name: 'Sticker 3', name_ja: 'シール3', color: '#45B7D1', is_percussion: 0 },
  { full_id: '002-004', name: 'Sticker 4', name_ja: 'シール4', color: '#96CEB4', is_percussion: 0 },
  { full_id: '002-005', name: 'Sticker 5', name_ja: 'シール5', color: '#FFEAA7', is_percussion: 0 },
  { full_id: '002-006', name: 'Sticker 6', name_ja: 'シール6', color: '#DDA0DD', is_percussion: 1 },
  { full_id: '002-007', name: 'Sticker 7', name_ja: 'シール7', color: '#98D8C8', is_percussion: 0 },
  { full_id: '002-008', name: 'Sticker 8', name_ja: 'シール8', color: '#F7DC6F', is_percussion: 0 },

  // === kit-003 ===
  { full_id: '003-001', name: 'Sticker 1', name_ja: 'シール1', color: '#00FF88', is_percussion: 1 },
  { full_id: '003-002', name: 'Sticker 2', name_ja: 'シール2', color: '#FF00AA', is_percussion: 0 },
  { full_id: '003-003', name: 'Sticker 3', name_ja: 'シール3', color: '#00AAFF', is_percussion: 0 },
  { full_id: '003-004', name: 'Sticker 4', name_ja: 'シール4', color: '#FFAA00', is_percussion: 0 },
  { full_id: '003-005', name: 'Sticker 5', name_ja: 'シール5', color: '#AA00FF', is_percussion: 0 },
  { full_id: '003-006', name: 'Sticker 6', name_ja: 'シール6', color: '#00FFAA', is_percussion: 0 },
  { full_id: '003-007', name: 'Sticker 7', name_ja: 'シール7', color: '#FF5500', is_percussion: 1 },
  { full_id: '003-008', name: 'Sticker 8', name_ja: 'シール8', color: '#55FF00', is_percussion: 0 },
];

// adminユーザーのIDを取得（なければ作成）
function getAdminUserId() {
  const admin = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
  if (admin) {
    return admin.id;
  }
  // adminがいなければ、最初のユーザーを使用
  const anyUser = db.prepare("SELECT id FROM users LIMIT 1").get();
  if (anyUser) {
    return anyUser.id;
  }
  // ユーザーがいなければnullを返す
  return null;
}

function seed() {
  const adminId = getAdminUserId();
  if (!adminId) {
    console.error('Error: No users found. Please create an admin user first.');
    console.log('Run the server with ADMIN_EMAIL and ADMIN_PASSWORD environment variables.');
    process.exit(1);
  }

  console.log('Using admin user ID:', adminId);

  // キットIDのマッピング（kit_number -> id）
  const kitIdMap = new Map();

  // キットを追加
  const insertKit = db.prepare(`
    INSERT OR IGNORE INTO kits (id, kit_number, name, name_ja, color, musical_key, creator_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'published')
  `);

  for (const kit of INITIAL_KITS) {
    // 既存のキットをチェック
    const existing = db.prepare('SELECT id FROM kits WHERE kit_number = ?').get(kit.kit_number);
    if (existing) {
      console.log(`Kit ${kit.kit_number} already exists, skipping...`);
      kitIdMap.set(kit.kit_number, existing.id);
      continue;
    }

    const kitId = uuidv4();
    insertKit.run(kitId, kit.kit_number, kit.name, kit.name_ja, kit.color, kit.musical_key, adminId);
    kitIdMap.set(kit.kit_number, kitId);
    console.log(`Created kit: ${kit.name_ja} (${kit.kit_number})`);
  }

  // シールを追加
  const insertSticker = db.prepare(`
    INSERT OR IGNORE INTO stickers (id, kit_id, sticker_number, full_id, name, name_ja, color, is_percussion, image_uploaded, audio_uploaded, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?)
  `);

  // シールを追加してIDを記録
  const stickerIdMap = new Map();

  let stickerOrder = 0;
  for (const sticker of INITIAL_STICKERS) {
    // 既存のシールをチェック
    const existing = db.prepare('SELECT id FROM stickers WHERE full_id = ?').get(sticker.full_id);
    if (existing) {
      console.log(`Sticker ${sticker.full_id} already exists, skipping...`);
      stickerIdMap.set(sticker.full_id, existing.id);
      continue;
    }

    const [kitNumber, stickerNumber] = sticker.full_id.split('-');
    const kitId = kitIdMap.get(kitNumber);

    if (!kitId) {
      console.error(`Kit ${kitNumber} not found for sticker ${sticker.full_id}`);
      continue;
    }

    const stickerId = uuidv4();
    insertSticker.run(
      stickerId,
      kitId,
      stickerNumber,
      sticker.full_id,
      sticker.name,
      sticker.name_ja,
      sticker.color,
      sticker.is_percussion,
      stickerOrder++
    );
    stickerIdMap.set(sticker.full_id, stickerId);
    console.log(`Created sticker: ${sticker.name_ja} (${sticker.full_id})`);
  }

  // レイアウトを追加（各シールにデフォルトレイアウトを1つ作成）
  const insertLayout = db.prepare(`
    INSERT OR IGNORE INTO sticker_layouts (id, sticker_id, x, y, size, rotation, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // デフォルトレイアウト位置（パレット内でバランスよく配置）
  const DEFAULT_LAYOUTS = {
    '001': [
      { full_id: '001-001', x: 25, y: 20, size: 70, rotation: -5 },
      { full_id: '001-002', x: 75, y: 15, size: 65, rotation: 8 },
      { full_id: '001-003', x: 20, y: 50, size: 60, rotation: -3 },
      { full_id: '001-004', x: 70, y: 45, size: 75, rotation: 5 },
      { full_id: '001-005', x: 30, y: 80, size: 55, rotation: -8 },
      { full_id: '001-006', x: 75, y: 75, size: 65, rotation: 10 },
    ],
    '002': [
      { full_id: '002-001', x: 20, y: 15, size: 60, rotation: -5 },
      { full_id: '002-002', x: 60, y: 12, size: 55, rotation: 8 },
      { full_id: '002-003', x: 85, y: 25, size: 50, rotation: -3 },
      { full_id: '002-004', x: 15, y: 45, size: 65, rotation: 5 },
      { full_id: '002-005', x: 50, y: 40, size: 70, rotation: -8 },
      { full_id: '002-006', x: 80, y: 55, size: 55, rotation: 10 },
      { full_id: '002-007', x: 25, y: 80, size: 60, rotation: -5 },
      { full_id: '002-008', x: 70, y: 85, size: 65, rotation: 5 },
    ],
    '003': [
      { full_id: '003-001', x: 25, y: 18, size: 60, rotation: 5 },
      { full_id: '003-002', x: 70, y: 15, size: 55, rotation: -8 },
      { full_id: '003-003', x: 15, y: 45, size: 65, rotation: 3 },
      { full_id: '003-004', x: 55, y: 38, size: 70, rotation: -5 },
      { full_id: '003-005', x: 85, y: 50, size: 50, rotation: 8 },
      { full_id: '003-006', x: 20, y: 75, size: 55, rotation: -3 },
      { full_id: '003-007', x: 55, y: 80, size: 60, rotation: 5 },
      { full_id: '003-008', x: 85, y: 85, size: 55, rotation: -5 },
    ],
  };

  let layoutOrder = 0;
  for (const [kitNumber, layouts] of Object.entries(DEFAULT_LAYOUTS)) {
    for (const layout of layouts) {
      const stickerId = stickerIdMap.get(layout.full_id);
      if (!stickerId) {
        console.error(`Sticker ${layout.full_id} not found for layout`);
        continue;
      }

      // 既存レイアウトをチェック
      const existingLayout = db.prepare('SELECT id FROM sticker_layouts WHERE sticker_id = ?').get(stickerId);
      if (existingLayout) {
        console.log(`Layout for ${layout.full_id} already exists, skipping...`);
        continue;
      }

      const layoutId = uuidv4();
      insertLayout.run(layoutId, stickerId, layout.x, layout.y, layout.size, layout.rotation, layoutOrder++);
      console.log(`Created layout for: ${layout.full_id}`);
    }
  }

  console.log('\nSeed completed!');
}

seed();
