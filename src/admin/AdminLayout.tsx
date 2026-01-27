import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth';

export const AdminLayout = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  const navLinkClass = (path: string) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive(path)
        ? 'bg-red-100 text-red-700'
        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
    }`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-3 sm:py-0 sm:h-16 gap-2 sm:gap-0">
            {/* 左側: タイトルとナビゲーション */}
            <div className="flex items-center gap-4">
              <span className="text-base sm:text-xl font-bold text-red-600">
                Admin
              </span>
              <nav className="flex items-center gap-1">
                <Link to="/admin" className={navLinkClass('/admin')}>
                  ダッシュボード
                </Link>
                <Link to="/admin/users" className={navLinkClass('/admin/users')}>
                  ユーザー
                </Link>
                <Link to="/admin/kits" className={navLinkClass('/admin/kits')}>
                  キット
                </Link>
                <Link to="/admin/tags" className={navLinkClass('/admin/tags')}>
                  タグ
                </Link>
              </nav>
            </div>

            {/* 右側: ユーザー情報 */}
            {isAuthenticated && (
              <div className="flex items-center gap-3 sm:gap-4">
                <Link to="/" className="text-xs sm:text-sm text-gray-500 hover:text-gray-700">
                  シール帳に戻る
                </Link>
                <span className="text-gray-300">|</span>
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
