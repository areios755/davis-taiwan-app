import { useTranslation } from 'react-i18next';
import type { AppLocale } from '@/types';

const LANGS: { code: AppLocale; label: string }[] = [
  { code: 'zh-TW', label: '繁' },
  { code: 'zh-CN', label: '简' },
  { code: 'en', label: 'EN' },
  { code: 'ja', label: 'JP' },
];

interface Props {
  compact?: boolean;
}

export default function LanguageSwitcher({ compact }: Props) {
  const { i18n } = useTranslation();
  const current = i18n.language as AppLocale;

  const handleChange = (code: AppLocale) => {
    i18n.changeLanguage(code);
    localStorage.setItem('davis-lang', code);
  };

  if (compact) {
    return (
      <select
        value={current}
        onChange={(e) => handleChange(e.target.value as AppLocale)}
        className="bg-transparent text-white text-xs border border-white/30 rounded px-1 py-0.5"
      >
        {LANGS.map((l) => (
          <option key={l.code} value={l.code} className="text-gray-900">
            {l.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="flex gap-1">
      {LANGS.map((l) => (
        <button
          key={l.code}
          onClick={() => handleChange(l.code)}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            current === l.code
              ? 'bg-davis-gold text-white'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
