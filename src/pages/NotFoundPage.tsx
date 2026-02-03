import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Home, Music } from 'lucide-react';

export function NotFoundPage() {
  return (
    <>
      <Helmet>
        <title>ページが見つかりません | シルチョ</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center">
            <Music className="w-12 h-12 text-white" />
          </div>

          <h1 className="text-6xl font-bold text-gray-900 mb-2">404</h1>
          <h2 className="text-xl font-bold text-gray-700 mb-4">
            ページが見つかりません
          </h2>
          <p className="text-gray-600 mb-8">
            お探しのページは存在しないか、移動した可能性があります。
          </p>

          <div className="space-y-3">
            <Link
              to="/"
              className="flex items-center justify-center gap-2 w-full py-3 px-6 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
            >
              <Home className="w-5 h-5" />
              トップページへ
            </Link>

            <p className="text-sm text-gray-500">
              音楽シールで楽曲を作ってみませんか？
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
