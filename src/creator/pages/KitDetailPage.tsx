import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { kitsApi, type Kit, type Sticker, type UpdateKitRequest, type FallbackAssignment } from '@/api/kitsApi';
import { audioLibraryApi } from '@/api/audioLibraryApi';
import { useAuth } from '@/auth';
import { KitForm } from '../components/KitForm';
import { StickerGrid } from '../components/StickerGrid';
import { LayoutPreview } from '../components/LayoutPreview';
import { ImageCropper } from '../components/ImageCropper';

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

export const KitDetailPage = () => {
  const { kitId } = useParams<{ kitId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [kit, setKit] = useState<Kit | null>(null);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [isEditingKit, setIsEditingKit] = useState(false);
  const [isKitSubmitting, setIsKitSubmitting] = useState(false);

  const [showAddSticker, setShowAddSticker] = useState(false);
  const [addStickerStep, setAddStickerStep] = useState<1 | 2>(1);
  const [newlyCreatedSticker, setNewlyCreatedSticker] = useState<Sticker | null>(null);
  const [newStickerImageFile, setNewStickerImageFile] = useState<File | null>(null);
  const [editingSticker, setEditingSticker] = useState<Sticker | null>(null);
  const [deleteSticker, setDeleteSticker] = useState<Sticker | null>(null);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [fallbackAssignments, setFallbackAssignments] = useState<FallbackAssignment[] | null>(null);
  const [stickersNotInLayout, setStickersNotInLayout] = useState<Sticker[]>([]);
  const [isCheckingLayouts, setIsCheckingLayouts] = useState(false);

  const [stickerForm, setStickerForm] = useState({ name: '', nameJa: '', color: '#CCCCCC', isPercussion: false });
  const [isStickerSubmitting, setIsStickerSubmitting] = useState(false);

  const isPublished = kit?.status === 'published';
  const isAdmin = user?.role === 'admin';
  // adminは公開済みキットも編集可能
  const canEditKit = !isPublished || isAdmin;

  const loadKit = useCallback(async () => {
    if (!kitId) return;

    try {
      setIsLoading(true);
      setError('');
      const response = await kitsApi.getKit(kitId);
      setKit(response.kit);
      setStickers(response.stickers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'キットの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [kitId]);

  useEffect(() => {
    loadKit();
  }, [loadKit]);

  const handleUpdateKit = async (data: UpdateKitRequest) => {
    if (!kitId || !kit || !canEditKit) return;

    setIsKitSubmitting(true);
    try {
      const response = await kitsApi.updateKit(kitId, data);
      setKit(response.kit);
      setIsEditingKit(false);
    } finally {
      setIsKitSubmitting(false);
    }
  };

  const handleAddSticker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kitId || !stickerForm.name.trim() || isPublished) return;

    setIsStickerSubmitting(true);
    try {
      const response = await kitsApi.createSticker(kitId, {
        name: stickerForm.name.trim(),
        nameJa: stickerForm.nameJa.trim() || undefined,
        color: stickerForm.color,
        isPercussion: stickerForm.isPercussion,
      });
      setStickers([...stickers, response.sticker]);
      setNewlyCreatedSticker(response.sticker);
      setStickerForm({ name: '', nameJa: '', color: '#CCCCCC', isPercussion: false });
      setAddStickerStep(2); // 画像アップロードステップへ
    } catch (err) {
      setError(err instanceof Error ? err.message : 'シールの追加に失敗しました');
    } finally {
      setIsStickerSubmitting(false);
    }
  };

  const handleNewStickerCropComplete = async (blob: Blob) => {
    if (!kitId || !newlyCreatedSticker) return;
    try {
      const file = new File([blob], 'sticker.png', { type: 'image/png' });
      const response = await kitsApi.uploadStickerImage(kitId, newlyCreatedSticker.id, file);
      setStickers(stickers.map(s => s.id === newlyCreatedSticker.id ? response.sticker : s));
      setNewlyCreatedSticker(response.sticker);
      setNewStickerImageFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '画像のアップロードに失敗しました');
    }
  };

  const closeAddStickerModal = () => {
    setShowAddSticker(false);
    setAddStickerStep(1);
    setNewlyCreatedSticker(null);
    setNewStickerImageFile(null);
    setStickerForm({ name: '', nameJa: '', color: '#CCCCCC', isPercussion: false });
  };

  // adminは公開済みでもシール編集可能
  const canEditStickers = !isPublished || isAdmin;

  const handleEditSticker = (sticker: Sticker) => {
    if (!canEditStickers) return;
    setEditingSticker(sticker);
    setStickerForm({
      name: sticker.name,
      nameJa: sticker.name_ja || '',
      color: sticker.color,
      isPercussion: sticker.is_percussion === 1,
    });
  };

  const handleUpdateSticker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kitId || !editingSticker || !canEditStickers) return;

    setIsStickerSubmitting(true);
    try {
      const response = await kitsApi.updateSticker(kitId, editingSticker.id, {
        name: stickerForm.name.trim(),
        nameJa: stickerForm.nameJa.trim() || undefined,
        color: stickerForm.color,
        isPercussion: stickerForm.isPercussion,
      });
      setStickers(stickers.map(s => s.id === editingSticker.id ? response.sticker : s));
      setEditingSticker(null);
      setStickerForm({ name: '', nameJa: '', color: '#CCCCCC', isPercussion: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'シールの更新に失敗しました');
    } finally {
      setIsStickerSubmitting(false);
    }
  };

  const handleDeleteSticker = async () => {
    if (!kitId || !deleteSticker || isPublished) return;

    setIsStickerSubmitting(true);
    try {
      await kitsApi.deleteSticker(kitId, deleteSticker.id);
      setStickers(stickers.filter(s => s.id !== deleteSticker.id));
      setDeleteSticker(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'シールの削除に失敗しました');
    } finally {
      setIsStickerSubmitting(false);
    }
  };

  const handleUploadImage = async (sticker: Sticker, file: File) => {
    if (!kitId || isPublished) return;
    const response = await kitsApi.uploadStickerImage(kitId, sticker.id, file);
    setStickers(stickers.map(s => s.id === sticker.id ? response.sticker : s));
  };

  const handleUploadAudio = async (sticker: Sticker, file: File) => {
    if (!kitId || isPublished) return;
    const response = await kitsApi.uploadStickerAudio(kitId, sticker.id, file);
    setStickers(stickers.map(s => s.id === sticker.id ? response.sticker : s));
  };

  const handleSelectLibraryAudio = async (sticker: Sticker, soundId: string) => {
    if (!kitId || isPublished) return;
    const response = await audioLibraryApi.assignLibraryAudio(kitId, sticker.id, soundId);
    setStickers(stickers.map(s => s.id === sticker.id ? response.sticker : s));
  };


  // 公開確認モーダルを開く前にレイアウト状態をチェック
  const handleOpenPublishConfirm = async () => {
    if (!kitId || !kit) return;

    setIsCheckingLayouts(true);
    setStickersNotInLayout([]);

    try {
      // 全シールのレイアウトをチェック
      const stickersWithoutLayout: Sticker[] = [];
      for (const sticker of stickers) {
        const response = await kitsApi.getLayouts(kitId, sticker.id);
        if (response.layouts.length === 0) {
          stickersWithoutLayout.push(sticker);
        }
      }
      setStickersNotInLayout(stickersWithoutLayout);
    } catch (err) {
      console.error('Failed to check layouts:', err);
    } finally {
      setIsCheckingLayouts(false);
      setShowPublishConfirm(true);
    }
  };

  const handlePublish = async () => {
    if (!kitId || !kit || isPublished) return;

    setIsPublishing(true);
    setPublishError('');
    try {
      const response = await kitsApi.updateKit(kitId, { status: 'published' });
      setKit(response.kit);
      setShowPublishConfirm(false);
      setPublishError('');

      // フォールバック割り当てがあった場合は通知を表示
      if (response.fallbackAssignments && response.fallbackAssignments.length > 0) {
        setFallbackAssignments(response.fallbackAssignments);
        // シール一覧を再読み込み（音声状態が変わったため）
        await loadKit();
      }
    } catch (err) {
      // エラーをモーダル内に表示
      setPublishError(err instanceof Error ? err.message : '公開に失敗しました');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDeleteKit = async () => {
    if (!kitId) return;

    try {
      await kitsApi.deleteKit(kitId);
      navigate('/creator/kits');
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました');
    }
  };

  // 公開に必要な条件をチェック（画像のみ必須、音声は未設定ならライブラリから自動割り当て）
  const canPublish = stickers.length > 0 &&
    stickers.every(s => s.image_uploaded);
  const stickersWithoutAudio = stickers.filter(s => !s.audio_uploaded);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!kit) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">キットが見つかりません</p>
        <Link to="/creator" className="mt-4 text-blue-600 hover:text-blue-700">
          ダッシュボードに戻る
        </Link>
      </div>
    );
  }

  const PRESET_COLORS = [
    '#CCCCCC', '#FFB4B4', '#FFD9B4', '#FFFAB4', '#B4FFB4',
    '#B4FFFF', '#B4D9FF', '#D9B4FF', '#FFB4FF'
  ];

  return (
    <div className="space-y-6">
      {/* パンくず */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/creator" className="hover:text-gray-700">ダッシュボード</Link>
        <span>/</span>
        <span className="text-gray-900">{kit.name}</span>
      </nav>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
          <button onClick={() => setError('')} className="float-right text-red-400 hover:text-red-600">&times;</button>
        </div>
      )}

      {/* 公開済み通知バナー */}
      {isPublished && (
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <div className="font-semibold">公開中</div>
                <div className="text-sm text-white/80">このキットはユーザーに公開されています</div>
              </div>
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-3 sm:px-4 py-2 rounded-lg bg-white text-red-600 hover:bg-red-50 text-sm font-medium transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              削除
            </button>
          </div>
        </div>
      )}

      {/* キット情報カード */}
      <div className="bg-white shadow rounded-lg overflow-hidden" style={{ borderTop: `4px solid ${kit.color}` }}>
        {isEditingKit && canEditKit ? (
          <div className="p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">キット情報を編集</h2>
            <KitForm
              kit={kit}
              onSubmit={handleUpdateKit}
              onCancel={() => setIsEditingKit(false)}
              isSubmitting={isKitSubmitting}
            />
          </div>
        ) : (
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-gray-900">{kit.name}</h1>
                  {isPublished && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                      公開中
                    </span>
                  )}
                </div>
                {kit.name_ja && (
                  <p className="mt-1 text-gray-500">{kit.name_ja}</p>
                )}
                <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                  <span>キー: {formatMusicalKey(kit.musical_key)}</span>
                  <span>シール: {stickers.length}個</span>
                </div>
                {kit.description && (
                  <p className="mt-3 text-gray-600">{kit.description}</p>
                )}
              </div>
              {canEditKit && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsEditingKit(true)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    編集
                  </button>
                </div>
              )}
            </div>

            {/* 公開ボタン（下書きの場合のみ） */}
            {!isPublished && (
              <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-100">
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-amber-800 text-sm sm:text-base">下書き</div>
                        <div className="text-xs sm:text-sm text-amber-600 truncate sm:whitespace-normal">
                          {canPublish
                            ? '準備完了'
                            : '画像を設定してください'}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleOpenPublishConfirm}
                      disabled={!canPublish || isCheckingLayouts}
                      className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 flex-shrink-0 ${
                        canPublish && !isCheckingLayouts
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 shadow-md hover:shadow-lg'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {isCheckingLayouts ? '確認中...' : '公開'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* メインコンテンツ：2カラムレイアウト（モバイルは縦並び、シール→プレビューの順） */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* シールセクション（モバイルで先に表示） */}
        <div className="lg:col-span-2 order-1 lg:order-2">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">シール ({stickers.length})</h2>
              {!isPublished && (
                <button
                  onClick={() => setShowAddSticker(true)}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  シールを追加
                </button>
              )}
            </div>
            <div className="p-6">
              {isPublished && !isAdmin ? (
                // 公開済み（非admin）は閲覧のみ
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {stickers.map((sticker) => (
                    <div
                      key={sticker.id}
                      className="bg-white rounded-lg border p-3 text-center"
                      style={{ borderLeftColor: sticker.color, borderLeftWidth: 4 }}
                    >
                      <div
                        className="w-16 h-16 mx-auto rounded-lg flex items-center justify-center overflow-hidden mb-2"
                        style={{ backgroundColor: sticker.color + '20' }}
                      >
                        {sticker.image_uploaded ? (
                          <img
                            src={`/assets/stickers/kit-${kit.kit_number}/${sticker.full_id}.png`}
                            alt={sticker.name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        )}
                      </div>
                      <div className="text-sm font-medium text-gray-900 truncate">{sticker.name}</div>
                      {sticker.is_percussion === 1 && (
                        <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] bg-orange-100 text-orange-700 rounded">
                          Perc
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : isPublished && isAdmin ? (
                // 公開済み（admin）は名前編集可能
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {stickers.map((sticker) => (
                    <div
                      key={sticker.id}
                      className="bg-white rounded-lg border p-3 text-center relative group"
                      style={{ borderLeftColor: sticker.color, borderLeftWidth: 4 }}
                    >
                      {/* Admin編集ボタン */}
                      <button
                        onClick={() => handleEditSticker(sticker)}
                        className="absolute top-1 right-1 p-1 bg-blue-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="編集"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <div
                        className="w-16 h-16 mx-auto rounded-lg flex items-center justify-center overflow-hidden mb-2"
                        style={{ backgroundColor: sticker.color + '20' }}
                      >
                        {sticker.image_uploaded ? (
                          <img
                            src={`/assets/stickers/kit-${kit.kit_number}/${sticker.full_id}.png`}
                            alt={sticker.name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        )}
                      </div>
                      <div className="text-sm font-medium text-gray-900 truncate">{sticker.name}</div>
                      {sticker.name_ja && (
                        <div className="text-xs text-gray-500 truncate">{sticker.name_ja}</div>
                      )}
                      {sticker.is_percussion === 1 && (
                        <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] bg-orange-100 text-orange-700 rounded">
                          Perc
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <StickerGrid
                  stickers={stickers}
                  kit={kit}
                  onUploadImage={handleUploadImage}
                  onUploadAudio={handleUploadAudio}
                  onSelectLibraryAudio={handleSelectLibraryAudio}
                  onEditSticker={handleEditSticker}
                  onDeleteSticker={(sticker) => setDeleteSticker(sticker)}
                />
              )}
            </div>
          </div>
        </div>

        {/* プレビュー（モバイルで後に表示、デスクトップで左側） */}
        <div className="lg:col-span-1 order-2 lg:order-1">
          <div className="bg-white shadow rounded-lg p-4 lg:sticky lg:top-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              プレビュー
            </h3>
            {kitId && stickers.length > 0 ? (
              <LayoutPreview
                kitId={kitId}
                stickers={stickers}
                kitColor={kit.color}
                kitNumber={kit.kit_number}
                kitName={kit.name_ja || kit.name}
                isEditable={canEditKit}
                onRegenerateThumbnail={canEditKit ? async () => {
                  await kitsApi.regenerateThumbnail(kitId);
                } : undefined}
              />
            ) : (
              <div className="flex items-center justify-center h-40 lg:h-64 text-gray-400">
                <div className="text-center">
                  <svg className="w-10 h-10 lg:w-12 lg:h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm">シールを追加すると<br />プレビューが表示されます</p>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* 下書きの場合のみ削除ボタン */}
      {!isPublished && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            このキットを削除
          </button>
        </div>
      )}

      {/* 公開確認モーダル */}
      {showPublishConfirm && kitId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-4 sm:px-6 py-3 sm:py-4 sticky top-0 z-10">
              <h3 className="text-base sm:text-lg font-semibold text-white">キットを公開しますか？</h3>
            </div>
            <div className="p-4 sm:p-6">
              {/* モバイル: 縦並び、デスクトップ: 横並び */}
              <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
                {/* プレビュー - モバイルではコンパクトに中央配置 */}
                <div className="flex justify-center lg:flex-shrink-0">
                  <div
                    className="lg:hidden flex justify-center"
                    style={{
                      width: '100%',
                      height: `${420 * 0.6}px`,
                    }}
                  >
                    <div
                      style={{
                        width: `${280 * 0.6}px`,
                        transform: 'scale(0.6)',
                        transformOrigin: 'top center',
                      }}
                    >
                      <LayoutPreview
                        kitId={kitId}
                        stickers={stickers}
                        kitColor={kit.color}
                        kitNumber={kit.kit_number}
                        kitName={kit.name_ja || kit.name}
                        isEditable={false}
                      />
                    </div>
                  </div>
                  <div className="hidden lg:block">
                    <LayoutPreview
                      kitId={kitId}
                      stickers={stickers}
                      kitColor={kit.color}
                      kitNumber={kit.kit_number}
                      kitName={kit.name_ja || kit.name}
                      isEditable={false}
                    />
                  </div>
                </div>

                {/* 確認内容 */}
                <div className="flex-1 min-w-0 text-center lg:text-left">
                  <div className="flex flex-col lg:flex-row items-center lg:items-start gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600">
                      <p className="font-semibold text-gray-900 mb-0.5 sm:mb-1">公開後は編集できません</p>
                      <p>公開すると編集・変更ができなくなります。</p>
                    </div>
                  </div>

                  {/* 音声フォールバック通知 */}
                  {stickersWithoutAudio.length > 0 && (
                    <div className="flex flex-col lg:flex-row items-center lg:items-start gap-2 sm:gap-3 mb-3 sm:mb-4 p-2 sm:p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                      </div>
                      <div className="text-xs sm:text-sm min-w-0">
                        <p className="font-semibold text-blue-800 mb-0.5 sm:mb-1">音声の自動割り当て</p>
                        <p className="text-blue-700">
                          音声未設定の{stickersWithoutAudio.length}個に自動割り当てされます。
                        </p>
                        <div className="mt-1 sm:mt-2 text-[10px] sm:text-xs text-blue-600 truncate">
                          対象: {stickersWithoutAudio.map(s => s.name).join('、')}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* レイアウト未配置シールの警告 */}
                  {stickersNotInLayout.length > 0 && (
                    <div className="flex flex-col lg:flex-row items-center lg:items-start gap-2 sm:gap-3 mb-3 sm:mb-4 p-2 sm:p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <div className="text-xs sm:text-sm min-w-0">
                        <p className="font-semibold text-orange-800 mb-0.5 sm:mb-1">レイアウト未配置のシール</p>
                        <p className="text-orange-700">
                          {stickersNotInLayout.length}個のシールがレイアウトに配置されていません。
                          <br />
                          <span className="text-[10px] sm:text-xs">配置されていないシールは公開後に表示されません。このまま続けますか？</span>
                        </p>
                        <div className="mt-1 sm:mt-2 text-[10px] sm:text-xs text-orange-600 truncate">
                          対象: {stickersNotInLayout.map(s => s.name).join('、')}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-gray-50 rounded-lg p-2 sm:p-3 mb-3 sm:mb-4">
                    <div className="text-xs sm:text-sm font-medium text-gray-700 mb-0.5 sm:mb-1">{kit.name}</div>
                    <div className="text-[10px] sm:text-xs text-gray-500">{stickers.length}個のシール</div>
                  </div>
                  <div className="flex items-center justify-center lg:justify-end gap-2 sm:gap-3">
                    <button
                      onClick={() => {
                        setShowPublishConfirm(false);
                        setPublishError('');
                        setStickersNotInLayout([]);
                      }}
                      disabled={isPublishing}
                      className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handlePublish}
                      disabled={isPublishing}
                      className="px-4 sm:px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg hover:from-emerald-600 hover:to-teal-600 shadow-md disabled:opacity-50 whitespace-nowrap"
                    >
                      {isPublishing ? '公開中...' : '公開'}
                    </button>
                  </div>

                  {/* 公開エラー表示 */}
                  {publishError && (
                    <div className="mt-3 sm:mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-xs sm:text-sm text-red-700">{publishError}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* フォールバック割り当て結果モーダル */}
      {fallbackAssignments && fallbackAssignments.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                音声が自動割り当てされました
              </h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                以下のシールにライブラリから音声が割り当てられました:
              </p>
              <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                {fallbackAssignments.map((assignment) => (
                  <div
                    key={assignment.stickerId}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <span className="text-sm font-medium text-gray-700">{assignment.stickerName}</span>
                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      {assignment.assignedSound}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setFallbackAssignments(null)}
                  className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg hover:from-blue-600 hover:to-indigo-600 shadow-md"
                >
                  確認しました
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* キット削除確認モーダル */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="bg-red-500 px-6 py-4">
              <h3 className="text-lg font-semibold text-white">キットを削除しますか？</h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                「{kit.name}」を削除します。この操作は取り消せません。
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleDeleteKit}
                  className="px-5 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700"
                >
                  削除する
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* シール追加モーダル（下書きの場合のみ） */}
      {showAddSticker && !isPublished && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            {/* ステップインジケーター */}
            <div className="flex items-center gap-2 mb-4">
              <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                addStickerStep === 1 ? 'bg-blue-600 text-white' : 'bg-green-500 text-white'
              }`}>
                {addStickerStep === 1 ? '1' : '✓'}
              </div>
              <div className={`flex-1 h-0.5 ${addStickerStep === 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
              <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                addStickerStep === 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                2
              </div>
            </div>

            {addStickerStep === 1 ? (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-4">シールを追加</h3>
                <form onSubmit={handleAddSticker} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">名前 *</label>
                    <input
                      type="text"
                      value={stickerForm.name}
                      onChange={(e) => setStickerForm({ ...stickerForm, name: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Bass"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">名前（日本語）</label>
                    <input
                      type="text"
                      value={stickerForm.nameJa}
                      onChange={(e) => setStickerForm({ ...stickerForm, nameJa: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="ベース"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">カラー</label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setStickerForm({ ...stickerForm, color: c })}
                          className={`w-6 h-6 rounded-full border-2 ${stickerForm.color === c ? 'border-blue-500' : 'border-gray-200'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                      <input
                        type="color"
                        value={stickerForm.color}
                        onChange={(e) => setStickerForm({ ...stickerForm, color: e.target.value })}
                        className="w-6 h-6 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                  {/* 音声タイプ選択 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">音声タイプ</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setStickerForm({ ...stickerForm, isPercussion: false })}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all ${
                          !stickerForm.isPercussion
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                        <span className="text-xs font-medium">メロディ</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setStickerForm({ ...stickerForm, isPercussion: true })}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all ${
                          stickerForm.isPercussion
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="3" strokeWidth={1.5} />
                          <circle cx="12" cy="12" r="8" strokeWidth={1.5} />
                          <path strokeLinecap="round" strokeWidth={1.5} d="M12 4v2M12 18v2M4 12h2M18 12h2" />
                        </svg>
                        <span className="text-xs font-medium">ドラム</span>
                      </button>
                    </div>
                    <p className="mt-1.5 text-xs text-gray-500">
                      {stickerForm.isPercussion
                        ? 'キーに関係なく同じ音が鳴ります'
                        : 'キットのキーに合わせて音程が調整されます'}
                    </p>
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={closeAddStickerModal}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      キャンセル
                    </button>
                    <button
                      type="submit"
                      disabled={isStickerSubmitting}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isStickerSubmitting ? '作成中...' : '次へ'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-4">画像をアップロード</h3>
                {newlyCreatedSticker && kit && (
                  <div className="space-y-4">
                    {/* シール情報表示 */}
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden"
                        style={{ backgroundColor: newlyCreatedSticker.color + '30' }}
                      >
                        {newlyCreatedSticker.image_uploaded ? (
                          <img
                            src={`/assets/stickers/kit-${kit.kit_number}/${newlyCreatedSticker.full_id}.png?t=${Date.now()}`}
                            alt={newlyCreatedSticker.name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <span className="text-xs text-gray-400">?</span>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{newlyCreatedSticker.name}</div>
                        {newlyCreatedSticker.name_ja && (
                          <div className="text-xs text-gray-500">{newlyCreatedSticker.name_ja}</div>
                        )}
                      </div>
                      {newlyCreatedSticker.image_uploaded && (
                        <div className="ml-auto flex items-center gap-1 text-green-600 text-xs">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          完了
                        </div>
                      )}
                    </div>

                    {/* 画像アップロードエリア */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">シール画像 *</label>
                      <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                        <div className="flex flex-col items-center justify-center py-4">
                          <svg className="w-8 h-8 mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <p className="text-sm text-gray-500">
                            <span className="font-semibold">クリックして画像を選択</span>
                          </p>
                          <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF</p>
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setNewStickerImageFile(file);
                          }}
                        />
                      </label>
                    </div>

                    {/* 完了ボタン（画像アップロード済みの場合のみ） */}
                    {newlyCreatedSticker.image_uploaded && (
                      <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.onchange = (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (file) setNewStickerImageFile(file);
                            };
                            input.click();
                          }}
                          className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
                        >
                          画像を変更
                        </button>
                        <button
                          type="button"
                          onClick={closeAddStickerModal}
                          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                        >
                          完了
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ImageCropperモーダル */}
                {newStickerImageFile && (
                  <ImageCropper
                    imageFile={newStickerImageFile}
                    onComplete={handleNewStickerCropComplete}
                    onCancel={() => setNewStickerImageFile(null)}
                    outputSize={512}
                  />
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* シール編集モーダル（下書きまたはadmin） */}
      {editingSticker && canEditStickers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">シールを編集</h3>
            <form onSubmit={handleUpdateSticker} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">名前 *</label>
                <input
                  type="text"
                  value={stickerForm.name}
                  onChange={(e) => setStickerForm({ ...stickerForm, name: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">名前（日本語）</label>
                <input
                  type="text"
                  value={stickerForm.nameJa}
                  onChange={(e) => setStickerForm({ ...stickerForm, nameJa: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">カラー</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setStickerForm({ ...stickerForm, color: c })}
                      className={`w-6 h-6 rounded-full border-2 ${stickerForm.color === c ? 'border-blue-500' : 'border-gray-200'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={stickerForm.color}
                    onChange={(e) => setStickerForm({ ...stickerForm, color: e.target.value })}
                    className="w-6 h-6 rounded cursor-pointer"
                  />
                </div>
              </div>
              {/* 音声タイプ選択 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">音声タイプ</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStickerForm({ ...stickerForm, isPercussion: false })}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all ${
                      !stickerForm.isPercussion
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                    <span className="text-xs font-medium">メロディ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStickerForm({ ...stickerForm, isPercussion: true })}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all ${
                      stickerForm.isPercussion
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="3" strokeWidth={1.5} />
                      <circle cx="12" cy="12" r="8" strokeWidth={1.5} />
                      <path strokeLinecap="round" strokeWidth={1.5} d="M12 4v2M12 18v2M4 12h2M18 12h2" />
                    </svg>
                    <span className="text-xs font-medium">ドラム</span>
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-gray-500">
                  {stickerForm.isPercussion
                    ? 'キーに関係なく同じ音が鳴ります'
                    : 'キットのキーに合わせて音程が調整されます'}
                </p>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setEditingSticker(null);
                    setStickerForm({ name: '', nameJa: '', color: '#CCCCCC', isPercussion: false });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isStickerSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isStickerSubmitting ? '更新中...' : '更新'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* シール削除確認モーダル（下書きの場合のみ） */}
      {deleteSticker && !isPublished && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900">シールを削除</h3>
            <p className="mt-2 text-sm text-gray-500">
              「{deleteSticker.name}」を削除してもよろしいですか？この操作は取り消せません。
            </p>
            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteSticker(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={isStickerSubmitting}
              >
                キャンセル
              </button>
              <button
                onClick={handleDeleteSticker}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                disabled={isStickerSubmitting}
              >
                {isStickerSubmitting ? '削除中...' : '削除する'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
