import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth';

// 自動保存バッジ（編集画面でのみ表示）
const AutoSaveBadge = () => {
  const location = useLocation();

  // 編集画面でのみ表示
  const isEditPage = /^\/creator\/kits\/[^/]+$/.test(location.pathname) &&
                     !location.pathname.endsWith('/new');

  if (!isEditPage) return null;

  return (
    <div className="flex items-center gap-1 text-xs text-gray-400">
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      <span>自動保存</span>
    </div>
  );
};

export const CreatorLayout = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/creator/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          {/* モバイル: 2行、デスクトップ: 1行 */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-3 sm:py-0 sm:h-16 gap-2 sm:gap-0">
            {/* 上段/左側: タイトルとナビゲーション */}
            <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-4">
              <span className="text-base sm:text-xl font-bold text-gray-900 truncate">
                クリエイター
              </span>
              <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                <Link
                  to="/creator"
                  className="text-gray-500 hover:text-gray-700 whitespace-nowrap"
                >
                  ダッシュボード
                </Link>
                <span className="text-gray-300">|</span>
                <Link to="/" className="text-gray-500 hover:text-gray-700 whitespace-nowrap">
                  シール帳に戻る
                </Link>
                {user?.role === 'admin' && (
                  <>
                    <span className="text-gray-300">|</span>
                    <Link to="/admin" className="text-red-600 hover:text-red-700 whitespace-nowrap font-medium">
                      管理者ページ
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* 下段/右側: 自動保存バッジ + ユーザー情報 */}
            {isAuthenticated && (
              <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                <AutoSaveBadge />
                <span className="text-xs sm:text-sm text-gray-600 truncate max-w-[120px] sm:max-w-none">
                  {user?.displayName || user?.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors whitespace-nowrap"
                >
                  ログアウト
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
};
