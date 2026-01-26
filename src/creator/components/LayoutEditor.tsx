import { useState, useRef, useEffect, useCallback } from 'react';
import { kitsApi, type Sticker, type StickerLayout } from '@/api/kitsApi';

interface LayoutEditorProps {
  kitId: string;
  stickers: Sticker[];
  kitColor: string;
  kitNumber: string;
  onLayoutsChanged: () => void;
  onClose: () => void;
}

interface LocalLayout extends StickerLayout {
  sticker: Sticker;
}

interface DraggingState {
  layoutId: string;
  startX: number;
  startY: number;
  startLayoutX: number;
  startLayoutY: number;
}

export const LayoutEditor = ({
  kitId,
  stickers,
  kitColor,
  kitNumber,
  onLayoutsChanged,
  onClose,
}: LayoutEditorProps) => {
  const stickerAreaRef = useRef<HTMLDivElement>(null);
  const [layouts, setLayouts] = useState<LocalLayout[]>([]);
  const [selectedLayoutId, setSelectedLayoutId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<DraggingState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // レイアウト読み込み
  const loadLayouts = useCallback(async () => {
    setIsLoading(true);
    const allLayouts: LocalLayout[] = [];

    for (const sticker of stickers) {
      try {
        const response = await kitsApi.getLayouts(kitId, sticker.id);
        response.layouts.forEach(layout => {
          allLayouts.push({ ...layout, sticker });
        });
      } catch (error) {
        console.error(`Failed to load layouts for sticker ${sticker.id}:`, error);
      }
    }

    setLayouts(allLayouts);
    setIsLoading(false);
  }, [kitId, stickers]);

  useEffect(() => {
    loadLayouts();
  }, [loadLayouts]);

  const selectedLayout = layouts.find(l => l.id === selectedLayoutId);
  const selectedSticker = selectedLayout?.sticker;

  // 複製
  const handleDuplicate = async (sticker: Sticker) => {
    setIsSaving(true);
    try {
      // 既存レイアウトの位置を少しずらして配置
      const existingLayouts = layouts.filter(l => l.sticker.id === sticker.id);
      const offsetX = existingLayouts.length * 8;
      const offsetY = existingLayouts.length * 5;

      const response = await kitsApi.createLayout(kitId, sticker.id, {
        x: 10 + offsetX,
        y: 10 + offsetY,
        size: 80,
        rotation: existingLayouts.length * 3,
      });

      setLayouts(prev => [...prev, { ...response.layout, sticker }]);
      setSelectedLayoutId(response.layout.id);
      onLayoutsChanged();
    } catch (error) {
      console.error('Failed to create layout:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 削除
  const handleDelete = async (layoutId: string) => {
    const layout = layouts.find(l => l.id === layoutId);
    if (!layout) return;

    setIsSaving(true);
    try {
      await kitsApi.deleteLayout(kitId, layout.sticker.id, layoutId);
      setLayouts(prev => prev.filter(l => l.id !== layoutId));
      if (selectedLayoutId === layoutId) {
        setSelectedLayoutId(null);
      }
      onLayoutsChanged();
    } catch (error) {
      console.error('Failed to delete layout:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // ドラッグ開始
  const handleMouseDown = (e: React.MouseEvent, layout: LocalLayout) => {
    e.preventDefault();
    setSelectedLayoutId(layout.id);
    setDragging({
      layoutId: layout.id,
      startX: e.clientX,
      startY: e.clientY,
      startLayoutX: layout.x,
      startLayoutY: layout.y,
    });
  };

  // ドラッグ中
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !stickerAreaRef.current) return;

    const rect = stickerAreaRef.current.getBoundingClientRect();
    const deltaX = ((e.clientX - dragging.startX) / rect.width) * 100;
    const deltaY = ((e.clientY - dragging.startY) / rect.height) * 100;

    const newX = Math.max(0, Math.min(90, dragging.startLayoutX + deltaX));
    const newY = Math.max(0, Math.min(85, dragging.startLayoutY + deltaY));

    setLayouts(prev =>
      prev.map(l =>
        l.id === dragging.layoutId ? { ...l, x: newX, y: newY } : l
      )
    );
  };

  // ドラッグ終了
  const handleMouseUp = async () => {
    if (dragging) {
      const layout = layouts.find(l => l.id === dragging.layoutId);
      if (layout) {
        setIsSaving(true);
        try {
          await kitsApi.updateLayout(kitId, layout.sticker.id, layout.id, {
            x: layout.x,
            y: layout.y,
          });
          onLayoutsChanged();
        } catch (error) {
          console.error('Failed to update layout position:', error);
        } finally {
          setIsSaving(false);
        }
      }
    }
    setDragging(null);
  };

  // サイズ変更
  const handleSizeChange = async (size: number) => {
    if (!selectedLayout) return;

    setLayouts(prev =>
      prev.map(l => (l.id === selectedLayout.id ? { ...l, size } : l))
    );

    try {
      await kitsApi.updateLayout(kitId, selectedLayout.sticker.id, selectedLayout.id, { size });
      onLayoutsChanged();
    } catch (error) {
      console.error('Failed to update size:', error);
    }
  };

  // 回転変更
  const handleRotationChange = async (rotation: number) => {
    if (!selectedLayout) return;

    setLayouts(prev =>
      prev.map(l => (l.id === selectedLayout.id ? { ...l, rotation } : l))
    );

    try {
      await kitsApi.updateLayout(kitId, selectedLayout.sticker.id, selectedLayout.id, { rotation });
      onLayoutsChanged();
    } catch (error) {
      console.error('Failed to update rotation:', error);
    }
  };

  // シールごとのレイアウト数をカウント
  const getLayoutCount = (stickerId: string) => layouts.filter(l => l.sticker.id === stickerId).length;

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60">
        <div className="bg-white rounded-xl shadow-2xl p-8">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-600">読み込み中...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ background: kitColor }}
        >
          <h3 className="text-lg font-semibold text-gray-900">シール配置エディタ</h3>
          <div className="flex items-center gap-3">
            {isSaving && (
              <span className="text-sm text-gray-600 flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                保存中...
              </span>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white/80 hover:bg-white rounded-lg text-sm font-medium transition-colors"
            >
              完了
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* プレビューエリア */}
          <div className="flex-1 p-6 bg-gray-100 flex flex-col items-center justify-center">
            {/* カード全体：StickerKitCardと同じ構造 */}
            <div
              className="relative rounded-xl overflow-hidden"
              style={{
                width: '280px',
                height: '420px',
                background: '#fefefe',
                boxShadow: `
                  0 25px 50px -12px rgba(0,0,0,0.25),
                  0 12px 24px -8px rgba(0,0,0,0.15),
                  0 4px 6px -2px rgba(0,0,0,0.1),
                  inset 0 2px 4px rgba(255,255,255,0.9),
                  inset 0 -2px 4px rgba(0,0,0,0.02)
                `,
                border: '1px solid rgba(255,255,255,0.8)',
              }}
            >
              {/* キットカラーライン */}
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ background: kitColor }}
              />

              {/* キット名ラベル（StickerKitCardと同じ位置） */}
              <div className="absolute top-3 left-4 z-20">
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{
                    background: kitColor,
                    color: '#333',
                  }}
                >
                  プレビュー
                </span>
              </div>

              {/* シール配置領域（StickerKitCardと完全一致: p-4 pt-10 height=380px） */}
              <div
                ref={stickerAreaRef}
                className="relative p-4 pt-10 cursor-crosshair"
                style={{ height: '380px' }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {/* レイアウト配置 */}
                {layouts.map((layout) => {
                  const isSelected = selectedLayoutId === layout.id;

                  return (
                    <div
                      key={layout.id}
                      className={`absolute cursor-move transition-shadow ${
                        isSelected ? 'ring-4 ring-blue-500 ring-offset-2 z-10' : ''
                      }`}
                      style={{
                        left: `${layout.x}%`,
                        top: `${layout.y}%`,
                        width: layout.size,
                        height: layout.size,
                        transform: `rotate(${layout.rotation}deg)`,
                      }}
                      onMouseDown={(e) => handleMouseDown(e, layout)}
                    >
                      {layout.sticker.image_uploaded ? (
                        <img
                          src={`/assets/stickers/kit-${kitNumber}/${layout.sticker.full_id}.png`}
                          alt={layout.sticker.name}
                          className="w-full h-full object-contain pointer-events-none"
                          draggable={false}
                        />
                      ) : (
                        <div
                          className="w-full h-full rounded-lg flex items-center justify-center text-xs text-gray-500"
                          style={{ backgroundColor: layout.sticker.color + '40' }}
                        >
                          {layout.sticker.name}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* レイアウトが空の場合 */}
                {layouts.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <p className="text-sm">右のパネルから<br />＋を押してシールを配置</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500 text-center mt-3">
              シールをドラッグして配置を調整できます
            </p>
          </div>

          {/* 設定パネル */}
          <div className="w-72 border-l bg-white p-4 overflow-y-auto">
            {selectedLayout && selectedSticker ? (
              <>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">選択中のシール</h4>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden"
                      style={{ backgroundColor: selectedSticker.color + '30' }}
                    >
                      {selectedSticker.image_uploaded ? (
                        <img
                          src={`/assets/stickers/kit-${kitNumber}/${selectedSticker.full_id}.png`}
                          alt={selectedSticker.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-xs text-gray-400">No img</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{selectedSticker.name}</div>
                      <div className="text-xs text-gray-500">{selectedSticker.full_id}</div>
                    </div>
                    <button
                      onClick={() => handleDelete(selectedLayout.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                      title="この配置を削除"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  {/* サイズ */}
                  <div>
                    <label className="flex items-center justify-between text-sm text-gray-600 mb-2">
                      <span>サイズ</span>
                      <span className="font-mono text-gray-900">{selectedLayout.size}px</span>
                    </label>
                    <input
                      type="range"
                      min="40"
                      max="140"
                      value={selectedLayout.size}
                      onChange={(e) => handleSizeChange(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>

                  {/* 回転 */}
                  <div>
                    <label className="flex items-center justify-between text-sm text-gray-600 mb-2">
                      <span>回転</span>
                      <span className="font-mono text-gray-900">{selectedLayout.rotation}°</span>
                    </label>
                    <input
                      type="range"
                      min="-45"
                      max="45"
                      value={selectedLayout.rotation}
                      onChange={(e) => handleRotationChange(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>

                  {/* 座標表示 */}
                  <div className="pt-3 border-t text-xs text-gray-500">
                    <div className="flex justify-between">
                      <span>X座標:</span>
                      <span className="font-mono">{selectedLayout.x.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span>Y座標:</span>
                      <span className="font-mono">{selectedLayout.y.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
                <p className="text-sm">シールをクリックして選択</p>
              </div>
            )}

            {/* シール一覧（複製ボタン付き） */}
            <div className="mt-6 pt-4 border-t">
              <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                シール一覧
              </h5>
              <div className="space-y-2">
                {stickers.map((sticker) => {
                  const count = getLayoutCount(sticker.id);
                  return (
                    <div
                      key={sticker.id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-gray-50"
                    >
                      <div
                        className="w-8 h-8 rounded flex items-center justify-center overflow-hidden flex-shrink-0"
                        style={{ backgroundColor: sticker.color + '30' }}
                      >
                        {sticker.image_uploaded ? (
                          <img
                            src={`/assets/stickers/kit-${kitNumber}/${sticker.full_id}.png`}
                            alt={sticker.name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <span className="text-[10px] text-gray-400">?</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {sticker.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          配置: {count}個
                        </div>
                      </div>
                      <button
                        onClick={() => handleDuplicate(sticker)}
                        className="w-7 h-7 flex items-center justify-center bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        title="シールを追加"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
