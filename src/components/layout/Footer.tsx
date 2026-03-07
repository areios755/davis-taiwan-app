import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="bg-davis-navy text-white/60 py-8">
      <div className="max-w-6xl mx-auto px-4 text-center text-sm">
        <p className="mb-3">{t('footer.powered')}</p>
        <div className="flex items-center justify-center gap-4">
          <a
            href="https://davistaiwan.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-davis-gold hover:underline"
          >
            {t('footer.brand')}
          </a>
          <span className="text-white/30">|</span>
          <a
            href="https://line.me/R/ti/p/@davistaiwan"
            target="_blank"
            rel="noopener noreferrer"
            className="text-davis-gold hover:underline"
          >
            LINE @davistaiwan
          </a>
        </div>
      </div>
    </footer>
  );
}
