import sharp from 'sharp';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import db from '../db/index.js';

const projectRoot = join(import.meta.dirname, '../..');

// サムネイルサイズ（LayoutPreviewのカードサイズと同じ）
const THUMBNAIL_WIDTH = 280;
const THUMBNAIL_HEIGHT = 420;

// LayoutPreviewのシール配置領域サイズ
// カード: 280x420px、シール領域: pt-10(40px) + 380px高さ
const STICKER_AREA_WIDTH = 280;
const STICKER_AREA_HEIGHT = 380;
const STICKER_AREA_TOP_OFFSET = 40; // pt-10 = 40px（キット名ラベル等の領域）

/**
 * グラデーション背景のSVGを生成
 */
function createGradientSvg(color, width, height) {
  // カラーコードからRGB値を抽出
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:rgba(${r},${g},${b},0.25)"/>
          <stop offset="100%" style="stop-color:rgba(${r},${g},${b},0.125)"/>
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#grad)"/>
    </svg>
  `);
}

/**
 * キットのサムネイル画像を生成
 * @param {string} kitId - キットID
 * @param {string} kitNumber - キット番号（例: '005'）
 * @param {string} color - キットのテーマカラー（例: '#FF6B6B'）
 * @returns {Promise<string>} - 保存先パス
 */
export async function generateKitThumbnail(kitId, kitNumber, color) {
  // sticker_layoutsからレイアウト情報を取得
  const layouts = db.prepare(`
    SELECT sl.id, sl.x, sl.y, sl.size, sl.rotation,
           s.full_id, s.image_uploaded
    FROM sticker_layouts sl
    JOIN stickers s ON sl.sticker_id = s.id
    WHERE s.kit_id = ?
    ORDER BY sl.sort_order
  `).all(kitId);

  // 背景画像を作成
  const gradientSvg = createGradientSvg(color, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
  let composite = sharp(gradientSvg);

  // 合成するレイヤーを準備
  const compositeInputs = [];

  for (const layout of layouts) {
    if (!layout.image_uploaded) continue;

    const stickerPath = join(
      projectRoot,
      'public',
      'assets',
      'stickers',
      `kit-${kitNumber}`,
      `${layout.full_id}.png`
    );

    try {
      // シールのサイズを計算
      // LayoutPreviewではsizeはピクセル値としてそのまま使用される
      // サムネイルではシール配置領域と同じサイズなのでそのまま使用
      const size = Math.round(layout.size);

      // シール画像を読み込み、リサイズ・回転
      let stickerImage = sharp(stickerPath)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } });

      // 回転がある場合は適用
      if (layout.rotation !== 0) {
        stickerImage = stickerImage.rotate(layout.rotation, {
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        });
      }

      const stickerBuffer = await stickerImage.toBuffer();

      // 回転後の画像サイズを取得
      const rotatedMeta = await sharp(stickerBuffer).metadata();

      // 位置を計算
      // CSS: left: X%, top: Y% はコンテナ（280x380）に対するパーセンテージで左上隅を配置
      // サムネイル: 上部40pxはキット名ラベル領域なのでオフセット
      let left = Math.round((layout.x / 100) * STICKER_AREA_WIDTH);
      let top = Math.round(STICKER_AREA_TOP_OFFSET + (layout.y / 100) * STICKER_AREA_HEIGHT);

      // 端にはみ出す場合はシール画像をクロップして配置
      // これによりCSSのoverflow:hiddenと同様の挙動を再現
      let cropLeft = 0;
      let cropTop = 0;
      let cropWidth = rotatedMeta.width;
      let cropHeight = rotatedMeta.height;

      // 左端がはみ出す場合
      if (left < 0) {
        cropLeft = -left;
        cropWidth -= cropLeft;
        left = 0;
      }
      // 上端がはみ出す場合
      if (top < 0) {
        cropTop = -top;
        cropHeight -= cropTop;
        top = 0;
      }
      // 右端がはみ出す場合
      if (left + cropWidth > THUMBNAIL_WIDTH) {
        cropWidth = THUMBNAIL_WIDTH - left;
      }
      // 下端がはみ出す場合
      if (top + cropHeight > THUMBNAIL_HEIGHT) {
        cropHeight = THUMBNAIL_HEIGHT - top;
      }

      // 有効な領域がある場合のみ追加
      if (cropWidth > 0 && cropHeight > 0) {
        let finalBuffer = stickerBuffer;

        // クロップが必要な場合
        if (cropLeft > 0 || cropTop > 0 || cropWidth !== rotatedMeta.width || cropHeight !== rotatedMeta.height) {
          finalBuffer = await sharp(stickerBuffer)
            .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
            .toBuffer();
        }

        compositeInputs.push({
          input: finalBuffer,
          left,
          top,
        });
      }
    } catch (error) {
      console.warn(`Failed to process sticker ${layout.full_id}:`, error);
    }
  }

  // 全レイヤーを合成
  if (compositeInputs.length > 0) {
    composite = composite.composite(compositeInputs);
  }

  // 保存先ディレクトリを作成
  const thumbnailDir = join(projectRoot, 'public', 'assets', 'thumbnails');
  await mkdir(thumbnailDir, { recursive: true });

  // PNG形式で保存
  const outputPath = join(thumbnailDir, `kit-${kitNumber}.png`);
  await composite.png().toFile(outputPath);

  console.log(`Thumbnail generated: ${outputPath}`);
  return outputPath;
}
