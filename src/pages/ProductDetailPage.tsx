import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PRODUCTS } from '@/data/products';
import { ArrowLeft } from 'lucide-react';
import type { DavisProduct } from '@/types';

function l(p: DavisProduct, field: 'name' | 'tag' | 'reason' | 'note', lang: string): string {
  const suffix = lang === 'en' ? '_en' : lang === 'ja' ? '_ja' : lang === 'zh-CN' ? '_cn' : '_zh';
  return (p as unknown as Record<string, string>)[`${field}${suffix}`] || '';
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const product = id ? PRODUCTS[id] : undefined;

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

      <div className="bg-davis-light rounded-lg px-3 py-1 inline-block text-xs text-davis-blue font-medium mb-2">
        {t(`products.${product.category}`)}
      </div>
      <h1 className="text-2xl font-bold text-davis-navy mb-1">{l(product, 'name', lang)}</h1>
      <p className="text-sm text-davis-gold mb-6">{l(product, 'tag', lang)}</p>

      {/* Usage info */}
      <div className="flex gap-4 mb-6">
        <div className="card-davis flex-1 text-center">
          <p className="text-xs text-gray-400 mb-1">稀釋比例</p>
          <p className="font-bold text-davis-navy">{product.dilution}</p>
        </div>
        <div className="card-davis flex-1 text-center">
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
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <h2 className="font-bold text-davis-gold mb-1">注意事項</h2>
          <p className="text-sm text-gray-600">{l(product, 'note', lang)}</p>
        </div>
      )}

      <div className="mt-8">
        <Link to="/analyze" className="btn-davis w-full text-center block">
          試試 AI 分析你的寵物
        </Link>
      </div>
    </div>
  );
}
