import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BREEDS } from '@/data/breeds';
import { PRODUCTS } from '@/data/products';
import { getAllCombos, getCombosForBreed } from '@/lib/breed-combos';
import type { ProductCombo } from '@/lib/breed-combos';
import { ExternalLink, MessageCircle, Search } from 'lucide-react';

function ComboCard({ combo }: { combo: ProductCombo }) {
  return (
    <div className="card-davis p-5">
      <h3 className="text-lg font-bold text-davis-navy mb-1">{combo.name}</h3>
      <p className="text-sm text-gray-500 mb-4">{combo.description}</p>

      <div className="space-y-3 mb-4">
        {combo.steps.map((step) => {
          const product = PRODUCTS[step.product_key];
          return (
            <div key={step.step} className="flex items-center gap-3 bg-davis-light/50 rounded-xl p-3">
              <div className="w-8 h-8 rounded-full bg-davis-blue text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                {step.step}
              </div>
              {product?.image_url && (
                <img src={product.image_url} alt={product.name_zh} className="w-12 h-12 object-contain rounded-lg flex-shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-davis-blue font-medium">{step.role}</span>
                </div>
                <p className="font-medium text-davis-navy text-sm">
                  {product ? (
                    <Link to={`/products/${product.id}`} className="hover:underline">{product.name_zh}</Link>
                  ) : step.product_key}
                </p>
                {step.note && <p className="text-xs text-gray-400 mt-0.5">{step.note}</p>}
              </div>
            </div>
          );
        })}
      </div>

      {combo.tips && (
        <p className="text-xs text-davis-gold bg-yellow-50 rounded-lg p-2 mb-4">
          💡 {combo.tips}
        </p>
      )}

      <a
        href="https://davistaiwan.com"
        target="_blank"
        rel="noopener noreferrer"
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:brightness-110 active:scale-95"
        style={{ backgroundColor: '#D4A843' }}
      >
        前往 Davis Taiwan 選購
        <ExternalLink size={14} />
      </a>
    </div>
  );
}

export default function CombosPage() {
  const { t } = useTranslation();
  const [selectedBreed, setSelectedBreed] = useState<string | null>(null);
  const [tab, setTab] = useState<'dog' | 'cat'>('dog');
  const [query, setQuery] = useState('');

  const allCombos = getAllCombos();
  const breeds = Object.values(BREEDS).filter((b) => b.pet_type === (tab === 'dog' ? '狗' : '貓'));

  const filteredBreeds = useMemo(() => {
    if (!query) return breeds;
    const q = query.toLowerCase();
    return breeds.filter((b) =>
      b.name_zh.includes(q) || b.name_en.toLowerCase().includes(q) || b.name_cn.includes(q)
    );
  }, [breeds, query]);

  const displayCombos = useMemo(() => {
    if (selectedBreed) {
      const matched = getCombosForBreed(selectedBreed);
      return matched.length > 0 ? matched : allCombos.filter((c) =>
        c.id === (tab === 'cat' ? 'cat_premium' : 'dog_premium')
      );
    }
    // Show dog or cat combos based on tab
    if (tab === 'cat') {
      return allCombos.filter((c) => c.id.startsWith('cat_'));
    }
    return allCombos.filter((c) => !c.id.startsWith('cat_'));
  }, [selectedBreed, tab, allCombos]);

  return (
    <div className="max-w-4xl mx-auto p-4 py-8">
      <h1 className="text-2xl font-bold text-davis-navy mb-2">{t('nav.combos')}</h1>
      <p className="text-sm text-gray-500 mb-6">根據品種和毛質，為你推薦最適合的洗護組合</p>

      {/* Breed picker */}
      <div className="mb-6">
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => { setTab('dog'); setSelectedBreed(null); }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${tab === 'dog' ? 'bg-davis-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-davis-light'}`}
          >
            {t('common.dog')}
          </button>
          <button
            onClick={() => { setTab('cat'); setSelectedBreed(null); }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${tab === 'cat' ? 'bg-davis-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-davis-light'}`}
          >
            {t('common.cat')}
          </button>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-3 text-gray-400" size={16} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋品種..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-davis-blue/30"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedBreed(null)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${!selectedBreed ? 'bg-davis-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-davis-light'}`}
          >
            全部組合
          </button>
          {filteredBreeds.map((breed) => (
            <button
              key={breed.id}
              onClick={() => setSelectedBreed(breed.id)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${selectedBreed === breed.id ? 'bg-davis-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-davis-light'}`}
            >
              {breed.emoji && `${breed.emoji} `}{breed.name_zh}
            </button>
          ))}
        </div>
      </div>

      {/* Combos grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {displayCombos.map((combo) => (
          <ComboCard key={combo.id} combo={combo} />
        ))}
      </div>

      {/* LINE CTA */}
      <div className="text-center">
        <p className="text-sm text-gray-500 mb-3">需要專業建議？加入 Davis Taiwan LINE</p>
        <a
          href="https://line.me/R/ti/p/@davistaiwan"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-medium text-white transition-all hover:brightness-110 active:scale-95"
          style={{ backgroundColor: '#06C755' }}
        >
          <MessageCircle size={18} />
          加入 LINE 官方帳號
        </a>
      </div>
    </div>
  );
}
