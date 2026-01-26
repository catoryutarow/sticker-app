import { Router } from 'express';
import { readdir, access, copyFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { constants, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

// プロジェクトルートのパス
const projectRoot = join(__dirname, '..', '..');
const libraryPath = join(projectRoot, 'public', 'assets', 'audio', 'library');

// 全キーの定義（並行調フォーマット）
// 内部的には並行調を使用し、ファイル名はマイナーキーを使用
const ALL_KEYS = [
  { parallel: 'C/Am', fileKey: 'Am' },
  { parallel: 'G/Em', fileKey: 'Em' },
  { parallel: 'D/Bm', fileKey: 'Bm' },
  { parallel: 'A/F#m', fileKey: 'A' },  // F#mファイルがない場合はAを使用
  { parallel: 'E/C#m', fileKey: 'E' },  // C#mファイルがない場合はEを使用
  { parallel: 'B/G#m', fileKey: 'B' },  // G#mファイルがない場合はBを使用
  { parallel: 'F#/D#m', fileKey: 'B' }, // 代替としてBを使用
  { parallel: 'F/Dm', fileKey: 'Dm' },
  { parallel: 'Bb/Gm', fileKey: 'Gm' },
  { parallel: 'Eb/Cm', fileKey: 'Cm' },
  { parallel: 'Ab/Fm', fileKey: 'Fm' },
  { parallel: 'Db/Bbm', fileKey: 'Gm' }, // 代替としてGmを使用
];

/**
 * 音声ライブラリの定義
 * 各キーに対応した音声を動的に生成
 * ファイル名は既存のフォーマット（Am, C, Dm等）を使用
 */
const AUDIO_LIBRARY = {
  drums: [
    { id: 'retro-funk-drum', name: 'Retro Funk Drum Loop', nameJa: 'レトロファンクドラム', file: 'retro-funk-drum.mp3', isPercussion: true, musicalKey: null },
  ],
  bass: ALL_KEYS.map(({ parallel, fileKey }) => ({
    id: `bass-${fileKey}`,
    name: `Bass (${parallel})`,
    nameJa: `ベース (${parallel})`,
    file: `bass-${fileKey}.mp3`,
    isPercussion: false,
    musicalKey: parallel,
  })),
  synth: [
    ...ALL_KEYS.map(({ parallel, fileKey }) => ({
      id: `synth-pad-${fileKey}`,
      name: `Synth Pad (${parallel})`,
      nameJa: `シンセパッド (${parallel})`,
      // amだけ小文字ファイルが存在する
      file: fileKey === 'Am' ? 'synth-pad-am.mp3' : `synth-pad-${fileKey}.mp3`,
      isPercussion: false,
      musicalKey: parallel,
    })),
    ...ALL_KEYS.map(({ parallel, fileKey }) => ({
      id: `synth-lead-${fileKey}`,
      name: `Synth Lead (${parallel})`,
      nameJa: `シンセリード (${parallel})`,
      // amだけ小文字ファイルが存在する
      file: fileKey === 'Am' ? 'synth-lead-am.mp3' : `synth-lead-${fileKey}.mp3`,
      isPercussion: false,
      musicalKey: parallel,
    })),
  ],
  instruments: [
    ...ALL_KEYS.map(({ parallel, fileKey }) => ({
      id: `guitar-${fileKey}`,
      name: `Guitar (${parallel})`,
      nameJa: `ギター (${parallel})`,
      file: `guitar-${fileKey}.mp3`,
      isPercussion: false,
      musicalKey: parallel,
    })),
    ...ALL_KEYS.map(({ parallel, fileKey }) => ({
      id: `piano-${fileKey}`,
      name: `Piano (${parallel})`,
      nameJa: `ピアノ (${parallel})`,
      file: `piano-${fileKey}.mp3`,
      isPercussion: false,
      musicalKey: parallel,
    })),
  ],
};

/**
 * 指定条件に合う音声をランダムに取得
 * @param {string} kitKey - キットのmusical_key
 * @param {boolean} isPercussion - パーカッションかどうか
 * @returns {object|null} マッチする音声、なければnull
 */
export function getRandomMatchingSound(kitKey, isPercussion) {
  const allSounds = Object.values(AUDIO_LIBRARY).flat();

  const matchingSounds = allSounds.filter(sound => {
    // パーカッション属性が一致するか
    if (sound.isPercussion !== isPercussion) return false;

    // ファイルが実際に存在するか確認
    const filePath = join(libraryPath, sound.file);
    if (!existsSync(filePath)) return false;

    // キーのマッチング
    if (sound.musicalKey === null) {
      // nullはどのキーにもマッチ（主にパーカッション）
      return true;
    }

    if (Array.isArray(sound.musicalKey)) {
      // 配列の場合、キットのキーが含まれているか
      return sound.musicalKey.includes(kitKey);
    }

    // 単一キーの場合
    return sound.musicalKey === kitKey;
  });

  if (matchingSounds.length === 0) return null;

  // ランダムに選択
  const randomIndex = Math.floor(Math.random() * matchingSounds.length);
  return matchingSounds[randomIndex];
}

/**
 * GET /api/audio-library
 * 音声ライブラリ一覧取得（認証不要）
 */
router.get('/', async (req, res) => {
  try {
    // 各音声ファイルの存在確認
    const categories = {};

    for (const [category, sounds] of Object.entries(AUDIO_LIBRARY)) {
      const availableSounds = [];

      for (const sound of sounds) {
        const filePath = join(libraryPath, sound.file);
        try {
          await access(filePath, constants.R_OK);
          availableSounds.push({
            ...sound,
            available: true,
            path: `/assets/audio/library/${sound.file}`,
          });
        } catch {
          // ファイルが存在しない場合はavailable: falseとしてリストに含める
          availableSounds.push({
            ...sound,
            available: false,
            path: null,
          });
        }
      }

      categories[category] = availableSounds;
    }

    res.json({ categories });
  } catch (error) {
    console.error('Get audio library error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/audio-library/:soundId
 * 特定の音声情報を取得
 */
router.get('/:soundId', async (req, res) => {
  try {
    const { soundId } = req.params;

    // 全カテゴリから検索
    for (const [category, sounds] of Object.entries(AUDIO_LIBRARY)) {
      const sound = sounds.find(s => s.id === soundId);
      if (sound) {
        const filePath = join(libraryPath, sound.file);
        let available = false;

        try {
          await access(filePath, constants.R_OK);
          available = true;
        } catch {
          // ファイルが存在しない
        }

        return res.json({
          ...sound,
          category,
          available,
          path: available ? `/assets/audio/library/${sound.file}` : null,
        });
      }
    }

    res.status(404).json({ error: 'Sound not found' });
  } catch (error) {
    console.error('Get audio library item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
export { AUDIO_LIBRARY, libraryPath };
