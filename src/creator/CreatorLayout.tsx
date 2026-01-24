import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth';

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="text-gray-500 hover:text-gray-700 text-sm">
                ← シール帳に戻る
              </Link>
              <span className="text-gray-300">|</span>
              <Link to="/creator" className="text-xl font-bold text-gray-900">
                クリエイターダッシュボード
              </Link>
            </div>

            {isAuthenticated && (
              <div className="flex items-center gap-4">
                <span className="text-gray-600">
                  {user?.displayName || user?.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
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
