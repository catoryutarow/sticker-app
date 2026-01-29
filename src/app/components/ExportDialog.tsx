/**
 * ExportDialog.tsx - エクスポート設定モーダル
 */

import { useState, useCallback, useRef, RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Progress } from './ui/progress';
import { Video, Loader2, Check, X, Share, Copy, ExternalLink, Share2 } from 'lucide-react';
import { VideoExporter, ExportProgress } from '../../export';
import { Sticker } from './StickerAlbum';
import { LOOP_DURATION } from '../../audio';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  stickers: Sticker[];
  stickerSheetRef?: RefObject<HTMLDivElement | null>; // 後方互換のため残すが未使用
  backgroundId?: string;
  onShareRequest?: (videoBlob: Blob) => void;
}

type ExportPhase = 'idle' | 'exporting' | 'complete' | 'error';

export function ExportDialog({ isOpen, onClose, stickers, backgroundId = 'default', onShareRequest }: ExportDialogProps) {
  const { t } = useTranslation();

  // Export settings
  const [greenScreen, setGreenScreen] = useState(false);
  const [includeAudio, setIncludeAudio] = useState(true);
  const [duration, setDuration] = useState(32);

  // Export state
  const [exportPhase, setExportPhase] = useState<ExportPhase>('idle');
  const [progress, setProgress] = useState<ExportProgress>({
    phase: 'preparing',
    progress: 0,
    message: '',
  });
  const [errorMessage, setErrorMessage] = useState('');

  // Ref for video blob
  const videoBlobRef = useRef<Blob | null>(null);

  const handleExport = useCallback(async () => {
    if (stickers.length === 0) return;

    setExportPhase('exporting');
    setErrorMessage('');

    try {
      // エクスポートサイズ: 3:4比率を維持した固定サイズ
      // シートのアスペクト比に合わせて720x960（HD相当）で出力
      const exportWidth = 720;
      const exportHeight = 960; // 3:4比率

      const exporter = new VideoExporter(stickers, {
        width: exportWidth,
        height: exportHeight,
        duration,
        fps: 30,
        greenScreen,
        includeAudio,
        masterVolume: 0.7,
        backgroundId,
      });

      exporter.onProgress((p) => {
        setProgress(p);
      });

      const blob = await exporter.export();
      videoBlobRef.current = blob;

      setExportPhase('complete');
      exporter.dispose();
    } catch (error) {
      console.error('Export failed:', error);
      setExportPhase('error');
      setErrorMessage(error instanceof Error ? error.message : t('app.unknownError'));
    }
  }, [stickers, duration, greenScreen, includeAudio, backgroundId]);

  const [saveMethod, setSaveMethod] = useState<'shared' | 'downloaded' | 'ios-chrome' | null>(null);

  const handleSave = useCallback(async () => {
    if (videoBlobRef.current) {
      const timestamp = new Date().toISOString().slice(0, 10);
      const result = await VideoExporter.save(videoBlobRef.current, `sticker-album-${timestamp}.mp4`);
      setSaveMethod(result);
    }
  }, []);

  const handleClose = useCallback(() => {
    if (exportPhase === 'exporting') return; // エクスポート中は閉じない
    setExportPhase('idle');
    setProgress({ phase: 'preparing', progress: 0, message: '' });
    setSaveMethod(null);
    videoBlobRef.current = null;
    onClose();
  }, [exportPhase, onClose]);

  const handleShareClick = useCallback(() => {
    if (videoBlobRef.current && onShareRequest) {
      onShareRequest(videoBlobRef.current);
      handleClose();
    }
  }, [onShareRequest, handleClose]);

  const durationOptions = [
    { value: 16, label: t('export.duration16') },
    { value: 32, label: t('export.duration32') },
    { value: 48, label: t('export.duration48') },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            {t('export.title')}
          </DialogTitle>
          <DialogDescription>{t('export.description')}</DialogDescription>
        </DialogHeader>

        {exportPhase === 'idle' && (
          <div className="space-y-4 py-4">
            {/* 長さ設定 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('export.duration')}</label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {durationOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* グリーンバック設定 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`w-5 h-5 rounded border ${greenScreen ? 'bg-green-500 border-green-600' : 'bg-gray-100 border-gray-300'}`}
                />
                <span className="text-sm font-medium">{t('export.greenBackground')}</span>
              </div>
              <button
                onClick={() => setGreenScreen(!greenScreen)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  greenScreen ? 'bg-green-500' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    greenScreen ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {exportPhase === 'exporting' && (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              <span className="text-sm font-medium">{progress.message}</span>
            </div>
            <Progress value={progress.progress} className="h-2" />
            <p className="text-center text-xs text-gray-500">{t('export.progress', { percent: Math.round(progress.progress) })}</p>
          </div>
        )}

        {exportPhase === 'complete' && (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-sm font-medium text-green-600">{t('export.completed')}</p>
              {saveMethod === 'shared' && (
                <p className="text-xs text-gray-500 text-center">
                  {t('export.saveToCamera')}
                </p>
              )}
              {saveMethod === 'downloaded' && (
                <p className="text-xs text-gray-500 text-center">
                  {t('export.savedToDownloads')}
                </p>
              )}
              {saveMethod === 'ios-chrome' && (
                <div className="space-y-3">
                  {/* Safari推奨 */}
                  <div className="bg-green-50 p-3 rounded-lg text-xs text-green-700 border border-green-200">
                    <p className="font-medium mb-2 flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />
                      {t('export.safariTip')}
                    </p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        alert(t('app.urlCopied'));
                      }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                      {t('export.copyUrl')}
                    </button>
                  </div>

                  {/* Chrome用手順 */}
                  <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700 text-left">
                    <p className="font-medium mb-1">{t('export.chromeInstructions')}</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>{t('export.chromeStep1')}</li>
                      <li>{t('export.chromeStep2')}</li>
                      <li>{t('export.chromeStep3')}</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {exportPhase === 'error' && (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <X className="w-6 h-6 text-red-600" />
              </div>
              <p className="text-sm font-medium text-red-600">{t('export.failed')}</p>
              <p className="text-xs text-gray-500">{errorMessage}</p>
            </div>
          </div>
        )}

        <DialogFooter className="sm:justify-between">
          {exportPhase === 'idle' && (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleExport}
                disabled={stickers.length === 0}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <Video className="w-4 h-4" />
                {t('export.start')}
              </button>
            </>
          )}

          {exportPhase === 'complete' && !saveMethod && (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {t('common.close')}
              </button>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-500 hover:bg-green-600 rounded-lg transition-colors"
                >
                  <Share className="w-4 h-4" />
                  {t('common.save')}
                </button>
                {onShareRequest && (
                  <button
                    onClick={handleShareClick}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    {t('common.share')}
                  </button>
                )}
              </div>
            </>
          )}

          {exportPhase === 'complete' && saveMethod && (
            <div className="flex gap-2 w-full">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {t('common.close')}
              </button>
              {onShareRequest && (
                <button
                  onClick={handleShareClick}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  {t('common.share')}
                </button>
              )}
            </div>
          )}

          {exportPhase === 'error' && (
            <>
              <button
                onClick={() => setExportPhase('idle')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {t('common.back')}
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors"
              >
                {t('common.retry')}
              </button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
