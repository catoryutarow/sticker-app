/**
 * audioAssets.ts - 音源アセット管理
 *
 * stickerConfigから設定を参照し、MP3ファイルパスを提供
 */

import {
  STICKERS,
  getStickerById,
  isValidStickerId,
  getAllStickerIds,
  getStickerAudioPath,
} from '../config/stickerConfig';

// 互換性のためStickerTypeをエクスポート（動的に生成）
export type StickerType = string;

export interface StickerSoundConfig {
  name: string;
  nameJa: string;
  audioPath: string;
  color: string;
}

/**
 * シールIDから音源設定を取得
 */
export function getStickerSoundConfig(id: string): StickerSoundConfig | undefined {
  const sticker = getStickerById(id);
  if (!sticker) return undefined;

  return {
    name: sticker.name,
    nameJa: sticker.nameJa,
    audioPath: getStickerAudioPath(id),
    color: sticker.color,
  };
}

/**
 * 全シールの音源設定をRecord形式で取得（互換性のため）
 */
export function getAllStickerSounds(): Record<string, StickerSoundConfig> {
  const sounds: Record<string, StickerSoundConfig> = {};
  for (const sticker of STICKERS) {
    sounds[sticker.id] = {
      name: sticker.name,
      nameJa: sticker.nameJa,
      audioPath: getStickerAudioPath(sticker.id),
      color: sticker.color,
    };
  }
  return sounds;
}

/**
 * シールタイプかどうかを判定
 */
export function isStickerType(type: string): boolean {
  return isValidStickerId(type);
}

/**
 * 全シールタイプの配列を取得
 */
export function getAllStickerTypes(): string[] {
  return getAllStickerIds();
}

// 後方互換性のためのエクスポート
export const STICKER_SOUNDS = getAllStickerSounds();
