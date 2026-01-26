/**
 * デフォルトフォールバックサムネイルを生成するスクリプト
 *
 * 使用方法: node server/utils/generateDefaultThumbnail.js
 *
 * フォールバック画像の差し替え:
 *   public/assets/thumbnails/default.png を任意の280x420pxの画像で置き換えてください
 */

import sharp from 'sharp';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '../..');

const THUMBNAIL_WIDTH = 280;
const THUMBNAIL_HEIGHT = 420;

async function generateDefaultThumbnail() {
  // デフォルトカラー（グレー系）
  const defaultColor = '#9CA3AF';
  const hex = defaultColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const svg = Buffer.from(`
    <svg width="${THUMBNAIL_WIDTH}" height="${THUMBNAIL_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:rgba(${r},${g},${b},0.25)"/>
          <stop offset="100%" style="stop-color:rgba(${r},${g},${b},0.125)"/>
        </linearGradient>
      </defs>
      <rect width="${THUMBNAIL_WIDTH}" height="${THUMBNAIL_HEIGHT}" fill="url(#grad)" rx="8"/>
      <text x="50%" y="50%" text-anchor="middle" fill="rgba(${r},${g},${b},0.5)" font-size="14" font-family="sans-serif">No Preview</text>
    </svg>
  `);

  const thumbnailDir = join(projectRoot, 'public', 'assets', 'thumbnails');
  await mkdir(thumbnailDir, { recursive: true });

  const outputPath = join(thumbnailDir, 'default.png');
  await sharp(svg).png().toFile(outputPath);

  console.log(`Default thumbnail generated: ${outputPath}`);
  console.log('');
  console.log('フォールバック画像を差し替えるには:');
  console.log(`  ${outputPath}`);
  console.log('を280x420pxの画像で置き換えてください。');
}

generateDefaultThumbnail().catch(console.error);
