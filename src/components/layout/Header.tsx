import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import LanguageSwitcher from './LanguageSwitcher';

const NAV_ITEMS = [
  { path: '/analyze', key: 'nav.analyze' },
  { path: '/products', key: 'nav.products' },
  { path: '/groomers', key: 'nav.groomers' },
  { path: '/certify', key: 'nav.certify' },
];

export default function Header() {
  const { t } = useTranslation();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-davis-navy text-white shadow-lg">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="Davis" className="h-8" />
          <span className="font-bold text-lg hidden sm:block">Davis Taiwan</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV_ITEMS.map(({ path, key }) => (
            <Link
              key={path}
              to={path}
              className={`text-sm font-medium transition-colors ${
                location.pathname === path
                  ? 'text-davis-gold'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              {t(key)}
            </Link>
          ))}
          <LanguageSwitcher />
        </nav>

        {/* Mobile menu button */}
        <div className="flex items-center gap-3 md:hidden">
          <LanguageSwitcher compact />
          <button onClick={() => setMenuOpen(!menuOpen)} className="p-1">
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <nav className="md:hidden bg-davis-navy border-t border-white/10 px-4 pb-4">
          {NAV_ITEMS.map(({ path, key }) => (
            <Link
              key={path}
              to={path}
              onClick={() => setMenuOpen(false)}
              className={`block py-3 text-sm font-medium border-b border-white/5 ${
                location.pathname === path ? 'text-davis-gold' : 'text-white/80'
              }`}
            >
              {t(key)}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
