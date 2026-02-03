import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft } from 'lucide-react';

export function TermsPage() {
  return (
    <>
      <Helmet>
        <title>利用規約 | シルチョ</title>
        <meta name="description" content="シルチョの利用規約。サービスのご利用条件、禁止事項、免責事項について説明します。" />
        <link rel="canonical" href="https://sirucho.com/terms" />
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
              利用規約
            </h1>

            <div className="prose prose-gray max-w-none space-y-6 text-gray-700">
              <p>
                この利用規約（以下「本規約」）は、株式会社モテコロ（以下「当社」）が提供する
                「シルチョ」（以下「本サービス」）の利用条件を定めるものです。
                ユーザーの皆様には、本規約に従って本サービスをご利用いただきます。
              </p>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">第1条（適用）</h2>
                <p>
                  本規約は、ユーザーと当社との間の本サービスの利用に関わる一切の関係に適用されます。
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">第2条（サービスの内容）</h2>
                <p>
                  本サービスは、音楽シールを台紙に貼り付けて楽曲を作成できるWebアプリケーションです。
                  ユーザーは、本サービスを通じて音楽コンテンツを作成・共有することができます。
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">第3条（利用登録）</h2>
                <ol className="list-decimal pl-6 space-y-2">
                  <li>本サービスの一部機能（クリエイター機能）を利用するには、利用登録が必要です。</li>
                  <li>登録希望者は、当社の定める方法によって利用登録を申請するものとします。</li>
                  <li>当社は、以下の場合に利用登録を拒否することがあります。
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                      <li>虚偽の情報を登録した場合</li>
                      <li>過去に本規約に違反したことがある場合</li>
                      <li>その他、当社が不適切と判断した場合</li>
                    </ul>
                  </li>
                </ol>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">第4条（アカウント管理）</h2>
                <ol className="list-decimal pl-6 space-y-2">
                  <li>ユーザーは、自己の責任においてアカウント情報を管理するものとします。</li>
                  <li>ユーザーは、アカウントを第三者に利用させ、または譲渡・貸与することはできません。</li>
                  <li>アカウント情報の管理不十分による損害について、当社は責任を負いません。</li>
                </ol>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">第5条（禁止事項）</h2>
                <p>ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。</p>
                <ul className="list-disc pl-6 space-y-2 mt-2">
                  <li>法令または公序良俗に違反する行為</li>
                  <li>犯罪行為に関連する行為</li>
                  <li>当社または第三者の知的財産権、肖像権、プライバシー等を侵害する行為</li>
                  <li>当社または第三者を誹謗中傷し、名誉を毀損する行為</li>
                  <li>本サービスのサーバーまたはネットワークに過度な負荷をかける行為</li>
                  <li>本サービスの運営を妨害するおそれのある行為</li>
                  <li>不正アクセスまたはこれを試みる行為</li>
                  <li>他のユーザーに成りすます行為</li>
                  <li>反社会的勢力に関連する行為</li>
                  <li>その他、当社が不適切と判断する行為</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">第6条（コンテンツの権利）</h2>
                <ol className="list-decimal pl-6 space-y-2">
                  <li>ユーザーが作成したコンテンツの著作権は、原則としてユーザーに帰属します。</li>
                  <li>当社が提供する音源、画像等の素材の著作権は当社または権利者に帰属します。</li>
                  <li>ユーザーは、当社が本サービスの宣伝等の目的で、ユーザーの作品を利用することに同意します。</li>
                </ol>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">第7条（サービスの変更・停止）</h2>
                <ol className="list-decimal pl-6 space-y-2">
                  <li>当社は、事前の通知なく本サービスの内容を変更することができます。</li>
                  <li>当社は、以下の場合に本サービスの全部または一部を停止することができます。
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                      <li>システムの保守・点検を行う場合</li>
                      <li>天災、停電等により運営が困難な場合</li>
                      <li>その他、当社がやむを得ないと判断した場合</li>
                    </ul>
                  </li>
                </ol>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">第8条（免責事項）</h2>
                <ol className="list-decimal pl-6 space-y-2">
                  <li>当社は、本サービスに関して、明示または黙示を問わず、いかなる保証も行いません。</li>
                  <li>当社は、本サービスの利用によりユーザーに生じた損害について、責任を負いません。</li>
                  <li>当社は、ユーザー間またはユーザーと第三者との間のトラブルについて、責任を負いません。</li>
                </ol>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">第9条（退会）</h2>
                <p>
                  ユーザーは、当社の定める手続きにより、いつでも退会することができます。
                  退会により、ユーザーのアカウントおよび関連データは削除されます。
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">第10条（規約の変更）</h2>
                <p>
                  当社は、必要に応じて本規約を変更することができます。
                  変更後の規約は、本サービス上に掲載した時点で効力を生じるものとします。
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">第11条（準拠法・管轄裁判所）</h2>
                <p>
                  本規約の解釈にあたっては、日本法を準拠法とします。
                  本サービスに関して紛争が生じた場合には、当社の本店所在地を管轄する裁判所を専属的合意管轄とします。
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
