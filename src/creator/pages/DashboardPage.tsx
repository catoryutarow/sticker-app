import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/auth';
import { kitsApi, type Kit } from '@/api/kitsApi';

export const DashboardPage = () => {
  const { user } = useAuth();
  const [kits, setKits] = useState<Kit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadKits = async () => {
      try {
        const response = await kitsApi.getKits();
        setKits(response.kits);
      } catch {
        // エラーは無視してデフォルト値を使用
      } finally {
        setIsLoading(false);
      }
    };
    loadKits();
  }, []);

  const totalStickers = kits.reduce((sum, kit) => sum + (kit.sticker_count || 0), 0);
  const publishedKits = kits.filter(kit => kit.status === 'published');

  return (
    <div className="space-y-6">
      {/* ウェルカムセクション */}
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          ようこそ、{user?.displayName || user?.email}さん
        </h1>
        <p className="mt-2 text-gray-600">
          クリエイターダッシュボードへようこそ。ここからシールキットの作成・管理ができます。
        </p>
      </div>

      {/* スタッツカード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-sm font-medium text-gray-500">作成したキット</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            {isLoading ? '-' : kits.length}
          </div>
          <div className="mt-1 text-sm text-gray-500">
            {publishedKits.length} 公開中
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-sm font-medium text-gray-500">シール数</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            {isLoading ? '-' : totalStickers}
          </div>
          <div className="mt-1 text-sm text-gray-500">
            全キット合計
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-sm font-medium text-gray-500">総ダウンロード数</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">0</div>
          <div className="mt-1 text-sm text-gray-500">Coming soon</div>
        </div>
      </div>

      {/* クイックアクション */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">クイックアクション</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            to="/creator/kits/new"
            className="flex items-center justify-center px-4 py-3 border border-blue-300 rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新しいキットを作成
          </Link>

          <Link
            to="/creator/kits"
            className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            キット一覧を見る
          </Link>
        </div>
      </div>

      {/* 最近のキット */}
      {kits.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">最近のキット</h2>
            <Link to="/creator/kits" className="text-sm text-blue-600 hover:text-blue-700">
              すべて見る
            </Link>
          </div>
          <div className="space-y-3">
            {kits.slice(0, 3).map((kit) => (
              <Link
                key={kit.id}
                to={`/creator/kits/${kit.id}`}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: kit.color }}
                  />
                  <div>
                    <div className="font-medium text-gray-900">{kit.name}</div>
                    <div className="text-sm text-gray-500">
                      {kit.sticker_count || 0} シール
                    </div>
                  </div>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded ${
                    kit.status === 'published'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {kit.status === 'published' ? '公開中' : '下書き'}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ヒント */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-lg font-medium text-blue-900 mb-2">はじめ方</h2>
        <ol className="list-decimal list-inside text-blue-800 space-y-1">
          <li>「新しいキットを作成」をクリックしてキットを作成</li>
          <li>キット詳細ページでシールを追加</li>
          <li>各シールに画像と音声ファイルをアップロード</li>
          <li>準備ができたらキットを「公開」に設定</li>
        </ol>
      </div>
    </div>
  );
};
