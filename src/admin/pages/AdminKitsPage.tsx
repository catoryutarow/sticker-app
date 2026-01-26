import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, type AdminKit, type Pagination } from '../api/adminApi';

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

export const AdminKitsPage = () => {
  const [kits, setKits] = useState<AdminKit[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadKits = useCallback(async (page = 1, search = searchQuery, status = statusFilter) => {
    setIsLoading(true);
    try {
      const response = await adminApi.getKits({ page, search, status, limit: 20 });
      setKits(response.kits);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Failed to load kits:', error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    loadKits();
  }, [loadKits]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    loadKits(1, searchInput, statusFilter);
  };

  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    loadKits(1, searchQuery, status);
  };

  const handleDelete = async (kit: AdminKit) => {
    if (!confirm(`「${kit.name}」を削除しますか？この操作は取り消せません。`)) {
      return;
    }
    try {
      await adminApi.deleteKit(kit.id);
      setKits(prev => prev.filter(k => k.id !== kit.id));
    } catch (error) {
      console.error('Failed to delete kit:', error);
      alert('削除に失敗しました');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">キット管理</h1>

        <div className="flex flex-wrap items-center gap-2">
          {/* ステータスフィルター */}
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">すべて</option>
            <option value="draft">下書き</option>
            <option value="published">公開中</option>
          </select>

          {/* 検索フォーム */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="キット名で検索..."
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              検索
            </button>
          </form>

          {/* 新規作成ボタン */}
          <Link
            to="/admin/kits/new"
            className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新規作成
          </Link>
        </div>
      </div>

      {/* キットテーブル */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-600">読み込み中...</span>
            </div>
          </div>
        ) : kits.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">キットが見つかりません</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    キット
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    クリエイター
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    シール
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    作成日
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {kits.map((kit) => (
                  <tr key={kit.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex-shrink-0"
                          style={{ backgroundColor: kit.color }}
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {kit.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            kit-{kit.kit_number} • {formatMusicalKey(kit.musical_key)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {kit.creator_name || '-'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {kit.creator_email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        kit.status === 'published'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {kit.status === 'published' ? '公開' : '下書き'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {kit.sticker_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(kit.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        to={`/admin/kits/${kit.id}`}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        詳細
                      </Link>
                      <button
                        onClick={() => handleDelete(kit)}
                        className="text-red-600 hover:text-red-900"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ページネーション */}
        {pagination && pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => loadKits(pagination.page - 1)}
                disabled={!pagination.hasPrev}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                前へ
              </button>
              <button
                onClick={() => loadKits(pagination.page + 1)}
                disabled={!pagination.hasNext}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                次へ
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">{pagination.total}</span> 件中{' '}
                  <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span>
                  -
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span>{' '}
                  件を表示
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => loadKits(pagination.page - 1)}
                  disabled={!pagination.hasPrev}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  前へ
                </button>
                <button
                  onClick={() => loadKits(pagination.page + 1)}
                  disabled={!pagination.hasNext}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  次へ
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
