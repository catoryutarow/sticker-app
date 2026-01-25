import { useState, useRef, useCallback } from 'react';

interface FileUploaderProps {
  type: 'image' | 'audio';
  onUpload: (file: File) => Promise<void>;
  currentPath?: string;
  disabled?: boolean;
}

export const FileUploader = ({ type, onUpload, currentPath, disabled }: FileUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = type === 'image' ? 'image/png,image/jpeg,image/webp' : 'audio/mpeg,audio/wav';
  const acceptLabel = type === 'image' ? 'PNG, JPEG, WebP' : 'MP3, WAV';
  const maxSize = 10 * 1024 * 1024; // 10MB

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize) {
      return 'ファイルサイズは10MB以下にしてください';
    }
    if (type === 'image' && !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      return '画像形式はPNG、JPEG、WebPのみ対応しています';
    }
    if (type === 'audio' && !['audio/mpeg', 'audio/wav', 'audio/wave', 'audio/x-wav', 'audio/mp3'].includes(file.type)) {
      return '音声形式はMP3、WAVのみ対応しています';
    }
    return null;
  };

  const handleFile = useCallback(async (file: File) => {
    setError('');
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsUploading(true);
    try {
      await onUpload(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'アップロードに失敗しました');
    } finally {
      setIsUploading(false);
    }
  }, [onUpload, type]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled || isUploading) return;

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [disabled, isUploading, handleFile]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    // Reset input
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleClick = () => {
    if (!disabled && !isUploading) {
      inputRef.current?.click();
    }
  };

  return (
    <div className="space-y-2">
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
          ${isDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${disabled || isUploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled || isUploading}
        />

        {isUploading ? (
          <div className="flex flex-col items-center py-2">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
            <span className="mt-2 text-sm text-gray-500">アップロード中...</span>
          </div>
        ) : currentPath ? (
          <div className="flex flex-col items-center py-2">
            {type === 'image' ? (
              <img
                src={currentPath}
                alt="uploaded"
                className="w-16 h-16 object-contain rounded"
              />
            ) : (
              <div className="flex items-center gap-2 text-green-600">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <span className="text-sm">音声ファイルあり</span>
              </div>
            )}
            <span className="mt-2 text-xs text-gray-400">クリックで差し替え</span>
          </div>
        ) : (
          <div className="flex flex-col items-center py-2">
            {type === 'image' ? (
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            )}
            <span className="mt-2 text-sm text-gray-500">
              ドラッグ&ドロップ または クリック
            </span>
            <span className="text-xs text-gray-400">
              {acceptLabel} / 最大10MB
            </span>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};
