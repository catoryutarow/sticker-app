/**
 * ThreeBackground.tsx - オーディオスペクトラム背景
 */

import { useEffect, useRef } from 'react';
import { BackgroundScene } from '../../three/BackgroundScene';

export function ThreeBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<BackgroundScene | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // アニメーション軽減設定の場合は初期化しない
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const scene = new BackgroundScene(canvasRef.current);
    sceneRef.current = scene;

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

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 5 }}
    />
  );
}
