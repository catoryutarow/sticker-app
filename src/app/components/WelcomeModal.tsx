import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X, Music, Move, Play, Download, Sparkles } from 'lucide-react';

const STORAGE_KEY = 'sticker-app-onboarding-seen';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Step {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const steps: Step[] = [
  {
    title: 'シールを選ぼう',
    description: '好きなシールを選んでください。キットを切り替えると、いろんなシールが見つかります。',
    icon: <Music className="w-12 h-12" />,
    color: 'from-pink-400 to-rose-500',
  },
  {
    title: 'ドラッグ&ドロップ',
    description: 'シールを台紙にドラッグ&ドロップで貼り付けます。位置や大きさ、傾きを自由に調整できます。',
    icon: <Move className="w-12 h-12" />,
    color: 'from-blue-400 to-indigo-500',
  },
  {
    title: '再生してみよう',
    description: '▶ボタンを押すと、貼ったシールが音楽になります。シールの配置で音が変わるので、いろいろ試してみてください！',
    icon: <Play className="w-12 h-12" />,
    color: 'from-emerald-400 to-teal-500',
  },
  {
    title: '動画でシェア',
    description: '作った作品は動画としてエクスポートできます。SNSでシェアしたり、友達に送ったりしてみましょう！',
    icon: <Download className="w-12 h-12" />,
    color: 'from-purple-400 to-violet-500',
  },
  {
    title: 'クリエイターになろう',
    description: '自分だけのシールキットを作って公開できます。オリジナルの音やイラストで、みんなに使ってもらおう！',
    icon: <Sparkles className="w-12 h-12" />,
    color: 'from-amber-400 to-orange-500',
  },
];

export function WelcomeModal({ isOpen, onClose }: WelcomeModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    onClose();
  };

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    onClose();
  };

  if (!isOpen) return null;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-10"
          aria-label="スキップ"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hero section with gradient */}
        <div className={`bg-gradient-to-br ${step.color} p-8 text-white`}>
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
              {step.icon}
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center">
            {step.title}
          </h2>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-600 text-center leading-relaxed mb-6">
            {step.description}
          </p>

          {/* Step indicators */}
          <div className="flex justify-center gap-2 mb-6">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'w-6 bg-gray-800'
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`ステップ ${index + 1}`}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
                戻る
              </button>
            )}
            <button
              onClick={handleNext}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-white rounded-xl font-medium transition-colors ${
                isLastStep
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600'
              }`}
            >
              {isLastStep ? 'はじめる' : '次へ'}
              {!isLastStep && <ChevronRight className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * 初回訪問かどうかをチェック
 */
export function shouldShowWelcome(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== 'true';
}

/**
 * ウェルカム表示済みフラグをリセット（テスト用）
 */
export function resetWelcomeSeen(): void {
  localStorage.removeItem(STORAGE_KEY);
}
