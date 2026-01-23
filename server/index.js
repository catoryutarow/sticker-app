import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { spawn } from 'child_process';
import { writeFile, unlink, readFile } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { tmpdir } from 'os';

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// CORS設定（本番環境では環境変数で許可オリジンを指定）
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : null;

app.use(cors({
  origin: allowedOrigins ? (origin, callback) => {
    // 同一オリジンまたは許可リストに含まれる場合のみ許可
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  } : true,
  methods: ['GET', 'POST'],
  maxAge: 86400,
}));
app.use(express.json({ limit: '50mb' }));

// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// MP4エンコード
app.post('/encode', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'audio', maxCount: 1 }
]), async (req, res) => {
  const id = randomUUID();
  const tempDir = tmpdir();
  const imagePath = join(tempDir, `${id}.png`);
  const audioPath = join(tempDir, `${id}.wav`);
  const outputPath = join(tempDir, `${id}.mp4`);

  try {
    const { duration = '32', fps = '30' } = req.body;
    const imageFile = req.files?.['image']?.[0];
    const audioFile = req.files?.['audio']?.[0];

    if (!imageFile) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    // 画像を保存
    await writeFile(imagePath, imageFile.buffer);

    // FFmpegコマンドを構築
    const ffmpegArgs = [
      '-y',
      '-loop', '1',
      '-i', imagePath,
    ];

    // 音声がある場合は追加
    if (audioFile) {
      await writeFile(audioPath, audioFile.buffer);
      ffmpegArgs.push('-i', audioPath);
    }

    ffmpegArgs.push(
      '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',  // 幅と高さを偶数に
      '-c:v', 'libx264',
      '-tune', 'stillimage',
      '-pix_fmt', 'yuv420p',
      '-t', String(duration),
      '-r', String(fps),
    );

    if (audioFile) {
      ffmpegArgs.push(
        '-c:a', 'aac',
        '-b:a', '192k',
        '-shortest',
      );
    }

    ffmpegArgs.push(
      '-movflags', '+faststart',
      outputPath
    );

    console.log('FFmpeg command:', 'ffmpeg', ffmpegArgs.join(' '));

    // FFmpegを実行
    await new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', ffmpegArgs);

      let stderr = '';
      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          console.error('FFmpeg stderr:', stderr);
          reject(new Error(`FFmpeg exited with code ${code}`));
        }
      });

      ffmpeg.on('error', reject);
    });

    // 出力ファイルを読み込んで返す
    const mp4Data = await readFile(outputPath);

    res.set({
      'Content-Type': 'video/mp4',
      'Content-Disposition': 'attachment; filename="output.mp4"',
    });
    res.send(mp4Data);

  } catch (error) {
    console.error('Encode error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    // クリーンアップ
    try {
      await unlink(imagePath).catch(() => {});
      await unlink(audioPath).catch(() => {});
      await unlink(outputPath).catch(() => {});
    } catch {}
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Encoder server running on port ${PORT}`);
});
