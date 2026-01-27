import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import { spawn } from 'child_process';
import { writeFile, unlink, readFile } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { tmpdir } from 'os';
import authRoutes from './routes/auth.js';
import kitRoutes from './routes/kits.js';
import audioLibraryRoutes from './routes/audioLibrary.js';
import adminRoutes from './routes/admin.js';
import tagRoutes from './routes/tags.js';
import worksRoutes from './routes/works.js';

const app = express();

// アップロード制限設定
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const ALLOWED_AUDIO_TYPES = ['audio/wav', 'audio/wave', 'audio/x-wav', 'audio/mpeg', 'audio/mp3'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 2,
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'image') {
      if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Invalid image type: ${file.mimetype}. Allowed: ${ALLOWED_IMAGE_TYPES.join(', ')}`));
      }
    } else if (file.fieldname === 'audio') {
      if (ALLOWED_AUDIO_TYPES.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Invalid audio type: ${file.mimetype}. Allowed: ${ALLOWED_AUDIO_TYPES.join(', ')}`));
      }
    } else {
      cb(new Error(`Unknown field: ${file.fieldname}`));
    }
  },
});

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
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
  maxAge: 86400,
}));
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));

// 認証ルート
app.use('/api/auth', authRoutes);

// キットルート
app.use('/api/kits', kitRoutes);

// 音声ライブラリルート
app.use('/api/audio-library', audioLibraryRoutes);

// 管理者ルート
app.use('/api/admin', adminRoutes);

// タグルート
app.use('/api/tags', tagRoutes);

// 作品ルート
app.use('/api/works', worksRoutes);

// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// エンコードパラメータの検証
const validateEncodeParams = (duration, fps) => {
  const d = parseFloat(duration);
  const f = parseInt(fps, 10);

  if (isNaN(d) || d <= 0 || d > 300) {
    throw new Error('Duration must be between 0 and 300 seconds');
  }
  if (isNaN(f) || f < 1 || f > 60) {
    throw new Error('FPS must be between 1 and 60');
  }

  return { duration: d, fps: f };
};

// FFmpegタイムアウト（5分）
const FFMPEG_TIMEOUT = 5 * 60 * 1000;

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
    const imageFile = req.files?.['image']?.[0];
    const audioFile = req.files?.['audio']?.[0];

    if (!imageFile) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    // パラメータ検証
    const { duration, fps } = validateEncodeParams(
      req.body.duration || '32',
      req.body.fps || '30'
    );

    console.log(`[${id}] Encoding: duration=${duration}s, fps=${fps}, hasAudio=${!!audioFile}`);

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
      '-preset', 'fast',  // エンコード速度優先
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

    // FFmpegを実行（タイムアウト付き）
    await new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', ffmpegArgs);
      let killed = false;

      // タイムアウト設定
      const timeout = setTimeout(() => {
        killed = true;
        ffmpeg.kill('SIGKILL');
        reject(new Error('FFmpeg timeout: encoding took too long'));
      }, FFMPEG_TIMEOUT);

      let stderr = '';
      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        clearTimeout(timeout);
        if (killed) return;

        if (code === 0) {
          console.log(`[${id}] Encoding complete`);
          resolve();
        } else {
          console.error(`[${id}] FFmpeg stderr:`, stderr);
          reject(new Error(`FFmpeg exited with code ${code}`));
        }
      });

      ffmpeg.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
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

// Multerエラーハンドリング
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: `File too large. Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB` });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: err.message });
  }
  next();
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Encoder server running on port ${PORT}`);
  console.log(`Max file size: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  console.log(`FFmpeg timeout: ${FFMPEG_TIMEOUT / 1000}s`);
});
