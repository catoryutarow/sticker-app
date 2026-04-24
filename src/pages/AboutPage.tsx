import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Lightbulb,
  Music,
  Shield,
  Sparkles,
  Users,
  FileText,
  Mail,
  GraduationCap,
  RefreshCw,
  CheckCircle2,
  Briefcase,
} from 'lucide-react';
import { Footer } from '@/components/Footer';

export function AboutPage() {
  return (
    <>
      <Helmet>
        <title>シール帳について | シール帳</title>
        <meta
          name="description"
          content="シール帳は、音楽ワークショップや講演事業を展開する株式会社モテコロが運営する、音楽シールで楽曲を作れる無料Webアプリです。QOML（クオリティ・オブ・ミュージック・ライフ）の向上を理念に、運営者の音楽現場での知見を反映しながら継続的に改善・更新しています。"
        />
        <link rel="canonical" href="https://www.sirucho.com/about" />
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
              シール帳について
            </h1>

            <div className="max-w-none space-y-8 text-gray-700 leading-relaxed">
              <section>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3">
                  サービス概要
                </h2>
                <p>
                  「シール帳」は、音楽シールを台紙に貼り付けて楽曲を作成できる無料のWebアプリケーションです。
                  専門的な音楽知識がなくても、誰でも簡単に音楽を楽しむことができます。
                </p>
              </section>

              <section>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
                  特徴
                </h2>
                <div className="grid gap-3 sm:gap-4">
                  <div className="flex gap-3 sm:gap-4 p-4 bg-indigo-50/70 rounded-xl">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 mb-1">
                        かんたん操作
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        シールをドラッグ＆ドロップするだけ。タップすれば音が鳴ります。
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 sm:gap-4 p-4 bg-green-50/70 rounded-xl">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Music className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 mb-1">
                        多彩なキット
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        ピアノ、ギター、シンセサイザーなど、様々な楽器のシールを用意。
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 sm:gap-4 p-4 bg-purple-50/70 rounded-xl">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 mb-1">
                        作品共有
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        作った作品はURLで共有可能。SNSでシェアして友達に聴いてもらおう。
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3">
                  コンセプト
                </h2>
                <p>
                  子どもの頃、お気に入りのシールを集めてシール帳に貼って遊んだ経験はありませんか？
                  「シール帳」は、そんなわくわくする体験を音楽でも味わってほしいという想いから生まれました。
                  シールを貼る感覚で、誰でも気軽に音楽を作れるサービスです。
                </p>
              </section>

              <section>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-500" aria-hidden="true" />
                  このアプリについて / 着想の背景
                </h2>
                <div className="space-y-3">
                  <p>
                    シール帳は、「音楽を演奏する」ことのハードルをできるだけ下げ、
                    子どもから大人まで、誰もが自分のペースで音楽づくりを楽しめる場所をつくりたいという想いから生まれました。
                  </p>
                  <p>
                    楽譜が読めなくても、楽器が弾けなくても大丈夫。
                    シールを貼るという馴染みある動作だけで、メロディとリズムが形になっていきます。
                    それは音楽教室の教材として、親子で遊ぶ休日のおもちゃとして、そして大人の気軽な創作ツールとして、
                    様々な場面で役立つことを目指しています。
                  </p>
                  <p>
                    作った作品は一つひとつがかけがえのない表現です。
                    URLで手軽に共有できる仕組みを用意し、
                    「作る楽しさ」だけでなく「聴いてもらう喜び」まで含めて音楽体験を届けます。
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-indigo-500" aria-hidden="true" />
                  運営者の専門性
                </h2>
                <div className="space-y-3">
                  <p>
                    シール帳の企画・開発・コンテンツは、音楽教育・音楽制作・音楽ワークショップ運営を
                    現場で続けてきたメンバーによって支えられています。
                    運営会社の
                    <a
                      href="https://motechoro.jp/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline inline-flex items-center gap-0.5"
                    >
                      株式会社モテコロ
                      <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    </a>
                    は、地域・学校・企業向けに音楽ワークショップや講演・公演派遣を提供しており、
                    その現場で蓄積した知見がそのままシール帳の設計思想に反映されています。
                  </p>
                  <p>
                    具体的には、以下の現場知が UI 設計やコンテンツ制作に織り込まれています。
                  </p>
                  <ul className="list-disc pl-6 space-y-1.5">
                    <li>子どもが「音楽に触れ始める瞬間」に何に戸惑い、何が楽しいと感じるか</li>
                    <li>楽譜読譜が苦手な大人が、音楽づくりのハードルを越えるために必要な補助線</li>
                    <li>
                      拍・BPM・コードなど「音楽理論の入り口」を、言葉ではなく体験で腹落ちさせる方法
                    </li>
                    <li>セッション現場での即興・組み合わせ・反復がもたらす創造のしやすさ</li>
                  </ul>
                  <p>
                    このサービスは「音楽の専門家でなければ楽しめない」ものではなく、
                    「音楽の専門家がずっと向き合ってきた体験を、誰でも追体験できる形に翻訳したもの」です。
                    同人や趣味で偶然生まれたツールではなく、音楽事業を生業とする会社が責任を持って運営しています。
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
                  運営会社
                </h2>
                <div className="bg-gray-50 rounded-xl p-5 sm:p-6">
                  <h3 className="font-bold text-lg text-gray-900 mb-3">
                    株式会社モテコロ
                  </h3>
                  <p className="text-gray-700 mb-3">
                    「QOML（クオリティ・オブ・ミュージック・ライフ）の向上」を経営理念とし、
                    地域・学校・企業向けの音楽ワークショップや講演・公演派遣を展開しています。
                  </p>
                  <p className="text-gray-700 mb-3">
                    音楽関連の講演・公演派遣、スキル向上支援、コンテンツ制作を通じて、
                    より多くの人に音楽の楽しさを届けることを目指しています。
                  </p>
                  <p className="text-gray-700 mb-4">
                    シール帳は、こうした実践の中で得られた
                    「音楽の入り口をもっと広げたい」という気づきから、自社プロダクトとして開発されました。
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

              <section>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-indigo-500" aria-hidden="true" />
                  運営会社のこれまで
                </h2>
                <p className="mb-4">
                  株式会社モテコロは、音楽を通じた体験設計を事業の柱とし、
                  現場で得たノウハウを自社プロダクトに反映しています。シール帳はその流れの一部です。
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" aria-hidden="true" />
                    <div>
                      <div className="font-medium text-gray-900">音楽ワークショップの企画・実施</div>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        学校・地域イベント・企業研修などの現場で、参加者の年齢や経験を問わず楽しめるプログラムを設計。
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" aria-hidden="true" />
                    <div>
                      <div className="font-medium text-gray-900">講演・公演派遣</div>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        音楽関連の講演・公演に演者を派遣し、教育機関や企業の文化活動を支援。
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" aria-hidden="true" />
                    <div>
                      <div className="font-medium text-gray-900">音楽コンテンツの制作</div>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        楽曲制作・音源編集・映像との組み合わせなど、音楽にまつわる表現物を内製。
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" aria-hidden="true" />
                    <div>
                      <div className="font-medium text-gray-900">シール帳の開発・運営（2025〜）</div>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        上記の経験を踏まえ、「音楽をつくる瞬間」をWebで再現するための自社プロダクトとして開発。
                        以降、ユーザーの声を受けて継続的に機能追加・改善を行っています。
                      </p>
                    </div>
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-indigo-500" aria-hidden="true" />
                  更新ポリシー
                </h2>
                <div className="space-y-3">
                  <p>
                    本サービスは、品質と正確性を保つため以下の方針で運営・更新しています。
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <span>
                        <strong className="font-medium text-gray-900">機能改善</strong>
                        ：ユーザーからのフィードバックや利用データを踏まえ、
                        使いやすさと表現の幅を継続的に拡張していきます。
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <span>
                        <strong className="font-medium text-gray-900">コンテンツ更新</strong>
                        ：シール／台紙／記事は、音楽教育・制作現場の知見をもとに追加・見直しを続けます。
                        記事は公開後も事実関係や表現を定期的に点検します。
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <span>
                        <strong className="font-medium text-gray-900">誤りの訂正</strong>
                        ：誤情報が見つかった場合は、速やかに該当箇所を修正します。
                        ご指摘はお問い合わせページからお知らせください。
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <span>
                        <strong className="font-medium text-gray-900">運営の透明性</strong>
                        ：運営会社・お問い合わせ窓口を本ページに明記し、ユーザーからの連絡経路を常時開いておきます。
                      </span>
                    </li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
                  関連リンク
                </h2>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Link
                    to="/privacy"
                    className="flex items-center justify-between gap-2 p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors group"
                  >
                    <span className="inline-flex items-center gap-2 text-gray-700 group-hover:text-indigo-700 text-sm font-medium">
                      <Shield className="w-4 h-4 text-indigo-500" aria-hidden="true" />
                      プライバシーポリシー
                    </span>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600" aria-hidden="true" />
                  </Link>
                  <Link
                    to="/terms"
                    className="flex items-center justify-between gap-2 p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors group"
                  >
                    <span className="inline-flex items-center gap-2 text-gray-700 group-hover:text-indigo-700 text-sm font-medium">
                      <FileText className="w-4 h-4 text-indigo-500" aria-hidden="true" />
                      利用規約
                    </span>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600" aria-hidden="true" />
                  </Link>
                  <Link
                    to="/contact"
                    className="flex items-center justify-between gap-2 p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors group"
                  >
                    <span className="inline-flex items-center gap-2 text-gray-700 group-hover:text-indigo-700 text-sm font-medium">
                      <Mail className="w-4 h-4 text-indigo-500" aria-hidden="true" />
                      お問い合わせ
                    </span>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600" aria-hidden="true" />
                  </Link>
                </div>
              </section>
            </div>
          </article>
        </div>
        <Footer />
      </div>
    </>
  );
}
