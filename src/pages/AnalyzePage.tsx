import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useEmbed } from '@/hooks/useEmbed';
import { analyzePhoto, logEvent, createShare } from '@/lib/api';
import { processImage } from '@/lib/image-processor';
import { searchBreeds, parseBreedInput } from '@/lib/breed-matcher';
import { buildThreeTiers } from '@/lib/tier-builder';
import { postEmbedResult, postEmbedReady } from '@/lib/embed-messaging';
import { getCurrentSeason } from '@/data/seasons';
import { fetchBreeds } from '@/data/breeds';
import type { AnalysisResult, TierLevel, AppLocale, DavisBreed } from '@/types';
import { getBreedCombo, getComboProducts } from '@/lib/breed-combos';
import { PRODUCTS, PRODUCT_NAME_MAP } from '@/data/products';
import { generateShareCard, shareOrDownload, compressPhotoForShare } from '@/lib/share-card-generator';
import { Camera, Search, ExternalLink, MessageCircle, Image, Link2, Download, X } from 'lucide-react';

type Phase = 'upload' | 'analyzing' | 'result' | 'error';
type CardSize = 'post' | 'story';

export default function AnalyzePage() {
  const { t, i18n } = useTranslation();
  const embed = useEmbed();

  const [phase, setPhase] = useState<Phase>('upload');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [selectedTier, setSelectedTier] = useState<TierLevel>('advanced');
  const [error, setError] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [breedQuery, setBreedQuery] = useState(embed.breed ?? '');
  const [analyzingStep, setAnalyzingStep] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [breeds, setBreeds] = useState<DavisBreed[]>([]);
  const [breedTab, setBreedTab] = useState<'dog' | 'cat'>('dog');
  const [cardBlob, setCardBlob] = useState<Blob | null>(null);
  const [cardPreview, setCardPreview] = useState<string | null>(null);
  const [cardSize, setCardSize] = useState<CardSize>('post');
  const [generatingCard, setGeneratingCard] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load breeds dynamically
  useEffect(() => {
    fetchBreeds().then(setBreeds);
  }, []);

  // Notify parent that embed is ready
  useEffect(() => {
    if (embed.isEmbed) {
      postEmbedReady();
      if (embed.lang) i18n.changeLanguage(embed.lang);
    }
  }, [embed.isEmbed, embed.lang, i18n]);

  // Handle photo upload
  const handleFileSelect = useCallback(async (file: File) => {
    try {
      const preview = URL.createObjectURL(file);
      setImagePreview(preview);
      setPhase('analyzing');

      // Keep full-res data URL for share card generation
      const reader = new FileReader();
      reader.onload = () => setPhotoDataUrl(reader.result as string);
      reader.readAsDataURL(file);

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
    postEmbedResult(result, selectedTier, embed.hotel, embed.weight ?? null, embed.breed_group_id);
  }, [result, selectedTier, embed]);

  // Generate share card
  const handleGenerateCard = useCallback(async (size: CardSize) => {
    if (!result) return;
    setGeneratingCard(true);
    setCardSize(size);
    try {
      const combo = getBreedCombo(result.breed, result.color);
      const blob = await generateShareCard({
        breed: result.breed,
        petType: result.pet_type,
        color: result.color,
        coatAnalysis: result.coat_analysis,
        combo,
        photoDataUrl: photoDataUrl,
      }, size);
      setCardBlob(blob);
      const url = URL.createObjectURL(blob);
      setCardPreview(url);
    } catch {
      // Fallback: generate without photo
      const combo = getBreedCombo(result.breed, result.color);
      const blob = await generateShareCard({
        breed: result.breed,
        petType: result.pet_type,
        color: result.color,
        coatAnalysis: result.coat_analysis,
        combo,
      }, size);
      setCardBlob(blob);
      setCardPreview(URL.createObjectURL(blob));
    }
    setGeneratingCard(false);
  }, [result, photoDataUrl]);

  // Share link (copy)
  const handleCopyLink = useCallback(async () => {
    if (!result) return;
    setSharing(true);

    // Include compressed photo in result_data
    let shareResult: Record<string, unknown> = { ...result };
    if (photoDataUrl) {
      try {
        const compressed = await compressPhotoForShare(photoDataUrl);
        shareResult = { ...result, photo_data: compressed };
      } catch { /* skip photo */ }
    }

    const res = await createShare({ result: shareResult, breed: result.breed, tier: selectedTier });
    if (res.success && res.data) {
      const url = `${window.location.origin}/r/${res.data.id}`;
      setShareUrl(url);
      await navigator.clipboard.writeText(url).catch(() => {});
    }
    setSharing(false);
  }, [result, selectedTier, photoDataUrl]);

  // Save / share card
  const handleSaveCard = useCallback(async () => {
    if (!cardBlob) return;
    const filename = `davis-${result?.breed ?? 'pet'}-${cardSize}.jpg`;
    await shareOrDownload(cardBlob, filename, `Davis AI - ${result?.breed ?? ''}`);
  }, [cardBlob, cardSize, result]);

  // Drag & drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragOver(true); }, []);
  const handleDragLeave = useCallback(() => setDragOver(false), []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleFileSelect(file);
  }, [handleFileSelect]);

  const breedResults = breedQuery ? searchBreeds(breedQuery) : [];
  const commonBreeds = breeds.filter((b) => b.pet_type === (breedTab === 'dog' ? '狗' : '貓'));

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
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-davis-blue bg-davis-light/50' : 'border-davis-blue/30 hover:border-davis-blue/60'
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Camera className="mx-auto text-davis-blue mb-3" size={48} />
            <p className="font-medium text-davis-navy">{t('analyze.upload_title')}</p>
            <p className="text-sm text-gray-500">{t('analyze.upload_hint')}</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
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
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => setBreedTab('dog')}
                  className={`text-xs px-3 py-1 rounded-full ${breedTab === 'dog' ? 'bg-davis-blue text-white' : 'bg-gray-100 text-gray-600'}`}
                >
                  {t('common.dog')}
                </button>
                <button
                  onClick={() => setBreedTab('cat')}
                  className={`text-xs px-3 py-1 rounded-full ${breedTab === 'cat' ? 'bg-davis-blue text-white' : 'bg-gray-100 text-gray-600'}`}
                >
                  {t('common.cat')}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {commonBreeds.map((breed) => (
                  <button
                    key={breed.id}
                    onClick={() => handleBreedSelect(breed.name_zh)}
                    className="px-3 py-1.5 bg-gray-100 rounded-full text-sm hover:bg-davis-light transition-colors"
                  >
                    {breed.emoji && `${breed.emoji} `}{breed.name_zh}
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
            {result.tiers[selectedTier].steps.map((step, i) => {
              const productKey = PRODUCT_NAME_MAP[step.product_name] ?? step.product_name;
              const product = PRODUCTS[productKey];
              return (
                <div key={i} className="step-card">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-davis-blue">Step {i + 1} · {step.phase}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    {product?.image_url && (
                      <img
                        src={product.image_url}
                        alt={step.product_name}
                        className="w-[72px] h-[72px] object-contain rounded-lg bg-gray-50 border border-gray-100 flex-shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-davis-navy">{step.product_name}</p>
                      {product?.name_en && (
                        <p className="text-xs text-gray-400">{product.name_en}</p>
                      )}
                      <div className="flex gap-4 text-sm text-gray-600 mt-1">
                        <span>💧 {t('step.dilution')} {step.dilution}</span>
                        <span>⏱ {t('step.dwell_time')} {step.dwell_time}</span>
                      </div>
                      {step.tip && <p className="text-xs text-gray-500 mt-1">💡 {step.tip}</p>}
                    </div>
                  </div>
                  <a
                    href="https://davistaiwan.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg text-white transition-all hover:brightness-110"
                    style={{ backgroundColor: '#D4A843' }}
                  >
                    前往選購 <ExternalLink size={12} />
                  </a>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            {embed.isEmbed ? (
              <button onClick={handleEmbedConfirm} className="btn-davis-gold w-full text-lg">
                {t('embed.confirm')}
              </button>
            ) : (
              <>
                <button onClick={() => { setPhase('upload'); setResult(null); setShareUrl(null); setCardPreview(null); setCardBlob(null); setPhotoDataUrl(null); }} className="btn-davis-outline flex-1">
                  {t('analyze.retry')}
                </button>
                <button
                  onClick={() => handleGenerateCard('post')}
                  disabled={generatingCard}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-white transition-all disabled:opacity-50"
                  style={{ backgroundColor: '#D4A843' }}
                >
                  <Image size={16} />
                  {generatingCard ? '生成中...' : '製作分享卡片'}
                </button>
              </>
            )}
          </div>

          {/* Secondary: copy link */}
          {!embed.isEmbed && (
            <div className="flex gap-3">
              <button
                onClick={handleCopyLink}
                disabled={sharing}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-davis-blue border border-davis-blue/20 hover:bg-davis-light transition-colors disabled:opacity-50"
              >
                <Link2 size={14} />
                {sharing ? '...' : shareUrl ? '已複製連結' : '複製連結'}
              </button>
            </div>
          )}

          {shareUrl && (
            <div className="bg-davis-light rounded-xl p-3 text-center text-sm">
              <p className="text-davis-navy font-medium mb-1">分享連結已複製</p>
              <p className="text-davis-blue break-all text-xs">{shareUrl}</p>
            </div>
          )}

          {/* Card preview modal */}
          {cardPreview && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => { setCardPreview(null); setCardBlob(null); }}>
              <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                  <h3 className="font-bold text-davis-navy">分享卡片預覽</h3>
                  <button onClick={() => { setCardPreview(null); setCardBlob(null); }} className="text-gray-400 hover:text-gray-600">
                    <X size={20} />
                  </button>
                </div>

                {/* Size toggle */}
                <div className="flex gap-2 justify-center p-3">
                  {(['post', 'story'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => handleGenerateCard(s)}
                      disabled={generatingCard}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        cardSize === s ? 'bg-davis-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {s === 'post' ? 'IG 貼文 (4:5)' : 'IG 限動 (9:16)'}
                    </button>
                  ))}
                </div>

                {/* Preview image */}
                <div className="px-4 pb-3">
                  {generatingCard ? (
                    <div className="flex items-center justify-center py-16">
                      <div className="animate-spin w-8 h-8 border-2 border-davis-gold border-t-transparent rounded-full" />
                    </div>
                  ) : (
                    <img src={cardPreview} alt="Share card" className="w-full rounded-lg shadow-md" />
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 p-4 pt-0">
                  <button
                    onClick={handleSaveCard}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-white transition-all hover:brightness-110"
                    style={{ backgroundColor: '#D4A843' }}
                  >
                    <Download size={16} />
                    儲存 / 分享
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Breed combo recommendation */}
          {(() => {
            const combo = getBreedCombo(result.breed, result.color);
            const comboProducts = getComboProducts(combo);
            if (comboProducts.length === 0) return null;
            return (
              <div className="mt-8 border-t border-gray-100 pt-6">
                <h3 className="text-lg font-bold text-davis-navy mb-2">為您推薦的洗護組合</h3>
                <div className="mb-4">
                  <p className="text-sm font-bold text-[#D4A843]">{combo.name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{combo.description}</p>
                </div>
                <div className="space-y-3">
                  {combo.steps.map((step) => {
                    const p = comboProducts.find((pr) => pr.id === step.product_key);
                    return (
                      <div key={step.step} className="flex items-start gap-3 bg-gray-50 border border-gray-100 rounded-xl p-4 shadow-sm">
                        <div className="flex flex-col items-center gap-2 flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-davis-navy text-[#D4A843] flex items-center justify-center text-sm font-bold">
                            {step.step}
                          </div>
                          {p?.image_url && (
                            <img src={p.image_url} alt={p.name_zh} className="w-[72px] h-[72px] object-contain rounded-lg bg-white border border-gray-100" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-xs text-davis-blue font-medium">{step.role}</span>
                          <p className="font-bold text-davis-navy text-base leading-tight mt-0.5">{p?.name_zh ?? step.product_key}</p>
                          {p?.name_en && (
                            <p className="text-xs text-gray-400 mt-0.5">{p.name_en}</p>
                          )}
                          <div className="flex gap-3 mt-1.5 text-xs">
                            {p?.dilution && (
                              <span className="text-[#D4A843] font-medium">稀釋 {p.dilution}</span>
                            )}
                            {p?.dwell_time && (
                              <span className="text-[#D4A843] font-medium">停留 {p.dwell_time}</span>
                            )}
                          </div>
                          {step.note && <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{step.note}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {combo.tips && (
                  <div className="mt-3 bg-[#FDF8EF] rounded-xl px-4 py-3">
                    <p className="text-sm text-[#5D4E37]">💡 {combo.tips}</p>
                  </div>
                )}
                <a
                  href="https://davistaiwan.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-white transition-all duration-200 hover:brightness-110 active:scale-95"
                  style={{ backgroundColor: '#D4A843' }}
                >
                  前往 Davis Taiwan 選購
                  <ExternalLink size={16} />
                </a>
              </div>
            );
          })()}

          {/* LINE CTA */}
          {!embed.isEmbed && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500 mb-3">想了解更多？加入 Davis Taiwan LINE</p>
              <a
                href="https://line.me/R/ti/p/@davistaiwan"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-white transition-all duration-200 hover:brightness-110 active:scale-95"
                style={{ backgroundColor: '#06C755' }}
              >
                <MessageCircle size={18} />
                加入 LINE 官方帳號
              </a>
            </div>
          )}
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
