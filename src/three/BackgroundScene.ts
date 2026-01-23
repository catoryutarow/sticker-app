/**
 * BackgroundScene.ts - ミキサー風オーディオスペクトラム
 * デジタルミキサーのレベルメーター風表示
 */

import * as THREE from 'three';
import AudioEngine from '../audio/AudioEngine';

export class BackgroundScene {
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private animationFrameId: number | null = null;

  // バーの設定
  private readonly barCount = 32; // バーの数
  private readonly barWidth = 0.025; // バーの幅
  private readonly barGap = 0.015; // バー間のギャップ
  private readonly maxBarHeight = 0.5; // 最大高さ
  private readonly baseY = -0.85; // 下端のY座標

  // バーメッシュ
  private bars: THREE.Mesh[] = [];
  private barMaterials: THREE.MeshBasicMaterial[] = [];

  // ピークホールド
  private peakValues: Float32Array;
  private peakHoldTime: Float32Array;
  private readonly peakDecay = 0.02;
  private readonly peakHoldDuration = 30; // フレーム数

  // スムージング
  private smoothedData: Float32Array;
  private readonly smoothingFactor = 0.4; // 高いほど反応が速い

  // 周波数マッピング用のブースト値（低音・中音を強調）
  private readonly frequencyBoost = [
    2.5, 2.4, 2.3, 2.2, 2.1, 2.0, 1.9, 1.8, // 低音域をブースト
    1.7, 1.6, 1.5, 1.4, 1.3, 1.2, 1.1, 1.0, // 中低音
    1.0, 1.0, 1.0, 1.0, 0.95, 0.9, 0.85, 0.8, // 中音
    0.75, 0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.4, // 高音域（抑える）
  ];

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.OrthographicCamera(-aspect, aspect, 1, -1, 0.1, 10);
    this.camera.position.z = 1;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);

    // データ初期化
    this.smoothedData = new Float32Array(this.barCount);
    this.peakValues = new Float32Array(this.barCount);
    this.peakHoldTime = new Float32Array(this.barCount);

    this.initBars();
    this.animate();
  }

  private initBars(): void {
    const totalWidth = this.barCount * (this.barWidth + this.barGap) - this.barGap;
    const startX = -totalWidth / 2;

    for (let i = 0; i < this.barCount; i++) {
      // バーのジオメトリ（高さは後で更新）
      const geometry = new THREE.PlaneGeometry(this.barWidth, 0.01);

      // グラデーション色（緑→黄→赤）
      const material = new THREE.MeshBasicMaterial({
        color: 0x333333,
        transparent: true,
        opacity: 0.7,
      });

      const bar = new THREE.Mesh(geometry, material);
      bar.position.x = startX + i * (this.barWidth + this.barGap) + this.barWidth / 2;
      bar.position.y = this.baseY;

      this.scene.add(bar);
      this.bars.push(bar);
      this.barMaterials.push(material);
    }
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    const audioEngine = AudioEngine.getInstance();
    const frequencyData = audioEngine.getFrequencyData();

    this.updateBars(frequencyData);

    this.renderer.render(this.scene, this.camera);
  };

  private updateBars(frequencyData: Float32Array): void {
    const dataLength = frequencyData.length;

    for (let i = 0; i < this.barCount; i++) {
      // 周波数インデックス計算（対数スケールで低周波を拡大）
      const normalizedIndex = i / this.barCount;
      // より急な指数カーブで低音域に多くのバーを割り当て
      const freqIndex = Math.min(
        Math.floor(Math.pow(normalizedIndex, 2.0) * dataLength * 0.8),
        dataLength - 1
      );

      // 複数の周波数ビンを平均（より安定した表示）
      let sum = 0;
      const binCount = Math.max(1, Math.floor(dataLength / this.barCount / 2));
      for (let j = 0; j < binCount; j++) {
        const idx = Math.min(freqIndex + j, dataLength - 1);
        sum += frequencyData[idx] || 0;
      }
      let value = sum / binCount;

      // 周波数ブーストを適用
      value *= this.frequencyBoost[i] || 1.0;

      // 非線形マッピングで派手に
      value = Math.pow(value, 0.7) * 1.5;
      value = Math.min(value, 1.0);

      // スムージング（上昇は速く、下降は遅く）
      if (value > this.smoothedData[i]) {
        this.smoothedData[i] += (value - this.smoothedData[i]) * this.smoothingFactor;
      } else {
        this.smoothedData[i] += (value - this.smoothedData[i]) * (this.smoothingFactor * 0.5);
      }

      const smoothedValue = this.smoothedData[i];

      // ピークホールド更新
      if (smoothedValue > this.peakValues[i]) {
        this.peakValues[i] = smoothedValue;
        this.peakHoldTime[i] = this.peakHoldDuration;
      } else if (this.peakHoldTime[i] > 0) {
        this.peakHoldTime[i]--;
      } else {
        this.peakValues[i] -= this.peakDecay;
        if (this.peakValues[i] < 0) this.peakValues[i] = 0;
      }

      // バーの高さを更新
      const barHeight = Math.max(0.01, smoothedValue * this.maxBarHeight);
      const bar = this.bars[i];
      bar.scale.y = barHeight / 0.01; // 基準高さに対するスケール
      bar.position.y = this.baseY + barHeight / 2;

      // 色を更新（レベルに応じて緑→黄→赤）
      const material = this.barMaterials[i];
      const hue = (1 - smoothedValue) * 0.35; // 0.35(緑) → 0(赤)
      const saturation = 0.7 + smoothedValue * 0.3;
      const lightness = 0.3 + smoothedValue * 0.2;
      material.color.setHSL(hue, saturation, lightness);
      material.opacity = 0.5 + smoothedValue * 0.4;
    }
  }

  setIntensity(_level: number): void {}
  triggerEffect(): void {}

  resize(): void {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera.left = -aspect;
    this.camera.right = aspect;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // バーの位置を再計算
    const totalWidth = this.barCount * (this.barWidth + this.barGap) - this.barGap;
    const startX = -totalWidth / 2;

    for (let i = 0; i < this.barCount; i++) {
      this.bars[i].position.x = startX + i * (this.barWidth + this.barGap) + this.barWidth / 2;
    }
  }

  dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    for (const bar of this.bars) {
      this.scene.remove(bar);
      bar.geometry.dispose();
    }
    for (const material of this.barMaterials) {
      material.dispose();
    }

    this.renderer.dispose();
  }
}
