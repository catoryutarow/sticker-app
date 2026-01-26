import { useState, useRef, useEffect, useCallback } from 'react';

interface ImageCropperProps {
  imageFile: File;
  onComplete: (croppedBlob: Blob) => void;
  onCancel: () => void;
  outputSize?: number;
}

export const ImageCropper = ({
  imageFile,
  onComplete,
  onCancel,
  outputSize = 256,
}: ImageCropperProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  const CANVAS_SIZE = 280;
  const CROP_SIZE = 240;
  const MAX_IMAGE_SIZE = 512; // 読み込み画像の最大サイズ

  // 画像読み込み（512x512を上限にリサイズ）
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      // 512x512を上限にリサイズした画像を作成
      const maxDim = Math.max(img.width, img.height);
      let resizedImg: HTMLImageElement;

      if (maxDim > MAX_IMAGE_SIZE) {
        // リサイズが必要
        const scale = MAX_IMAGE_SIZE / maxDim;
        const newWidth = Math.round(img.width * scale);
        const newHeight = Math.round(img.height * scale);

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = newWidth;
        tempCanvas.height = newHeight;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.drawImage(img, 0, 0, newWidth, newHeight);
          resizedImg = new Image();
          resizedImg.onload = () => {
            setImage(resizedImg);
            // リサイズ後の画像がクロップエリアに収まるように初期スケール設定
            const resizedMaxDim = Math.max(resizedImg.width, resizedImg.height);
            const initialScale = CROP_SIZE / resizedMaxDim;
            setScale(Math.max(initialScale, 0.5));
            setPosition({ x: 0, y: 0 });
            setRotation(0);
          };
          resizedImg.src = tempCanvas.toDataURL('image/png');
        }
      } else {
        // リサイズ不要
        setImage(img);
        const initialScale = CROP_SIZE / maxDim;
        setScale(Math.max(initialScale, 0.5));
        setPosition({ x: 0, y: 0 });
        setRotation(0);
      }
    };
    img.src = URL.createObjectURL(imageFile);

    return () => {
      URL.revokeObjectURL(img.src);
    };
  }, [imageFile]);

  // キャンバス描画
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !image) return;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // 背景（透明グリッド）
    const gridSize = 10;
    for (let x = 0; x < CANVAS_SIZE; x += gridSize) {
      for (let y = 0; y < CANVAS_SIZE; y += gridSize) {
        ctx.fillStyle = (x / gridSize + y / gridSize) % 2 === 0 ? '#1a1a2e' : '#16162a';
        ctx.fillRect(x, y, gridSize, gridSize);
      }
    }

    // 画像描画
    ctx.save();
    ctx.translate(CANVAS_SIZE / 2 + position.x, CANVAS_SIZE / 2 + position.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.drawImage(image, -image.width / 2, -image.height / 2);
    ctx.restore();

    // クロップエリア外を暗くする
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    const cropOffset = (CANVAS_SIZE - CROP_SIZE) / 2;
    // Top
    ctx.fillRect(0, 0, CANVAS_SIZE, cropOffset);
    // Bottom
    ctx.fillRect(0, cropOffset + CROP_SIZE, CANVAS_SIZE, cropOffset);
    // Left
    ctx.fillRect(0, cropOffset, cropOffset, CROP_SIZE);
    // Right
    ctx.fillRect(cropOffset + CROP_SIZE, cropOffset, cropOffset, CROP_SIZE);

    // クロップ枠
    ctx.strokeStyle = '#00d4aa';
    ctx.lineWidth = 2;
    ctx.strokeRect(cropOffset, cropOffset, CROP_SIZE, CROP_SIZE);

    // グリッドライン（三分割法）
    ctx.strokeStyle = 'rgba(0, 212, 170, 0.3)';
    ctx.lineWidth = 1;
    const third = CROP_SIZE / 3;
    for (let i = 1; i < 3; i++) {
      // 縦線
      ctx.beginPath();
      ctx.moveTo(cropOffset + third * i, cropOffset);
      ctx.lineTo(cropOffset + third * i, cropOffset + CROP_SIZE);
      ctx.stroke();
      // 横線
      ctx.beginPath();
      ctx.moveTo(cropOffset, cropOffset + third * i);
      ctx.lineTo(cropOffset + CROP_SIZE, cropOffset + third * i);
      ctx.stroke();
    }

    // コーナーマーカー
    ctx.strokeStyle = '#00d4aa';
    ctx.lineWidth = 3;
    const cornerSize = 20;
    const corners = [
      { x: cropOffset, y: cropOffset }, // top-left
      { x: cropOffset + CROP_SIZE, y: cropOffset }, // top-right
      { x: cropOffset, y: cropOffset + CROP_SIZE }, // bottom-left
      { x: cropOffset + CROP_SIZE, y: cropOffset + CROP_SIZE }, // bottom-right
    ];
    corners.forEach(({ x, y }, i) => {
      ctx.beginPath();
      const dx = i % 2 === 0 ? cornerSize : -cornerSize;
      const dy = i < 2 ? cornerSize : -cornerSize;
      ctx.moveTo(x + dx, y);
      ctx.lineTo(x, y);
      ctx.lineTo(x, y + dy);
      ctx.stroke();
    });

    // プレビューキャンバス描画
    const previewCanvas = previewCanvasRef.current;
    const previewCtx = previewCanvas?.getContext('2d');
    if (previewCanvas && previewCtx) {
      const previewSize = 64;
      previewCtx.clearRect(0, 0, previewSize, previewSize);

      // 背景（透明グリッド）
      const pGridSize = 8;
      for (let px = 0; px < previewSize; px += pGridSize) {
        for (let py = 0; py < previewSize; py += pGridSize) {
          previewCtx.fillStyle = (px / pGridSize + py / pGridSize) % 2 === 0 ? '#2a2a3e' : '#222233';
          previewCtx.fillRect(px, py, pGridSize, pGridSize);
        }
      }

      // プレビュー画像描画（クロップ結果をプレビュー）
      const previewScale = previewSize / CROP_SIZE;
      previewCtx.save();
      previewCtx.translate(previewSize / 2, previewSize / 2);
      previewCtx.translate(position.x * previewScale, position.y * previewScale);
      previewCtx.rotate((rotation * Math.PI) / 180);
      previewCtx.scale(scale * previewScale, scale * previewScale);
      previewCtx.drawImage(image, -image.width / 2, -image.height / 2);
      previewCtx.restore();
    }
  }, [image, scale, rotation, position, outputSize]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // ドラッグ操作
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // タッチ操作
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // ホイールでズーム
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setScale((prev) => Math.max(0.3, Math.min(2.5, prev + delta)));
  };

  // 回転スナップ（15度単位）
  const snapRotation = (value: number) => {
    const snapAngle = 15;
    const snapped = Math.round(value / snapAngle) * snapAngle;
    if (Math.abs(value - snapped) < 3) {
      return snapped;
    }
    return value;
  };

  // クロップ実行
  const handleComplete = async () => {
    if (!image) return;

    setIsProcessing(true);

    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = outputSize;
    outputCanvas.height = outputSize;
    const ctx = outputCanvas.getContext('2d');
    if (!ctx) return;

    // 透明背景
    ctx.clearRect(0, 0, outputSize, outputSize);

    // スケール調整（キャンバスサイズと出力サイズの比率）
    const outputScale = outputSize / CROP_SIZE;

    ctx.save();
    ctx.translate(outputSize / 2, outputSize / 2);
    ctx.translate(position.x * outputScale, position.y * outputScale);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale * outputScale, scale * outputScale);
    ctx.drawImage(image, -image.width / 2, -image.height / 2);
    ctx.restore();

    outputCanvas.toBlob(
      (blob) => {
        if (blob) {
          onComplete(blob);
        }
        setIsProcessing(false);
      },
      'image/png',
      1.0
    );
  };

  const handleReset = () => {
    if (!image) return;
    const maxDim = Math.max(image.width, image.height);
    const initialScale = CROP_SIZE / maxDim;
    setScale(Math.max(initialScale, 0.5));
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1a] rounded-2xl shadow-2xl shadow-black/50 overflow-hidden max-w-md w-full">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white tracking-tight">
                画像を調整
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {outputSize}×{outputSize}px で出力されます
              </p>
            </div>
            <button
              onClick={onCancel}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="p-5">
          <div
            ref={containerRef}
            className="relative mx-auto rounded-xl overflow-hidden cursor-move select-none"
            style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
          >
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="block"
            />

          </div>

          {/* Preview */}
          <div className="mt-4 flex items-center justify-center gap-4">
            <div className="flex flex-col items-center gap-1.5">
              <div className="relative rounded-lg overflow-hidden border border-white/20 shadow-lg">
                <canvas
                  ref={previewCanvasRef}
                  width={64}
                  height={64}
                  className="block"
                />
              </div>
              <span className="text-[10px] text-gray-500">プレビュー</span>
            </div>
            <div className="text-xs text-gray-400 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-gray-500">サイズ:</span>
                <span className="font-mono text-[#00d4aa]">{Math.round(scale * 100)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">回転:</span>
                <span className="font-mono text-[#00d4aa]">{rotation}°</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">出力:</span>
                <span className="font-mono text-[#00d4aa]">{outputSize}px</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="mt-5 space-y-4">
            {/* Scale Slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  拡大・縮小
                </label>
                <span className="text-xs font-mono text-[#00d4aa]">
                  {Math.round(scale * 100)}%
                </span>
              </div>
              <div className="relative">
                <input
                  type="range"
                  min="30"
                  max="250"
                  value={scale * 100}
                  onChange={(e) => setScale(Number(e.target.value) / 100)}
                  className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:w-4
                    [&::-webkit-slider-thumb]:h-4
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-[#00d4aa]
                    [&::-webkit-slider-thumb]:shadow-lg
                    [&::-webkit-slider-thumb]:shadow-[#00d4aa]/30
                    [&::-webkit-slider-thumb]:cursor-pointer
                    [&::-webkit-slider-thumb]:transition-transform
                    [&::-webkit-slider-thumb]:hover:scale-110"
                />
              </div>
            </div>

            {/* Rotation Slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  回転
                </label>
                <span className="text-xs font-mono text-[#00d4aa]">
                  {rotation}°
                </span>
              </div>
              <div className="relative">
                <input
                  type="range"
                  min="-180"
                  max="180"
                  value={rotation}
                  onChange={(e) => setRotation(snapRotation(Number(e.target.value)))}
                  className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:w-4
                    [&::-webkit-slider-thumb]:h-4
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-[#00d4aa]
                    [&::-webkit-slider-thumb]:shadow-lg
                    [&::-webkit-slider-thumb]:shadow-[#00d4aa]/30
                    [&::-webkit-slider-thumb]:cursor-pointer
                    [&::-webkit-slider-thumb]:transition-transform
                    [&::-webkit-slider-thumb]:hover:scale-110"
                />
                {/* 0度マーカー */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-white/30 pointer-events-none"
                  style={{ left: '50%' }}
                />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setRotation((r) => snapRotation(r - 90))}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                90°左
              </button>
              <button
                onClick={() => setRotation((r) => snapRotation(r + 90))}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm transition-colors"
              >
                <svg className="w-4 h-4 -scale-x-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                90°右
              </button>
              <button
                onClick={handleReset}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                リセット
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/10 flex items-center justify-between gap-3">
          <div className="text-xs text-gray-500">
            ドラッグで移動 / スクロールでズーム
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-white/10 transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleComplete}
              disabled={isProcessing || !image}
              className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-[#00d4aa] to-[#00b4d8] hover:from-[#00e4ba] hover:to-[#00c4e8] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#00d4aa]/20"
            >
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  処理中...
                </span>
              ) : (
                '確定'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
