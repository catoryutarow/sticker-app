import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import type { ReactNode } from 'react';

function SectionHeading({ num, children }: { num: number; children: ReactNode }) {
  return (
    <h2 className="flex items-baseline gap-2 sm:gap-3 text-lg sm:text-xl font-bold text-gray-900 mt-8 mb-3">
      <span className="inline-flex items-center justify-center min-w-[1.75rem] h-7 px-1.5 rounded-md bg-indigo-50 text-indigo-700 text-sm tabular-nums font-bold flex-shrink-0">
        {num}
      </span>
      <span className="min-w-0">{children}</span>
    </h2>
  );
}

export function PrivacyPage() {
  return (
    <>
      <Helmet>
        <title>プライバシーポリシー | シール帳</title>
        <meta
          name="description"
          content="シール帳のプライバシーポリシー。個人情報の取り扱い、Cookie、Google AdSenseによる広告配信とパーソナライズ広告の無効化方法、GDPRへの対応について説明します。"
        />
        <link rel="canonical" href="https://www.sirucho.com/privacy" />
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
              プライバシーポリシー
            </h1>

            <div className="max-w-none space-y-4 text-gray-700 leading-relaxed">
              <p>
                株式会社モテコロ（以下「当社」）は、本ウェブサイト「シール帳」（以下「本サービス」）において、
                ユーザーの個人情報を適切に取り扱うことを重要な責務と認識し、以下のプライバシーポリシーを定めます。
              </p>

              <section>
                <SectionHeading num={1}>収集する情報</SectionHeading>
                <p>本サービスでは、以下の情報を収集することがあります。</p>
                <ul className="list-disc pl-6 space-y-1.5 mt-2">
                  <li>メールアドレス（クリエイター登録時）</li>
                  <li>パスワード（暗号化して保存）</li>
                  <li>作成したコンテンツ（キット、シール、作品データ）</li>
                  <li>アクセスログ（IPアドレス、ブラウザ情報、アクセス日時）</li>
                </ul>
              </section>

              <section>
                <SectionHeading num={2}>情報の利用目的</SectionHeading>
                <p>収集した情報は、以下の目的で利用します。</p>
                <ul className="list-disc pl-6 space-y-1.5 mt-2">
                  <li>本サービスの提供・運営</li>
                  <li>ユーザー認証およびアカウント管理</li>
                  <li>サービス改善のための分析</li>
                  <li>重要なお知らせの連絡</li>
                  <li>不正利用の防止</li>
                </ul>
              </section>

              <section>
                <SectionHeading num={3}>Cookieの使用</SectionHeading>
                <p>
                  本サービスでは、ユーザー体験の向上およびサービスの分析のためにCookieを使用します。
                  Cookieはブラウザの設定で無効にすることができますが、一部の機能が利用できなくなる場合があります。
                </p>
              </section>

              <section>
                <SectionHeading num={4}>広告について</SectionHeading>
                <p>
                  本サービスでは、第三者配信の広告サービスとして Google AdSense を利用しています。
                  Google AdSense は、ユーザーの興味・関心に応じた広告（パーソナライズ広告）を表示するため、
                  Cookie を使用してユーザーの本サービスおよび他のウェブサイトへのアクセス情報を参照する場合があります。
                </p>

                <h3 className="text-base font-bold text-gray-900 mt-5 mb-2">
                  パーソナライズ広告を無効化する方法
                </h3>
                <p>
                  Google アカウントの広告設定ページから、パーソナライズ広告をオフにすることができます。
                </p>
                <ul className="list-disc pl-6 space-y-1.5 mt-2">
                  <li>
                    <a
                      href="https://adssettings.google.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-indigo-600 hover:underline break-all"
                    >
                      Google 広告設定 (adssettings.google.com)
                      <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                    </a>
                    にアクセスします。
                  </li>
                  <li>「パーソナライズド広告」のスイッチをオフに切り替えます。</li>
                  <li>
                    ログインせずに利用する場合も、同ページ下部の「ログアウト中の広告のカスタマイズ」から設定できます。
                  </li>
                </ul>

                <h3 className="text-base font-bold text-gray-900 mt-5 mb-2">
                  ブラウザで Cookie を無効化する方法
                </h3>
                <p>
                  主要ブラウザでは、設定画面から Cookie の保存・読み取りを無効化できます。
                  なお Cookie を無効化すると、本サービスの一部機能や他サイトの利便性が低下する場合があります。
                </p>
                <ul className="list-disc pl-6 space-y-1.5 mt-2">
                  <li>
                    <a
                      href="https://support.google.com/chrome/answer/95647"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
                    >
                      Google Chrome の Cookie 設定
                      <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://support.apple.com/ja-jp/guide/safari/sfri11471/mac"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
                    >
                      Safari の Cookie 設定
                      <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://support.mozilla.org/ja/kb/enhanced-tracking-protection-firefox-desktop"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
                    >
                      Firefox の Cookie・トラッキング設定
                      <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                    </a>
                  </li>
                </ul>

                <h3 className="text-base font-bold text-gray-900 mt-5 mb-2">
                  EEA／英国のユーザーの皆様へ（GDPR）
                </h3>
                <p>
                  欧州経済領域（EEA）および英国にお住まいのユーザーは、EU 一般データ保護規則（GDPR）および英国 GDPR に基づき、
                  個人データへのアクセス・訂正・削除・処理の制限・データポータビリティ・異議申立てなどの権利を有します。
                  本サービスでは該当地域からのアクセスに対し、Google の欧州向けユーザー同意ポリシーに準拠した同意取得の仕組みを通じて
                  広告配信を行っています。権利行使については
                  <Link to="/contact" className="text-indigo-600 hover:underline">
                    お問い合わせページ
                  </Link>
                  よりご連絡ください。
                </p>

                <h3 className="text-base font-bold text-gray-900 mt-5 mb-2">
                  参考リンク
                </h3>
                <ul className="list-disc pl-6 space-y-1.5">
                  <li>
                    <a
                      href="https://policies.google.com/technologies/ads"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
                    >
                      Google の広告ポリシー
                      <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://policies.google.com/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
                    >
                      Google プライバシーポリシー
                      <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                    </a>
                  </li>
                </ul>
              </section>

              <section>
                <SectionHeading num={5}>アクセス解析</SectionHeading>
                <p>
                  本サービスでは、サービス向上のためにアクセス解析ツールを使用する場合があります。
                  これらのツールはCookieを使用してデータを収集しますが、個人を特定する情報は含まれません。
                </p>
              </section>

              <section>
                <SectionHeading num={6}>個人情報の第三者提供</SectionHeading>
                <p>
                  当社は、以下の場合を除き、ユーザーの個人情報を第三者に提供することはありません。
                </p>
                <ul className="list-disc pl-6 space-y-1.5 mt-2">
                  <li>ユーザーの同意がある場合</li>
                  <li>法令に基づく場合</li>
                  <li>人の生命、身体または財産の保護のために必要な場合</li>
                </ul>
              </section>

              <section>
                <SectionHeading num={7}>セキュリティ</SectionHeading>
                <p>
                  当社は、個人情報の漏洩、紛失、改ざんを防ぐため、適切なセキュリティ対策を講じています。
                  パスワードは暗号化して保存し、通信はSSL/TLSで暗号化しています。
                </p>
              </section>

              <section>
                <SectionHeading num={8}>アカウント削除</SectionHeading>
                <p>
                  ユーザーは、いつでもアカウントを削除することができます。
                  アカウント削除により、関連するすべての個人情報およびコンテンツが削除されます。
                </p>
              </section>

              <section>
                <SectionHeading num={9}>プライバシーポリシーの変更</SectionHeading>
                <p>
                  当社は、必要に応じて本プライバシーポリシーを変更することがあります。
                  重要な変更がある場合は、本サービス上でお知らせします。
                </p>
              </section>

              <section>
                <SectionHeading num={10}>お問い合わせ</SectionHeading>
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
