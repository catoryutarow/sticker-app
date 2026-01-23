/**
 * CanvasRenderer.ts - シール→Canvas描画
 *
 * StickerSheetのシールをCanvasに描画する
 */

import { Sticker } from '../app/components/StickerAlbum';

// シール設定
const stickerConfig: Record<string, { color: string; strokeColor: string; gradientEnd: string }> = {
  star: { color: '#FFD700', strokeColor: '#FFA500', gradientEnd: 'rgba(255, 215, 0, 0.7)' },
  heart: { color: '#FF69B4', strokeColor: '#FF1493', gradientEnd: 'rgba(255, 105, 180, 0.7)' },
  circle: { color: '#87CEEB', strokeColor: '#4682B4', gradientEnd: 'rgba(135, 206, 235, 0.7)' },
  square: { color: '#90EE90', strokeColor: '#32CD32', gradientEnd: 'rgba(144, 238, 144, 0.7)' },
  triangle: { color: '#DDA0DD', strokeColor: '#BA55D3', gradientEnd: 'rgba(221, 160, 221, 0.7)' },
  flower: { color: '#FFB6C1', strokeColor: '#FF69B4', gradientEnd: 'rgba(255, 182, 193, 0.7)' },
};

export interface CanvasRendererOptions {
  width: number;
  height: number;
  backgroundColor?: string;
  greenScreen?: boolean;
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private imageCache: Map<string, HTMLImageElement> = new Map();

  constructor(options: CanvasRendererOptions) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = options.width;
    this.canvas.height = options.height;
    this.ctx = this.canvas.getContext('2d')!;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  /**
   * 背景を描画
   */
  drawBackground(greenScreen: boolean = false): void {
    const { ctx, canvas } = this;

    if (greenScreen) {
      // グリーンバック（クロマキー用）
      ctx.fillStyle = '#00FF00';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      // 通常の台紙背景
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#FFFFFF');
      gradient.addColorStop(1, '#E8F4FF');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // グリッド線（薄い）
      ctx.strokeStyle = 'rgba(200, 220, 255, 0.3)';
      ctx.lineWidth = 1;
      const gridSize = 20;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    }
  }

  /**
   * カスタムシール用の画像をプリロード
   */
  async preloadImages(stickers: Sticker[]): Promise<void> {
    const imageUrls = stickers
      .filter((s) => s.imageUrl)
      .map((s) => s.imageUrl!)
      .filter((url, i, arr) => arr.indexOf(url) === i);

    await Promise.all(
      imageUrls.map((url) => {
        return new Promise<void>((resolve) => {
          if (this.imageCache.has(url)) {
            resolve();
            return;
          }
          const img = new Image();
          img.onload = () => {
            this.imageCache.set(url, img);
            resolve();
          };
          img.onerror = () => {
            console.error(`Failed to load image: ${url}`);
            resolve();
          };
          img.src = url;
        });
      })
    );
  }

  /**
   * 全シールを描画
   */
  async drawStickers(stickers: Sticker[], greenScreen: boolean = false): Promise<void> {
    // 背景を描画
    this.drawBackground(greenScreen);

    // 画像をプリロード
    await this.preloadImages(stickers);

    // シールを描画（z-index順）
    for (const sticker of stickers) {
      this.drawSticker(sticker);
    }
  }

  /**
   * 単一シールを描画
   */
  private drawSticker(sticker: Sticker): void {
    const { ctx } = this;
    const size = 80 * sticker.scale;

    ctx.save();

    // 位置と回転を適用
    ctx.translate(sticker.x, sticker.y);
    ctx.rotate((sticker.rotation * Math.PI) / 180);

    // ドロップシャドウ
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 4;

    if (sticker.imageUrl) {
      // カスタム画像シール
      this.drawImageSticker(sticker, size);
    } else {
      // 基本シェイプ
      this.drawShapeSticker(sticker.type, size);
    }

    ctx.restore();
  }

  /**
   * 画像シールを描画
   */
  private drawImageSticker(sticker: Sticker, size: number): void {
    const { ctx } = this;
    const img = this.imageCache.get(sticker.imageUrl!);

    if (img) {
      ctx.drawImage(img, -size / 2, -size / 2, size, size);
    }
  }

  /**
   * シェイプシールを描画
   */
  private drawShapeSticker(type: string, size: number): void {
    const { ctx } = this;
    const config = stickerConfig[type] || stickerConfig.circle;
    const scale = size / 100;

    // グラデーション作成
    const gradient = ctx.createLinearGradient(-size / 2, -size / 2, size / 2, size / 2);
    gradient.addColorStop(0, config.color);
    gradient.addColorStop(1, config.gradientEnd);

    ctx.fillStyle = gradient;
    ctx.strokeStyle = config.strokeColor;
    ctx.lineWidth = 2 * scale;

    switch (type) {
      case 'star':
        this.drawStar(scale);
        break;
      case 'heart':
        this.drawHeart(scale);
        break;
      case 'circle':
        this.drawCircle(scale);
        break;
      case 'square':
        this.drawSquare(scale);
        break;
      case 'triangle':
        this.drawTriangle(scale);
        break;
      case 'flower':
        this.drawFlower(scale, config);
        break;
      default:
        this.drawCircle(scale);
    }
  }

  private drawStar(scale: number): void {
    const { ctx } = this;
    const points = [
      [50, 10],
      [61, 39],
      [92, 39],
      [67, 58],
      [78, 87],
      [50, 68],
      [22, 87],
      [33, 58],
      [8, 39],
      [39, 39],
    ];

    ctx.beginPath();
    points.forEach(([x, y], i) => {
      const px = (x - 50) * scale;
      const py = (y - 50) * scale;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  private drawHeart(scale: number): void {
    const { ctx } = this;

    ctx.beginPath();
    ctx.moveTo(0 * scale, 35 * scale);
    ctx.bezierCurveTo(0 * scale, 20 * scale, -20 * scale, -5 * scale, -30 * scale, -10 * scale);
    ctx.bezierCurveTo(-45 * scale, -25 * scale, -30 * scale, -50 * scale, 0 * scale, -30 * scale);
    ctx.bezierCurveTo(30 * scale, -50 * scale, 45 * scale, -25 * scale, 30 * scale, -10 * scale);
    ctx.bezierCurveTo(20 * scale, -5 * scale, 0 * scale, 20 * scale, 0 * scale, 35 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  private drawCircle(scale: number): void {
    const { ctx } = this;
    ctx.beginPath();
    ctx.arc(0, 0, 40 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  private drawSquare(scale: number): void {
    const { ctx } = this;
    const size = 70 * scale;
    const radius = 8 * scale;

    ctx.beginPath();
    ctx.roundRect(-size / 2, -size / 2, size, size, radius);
    ctx.fill();
    ctx.stroke();
  }

  private drawTriangle(scale: number): void {
    const { ctx } = this;

    ctx.beginPath();
    ctx.moveTo(0, -35 * scale);
    ctx.lineTo(35 * scale, 35 * scale);
    ctx.lineTo(-35 * scale, 35 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  private drawFlower(
    scale: number,
    config: { color: string; strokeColor: string; gradientEnd: string }
  ): void {
    const { ctx } = this;

    // 花びら
    const petalAngles = [0, 72, 144, 216, 288];
    for (const angle of petalAngles) {
      ctx.save();
      ctx.rotate((angle * Math.PI) / 180);
      ctx.translate(0, -15 * scale);

      ctx.beginPath();
      ctx.ellipse(0, 0, 15 * scale, 25 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 1.5 * scale;
      ctx.stroke();

      ctx.restore();
    }

    // 中心
    ctx.fillStyle = '#FFD700';
    ctx.strokeStyle = '#FFA500';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.arc(0, 0, 12 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  /**
   * Canvasを画像データURLとして取得
   */
  toDataURL(type: string = 'image/png', quality: number = 0.92): string {
    return this.canvas.toDataURL(type, quality);
  }

  /**
   * Canvasをクリア
   */
  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * リソースを解放
   */
  dispose(): void {
    this.imageCache.clear();
  }
}

export default CanvasRenderer;
