import { DraggableSticker } from '@/app/components/DraggableSticker';
import { STICKER_LAYOUT, StickerLayoutItem } from '../../config/stickerLayout';
import { useState, useRef, useCallback, useEffect } from 'react';
import { Copy, Trash2, Download } from 'lucide-react';

interface StickerPaletteProps {
  onDragStart?: () => void;
  onStickerUsed?: (paletteId: string) => void;
}

// グローバルな開発者モード状態を管理
let globalDevModeCallback: ((enabled: boolean) => void) | null = null;
// グローバルなシール削除コールバック
let globalRemoveStickerCallback: ((paletteId: string) => void) | null = null;

// ブラウザコンソールからアクセス可能なコマンドを登録
if (typeof window !== 'undefined') {
  (window as Window & { enableStickerDevMode?: () => void; disableStickerDevMode?: () => void }).enableStickerDevMode = () => {
    globalDevModeCallback?.(true);
    console.log('Sticker Dev Mode: ON');
  };
  (window as Window & { enableStickerDevMode?: () => void; disableStickerDevMode?: () => void }).disableStickerDevMode = () => {
    globalDevModeCallback?.(false);
    console.log('Sticker Dev Mode: OFF');
  };
}

// 外部からシールを削除するための関数をエクスポート
export function removeStickerFromPalette(paletteId: string) {
  globalRemoveStickerCallback?.(paletteId);
}

// グローバルなシール追加コールバック
let globalAddStickerCallback: ((stickerId: string, size: number, rotation: number) => void) | null = null;

// 外部からシールを追加するための関数をエクスポート（台紙に戻す機能用）
export function addStickerToPalette(stickerId: string, size: number, rotation: number) {
  globalAddStickerCallback?.(stickerId, size, rotation);
}

// グローバルなパレットリセットコールバック
let globalResetPaletteCallback: (() => void) | null = null;

// 外部からパレットを初期状態にリセットするための関数をエクスポート
export function resetPalette() {
  globalResetPaletteCallback?.();
}

// グローバルなシールタイプで削除コールバック
let globalRemoveStickerByTypeCallback: ((stickerId: string) => void) | null = null;

// 外部からシールをタイプ（stickerId）で削除するための関数をエクスポート（Redo用）
export function removeStickerByType(stickerId: string) {
  globalRemoveStickerByTypeCallback?.(stickerId);
}

export function StickerPalette({ onDragStart }: StickerPaletteProps) {
  const [devMode, setDevMode] = useState(false);
  const [layout, setLayout] = useState<StickerLayoutItem[]>(STICKER_LAYOUT);

  // グローバルコールバックを登録
  useEffect(() => {
    globalDevModeCallback = setDevMode;
    globalRemoveStickerCallback = (paletteId: string) => {
      setLayout(prev => prev.filter(item => item.id !== paletteId));
    };
    globalAddStickerCallback = (stickerId: string, size: number, rotation: number) => {
      // STICKER_LAYOUTから元の位置を探す（現在のlayoutにないものを優先）
      setLayout(prev => {
        const currentIds = new Set(prev.map(item => item.id));
        // STICKER_LAYOUTから同じstickerIdで、現在のlayoutにないアイテムを探す
        const originalItem = STICKER_LAYOUT.find(
          item => item.stickerId === stickerId && !currentIds.has(item.id)
        );

        if (originalItem) {
          // 元の位置・サイズ・回転で追加
          return [...prev, { ...originalItem }];
        } else {
          // 見つからない場合はランダムな位置に追加
          const newItem: StickerLayoutItem = {
            id: `returned_${Date.now()}`,
            stickerId,
            x: 10 + Math.random() * 60,
            y: 10 + Math.random() * 60,
            size: Math.round(size),
            rotation: Math.round(rotation),
          };
          return [...prev, newItem];
        }
      });
    };
    globalResetPaletteCallback = () => {
      setLayout(STICKER_LAYOUT);
    };
    globalRemoveStickerByTypeCallback = (stickerId: string) => {
      // 同じstickerIdを持つ最初のアイテムを削除
      setLayout(prev => {
        const index = prev.findIndex(item => item.stickerId === stickerId);
        if (index !== -1) {
          return [...prev.slice(0, index), ...prev.slice(index + 1)];
        }
        return prev;
      });
    };
    return () => {
      globalDevModeCallback = null;
      globalRemoveStickerCallback = null;
      globalAddStickerCallback = null;
      globalResetPaletteCallback = null;
      globalRemoveStickerByTypeCallback = null;
    };
  }, []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; itemX: number; itemY: number } | null>(null);

  // ドラッグ開始
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent, id: string) => {
    if (!devMode) return;
    e.preventDefault();
    e.stopPropagation();

    const item = layout.find(i => i.id === id);
    if (!item) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    dragRef.current = {
      startX: clientX,
      startY: clientY,
      itemX: item.x,
      itemY: item.y,
    };
    setSelectedId(id);
  }, [devMode, layout]);

  // ドラッグ中
  const handleDragMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!devMode || !dragRef.current || !selectedId || !containerRef.current) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const rect = containerRef.current.getBoundingClientRect();
    const deltaX = ((clientX - dragRef.current.startX) / rect.width) * 100;
    const deltaY = ((clientY - dragRef.current.startY) / rect.height) * 100;

    const newX = Math.max(0, Math.min(85, dragRef.current.itemX + deltaX));
    const newY = Math.max(0, Math.min(85, dragRef.current.itemY + deltaY));

    setLayout(prev => prev.map(item =>
      item.id === selectedId ? { ...item, x: newX, y: newY } : item
    ));
  }, [devMode, selectedId]);

  // ドラッグ終了
  const handleDragEnd = useCallback(() => {
    dragRef.current = null;
  }, []);

  // サイズ変更
  const handleSizeChange = (id: string, size: number) => {
    setLayout(prev => prev.map(item =>
      item.id === id ? { ...item, size } : item
    ));
  };

  // 回転変更
  const handleRotationChange = (id: string, rotation: number) => {
    setLayout(prev => prev.map(item =>
      item.id === id ? { ...item, rotation } : item
    ));
  };

  // 複製
  const handleDuplicate = (id: string) => {
    const item = layout.find(i => i.id === id);
    if (!item) return;

    const newItem: StickerLayoutItem = {
      ...item,
      id: `${Date.now()}`,
      x: Math.min(85, item.x + 10),
      y: Math.min(85, item.y + 10),
    };
    setLayout(prev => [...prev, newItem]);
    setSelectedId(newItem.id);
  };

  // 削除
  const handleDelete = (id: string) => {
    setLayout(prev => prev.filter(item => item.id !== id));
    setSelectedId(null);
  };

  // 配置をダウンロード
  const handleExport = () => {
    const exportData = layout.map(({ id, stickerId, x, y, size, rotation }) => ({
      id,
      stickerId,
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      size: Math.round(size),
      rotation: Math.round(rotation),
    }));

    const tsContent = `export const STICKER_LAYOUT: StickerLayoutItem[] = ${JSON.stringify(exportData, null, 2).replace(/"(\w+)":/g, '$1:')};`;

    const blob = new Blob([tsContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stickerLayout.ts';
    a.click();
    URL.revokeObjectURL(url);

    console.log('Sticker Layout:', exportData);
  };

  // 開発者モードがオフになった時に自動エクスポート
  useEffect(() => {
    if (!devMode && selectedId !== null) {
      setSelectedId(null);
    }
  }, [devMode, selectedId]);

  const selectedItem = layout.find(i => i.id === selectedId);

  return (
    <div className="relative">
      {/* パレットの装飾と背景 */}
      <div
        className="relative rounded-xl overflow-hidden"
        style={{
          background: '#fefefe',
          boxShadow: `
            0 25px 50px -12px rgba(0,0,0,0.25),
            0 12px 24px -8px rgba(0,0,0,0.15),
            0 4px 6px -2px rgba(0,0,0,0.1),
            inset 0 2px 4px rgba(255,255,255,0.9),
            inset 0 -2px 4px rgba(0,0,0,0.02)
          `,
          border: devMode ? '2px solid #f59e0b' : '1px solid rgba(255,255,255,0.8)',
        }}
      >
        {/* メイン光沢グラデーション */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              linear-gradient(
                165deg,
                rgba(255,255,255,0) 0%,
                rgba(255,255,255,0) 35%,
                rgba(255,255,255,0.95) 42%,
                rgba(255,255,255,1) 45%,
                rgba(255,255,255,0.95) 48%,
                rgba(255,255,255,0) 55%,
                rgba(255,255,255,0) 100%
              )
            `,
          }}
        />
        {/* 上部ハイライト */}
        <div
          className="absolute inset-x-0 top-0 h-24 pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.7) 0%, transparent 100%)',
          }}
        />
        {/* 微細なテクスチャ感 */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative p-4">
          {/* シール一覧 */}
          <div
            ref={containerRef}
            className="relative"
            style={{ height: '380px' }}
            onMouseMove={handleDragMove}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            onTouchMove={handleDragMove}
            onTouchEnd={handleDragEnd}
            onClick={() => devMode && setSelectedId(null)}
          >
            {layout.map((item) => (
              <div
                key={item.id}
                className={`absolute ${devMode ? 'cursor-move' : ''}`}
                style={{
                  left: `${item.x}%`,
                  top: `${item.y}%`,
                  transform: `rotate(${item.rotation}deg)`,
                  zIndex: selectedId === item.id ? 50 : 10,
                }}
                onMouseDown={(e) => handleDragStart(e, item.id)}
                onTouchStart={(e) => handleDragStart(e, item.id)}
                onClick={(e) => {
                  if (devMode) {
                    e.stopPropagation();
                    setSelectedId(item.id);
                  }
                }}
              >
                {/* 選択枠 */}
                {devMode && selectedId === item.id && (
                  <div
                    className="absolute -inset-2 border-2 border-amber-500 rounded-lg pointer-events-none"
                    style={{ boxShadow: '0 0 8px rgba(245, 158, 11, 0.5)' }}
                  />
                )}

                {devMode ? (
                  <div
                    style={{
                      filter: `
                        drop-shadow(0 1px 1px rgba(0, 0, 0, 0.12))
                        drop-shadow(0 2px 4px rgba(0, 0, 0, 0.08))
                      `,
                    }}
                  >
                    <img
                      src={`/assets/stickers/${item.stickerId}.png`}
                      alt={item.stickerId}
                      width={item.size}
                      height={item.size}
                      style={{ objectFit: 'contain', pointerEvents: 'none' }}
                      draggable={false}
                    />
                  </div>
                ) : (
                  <DraggableSticker
                    type={item.stickerId}
                    size={item.size}
                    rotation={item.rotation}
                    paletteId={item.id}
                    onDragStart={onDragStart}
                  />
                )}
              </div>
            ))}
          </div>

          {/* 開発者モード: 調整パネル */}
          {devMode && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-amber-800">DEV MODE</span>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-amber-500 text-white rounded hover:bg-amber-600"
                >
                  <Download className="w-3 h-3" />
                  Export
                </button>
              </div>

              {selectedItem ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">{selectedItem.stickerId}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleDuplicate(selectedItem.id)}
                        className="p-1 text-gray-600 hover:text-amber-600 hover:bg-amber-100 rounded"
                        title="複製"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(selectedItem.id)}
                        className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-100 rounded"
                        title="削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-500">Size: {Math.round(selectedItem.size)}px</label>
                    <input
                      type="range"
                      min="40"
                      max="120"
                      value={selectedItem.size}
                      onChange={(e) => handleSizeChange(selectedItem.id, Number(e.target.value))}
                      className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-500">Rotation: {Math.round(selectedItem.rotation)}deg</label>
                    <input
                      type="range"
                      min="-45"
                      max="45"
                      value={selectedItem.rotation}
                      onChange={(e) => handleRotationChange(selectedItem.id, Number(e.target.value))}
                      className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>

                  <div className="text-xs text-gray-400">
                    x: {selectedItem.x.toFixed(1)}% | y: {selectedItem.y.toFixed(1)}%
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500">Click a sticker to edit</p>
              )}
            </div>
          )}

          {!devMode && (
            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                シールをドラッグして台紙に貼り付けよう
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
