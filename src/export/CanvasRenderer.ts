/**
 * CanvasRenderer.ts - シール→Canvas描画
 *
 * StickerSheetのシールをCanvasに描画する
 */

import { Sticker } from '../app/components/StickerAlbum';
import { getStickerImagePath, getStickerById } from '../config/stickerConfig';
import { getBackgroundImagePath, DEFAULT_BACKGROUND_ID } from '../config/backgroundConfig';

export interface CanvasRendererOptions {
  width: number;
  height: number;
  backgroundId?: string;
  greenScreen?: boolean;
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private imageCache: Map<string, HTMLImageElement> = new Map();
  private backgroundImage: HTMLImageElement | null = null;
  private backgroundId: string;

  constructor(options: CanvasRendererOptions) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = options.width;
    this.canvas.height = options.height;
    this.ctx = this.canvas.getContext('2d')!;
    this.backgroundId = options.backgroundId || DEFAULT_BACKGROUND_ID;
  }

  /**
   * 背景IDを設定
   */
  setBackgroundId(id: string): void {
    this.backgroundId = id;
    this.backgroundImage = null; // キャッシュをクリア
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
      // 背景画像を描画（cover風にフィット）
      if (this.backgroundImage) {
        const img = this.backgroundImage;
        const imgAspect = img.width / img.height;
        const canvasAspect = canvas.width / canvas.height;

        let drawWidth, drawHeight, drawX, drawY;

        if (imgAspect > canvasAspect) {
          // 画像の方が横長 → 高さを合わせて横をクロップ
          drawHeight = canvas.height;
          drawWidth = drawHeight * imgAspect;
          drawX = (canvas.width - drawWidth) / 2;
          drawY = 0;
        } else {
          // 画像の方が縦長 → 幅を合わせて縦をクロップ
          drawWidth = canvas.width;
          drawHeight = drawWidth / imgAspect;
          drawX = 0;
          drawY = (canvas.height - drawHeight) / 2;
        }

        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
      } else {
        // フォールバック: グラデーション背景
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#FFFFFF');
        gradient.addColorStop(1, '#E8F4FF');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // 透明感のある光沢表現
      const glossGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      glossGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
      glossGradient.addColorStop(0.3, 'transparent');
      glossGradient.addColorStop(0.7, 'transparent');
      glossGradient.addColorStop(1, 'rgba(200, 220, 255, 0.15)');
      ctx.fillStyle = glossGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // グリッド線（薄く）
      ctx.strokeStyle = 'rgba(100, 150, 200, 0.08)';
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
   * 背景画像をプリロード
   */
  private async preloadBackgroundImage(): Promise<void> {
    const imagePath = getBackgroundImagePath(this.backgroundId);

    return new Promise<void>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.backgroundImage = img;
        resolve();
      };
      img.onerror = () => {
        console.error(`Failed to load background image: ${imagePath}`);
        resolve();
      };
      img.src = imagePath;
    });
  }

  /**
   * シール画像をプリロード
   */
  async preloadImages(stickers: Sticker[]): Promise<void> {
    // 背景画像をプリロード
    await this.preloadBackgroundImage();

    // シールタイプ（ID）からユニークな画像パスを取得
    const stickerTypes = [...new Set(stickers.map((s) => s.type))];
    const imageUrls = stickerTypes
      .filter((type) => getStickerById(type)) // 有効なシールIDのみ
      .map((type) => getStickerImagePath(type));

    await Promise.all(
      imageUrls.map((url) => {
        return new Promise<void>((resolve) => {
          if (this.imageCache.has(url)) {
            resolve();
            return;
          }
          const img = new Image();
          img.crossOrigin = 'anonymous'; // CORS対応
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
    // 先に画像をプリロード（背景含む）
    await this.preloadImages(stickers);

    // 背景を描画
    this.drawBackground(greenScreen);

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

    // シールIDから画像パスを取得して描画
    const imagePath = getStickerImagePath(sticker.type);
    const img = this.imageCache.get(imagePath);

    if (img) {
      ctx.drawImage(img, -size / 2, -size / 2, size, size);
    } else {
      // フォールバック: 画像が読み込めない場合は色付きの円を描画
      const stickerDef = getStickerById(sticker.type);
      ctx.fillStyle = stickerDef?.color || '#888888';
      ctx.beginPath();
      ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
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
