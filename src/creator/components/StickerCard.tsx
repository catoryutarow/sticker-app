import { useState } from 'react';
import type { Sticker, Kit } from '@/api/kitsApi';
import { FileUploader } from './FileUploader';
import { AudioSelector } from './AudioSelector';

interface StickerCardProps {
  sticker: Sticker;
  kit: Kit;
  onUploadImage: (sticker: Sticker, file: File) => Promise<void>;
  onUploadAudio: (sticker: Sticker, file: File) => Promise<void>;
  onSelectLibraryAudio?: (sticker: Sticker, soundId: string) => Promise<void>;
  onEdit: (sticker: Sticker) => void;
  onDelete: (sticker: Sticker) => void;
}

export const StickerCard = ({
  sticker,
  kit,
  onUploadImage,
  onUploadAudio,
  onSelectLibraryAudio,
  onEdit,
  onDelete,
}: StickerCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const imagePath = sticker.image_uploaded
    ? `/assets/stickers/kit-${kit.kit_number}/${sticker.full_id}.png?t=${sticker.updated_at || ''}`
    : undefined;
  const audioPath = sticker.audio_uploaded
    ? `/assets/audio/kit-${kit.kit_number}/${sticker.full_id}.mp3?t=${sticker.updated_at || ''}`
    : undefined;

  const handleImageUpload = async (file: File) => {
    await onUploadImage(sticker, file);
  };

  const handleAudioUpload = async (file: File) => {
    await onUploadAudio(sticker, file);
  };

  const handleSelectLibraryAudio = async (soundId: string) => {
    if (onSelectLibraryAudio) {
      await onSelectLibraryAudio(sticker, soundId);
    }
  };

  return (
    <div
      className="bg-white rounded-lg border overflow-hidden"
      style={{ borderLeft: `4px solid ${sticker.color}` }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* サムネイル */}
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: sticker.color + '20' }}
            >
              {sticker.image_uploaded ? (
                <img
                  src={imagePath}
                  alt={sticker.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
            </div>

            {/* 情報 */}
            <div>
              <h4 className="font-medium text-gray-900">{sticker.name}</h4>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                <span className="font-mono">{sticker.full_id}</span>
                {sticker.is_percussion === 1 ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="3" strokeWidth={2} />
                      <circle cx="12" cy="12" r="7" strokeWidth={2} />
                    </svg>
                    ドラム
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                    </svg>
                    メロディ
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ステータスアイコン */}
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${sticker.image_uploaded ? 'bg-green-500' : 'bg-gray-300'}`}
              title={sticker.image_uploaded ? '画像あり' : '画像なし'}
            />
            <span
              className={`w-2 h-2 rounded-full ${sticker.audio_uploaded ? 'bg-green-500' : 'bg-gray-300'}`}
              title={sticker.audio_uploaded ? '音声あり' : '音声なし'}
            />
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <svg
                className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* 展開エリア */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t space-y-4">
            {/* 画像・音声アップロード - モバイルは縦並び */}
            <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">画像</label>
                <FileUploader
                  type="image"
                  currentPath={imagePath}
                  onUpload={handleImageUpload}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">音声</label>
                {/* 音声タイプに応じたガイド */}
                <p className="text-xs text-gray-500 mb-2">
                  {sticker.is_percussion === 1 ? (
                    <>
                      <span className="inline-flex items-center gap-1 text-orange-600 font-medium">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="3" strokeWidth={2} />
                          <circle cx="12" cy="12" r="7" strokeWidth={2} />
                        </svg>
                        ドラム
                      </span>
                      {' '}− ドラムやパーカッションの音声を設定してください
                    </>
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-1 text-blue-600 font-medium">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                        </svg>
                        メロディ
                      </span>
                      {' '}− キットのキーに合った音源を選んでください
                    </>
                  )}
                </p>
                {onSelectLibraryAudio ? (
                  <AudioSelector
                    kitId={kit.id}
                    stickerId={sticker.id}
                    kitMusicalKey={kit.musical_key}
                    currentPath={audioPath}
                    onUpload={handleAudioUpload}
                    onSelectLibrary={handleSelectLibraryAudio}
                    isPercussion={sticker.is_percussion === 1}
                  />
                ) : (
                  <FileUploader
                    type="audio"
                    currentPath={audioPath}
                    onUpload={handleAudioUpload}
                  />
                )}
              </div>
            </div>

            {/* アクション */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => onEdit(sticker)}
                className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded"
              >
                編集
              </button>
              <button
                onClick={() => onDelete(sticker)}
                className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded"
              >
                削除
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
