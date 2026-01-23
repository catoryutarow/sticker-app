/**
 * useAudioEngine.ts - React Hook for AudioEngine
 *
 * オーディオエンジンをReactコンポーネントで使用するためのカスタムフック
 * シールの状態（位置、サイズ、回転）に応じた音響処理をサポート
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import AudioEngine, { AudioEngineState, StickerState } from './AudioEngine';
import { StickerType } from './audioAssets';

interface UseAudioEngineReturn {
  // State
  isPlaying: boolean;
  isInitialized: boolean;
  masterVolume: number;
  activeTracks: Map<StickerType, number>;
  totalVolume: number;
  saturationAmount: number;

  // Actions
  initialize: () => Promise<void>;
  play: () => void;
  stop: () => void;
  toggle: () => void;
  setMasterVolume: (volume: number) => void;
  setSheetWidth: (width: number) => void;

  // Sticker sync
  syncWithStickers: (stickers: StickerState[]) => void;
  addSticker: (type: StickerType) => void;
  removeSticker: (type: StickerType) => void;

  // Engine reference
  engine: AudioEngine;
}

export function useAudioEngine(): UseAudioEngineReturn {
  const engine = useRef(AudioEngine.getInstance()).current;

  const [state, setState] = useState<AudioEngineState>(() => engine.getState());

  useEffect(() => {
    // 状態変更をリッスン
    const unsubscribe = engine.onStateChange((newState) => {
      setState(newState);
    });

    // 初期状態を取得
    setState(engine.getState());

    return () => {
      unsubscribe();
    };
  }, [engine]);

  const initialize = useCallback(async () => {
    await engine.initialize();
  }, [engine]);

  const play = useCallback(() => {
    engine.play();
  }, [engine]);

  const stop = useCallback(() => {
    engine.stop();
  }, [engine]);

  const toggle = useCallback(() => {
    engine.toggle();
  }, [engine]);

  const setMasterVolume = useCallback(
    (volume: number) => {
      engine.setMasterVolume(volume);
    },
    [engine]
  );

  const setSheetWidth = useCallback(
    (width: number) => {
      engine.setSheetWidth(width);
    },
    [engine]
  );

  const syncWithStickers = useCallback(
    (stickers: StickerState[]) => {
      engine.syncWithStickers(stickers);
    },
    [engine]
  );

  // 互換性のため維持（単純な追加/削除には使用しない）
  const addSticker = useCallback(
    (type: StickerType) => {
      // 新しいエンジンではsyncWithStickersを使用するため、ダミーのステートを作成
      const dummySticker: StickerState = {
        id: `temp_${type}_${Date.now()}`,
        type,
        x: 400,
        y: 400,
        rotation: 0,
        scale: 1,
      };
      const currentStates = Array.from(engine.getStickerStates().values());
      engine.syncWithStickers([...currentStates, dummySticker]);
    },
    [engine]
  );

  const removeSticker = useCallback(
    (type: StickerType) => {
      // 指定タイプの最初のシールを削除
      const currentStates = Array.from(engine.getStickerStates().values());
      const indexToRemove = currentStates.findIndex((s) => s.type === type);
      if (indexToRemove >= 0) {
        currentStates.splice(indexToRemove, 1);
        engine.syncWithStickers(currentStates);
      }
    },
    [engine]
  );

  return {
    // State
    isPlaying: state.isPlaying,
    isInitialized: state.isInitialized,
    masterVolume: state.masterVolume,
    activeTracks: state.activeTracks,
    totalVolume: state.totalVolume,
    saturationAmount: state.saturationAmount,

    // Actions
    initialize,
    play,
    stop,
    toggle,
    setMasterVolume,
    setSheetWidth,

    // Sticker sync
    syncWithStickers,
    addSticker,
    removeSticker,

    // Engine reference
    engine,
  };
}

/**
 * オーディオの自動再生制限を解除するためのフック
 * ユーザーインタラクション後に初期化を行う
 */
export function useAudioAutoInit(): {
  isReady: boolean;
  initializeOnUserAction: () => Promise<void>;
} {
  const [isReady, setIsReady] = useState(false);
  const engine = useRef(AudioEngine.getInstance()).current;

  const initializeOnUserAction = useCallback(async () => {
    if (!isReady) {
      try {
        await engine.initialize();
        setIsReady(true);
      } catch (error) {
        console.error('Failed to initialize audio:', error);
      }
    }
  }, [engine, isReady]);

  return {
    isReady,
    initializeOnUserAction,
  };
}

export default useAudioEngine;
