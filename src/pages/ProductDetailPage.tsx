import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PRODUCTS } from '@/data/products';
import { PRODUCT_REVIEWS } from '@/data/reviews';
import { fetchCombos, getPairedProducts } from '@/lib/breed-combos';
import { getProductImageSrc } from '@/lib/product-image';
import { ArrowLeft, ExternalLink, Star, MessageCircle } from 'lucide-react';
import type { DavisProduct } from '@/types';

function l(p: DavisProduct, field: 'name' | 'tag' | 'reason' | 'note', lang: string): string {
  const suffix = lang === 'en' ? '_en' : lang === 'ja' ? '_ja' : lang === 'zh-CN' ? '_cn' : '_zh';
  return (p as unknown as Record<string, string>)[`${field}${suffix}`] || '';
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  useEffect(() => { fetchCombos(); }, []);

  const product = id ? PRODUCTS[id] : undefined;
  const reviews = id ? PRODUCT_REVIEWS[id] ?? [] : [];
  const paired = id ? getPairedProducts(id) : [];

  if (!product) {
    return (
      <div className="max-w-lg mx-auto p-4 py-16 text-center">
        <p className="text-6xl mb-4">🔍</p>
        <p className="text-gray-500 mb-4">找不到此產品</p>
        <Link to="/products" className="btn-davis">{t('common.back')}</Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-4 py-8">
      <Link to="/products" className="inline-flex items-center text-davis-blue text-sm mb-6 hover:underline">
        <ArrowLeft size={16} className="mr-1" />
        {t('common.back')}
      </Link>

      {getProductImageSrc(product) && (
        <div className="flex justify-center mb-6">
          <img
            src={getProductImageSrc(product)!}
            alt={l(product, 'name', lang)}
            className="h-48 object-contain rounded-xl"
          />
        </div>
      )}

      <div className="bg-davis-light rounded-lg px-3 py-1 inline-block text-xs text-davis-blue font-medium mb-2">
        {t(`products.${product.category}`)}
      </div>
      <h1 className="text-2xl font-bold text-davis-navy mb-1">{l(product, 'name', lang)}</h1>
      <p className="text-sm text-davis-gold mb-4">{l(product, 'tag', lang)}</p>

      {/* Buy button */}
      <a
        href="https://davistaiwan.com"
        target="_blank"
        rel="noopener noreferrer"
        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-white transition-all duration-200 hover:brightness-110 active:scale-95 mb-6"
        style={{ backgroundColor: '#D4A843' }}
      >
        前往 Davis Taiwan 選購
        <ExternalLink size={16} />
      </a>

      {/* Usage info */}
      <div className="flex gap-4 mb-6">
        <div className="card-davis flex-1 text-center p-4">
          <p className="text-xs text-gray-400 mb-1">稀釋比例</p>
          <p className="font-bold text-davis-navy">{product.dilution}</p>
        </div>
        <div className="card-davis flex-1 text-center p-4">
          <p className="text-xs text-gray-400 mb-1">停留時間</p>
          <p className="font-bold text-davis-navy">{product.dwell_time}</p>
        </div>
      </div>

      {/* Reason */}
      <div className="mb-6">
        <h2 className="font-bold text-davis-navy mb-2">推薦理由</h2>
        <p className="text-gray-600 text-sm leading-relaxed">{l(product, 'reason', lang)}</p>
      </div>

      {/* Note */}
      {l(product, 'note', lang) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <h2 className="font-bold text-davis-gold mb-1">注意事項</h2>
          <p className="text-sm text-gray-600">{l(product, 'note', lang)}</p>
        </div>
      )}

      {/* Reviews (only if this product has any) */}
      {reviews.length > 0 && (
        <div className="mb-6">
          <h2 className="font-bold text-davis-navy mb-3">美容師評價</h2>
          <div className="space-y-3">
            {reviews.map((review, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star
                        key={s}
                        size={14}
                        className={s < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium text-davis-navy">{review.author}</span>
                  <span className="text-xs text-gray-400">{review.shop}</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{review.text}</p>
                <p className="text-xs text-gray-300 mt-2">{review.date}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Paired products */}
      {paired.length > 0 && (
        <div className="mb-6">
          <h2 className="font-bold text-davis-navy mb-3">搭配推薦</h2>
          <div className="space-y-2">
            {paired.map((p) => (
              <Link
                key={p.id}
                to={`/products/${p.id}`}
                className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow"
              >
                {getProductImageSrc(p) && (
                  <img src={getProductImageSrc(p)!} alt={l(p, 'name', lang)} className="w-14 h-14 object-contain rounded-lg flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-davis-navy text-sm">{l(p, 'name', lang)}</p>
                  <p className="text-xs text-gray-400 line-clamp-1">{l(p, 'tag', lang)}</p>
                </div>
                <ExternalLink size={14} className="text-gray-300 flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* LINE CTA */}
      <a
        href="https://line.me/R/ti/p/@davistaiwan"
        target="_blank"
        rel="noopener noreferrer"
        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-white transition-all duration-200 hover:brightness-110 active:scale-95 mb-4"
        style={{ backgroundColor: '#06C755' }}
      >
        <MessageCircle size={18} />
        產品諮詢請加 LINE
      </a>

      <div className="mt-4">
        <Link to="/analyze" className="btn-davis w-full text-center block">
          試試 AI 分析你的寵物
        </Link>
      </div>
    </div>
  );
}
