import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, ExternalLink, Mail } from 'lucide-react';

export function ContactPage() {
  return (
    <>
      <Helmet>
        <title>お問い合わせ | シール帳</title>
        <meta name="description" content="シール帳へのお問い合わせ。ご質問、ご要望、不具合報告などお気軽にご連絡ください。" />
        <link rel="canonical" href="https://sirucho.com/contact" />
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
              お問い合わせ
            </h1>

            <div className="prose prose-gray max-w-none space-y-6 text-gray-700">
              <p>
                シール帳に関するご質問、ご要望、不具合報告など、お気軽にお問い合わせください。
              </p>

              <section className="mt-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">お問い合わせ方法</h2>

                <div className="space-y-4">
                  <a
                    href="https://formbase.jp/motechoro/contact-form"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors group"
                  >
                    <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Mail className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 group-hover:text-indigo-600">
                        お問い合わせフォーム
                      </h3>
                      <p className="text-sm text-gray-600">
                        株式会社モテコロのお問い合わせフォームから送信できます
                      </p>
                    </div>
                    <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-indigo-600" />
                  </a>
                </div>
              </section>

              <section className="mt-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">お問い合わせ内容の例</h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>サービスの使い方について</li>
                  <li>不具合・バグの報告</li>
                  <li>機能改善のご要望</li>
                  <li>クリエイター登録について</li>
                  <li>コラボレーションのご相談</li>
                  <li>その他のご質問</li>
                </ul>
              </section>

              <section className="mt-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">回答について</h2>
                <p>
                  お問い合わせへの回答は、通常3営業日以内に行います。
                  内容によっては、回答までお時間をいただく場合がございます。
                </p>
                <p className="mt-2">
                  なお、以下の場合は回答できないことがあります。
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-2">
                  <li>匿名・偽名でのお問い合わせ</li>
                  <li>本サービスと関係のない内容</li>
                  <li>誹謗中傷・嫌がらせ目的のもの</li>
                </ul>
              </section>

              <section className="mt-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">運営会社</h2>
                <div className="bg-gray-50 rounded-xl p-4">
                  <dl className="space-y-2">
                    <div className="flex">
                      <dt className="w-24 text-gray-500">会社名</dt>
                      <dd className="font-medium">株式会社モテコロ</dd>
                    </div>
                    <div className="flex">
                      <dt className="w-24 text-gray-500">Webサイト</dt>
                      <dd>
                        <a
                          href="https://motechoro.jp/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:underline"
                        >
                          https://motechoro.jp/
                        </a>
                      </dd>
                    </div>
                  </dl>
                </div>
              </section>
            </div>
          </article>
        </div>
      </div>
    </>
  );
}
