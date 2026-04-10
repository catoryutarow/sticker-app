import { useState, useEffect } from 'react';
import { backgroundsApi, Background } from '@/api/backgroundsApi';
import { kitsApi, Kit } from '@/api/kitsApi';
import { useBackgroundData } from '@/config/BackgroundDataContext';
import { getBackgroundImagePath } from '@/config/backgroundConfig';

const LEGACY_IDS = new Set(['default', 'panel', 'p0436']);

export const AdminBackgroundsPage = () => {
  const { reload: reloadBackgroundContext } = useBackgroundData();
  const [backgrounds, setBackgrounds] = useState<Background[]>([]);
  const [kits, setKits] = useState<Kit[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload form state
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [nameJa, setNameJa] = useState('');
  const [isSpecial, setIsSpecial] = useState(false);
  const [specialKitId, setSpecialKitId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bgResult, kitResult] = await Promise.all([
        backgroundsApi.getBackgrounds(),
        kitsApi.getKits(),
      ]);
      setBackgrounds(bgResult.backgrounds);
      setKits(kitResult.kits);
    } catch (e) {
      console.error('Failed to load:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const specialKits = kits.filter((k) => k.is_special === 1);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !name) {
      setError('画像と名前は必須です');
      return;
    }
    if (isSpecial && !specialKitId) {
      setError('スペシャル台紙にはスペシャルキットの指定が必要です');
      return;
    }
    setError(null);
    setUploading(true);
    try {
      await backgroundsApi.uploadBackground(file, {
        name,
        nameJa: nameJa || undefined,
        isSpecial,
        specialKitId: isSpecial ? specialKitId : undefined,
      });
      // Reset form
      setFile(null);
      setName('');
      setNameJa('');
      setIsSpecial(false);
      setSpecialKitId('');
      // Reload both local list and global context
      await loadData();
      await reloadBackgroundContext();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'アップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (bg: Background) => {
    if (LEGACY_IDS.has(bg.id)) return;
    if (!confirm(`「${bg.name}」を削除しますか？`)) return;
    try {
      await backgroundsApi.deleteBackground(bg.id);
      await loadData();
      await reloadBackgroundContext();
    } catch (e) {
      console.error('Delete failed:', e);
      alert(e instanceof Error ? e.message : '削除に失敗しました');
    }
  };

  const getKitName = (kitUuid: string | null): string => {
    if (!kitUuid) return '';
    const kit = kits.find((k) => k.id === kitUuid);
    return kit?.name || '(unknown)';
  };

  if (loading) {
    return <div className="p-6">読み込み中...</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">台紙管理</h1>

      {/* Upload form */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          新しい台紙をアップロード
        </h2>
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              画像ファイル
            </label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                名前 (英語)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                名前 (日本語)
              </label>
              <input
                type="text"
                value={nameJa}
                onChange={(e) => setNameJa(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isSpecial}
                onChange={(e) => setIsSpecial(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
            <span className="text-sm font-medium text-gray-900">
              スペシャル台紙
            </span>
          </div>
          {isSpecial && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                紐付けるスペシャルキット
              </label>
              <select
                value={specialKitId}
                onChange={(e) => setSpecialKitId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">選択してください</option>
                {specialKits.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name} ({k.kit_number})
                  </option>
                ))}
              </select>
              {specialKits.length === 0 && (
                <p className="mt-1 text-xs text-red-500">
                  スペシャルキットがありません。先にスペシャルキットを作成してください。
                </p>
              )}
            </div>
          )}
          {error && <div className="text-sm text-red-600">{error}</div>}
          <button
            type="submit"
            disabled={uploading}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? 'アップロード中...' : 'アップロード'}
          </button>
        </form>
      </div>

      {/* List */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          台紙一覧 ({backgrounds.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {backgrounds.map((bg) => {
            const isLegacy = LEGACY_IDS.has(bg.id);
            return (
              <div
                key={bg.id}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                <div className="aspect-video bg-gray-100 overflow-hidden">
                  <img
                    src={getBackgroundImagePath(bg.id)}
                    alt={bg.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {bg.name}
                      </p>
                      {bg.name_ja && (
                        <p className="text-xs text-gray-500 truncate">
                          {bg.name_ja}
                        </p>
                      )}
                    </div>
                    {bg.is_special === 1 && (
                      <span className="flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold">
                        ★ SPECIAL
                      </span>
                    )}
                  </div>
                  {bg.is_special === 1 && bg.special_kit_id && (
                    <p className="text-xs text-gray-500 mb-2 truncate">
                      キット: {getKitName(bg.special_kit_id)}
                    </p>
                  )}
                  <button
                    onClick={() => handleDelete(bg)}
                    disabled={isLegacy}
                    title={
                      isLegacy ? 'デフォルト台紙は削除できません' : '削除'
                    }
                    className="w-full px-3 py-1.5 text-xs font-medium rounded-lg text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    削除
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
