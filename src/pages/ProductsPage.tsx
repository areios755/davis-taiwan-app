import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PRODUCTS } from '@/data/products';
import type { DavisProduct } from '@/types';

type Category = 'all' | 'shampoo' | 'conditioner' | 'spa' | 'specialty';

const CATEGORIES: Category[] = ['all', 'shampoo', 'conditioner', 'spa', 'specialty'];

function getLocaleName(p: DavisProduct, lang: string): string {
  if (lang === 'en') return p.name_en;
  if (lang === 'ja') return p.name_ja;
  if (lang === 'zh-CN') return p.name_cn;
  return p.name_zh;
}

function getLocaleTag(p: DavisProduct, lang: string): string {
  if (lang === 'en') return p.tag_en;
  if (lang === 'ja') return p.tag_ja;
  if (lang === 'zh-CN') return p.tag_cn;
  return p.tag_zh;
}

export default function ProductsPage() {
  const { t, i18n } = useTranslation();
  const [category, setCategory] = useState<Category>('all');
  const [products, setProducts] = useState<DavisProduct[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (url && key) {
      fetch(`${url}/rest/v1/davis_products?select=*&order=category`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      })
        .then((r) => r.json())
        .then((rows) => {
          if (Array.isArray(rows) && rows.length > 0) {
            setProducts(
              rows.map((r: Record<string, unknown>) => ({
                id: r.product_key as string,
                name_zh: (r.name_zh as string) || '',
                name_en: (r.name_en as string) || '',
                name_ja: (r.name_ja as string) || '',
                name_cn: (r.name_cn as string) || '',
                category: (r.category as DavisProduct['category']) || 'shampoo',
                tag_zh: (r.tag_zh as string) || '',
                tag_en: (r.tag_en as string) || '',
                tag_ja: (r.tag_ja as string) || '',
                tag_cn: (r.tag_cn as string) || '',
                reason_zh: (r.reason_zh as string) || '',
                reason_en: (r.reason_en as string) || '',
                reason_ja: (r.reason_ja as string) || '',
                reason_cn: (r.reason_cn as string) || '',
                note_zh: (r.note_zh as string) || undefined,
                note_en: (r.note_en as string) || undefined,
                note_ja: (r.note_ja as string) || undefined,
                note_cn: (r.note_cn as string) || undefined,
                image_url: (r.image_url as string) || undefined,
                dilution: (r.dilution as string) || '',
                dwell_time: (r.dwell_time as string) || '',
              })),
            );
            setLoaded(true);
            return;
          }
          setProducts(Object.values(PRODUCTS));
          setLoaded(true);
        })
        .catch(() => { setProducts(Object.values(PRODUCTS)); setLoaded(true); });
    } else {
      setProducts(Object.values(PRODUCTS));
      setLoaded(true);
    }
  }, []);

  const filtered = useMemo(
    () => (category === 'all' ? products : products.filter((p) => p.category === category)),
    [products, category],
  );

  // Only show category tabs that have at least one product
  const availableCategories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category));
    return CATEGORIES.filter((c) => c === 'all' || cats.has(c));
  }, [products]);

  const lang = i18n.language;

  return (
    <div className="max-w-4xl mx-auto p-4 py-8">
      <h1 className="text-2xl font-bold text-davis-navy mb-2">{t('products.title')}</h1>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {availableCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
              category === cat
                ? 'bg-davis-blue text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-davis-light'
            }`}
          >
            {t(`products.${cat}`)}
          </button>
        ))}
      </div>

      {/* Product grid */}
      {!loaded ? (
        <p className="text-gray-400 text-center py-12">{t('common.loading')}</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-400 text-center py-12">此分類暫無產品</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((p) => (
            <Link
              key={p.id}
              to={`/products/${p.id}`}
              className="card-davis hover:shadow-md transition-shadow flex gap-4"
            >
              {p.image_url && (
                <img
                  src={p.image_url}
                  alt={getLocaleName(p, lang)}
                  className="w-20 h-20 object-contain rounded-lg flex-shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <span className="inline-block text-xs text-davis-blue font-medium bg-davis-light rounded-full px-2 py-0.5 mb-1">
                  {t(`products.${p.category}`)}
                </span>
                <h3 className="font-bold text-davis-navy">{getLocaleName(p, lang)}</h3>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{getLocaleTag(p, lang)}</p>
                <div className="flex gap-3 text-xs text-gray-400 mt-2">
                  <span>{t('step.dilution')} {p.dilution}</span>
                  <span>{t('step.dwell_time')} {p.dwell_time}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
