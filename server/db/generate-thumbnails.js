/**
 * 初期キットのサムネイルを生成するスクリプト
 * 実行: node server/db/generate-thumbnails.js
 */

import db from './index.js';
import { generateKitThumbnail } from '../utils/thumbnail.js';

async function generateThumbnails() {
  // 公開済みキットを取得
  const kits = db.prepare("SELECT id, kit_number, color FROM kits WHERE status = 'published'").all();

  console.log(`Found ${kits.length} published kits`);

  for (const kit of kits) {
    try {
      console.log(`Generating thumbnail for kit-${kit.kit_number}...`);
      await generateKitThumbnail(kit.id, kit.kit_number, kit.color);
    } catch (error) {
      console.error(`Failed to generate thumbnail for kit-${kit.kit_number}:`, error);
    }
  }

  console.log('\nThumbnail generation completed!');
}

generateThumbnails();
