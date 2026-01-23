/**
 * AudioMixer.ts - オフライン音声ミキシング
 *
 * OfflineAudioContextを使用して、エクスポート用の音声をレンダリング
 * シールの状態（位置、サイズ、回転）に応じたエフェクトを適用
 */

import { LOOP_DURATION } from '../audio/AudioEngine';
import { isStickerType, getAllStickerTypes } from '../audio/audioAssets';
import { getStickerAudioPath } from '../config/stickerConfig';
import { Sticker } from '../app/components/StickerAlbum';

// Audio processing constants (AudioEngine.tsと同じ値)
const BASE_VOLUME = 0.3;
const SCALE_VOLUME_MULTIPLIER = 0.5;
const MAX_ROTATION_EFFECT = 45;
const SATURATION_THRESHOLD = 2.0;
const MAX_SATURATION = 0.6;

export interface AudioMixerOptions {
  duration: number; // 秒
  sampleRate?: number;
  sheetWidth?: number; // パンニング計算用
}

export class AudioMixer {
  private duration: number;
  private sampleRate: number;
  private sheetWidth: number;
  private audioBufferCache: Map<string, AudioBuffer> = new Map();

  constructor(options: AudioMixerOptions) {
    this.duration = options.duration;
    this.sampleRate = options.sampleRate || 44100;
    this.sheetWidth = options.sheetWidth || 800;
  }

  /**
   * シール一覧からアクティブなトラックタイプを取得
   */
  private getActiveStickerTypes(stickers: Sticker[]): Set<string> {
    const types = new Set<string>();
    for (const sticker of stickers) {
      if (isStickerType(sticker.type)) {
        types.add(sticker.type);
      }
    }
    return types;
  }

  /**
   * MP3ファイルを読み込んでAudioBufferに変換
   */
  private async loadAudioFile(type: string, context: OfflineAudioContext): Promise<AudioBuffer | null> {
    // キャッシュをチェック
    const cached = this.audioBufferCache.get(type);
    if (cached) {
      return cached;
    }

    const audioPath = getStickerAudioPath(type);

    try {
      const response = await fetch(audioPath);
      if (!response.ok) {
        console.warn(`Audio file not found: ${audioPath}`);
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await context.decodeAudioData(arrayBuffer);
      this.audioBufferCache.set(type, audioBuffer);
      return audioBuffer;
    } catch (error) {
      console.warn(`Failed to load audio file ${audioPath}:`, error);
      return null;
    }
  }

  /**
   * シールの状態に基づいて音量を計算
   */
  private calculateStickerVolume(sticker: Sticker): number {
    return BASE_VOLUME + (sticker.scale - 1) * SCALE_VOLUME_MULTIPLIER;
  }

  /**
   * シールの位置に基づいてパン値を計算 (-1 ~ 1)
   */
  private calculatePanValue(sticker: Sticker): number {
    const effectiveX = sticker.x - 48;
    const normalizedX = effectiveX / (this.sheetWidth - 48);
    return Math.max(-1, Math.min(1, normalizedX * 2 - 1));
  }

  /**
   * シールの回転に基づいてエフェクト強度を計算 (0 ~ 1)
   */
  private calculateEffectIntensity(sticker: Sticker): number {
    const absRotation = Math.abs(sticker.rotation);
    return Math.min(absRotation / MAX_ROTATION_EFFECT, 1);
  }

  /**
   * 合計音量からサチュレーション量を計算
   */
  private calculateSaturationAmount(stickers: Sticker[]): number {
    let total = 0;
    for (const sticker of stickers) {
      if (isStickerType(sticker.type)) {
        total += this.calculateStickerVolume(sticker);
      }
    }

    if (total > SATURATION_THRESHOLD) {
      const excess = total - SATURATION_THRESHOLD;
      return Math.min(excess / (SATURATION_THRESHOLD * 2), 1) * MAX_SATURATION;
    }
    return 0;
  }

  /**
   * ディストーションカーブを生成
   */
  private makeDistortionCurve(amount: number): Float32Array {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;
    const k = amount * 100;

    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }

    return curve;
  }

  /**
   * フェイザーエフェクトを適用するためのフィルターチェーンを作成
   * （簡易版：オールパスフィルターを使用）
   */
  private createPhaserFilters(
    context: OfflineAudioContext,
    effectIntensity: number
  ): { input: AudioNode; output: AudioNode } {
    // エフェクトが0の場合は直接接続
    if (effectIntensity < 0.01) {
      const passthrough = context.createGain();
      passthrough.gain.value = 1;
      return { input: passthrough, output: passthrough };
    }

    // 簡易フェイザー：複数のオールパスフィルターを直列接続
    const stages = 4;
    const filters: BiquadFilterNode[] = [];

    for (let i = 0; i < stages; i++) {
      const filter = context.createBiquadFilter();
      filter.type = 'allpass';
      filter.frequency.value = 300 + effectIntensity * 500 + i * 200;
      filter.Q.value = 1 + effectIntensity * 2;
      filters.push(filter);
    }

    // フィルターを直列接続
    for (let i = 0; i < filters.length - 1; i++) {
      filters[i].connect(filters[i + 1]);
    }

    // ドライ/ウェットミックス
    const dryGain = context.createGain();
    const wetGain = context.createGain();
    const merger = context.createGain();

    dryGain.gain.value = 1 - effectIntensity * 0.6;
    wetGain.gain.value = effectIntensity * 0.6;

    // 入力を分岐
    const inputSplitter = context.createGain();
    inputSplitter.connect(dryGain);
    inputSplitter.connect(filters[0]);

    // 出力をマージ
    dryGain.connect(merger);
    filters[filters.length - 1].connect(wetGain);
    wetGain.connect(merger);

    return { input: inputSplitter, output: merger };
  }

  /**
   * ミックスダウンした音声をレンダリング
   */
  async render(stickers: Sticker[], masterVolume: number = 0.7): Promise<AudioBuffer> {
    // OfflineAudioContextを作成
    const numSamples = Math.ceil(this.sampleRate * this.duration);
    const offlineContext = new OfflineAudioContext(2, numSamples, this.sampleRate);

    // マスターエフェクトチェーン
    const masterGain = offlineContext.createGain();
    masterGain.gain.value = masterVolume;

    // サチュレーション/ディストーション
    const saturationAmount = this.calculateSaturationAmount(stickers);
    const distortion = offlineContext.createWaveShaper();
    if (saturationAmount > 0.01) {
      distortion.curve = this.makeDistortionCurve(saturationAmount);
      distortion.oversample = '2x';
    }

    // コンプレッサー
    const compressor = offlineContext.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 30;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;

    // マスターチェーン接続
    if (saturationAmount > 0.01) {
      masterGain.connect(distortion);
      distortion.connect(compressor);
    } else {
      masterGain.connect(compressor);
    }
    compressor.connect(offlineContext.destination);

    // 各シールごとにトラックを作成
    for (const sticker of stickers) {
      if (!isStickerType(sticker.type)) continue;

      const buffer = await this.loadAudioFile(sticker.type, offlineContext);
      if (!buffer) continue;

      // 各シールのパラメータを計算
      const volume = this.calculateStickerVolume(sticker);
      const panValue = this.calculatePanValue(sticker);
      const effectIntensity = this.calculateEffectIntensity(sticker);

      // ループ回数を計算
      const loopDuration = buffer.duration;
      const numLoops = Math.ceil(this.duration / loopDuration);

      for (let i = 0; i < numLoops; i++) {
        const startTime = i * loopDuration;
        if (startTime >= this.duration) break;

        const remainingDuration = Math.min(loopDuration, this.duration - startTime);

        // ソースノード
        const source = offlineContext.createBufferSource();
        source.buffer = buffer;

        // ゲインノード
        const gainNode = offlineContext.createGain();
        gainNode.gain.value = volume;

        // パンナー
        const panner = offlineContext.createStereoPanner();
        panner.pan.value = panValue;

        // フェイザーエフェクト
        const phaser = this.createPhaserFilters(offlineContext, effectIntensity);

        // 接続: source -> gain -> phaser -> panner -> masterGain
        source.connect(gainNode);
        gainNode.connect(phaser.input);
        phaser.output.connect(panner);
        panner.connect(masterGain);

        source.start(startTime, 0, remainingDuration);
      }
    }

    // レンダリング
    return await offlineContext.startRendering();
  }

  /**
   * AudioBufferをWAV形式のBlobに変換
   */
  audioBufferToWav(buffer: AudioBuffer): Blob {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    const dataLength = buffer.length * blockAlign;
    const bufferLength = 44 + dataLength;

    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);

    // WAVヘッダー
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, bufferLength - 8, true);
    this.writeString(view, 8, 'WAVE');

    // fmtチャンク
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // fmtチャンクサイズ
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);

    // dataチャンク
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);

    // オーディオデータ
    const channels: Float32Array[] = [];
    for (let i = 0; i < numChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const sample = Math.max(-1, Math.min(1, channels[ch][i]));
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  private writeString(view: DataView, offset: number, str: string): void {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.audioBufferCache.clear();
  }
}

export default AudioMixer;
