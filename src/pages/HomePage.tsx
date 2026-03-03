import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Camera, Zap, Award, BookOpen } from 'lucide-react';

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-davis-navy to-davis-blue text-white py-20 px-4 text-center">
        <img src="/logo.png" alt="Davis" className="h-24 mx-auto mb-6" />
        <h1 className="text-3xl font-bold mb-3">{t('hero.tagline')}</h1>
        <p className="text-white/80 mb-8 max-w-md mx-auto">{t('hero.description')}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/analyze" className="btn-davis text-lg">
            <Camera className="mr-2" size={20} />
            {t('hero.cta_photo')}
          </Link>
          <Link to="/analyze?mode=breed" className="btn-davis-outline !text-white !border-white/50 text-lg">
            <Zap className="mr-2" size={20} />
            {t('hero.cta_breed')}
          </Link>
        </div>
      </section>

      {/* Brand */}
      <section className="py-16 px-4 max-w-4xl mx-auto text-center">
        <h2 className="text-2xl font-bold text-davis-navy mb-8">{t('brand.title')}</h2>
        <div className="grid grid-cols-3 gap-6">
          {[
            { icon: '🏅', text: t('brand.cfa') },
            { icon: '📜', text: t('brand.history') },
            { icon: '🔬', text: t('brand.formula') },
          ].map((item, i) => (
            <div key={i} className="card-davis p-6">
              <div className="text-4xl mb-3">{item.icon}</div>
              <p className="font-medium text-davis-navy">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Certification */}
      <section className="bg-davis-light py-16 px-4 text-center">
        <Award className="mx-auto text-davis-gold mb-4" size={48} />
        <h2 className="text-2xl font-bold text-davis-navy mb-3">{t('cert.title')}</h2>
        <p className="text-gray-600 mb-6">{t('cert.description')}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/groomers" className="btn-davis">{t('cert.view_groomers')}</Link>
          <Link to="/certify" className="btn-davis-outline">{t('cert.apply')}</Link>
        </div>
      </section>

      {/* Products */}
      <section className="py-16 px-4 text-center">
        <BookOpen className="mx-auto text-davis-blue mb-4" size={48} />
        <h2 className="text-2xl font-bold text-davis-navy mb-3">{t('product_section.title')}</h2>
        <p className="text-gray-600 mb-6">{t('product_section.description')}</p>
        <Link to="/products" className="btn-davis">{t('product_section.browse')}</Link>
      </section>
    </div>
  );
}
