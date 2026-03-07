import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getShare } from '@/lib/api';
import { getBreedCombo, getComboProducts } from '@/lib/breed-combos';
import { getProductImageSrc } from '@/lib/product-image';
import { ExternalLink, MessageCircle } from 'lucide-react';
import type { AnalysisResult, TierLevel } from '@/types';

export default function ShareViewPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<TierLevel>('advanced');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) { setError('缺少分享 ID'); setLoading(false); return; }

    getShare(id).then((res) => {
      if (res.success && res.data) {
        const share = (res.data as Record<string, unknown>).share as Record<string, unknown>;
        if (share?.result_data) {
          const data = share.result_data as AnalysisResult & { photo_data?: string };
          if (data.photo_data) {
            setPhotoData(data.photo_data);
          }
          setResult(data);
        } else {
          setError('分享資料格式錯誤');
        }
      } else {
        setError(res.error || '找不到此分享結果');
      }
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-lg mx-auto p-4 py-16 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-davis-blue border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-500">{t('common.loading')}</p>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="max-w-lg mx-auto p-4 py-16 text-center">
        <p className="text-6xl mb-4">😿</p>
        <p className="text-gray-600 mb-4">{error || '找不到此分享結果，可能已過期'}</p>
        <Link to="/analyze" className="btn-davis">{t('analyze.retry')}</Link>
      </div>
    );
  }

  const combo = getBreedCombo(result.breed, result.color);
  const comboProducts = getComboProducts(combo);

  return (
    <div className="max-w-lg mx-auto p-4 py-8">
      {/* Brand header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 bg-davis-navy text-white px-4 py-2 rounded-full text-sm font-medium mb-4">
          <span>Davis AI</span>
          <span className="w-1 h-1 bg-white/40 rounded-full" />
          <span>寵物洗護分析報告</span>
        </div>

        {/* Pet photo */}
        {photoData && (
          <div className="relative w-48 h-48 mx-auto mb-4">
            <div className="absolute inset-0 rounded-2xl" style={{ border: '3px solid #D4A843' }} />
            <img
              src={photoData}
              alt={result.breed}
              className="w-full h-full object-cover rounded-2xl"
            />
          </div>
        )}

        <h1 className="text-xl font-bold text-davis-navy">
          {result.breed} · {result.pet_type}
          {result.color && ` · ${result.color}`}
        </h1>
        <p className="text-sm text-gray-500 italic mt-1">{result.coat_analysis}</p>
        {result.season_tip && (
          <p className="text-xs text-davis-gold mt-1">{result.season_tip}</p>
        )}
      </div>

      {/* Tier tabs */}
      <div className="flex gap-2 justify-center mb-4">
        {(['basic', 'advanced', 'signature'] as const).map((tier) => (
          <button
            key={tier}
            onClick={() => setSelectedTier(tier)}
            className={`tier-tab ${selectedTier === tier ? 'tier-tab-active' : 'tier-tab-inactive'}`}
          >
            {t(`tiers.${tier}`)}
          </button>
        ))}
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {result.tiers[selectedTier].steps.map((step, i) => (
          <div key={i} className="step-card">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-davis-blue">Step {i + 1} · {step.phase}</span>
            </div>
            <p className="font-bold text-davis-navy">{step.product_name}</p>
            <div className="flex gap-4 text-sm text-gray-600 mt-1">
              <span>{t('step.dilution')} {step.dilution}</span>
              <span>{t('step.dwell_time')} {step.dwell_time}</span>
            </div>
            {step.tip && <p className="text-xs text-gray-500 mt-1">{step.tip}</p>}
          </div>
        ))}
      </div>

      {/* Breed combo recommendation */}
      {comboProducts.length > 0 && (
        <div className="mt-8 border-t border-gray-100 pt-6">
          <h3 className="text-lg font-bold text-davis-navy mb-1">推薦洗護組合</h3>
          <p className="text-sm font-medium mb-4" style={{ color: '#D4A843' }}>{combo.name}</p>
          <div className="space-y-3">
            {combo.steps.map((step) => {
              const p = comboProducts.find((pr) => pr.id === step.product_key);
              return (
                <div key={step.step} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
                  <div className="w-7 h-7 rounded-full text-white flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: '#D4A843' }}>
                    {step.step}
                  </div>
                  {p && getProductImageSrc(p) && (
                    <img src={getProductImageSrc(p)!} alt={p.name_zh} className="w-12 h-12 object-contain rounded-lg flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="text-xs text-davis-blue font-medium">{step.role}</span>
                    <p className="font-medium text-davis-navy text-sm">{p?.name_zh ?? step.product_key}</p>
                  </div>
                </div>
              );
            })}
          </div>
          {combo.tips && (
            <p className="text-xs bg-yellow-50 rounded-lg p-2 mt-3" style={{ color: '#8B7000' }}>{combo.tips}</p>
          )}
        </div>
      )}

      {/* CTAs */}
      <div className="mt-8 space-y-3">
        <Link
          to="/analyze"
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-white text-lg transition-all hover:brightness-110 active:scale-95"
          style={{ backgroundColor: '#D4A843' }}
        >
          我也要分析我的寵物
        </Link>

        <a
          href="https://davistaiwan.com"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-davis-navy border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          前往 Davis Taiwan 選購 <ExternalLink size={16} />
        </a>

        <a
          href="https://line.me/R/ti/p/@davistaiwan"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-white transition-all hover:brightness-110 active:scale-95"
          style={{ backgroundColor: '#06C755' }}
        >
          <MessageCircle size={18} />
          加入 LINE 官方帳號
        </a>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-gray-400">
        <p>davistaiwan.com</p>
        <p className="mt-1">Powered by Davis Manufacturing</p>
      </div>
    </div>
  );
}
