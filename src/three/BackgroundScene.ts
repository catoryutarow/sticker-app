/**
 * BackgroundScene.ts - 斜めフルスクリーン・モノクロスペクトラム
 */

import * as THREE from 'three';
import AudioEngine from '../audio/AudioEngine';

export class BackgroundScene {
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private animationFrameId: number | null = null;

  // バーの設定
  private readonly barCount = 48;
  private readonly barGap = 0.03;
  private readonly maxBarHeight = 2.5; // 画面いっぱいに
  private readonly angle = -25 * (Math.PI / 180); // 斜め角度（度→ラジアン）

  // バーメッシュ
  private bars: THREE.Mesh[] = [];
  private barMaterials: THREE.MeshBasicMaterial[] = [];
  private barGroup: THREE.Group;

  // スムージング
  private smoothedData: Float32Array;
  private readonly smoothingFactor = 0.35;

  // 周波数ブースト
  private readonly frequencyBoost: number[];

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

    // 周波数ブースト配列を生成
    this.frequencyBoost = [];
    for (let i = 0; i < this.barCount; i++) {
      const t = i / this.barCount;
      // 低音を強め、高音を弱める曲線
      this.frequencyBoost.push(2.5 - t * 1.8);
    }

    // グループで全体を回転
    this.barGroup = new THREE.Group();
    this.barGroup.rotation.z = this.angle;
    this.scene.add(this.barGroup);

    this.initBars();
    this.animate();
  }

  private initBars(): void {
    const aspect = window.innerWidth / window.innerHeight;
    // 斜めにしても画面をカバーする幅
    const totalWidth = Math.sqrt(4 * aspect * aspect + 4) * 1.2;
    const barWidth = (totalWidth - this.barGap * (this.barCount - 1)) / this.barCount;
    const startX = -totalWidth / 2;

    for (let i = 0; i < this.barCount; i++) {
      const geometry = new THREE.PlaneGeometry(barWidth * 0.85, 0.01);

      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.15,
      });

      const bar = new THREE.Mesh(geometry, material);
      bar.position.x = startX + i * (barWidth + this.barGap) + barWidth / 2;
      bar.position.y = -1.2; // 下から開始

      this.barGroup.add(bar);
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
      const normalizedIndex = i / this.barCount;
      const freqIndex = Math.min(
        Math.floor(Math.pow(normalizedIndex, 2.2) * dataLength * 0.75),
        dataLength - 1
      );

      // 周波数ビンを複数平均
      let sum = 0;
      const binCount = Math.max(1, Math.floor(dataLength / this.barCount / 2));
      for (let j = 0; j < binCount; j++) {
        const idx = Math.min(freqIndex + j, dataLength - 1);
        sum += frequencyData[idx] || 0;
      }
      let value = sum / binCount;

      // ブースト適用
      value *= this.frequencyBoost[i];

      // 派手な非線形マッピング
      value = Math.pow(value, 0.6) * 2.0;
      value = Math.min(value, 1.0);

      // スムージング（上昇速い、下降遅い）
      if (value > this.smoothedData[i]) {
        this.smoothedData[i] += (value - this.smoothedData[i]) * this.smoothingFactor;
      } else {
        this.smoothedData[i] += (value - this.smoothedData[i]) * (this.smoothingFactor * 0.4);
      }

      const smoothedValue = this.smoothedData[i];

      // バーの高さと位置
      const barHeight = Math.max(0.02, smoothedValue * this.maxBarHeight);
      const bar = this.bars[i];
      bar.scale.y = barHeight / 0.01;
      bar.position.y = -1.2 + barHeight / 2;

      // モノクロ：白の濃淡で表現
      const material = this.barMaterials[i];
      const brightness = 0.15 + smoothedValue * 0.7; // 0.15 ~ 0.85
      material.color.setRGB(brightness, brightness, brightness);
      material.opacity = 0.2 + smoothedValue * 0.6;
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

    // バーを再配置
    const totalWidth = Math.sqrt(4 * aspect * aspect + 4) * 1.2;
    const barWidth = (totalWidth - this.barGap * (this.barCount - 1)) / this.barCount;
    const startX = -totalWidth / 2;

    for (let i = 0; i < this.barCount; i++) {
      const bar = this.bars[i];
      bar.position.x = startX + i * (barWidth + this.barGap) + barWidth / 2;
      bar.scale.x = barWidth * 0.85 / (bar.geometry as THREE.PlaneGeometry).parameters.width;
    }
  }

  dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    for (const bar of this.bars) {
      this.barGroup.remove(bar);
      bar.geometry.dispose();
    }
    for (const material of this.barMaterials) {
      material.dispose();
    }
    this.scene.remove(this.barGroup);

    this.renderer.dispose();
  }
}
