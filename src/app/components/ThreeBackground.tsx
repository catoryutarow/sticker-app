/**
 * ThreeBackground.tsx - Three.js背景アニメーションのReactラッパー
 */

import { useEffect, useRef, useCallback } from 'react';
import { BackgroundScene } from '../../three/BackgroundScene';

interface ThreeBackgroundProps {
  isPlaying?: boolean;
}

export function ThreeBackground({ isPlaying = false }: ThreeBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<BackgroundScene | null>(null);

  // Three.js初期化
  useEffect(() => {
    if (!canvasRef.current) return;

    // モバイルでのパフォーマンス考慮
    const isMobile = window.innerWidth < 768;
    if (isMobile && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return; // アニメーション軽減設定なら初期化しない
    }

    const scene = new BackgroundScene(canvasRef.current);
    sceneRef.current = scene;

    // リサイズハンドラ
    const handleResize = () => {
      scene.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  // 再生状態に応じた強度調整
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setIntensity(isPlaying ? 0.8 : 0.4);
    }
  }, [isPlaying]);

  // シール追加時のエフェクトトリガー用関数をエクスポート
  const triggerEffect = useCallback(() => {
    if (sceneRef.current) {
      sceneRef.current.triggerEffect();
    }
  }, []);

  // グローバルにトリガー関数を公開（他コンポーネントから呼び出せるように）
  useEffect(() => {
    (window as unknown as { triggerBackgroundEffect?: () => void }).triggerBackgroundEffect = triggerEffect;
    return () => {
      delete (window as unknown as { triggerBackgroundEffect?: () => void }).triggerBackgroundEffect;
    };
  }, [triggerEffect]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{ opacity: 0.7 }}
    />
  );
}
