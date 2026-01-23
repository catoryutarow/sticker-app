/**
 * AudioEngine - Tone.jsベースの音響処理エンジン（シングルトン）
 *
 * シールの状態（数、大きさ、傾き、位置）に応じて音響処理を動的に変化：
 * - シールの数・大きさ → 音量
 * - シールの傾き → エフェクト（フェイザー/コーラス）
 * - シールの位置 → パンニング
 * - 総音量 → サチュレーション/クリッピング
 */

import * as Tone from 'tone';
import { getAllStickerTypes, isStickerType } from './audioAssets';
import { getStickerAudioPath } from '../config/stickerConfig';

// Constants
const BPM = 120;
const BEATS_PER_MEASURE = 4;
const MEASURES_PER_LOOP = 8;
const SECONDS_PER_BEAT = 60 / BPM; // 0.5秒
const SECONDS_PER_MEASURE = SECONDS_PER_BEAT * BEATS_PER_MEASURE; // 2秒
const LOOP_DURATION = SECONDS_PER_MEASURE * MEASURES_PER_LOOP; // 16秒

// Audio processing constants
const BASE_VOLUME = 0.3; // 基本音量
const SCALE_VOLUME_MULTIPLIER = 0.5; // スケールによる音量増加係数
const MAX_ROTATION_EFFECT = 45; // この角度で最大エフェクト

export interface StickerState {
  id: string;
  type: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  pitch: number; // semitones (-6 to +6)
}

interface TrackNode {
  player: Tone.Player;
  gain: Tone.Gain;
  panner: Tone.Panner;
  phaser: Tone.Phaser;
  pitchShift: Tone.PitchShift;
  stickerId: string;
}

export interface AudioEngineState {
  isPlaying: boolean;
  isInitialized: boolean;
  masterVolume: number;
  activeTracks: Map<string, number>; // type -> count
  totalVolume: number; // 合計音量（サチュレーション計算用）
  saturationAmount: number; // 現在のサチュレーション量
}

type StateChangeCallback = (state: AudioEngineState) => void;

class AudioEngine {
  private static instance: AudioEngine | null = null;

  private audioBuffers: Map<string, Tone.ToneAudioBuffer> = new Map();
  private trackNodes: Map<string, TrackNode> = new Map(); // stickerId -> TrackNode
  private stickerStates: Map<string, StickerState> = new Map(); // stickerId -> StickerState
  private stickerCounts: Map<string, number> = new Map(); // type -> count

  // Master effects chain
  private masterGain: Tone.Gain | null = null;
  private masterDistortion: Tone.Distortion | null = null;
  private masterCompressor: Tone.Compressor | null = null;
  private masterLimiter: Tone.Limiter | null = null;
  private analyser: Tone.Analyser | null = null;

  private isPlaying: boolean = false;
  private isInitialized: boolean = false;
  private masterVolume: number = 1.0;
  private totalVolume: number = 0;
  private sheetWidth: number = 800; // デフォルト台紙幅（後で更新可能）

  private stateChangeCallbacks: Set<StateChangeCallback> = new Set();

  private constructor() {}

  static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  /**
   * AudioContextを初期化（ユーザー操作後に呼び出す必要あり）
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Tone.jsを開始
      await Tone.start();

      // BPMを設定
      Tone.getTransport().bpm.value = BPM;

      // マスターエフェクトチェーンを構築
      this.masterGain = new Tone.Gain(this.masterVolume);
      this.masterDistortion = new Tone.Distortion(0);
      this.masterCompressor = new Tone.Compressor({
        threshold: -24,
        ratio: 4,
        attack: 0.003,
        release: 0.25,
      });
      this.masterLimiter = new Tone.Limiter(-1);
      this.analyser = new Tone.Analyser('fft', 128);

      // チェーン接続: masterGain -> distortion -> compressor -> limiter -> analyser -> destination
      this.masterGain.chain(
        this.masterDistortion,
        this.masterCompressor,
        this.masterLimiter,
        this.analyser,
        Tone.getDestination()
      );

      // 全シールタイプの音源を事前ロード
      await this.loadAllAudioBuffers();

      this.isInitialized = true;
      this.notifyStateChange();
    } catch (error) {
      console.error('AudioEngine initialization failed:', error);
      throw error;
    }
  }

  /**
   * 全シールタイプの音源をロード
   */
  private async loadAllAudioBuffers(): Promise<void> {
    const types = getAllStickerTypes();

    const loadPromises = types.map(async (type) => {
      try {
        const audioPath = getStickerAudioPath(type);
        const buffer = new Tone.ToneAudioBuffer(audioPath);
        await buffer.load(audioPath);
        this.audioBuffers.set(type, buffer);
      } catch (error) {
        console.warn(`Failed to load audio for ${type}:`, error);
      }
    });

    await Promise.all(loadPromises);
  }

  /**
   * 次の小節境界までの時間を取得
   */
  private getTimeToNextMeasure(): number {
    if (!this.isPlaying) return 0;
    const position = Tone.getTransport().seconds;
    const measurePosition = position % SECONDS_PER_MEASURE;
    return SECONDS_PER_MEASURE - measurePosition;
  }

  /**
   * シールの状態に基づいて音量を計算
   */
  private calculateStickerVolume(sticker: StickerState): number {
    // 基本音量 + スケールによる追加音量
    return BASE_VOLUME + (sticker.scale - 1) * SCALE_VOLUME_MULTIPLIER;
  }

  /**
   * シールの位置に基づいてパン値を計算 (-1 ~ 1)
   */
  private calculatePanValue(sticker: StickerState): number {
    // x座標を-1〜1の範囲にマッピング（左パディング48pxを考慮）
    const effectiveX = sticker.x - 48; // 左パディングを除外
    const normalizedX = effectiveX / (this.sheetWidth - 48);
    return Math.max(-1, Math.min(1, normalizedX * 2 - 1));
  }

  /**
   * シールの回転に基づいてエフェクト強度を計算 (0 ~ 1)
   */
  private calculateEffectIntensity(sticker: StickerState): number {
    // 回転角度の絶対値を0-1にマッピング
    const absRotation = Math.abs(sticker.rotation);
    return Math.min(absRotation / MAX_ROTATION_EFFECT, 1);
  }

  /**
   * シールごとのトラックノードを作成
   */
  private createTrackNode(sticker: StickerState): TrackNode | null {
    if (!this.masterGain) return null;

    const buffer = this.audioBuffers.get(sticker.type);
    if (!buffer) return null;

    // プレイヤーを作成
    const player = new Tone.Player({
      url: buffer,
      loop: true,
    });

    // 各ノードを作成
    const gain = new Tone.Gain(this.calculateStickerVolume(sticker));
    const panner = new Tone.Panner(this.calculatePanValue(sticker));

    // フェイザーエフェクト（回転に応じて強度変化）
    const effectIntensity = this.calculateEffectIntensity(sticker);
    const phaser = new Tone.Phaser({
      frequency: 0.5 + effectIntensity * 2, // 0.5 ~ 2.5 Hz
      octaves: 1 + effectIntensity * 2, // 1 ~ 3 octaves
      baseFrequency: 300 + effectIntensity * 500, // 300 ~ 800 Hz
      wet: effectIntensity * 0.6, // 0 ~ 0.6
    });

    // ピッチシフト（テンポを変えずに音程を変更）
    const pitchShift = new Tone.PitchShift({
      pitch: sticker.pitch || 0, // semitones
      windowSize: 0.1,
      delayTime: 0,
    });

    // チェーン接続: player -> gain -> pitchShift -> phaser -> panner -> masterGain
    player.chain(gain, pitchShift, phaser, panner, this.masterGain);

    return {
      player,
      gain,
      panner,
      phaser,
      pitchShift,
      stickerId: sticker.id,
    };
  }

  /**
   * トラックを開始
   * @param referenceTime 同期用の基準時刻（指定しない場合は現在時刻を使用）
   */
  private startTrack(sticker: StickerState, immediate: boolean = false, referenceTime?: number): void {
    if (!this.isInitialized || !this.isPlaying) return;

    // 既存のトラックがあれば停止
    this.stopTrack(sticker.id);

    const trackNode = this.createTrackNode(sticker);
    if (!trackNode) return;

    // 基準時刻を使用（同期精度向上のため）
    const now = referenceTime ?? Tone.now();
    const transportPosition = Tone.getTransport().seconds;

    // 次の小節境界から開始
    const startDelaySeconds = immediate ? 0.01 : this.getTimeToNextMeasure();
    const startTime = now + startDelaySeconds;

    // オフセットを計算（再生開始時点での位置を計算して同期）
    const startPosition = transportPosition + startDelaySeconds;
    const offset = startPosition % LOOP_DURATION;

    trackNode.player.start(startTime, offset);
    this.trackNodes.set(sticker.id, trackNode);
    this.stickerStates.set(sticker.id, sticker);
  }

  /**
   * トラックを停止（オーディオノードのみ破棄、状態は保持）
   */
  private stopTrack(stickerId: string): void {
    const trackNode = this.trackNodes.get(stickerId);
    if (trackNode) {
      this.disposeTrackNode(trackNode);
    }
    this.trackNodes.delete(stickerId);
    // stickerStatesは保持（再生再開時に必要）
  }

  /**
   * トラックを完全に削除（状態も含めて）
   */
  private removeTrack(stickerId: string): void {
    this.stopTrack(stickerId);
    this.stickerStates.delete(stickerId);
  }

  /**
   * シールの状態に基づいてトラックを更新
   */
  private updateTrack(sticker: StickerState): void {
    const trackNode = this.trackNodes.get(sticker.id);
    if (!trackNode) return;

    // 音量を更新
    const volume = this.calculateStickerVolume(sticker);
    trackNode.gain.gain.rampTo(volume, 0.1);

    // パンを更新
    const panValue = this.calculatePanValue(sticker);
    trackNode.panner.pan.rampTo(panValue, 0.1);

    // エフェクト強度を更新
    const effectIntensity = this.calculateEffectIntensity(sticker);
    trackNode.phaser.set({
      frequency: 0.5 + effectIntensity * 2,
      octaves: 1 + effectIntensity * 2,
      baseFrequency: 300 + effectIntensity * 500,
      wet: effectIntensity * 0.6,
    });

    // ピッチを更新
    trackNode.pitchShift.pitch = sticker.pitch || 0;

    // 状態を保存
    this.stickerStates.set(sticker.id, sticker);
  }

  /**
   * 合計音量を更新（シンプルな加算方式）
   * コンプレッサー/リミッターが自然にピーク制御を行う
   */
  private updateMasterEffects(): void {
    // 合計音量を計算（参考値として保持）
    let total = 0;
    for (const state of this.stickerStates.values()) {
      total += this.calculateStickerVolume(state);
    }
    this.totalVolume = total;

    // マスターゲインはユーザー設定音量のみ（自動減衰なし）
    if (this.masterGain) {
      this.masterGain.gain.rampTo(this.masterVolume, 0.1);
    }

    this.notifyStateChange();
  }

  /**
   * 台紙の幅を設定（パンニング計算用）
   */
  setSheetWidth(width: number): void {
    this.sheetWidth = width;
  }

  /**
   * シール一覧から状態を同期
   */
  syncWithStickers(stickers: StickerState[]): void {
    // 現在のシールIDセット
    const currentIds = new Set(stickers.map((s) => s.id));

    // 削除されたシールのトラックを完全に削除
    const stickersToRemove: string[] = [];
    for (const stickerId of this.stickerStates.keys()) {
      if (!currentIds.has(stickerId)) {
        stickersToRemove.push(stickerId);
      }
    }
    for (const stickerId of stickersToRemove) {
      this.removeTrack(stickerId);
    }

    // タイプごとのカウントをリセット
    const newCounts = new Map<string, number>();

    // 新しいトラック用の共通基準時刻（同期精度向上）
    const referenceTime = Tone.now();

    // 各シールの状態を更新または追加
    for (const sticker of stickers) {
      if (!isStickerType(sticker.type)) continue;

      // カウントを更新
      const count = newCounts.get(sticker.type) || 0;
      newCounts.set(sticker.type, count + 1);

      const existingTrack = this.trackNodes.get(sticker.id);

      if (this.isPlaying) {
        if (existingTrack) {
          // 既存トラックの状態を更新
          this.updateTrack(sticker);
        } else {
          // 新しいトラックを開始（共通基準時刻を使用）
          this.startTrack(sticker, false, referenceTime);
        }
      } else {
        // 再生していない場合は状態のみ保存
        this.stickerStates.set(sticker.id, sticker);
      }
    }

    this.stickerCounts = newCounts;

    // マスターエフェクトを更新
    this.updateMasterEffects();
  }

  /**
   * 再生開始
   */
  play(): void {
    if (!this.isInitialized || this.isPlaying) return;

    // Tone.jsコンテキストをresumeする
    if (Tone.getContext().state === 'suspended') {
      Tone.getContext().resume();
    }

    this.isPlaying = true;

    // Transportを開始
    Tone.getTransport().start();

    // 全トラックで共通の基準時刻を使用（同期精度向上）
    const referenceTime = Tone.now();

    // stickerStatesから全てのシールのトラックを開始
    for (const sticker of this.stickerStates.values()) {
      this.startTrack(sticker, true, referenceTime);
    }

    this.notifyStateChange();
  }

  /**
   * 再生停止
   */
  stop(): void {
    if (!this.isPlaying) return;

    this.isPlaying = false;

    // Transportを停止
    Tone.getTransport().stop();

    // 全トラックを安全に停止・破棄
    for (const trackNode of this.trackNodes.values()) {
      this.disposeTrackNode(trackNode);
    }
    this.trackNodes.clear();

    this.notifyStateChange();
  }

  /**
   * トラックノードを安全に破棄
   */
  private disposeTrackNode(trackNode: TrackNode): void {
    try {
      // Tone.js Playerはdispose()で自動的に停止される
      // stop()を明示的に呼ぶとタイミングによってはエラーになる
      if (trackNode.player.state === 'started') {
        trackNode.player.stop();
      }
    } catch {
      // Ignore stop errors
    }

    try {
      trackNode.player.dispose();
    } catch {
      // Ignore dispose errors
    }

    try {
      trackNode.gain.dispose();
    } catch {
      // Ignore dispose errors
    }

    try {
      trackNode.panner.dispose();
    } catch {
      // Ignore dispose errors
    }

    try {
      trackNode.phaser.dispose();
    } catch {
      // Ignore dispose errors
    }

    try {
      trackNode.pitchShift.dispose();
    } catch {
      // Ignore dispose errors
    }
  }

  /**
   * 再生/停止をトグル
   */
  toggle(): void {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.play();
    }
  }

  /**
   * マスターボリュームを設定
   */
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.rampTo(this.masterVolume, 0.1);
    }
    this.notifyStateChange();
  }

  /**
   * 現在の状態を取得
   */
  getState(): AudioEngineState {
    return {
      isPlaying: this.isPlaying,
      isInitialized: this.isInitialized,
      masterVolume: this.masterVolume,
      activeTracks: new Map(this.stickerCounts),
      totalVolume: this.totalVolume,
      saturationAmount: 0, // サチュレーションは無効化（コンプレッサー/リミッターで保護）
    };
  }

  /**
   * AudioContextを取得（動画エクスポート用）
   */
  getAudioContext(): AudioContext | null {
    return Tone.getContext().rawContext as AudioContext;
  }

  /**
   * AudioBufferを取得（動画エクスポート用）
   */
  getAudioBuffer(type: string): AudioBuffer | undefined {
    const buffer = this.audioBuffers.get(type);
    return buffer?.get() as AudioBuffer | undefined;
  }

  /**
   * ToneAudioBufferを取得
   */
  getToneAudioBuffer(type: string): Tone.ToneAudioBuffer | undefined {
    return this.audioBuffers.get(type);
  }

  /**
   * シールカウントを取得
   */
  getStickerCounts(): Map<string, number> {
    return new Map(this.stickerCounts);
  }

  /**
   * シール状態を取得
   */
  getStickerStates(): Map<string, StickerState> {
    return new Map(this.stickerStates);
  }

  /**
   * 現在のサチュレーション量を取得（無効化済み、常に0を返す）
   */
  getSaturationAmount(): number {
    return 0;
  }

  /**
   * スペクトラムデータを取得（0-1の配列）
   */
  getFrequencyData(): Float32Array {
    if (!this.analyser || !this.isPlaying) {
      return new Float32Array(128);
    }
    const data = this.analyser.getValue() as Float32Array;
    // dB値を0-1に変換 (-100dB ~ 0dB -> 0 ~ 1)
    const normalized = new Float32Array(data.length);
    for (let i = 0; i < data.length; i++) {
      normalized[i] = Math.max(0, Math.min(1, (data[i] + 100) / 100));
    }
    return normalized;
  }

  /**
   * 状態変更コールバックを登録
   */
  onStateChange(callback: StateChangeCallback): () => void {
    this.stateChangeCallbacks.add(callback);
    return () => this.stateChangeCallbacks.delete(callback);
  }

  private notifyStateChange(): void {
    const state = this.getState();
    for (const callback of this.stateChangeCallbacks) {
      callback(state);
    }
  }

  /**
   * クリーンアップ
   */
  dispose(): void {
    this.stop();

    // 全てのバッファを破棄
    for (const buffer of this.audioBuffers.values()) {
      buffer.dispose();
    }
    this.audioBuffers.clear();

    // マスターエフェクトを破棄
    this.masterGain?.dispose();
    this.masterDistortion?.dispose();
    this.masterCompressor?.dispose();
    this.masterLimiter?.dispose();
    this.analyser?.dispose();

    this.stickerCounts.clear();
    this.stickerStates.clear();
    this.isInitialized = false;
    AudioEngine.instance = null;
  }
}

export default AudioEngine;
export { LOOP_DURATION, SECONDS_PER_MEASURE, BPM };
