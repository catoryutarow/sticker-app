import { useAuth } from '@/auth';

export const DashboardPage = () => {
  const { user } = useAuth();

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
          <div className="mt-2 text-3xl font-bold text-gray-900">0</div>
          <div className="mt-1 text-sm text-gray-500">Coming soon</div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-sm font-medium text-gray-500">公開中のシール</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">0</div>
          <div className="mt-1 text-sm text-gray-500">Coming soon</div>
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
          <button
            disabled
            className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg text-gray-400 bg-gray-50 cursor-not-allowed"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新しいキットを作成（準備中）
          </button>

          <button
            disabled
            className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg text-gray-400 bg-gray-50 cursor-not-allowed"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            キット一覧を見る（準備中）
          </button>
        </div>
      </div>

      {/* お知らせ */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-lg font-medium text-blue-900 mb-2">開発中の機能</h2>
        <ul className="list-disc list-inside text-blue-800 space-y-1">
          <li>シールキットの作成・編集</li>
          <li>シール画像のアップロード</li>
          <li>オーディオファイルの設定</li>
          <li>キットの公開・非公開設定</li>
        </ul>
        <p className="mt-3 text-sm text-blue-700">
          これらの機能は今後のアップデートで追加予定です。
        </p>
      </div>
    </div>
  );
};
