/**
 * WorkPage.tsx - 共有作品ページ
 * /w/:shareId でアクセス可能な公開作品表示ページ
 */

import { useState, useEffect, useCallback, useRef, useLayoutEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { worksApi, Work } from '../../api/worksApi';
import { StickerShape } from '../components/StickerShape';
import { getBackgroundImagePath } from '../../config/backgroundConfig';
import { useAudioEngine } from '../../audio';
import { getKitBaseSemitone } from '../../config/kitConfig';
import { isStickerPercussion } from '../../config/stickerConfig';
import { Loader2, Play, Pause, Share2, Copy, Check, ExternalLink, Home, Volume2 } from 'lucide-react';

// SNS icons
function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LineIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
  );
}

export function WorkPage() {
  const { shareId } = useParams<{ shareId: string }>();
  const [work, setWork] = useState<Work | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  // Audio engine
  const {
    isPlaying,
    isInitialized: isAudioInitialized,
    initialize: initializeAudio,
    toggle: toggleAudio,
    setSheetWidth,
    syncWithStickers,
  } = useAudioEngine();

  // シールが読み込まれたときにオーディオエンジンと同期
  useEffect(() => {
    if (!work) return;

    const stickersForAudio = work.stickers.map(s => {
      const kitId = s.type.split('-')[0] || '001';
      const baseSemitone = isStickerPercussion(s.type) ? 0 : getKitBaseSemitone(kitId);
      return {
        ...s,
        pitch: s.pitch - baseSemitone,
      };
    });
    syncWithStickers(stickersForAudio);
  }, [work, syncWithStickers]);

  // 台紙の幅をオーディオエンジンに設定
  // シールの座標は元のスケール（baseWidth=600）で保存されているため、
  // 表示上の縮小に関係なく基準幅を使用する
  useLayoutEffect(() => {
    // 基準幅（シール座標の基準となるサイズ）
    const baseWidth = 600;
    setSheetWidth(baseWidth);
  }, [setSheetWidth]);

  // コンテナサイズを監視してカードをフィットさせる
  useLayoutEffect(() => {
    const updateContainerSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: window.innerHeight - 200, // ヘッダーとパディング分を引く
        });
      }
    };

    updateContainerSize();
    window.addEventListener('resize', updateContainerSize);
    return () => window.removeEventListener('resize', updateContainerSize);
  }, []);

  // カードのサイズを計算（画面に収まるように縮小、PC版は控えめなサイズに）
  const cardDimensions = useMemo(() => {
    if (!work) {
      return { width: 0, height: 0, scale: 1 };
    }

    const aspectRatioValue = work.aspectRatio === '1:1' ? 1 : 3 / 4;
    const baseWidth = 600; // 基準となる幅
    const baseHeight = baseWidth / aspectRatioValue;

    // containerSizeがまだ0の場合はウィンドウサイズからフォールバック値を計算
    const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 375;
    const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 667;
    const isDesktop = windowWidth >= 1024;

    const availableWidth = (containerSize.width > 0 ? containerSize.width : windowWidth) - 32;
    // PC版は画面の50%程度に収める（ボタンにも目が行くように）
    const availableHeight = isDesktop
      ? Math.min(windowHeight * 0.55, 500)
      : (containerSize.height > 0 ? containerSize.height : windowHeight - 200);

    // 幅と高さの両方に基づいてスケールを計算
    const scaleByWidth = availableWidth / baseWidth;
    const scaleByHeight = availableHeight / baseHeight;
    // PC版は最大0.7倍に制限
    const maxScale = isDesktop ? 0.7 : 1;
    const scale = Math.min(scaleByWidth, scaleByHeight, maxScale);

    return {
      width: baseWidth * scale,
      height: baseHeight * scale,
      scale,
    };
  }, [work, containerSize]);

  // 再生ボタンハンドラー
  const handlePlayToggle = useCallback(async () => {
    if (!isAudioInitialized) {
      await initializeAudio();
    }
    toggleAudio();
  }, [isAudioInitialized, initializeAudio, toggleAudio]);

  useEffect(() => {
    async function fetchWork() {
      if (!shareId) return;

      try {
        setLoading(true);
        const data = await worksApi.getWork(shareId);
        setWork(data);
      } catch (err) {
        console.error('Failed to fetch work:', err);
        setError(err instanceof Error ? err.message : '作品が見つかりません');
      } finally {
        setLoading(false);
      }
    }

    fetchWork();
  }, [shareId]);

  const handleCopyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = shareUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareUrl]);

  const handleShareX = useCallback(() => {
    const text = work?.title ? `${work.title}` : 'シールアルバム作品';
    const hashtags = 'シールアルバム';
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}&hashtags=${encodeURIComponent(hashtags)}`;
    window.open(url, '_blank', 'width=550,height=420');
  }, [shareUrl, work?.title]);

  const handleShareLine = useCallback(() => {
    const url = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=550,height=420');
  }, [shareUrl]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error || !work) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center">
            <ExternalLink className="w-8 h-8 text-gray-400" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">作品が見つかりません</h1>
          <p className="text-gray-600">{error || '指定された作品は存在しないか、削除された可能性があります。'}</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
          >
            <Home className="w-4 h-4" />
            シール帳を作る
          </Link>
        </div>
      </div>
    );
  }

  const ogTitle = work.title || 'シールアルバム作品';
  const ogDescription = `${work.stickers.length}個のシールで作られた作品`;
  const ogImage = work.thumbnailUrl || '/og-default.png';

  return (
    <>
      {/* OGP Meta Tags */}
      <Helmet>
        <title>{ogTitle} | シール帳</title>
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={ogDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:url" content={shareUrl} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={ogTitle} />
        <meta name="twitter:description" content={ogDescription} />
        <meta name="twitter:image" content={ogImage} />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-4 lg:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <header className="mb-6 text-center">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
              {work.title || 'シールアルバム'}
            </h1>
            <p className="text-sm text-gray-500">
              {work.stickers.length}個のシール • {work.viewCount.toLocaleString()}回閲覧
            </p>
          </header>

          {/* Single column centered layout */}
          <div ref={containerRef} className="flex flex-col items-center gap-6 max-w-lg mx-auto">
            {/* Work Display */}
            <div className="relative flex justify-center">
              {/* Main sheet - scales to fit screen while maintaining aspect ratio */}
              <div
                ref={sheetRef}
                className="relative rounded-lg overflow-hidden flex-shrink-0"
                style={{
                  width: cardDimensions.width > 0 ? `${cardDimensions.width}px` : 'auto',
                  height: cardDimensions.height > 0 ? `${cardDimensions.height}px` : 'auto',
                  aspectRatio: work.aspectRatio === '1:1' ? '1 / 1' : '3 / 4',
                  backdropFilter: 'blur(10px)',
                  boxShadow: `
                    0 8px 32px rgba(0, 0, 0, 0.1),
                    inset 0 1px 0 rgba(255, 255, 255, 0.8),
                    inset 0 -1px 0 rgba(255, 255, 255, 0.5)
                  `,
                  border: '2px solid rgba(255, 255, 255, 0.5)',
                  backgroundImage: `url(${getBackgroundImagePath(work.backgroundId)})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                {/* Grid overlay */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-10"
                  style={{
                    backgroundImage: `
                      linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
                    `,
                    backgroundSize: '20px 20px',
                  }}
                />

                {/* Stickers - scaled with the card */}
                {work.stickers.map((sticker) => (
                  <div
                    key={sticker.id}
                    className="absolute"
                    style={{
                      left: `${sticker.x * cardDimensions.scale}px`,
                      top: `${sticker.y * cardDimensions.scale}px`,
                      transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg) scale(${sticker.scale * cardDimensions.scale})`,
                      filter: `
                        drop-shadow(0 1px 1px rgba(0, 0, 0, 0.15))
                        drop-shadow(0 2px 3px rgba(0, 0, 0, 0.1))
                        drop-shadow(0 0 1px rgba(0, 0, 0, 0.08))
                      `,
                    }}
                  >
                    <StickerShape type={sticker.type} size={80} />
                  </div>
                ))}
              </div>

            </div>

            {/* Actions */}
            <div className="w-full space-y-4">
              {/* Play/Pause button */}
              {work.stickers.length > 0 && (
                <button
                  onClick={handlePlayToggle}
                  className={`w-full py-3 px-4 font-bold text-center rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] ${
                    isPlaying
                      ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white'
                      : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                  }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    {isPlaying ? (
                      <>
                        <Pause className="w-5 h-5" />
                        一時停止
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-5 h-5" />
                        音楽を再生
                      </>
                    )}
                  </span>
                </button>
              )}

              {/* Create your own CTA */}
              <Link
                to="/"
                className="block w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold text-center rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
              >
                <span className="flex items-center justify-center gap-2">
                  <Play className="w-5 h-5" />
                  自分のシール帳を作る
                </span>
              </Link>

              {/* Share section */}
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-700">
                  <Share2 className="w-4 h-4" />
                  この作品を共有
                </div>

                {/* Copy URL */}
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 px-3 py-2 border rounded-lg bg-gray-50 text-sm min-w-0"
                  />
                  <button
                    onClick={handleCopyUrl}
                    className={`px-3 py-2 rounded-lg transition-colors flex-shrink-0 ${
                      copied
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {/* SNS buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleShareX}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <XIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">X</span>
                  </button>
                  <button
                    onClick={handleShareLine}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 bg-[#06C755] text-white rounded-lg hover:bg-[#05b34d] transition-colors"
                  >
                    <LineIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">LINE</span>
                  </button>
                </div>
              </div>

              {/* Video download if available */}
              {work.videoUrl && (
                <a
                  href={work.videoUrl}
                  download
                  className="block w-full py-3 px-4 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white font-medium text-center rounded-xl hover:opacity-90 transition-opacity"
                >
                  動画をダウンロード
                </a>
              )}

              {/* Footer */}
              <footer className="text-center text-sm text-gray-500 pt-2">
                <p>
                  作成日: {new Date(work.createdAt).toLocaleDateString('ja-JP')}
                </p>
              </footer>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
