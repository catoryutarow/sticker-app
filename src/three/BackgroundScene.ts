/**
 * BackgroundScene.ts - Three.js シーン管理
 * モノクロの断続的な3Dエフェクト
 */

import * as THREE from 'three';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

interface WaveLine {
  points: THREE.Vector3[];
  progress: number;
  speed: number;
  y: number;
}

export class BackgroundScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private animationFrameId: number | null = null;

  // パーティクルシステム
  private particles: Particle[] = [];
  private particleGeometry: THREE.BufferGeometry;
  private particleMaterial: THREE.PointsMaterial;
  private particleSystem: THREE.Points;

  // 波線
  private waveLines: WaveLine[] = [];
  private lineMeshes: THREE.Line[] = [];

  // ワイヤーフレームジオメトリ
  private wireframes: THREE.LineSegments[] = [];

  // エフェクト制御
  private intensity: number = 0.5;
  private lastEffectTime: number = 0;
  private effectInterval: number = 3000; // 3-5秒ごと

  constructor(canvas: HTMLCanvasElement) {
    // シーン初期化
    this.scene = new THREE.Scene();

    // カメラ設定
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.z = 50;

    // レンダラー設定
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);

    // パーティクルシステム初期化
    this.particleGeometry = new THREE.BufferGeometry();
    this.particleMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 2,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
    });
    this.particleSystem = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.scene.add(this.particleSystem);

    // 初期エフェクト
    this.initializeBackgroundParticles();

    // アニメーション開始
    this.animate();
  }

  private initializeBackgroundParticles(): void {
    // 背景に散らばる静的なパーティクル
    const count = 100;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 50 - 25;
    }

    this.particleGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    );
  }

  /**
   * 断続的なエフェクトをトリガー
   */
  triggerEffect(): void {
    const effectType = Math.floor(Math.random() * 3);

    switch (effectType) {
      case 0:
        this.spawnWaveLine();
        break;
      case 1:
        this.spawnParticleBurst();
        break;
      case 2:
        this.spawnWireframe();
        break;
    }
  }

  /**
   * 波線を生成
   */
  private spawnWaveLine(): void {
    const y = (Math.random() - 0.5) * 60;
    const waveLine: WaveLine = {
      points: [],
      progress: 0,
      speed: 0.02 + Math.random() * 0.02,
      y,
    };

    // 波線の形状を生成
    const segments = 50;
    for (let i = 0; i <= segments; i++) {
      const x = (i / segments) * 120 - 60;
      const waveY = y + Math.sin((i / segments) * Math.PI * 2) * 5;
      waveLine.points.push(new THREE.Vector3(x, waveY, -10));
    }

    this.waveLines.push(waveLine);

    // ラインメッシュを作成
    const geometry = new THREE.BufferGeometry().setFromPoints(waveLine.points);
    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
    });
    const line = new THREE.Line(geometry, material);
    this.scene.add(line);
    this.lineMeshes.push(line);
  }

  /**
   * パーティクルバーストを生成
   */
  private spawnParticleBurst(): void {
    const burstCount = 30;
    const centerX = (Math.random() - 0.5) * 60;
    const centerY = (Math.random() - 0.5) * 40;

    for (let i = 0; i < burstCount; i++) {
      const angle = (i / burstCount) * Math.PI * 2;
      const speed = 0.3 + Math.random() * 0.3;

      this.particles.push({
        position: new THREE.Vector3(centerX, centerY, 0),
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          (Math.random() - 0.5) * 0.2
        ),
        life: 1,
        maxLife: 1,
      });
    }

    this.updateParticleGeometry();
  }

  /**
   * ワイヤーフレームを生成
   */
  private spawnWireframe(): void {
    const geometries = [
      new THREE.IcosahedronGeometry(8, 0),
      new THREE.OctahedronGeometry(8, 0),
      new THREE.TetrahedronGeometry(8, 0),
    ];

    const geometry = geometries[Math.floor(Math.random() * geometries.length)];
    const edges = new THREE.EdgesGeometry(geometry);
    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
    });

    const wireframe = new THREE.LineSegments(edges, material);
    wireframe.position.set(
      (Math.random() - 0.5) * 40,
      (Math.random() - 0.5) * 30,
      -20
    );
    wireframe.userData = {
      life: 1,
      rotationSpeed: {
        x: (Math.random() - 0.5) * 0.02,
        y: (Math.random() - 0.5) * 0.02,
        z: (Math.random() - 0.5) * 0.02,
      },
    };

    this.scene.add(wireframe);
    this.wireframes.push(wireframe);
  }

  /**
   * パーティクルジオメトリを更新
   */
  private updateParticleGeometry(): void {
    const baseCount = 100;
    const totalCount = baseCount + this.particles.length;
    const positions = new Float32Array(totalCount * 3);

    // 背景パーティクル
    const oldPositions = this.particleGeometry.getAttribute('position');
    if (oldPositions) {
      for (let i = 0; i < Math.min(baseCount, oldPositions.count); i++) {
        positions[i * 3] = oldPositions.getX(i);
        positions[i * 3 + 1] = oldPositions.getY(i);
        positions[i * 3 + 2] = oldPositions.getZ(i);
      }
    }

    // 動的パーティクル
    for (let i = 0; i < this.particles.length; i++) {
      const idx = (baseCount + i) * 3;
      positions[idx] = this.particles[i].position.x;
      positions[idx + 1] = this.particles[i].position.y;
      positions[idx + 2] = this.particles[i].position.z;
    }

    this.particleGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    );
    this.particleGeometry.attributes.position.needsUpdate = true;
  }

  /**
   * エフェクトの強度を設定（音楽再生中など）
   */
  setIntensity(level: number): void {
    this.intensity = Math.max(0, Math.min(1, level));
    // 強度に応じてエフェクト間隔を調整
    this.effectInterval = 5000 - this.intensity * 2000; // 5秒〜3秒
  }

  /**
   * アニメーションループ
   */
  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    const now = Date.now();

    // 断続的なエフェクトトリガー
    if (now - this.lastEffectTime > this.effectInterval) {
      this.triggerEffect();
      this.lastEffectTime = now;
      // 次のエフェクトまでの間隔にランダム性を追加
      this.effectInterval = (3000 + Math.random() * 2000) / (0.5 + this.intensity * 0.5);
    }

    // パーティクル更新
    this.updateParticles();

    // 波線更新
    this.updateWaveLines();

    // ワイヤーフレーム更新
    this.updateWireframes();

    // 背景パーティクルのゆらぎ
    this.updateBackgroundParticles();

    this.renderer.render(this.scene, this.camera);
  };

  private updateParticles(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.position.add(p.velocity);
      p.life -= 0.01;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    if (this.particles.length > 0) {
      this.updateParticleGeometry();
    }
  }

  private updateWaveLines(): void {
    for (let i = this.waveLines.length - 1; i >= 0; i--) {
      const wave = this.waveLines[i];
      const mesh = this.lineMeshes[i];
      const material = mesh.material as THREE.LineBasicMaterial;

      wave.progress += wave.speed;

      // フェードイン/アウト
      if (wave.progress < 0.3) {
        material.opacity = wave.progress / 0.3 * 0.4;
      } else if (wave.progress > 0.7) {
        material.opacity = (1 - wave.progress) / 0.3 * 0.4;
      } else {
        material.opacity = 0.4;
      }

      // 完了したら削除
      if (wave.progress >= 1) {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        material.dispose();
        this.waveLines.splice(i, 1);
        this.lineMeshes.splice(i, 1);
      }
    }
  }

  private updateWireframes(): void {
    for (let i = this.wireframes.length - 1; i >= 0; i--) {
      const wireframe = this.wireframes[i];
      const material = wireframe.material as THREE.LineBasicMaterial;
      const userData = wireframe.userData;

      // 回転
      wireframe.rotation.x += userData.rotationSpeed.x;
      wireframe.rotation.y += userData.rotationSpeed.y;
      wireframe.rotation.z += userData.rotationSpeed.z;

      // ライフ減衰
      userData.life -= 0.005;

      // フェードイン/アウト
      if (userData.life > 0.8) {
        material.opacity = (1 - userData.life) / 0.2 * 0.3;
      } else if (userData.life < 0.2) {
        material.opacity = userData.life / 0.2 * 0.3;
      } else {
        material.opacity = 0.3;
      }

      // 完了したら削除
      if (userData.life <= 0) {
        this.scene.remove(wireframe);
        wireframe.geometry.dispose();
        material.dispose();
        this.wireframes.splice(i, 1);
      }
    }
  }

  private updateBackgroundParticles(): void {
    const positions = this.particleGeometry.getAttribute('position');
    if (!positions) return;

    const time = Date.now() * 0.0001;
    for (let i = 0; i < Math.min(100, positions.count); i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);

      // 微細なゆらぎ
      positions.setY(i, y + Math.sin(time + i * 0.1) * 0.01);
      positions.setZ(i, z + Math.cos(time + i * 0.1) * 0.01);
    }
    positions.needsUpdate = true;
  }

  /**
   * リサイズ対応
   */
  resize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  /**
   * クリーンアップ
   */
  dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    // パーティクル削除
    this.particleGeometry.dispose();
    this.particleMaterial.dispose();
    this.scene.remove(this.particleSystem);

    // ライン削除
    this.lineMeshes.forEach((line) => {
      this.scene.remove(line);
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    });

    // ワイヤーフレーム削除
    this.wireframes.forEach((wireframe) => {
      this.scene.remove(wireframe);
      wireframe.geometry.dispose();
      (wireframe.material as THREE.Material).dispose();
    });

    this.renderer.dispose();
  }
}
