import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { StickerSheet } from '@/app/components/StickerSheet';
import { StickerPalette, removeStickerFromPalette, addStickerToPalette, removeStickerByType, resetPalette } from '@/app/components/StickerPalette';
import { ControlPanel } from '@/app/components/ControlPanel';
import { CustomDragLayer } from '@/app/components/CustomDragLayer';
import { ExportDialog } from '@/app/components/ExportDialog';
import { BackgroundSwitcher } from '@/app/components/BackgroundSwitcher';
import { Menu, X } from 'lucide-react';
import { useAudioEngine } from '../../audio';
import { DEFAULT_BACKGROUND_ID } from '../../config/backgroundConfig';
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
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [history, setHistory] = useState<Sticker[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isControlsOpen, setIsControlsOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [backgroundId, setBackgroundId] = useState(DEFAULT_BACKGROUND_ID);

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
  } = useAudioEngine();

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
      alert('台紙を保存しました！');
    } catch (error) {
      console.error('保存に失敗しました:', error);
      alert('保存に失敗しました');
    }
  }, [stickers]);

  const handleLoad = useCallback(() => {
    try {
      const saved = localStorage.getItem('stickerAlbum');

      if (saved) {
        const loadedStickers = JSON.parse(saved);
        setStickers(loadedStickers);
        setHistory([loadedStickers]);
        setHistoryIndex(0);

        alert('台紙を読み込みました！');
      } else {
        alert('保存されたデータがありません');
      }
    } catch (error) {
      console.error('読み込みに失敗しました:', error);
      alert('読み込みに失敗しました');
    }
  }, []);

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

  return (
    <div className="max-w-7xl mx-auto">
      <header className="mb-4 lg:mb-8 text-center">
        <h1 className="text-3xl lg:text-5xl font-bold text-gray-900 mb-2">
          シール帳
        </h1>
        <p className="text-sm lg:text-base text-gray-600">ドラッグ＆ドロップでシールを貼ろう</p>
      </header>

      {/* モバイル用トグルボタン */}
      <div className="lg:hidden fixed top-4 right-4 z-50">
        <button
          onClick={() => setIsPaletteOpen(!isPaletteOpen)}
          className="p-3 bg-gray-800 hover:bg-gray-900 text-white rounded-full shadow-lg transition-all active:scale-95"
          aria-label="シール"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* コントロールパネル - デスクトップは常に表示、モバイルは下部固定 */}
      <div className="hidden lg:block mb-6">
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
        />
      </div>

      {/* オーバーレイ - モバイルのみ */}
      {isPaletteOpen && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30" onClick={() => setIsPaletteOpen(false)} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-8">
        {/* シール選択エリア - デスクトップは常に表示、モバイルはドロワー */}
        <div
          className={`
          fixed lg:relative top-0 right-0 w-80 lg:w-auto h-full lg:h-auto
          lg:col-span-1
          bg-white lg:bg-transparent shadow-2xl lg:shadow-none
          transform transition-transform duration-300 ease-in-out
          z-40 lg:z-auto lg:transform-none overflow-y-auto
          ${isPaletteOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        `}
        >
          <div className="lg:hidden flex justify-start p-4">
            <button onClick={() => setIsPaletteOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="p-4 lg:p-0 space-y-4">
            <StickerPalette onDragStart={handleDragStart} />
          </div>
        </div>

        {/* 台紙エリア */}
        <div className="lg:col-span-3" ref={stickerSheetRef}>
          <BackgroundSwitcher
            currentBackgroundId={backgroundId}
            onBackgroundChange={setBackgroundId}
          />
          <StickerSheet
            stickers={stickers}
            backgroundId={backgroundId}
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

      {/* モバイル用フッター固定コントロールパネル */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 pb-safe">
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
      />
    </div>
  );
}
