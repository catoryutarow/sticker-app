import { useState, useRef, useEffect, useCallback } from 'react';
import { kitsApi, type Sticker, type StickerLayout } from '@/api/kitsApi';

type LocalSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface LayoutPreviewProps {
  kitId: string;
  stickers: Sticker[];
  kitColor: string;
  kitNumber: string;
  kitName: string;
  onLayoutsChanged?: () => void;
  onRegenerateThumbnail?: () => Promise<void>;
  isEditable?: boolean;
  // 公開ボタン用
  onPublish?: () => void;
  canPublish?: boolean;
  isPublished?: boolean;
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

export const LayoutPreview = ({
  kitId,
  stickers,
  kitColor,
  kitNumber,
  kitName,
  onLayoutsChanged,
  onRegenerateThumbnail,
  isEditable = true,
  onPublish,
  canPublish = false,
  isPublished = false,
}: LayoutPreviewProps) => {
  const stickerAreaRefDesktop = useRef<HTMLDivElement>(null);
  const stickerAreaRefMobile = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 画面サイズに応じて適切なrefを返す
  const getStickerAreaRef = () => {
    // デスクトップ版が表示されているか確認（sm:640px以上）
    if (window.innerWidth >= 640) {
      return stickerAreaRefDesktop;
    }
    return stickerAreaRefMobile;
  };
  const [layouts, setLayouts] = useState<LocalLayout[]>([]);
  const [selectedLayoutId, setSelectedLayoutId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<DraggingState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<LocalSaveStatus>('idle');
  const [isRegenerating, setIsRegenerating] = useState(false);

  // 保存状態の更新ヘルパー
  const startSaving = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    setSaveStatus('saving');
  }, []);

  const finishSaving = useCallback((success: boolean) => {
    setSaveStatus(success ? 'saved' : 'error');
    saveTimeoutRef.current = setTimeout(() => {
      setSaveStatus('idle');
    }, 2000);
  }, []);

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

  // 追加
  const handleAdd = async (sticker: Sticker) => {
    if (!isEditable) return;
    setIsSaving(true);
    startSaving();
    try {
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
      finishSaving(true);
    } catch (error) {
      console.error('Failed to create layout:', error);
      finishSaving(false);
    } finally {
      setIsSaving(false);
    }
  };

  // 削除
  const handleDelete = async (layoutId: string) => {
    if (!isEditable) return;
    const layout = layouts.find(l => l.id === layoutId);
    if (!layout) return;

    setIsSaving(true);
    startSaving();
    try {
      await kitsApi.deleteLayout(kitId, layout.sticker.id, layoutId);
      setLayouts(prev => prev.filter(l => l.id !== layoutId));
      if (selectedLayoutId === layoutId) {
        setSelectedLayoutId(null);
      }
      finishSaving(true);
    } catch (error) {
      console.error('Failed to delete layout:', error);
      finishSaving(false);
    } finally {
      setIsSaving(false);
    }
  };

  // クリックで選択
  const handleClick = (e: React.MouseEvent, layout: LocalLayout) => {
    e.stopPropagation();
    setSelectedLayoutId(layout.id);
  };

  // ドラッグ開始
  const handleMouseDown = (e: React.MouseEvent, layout: LocalLayout) => {
    if (!isEditable) return;
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

  // ドラッグ中の処理
  const handleMouseMove = useCallback((e: React.MouseEvent | MouseEvent) => {
    const stickerAreaRef = getStickerAreaRef();
    if (!dragging || !stickerAreaRef.current || !isEditable) {
      return;
    }

    const rect = stickerAreaRef.current.getBoundingClientRect();
    const deltaX = ((e.clientX - dragging.startX) / rect.width) * 100;
    const deltaY = ((e.clientY - dragging.startY) / rect.height) * 100;

    const newX = Math.max(0, Math.min(100, dragging.startLayoutX + deltaX));
    const newY = Math.max(0, Math.min(100, dragging.startLayoutY + deltaY));

    setLayouts(prev =>
      prev.map(l =>
        l.id === dragging.layoutId ? { ...l, x: newX, y: newY } : l
      )
    );
  }, [dragging, isEditable]);

  // ドラッグ終了
  const handleMouseUp = useCallback(async () => {
    if (!dragging || !isEditable) return;

    const layout = layouts.find(l => l.id === dragging.layoutId);
    if (layout) {
      const hasMoved = Math.abs(layout.x - dragging.startLayoutX) > 0.5 ||
                       Math.abs(layout.y - dragging.startLayoutY) > 0.5;
      if (hasMoved) {
        setIsSaving(true);
        startSaving();
        try {
          await kitsApi.updateLayout(kitId, layout.sticker.id, layout.id, {
            x: layout.x,
            y: layout.y,
          });
          finishSaving(true);
        } catch (error) {
          console.error('Failed to update layout position:', error);
          finishSaving(false);
        } finally {
          setIsSaving(false);
        }
      }
    }
    setDragging(null);
  }, [dragging, isEditable, kitId, layouts, startSaving, finishSaving]);

  // サイズ変更
  const handleSizeChange = async (size: number) => {
    if (!selectedLayout || !isEditable) return;

    setLayouts(prev =>
      prev.map(l => (l.id === selectedLayout.id ? { ...l, size } : l))
    );

    startSaving();
    try {
      await kitsApi.updateLayout(kitId, selectedLayout.sticker.id, selectedLayout.id, { size });
      finishSaving(true);
    } catch (error) {
      console.error('Failed to update size:', error);
      finishSaving(false);
    }
  };

  // 回転変更
  const handleRotationChange = async (rotation: number) => {
    if (!selectedLayout || !isEditable) return;

    setLayouts(prev =>
      prev.map(l => (l.id === selectedLayout.id ? { ...l, rotation } : l))
    );

    startSaving();
    try {
      await kitsApi.updateLayout(kitId, selectedLayout.sticker.id, selectedLayout.id, { rotation });
      finishSaving(true);
    } catch (error) {
      console.error('Failed to update rotation:', error);
      finishSaving(false);
    }
  };

  // X位置変更
  const handleXChange = async (x: number) => {
    if (!selectedLayout || !isEditable) return;

    setLayouts(prev =>
      prev.map(l => (l.id === selectedLayout.id ? { ...l, x } : l))
    );

    startSaving();
    try {
      await kitsApi.updateLayout(kitId, selectedLayout.sticker.id, selectedLayout.id, { x });
      finishSaving(true);
    } catch (error) {
      console.error('Failed to update x:', error);
      finishSaving(false);
    }
  };

  // Y位置変更
  const handleYChange = async (y: number) => {
    if (!selectedLayout || !isEditable) return;

    setLayouts(prev =>
      prev.map(l => (l.id === selectedLayout.id ? { ...l, y } : l))
    );

    startSaving();
    try {
      await kitsApi.updateLayout(kitId, selectedLayout.sticker.id, selectedLayout.id, { y });
      finishSaving(true);
    } catch (error) {
      console.error('Failed to update y:', error);
      finishSaving(false);
    }
  };

  const getLayoutCount = (stickerId: string) => layouts.filter(l => l.sticker.id === stickerId).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600">読み込み中...</span>
        </div>
      </div>
    );
  }

  // カード内容を共通化（refを引数で受け取る）
  const renderCardContent = (areaRef: React.RefObject<HTMLDivElement>) => (
    <>
      {/* キットカラーライン */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ background: kitColor }}
      />

      {/* キット名ラベル */}
      <div className="absolute top-3 left-4 z-20">
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{
            background: kitColor,
            color: '#333',
          }}
        >
          {kitName}
        </span>
      </div>

      {/* 保存状態インジケータ */}
      <div className="absolute top-3 right-4 z-20">
        {saveStatus === 'saving' && (
          <div className="flex items-center gap-1.5 bg-white/90 px-2 py-1 rounded-full shadow-sm">
            <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] text-blue-600">保存中</span>
          </div>
        )}
        {saveStatus === 'saved' && (
          <div className="flex items-center gap-1 bg-white/90 px-2 py-1 rounded-full shadow-sm">
            <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-[10px] text-green-600">保存しました</span>
          </div>
        )}
        {saveStatus === 'error' && (
          <div className="flex items-center gap-1 bg-white/90 px-2 py-1 rounded-full shadow-sm">
            <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="text-[10px] text-red-600">保存失敗</span>
          </div>
        )}
      </div>

      {/* シール配置領域 */}
      <div
        ref={areaRef}
        className={`relative p-4 pt-10 ${isEditable ? 'cursor-crosshair' : ''}`}
        style={{ height: '380px' }}
        onClick={() => setSelectedLayoutId(null)}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {layouts.map((layout) => {
          const isSelected = selectedLayoutId === layout.id;

          return (
            <div
              key={layout.id}
              className={`absolute transition-shadow ${isEditable ? 'cursor-move' : ''} ${
                isSelected && isEditable ? 'ring-2 sm:ring-4 ring-blue-500 ring-offset-1 sm:ring-offset-2 z-10' : ''
              }`}
              style={{
                left: `${layout.x}%`,
                top: `${layout.y}%`,
                width: layout.size,
                height: layout.size,
                transform: `rotate(${layout.rotation}deg)`,
              }}
              onClick={(e) => handleClick(e, layout)}
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
              {isEditable ? (
                <>
                  <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <p className="text-sm">下の＋ボタンで<br />シールを配置</p>
                </>
              ) : (
                <>
                  <svg className="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm">シールが<br />配置されていません</p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );

  const cardStyle = {
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
  };

  return (
    <div className="space-y-4">
      {/* プレビューカード */}
      <div className="flex justify-center">
        {/* デスクトップ用: そのまま表示 */}
        <div className="hidden sm:block">
          <div className="relative rounded-xl overflow-hidden" style={cardStyle}>
            {renderCardContent(stickerAreaRefDesktop)}
          </div>
        </div>
        {/* モバイル用: スケール適用 + コンテナサイズも縮小 */}
        <div
          className="sm:hidden"
          style={{
            width: `${280 * 0.75}px`,
            height: `${420 * 0.75}px`,
          }}
        >
          <div
            className="relative rounded-xl overflow-hidden origin-top-left"
            style={{
              ...cardStyle,
              transform: 'scale(0.75)',
            }}
          >
            {renderCardContent(stickerAreaRefMobile)}
          </div>
        </div>
      </div>

      {isEditable && (
        <>
          {/* 選択中シールの編集パネル */}
          <div className="bg-white rounded-lg border p-3">
            {selectedLayout && selectedSticker ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded flex items-center justify-center overflow-hidden"
                      style={{ backgroundColor: selectedSticker.color + '30' }}
                    >
                      {selectedSticker.image_uploaded ? (
                        <img
                          src={`/assets/stickers/kit-${kitNumber}/${selectedSticker.full_id}.png`}
                          alt={selectedSticker.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-[10px] text-gray-400">?</span>
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{selectedSticker.name}</div>
                      <div className="text-[10px] text-gray-400">クリックで選択中</div>
                    </div>
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

                {/* X位置 */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-gray-600 font-medium">X位置</label>
                    <span className="text-xs text-gray-500 font-mono">{Math.round(selectedLayout.x)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={selectedLayout.x}
                    onChange={(e) => handleXChange(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                {/* Y位置 */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-gray-600 font-medium">Y位置</label>
                    <span className="text-xs text-gray-500 font-mono">{Math.round(selectedLayout.y)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={selectedLayout.y}
                    onChange={(e) => handleYChange(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                {/* サイズ */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-gray-600 font-medium">サイズ</label>
                    <span className="text-xs text-gray-500 font-mono">{selectedLayout.size}px</span>
                  </div>
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-gray-600 font-medium">回転</label>
                    <span className="text-xs text-gray-500 font-mono">{selectedLayout.rotation}°</span>
                  </div>
                  <input
                    type="range"
                    min="-45"
                    max="45"
                    value={selectedLayout.rotation}
                    onChange={(e) => handleRotationChange(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              </div>
            ) : (
              <div className="text-center py-2 text-gray-400">
                <p className="text-xs">シールをクリックして選択すると<br />サイズと回転を調整できます</p>
              </div>
            )}
          </div>

          {/* シール追加パネル */}
          <div className="bg-gray-50 rounded-lg p-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              シールを配置
            </h4>
            <div className="flex flex-wrap gap-2">
              {stickers.map((sticker) => {
                const count = getLayoutCount(sticker.id);
                return (
                  <div
                    key={sticker.id}
                    className="flex items-center gap-1.5 px-2 py-1.5 bg-white rounded-lg border"
                  >
                    <div
                      className="w-6 h-6 rounded flex items-center justify-center overflow-hidden flex-shrink-0"
                      style={{ backgroundColor: sticker.color + '30' }}
                    >
                      {sticker.image_uploaded ? (
                        <img
                          src={`/assets/stickers/kit-${kitNumber}/${sticker.full_id}.png`}
                          alt={sticker.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-[8px] text-gray-400">?</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-600">{count}</span>
                    <button
                      onClick={() => handleAdd(sticker)}
                      className="w-5 h-5 flex items-center justify-center bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      title="追加"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* サムネイル更新ボタン */}
          {onRegenerateThumbnail && (
            <button
              onClick={async () => {
                setIsRegenerating(true);
                try {
                  await onRegenerateThumbnail();
                } finally {
                  setIsRegenerating(false);
                }
              }}
              disabled={isRegenerating}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg font-medium text-sm hover:from-blue-600 hover:to-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
            >
              {isRegenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>更新中...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>配置を確定</span>
                </>
              )}
            </button>
          )}

          {/* 公開ボタン */}
          {onPublish && !isPublished && (
            <button
              onClick={onPublish}
              disabled={!canPublish}
              className={`w-full py-2.5 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition-all ${
                canPublish
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>公開する</span>
            </button>
          )}
        </>
      )}
    </div>
  );
};
