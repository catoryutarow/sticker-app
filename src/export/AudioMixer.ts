/**
 * AudioMixer.ts - オフライン音声ミキシング
 *
 * OfflineAudioContextを使用して、エクスポート用の音声をレンダリング
 * シールの状態（位置、サイズ、回転、ピッチ）に応じたエフェクトを適用
 */

import { LOOP_DURATION } from '../audio/AudioEngine';
import { isStickerType, getAllStickerTypes } from '../audio/audioAssets';
import { getStickerAudioPath } from '../config/stickerConfig';
import { Sticker } from '../app/components/StickerAlbum';

// Audio processing constants (AudioEngine.tsと同じ値)
const BASE_VOLUME = 0.3;
const SCALE_VOLUME_MULTIPLIER = 0.5;
const MAX_ROTATION_EFFECT = 45;

// ピッチシフト用の設定
const PITCH_SHIFT_GRAIN_SIZE = 0.1; // グレインサイズ（秒）
const PITCH_SHIFT_OVERLAP = 0.5; // オーバーラップ率

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
  private pitchShiftedCache: Map<string, AudioBuffer> = new Map();

  constructor(options: AudioMixerOptions) {
    this.duration = options.duration;
    this.sampleRate = options.sampleRate || 44100;
    this.sheetWidth = options.sheetWidth || 800;
  }

  /**
   * ピッチシフトを適用したAudioBufferを作成
   * グレインベースのピッチシフト（PSOLA風）
   */
  private applyPitchShift(
    buffer: AudioBuffer,
    semitones: number,
    context: OfflineAudioContext
  ): AudioBuffer {
    if (semitones === 0) return buffer;

    // ピッチ比率を計算（半音 = 2^(1/12)）
    const pitchRatio = Math.pow(2, semitones / 12);

    const numChannels = buffer.numberOfChannels;
    const originalLength = buffer.length;
    const sampleRate = buffer.sampleRate;

    // 出力の長さは同じ（テンポを維持）
    const outputLength = originalLength;
    const outputBuffer = context.createBuffer(numChannels, outputLength, sampleRate);

    // グレインサイズ（サンプル数）
    const grainSize = Math.floor(sampleRate * PITCH_SHIFT_GRAIN_SIZE);
    const hopSize = Math.floor(grainSize * (1 - PITCH_SHIFT_OVERLAP));

    // ハニング窓を作成
    const window = new Float32Array(grainSize);
    for (let i = 0; i < grainSize; i++) {
      window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (grainSize - 1)));
    }

    for (let channel = 0; channel < numChannels; channel++) {
      const inputData = buffer.getChannelData(channel);
      const outputData = outputBuffer.getChannelData(channel);

      // 出力バッファをゼロで初期化
      outputData.fill(0);

      // グレインごとに処理
      let outputPos = 0;
      let inputPos = 0;

      while (outputPos < outputLength - grainSize) {
        // 入力位置を計算（ピッチ比率に応じて進む）
        const readPos = Math.floor(inputPos);

        // グレインを抽出してリサンプル
        for (let i = 0; i < grainSize; i++) {
          // 入力からの読み取り位置（ピッチ比率でスケール）
          const srcPos = readPos + i * pitchRatio;
          const srcIndex = Math.floor(srcPos);
          const frac = srcPos - srcIndex;

          // 線形補間
          let sample = 0;
          if (srcIndex >= 0 && srcIndex < originalLength - 1) {
            sample = inputData[srcIndex] * (1 - frac) + inputData[srcIndex + 1] * frac;
          } else if (srcIndex >= 0 && srcIndex < originalLength) {
            sample = inputData[srcIndex];
          }

          // 窓関数を適用してオーバーラップ加算
          outputData[outputPos + i] += sample * window[i];
        }

        // 次のグレインへ
        outputPos += hopSize;
        inputPos += hopSize;

        // 入力がループする場合
        if (inputPos >= originalLength) {
          inputPos = inputPos % originalLength;
        }
      }

      // 正規化（オーバーラップによる振幅増加を補正）
      const normFactor = hopSize / grainSize * 2;
      for (let i = 0; i < outputLength; i++) {
        outputData[i] *= normFactor;
      }
    }

    return outputBuffer;
  }

  /**
   * ピッチシフト済みバッファのキャッシュキーを生成
   */
  private getPitchCacheKey(type: string, pitch: number): string {
    return `${type}_pitch_${pitch}`;
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

    // コンプレッサー（自然なピーク制御）
    const compressor = offlineContext.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 30;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;

    // マスターチェーン接続: masterGain -> compressor -> destination
    masterGain.connect(compressor);
    compressor.connect(offlineContext.destination);

    // 各シールごとにトラックを作成
    for (const sticker of stickers) {
      if (!isStickerType(sticker.type)) continue;

      let buffer = await this.loadAudioFile(sticker.type, offlineContext);
      if (!buffer) continue;

      // ピッチシフトが必要な場合
      const pitch = sticker.pitch ?? 0;
      if (pitch !== 0) {
        const cacheKey = this.getPitchCacheKey(sticker.type, pitch);
        let pitchShiftedBuffer = this.pitchShiftedCache.get(cacheKey);

        if (!pitchShiftedBuffer) {
          pitchShiftedBuffer = this.applyPitchShift(buffer, pitch, offlineContext);
          this.pitchShiftedCache.set(cacheKey, pitchShiftedBuffer);
        }

        buffer = pitchShiftedBuffer;
      }

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
    this.pitchShiftedCache.clear();
  }
}

export default AudioMixer;
