import { useState } from 'react';
import { StickerSheet } from '@/app/components/StickerSheet';
import { StickerPalette } from '@/app/components/StickerPalette';
import { ControlPanel } from '@/app/components/ControlPanel';
import { StickerEditor } from '@/app/components/StickerEditor';
import { CustomDragLayer } from '@/app/components/CustomDragLayer';
import { Menu, X } from 'lucide-react';

export interface Sticker {
  id: string;
  type: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  imageUrl?: string;
}

export function StickerAlbum() {
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [customStickers, setCustomStickers] = useState<Array<{ id: string; imageUrl: string }>>([]);
  const [history, setHistory] = useState<Sticker[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isControlsOpen, setIsControlsOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);

  const handleUploadImage = (imageUrl: string) => {
    const newCustomSticker = {
      id: `custom-${Date.now()}`,
      imageUrl,
    };
    setCustomStickers([...customStickers, newCustomSticker]);
  };

  const handleDragStart = () => {
    setIsControlsOpen(false);
    setIsPaletteOpen(false);
  };

  const handleAddSticker = (type: string, x: number, y: number, imageUrl?: string) => {
    const newSticker: Sticker = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      x,
      y,
      rotation: Math.random() * 10 - 5, // ランダムに-5度から+5度回転
      scale: 1,
      imageUrl,
    };
    const newStickers = [...stickers, newSticker];
    setStickers(newStickers);
    
    // 履歴を更新
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newStickers);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setStickers(history[newIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setStickers(history[newIndex]);
    }
  };

  const handleSave = () => {
    try {
      localStorage.setItem('stickerAlbum', JSON.stringify(stickers));
      localStorage.setItem('customStickers', JSON.stringify(customStickers));
      alert('台紙を保存しました！');
    } catch (error) {
      console.error('保存に失敗しました:', error);
      alert('保存に失敗しました');
    }
  };

  const handleLoad = () => {
    try {
      const saved = localStorage.getItem('stickerAlbum');
      const savedCustom = localStorage.getItem('customStickers');
      
      if (saved) {
        const loadedStickers = JSON.parse(saved);
        setStickers(loadedStickers);
        setHistory([loadedStickers]);
        setHistoryIndex(0);
        
        if (savedCustom) {
          setCustomStickers(JSON.parse(savedCustom));
        }
        
        alert('台紙を読み込みました！');
      } else {
        alert('保存されたデータがありません');
      }
    } catch (error) {
      console.error('読み込みに失敗しました:', error);
      alert('読み込みに失敗しました');
    }
  };

  const handleClear = () => {
    if (confirm('台紙をクリアしますか？')) {
      setStickers([]);
      setHistory([[]]);
      setHistoryIndex(0);
      setSelectedStickerId(null);
    }
  };

  const handleSelectSticker = (id: string) => {
    setSelectedStickerId(id);
  };

  const handleDeselectSticker = () => {
    setSelectedStickerId(null);
  };

  const handleUpdateSticker = (id: string, updates: Partial<Sticker>) => {
    const newStickers = stickers.map(sticker => 
      sticker.id === id ? { ...sticker, ...updates } : sticker
    );
    setStickers(newStickers);
    
    // 履歴を更新
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newStickers);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // リアルタイムプレビュー用（履歴には残さない）
  const handleUpdateStickerPreview = (id: string, updates: Partial<Sticker>) => {
    const newStickers = stickers.map(sticker => 
      sticker.id === id ? { ...sticker, ...updates } : sticker
    );
    setStickers(newStickers);
  };

  const handleMoveSticker = (id: string, x: number, y: number) => {
    const newStickers = stickers.map(sticker => 
      sticker.id === id ? { ...sticker, x, y } : sticker
    );
    setStickers(newStickers);
    
    // 履歴を更新
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newStickers);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <header className="mb-4 lg:mb-8 text-center">
        <h1 className="text-3xl lg:text-5xl font-bold text-amber-900 mb-2" style={{ fontFamily: 'Georgia, serif' }}>
          My Sticker Album
        </h1>
        <p className="text-sm lg:text-base text-amber-700">ドラッグ＆ドロップでシールを貼ろう</p>
      </header>

      {/* モバイル用トグルボタン */}
      <div className="lg:hidden fixed top-4 right-4 z-50">
        <button
          onClick={() => setIsPaletteOpen(!isPaletteOpen)}
          className="p-3 bg-pink-500 hover:bg-pink-600 text-white rounded-full shadow-lg transition-all active:scale-95"
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
        />
      </div>

      {/* オーバーレイ - モバイルのみ */}
      {isPaletteOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsPaletteOpen(false)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-8">
        {/* シール選択エリア - デスクトップは常に表示、モバイルはドロワー */}
        <div className={`
          fixed lg:relative top-0 right-0 w-80 lg:w-auto h-full lg:h-auto
          lg:col-span-1
          bg-white lg:bg-transparent shadow-2xl lg:shadow-none
          transform transition-transform duration-300 ease-in-out
          z-40 lg:z-auto lg:transform-none overflow-y-auto
          ${isPaletteOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        `}>
          <div className="lg:hidden flex justify-start p-4">
            <button
              onClick={() => setIsPaletteOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="p-4 lg:p-0 space-y-4">
            <StickerPalette
              customStickers={customStickers}
              onUploadImage={handleUploadImage}
              onDragStart={handleDragStart}
            />
          </div>
        </div>

        {/* 台紙エリア */}
        <div className="lg:col-span-3">
          <StickerSheet
            stickers={stickers}
            onAddSticker={handleAddSticker}
            onSelectSticker={handleSelectSticker}
            onDeselectSticker={handleDeselectSticker}
            onUpdateSticker={handleUpdateStickerPreview}
            onUpdateStickerWithHistory={handleUpdateSticker}
            selectedStickerId={selectedStickerId}
            onMoveSticker={handleMoveSticker}
          />
        </div>
      </div>

      {/* モバイル用: 選択されたシールの編集UI（コントロールパネルの上） */}
      {selectedStickerId && stickers.find(s => s.id === selectedStickerId) && (
        <div className="lg:hidden fixed bottom-24 left-0 right-0 z-50">
          <StickerEditor
            sticker={stickers.find(s => s.id === selectedStickerId)!}
            onUpdate={handleUpdateSticker}
            onPreview={handleUpdateStickerPreview}
            onClose={handleDeselectSticker}
          />
        </div>
      )}

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
        />
      </div>

      {/* ドラッグレイヤー */}
      <CustomDragLayer />
    </div>
  );
}