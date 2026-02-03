import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft } from 'lucide-react';

export function PrivacyPage() {
  return (
    <>
      <Helmet>
        <title>プライバシーポリシー | シール帳</title>
        <meta name="description" content="シール帳のプライバシーポリシー。個人情報の取り扱い、Cookie、広告について説明します。" />
        <link rel="canonical" href="https://sirucho.com/privacy" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            トップページへ戻る
          </Link>

          <article className="bg-white rounded-2xl shadow-lg p-6 md:p-10">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">
              プライバシーポリシー
            </h1>

            <div className="prose prose-gray max-w-none space-y-6 text-gray-700">
              <p>
                株式会社モテコロ（以下「当社」）は、本ウェブサイト「シール帳」（以下「本サービス」）において、
                ユーザーの個人情報を適切に取り扱うことを重要な責務と認識し、以下のプライバシーポリシーを定めます。
              </p>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">1. 収集する情報</h2>
                <p>本サービスでは、以下の情報を収集することがあります。</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>メールアドレス（クリエイター登録時）</li>
                  <li>パスワード（暗号化して保存）</li>
                  <li>作成したコンテンツ（キット、シール、作品データ）</li>
                  <li>アクセスログ（IPアドレス、ブラウザ情報、アクセス日時）</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">2. 情報の利用目的</h2>
                <p>収集した情報は、以下の目的で利用します。</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>本サービスの提供・運営</li>
                  <li>ユーザー認証およびアカウント管理</li>
                  <li>サービス改善のための分析</li>
                  <li>重要なお知らせの連絡</li>
                  <li>不正利用の防止</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">3. Cookieの使用</h2>
                <p>
                  本サービスでは、ユーザー体験の向上およびサービスの分析のためにCookieを使用します。
                  Cookieはブラウザの設定で無効にすることができますが、一部の機能が利用できなくなる場合があります。
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">4. 広告について</h2>
                <p>
                  本サービスでは、第三者配信の広告サービス（Google AdSense）を利用する場合があります。
                  広告配信事業者は、ユーザーの興味に基づいた広告を表示するためにCookieを使用することがあります。
                </p>
                <p className="mt-2">
                  Google AdSenseの詳細については、
                  <a
                    href="https://policies.google.com/technologies/ads?hl=ja"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline"
                  >
                    Googleの広告に関するポリシー
                  </a>
                  をご確認ください。
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">5. アクセス解析</h2>
                <p>
                  本サービスでは、サービス向上のためにアクセス解析ツールを使用する場合があります。
                  これらのツールはCookieを使用してデータを収集しますが、個人を特定する情報は含まれません。
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">6. 個人情報の第三者提供</h2>
                <p>
                  当社は、以下の場合を除き、ユーザーの個人情報を第三者に提供することはありません。
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>ユーザーの同意がある場合</li>
                  <li>法令に基づく場合</li>
                  <li>人の生命、身体または財産の保護のために必要な場合</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">7. セキュリティ</h2>
                <p>
                  当社は、個人情報の漏洩、紛失、改ざんを防ぐため、適切なセキュリティ対策を講じています。
                  パスワードは暗号化して保存し、通信はSSL/TLSで暗号化しています。
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">8. アカウント削除</h2>
                <p>
                  ユーザーは、いつでもアカウントを削除することができます。
                  アカウント削除により、関連するすべての個人情報およびコンテンツが削除されます。
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">9. プライバシーポリシーの変更</h2>
                <p>
                  当社は、必要に応じて本プライバシーポリシーを変更することがあります。
                  重要な変更がある場合は、本サービス上でお知らせします。
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">10. お問い合わせ</h2>
                <p>
                  プライバシーに関するお問い合わせは、
                  <Link to="/contact" className="text-indigo-600 hover:underline">
                    お問い合わせページ
                  </Link>
                  よりご連絡ください。
                </p>
              </section>

              <footer className="mt-12 pt-6 border-t border-gray-200 text-sm text-gray-500">
                <p>制定日: 2026年2月3日</p>
                <p className="mt-1">株式会社モテコロ</p>
              </footer>
            </div>
          </article>
        </div>
      </div>
    </>
  );
}
