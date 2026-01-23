/**
 * Audio module exports
 */

export { default as AudioEngine, LOOP_DURATION, SECONDS_PER_MEASURE, BPM } from './AudioEngine';
export type { AudioEngineState, StickerState } from './AudioEngine';

export { STICKER_SOUNDS, isStickerType, getAllStickerTypes, getStickerSoundConfig } from './audioAssets';
export type { StickerType, StickerSoundConfig } from './audioAssets';

export { useAudioEngine, useAudioAutoInit } from './useAudioEngine';
