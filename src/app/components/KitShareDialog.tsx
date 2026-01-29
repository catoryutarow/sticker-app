/**
 * KitShareDialog.tsx - Kit sharing dialog for published kits
 * Allows sharing kit URLs via copy or SNS (X, LINE)
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Check, Copy, Share2 } from 'lucide-react';

interface KitShareDialogProps {
  kit: {
    kit_number: string;
    name: string;
    name_ja?: string | null;
    description?: string | null;
    color: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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

export function KitShareDialog({ kit, open, onOpenChange }: KitShareDialogProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  // Generate share URL
  const shareUrl = `${window.location.origin}/?kit=${kit.kit_number}`;

  const handleCopyUrl = useCallback(async () => {
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
    const kitName = kit.name_ja || kit.name;
    const text = t('kitShare.shareText', { name: kitName });
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=550,height=420');
  }, [shareUrl, kit.name, kit.name_ja, t]);

  const handleShareLine = useCallback(() => {
    const url = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=550,height=420');
  }, [shareUrl]);

  const handleClose = useCallback(() => {
    setCopied(false);
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md mx-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            {t('kitShare.title')}
          </DialogTitle>
          <DialogDescription>
            {t('kitShare.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Kit info */}
          <div
            className="flex items-center gap-3 p-3 rounded-lg"
            style={{ backgroundColor: `${kit.color}20` }}
          >
            <div
              className="w-3 h-12 rounded-full flex-shrink-0"
              style={{ backgroundColor: kit.color }}
            />
            <div className="min-w-0">
              <div className="font-semibold text-gray-900 truncate">{kit.name}</div>
              {kit.name_ja && (
                <div className="text-sm text-gray-500 truncate">{kit.name_ja}</div>
              )}
            </div>
          </div>

          {/* Share URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('kitShare.shareUrl')}</label>
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
            {copied && (
              <p className="text-xs text-green-600">{t('common.copied')}</p>
            )}
          </div>

          {/* SNS Share Buttons */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('kitShare.shareOnSns')}</label>
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
        </div>

        <DialogFooter>
          <button
            onClick={handleClose}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors"
          >
            {t('common.close')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
