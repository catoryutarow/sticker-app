import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { kitsApi, type Kit } from '@/api/kitsApi';
import { KitCard } from '../components/KitCard';

type StatusFilter = 'all' | 'published' | 'draft';
type SortOption = 'created_desc' | 'created_asc' | 'name_asc' | 'name_desc';

export const KitsPage = () => {
  const { t } = useTranslation();
  const [kits, setKits] = useState<Kit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<Kit | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // フィルター・検索・ソート
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('created_desc');

  const loadKits = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await kitsApi.getKits();
      setKits(response.kits);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('kits.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadKits();
  }, []);

  const handleDelete = async (kit: Kit) => {
    setDeleteConfirm(kit);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    try {
      setIsDeleting(true);
      await kitsApi.deleteKit(deleteConfirm.id);
      setKits(kits.filter(k => k.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('kits.deleteFailed'));
    } finally {
      setIsDeleting(false);
    }
  };

  // フィルタリング・ソート処理
  const filteredKits = kits
    .filter(kit => {
      // ステータスフィルター
      if (statusFilter !== 'all' && kit.status !== statusFilter) return false;

      // 検索フィルター
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          kit.name.toLowerCase().includes(query) ||
          (kit.name_ja?.toLowerCase().includes(query)) ||
          (kit.description?.toLowerCase().includes(query))
        );
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortOption) {
        case 'created_asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'created_desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'name_asc':
          return a.name.localeCompare(b.name, 'ja');
        case 'name_desc':
          return b.name.localeCompare(a.name, 'ja');
        default:
          return 0;
      }
    });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('kits.title')}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {t('kits.description')}
          </p>
        </div>
        <Link
          to="/creator/kits/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('kits.createNew')}
        </Link>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
          <button onClick={() => setError('')} className="float-right text-red-400 hover:text-red-600">&times;</button>
        </div>
      )}

      {/* 検索・フィルターバー */}
      {kits.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow flex flex-wrap items-center gap-4">
          {/* 検索ボックス */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('kits.searchPlaceholder')}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* ステータスフィルター */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{t('kits.status')}:</span>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              {[
                { value: 'all', label: t('kits.statusAll') },
                { value: 'published', label: t('kits.statusPublished') },
                { value: 'draft', label: t('kits.statusDraft') },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setStatusFilter(value as StatusFilter)}
                  className={`px-3 py-1.5 text-sm ${
                    statusFilter === value
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* ソート */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{t('kits.sortBy')}:</span>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="created_desc">{t('dashboard.sortNewest')}</option>
              <option value="created_asc">{t('dashboard.sortOldest')}</option>
              <option value="name_asc">{t('dashboard.sortNameAZ')}</option>
              <option value="name_desc">{t('dashboard.sortNameZA')}</option>
            </select>
          </div>

          {/* 結果カウント */}
          <div className="text-sm text-gray-500">
            {filteredKits.length} / {kits.length} {t('common.items')}
          </div>
        </div>
      )}

      {/* キット一覧 */}
      {kits.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">{t('kits.noKits')}</h3>
          <p className="mt-1 text-sm text-gray-500">
            {t('kits.noKitsDesc')}
          </p>
          <div className="mt-6">
            <Link
              to="/creator/kits/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('dashboard.createFirst')}
            </Link>
          </div>
        </div>
      ) : filteredKits.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">{t('kits.noResults')}</h3>
          <p className="mt-1 text-sm text-gray-500">
            {t('kitFinder.changeSearch')}
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
            }}
            className="mt-4 text-sm text-blue-600 hover:text-blue-700"
          >
            {t('kits.resetFilter')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredKits.map((kit) => (
            <KitCard
              key={kit.id}
              kit={kit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* 削除確認モーダル */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900">{t('kits.deleteTitle')}</h3>
            <p className="mt-2 text-sm text-gray-500">
              {t('kits.deleteConfirm', { name: deleteConfirm.name })}
            </p>
            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={isDeleting}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                disabled={isDeleting}
              >
                {isDeleting ? t('kits.deleting') : t('kits.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
