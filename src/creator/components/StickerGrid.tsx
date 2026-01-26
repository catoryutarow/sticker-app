import type { Sticker, Kit } from '@/api/kitsApi';
import { StickerCard } from './StickerCard';

interface StickerGridProps {
  stickers: Sticker[];
  kit: Kit;
  onUploadImage: (sticker: Sticker, file: File) => Promise<void>;
  onUploadAudio: (sticker: Sticker, file: File) => Promise<void>;
  onSelectLibraryAudio?: (sticker: Sticker, soundId: string) => Promise<void>;
  onEditSticker: (sticker: Sticker) => void;
  onDeleteSticker: (sticker: Sticker) => void;
}

export const StickerGrid = ({
  stickers,
  kit,
  onUploadImage,
  onUploadAudio,
  onSelectLibraryAudio,
  onEditSticker,
  onDeleteSticker,
}: StickerGridProps) => {
  if (stickers.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">シールがありません</h3>
        <p className="mt-1 text-sm text-gray-500">
          「シールを追加」ボタンから新しいシールを作成してください
        </p>
      </div>
    );
  }

  const uploadedCount = stickers.filter(s => s.image_uploaded && s.audio_uploaded).length;
  const imageCount = stickers.filter(s => s.image_uploaded).length;
  const audioCount = stickers.filter(s => s.audio_uploaded).length;

  return (
    <div className="space-y-4">
      {/* ステータスバー */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 bg-gray-50 px-3 sm:px-4 py-2 rounded-lg">
        <span className="font-medium">{stickers.length} シール</span>
        <span className="hidden sm:inline text-gray-300">|</span>
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="hidden sm:inline">画像:</span> {imageCount}/{stickers.length}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="hidden sm:inline">音声:</span> {audioCount}/{stickers.length}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span className="hidden sm:inline">完了:</span> {uploadedCount}/{stickers.length}
          </span>
        </div>
      </div>

      {/* シール一覧 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {stickers.map((sticker) => (
          <StickerCard
            key={sticker.id}
            sticker={sticker}
            kit={kit}
            onUploadImage={onUploadImage}
            onUploadAudio={onUploadAudio}
            onSelectLibraryAudio={onSelectLibraryAudio}
            onEdit={onEditSticker}
            onDelete={onDeleteSticker}
          />
        ))}
      </div>
    </div>
  );
};
