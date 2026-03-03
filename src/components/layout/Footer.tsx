import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="bg-davis-navy text-white/60 py-8">
      <div className="max-w-6xl mx-auto px-4 text-center text-sm">
        <p className="mb-2">{t('footer.powered')}</p>
        <a
          href="https://davistaiwan.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-davis-gold hover:underline"
        >
          {t('footer.brand')}
        </a>
      </div>
    </footer>
  );
}
