import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, ExternalLink, Mail, HelpCircle } from 'lucide-react';
import type { ReactNode } from 'react';

function FaqItem({ q, children }: { q: string; children: ReactNode }) {
  return (
    <details className="group rounded-xl border border-gray-200 bg-white open:bg-indigo-50/30 open:border-indigo-200 transition-colors">
      <summary className="flex items-start gap-3 p-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <span
          className="w-7 h-7 rounded-full bg-indigo-500 text-white text-sm font-bold flex items-center justify-center flex-shrink-0"
          aria-hidden="true"
        >
          Q
        </span>
        <span className="flex-1 font-medium text-gray-900 leading-snug">{q}</span>
        <span
          className="ml-1 mt-1 text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0"
          aria-hidden="true"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </span>
      </summary>
      <div className="flex items-start gap-3 px-4 pb-4 pt-0 text-sm text-gray-700 leading-relaxed">
        <span
          className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 text-sm font-bold flex items-center justify-center flex-shrink-0"
          aria-hidden="true"
        >
          A
        </span>
        <div className="flex-1 pt-1">{children}</div>
      </div>
    </details>
  );
}

export function ContactPage() {
  return (
    <>
      <Helmet>
        <title>お問い合わせ | シール帳</title>
        <meta name="description" content="シール帳へのお問い合わせ。ご質問、ご要望、不具合報告などお気軽にご連絡ください。よくあるご質問もご確認いただけます。" />
        <link rel="canonical" href="https://www.sirucho.com/contact" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 py-8 px-3 sm:px-4">
        <div className="max-w-3xl mx-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-6 text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4" />
            トップページへ戻る
          </Link>

          <article className="bg-white rounded-2xl shadow-lg p-5 sm:p-6 md:p-10">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">
              お問い合わせ
            </h1>

            <div className="max-w-none space-y-8 text-gray-700 leading-relaxed">
              <p>
                シール帳に関するご質問、ご要望、不具合報告など、お気軽にお問い合わせください。
              </p>

              <section>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
                  お問い合わせ方法
                </h2>

                <a
                  href="https://formbase.jp/motechoro/contact-form"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 sm:p-5 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors group"
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-white" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900 group-hover:text-indigo-700 break-keep">
                          お問い合わせフォーム
                        </h3>
                        <ExternalLink
                          className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 flex-shrink-0"
                          aria-hidden="true"
                        />
                      </div>
                      <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                        株式会社モテコロのお問い合わせフォームから送信できます。
                      </p>
                    </div>
                  </div>
                </a>
              </section>

              <section>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3">
                  お問い合わせ内容の例
                </h2>
                <ul className="list-disc pl-6 space-y-1.5">
                  <li>サービスの使い方について</li>
                  <li>不具合・バグの報告</li>
                  <li>機能改善のご要望</li>
                  <li>クリエイター登録について</li>
                  <li>コラボレーションのご相談</li>
                  <li>その他のご質問</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-indigo-500" aria-hidden="true" />
                  よくあるご質問 (FAQ)
                </h2>
                <div className="space-y-2">
                  <FaqItem q="無料で使えますか？">
                    はい、シール帳は無料でご利用いただけます。サービスの運営は Google AdSense による広告収入で支えられています。
                    今後も主要な機能は無料でご提供する方針です。
                  </FaqItem>
                  <FaqItem q="ログイン無しでも使えますか？">
                    再生・シールの配置・作品の共有は、ログインなしでご利用いただけます。
                    オリジナルのキット（音源セット）を作成・公開するクリエイター機能をご利用になる場合のみ、クリエイター登録が必要です。
                  </FaqItem>
                  <FaqItem q="スマートフォンでも使えますか？">
                    はい、iOS Safari および Android Chrome の最新版で動作確認を行っています。
                    タッチ操作に最適化しており、スマートフォン単体でシールの配置から作品の共有まで完結します。
                  </FaqItem>
                  <FaqItem q="作った作品は共有できますか？">
                    作品を保存すると共有用のURLが自動発行され、SNS やメッセージアプリを通じて友人・家族にシェアできます。
                    共有を受け取った方はログイン不要でそのまま再生できます。
                  </FaqItem>
                  <FaqItem q="返信までどのくらいかかりますか？">
                    通常 3 営業日以内にご返信いたします。
                    内容によってはお時間を頂戴する場合がございますので、あらかじめご了承ください。
                  </FaqItem>
                </div>
              </section>

              <section>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3">
                  回答について
                </h2>
                <p>
                  お問い合わせへの回答は、通常3営業日以内に行います。
                  内容によっては、回答までお時間をいただく場合がございます。
                </p>
                <p className="mt-2">
                  なお、以下の場合は回答できないことがあります。
                </p>
                <ul className="list-disc pl-6 space-y-1.5 mt-2">
                  <li>匿名・偽名でのお問い合わせ</li>
                  <li>本サービスと関係のない内容</li>
                  <li>誹謗中傷・嫌がらせ目的のもの</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3">
                  運営会社
                </h2>
                <div className="bg-gray-50 rounded-xl p-4 sm:p-5">
                  <dl className="space-y-2 text-sm sm:text-base">
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      <dt className="w-20 sm:w-24 text-gray-500 flex-shrink-0">会社名</dt>
                      <dd className="font-medium">株式会社モテコロ</dd>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      <dt className="w-20 sm:w-24 text-gray-500 flex-shrink-0">Webサイト</dt>
                      <dd className="min-w-0 break-all">
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
