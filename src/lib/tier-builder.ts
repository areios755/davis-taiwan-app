import type { AnalysisResult, AnalysisTier, AnalysisStep } from '@/types';
import { findBreedByName } from '@/data/breeds';
import { getProduct } from '@/data/products';
import { getCurrentSeason } from '@/data/seasons';

/**
 * Build three-tier grooming plan from breed data (no AI needed).
 * Used for breed quick-select when user doesn't upload a photo.
 *
 * Tier structure:
 *   Basic:     1st wash + conditioner (1洗1護)
 *   Advanced:  1st wash + 2nd wash + conditioner (2洗1護)
 *   Signature: 1st wash + 2nd wash + SPA 3rd wash + conditioner ×2 (3洗2護)
 */
export function buildThreeTiers(
  breedName: string,
  color?: string | null,
  colorProductHint?: string | null,
): AnalysisResult | null {
  const breed = findBreedByName(breedName);
  if (!breed) return null;

  const season = getCurrentSeason();
  const keys = breed.product_keys;

  // Product keys: [firstWash, secondWash?, conditioner, spaWash?]
  const firstWashKey = keys[0];
  const secondWashKey = keys.length >= 3 ? keys[1] : keys[0];
  const conditionerKey = keys.length >= 3 ? keys[2] : keys[1];
  const spaWashKey = keys.length >= 4 ? keys[3] : undefined;

  // If color detected and has a product hint, use it for second wash
  const colorSecondWash = colorProductHint ? colorProductHint : undefined;

  const basic = buildBasicTier(firstWashKey, conditionerKey);
  const advanced = buildAdvancedTier(firstWashKey, colorSecondWash ?? secondWashKey, conditionerKey);
  const signature = buildSignatureTier(firstWashKey, colorSecondWash ?? secondWashKey, spaWashKey, conditionerKey, season.id);

  return {
    breed: breed.name_zh,
    pet_type: breed.pet_type,
    coat_analysis: `依${breed.coat_type}品種特徵推薦`,
    color: color ?? undefined,
    season_tip: season.description_zh,
    tiers: { basic, advanced, signature },
    source: 'breed_select',
  };
}

function makeStep(phase: string, productKeyOrName: string): AnalysisStep {
  const product = getProduct(productKeyOrName);
  return {
    phase,
    product_name: product?.name_zh ?? productKeyOrName,
    dilution: product?.dilution ?? '10:1',
    dwell_time: product?.dwell_time ?? '5min',
    tip: product?.reason_zh,
  };
}

function buildBasicTier(firstWash: string, conditioner: string): AnalysisTier {
  return {
    level: 'basic',
    label: '基礎洗',
    description: '日常清潔保養，1洗1護',
    steps: [
      makeStep('第一洗', firstWash),
      makeStep('護毛素', conditioner),
    ],
  };
}

function buildAdvancedTier(firstWash: string, secondWash: string, conditioner: string): AnalysisTier {
  return {
    level: 'advanced',
    label: '進階洗',
    description: '加強功能性護理，2洗1護',
    steps: [
      makeStep('第一洗', firstWash),
      makeStep('第二洗', secondWash),
      makeStep('護毛素', conditioner),
    ],
  };
}

function buildSignatureTier(
  firstWash: string,
  secondWash: string,
  spaWash: string | undefined,
  conditioner: string,
  _season: string,
): AnalysisTier {
  const steps: AnalysisStep[] = [
    makeStep('第一洗', firstWash),
    makeStep('第二洗', secondWash),
  ];

  if (spaWash) {
    steps.push(makeStep('SPA第三洗', spaWash));
  }

  steps.push(makeStep('護毛素', conditioner));
  steps.push(makeStep('護毛素(二)', conditioner)); // Double conditioning for signature

  return {
    level: 'signature',
    label: '完美SPA',
    description: '頂級全方位護理，3洗2護',
    steps,
  };
}
