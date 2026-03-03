import type { DavisBreed } from '@/types';

/**
 * Davis breed database — static fallback.
 * Authoritative data lives in Supabase `davis_breeds` table.
 * Used for offline breed search and tier building.
 *
 * 🔴 MIGRATION: Extract from original index.html `const BREEDS = { ... }`
 *    The original has 35+ breeds with zh/en/ja names and product mappings.
 *    Add name_cn for simplified Chinese.
 */
export const BREEDS: Record<string, DavisBreed> = {
  // Example structure — replace with migrated data:
  poodle: {
    id: 'poodle',
    name_zh: '貴賓犬',
    name_en: 'Poodle',
    name_ja: 'プードル',
    name_cn: '贵宾犬',
    pet_type: '狗',
    coat_type: '捲毛',
    emoji: '🐩',
    product_keys: ['luxury_shampoo', 'premium_color', 'moisturizing_conditioner'],
  },
  // TODO: Migrate remaining ~34 breeds from original BREEDS object
};

/** Quick lookup by Chinese name */
const BREED_BY_ZH = new Map<string, DavisBreed>();
/** Quick lookup by English name (lowercase) */
const BREED_BY_EN = new Map<string, DavisBreed>();

// Build lookup maps
Object.values(BREEDS).forEach((b) => {
  BREED_BY_ZH.set(b.name_zh, b);
  BREED_BY_EN.set(b.name_en.toLowerCase(), b);
  if (b.name_cn) BREED_BY_ZH.set(b.name_cn, b);
  if (b.name_ja) BREED_BY_ZH.set(b.name_ja, b);
});

export function findBreedByName(name: string): DavisBreed | undefined {
  return BREED_BY_ZH.get(name) ?? BREED_BY_EN.get(name.toLowerCase());
}

export function getAllBreeds(): DavisBreed[] {
  return Object.values(BREEDS);
}

export function getBreedsByType(petType: '狗' | '貓'): DavisBreed[] {
  return Object.values(BREEDS).filter((b) => b.pet_type === petType);
}
