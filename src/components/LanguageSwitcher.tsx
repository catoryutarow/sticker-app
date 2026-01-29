import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const languages = [
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
];

interface LanguageSwitcherProps {
  variant?: 'dropdown' | 'buttons';
  className?: string;
}

export function LanguageSwitcher({ variant = 'dropdown', className = '' }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();

  const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

  const handleChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
  };

  if (variant === 'buttons') {
    return (
      <div className={`flex gap-1 ${className}`}>
        {languages.map(lang => (
          <button
            key={lang.code}
            onClick={() => handleChange(lang.code)}
            className={`px-2 py-1 rounded text-sm transition-colors ${
              i18n.language === lang.code
                ? 'bg-white/20 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
            title={lang.name}
          >
            {lang.flag}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={`relative group ${className}`}>
      <button
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Change language"
      >
        <Globe className="w-4 h-4" />
        <span>{currentLang.flag}</span>
      </button>
      <div className="absolute right-0 top-full mt-1 py-1 bg-gray-900 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-[120px]">
        {languages.map(lang => (
          <button
            key={lang.code}
            onClick={() => handleChange(lang.code)}
            className={`w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 hover:bg-white/10 transition-colors ${
              i18n.language === lang.code ? 'text-white bg-white/5' : 'text-white/70'
            }`}
          >
            <span>{lang.flag}</span>
            <span>{lang.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
