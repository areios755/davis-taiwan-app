import type { DavisProduct } from '@/types';

/**
 * Davis product database — static fallback.
 * Authoritative data lives in Supabase `davis_products` table.
 * This static copy is used for offline breed-select tier building.
 *
 * 🔴 MIGRATION: Extract from original index.html `const PRODUCTS = { ... }`
 *    The original has ~15 products with zh/en/ja translations.
 *    Add name_cn / tag_cn / reason_cn / note_cn for simplified Chinese.
 */
export const PRODUCTS: Record<string, DavisProduct> = {
  // Example structure — replace with migrated data:
  luxury_shampoo: {
    id: 'luxury_shampoo',
    name_zh: '奢華洗劑',
    name_en: 'Luxury Shampoo',
    name_ja: 'ラグジュアリーシャンプー',
    name_cn: '奢华洗剂',
    category: 'shampoo',
    tag_zh: '深層清潔',
    tag_en: 'Deep Clean',
    tag_ja: 'ディープクレンジング',
    tag_cn: '深层清洁',
    reason_zh: '體味偏重犬首選',
    reason_en: 'Best for dogs with strong body odor',
    reason_ja: '体臭が強い犬に最適',
    reason_cn: '体味偏重犬首选',
    dilution: '12:1',
    dwell_time: '5-8min',
  },
  // TODO: Migrate remaining ~14 products from original PRODUCTS object
};

/**
 * Product name normalization map.
 * AI responses may use slightly different names — map them to canonical keys.
 *
 * 🔴 MIGRATION: Extract from original product-name mapping logic.
 */
export const PRODUCT_NAME_MAP: Record<string, string> = {
  '奢華洗劑': 'luxury_shampoo',
  'Luxury Shampoo': 'luxury_shampoo',
  '奢华洗剂': 'luxury_shampoo',
  // TODO: Add all product name variants
};

/** Look up a product by canonical key */
export function getProduct(key: string): DavisProduct | undefined {
  return PRODUCTS[key];
}

/** Normalize an AI-returned product name to a canonical key */
export function normalizeProductName(name: string): string {
  return PRODUCT_NAME_MAP[name.trim()] ?? name;
}
