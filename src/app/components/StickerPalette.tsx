import { DraggableSticker } from '@/app/components/DraggableSticker';
import { Upload } from 'lucide-react';
import { useRef } from 'react';

const stickerTypes = [
  { id: 'star', color: '#FFD700', shape: 'star' },
  { id: 'heart', color: '#FF69B4', shape: 'heart' },
  { id: 'circle', color: '#87CEEB', shape: 'circle' },
  { id: 'square', color: '#90EE90', shape: 'square' },
  { id: 'triangle', color: '#DDA0DD', shape: 'triangle' },
  { id: 'flower', color: '#FFB6C1', shape: 'flower' },
];

interface StickerPaletteProps {
  customStickers: Array<{ id: string; imageUrl: string }>;
  onUploadImage: (imageUrl: string) => void;
  onDragStart?: () => void;
}

export function StickerPalette({ customStickers, onUploadImage, onDragStart }: StickerPaletteProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        onUploadImage(imageUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="relative">
      {/* パレットの装飾と背景 */}
      <div 
        className="relative rounded-lg shadow-xl overflow-hidden"
        style={{
          background: '#fef3c7',
        }}
      >
        <div 
          className="relative p-6"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(255, 250, 245, 0.7) 100%)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <h2 className="text-2xl font-bold text-amber-900 mb-4" style={{ fontFamily: 'Georgia, serif' }}>
            シール
          </h2>
          
          {/* 画像アップロードボタン */}
          <div className="mb-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transition-all active:scale-95"
            >
              <Upload className="w-5 h-5" />
              画像をアップロード
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {/* カスタム画像シール */}
          {customStickers.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-amber-800 mb-2">マイシール</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                {customStickers.map((sticker) => (
                  <DraggableSticker 
                    key={sticker.id} 
                    type={sticker.id} 
                    imageUrl={sticker.imageUrl}
                    onDragStart={onDragStart}
                  />
                ))}
              </div>
            </div>
          )}

          {/* デフォルトシール */}
          <h3 className="text-sm font-semibold text-amber-800 mb-2">基本シール</h3>
          <div className="grid grid-cols-2 gap-4">
            {stickerTypes.map((sticker) => (
              <DraggableSticker 
                key={sticker.id} 
                type={sticker.id}
                onDragStart={onDragStart}
              />
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-amber-200">
            <p className="text-sm text-amber-700 text-center">
              シールをドラッグして<br />台紙に貼り付けよう
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}