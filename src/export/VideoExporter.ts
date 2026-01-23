/**
 * VideoExporter.ts - 動画エクスポート制御
 *
 * Canvas + Audio を MP4 動画としてエクスポート（Dockerサーバー使用）
 */

import { CanvasRenderer } from './CanvasRenderer';
import { AudioMixer } from './AudioMixer';
import { Sticker } from '../app/components/StickerAlbum';
import { LOOP_DURATION } from '../audio/AudioEngine';
import { DEFAULT_BACKGROUND_ID } from '../config/backgroundConfig';

// エンコードサーバーのURL（スマホからもアクセスできるように現在のホストを使用）
const getEncoderUrl = () => {
  if (import.meta.env.VITE_ENCODER_URL) {
    return import.meta.env.VITE_ENCODER_URL;
  }
  // 現在のホスト名を使用（localhost以外ならそのIPを使う）
  const host = window.location.hostname;
  return `http://${host}:3001`;
};
const ENCODER_URL = getEncoderUrl();

export interface ExportOptions {
  width: number;
  height: number;
  duration: number;
  fps: number;
  greenScreen: boolean;
  includeAudio: boolean;
  masterVolume: number;
  backgroundId: string;
}

export interface ExportProgress {
  phase: 'preparing' | 'rendering' | 'uploading' | 'encoding' | 'complete' | 'error';
  progress: number;
  message: string;
}

type ProgressCallback = (progress: ExportProgress) => void;

export class VideoExporter {
  private options: ExportOptions;
  private renderer: CanvasRenderer;
  private audioMixer: AudioMixer;
  private stickers: Sticker[];
  private progressCallback: ProgressCallback | null = null;

  constructor(stickers: Sticker[], options: Partial<ExportOptions> = {}) {
    this.stickers = stickers;

    this.options = {
      width: options.width || 720,
      height: options.height || 960,
      duration: options.duration || LOOP_DURATION * 2,
      fps: options.fps || 30,
      greenScreen: options.greenScreen || false,
      includeAudio: options.includeAudio !== false,
      masterVolume: options.masterVolume ?? 0.7,
      backgroundId: options.backgroundId || DEFAULT_BACKGROUND_ID,
    };

    this.renderer = new CanvasRenderer({
      width: this.options.width,
      height: this.options.height,
      backgroundId: this.options.backgroundId,
    });

    this.audioMixer = new AudioMixer({
      duration: this.options.duration,
    });
  }

  onProgress(callback: ProgressCallback): void {
    this.progressCallback = callback;
  }

  private notifyProgress(progress: ExportProgress): void {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }

  /**
   * サーバーの状態を確認
   */
  private async checkServer(): Promise<boolean> {
    try {
      const response = await fetch(`${ENCODER_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * 動画をエクスポート（MP4形式）
   */
  async export(): Promise<Blob> {
    try {
      this.notifyProgress({
        phase: 'preparing',
        progress: 0,
        message: '準備中...',
      });

      // サーバー確認
      const serverAvailable = await this.checkServer();
      if (!serverAvailable) {
        throw new Error('エンコードサーバーに接続できません。docker compose up を実行してください。');
      }

      // 1. 静止画をレンダリング
      await this.renderer.drawStickers(this.stickers, this.options.greenScreen);

      this.notifyProgress({
        phase: 'preparing',
        progress: 10,
        message: 'シールを描画しました',
      });

      // 2. 画像をBlobとして取得
      const canvas = this.renderer.getCanvas();
      const imageBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/png');
      });

      // 3. 音声をレンダリング（必要な場合）
      let audioBlob: Blob | null = null;
      if (this.options.includeAudio) {
        this.notifyProgress({
          phase: 'rendering',
          progress: 20,
          message: '音声をレンダリング中...',
        });

        const audioBuffer = await this.audioMixer.render(this.stickers, this.options.masterVolume);
        audioBlob = this.audioMixer.audioBufferToWav(audioBuffer);

        this.notifyProgress({
          phase: 'rendering',
          progress: 40,
          message: '音声のレンダリングが完了しました',
        });
      }

      // 4. サーバーに送信してエンコード
      this.notifyProgress({
        phase: 'uploading',
        progress: 50,
        message: 'サーバーにアップロード中...',
      });

      const formData = new FormData();
      formData.append('image', imageBlob, 'image.png');
      if (audioBlob) {
        formData.append('audio', audioBlob, 'audio.wav');
      }
      formData.append('duration', String(this.options.duration));
      formData.append('fps', String(this.options.fps));

      this.notifyProgress({
        phase: 'encoding',
        progress: 60,
        message: 'MP4にエンコード中...',
      });

      const response = await fetch(`${ENCODER_URL}/encode`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || 'エンコードに失敗しました');
      }

      const mp4Blob = await response.blob();

      this.notifyProgress({
        phase: 'complete',
        progress: 100,
        message: 'エクスポートが完了しました',
      });

      return mp4Blob;
    } catch (error) {
      console.error('Export failed:', error);
      this.notifyProgress({
        phase: 'error',
        progress: 0,
        message: `エクスポートに失敗しました: ${error instanceof Error ? error.message : error}`,
      });
      throw error;
    }
  }

  /**
   * Web Share APIで共有可能かチェック
   */
  static canShare(blob: Blob, filename: string): boolean {
    if (!navigator.share || !navigator.canShare) {
      return false;
    }
    const file = new File([blob], filename, { type: blob.type });
    return navigator.canShare({ files: [file] });
  }

  /**
   * Web Share APIで共有（カメラロールに保存可能）
   */
  static async share(blob: Blob, filename: string = 'sticker-album.mp4'): Promise<boolean> {
    try {
      const file = new File([blob], filename, { type: 'video/mp4' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Sticker Album Video',
        });
        return true;
      }
      return false;
    } catch (error) {
      // User cancelled or share failed
      if ((error as Error).name === 'AbortError') {
        return true; // User cancelled, but share was attempted
      }
      console.error('Share failed:', error);
      return false;
    }
  }

  /**
   * 動画をダウンロード（フォールバック）
   */
  static download(blob: Blob, filename: string = 'sticker-album.mp4'): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * デバイス/ブラウザ情報を取得
   */
  static getDeviceInfo(): {
    isIOS: boolean;
    isAndroid: boolean;
    isSafari: boolean;
    isChrome: boolean;
    isMobile: boolean;
  } {
    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isAndroid = /Android/i.test(ua);
    const isSafari = /Safari/i.test(ua) && !/Chrome|CriOS/i.test(ua);
    const isChrome = /Chrome|CriOS/i.test(ua);
    const isMobile = isIOS || isAndroid;

    return { isIOS, isAndroid, isSafari, isChrome, isMobile };
  }

  /**
   * 保存（共有優先、フォールバックでダウンロード）
   */
  static async save(blob: Blob, filename: string = 'sticker-album.mp4'): Promise<'shared' | 'downloaded' | 'ios-chrome'> {
    const { isIOS, isAndroid, isSafari, isChrome, isMobile } = this.getDeviceInfo();

    // iOS Chrome は Web Share API で「ビデオを保存」が出ないのでダウンロードにフォールバック
    if (isIOS && isChrome) {
      this.download(blob, filename);
      return 'ios-chrome';
    }

    // iOS Safari または Android なら Web Share API を使用
    if (isMobile && this.canShare(blob, filename)) {
      const shared = await this.share(blob, filename);
      if (shared) {
        return 'shared';
      }
    }

    // フォールバック: 通常のダウンロード
    this.download(blob, filename);
    return 'downloaded';
  }

  /**
   * リソースを解放
   */
  dispose(): void {
    this.renderer.dispose();
  }
}

export default VideoExporter;
