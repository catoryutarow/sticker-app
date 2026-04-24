import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative z-10 bg-white/80 backdrop-blur-sm border-t border-gray-200 py-10 px-4 mt-16">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <img src="/logo.png" alt="シール帳 ロゴ" className="w-8 h-8" />
          <div>
            <div className="font-bold text-gray-900 leading-tight">シール帳</div>
            <div className="text-xs text-gray-500">音楽シールで楽曲を作る無料Webアプリ</div>
          </div>
        </div>

        <nav
          aria-label="フッターナビゲーション"
          className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-sm"
        >
          <div>
            <h3 className="font-bold text-gray-900 mb-2">サービス</h3>
            <ul className="space-y-1.5">
              <li>
                <Link to="/" className="text-gray-600 hover:text-indigo-600">
                  トップ
                </Link>
              </li>
              <li>
                <Link to="/articles" className="text-gray-600 hover:text-indigo-600">
                  ブログ
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-gray-900 mb-2">情報</h3>
            <ul className="space-y-1.5">
              <li>
                <Link to="/about" className="text-gray-600 hover:text-indigo-600">
                  このアプリについて
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-gray-600 hover:text-indigo-600">
                  お問い合わせ
                </Link>
              </li>
            </ul>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <h3 className="font-bold text-gray-900 mb-2">運営</h3>
            <ul className="space-y-1.5">
              <li>
                <a
                  href="https://motechoro.jp/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-gray-600 hover:text-indigo-600"
                >
                  株式会社モテコロ
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>
              </li>
              <li>
                <Link to="/terms" className="text-gray-600 hover:text-indigo-600">
                  利用規約
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-gray-600 hover:text-indigo-600">
                  プライバシーポリシー
                </Link>
              </li>
            </ul>
          </div>
        </nav>

        <div className="mt-8 pt-5 border-t border-gray-100 text-xs text-gray-500 text-center">
          © {year} 株式会社モテコロ All rights reserved.
        </div>
      </div>
    </footer>
  );
}
