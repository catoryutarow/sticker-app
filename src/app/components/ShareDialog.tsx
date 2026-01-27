/**
 * ShareDialog.tsx - SNS共有ダイアログ
 */

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Check, Copy, Download, Loader2, Share2, X } from 'lucide-react';
import { worksApi, Work, PlacedSticker, AspectRatio } from '../../api/worksApi';
import { getAnonymousId } from '../../utils/anonymousId';

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  stickers: PlacedSticker[];
  backgroundId?: string;
  aspectRatio?: AspectRatio;
  videoBlob?: Blob | null;
  thumbnailDataUrl?: string | null;
}

type SharePhase = 'input' | 'saving' | 'ready' | 'error';

// SNS icons as simple components
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

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

export function ShareDialog({
  isOpen,
  onClose,
  stickers,
  backgroundId = 'default',
  aspectRatio = '3:4',
  videoBlob,
  thumbnailDataUrl,
}: ShareDialogProps) {
  const [title, setTitle] = useState('');
  const [phase, setPhase] = useState<SharePhase>('input');
  const [savedWork, setSavedWork] = useState<Work | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [copied, setCopied] = useState(false);

  const shareUrl = savedWork
    ? `${window.location.origin}/w/${savedWork.shareId}`
    : '';

  const handleSave = useCallback(async () => {
    if (stickers.length === 0) return;

    setPhase('saving');
    setErrorMessage('');

    try {
      const anonymousId = getAnonymousId();
      const work = await worksApi.saveWork({
        title: title.trim() || undefined,
        stickers,
        backgroundId,
        aspectRatio,
        anonymousId,
        thumbnailUrl: thumbnailDataUrl || undefined,
      });

      setSavedWork(work);
      setPhase('ready');
    } catch (error) {
      console.error('Save work failed:', error);
      setPhase('error');
      setErrorMessage(error instanceof Error ? error.message : '保存に失敗しました');
    }
  }, [stickers, backgroundId, title, thumbnailDataUrl]);

  const handleCopyUrl = useCallback(async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
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
    const text = title ? `${title} を作りました！` : 'シールアルバムを作りました！';
    const hashtags = 'シールアルバム';
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}&hashtags=${encodeURIComponent(hashtags)}`;
    window.open(url, '_blank', 'width=550,height=420');
  }, [shareUrl, title]);

  const handleShareLine = useCallback(() => {
    const url = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=550,height=420');
  }, [shareUrl]);

  const handleDownloadVideo = useCallback(async () => {
    if (!videoBlob) return;

    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `sticker-album-${timestamp}.mp4`;

    // Try Web Share API first (mobile)
    if (navigator.share && navigator.canShare?.({ files: [new File([videoBlob], filename, { type: 'video/mp4' })] })) {
      try {
        await navigator.share({
          files: [new File([videoBlob], filename, { type: 'video/mp4' })],
          title: title || 'シールアルバム',
        });
        return;
      } catch {
        // Fall through to download
      }
    }

    // Fallback: Download
    const url = URL.createObjectURL(videoBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [videoBlob, title]);

  const handleClose = useCallback(() => {
    if (phase === 'saving') return;
    setPhase('input');
    setTitle('');
    setSavedWork(null);
    setErrorMessage('');
    setCopied(false);
    onClose();
  }, [phase, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md mx-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            作品を共有
          </DialogTitle>
          <DialogDescription>作品を保存してSNSで共有しよう</DialogDescription>
        </DialogHeader>

        {/* Input Phase */}
        {phase === 'input' && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">タイトル（任意）</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="作品のタイトルを入力..."
                maxLength={50}
                className="w-full px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="text-xs text-gray-500">SNSでシェアするときのタイトルになります</p>
            </div>

            {/* Preview thumbnail if available */}
            {thumbnailDataUrl && (
              <div className="space-y-2">
                <label className="text-sm font-medium">プレビュー</label>
                <div className="aspect-[3/4] max-h-32 mx-auto overflow-hidden rounded-lg border bg-gray-50">
                  <img
                    src={thumbnailDataUrl}
                    alt="Preview"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Saving Phase */}
        {phase === 'saving' && (
          <div className="space-y-4 py-8">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-sm font-medium">保存中...</p>
            </div>
          </div>
        )}

        {/* Ready Phase */}
        {phase === 'ready' && savedWork && (
          <div className="space-y-4 py-4">
            {/* Success message */}
            <div className="flex items-center gap-2 text-green-600">
              <Check className="w-5 h-5" />
              <span className="text-sm font-medium">保存しました</span>
            </div>

            {/* Share URL */}
            <div className="space-y-2">
              <label className="text-sm font-medium">共有URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 px-3 py-2 border rounded-lg bg-gray-50 text-sm"
                />
                <button
                  onClick={handleCopyUrl}
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    copied
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* SNS Share Buttons */}
            <div className="space-y-2">
              <label className="text-sm font-medium">SNSで共有</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleShareX}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <XIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">X</span>
                </button>
                <button
                  onClick={handleShareLine}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#06C755] text-white rounded-lg hover:bg-[#05b34d] transition-colors"
                >
                  <LineIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">LINE</span>
                </button>
              </div>
            </div>

            {/* Video download for Instagram/TikTok */}
            {videoBlob && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Instagram / TikTok</label>
                <div className="bg-gray-50 p-3 rounded-lg space-y-3">
                  <p className="text-xs text-gray-600">
                    動画をダウンロードして投稿してね！
                  </p>
                  <button
                    onClick={handleDownloadVideo}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white rounded-lg hover:opacity-90 transition-opacity"
                  >
                    <Download className="w-4 h-4" />
                    <span className="text-sm font-medium">動画をダウンロード</span>
                  </button>
                  <div className="flex gap-2 justify-center">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <InstagramIcon className="w-4 h-4" />
                      Instagram
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <TikTokIcon className="w-4 h-4" />
                      TikTok
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Phase */}
        {phase === 'error' && (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <X className="w-6 h-6 text-red-600" />
              </div>
              <p className="text-sm font-medium text-red-600">保存に失敗しました</p>
              <p className="text-xs text-gray-500">{errorMessage}</p>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:justify-between">
          {phase === 'input' && (
            <>
              <button
                onClick={handleClose}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={stickers.length === 0}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <Share2 className="w-4 h-4" />
                保存して共有
              </button>
            </>
          )}

          {phase === 'ready' && (
            <button
              onClick={handleClose}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors"
            >
              完了
            </button>
          )}

          {phase === 'error' && (
            <>
              <button
                onClick={() => setPhase('input')}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                戻る
              </button>
              <button
                onClick={handleSave}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors"
              >
                再試行
              </button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
