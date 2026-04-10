import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StickerSheet, type AspectRatio } from '@/app/components/StickerSheet';
import { StickerPalette, removeStickerFromPalette, addStickerToPalette, removeStickerByType, resetPalette } from '@/app/components/StickerPalette';
import { ControlPanel } from '@/app/components/ControlPanel';
import { AudioControls } from '@/app/components/AudioControls';
import { CustomDragLayer } from '@/app/components/CustomDragLayer';
import { ExportDialog } from '@/app/components/ExportDialog';
import { ShareDialog } from '@/app/components/ShareDialog';
import { BackgroundSwitcher } from '@/app/components/BackgroundSwitcher';
import { WelcomeModal, shouldShowWelcome } from '@/app/components/WelcomeModal';
import { X, Sparkles, Undo2, Redo2, Download, Share2, RotateCcw, HelpCircle } from 'lucide-react';
import { useAudioEngine } from '../../audio';
import { DEFAULT_BACKGROUND_ID } from '../../config/backgroundConfig';
import { useBackgroundData } from '@/config/BackgroundDataContext';
import { useKitData } from '@/config/KitDataContext';
import { getKitBaseSemitone } from '../../config/kitConfig';
import { isStickerPercussion } from '../../config/stickerConfig';

export interface Sticker {
  id: string;
  type: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  pitch: number; // 音程調整 (-6 to +6 semitones)
  paletteId?: string; // 元のパレットアイテムID（Undo/Redo用）
}

export function StickerAlbum() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const initialKitNumber = searchParams.get('kit') || undefined;

  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [history, setHistory] = useState<Sticker[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isControlsOpen, setIsControlsOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [exportedVideoBlob, setExportedVideoBlob] = useState<Blob | null>(null);
  const [backgroundId, setBackgroundId] = useState(DEFAULT_BACKGROUND_ID);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(() => shouldShowWelcome());

  // Aspect ratio is fixed to 3:4 for cross-device compatibility
  // This ensures works look the same when shared between PC and mobile
  const aspectRatio: AspectRatio = '3:4';

  // Ref for StickerSheet DOM element
  const stickerSheetRef = useRef<HTMLDivElement>(null);

  // Audio engine
  const {
    isPlaying,
    isInitialized: isAudioInitialized,
    activeTracks,
    saturationAmount,
    initialize: initializeAudio,
    toggle: toggleAudio,
    setSheetWidth,
    syncWithStickers,
    setCurrentBackgroundKit,
  } = useAudioEngine();

  // 動的背景データ（AudioEngine連動用）
  const { backgrounds } = useBackgroundData();

  // シールが変更されたときにオーディオエンジンと同期
  // pitch値をスライダー位置から実際の転調量に変換
  useEffect(() => {
    const stickersForAudio = stickers.map(s => {
      const kitId = s.type.split('-')[0] || '001';
      const baseSemitone = isStickerPercussion(s.type) ? 0 : getKitBaseSemitone(kitId);
      return {
        ...s,
        pitch: s.pitch - baseSemitone, // スライダー位置 - ベースキー = 実際の転調量
      };
    });
    syncWithStickers(stickersForAudio);
  }, [stickers, syncWithStickers]);

  // 背景が変わるたびに AudioEngine にスペシャル背景→キット紐付けを通知
  useEffect(() => {
    const bg = backgrounds.find((b) => b.id === backgroundId);
    if (bg?.isSpecial && bg.specialKitId) {
      setCurrentBackgroundKit(bg.specialKitId);
    } else {
      setCurrentBackgroundKit(null);
    }
  }, [backgroundId, backgrounds, setCurrentBackgroundKit]);

  // スペシャル台紙中に、紐付かないキットのシールが置かれたら通常台紙に自動で戻す
  const { kits } = useKitData();
  useEffect(() => {
    const bg = backgrounds.find((b) => b.id === backgroundId);
    if (!bg?.isSpecial || !bg.specialKitId) return;

    // スペシャル台紙の紐付くキット UUID から kit_number を解決
    const linkedKit = kits.find((k) => k.kitUuid === bg.specialKitId);
    if (!linkedKit) return;
    const linkedKitNumber = linkedKit.id; // KitDefinition.id は kit_number

    // 紐付かないキットのシールが1枚でもあれば通常台紙に戻す
    const hasForeignSticker = stickers.some((s) => {
      const kitNumber = s.type.split('-')[0] || '';
      return kitNumber !== linkedKitNumber;
    });

    if (hasForeignSticker) {
      setBackgroundId(DEFAULT_BACKGROUND_ID);
    }
  }, [stickers, backgroundId, backgrounds, kits]);

  // 台紙の幅をオーディオエンジンに設定（パンニング計算用）
  useLayoutEffect(() => {
    const updateSheetWidth = () => {
      const sheetElement = document.getElementById('sticker-sheet');
      if (sheetElement) {
        setSheetWidth(sheetElement.clientWidth);
      }
    };

    updateSheetWidth();
    window.addEventListener('resize', updateSheetWidth);
    return () => window.removeEventListener('resize', updateSheetWidth);
  }, [setSheetWidth]);

  const handleDragStart = () => {
    setIsControlsOpen(false);
    setIsPaletteOpen(false);
  };

  const handleAddSticker = useCallback(
    (type: string, x: number, y: number, size?: number, rotation?: number, paletteId?: string) => {
      // パレットからのサイズをscaleに変換（基準サイズ80pxに対する比率）
      const scale = size ? size / 80 : 1;
      // メロディ系はキットのベースキー位置からスタート（パーカッションは0）
      const kitId = type.split('-')[0] || '001';
      const initialPitch = isStickerPercussion(type) ? 0 : getKitBaseSemitone(kitId);
      const newSticker: Sticker = {
        id: `${Date.now()}-${Math.random()}`,
        type,
        x,
        y,
        rotation: rotation ?? (Math.random() * 10 - 5),
        scale,
        pitch: initialPitch, // スライダー位置（実際の転調はベースキー分を引く）
        paletteId, // Undo/Redo用に元のパレットIDを保存
      };
      const newStickers = [...stickers, newSticker];
      setStickers(newStickers);

      // パレットからシールを削除（有限シール）
      if (paletteId) {
        removeStickerFromPalette(paletteId);
      }

      // オーディオはsyncWithStickersで自動同期される

      // 履歴を更新
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newStickers);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    },
    [stickers, history, historyIndex]
  );

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const previousStickers = history[newIndex];
      const previousIds = new Set(previousStickers.map(s => s.id));

      // Undoで削除されるシール（現在あるが、前の状態にない）をパレットに戻す
      for (const sticker of stickers) {
        if (!previousIds.has(sticker.id) && sticker.paletteId) {
          // パレットからドラッグされたシールを元の位置に戻す
          addStickerToPalette(sticker.type, 80, 0);
        }
      }

      setHistoryIndex(newIndex);
      setStickers(previousStickers);
    }
  }, [historyIndex, history, stickers]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const nextStickers = history[newIndex];
      const currentIds = new Set(stickers.map(s => s.id));

      // Redoで追加されるシール（次の状態にあるが、現在ない）をパレットから削除
      for (const sticker of nextStickers) {
        if (!currentIds.has(sticker.id) && sticker.paletteId) {
          // パレットから同じタイプのシールを1つ削除
          removeStickerByType(sticker.type);
        }
      }

      setHistoryIndex(newIndex);
      setStickers(nextStickers);
    }
  }, [historyIndex, history, stickers]);

  const handleSave = useCallback(() => {
    try {
      localStorage.setItem('stickerAlbum', JSON.stringify(stickers));
      alert(t('app.savedSuccess'));
    } catch (error) {
      console.error('Save failed:', error);
      alert(t('app.saveFailed'));
    }
  }, [stickers, t]);

  const handleLoad = useCallback(() => {
    try {
      const saved = localStorage.getItem('stickerAlbum');

      if (saved) {
        const loadedStickers = JSON.parse(saved);
        setStickers(loadedStickers);
        setHistory([loadedStickers]);
        setHistoryIndex(0);

        alert(t('app.loadedSuccess'));
      } else {
        alert(t('app.noSavedData'));
      }
    } catch (error) {
      console.error('Load failed:', error);
      alert(t('app.loadFailed'));
    }
  }, [t]);

  const handleClear = useCallback(() => {
    // 確認ダイアログはControlPanelで表示
    // パレットを初期状態にリセット
    resetPalette();
    setStickers([]);
    setHistory([[]]);
    setHistoryIndex(0);
    setSelectedStickerId(null);
  }, []);

  const handleSelectSticker = useCallback((id: string) => {
    setSelectedStickerId(id);
  }, []);

  const handleDeselectSticker = useCallback(() => {
    setSelectedStickerId(null);
  }, []);

  const handleUpdateSticker = useCallback(
    (id: string, updates: Partial<Sticker>) => {
      const newStickers = stickers.map((sticker) => (sticker.id === id ? { ...sticker, ...updates } : sticker));
      setStickers(newStickers);

      // 履歴を更新
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newStickers);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    },
    [stickers, history, historyIndex]
  );

  // リアルタイムプレビュー用（履歴には残さない）
  const handleUpdateStickerPreview = useCallback(
    (id: string, updates: Partial<Sticker>) => {
      const newStickers = stickers.map((sticker) => (sticker.id === id ? { ...sticker, ...updates } : sticker));
      setStickers(newStickers);
    },
    [stickers]
  );

  const handleMoveSticker = useCallback(
    (id: string, x: number, y: number) => {
      const newStickers = stickers.map((sticker) => (sticker.id === id ? { ...sticker, x, y } : sticker));
      setStickers(newStickers);

      // 履歴を更新
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newStickers);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    },
    [stickers, history, historyIndex]
  );

  const handleDeleteSticker = useCallback(
    (id: string) => {
      const stickerToDelete = stickers.find((s) => s.id === id);
      if (!stickerToDelete) return;

      const newStickers = stickers.filter((s) => s.id !== id);
      setStickers(newStickers);

      // オーディオはsyncWithStickersで自動同期される

      // 選択解除
      if (selectedStickerId === id) {
        setSelectedStickerId(null);
      }

      // 履歴を更新
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newStickers);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    },
    [stickers, history, historyIndex, selectedStickerId]
  );

  const handleExport = useCallback(() => {
    setIsExportDialogOpen(true);
  }, []);

  const handleExportClose = useCallback(() => {
    setIsExportDialogOpen(false);
  }, []);

  const handleShareRequest = useCallback((videoBlob: Blob) => {
    setExportedVideoBlob(videoBlob);
    setIsShareDialogOpen(true);
  }, []);

  const handleShareClose = useCallback(() => {
    setIsShareDialogOpen(false);
    setExportedVideoBlob(null);
  }, []);

  return (
    <div className="max-w-7xl mx-auto">
      {/* ヘッダー - PC/モバイル共通 */}
      <header className="mb-4 lg:mb-6 text-center">
        <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-1 lg:mb-2">
          {t('app.albumTitle')}
        </h1>
        <p className="text-sm text-gray-600">{t('app.dragDropHint')}</p>
      </header>

      {/* モバイル用シールボタン（右上に追尾） */}
      <div className={`lg:hidden fixed right-3 top-4 z-50 transition-all duration-300 ${isPaletteOpen ? 'opacity-0 pointer-events-none scale-75' : 'opacity-100 scale-100'}`}>
        <button
          onClick={() => setIsPaletteOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-full shadow-lg transition-all active:scale-95 animate-[fab-pulse_2s_ease-in-out_3]"
          aria-label={t('app.stickers')}
        >
          <span className="text-xs font-bold tracking-wide">シール</span>
        </button>
      </div>

      {/* オーバーレイ - モバイルのみ */}
      {isPaletteOpen && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30" onClick={() => setIsPaletteOpen(false)} />
      )}

      {/* ===== PC用 3カラムレイアウト ===== */}
      <div className="hidden lg:grid lg:grid-cols-[280px_1fr_280px] gap-6 items-start">
        {/* 左カラム: シールパレット */}
        <div className="sticky top-4 w-[280px]">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-4 border border-white/50">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="text-2xl">🎨</span> {t('app.stickers')}
            </h2>
            <StickerPalette onDragStart={handleDragStart} initialKitNumber={initialKitNumber} />
          </div>

          {/* クリエイター導線 */}
          <div className="mt-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <p className="text-sm text-gray-800 font-semibold">
                {t('app.createOwnKit')}
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                to="/creator/signup"
                className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {t('nav.signup')}
              </Link>
              <Link
                to="/creator/login"
                className="flex-1 flex items-center justify-center px-3 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors"
              >
                {t('nav.login')}
              </Link>
            </div>
          </div>

          {/* フッターリンク */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <nav className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
              <Link to="/about" className="hover:text-gray-700 hover:underline">
                {t('footer.about')}
              </Link>
              <Link to="/terms" className="hover:text-gray-700 hover:underline">
                {t('footer.terms')}
              </Link>
              <Link to="/privacy" className="hover:text-gray-700 hover:underline">
                {t('footer.privacy')}
              </Link>
              <Link to="/contact" className="hover:text-gray-700 hover:underline">
                {t('footer.contact')}
              </Link>
            </nav>
            <p className="mt-2 text-xs text-gray-400">
              © 2026 {t('footer.company')}
            </p>
          </div>
        </div>

        {/* 中央カラム: 台紙（主役） */}
        <div className="flex justify-center w-full" ref={stickerSheetRef}>
          <div className="w-[448px]">
            <BackgroundSwitcher
              currentBackgroundId={backgroundId}
              onBackgroundChange={setBackgroundId}
              stickers={stickers}
            />
            <StickerSheet
              stickers={stickers}
              backgroundId={backgroundId}
              aspectRatio={aspectRatio}
              onAddSticker={handleAddSticker}
              onSelectSticker={handleSelectSticker}
              onDeselectSticker={handleDeselectSticker}
              onUpdateSticker={handleUpdateStickerPreview}
              onUpdateStickerWithHistory={handleUpdateSticker}
              selectedStickerId={selectedStickerId}
              onMoveSticker={handleMoveSticker}
              onDeleteSticker={handleDeleteSticker}
            />
          </div>
        </div>

        {/* 右カラム: コントロール群 */}
        <div className="sticky top-4 space-y-4 w-[280px]">
          {/* 再生コントロール */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-4 border border-white/50">
            <h3 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
              <span className="text-lg">🎵</span> {t('app.playSection')}
            </h3>
            <AudioControls
              isPlaying={isPlaying}
              isInitialized={isAudioInitialized}
              activeTracks={activeTracks}
              saturationAmount={saturationAmount}
              onToggle={toggleAudio}
              onInitialize={initializeAudio}
            />
          </div>

          {/* 編集コントロール */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-4 border border-white/50">
            <h3 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
              <span className="text-lg">✏️</span> {t('app.editSection')}
            </h3>
            <div className="flex gap-2">
              <button
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  historyIndex > 0
                    ? 'bg-gray-800 hover:bg-gray-900 text-white'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Undo2 className="w-4 h-4" />
                {t('control.undo')}
              </button>
              <button
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  historyIndex < history.length - 1
                    ? 'bg-gray-800 hover:bg-gray-900 text-white'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Redo2 className="w-4 h-4" />
                {t('control.redo')}
              </button>
            </div>
          </div>

          {/* 出力・共有 */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-4 border border-white/50">
            <h3 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
              <span className="text-lg">📤</span> {t('app.outputSection')}
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => setIsShareDialogOpen(true)}
                disabled={stickers.length === 0}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  stickers.length > 0
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-md hover:shadow-lg'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Share2 className="w-5 h-5" />
                {t('app.shareButton')}
              </button>
              <button
                onClick={handleExport}
                disabled={stickers.length === 0}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  stickers.length > 0
                    ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Download className="w-4 h-4" />
                {t('app.videoExport')}
              </button>
            </div>
          </div>

          {/* その他 */}
          <div className="flex gap-2">
            <button
              onClick={handleClear}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              {t('control.reset')}
            </button>
            <button
              onClick={() => setIsWelcomeOpen(true)}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
              {t('control.help')}
            </button>
          </div>
        </div>
      </div>

      {/* ===== モバイル用レイアウト ===== */}
      <div className="lg:hidden">
        {/* シール選択エリア - ドロワー */}
        <div
          className={`
          fixed top-0 right-0 w-80 h-full
          bg-white shadow-2xl
          transform transition-transform duration-300 ease-in-out
          z-40 overflow-y-auto
          ${isPaletteOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
        >
          <div className="flex justify-start p-4">
            <button onClick={() => setIsPaletteOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="p-4 pb-safe space-y-4">
            <StickerPalette onDragStart={handleDragStart} initialKitNumber={initialKitNumber} />

            {/* クリエイター導線 */}
            <div className="mt-6 pt-6 border-t border-gray-200 pb-8">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  <p className="text-sm text-gray-800 font-semibold">
                    {t('app.createOwnKitLong')}
                  </p>
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  {t('app.publishAsCreator')}
                </p>
                <div className="flex gap-2">
                  <Link
                    to="/creator/signup"
                    className="flex-1 flex items-center justify-center px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors active:scale-[0.98] min-h-[48px]"
                  >
                    {t('nav.signup')}
                  </Link>
                  <Link
                    to="/creator/login"
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg shadow-sm hover:shadow transition-all active:scale-[0.98] min-h-[48px]"
                  >
                    {t('nav.login')}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 台紙エリア */}
        <div>
          <BackgroundSwitcher
            currentBackgroundId={backgroundId}
            onBackgroundChange={setBackgroundId}
            stickers={stickers}
          />
          <StickerSheet
            stickers={stickers}
            backgroundId={backgroundId}
            aspectRatio={aspectRatio}
            onAddSticker={handleAddSticker}
            onSelectSticker={handleSelectSticker}
            onDeselectSticker={handleDeselectSticker}
            onUpdateSticker={handleUpdateStickerPreview}
            onUpdateStickerWithHistory={handleUpdateSticker}
            selectedStickerId={selectedStickerId}
            onMoveSticker={handleMoveSticker}
            onDeleteSticker={handleDeleteSticker}
          />
        </div>
      </div>

      {/* モバイル用フッター固定コントロールパネル（パレットが開いているときは非表示） */}
      <div className={`lg:hidden fixed bottom-0 left-0 right-0 z-50 pb-safe transition-transform duration-300 ${isPaletteOpen ? 'translate-y-full' : 'translate-y-0'}`}>
        <ControlPanel
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onSave={handleSave}
          onLoad={handleLoad}
          onClear={handleClear}
          // Audio props
          isPlaying={isPlaying}
          isAudioInitialized={isAudioInitialized}
          activeTracks={activeTracks}
          saturationAmount={saturationAmount}
          onAudioToggle={toggleAudio}
          onAudioInitialize={initializeAudio}
          // Export props
          onExport={handleExport}
          hasStickers={stickers.length > 0}
          // Share props
          onShare={() => setIsShareDialogOpen(true)}
          // Help props
          onShowHelp={() => setIsWelcomeOpen(true)}
        />
      </div>

      {/* ドラッグレイヤー */}
      <CustomDragLayer />

      {/* エクスポートダイアログ */}
      <ExportDialog
        isOpen={isExportDialogOpen}
        onClose={handleExportClose}
        stickers={stickers}
        stickerSheetRef={stickerSheetRef}
        backgroundId={backgroundId}
        onShareRequest={handleShareRequest}
      />

      {/* 共有ダイアログ */}
      <ShareDialog
        isOpen={isShareDialogOpen}
        onClose={handleShareClose}
        stickers={stickers}
        backgroundId={backgroundId}
        aspectRatio={aspectRatio}
        videoBlob={exportedVideoBlob}
      />

      {/* ウェルカムモーダル */}
      <WelcomeModal
        isOpen={isWelcomeOpen}
        onClose={() => setIsWelcomeOpen(false)}
      />
    </div>
  );
}
