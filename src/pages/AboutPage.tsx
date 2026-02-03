import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Music, Sparkles, Users, ExternalLink } from 'lucide-react';

export function AboutPage() {
  return (
    <>
      <Helmet>
        <title>シール帳について | シール帳</title>
        <meta name="description" content="シール帳は株式会社モテコロが運営する、音楽シールで楽曲を作れる無料Webアプリです。誰でも簡単に音楽体験を楽しめます。" />
        <link rel="canonical" href="https://sirucho.com/about" />
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
              シール帳について
            </h1>

            <div className="prose prose-gray max-w-none space-y-6 text-gray-700">
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4">サービス概要</h2>
                <p>
                  「シール帳」は、音楽シールを台紙に貼り付けて楽曲を作成できる無料のWebアプリケーションです。
                  専門的な音楽知識がなくても、誰でも簡単に音楽を楽しむことができます。
                </p>
              </section>

              <section className="mt-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6">特徴</h2>
                <div className="grid gap-4">
                  <div className="flex gap-4 p-4 bg-indigo-50 rounded-xl">
                    <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">かんたん操作</h3>
                      <p className="text-sm text-gray-600">
                        シールをドラッグ＆ドロップするだけ。タップすれば音が鳴ります。
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 p-4 bg-green-50 rounded-xl">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Music className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">多彩なキット</h3>
                      <p className="text-sm text-gray-600">
                        ピアノ、ギター、シンセサイザーなど、様々な楽器のシールを用意。
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 p-4 bg-purple-50 rounded-xl">
                    <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">作品共有</h3>
                      <p className="text-sm text-gray-600">
                        作った作品はURLで共有可能。SNSでシェアして友達に聴いてもらおう。
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="mt-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">名前の由来</h2>
                <p>
                  「シール帳」は「シール帳」を略した愛称です。
                  子どもの頃にシール帳にシールを貼って遊んだような、
                  わくわくする体験を音楽でも味わってほしいという想いを込めています。
                </p>
              </section>

              <section className="mt-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">運営会社</h2>
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="font-bold text-lg text-gray-900 mb-4">株式会社モテコロ</h3>
                  <p className="text-gray-700 mb-4">
                    「QOML（クオリティ・オブ・ミュージック・ライフ）の向上」を経営理念とし、
                    音楽関連の講演・公演派遣、スキル向上支援、コンテンツ制作を展開しています。
                  </p>
                  <p className="text-gray-700 mb-4">
                    地域・学校・企業向けの音楽ワークショップや公演を通じて、
                    より多くの人に音楽の楽しさを届けることを目指しています。
                  </p>
                  <a
                    href="https://motechoro.jp/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    公式サイトを見る
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </section>

              <section className="mt-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">関連リンク</h2>
                <ul className="space-y-2">
                  <li>
                    <Link to="/privacy" className="text-indigo-600 hover:underline">
                      プライバシーポリシー
                    </Link>
                  </li>
                  <li>
                    <Link to="/terms" className="text-indigo-600 hover:underline">
                      利用規約
                    </Link>
                  </li>
                  <li>
                    <Link to="/contact" className="text-indigo-600 hover:underline">
                      お問い合わせ
                    </Link>
                  </li>
                </ul>
              </section>
            </div>
          </article>
        </div>
      </div>
    </>
  );
}
