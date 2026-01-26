import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { adminApi, type AdminUser, type AdminKit } from '../api/adminApi';

export const UserDetailPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [kits, setKits] = useState<AdminKit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      if (!userId) return;

      try {
        const response = await adminApi.getUser(userId);
        setUser(response.user);
        setKits(response.kits);
      } catch (err) {
        console.error('Failed to load user:', err);
        setError('ユーザーが見つかりませんでした');
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, [userId]);

  const handleDeleteUser = async () => {
    if (!user) return;

    if (!confirm(`「${user.display_name || user.email}」を削除しますか？\n関連するキットもすべて削除されます。この操作は取り消せません。`)) {
      return;
    }

    try {
      await adminApi.deleteUser(user.id);
      navigate('/admin/users');
    } catch (err) {
      console.error('Failed to delete user:', err);
      alert('削除に失敗しました');
    }
  };

  const handleDeleteKit = async (kit: AdminKit) => {
    if (!confirm(`キット「${kit.name}」を削除しますか？この操作は取り消せません。`)) {
      return;
    }

    try {
      await adminApi.deleteKit(kit.id);
      setKits(prev => prev.filter(k => k.id !== kit.id));
    } catch (err) {
      console.error('Failed to delete kit:', err);
      alert('削除に失敗しました');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600">読み込み中...</span>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error || 'ユーザーが見つかりません'}</p>
        <Link to="/admin/users" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
          ← ユーザー一覧に戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/admin/users"
            className="text-gray-500 hover:text-gray-700"
          >
            ← 戻る
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">ユーザー詳細</h1>
        </div>
        {user.role !== 'admin' && (
          <button
            onClick={handleDeleteUser}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
          >
            ユーザーを削除
          </button>
        )}
      </div>

      {/* ユーザー情報 */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">基本情報</h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">ID</dt>
            <dd className="mt-1 text-sm text-gray-900 font-mono">{user.id}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">メールアドレス</dt>
            <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">表示名</dt>
            <dd className="mt-1 text-sm text-gray-900">{user.display_name || '-'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">ロール</dt>
            <dd className="mt-1">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                user.role === 'admin'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {user.role}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">登録日時</dt>
            <dd className="mt-1 text-sm text-gray-900">{formatDate(user.created_at)}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">最終更新</dt>
            <dd className="mt-1 text-sm text-gray-900">{formatDate(user.updated_at)}</dd>
          </div>
        </dl>
      </div>

      {/* 投稿キット一覧 */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          投稿キット ({kits.length}件)
        </h2>

        {kits.length === 0 ? (
          <p className="text-gray-500">まだキットがありません</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    キット
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    ステータス
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    シール数
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    作成日
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {kits.map((kit) => (
                  <tr key={kit.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded"
                          style={{ backgroundColor: kit.color }}
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {kit.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            kit-{kit.kit_number}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        kit.status === 'published'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {kit.status === 'published' ? '公開' : '下書き'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      {kit.sticker_count}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      {formatDate(kit.created_at)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Link
                        to={`/admin/kits/${kit.id}`}
                        className="text-blue-600 hover:text-blue-900 text-sm mr-4"
                      >
                        詳細
                      </Link>
                      <button
                        onClick={() => handleDeleteKit(kit)}
                        className="text-red-600 hover:text-red-900 text-sm"
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
    </div>
  );
};
