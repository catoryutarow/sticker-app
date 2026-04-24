import type { ReactNode } from 'react';
import {
  MousePointerClick,
  Music2,
  Palette,
  Share2,
  Hand,
  LayoutGrid,
  ImageDown,
  Sparkles,
} from 'lucide-react';

function FaqItem({ q, children }: { q: string; children: ReactNode }) {
  return (
    <details className="group rounded-xl border border-gray-200 bg-white/80 backdrop-blur-sm open:bg-indigo-50/60 open:border-indigo-200 transition-colors">
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

function FeatureCard({
  icon,
  title,
  description,
  color,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  color: 'indigo' | 'rose' | 'emerald';
}) {
  const colorMap = {
    indigo: 'bg-indigo-500',
    rose: 'bg-rose-500',
    emerald: 'bg-emerald-500',
  };
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-md border border-white/60">
      <div
        className={`w-12 h-12 rounded-full ${colorMap[color]} text-white flex items-center justify-center mb-3`}
        aria-hidden="true"
      >
        {icon}
      </div>
      <h3 className="font-bold text-gray-900 mb-1.5">{title}</h3>
      <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}

function StepCard({
  num,
  icon,
  title,
  description,
}: {
  num: number;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <li className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-md border border-white/60">
      <div className="absolute -top-3 -left-2 w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-sm font-bold flex items-center justify-center shadow">
        {num}
      </div>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0" aria-hidden="true">
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
        </div>
      </div>
    </li>
  );
}

export function IntroSections() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-14">
      {/* このアプリとは */}
      <section aria-labelledby="intro-what-is">
        <h2
          id="intro-what-is"
          className="text-xl md:text-2xl font-bold text-gray-800 mb-3"
        >
          このアプリとは
        </h2>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 sm:p-6 shadow-md border border-white/60 space-y-3 text-gray-700 leading-relaxed text-sm sm:text-base">
          <p>
            <strong className="font-bold text-gray-900">シール帳</strong>
            は、音楽の断片が入った「シール」を台紙にドラッグ＆ドロップで貼り付けるだけで、
            楽曲が形になっていく無料のWebアプリです。
            専門的な音楽知識は不要で、スマートフォンでもパソコンでもそのまま遊べます。
          </p>
          <p>
            シールをタップすると音が鳴り、2枚以上を組み合わせると
            <span className="font-medium text-indigo-600">スペシャルモード</span>
            が解禁されて楽曲が自動的にミックスされます。
            できあがった作品は専用URLで発行され、SNSやメッセージアプリからそのまま共有できます。
          </p>
        </div>
      </section>

      {/* できること */}
      <section aria-labelledby="intro-features">
        <h2
          id="intro-features"
          className="text-xl md:text-2xl font-bold text-gray-800 mb-4"
        >
          できること
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <FeatureCard
            color="indigo"
            icon={<Music2 className="w-6 h-6" />}
            title="音楽シールで作曲"
            description="メロディ・コード・ビートが入ったシールを組み合わせるだけ。タップで即再生されるので、耳で確かめながら音を選べます。"
          />
          <FeatureCard
            color="rose"
            icon={<Palette className="w-6 h-6" />}
            title="台紙で世界観を演出"
            description="温かみのあるイラストから洗練された幾何学模様まで、シーンに合わせて台紙を切り替え。作品ごとに空気感を変えられます。"
          />
          <FeatureCard
            color="emerald"
            icon={<Share2 className="w-6 h-6" />}
            title="ワンクリックで共有"
            description="保存ボタンで専用URLが発行。LINE・X・メールなど、受け取った人はログイン不要でそのまま聴けます。"
          />
        </div>
      </section>

      {/* 使い方の流れ */}
      <section aria-labelledby="intro-how-to">
        <h2
          id="intro-how-to"
          className="text-xl md:text-2xl font-bold text-gray-800 mb-6"
        >
          使い方の流れ
        </h2>
        <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StepCard
            num={1}
            icon={<LayoutGrid className="w-5 h-5" />}
            title="キットを選ぶ"
            description="ピアノ・シンセ・ギターなど、用途や気分に合ったシールのセットを選びます。"
          />
          <StepCard
            num={2}
            icon={<Hand className="w-5 h-5" />}
            title="シールを貼る"
            description="好きなシールを台紙の好きな位置にドラッグ。タップすれば即座に音が鳴ります。"
          />
          <StepCard
            num={3}
            icon={<Sparkles className="w-5 h-5" />}
            title="スペシャルモード"
            description="2枚以上のシールが並ぶと自動でミックス再生が解禁。組み合わせの化学反応を楽しめます。"
          />
          <StepCard
            num={4}
            icon={<ImageDown className="w-5 h-5" />}
            title="保存して共有"
            description="保存すると専用URLが発行。SNSやメッセージで家族・友達と共有できます。"
          />
        </ol>
      </section>

      {/* FAQ */}
      <section aria-labelledby="intro-faq">
        <h2
          id="intro-faq"
          className="text-xl md:text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2"
        >
          <MousePointerClick className="w-5 h-5 text-indigo-500" aria-hidden="true" />
          よくある質問
        </h2>
        <div className="space-y-2">
          <FaqItem q="無料で使えますか？">
            はい、シール帳は無料でご利用いただけます。運営は Google AdSense による広告収入と、運営会社（株式会社モテコロ）の音楽事業から支えられています。主要な機能は今後も無料で提供する方針です。
          </FaqItem>
          <FaqItem q="ログインしなくても遊べますか？">
            再生・シール配置・作品の共有はログイン無しで完結します。クリエイター登録をすると、自分のオリジナル音源を使ったキットを作成・公開できます。
          </FaqItem>
          <FaqItem q="スマートフォンでも使えますか？">
            はい、iOS Safari と Android Chrome の最新版で動作確認しています。タッチ操作に最適化してあり、スマートフォン単体でシール配置から共有まで完結します。
          </FaqItem>
          <FaqItem q="作った作品はどうやって共有しますか？">
            保存ボタンを押すと専用URLが自動発行されます。LINE・X（Twitter）・メールなど、好きな手段で送るだけ。相手はログイン不要で、受け取った瞬間から再生できます。
          </FaqItem>
        </div>
      </section>
    </div>
  );
}
