import { useState, useEffect, useRef } from 'react';
import { audioLibraryApi, type AudioLibraryResponse } from '@/api/audioLibraryApi';

interface AudioSelectorProps {
  kitId: string;
  stickerId: string;
  kitMusicalKey?: string;  // キットのmusical_key（例: "C/Am"）
  currentPath?: string;
  onUpload: (file: File) => Promise<void>;
  onSelectLibrary: (soundId: string) => Promise<void>;
  isPercussion?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  drums: 'ドラム',
  bass: 'ベース',
  synth: 'シンセ',
  instruments: '楽器',
};

export const AudioSelector = ({
  kitMusicalKey,
  currentPath,
  onUpload,
  onSelectLibrary,
  isPercussion = false,
}: AudioSelectorProps) => {
  const [library, setLibrary] = useState<AudioLibraryResponse | null>(null);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedSound, setSelectedSound] = useState<string | null>(null);
  const [playingSound, setPlayingSound] = useState<string | null>(null);
  const [isPlayingCurrent, setIsPlayingCurrent] = useState(false);
  const [showPulse, setShowPulse] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const prevPathRef = useRef<string | undefined>(currentPath);

  useEffect(() => {
    loadLibrary();
  }, []);

  // currentPathが変わったら再生を停止 & パルスエフェクト
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlayingCurrent(false);
    setPlayingSound(null);

    // 音声が新しく設定された時にパルス
    if (currentPath && currentPath !== prevPathRef.current) {
      setShowPulse(true);
      setTimeout(() => setShowPulse(false), 600);
    }
    prevPathRef.current = currentPath;
  }, [currentPath]);

  const loadLibrary = async () => {
    try {
      setIsLoadingLibrary(true);
      const response = await audioLibraryApi.getLibrary();
      setLibrary(response);
    } catch (error) {
      console.error('Failed to load audio library:', error);
    } finally {
      setIsLoadingLibrary(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await onUpload(file);
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSelectLibrarySound = async () => {
    if (!selectedSound) return;

    setIsUploading(true);
    try {
      await onSelectLibrary(selectedSound);
      setSelectedSound(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handlePlayCurrent = () => {
    if (!currentPath) return;

    if (isPlayingCurrent) {
      audioRef.current?.pause();
      setIsPlayingCurrent(false);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingSound(null);
      const audio = new Audio(currentPath);
      audio.onended = () => setIsPlayingCurrent(false);
      audio.play();
      audioRef.current = audio;
      setIsPlayingCurrent(true);
    }
  };

  const handlePlayPreview = (soundId: string, path: string) => {
    if (playingSound === soundId) {
      audioRef.current?.pause();
      setPlayingSound(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlayingCurrent(false);
      const audio = new Audio(path);
      audio.onended = () => setPlayingSound(null);
      audio.play();
      audioRef.current = audio;
      setPlayingSound(soundId);
    }
  };

  return (
    <div className="space-y-3">
      {/* パルスアニメーション用スタイル */}
      <style>{`
        @keyframes audio-pulse {
          0% {
            transform: scale(1);
            opacity: 0.8;
          }
          100% {
            transform: scale(1.15);
            opacity: 0;
          }
        }
        .audio-pulse-ring {
          animation: audio-pulse 0.5s ease-out forwards;
        }
      `}</style>

      {/* 現在の音声状態 */}
      <div className="relative">
        {/* パルスエフェクト */}
        {showPulse && (
          <div
            className="audio-pulse-ring absolute inset-0 rounded-lg border-2 border-emerald-400 pointer-events-none"
          />
        )}

        <div className={`relative p-3 rounded-lg border-2 transition-all duration-300 ${
          currentPath
            ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-300'
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {currentPath ? (
                <>
                  {/* スピーカー + 音波アイコン */}
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                  <span className="text-sm font-semibold text-emerald-700">設定済み</span>
                </>
              ) : (
                <>
                  {/* ミュートアイコン */}
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                  <span className="text-sm text-gray-400">未設定</span>
                </>
              )}
            </div>
            {currentPath && (
              <button
                type="button"
                onClick={handlePlayCurrent}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                  isPlayingCurrent
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                    : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300'
                }`}
              >
                {isPlayingCurrent ? (
                  <>
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="4" width="4" height="16" rx="1" />
                      <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                    停止
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    再生
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ライブラリ選択セクション */}
      <div>
        <div className="text-xs font-medium text-gray-500 mb-2 tracking-wide">
          {currentPath ? '音声を変更' : '音声を選択'}
        </div>

        {/* キットのキー表示 */}
        {kitMusicalKey && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg mb-2">
            <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
            </svg>
            <span className="text-xs text-indigo-700">
              キット: <strong>{kitMusicalKey}</strong> の音源を表示中
            </span>
          </div>
        )}

        {isLoadingLibrary ? (
          <div className="flex items-center justify-center py-6 border rounded-lg bg-gray-50">
            <div className="flex items-center gap-2 text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent" />
              <span className="text-xs">読み込み中</span>
            </div>
          </div>
        ) : library ? (
          <div className="max-h-40 overflow-y-auto border rounded-lg bg-white shadow-sm">
            {/* カテゴリを音声タイプに応じて並べ替え */}
            {(() => {
              const categoryOrder = isPercussion
                ? ['drums', 'bass', 'synth', 'instruments']  // ドラムタイプ: ドラムを先頭に
                : ['bass', 'synth', 'instruments', 'drums']; // メロディタイプ: メロディ系を先頭に
              const sortedCategories = categoryOrder
                .filter(cat => library.categories[cat])
                .map(cat => [cat, library.categories[cat]] as const);

              return sortedCategories.map(([category, sounds]) => {
                // キットのキーに合った音声のみをフィルタリング
                const availableSounds = sounds.filter(s => {
                  if (!s.available) return false;

                  // キーが指定されていない場合は全て表示
                  if (!kitMusicalKey) return true;

                  // パーカッション（ドラム）はキーに関係なく表示
                  if (s.isPercussion) return true;

                  // musicalKeyがnullの音声（キーに依存しない）は表示
                  if (!s.musicalKey) return true;

                  // キットのキーと一致する音声のみ表示
                  return s.musicalKey === kitMusicalKey;
                });
                if (availableSounds.length === 0) return null;

                // 音声タイプに合った音源を先頭に並べ替え
                const sortedSounds = [...availableSounds].sort((a, b) => {
                  if (isPercussion) {
                    // ドラムタイプ: パーカッションを先頭に
                    if (a.isPercussion && !b.isPercussion) return -1;
                    if (!a.isPercussion && b.isPercussion) return 1;
                  } else {
                    // メロディタイプ: 非パーカッションを先頭に
                    if (!a.isPercussion && b.isPercussion) return -1;
                    if (a.isPercussion && !b.isPercussion) return 1;
                  }
                  return 0;
                });

                return (
                  <div key={category}>
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider px-3 py-1.5 bg-gray-50/80 border-b sticky top-0 backdrop-blur-sm">
                      {CATEGORY_LABELS[category] || category}
                    </div>
                    {sortedSounds.map((sound) => (
                      <div
                        key={sound.id}
                        className={`flex items-center justify-between px-3 py-2.5 cursor-pointer border-b last:border-b-0 transition-colors ${
                          selectedSound === sound.id
                            ? 'bg-blue-50'
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedSound(sound.id)}
                      >
                        <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                            selectedSound === sound.id
                              ? 'border-blue-500 bg-blue-500'
                              : 'border-gray-300'
                          }`}>
                            {selectedSound === sound.id && (
                              <div className="w-1.5 h-1.5 rounded-full bg-white" />
                            )}
                          </div>
                          <span className="text-sm text-gray-700">{sound.nameJa}</span>
                          {sound.isPercussion ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded font-medium">
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="3" strokeWidth={2} />
                                <circle cx="12" cy="12" r="6" strokeWidth={2} />
                              </svg>
                              ドラム
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded font-medium">
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                              </svg>
                              メロディ
                            </span>
                          )}
                        </label>
                        {sound.path && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlayPreview(sound.id, sound.path!);
                            }}
                            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                              playingSound === sound.id
                                ? 'bg-blue-500 text-white scale-110'
                                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                            }`}
                          >
                            {playingSound === sound.id ? (
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                <rect x="6" y="4" width="4" height="16" rx="1" />
                                <rect x="14" y="4" width="4" height="16" rx="1" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            )}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                );
              });
            })()}
          </div>
        ) : (
          <div className="text-center py-4 text-sm text-gray-500 border rounded-lg bg-gray-50">
            ライブラリを読み込めませんでした
          </div>
        )}
      </div>

      {/* アクションボタン */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSelectLibrarySound}
          disabled={!selectedSound || isUploading}
          className="flex-1 px-3 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md disabled:shadow-none"
        >
          {isUploading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              適用中...
            </span>
          ) : (
            '選択した音声を使用'
          )}
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="px-3 py-2.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 transition-all shadow-sm"
          title="自分の音声ファイルをアップロード"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,.wav,audio/mpeg,audio/wav"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />
      </div>
    </div>
  );
};
