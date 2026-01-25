import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { kitsApi, type Kit, type Sticker, type UpdateKitRequest, type CreateStickerRequest, type UpdateStickerRequest } from '@/api/kitsApi';
import { KitForm } from '../components/KitForm';
import { StickerGrid } from '../components/StickerGrid';

export const KitDetailPage = () => {
  const { kitId } = useParams<{ kitId: string }>();
  const navigate = useNavigate();

  const [kit, setKit] = useState<Kit | null>(null);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [isEditingKit, setIsEditingKit] = useState(false);
  const [isKitSubmitting, setIsKitSubmitting] = useState(false);

  const [showAddSticker, setShowAddSticker] = useState(false);
  const [editingSticker, setEditingSticker] = useState<Sticker | null>(null);
  const [deleteSticker, setDeleteSticker] = useState<Sticker | null>(null);

  const [stickerForm, setStickerForm] = useState({ name: '', nameJa: '', color: '#CCCCCC', isPercussion: false });
  const [isStickerSubmitting, setIsStickerSubmitting] = useState(false);

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
    if (!kitId || !kit) return;

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
    if (!kitId || !stickerForm.name.trim()) return;

    setIsStickerSubmitting(true);
    try {
      const response = await kitsApi.createSticker(kitId, {
        name: stickerForm.name.trim(),
        nameJa: stickerForm.nameJa.trim() || undefined,
        color: stickerForm.color,
        isPercussion: stickerForm.isPercussion,
      });
      setStickers([...stickers, response.sticker]);
      setStickerForm({ name: '', nameJa: '', color: '#CCCCCC', isPercussion: false });
      setShowAddSticker(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'シールの追加に失敗しました');
    } finally {
      setIsStickerSubmitting(false);
    }
  };

  const handleEditSticker = (sticker: Sticker) => {
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
    if (!kitId || !editingSticker) return;

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
    if (!kitId || !deleteSticker) return;

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
    if (!kitId) return;
    const response = await kitsApi.uploadStickerImage(kitId, sticker.id, file);
    setStickers(stickers.map(s => s.id === sticker.id ? response.sticker : s));
  };

  const handleUploadAudio = async (sticker: Sticker, file: File) => {
    if (!kitId) return;
    const response = await kitsApi.uploadStickerAudio(kitId, sticker.id, file);
    setStickers(stickers.map(s => s.id === sticker.id ? response.sticker : s));
  };

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
        <Link to="/creator/kits" className="mt-4 text-blue-600 hover:text-blue-700">
          キット一覧に戻る
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
        <Link to="/creator/kits" className="hover:text-gray-700">キット一覧</Link>
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

      {/* キット情報カード */}
      <div className="bg-white shadow rounded-lg overflow-hidden" style={{ borderTop: `4px solid ${kit.color}` }}>
        {isEditingKit ? (
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
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-gray-900">{kit.name}</h1>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      kit.status === 'published'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {kit.status === 'published' ? '公開中' : '下書き'}
                  </span>
                </div>
                {kit.name_ja && (
                  <p className="mt-1 text-gray-500">{kit.name_ja}</p>
                )}
                <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                  <span className="font-mono">#{kit.kit_number}</span>
                  <span>キー: {kit.musical_key}</span>
                </div>
                {kit.description && (
                  <p className="mt-3 text-gray-600">{kit.description}</p>
                )}
              </div>
              <button
                onClick={() => setIsEditingKit(true)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                編集
              </button>
            </div>
          </div>
        )}
      </div>

      {/* シールセクション */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">シール ({stickers.length})</h2>
          <button
            onClick={() => setShowAddSticker(true)}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            シールを追加
          </button>
        </div>
        <div className="p-6">
          <StickerGrid
            stickers={stickers}
            kit={kit}
            onUploadImage={handleUploadImage}
            onUploadAudio={handleUploadAudio}
            onEditSticker={handleEditSticker}
            onDeleteSticker={(sticker) => setDeleteSticker(sticker)}
          />
        </div>
      </div>

      {/* シール追加モーダル */}
      {showAddSticker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
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
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={stickerForm.isPercussion}
                    onChange={(e) => setStickerForm({ ...stickerForm, isPercussion: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">パーカッション</span>
                </label>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddSticker(false);
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
                  {isStickerSubmitting ? '追加中...' : '追加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* シール編集モーダル */}
      {editingSticker && (
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
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={stickerForm.isPercussion}
                    onChange={(e) => setStickerForm({ ...stickerForm, isPercussion: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">パーカッション</span>
                </label>
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

      {/* シール削除確認モーダル */}
      {deleteSticker && (
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
