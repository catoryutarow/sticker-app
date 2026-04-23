import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Home, Music, FileText, Mail, Shield } from 'lucide-react';

export function NotFoundPage() {
  return (
    <>
      <Helmet>
        <title>ページが見つかりません | シール帳</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center px-3 sm:px-4 py-10">
        <div className="text-center max-w-md w-full">
          <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
            <Music className="w-10 h-10 sm:w-12 sm:h-12 text-white" aria-hidden="true" />
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-2 tracking-tight">
            404
          </h1>
          <h2 className="text-lg sm:text-xl font-bold text-gray-700 mb-3">
            ページが見つかりません
          </h2>
          <p className="text-sm sm:text-base text-gray-600 mb-8 leading-relaxed">
            お探しのページは存在しないか、移動した可能性があります。
          </p>

          <div className="space-y-3">
            <Link
              to="/"
              className="flex items-center justify-center gap-2 w-full py-3 px-6 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.99]"
            >
              <Home className="w-5 h-5" aria-hidden="true" />
              トップページへ
            </Link>

            <p className="text-sm text-gray-500 pt-1">
              音楽シールで楽曲を作ってみませんか？
            </p>
          </div>

          <div className="mt-10 pt-6 border-t border-gray-200/70">
            <p className="text-xs uppercase tracking-wider text-gray-400 mb-3">
              他のページを探す
            </p>
            <div className="grid grid-cols-3 gap-2">
              <Link
                to="/about"
                className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-white/60 border border-gray-200 hover:border-indigo-300 hover:bg-white transition-colors"
              >
                <Music className="w-4 h-4 text-indigo-500" aria-hidden="true" />
                <span className="text-xs font-medium text-gray-700">サービス紹介</span>
              </Link>
              <Link
                to="/contact"
                className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-white/60 border border-gray-200 hover:border-indigo-300 hover:bg-white transition-colors"
              >
                <Mail className="w-4 h-4 text-indigo-500" aria-hidden="true" />
                <span className="text-xs font-medium text-gray-700">お問い合わせ</span>
              </Link>
              <Link
                to="/terms"
                className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-white/60 border border-gray-200 hover:border-indigo-300 hover:bg-white transition-colors"
              >
                <FileText className="w-4 h-4 text-indigo-500" aria-hidden="true" />
                <span className="text-xs font-medium text-gray-700">利用規約</span>
              </Link>
            </div>
            <Link
              to="/privacy"
              className="inline-flex items-center gap-1.5 mt-3 text-xs text-gray-500 hover:text-indigo-600"
            >
              <Shield className="w-3.5 h-3.5" aria-hidden="true" />
              プライバシーポリシー
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
