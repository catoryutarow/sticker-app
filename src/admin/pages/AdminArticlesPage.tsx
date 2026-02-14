import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, type AdminArticle, type Pagination } from '../api/adminApi';

export const AdminArticlesPage = () => {
  const [articles, setArticles] = useState<AdminArticle[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadArticles = useCallback(async (page = 1, search = searchQuery, status = statusFilter) => {
    setIsLoading(true);
    try {
      const response = await adminApi.getArticles({ page, search, status, limit: 20 });
      setArticles(response.articles);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Failed to load articles:', error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    loadArticles(1, searchInput, statusFilter);
  };

  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    loadArticles(1, searchQuery, status);
  };

  const handleDelete = async (article: AdminArticle) => {
    if (!confirm(`「${article.title}」を削除しますか？この操作は取り消せません。`)) {
      return;
    }
    try {
      await adminApi.deleteArticle(article.id);
      setArticles(prev => prev.filter(a => a.id !== article.id));
    } catch (error) {
      console.error('Failed to delete article:', error);
      alert('削除に失敗しました');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">記事管理</h1>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">すべて</option>
            <option value="draft">下書き</option>
            <option value="published">公開中</option>
          </select>

          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="タイトルで検索..."
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              検索
            </button>
          </form>

          <Link
            to="/admin/articles/new"
            className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新規作成
          </Link>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-600">読み込み中...</span>
            </div>
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            記事がありません
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    タイトル
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    公開日
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
                {articles.map((article) => (
                  <tr key={article.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <Link
                        to={`/admin/articles/${article.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        {article.title}
                      </Link>
                      <p className="text-xs text-gray-400 mt-0.5">/{article.slug}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                          article.status === 'published'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {article.status === 'published' ? '公開中' : '下書き'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(article.published_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(article.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <Link
                        to={`/admin/articles/${article.id}`}
                        className="text-blue-600 hover:text-blue-800 mr-4"
                      >
                        編集
                      </Link>
                      <button
                        onClick={() => handleDelete(article)}
                        className="text-red-600 hover:text-red-800"
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
      </div>

      {/* ページネーション */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => loadArticles(pagination.page - 1)}
            disabled={!pagination.hasPrev}
            className="px-4 py-2 border rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50"
          >
            前へ
          </button>
          <span className="px-4 py-2 text-sm text-gray-600">
            {pagination.page} / {pagination.totalPages}
          </span>
          <button
            onClick={() => loadArticles(pagination.page + 1)}
            disabled={!pagination.hasNext}
            className="px-4 py-2 border rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50"
          >
            次へ
          </button>
        </div>
      )}
    </div>
  );
};
