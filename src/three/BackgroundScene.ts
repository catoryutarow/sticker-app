/**
 * BackgroundScene.ts - オーディオスペクトラム可視化
 * 画面下部に一本の線を表示し、音楽に合わせて波形を描画
 */

import * as THREE from 'three';
import AudioEngine from '../audio/AudioEngine';

export class BackgroundScene {
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private animationFrameId: number | null = null;

  // スペクトラムライン
  private spectrumLine: THREE.Line | null = null;
  private spectrumGeometry: THREE.BufferGeometry;
  private spectrumMaterial: THREE.LineBasicMaterial;

  // スムージング用の前フレームデータ
  private smoothedData: Float32Array;
  private readonly smoothingFactor = 0.3; // 低いほど滑らか

  // 表示設定
  private readonly lineY = -0.7; // 画面下部 (-1 ~ 1)
  private readonly lineHeight = 0.4; // 波形の最大高さ
  private readonly pointCount = 128;

  constructor(canvas: HTMLCanvasElement) {
    // シーン初期化
    this.scene = new THREE.Scene();

    // 正投影カメラ（2D表示用）
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.OrthographicCamera(-aspect, aspect, 1, -1, 0.1, 10);
    this.camera.position.z = 1;

    // レンダラー設定
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);

    // スムージングデータ初期化
    this.smoothedData = new Float32Array(this.pointCount);

    // スペクトラムライン初期化
    this.spectrumGeometry = new THREE.BufferGeometry();
    this.spectrumMaterial = new THREE.LineBasicMaterial({
      color: 0x333333,
      transparent: true,
      opacity: 0.6,
      linewidth: 2,
    });

    this.initSpectrumLine();

    // アニメーション開始
    this.animate();
  }

  private initSpectrumLine(): void {
    const aspect = window.innerWidth / window.innerHeight;
    const positions = new Float32Array(this.pointCount * 3);

    for (let i = 0; i < this.pointCount; i++) {
      const x = (i / (this.pointCount - 1)) * 2 * aspect - aspect;
      positions[i * 3] = x;
      positions[i * 3 + 1] = this.lineY;
      positions[i * 3 + 2] = 0;
    }

    this.spectrumGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    );

    this.spectrumLine = new THREE.Line(this.spectrumGeometry, this.spectrumMaterial);
    this.scene.add(this.spectrumLine);
  }

  /**
   * アニメーションループ
   */
  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    // オーディオスペクトラムデータを取得
    const audioEngine = AudioEngine.getInstance();
    const frequencyData = audioEngine.getFrequencyData();

    // スペクトラムラインを更新
    this.updateSpectrumLine(frequencyData);

    this.renderer.render(this.scene, this.camera);
  };

  private updateSpectrumLine(frequencyData: Float32Array): void {
    if (!this.spectrumLine) return;

    const positions = this.spectrumGeometry.getAttribute('position');
    if (!positions) return;

    const aspect = window.innerWidth / window.innerHeight;

    for (let i = 0; i < this.pointCount; i++) {
      // 周波数データのインデックス（低周波を強調するため対数スケール）
      const freqIndex = Math.min(
        Math.floor(Math.pow(i / this.pointCount, 1.5) * frequencyData.length),
        frequencyData.length - 1
      );

      // スムージング
      const targetValue = frequencyData[freqIndex] || 0;
      this.smoothedData[i] += (targetValue - this.smoothedData[i]) * this.smoothingFactor;

      // Y座標を計算
      const x = (i / (this.pointCount - 1)) * 2 * aspect - aspect;
      const y = this.lineY + this.smoothedData[i] * this.lineHeight;

      positions.setX(i, x);
      positions.setY(i, y);
    }

    positions.needsUpdate = true;
  }

  /**
   * エフェクトの強度を設定（互換性のため残す）
   */
  setIntensity(_level: number): void {
    // スペクトラム表示では使用しない
  }

  /**
   * エフェクトをトリガー（互換性のため残す）
   */
  triggerEffect(): void {
    // スペクトラム表示では使用しない
  }

  /**
   * リサイズ対応
   */
  resize(): void {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera.left = -aspect;
    this.camera.right = aspect;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // スペクトラムラインの位置を更新
    if (this.spectrumLine) {
      const positions = this.spectrumGeometry.getAttribute('position');
      if (positions) {
        for (let i = 0; i < this.pointCount; i++) {
          const x = (i / (this.pointCount - 1)) * 2 * aspect - aspect;
          positions.setX(i, x);
        }
        positions.needsUpdate = true;
      }
    }
  }

  /**
   * クリーンアップ
   */
  dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    if (this.spectrumLine) {
      this.scene.remove(this.spectrumLine);
    }
    this.spectrumGeometry.dispose();
    this.spectrumMaterial.dispose();

    this.renderer.dispose();
  }
}
