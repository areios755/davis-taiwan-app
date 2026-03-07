import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getShare } from '@/lib/api';
import type { AnalysisResult, TierLevel } from '@/types';

export default function ShareViewPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [selectedTier, setSelectedTier] = useState<TierLevel>('advanced');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) { setError('缺少分享 ID'); setLoading(false); return; }

    getShare(id).then((res) => {
      if (res.success && res.data) {
        const share = (res.data as Record<string, unknown>).share as Record<string, unknown>;
        if (share?.result_data) {
          setResult(share.result_data as AnalysisResult);
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

  return (
    <div className="max-w-lg mx-auto p-4 py-8">
      {/* Header */}
      <div className="text-center mb-6">
        <p className="text-xs text-davis-blue font-medium mb-1">Davis AI 洗護方案分享</p>
        <h1 className="text-xl font-bold text-davis-navy">{t('analyze.result_title')}</h1>
        <p className="text-sm text-gray-600 mt-1">
          🐾 {result.breed} · {result.pet_type}
          {result.color && ` · ${result.color}`}
        </p>
        <p className="text-sm text-gray-500 italic mt-1">💬 {result.coat_analysis}</p>
        {result.season_tip && (
          <p className="text-xs text-davis-gold mt-1">🌿 {result.season_tip}</p>
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
              <span>💧 {t('step.dilution')} {step.dilution}</span>
              <span>⏱ {t('step.dwell_time')} {step.dwell_time}</span>
            </div>
            {step.tip && <p className="text-xs text-gray-500 mt-1">💡 {step.tip}</p>}
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-8 text-center">
        <Link to="/analyze" className="btn-davis text-lg">
          🐾 我也要分析我的寵物
        </Link>
      </div>
    </div>
  );
}
