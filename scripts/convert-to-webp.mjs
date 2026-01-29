// convert-to-webp.mjs - PNG画像をWebPに変換するスクリプト
//
// 使用方法: node scripts/convert-to-webp.mjs
//
// 対象:
// - public/assets/stickers/ (再帰的)
// - public/assets/thumbnails/

import sharp from 'sharp';
import { readdir, stat } from 'fs/promises';
import { join, extname, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const TARGETS = [
  'public/assets/stickers',
  'public/assets/thumbnails',
];

const WEBP_QUALITY = 85; // 品質（80-90が推奨）

async function findPngFiles(dir) {
  const files = [];

  async function scan(currentDir) {
    const entries = await readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await scan(fullPath);
      } else if (entry.isFile() && extname(entry.name).toLowerCase() === '.png') {
        files.push(fullPath);
      }
    }
  }

  await scan(dir);
  return files;
}

async function convertToWebp(pngPath) {
  const webpPath = pngPath.replace(/\.png$/i, '.webp');

  try {
    const pngStats = await stat(pngPath);

    await sharp(pngPath)
      .webp({ quality: WEBP_QUALITY })
      .toFile(webpPath);

    const webpStats = await stat(webpPath);
    const savings = ((1 - webpStats.size / pngStats.size) * 100).toFixed(1);

    console.log(`✓ ${basename(pngPath)} → ${basename(webpPath)} (${savings}% smaller)`);

    return {
      original: pngStats.size,
      converted: webpStats.size,
    };
  } catch (error) {
    console.error(`✗ ${basename(pngPath)}: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('🖼️  PNG → WebP 変換を開始...\n');

  let totalOriginal = 0;
  let totalConverted = 0;
  let fileCount = 0;

  for (const target of TARGETS) {
    const targetPath = join(ROOT, target);

    try {
      const pngFiles = await findPngFiles(targetPath);

      if (pngFiles.length === 0) {
        console.log(`📁 ${target}: PNG ファイルなし`);
        continue;
      }

      console.log(`📁 ${target}: ${pngFiles.length} ファイル`);

      for (const pngFile of pngFiles) {
        const result = await convertToWebp(pngFile);
        if (result) {
          totalOriginal += result.original;
          totalConverted += result.converted;
          fileCount++;
        }
      }

      console.log('');
    } catch (error) {
      console.error(`📁 ${target}: ディレクトリが見つかりません`);
    }
  }

  if (fileCount > 0) {
    const totalSavings = ((1 - totalConverted / totalOriginal) * 100).toFixed(1);
    const originalMB = (totalOriginal / 1024 / 1024).toFixed(2);
    const convertedMB = (totalConverted / 1024 / 1024).toFixed(2);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 合計: ${fileCount} ファイル変換完了`);
    console.log(`   PNG:  ${originalMB} MB`);
    console.log(`   WebP: ${convertedMB} MB`);
    console.log(`   削減: ${totalSavings}%`);
  }
}

main().catch(console.error);
