import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useEmbed } from '@/hooks/useEmbed';
import { analyzePhoto, logEvent } from '@/lib/api';
import { processImage } from '@/lib/image-processor';
import { searchBreeds, parseBreedInput } from '@/lib/breed-matcher';
import { buildThreeTiers } from '@/lib/tier-builder';
import { postEmbedResult, postEmbedReady } from '@/lib/embed-messaging';
import { getCurrentSeason } from '@/data/seasons';
import type { AnalysisResult, TierLevel, AppLocale } from '@/types';
import { Camera, Upload, Search } from 'lucide-react';
import { useEffect } from 'react';

type Phase = 'upload' | 'analyzing' | 'result' | 'error';

export default function AnalyzePage() {
  const { t, i18n } = useTranslation();
  const embed = useEmbed();

  const [phase, setPhase] = useState<Phase>('upload');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [selectedTier, setSelectedTier] = useState<TierLevel>('advanced');
  const [error, setError] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [breedQuery, setBreedQuery] = useState(embed.breed ?? '');
  const [analyzingStep, setAnalyzingStep] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Notify parent that embed is ready
  useEffect(() => {
    if (embed.isEmbed) {
      postEmbedReady();
      // Auto-set language from embed param
      if (embed.lang) i18n.changeLanguage(embed.lang);
    }
  }, [embed.isEmbed, embed.lang, i18n]);

  // Handle photo upload
  const handleFileSelect = useCallback(async (file: File) => {
    try {
      const preview = URL.createObjectURL(file);
      setImagePreview(preview);
      setPhase('analyzing');

      const base64 = await processImage(file);
      const season = getCurrentSeason();

      // Simulate progressive steps
      const steps = [0, 1, 2, 3, 4];
      for (const step of steps) {
        setAnalyzingStep(step);
        await new Promise((r) => setTimeout(r, 800));
      }

      const response = await analyzePhoto({
        image: base64,
        breed: embed.breed,
        weight: embed.weight,
        lang: i18n.language as AppLocale,
        hotel: embed.hotel,
        season: season.id,
      });

      if (response.success && response.data) {
        setResult(response.data.result);
        setPhase('result');
        logEvent({
          type: 'analyze',
          breed: response.data.result.breed,
          tier: 'advanced',
          hotel: embed.hotel,
          lang: i18n.language,
          input_tokens: response.data.tokens?.input,
          output_tokens: response.data.tokens?.output,
        });
      } else {
        setError(response.error ?? t('common.error'));
        setPhase('error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
      setPhase('error');
    }
  }, [embed, i18n, t]);

  // Handle breed quick-select
  const handleBreedSelect = useCallback((breedName: string) => {
    const parsed = parseBreedInput(breedName);
    const tierResult = buildThreeTiers(parsed.breed, parsed.color, parsed.productHint);

    if (tierResult) {
      setResult(tierResult);
      setPhase('result');
      logEvent({
        type: 'breed_select',
        breed: parsed.breed,
        hotel: embed.hotel,
        lang: i18n.language,
      });
    } else {
      setError(`找不到品種: ${breedName}`);
      setPhase('error');
    }
  }, [embed.hotel, i18n.language]);

  // Handle embed confirm
  const handleEmbedConfirm = useCallback(() => {
    if (!result || !embed.hotel) return;
    postEmbedResult(result, selectedTier, embed.hotel, embed.weight ?? null);
  }, [result, selectedTier, embed]);

  const breedResults = breedQuery ? searchBreeds(breedQuery) : [];

  return (
    <div className={`max-w-lg mx-auto ${embed.isEmbed ? 'p-2' : 'p-4 py-8'}`}>
      {/* Embed info bar */}
      {embed.isEmbed && embed.breed && (
        <div className="bg-davis-light rounded-lg px-4 py-2 mb-4 text-sm flex items-center gap-2">
          <span>🐾</span>
          <span className="font-medium">{embed.breed}</span>
          {embed.weight && <span>{embed.weight}kg</span>}
          {embed.store_name && <span className="text-gray-500">· {embed.store_name}</span>}
          {embed.pet_name && <span className="text-davis-gold">{embed.pet_name}</span>}
        </div>
      )}

      {/* Phase: Upload */}
      {phase === 'upload' && (
        <div className="space-y-6">
          {/* Photo upload area */}
          <div
            className="border-2 border-dashed border-davis-blue/30 rounded-2xl p-8 text-center cursor-pointer hover:border-davis-blue/60 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="mx-auto text-davis-blue mb-3" size={48} />
            <p className="font-medium text-davis-navy">{t('analyze.upload_title')}</p>
            <p className="text-sm text-gray-500">{t('analyze.upload_hint')}</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />
          </div>

          {/* Breed search */}
          <div>
            <p className="text-center text-gray-400 text-sm mb-4">─── {t('analyze.or_breed')} ───</p>
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                type="text"
                value={breedQuery}
                onChange={(e) => setBreedQuery(e.target.value)}
                placeholder={t('analyze.search_placeholder')}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-davis-blue/30"
              />
            </div>

            {/* Search results */}
            {breedResults.length > 0 && (
              <div className="mt-2 border border-gray-100 rounded-xl overflow-hidden">
                {breedResults.map((r) => (
                  <button
                    key={r.breed}
                    onClick={() => handleBreedSelect(r.breed)}
                    className="w-full text-left px-4 py-3 hover:bg-davis-light transition-colors border-b border-gray-50 last:border-0"
                  >
                    <span className="font-medium">{r.display}</span>
                    {r.color && <span className="text-sm text-davis-gold ml-2">({r.color})</span>}
                  </button>
                ))}
              </div>
            )}

            {/* Common breed chips */}
            <div className="mt-4">
              <p className="text-xs text-gray-400 mb-2">{t('analyze.common_breeds')}</p>
              <div className="flex flex-wrap gap-2">
                {/* 🔴 MIGRATION: Populate from BREEDS data */}
                {['貴賓犬', '比熊犬', '柴犬', '柯基', '布偶貓', '英國短毛貓', '金吉拉'].map((breed) => (
                  <button
                    key={breed}
                    onClick={() => handleBreedSelect(breed)}
                    className="px-3 py-1.5 bg-gray-100 rounded-full text-sm hover:bg-davis-light transition-colors"
                  >
                    {breed}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Manual start button (when breed is from embed) */}
          {embed.breed && (
            <button onClick={() => handleBreedSelect(embed.breed!)} className="btn-davis w-full">
              {t('analyze.start_analysis')}
            </button>
          )}
        </div>
      )}

      {/* Phase: Analyzing */}
      {phase === 'analyzing' && (
        <div className="text-center py-12 space-y-4">
          {imagePreview && (
            <div className="relative w-48 h-48 mx-auto rounded-xl overflow-hidden mb-6">
              <img src={imagePreview} alt="" className="w-full h-full object-cover" />
              <div className="scan-line" />
            </div>
          )}
          {[
            t('analyze.analyzing_breed'),
            t('analyze.analyzing_coat'),
            t('analyze.analyzing_products'),
            t('analyze.analyzing_season'),
            t('analyze.analyzing_plan'),
          ].map((text, i) => (
            <div key={i} className={`flex items-center gap-3 justify-center transition-opacity ${i <= analyzingStep ? 'opacity-100' : 'opacity-30'}`}>
              <div className={`pulse-dot ${i === analyzingStep ? '' : i < analyzingStep ? 'bg-green-500' : ''}`} />
              <span className="text-sm">{i < analyzingStep ? '✅' : ''} {text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Phase: Result */}
      {phase === 'result' && result && (
        <div className="space-y-4">
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold text-davis-navy">{t('analyze.result_title')}</h2>
            <p className="text-sm text-gray-600">
              🐾 {result.breed} · {result.pet_type}
              {result.color && ` · ${result.color}`}
            </p>
            <p className="text-sm text-gray-500 italic">💬 {result.coat_analysis}</p>
            {result.season_tip && (
              <p className="text-xs text-davis-gold mt-1">🌿 {result.season_tip}</p>
            )}
          </div>

          {/* Tier tabs */}
          <div className="flex gap-2 justify-center">
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

          {/* Selected tier steps */}
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

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            {embed.isEmbed ? (
              <button onClick={handleEmbedConfirm} className="btn-davis-gold w-full text-lg">
                {t('embed.confirm')}
              </button>
            ) : (
              <>
                <button onClick={() => { setPhase('upload'); setResult(null); }} className="btn-davis-outline flex-1">
                  {t('analyze.retry')}
                </button>
                <button className="btn-davis flex-1">
                  <Upload className="mr-2" size={16} />
                  {t('analyze.share')}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Phase: Error */}
      {phase === 'error' && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">😿</div>
          <p className="font-medium text-gray-700 mb-2">{error}</p>
          <button onClick={() => { setPhase('upload'); setError(''); }} className="btn-davis mt-4">
            {t('analyze.retry')}
          </button>
        </div>
      )}
    </div>
  );
}
