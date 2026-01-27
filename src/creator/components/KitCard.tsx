import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Kit, LayoutPreviewItem } from '@/api/kitsApi';
import { getStickerImageUrl, getKitThumbnailUrl, getDefaultThumbnailUrl } from '@/config/assetUrl';
import { KitShareDialog } from '@/app/components/KitShareDialog';

interface KitCardProps {
  kit: Kit;
  onDelete?: (kit: Kit) => void;
}

// ミニプレビューコンポーネント（下書きキット用の動的レンダリング）
// サムネイル生成（280x420px）と同じ座標系を使用し、0.5倍でレンダリング
const MiniPreview = ({ kit, layouts }: { kit: Kit; layouts: LayoutPreviewItem[] }) => {
  // サムネイル生成と同じ基準サイズ
  const THUMBNAIL_WIDTH = 280;
  const THUMBNAIL_HEIGHT = 420;
  const STICKER_AREA_WIDTH = 280;
  const STICKER_AREA_HEIGHT = 380;
  const STICKER_AREA_TOP_OFFSET = 40;

  // 表示スケール（カードに収まるサイズ）
  const SCALE = 0.5;
  const CARD_WIDTH = THUMBNAIL_WIDTH * SCALE;  // 140
  const CARD_HEIGHT = THUMBNAIL_HEIGHT * SCALE; // 210

  return (
    <div
      className="relative rounded-lg overflow-hidden shadow-inner"
      style={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        background: `linear-gradient(135deg, ${kit.color}40 0%, ${kit.color}20 100%)`,
      }}
    >
      {/* レイアウトを配置（サムネイル生成と同じ座標系） */}
      {layouts.map((layout) => {
        // サムネイル生成と同じ計算: x,yはシール配置領域に対するパーセンテージ
        const x = (layout.x / 100) * STICKER_AREA_WIDTH;
        const y = (layout.y / 100) * STICKER_AREA_HEIGHT + STICKER_AREA_TOP_OFFSET;
        // sizeはピクセル値としてそのまま使用
        const size = layout.size;

        return (
          <div
            key={layout.id}
            className="absolute"
            style={{
              // スケールを適用して表示
              left: x * SCALE,
              top: y * SCALE,
              width: size * SCALE,
              height: size * SCALE,
              transform: `translate(-50%, -50%) rotate(${layout.rotation}deg)`,
            }}
          >
            {layout.image_uploaded ? (
              <img
                src={getStickerImageUrl(kit.kit_number, layout.full_id)}
                alt={layout.name}
                className="w-full h-full object-contain drop-shadow-sm"
                loading="lazy"
              />
            ) : (
              <div
                className="w-full h-full rounded-full flex items-center justify-center text-white/60 text-xs"
                style={{ backgroundColor: layout.color }}
              >
                ?
              </div>
            )}
          </div>
        );
      })}

      {/* レイアウトがない場合 */}
      {layouts.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-xs">
          シールなし
        </div>
      )}
    </div>
  );
};

// サムネイル画像コンポーネント（公開済みキット用、フォールバック対応）
const ThumbnailImage = ({ kit }: { kit: Kit }) => {
  const [imgSrc, setImgSrc] = useState(getKitThumbnailUrl(kit.kit_number));

  const handleError = () => {
    // サムネイルが見つからない場合はデフォルト画像にフォールバック
    if (!imgSrc.includes('default.png')) {
      setImgSrc(getDefaultThumbnailUrl());
    }
  };

  return (
    <div
      className="relative rounded-lg overflow-hidden shadow-inner flex-shrink-0"
      style={{ width: 140, height: 210 }}
    >
      <img
        src={imgSrc}
        alt={kit.name}
        className="w-full h-full object-cover"
        loading="lazy"
        onError={handleError}
      />
    </div>
  );
};

// 旧フォーマット（単独キー）から並行調への変換マップ
const LEGACY_KEY_MAP: Record<string, string> = {
  'Am': 'C/Am',
  'Em': 'G/Em',
  'Bm': 'D/Bm',
  'F#m': 'A/F#m',
  'C#m': 'E/C#m',
  'G#m': 'B/G#m',
  'D#m': 'F#/D#m',
  'Dm': 'F/Dm',
  'Gm': 'Bb/Gm',
  'Cm': 'Eb/Cm',
  'Fm': 'Ab/Fm',
  'Bbm': 'Db/Bbm',
  'C': 'C/Am',
  'G': 'G/Em',
  'D': 'D/Bm',
  'A': 'A/F#m',
  'E': 'E/C#m',
  'B': 'B/G#m',
  'F#': 'F#/D#m',
  'F': 'F/Dm',
  'Bb': 'Bb/Gm',
  'Eb': 'Eb/Cm',
  'Ab': 'Ab/Fm',
  'Db': 'Db/Bbm',
};

// キー表示用のラベル変換（旧フォーマット互換）
const formatMusicalKey = (key: string | undefined): string => {
  if (!key || key === 'random') return 'おまかせ';
  // 旧フォーマットの変換
  const normalized = LEGACY_KEY_MAP[key] || key;
  return normalized.replace('/', ' / ');
};

export const KitCard = ({ kit, onDelete }: KitCardProps) => {
  const isPublished = kit.status === 'published';
  const layouts = kit.layouts || [];
  const [isShareOpen, setIsShareOpen] = useState(false);

  return (
    <div
      className="bg-white shadow rounded-lg overflow-hidden hover:shadow-md transition-shadow"
      style={{ borderTop: `4px solid ${kit.color}` }}
    >
      <div className="p-4">
        {/* プレビュー + 情報 */}
        <div className="flex gap-4">
          {/* プレビュー: 公開済みはサムネイル画像、下書きは動的レンダリング */}
          {isPublished ? (
            <ThumbnailImage kit={kit} />
          ) : (
            <MiniPreview kit={kit} layouts={layouts} />
          )}

          {/* 情報エリア */}
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-base font-semibold text-gray-900 truncate">
                {kit.name}
              </h3>
              {/* ステータスバッジ */}
              <div className={`flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                isPublished
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${
                  isPublished ? 'bg-emerald-500' : 'bg-amber-500'
                }`} />
                {isPublished ? '公開中' : '下書き'}
              </div>
            </div>
            {kit.name_ja && (
              <p className="text-sm text-gray-500 truncate">{kit.name_ja}</p>
            )}

            {/* メタ情報 */}
            <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                </svg>
                {kit.sticker_count ?? 0}
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                {formatMusicalKey(kit.musical_key)}
              </span>
            </div>

            {/* スペーサー */}
            <div className="flex-1" />

            {/* アクションボタン */}
            <div className="flex items-center gap-2 mt-2">
              <Link
                to={`/creator/kits/${kit.id}`}
                className={`flex-1 text-center px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  isPublished
                    ? 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                    : 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                }`}
              >
                {isPublished ? '詳細' : '編集'}
              </Link>

              {/* 共有ボタン（公開済みのみ） */}
              {isPublished && (
                <button
                  onClick={() => setIsShareOpen(true)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="共有"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </button>
              )}

              {onDelete && (
                <button
                  onClick={() => onDelete(kit)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="削除"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 共有ダイアログ */}
      {isPublished && (
        <KitShareDialog
          kit={kit}
          open={isShareOpen}
          onOpenChange={setIsShareOpen}
        />
      )}
    </div>
  );
};
