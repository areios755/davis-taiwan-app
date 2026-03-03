import { COLOR_KEYWORDS } from '@/data/color-keywords';
import { getAllBreeds, findBreedByName } from '@/data/breeds';
import type { DavisBreed } from '@/types';

export interface BreedSearchResult {
  breed: string;
  breedData?: DavisBreed;
  color?: string;
  colorProductHint?: string | null;
  display: string;
  matchType: 'exact' | 'fuzzy' | 'color_parsed';
}

/**
 * Parse user input to extract breed + optional coat color.
 * Examples:
 *   "紅貴賓"  → { breed: "貴賓犬", color: "紅棕色", productHint: "高級炫彩洗劑" }
 *   "奶油英短" → { breed: "英國短毛貓", color: "奶油白", productHint: "高級炫彩洗劑" }
 *   "柴犬"    → { breed: "柴犬", color: null }
 */
export function parseBreedInput(input: string): {
  breed: string;
  color: string | null;
  productHint: string | null;
} {
  const trimmed = input.trim();

  // Try each color keyword (longest first to avoid partial matches)
  const sortedColors = [...COLOR_KEYWORDS].sort((a, b) => b.keyword.length - a.keyword.length);

  for (const ck of sortedColors) {
    if (trimmed.includes(ck.keyword)) {
      const breedPart = trimmed.replace(ck.keyword, '').trim();
      if (breedPart.length > 0) {
        const matched = fuzzyMatchBreed(breedPart);
        if (matched) {
          return { breed: matched.name_zh, color: ck.zh, productHint: ck.product_hint };
        }
      }
    }
  }

  // No color detected — try direct breed match
  const matched = fuzzyMatchBreed(trimmed);
  return {
    breed: matched?.name_zh ?? trimmed,
    color: null,
    productHint: null,
  };
}

/**
 * Fuzzy match a breed name across all languages.
 */
export function fuzzyMatchBreed(query: string): DavisBreed | undefined {
  if (!query) return undefined;
  const q = query.toLowerCase().trim();
  const breeds = getAllBreeds();

  // Exact match first
  const exact = findBreedByName(query);
  if (exact) return exact;

  // Fuzzy: contains match
  return breeds.find(
    (b) =>
      b.name_zh.includes(q) ||
      q.includes(b.name_zh) ||
      b.name_en.toLowerCase().includes(q) ||
      b.name_ja?.includes(q) ||
      b.name_cn?.includes(q),
  );
}

/**
 * Search breeds with query, returning ranked results.
 */
export function searchBreeds(query: string, limit = 10): BreedSearchResult[] {
  if (!query.trim()) return [];

  // First check if it's a color+breed combo
  const parsed = parseBreedInput(query);
  if (parsed.color && parsed.breed) {
    const breedData = findBreedByName(parsed.breed);
    return [
      {
        breed: parsed.breed,
        breedData,
        color: parsed.color,
        colorProductHint: parsed.productHint,
        display: `${parsed.breed} ${breedData?.emoji ?? ''} (${parsed.color})`,
        matchType: 'color_parsed',
      },
    ];
  }

  // Otherwise do fuzzy search
  const q = query.toLowerCase().trim();
  const breeds = getAllBreeds();
  const results: BreedSearchResult[] = [];

  for (const b of breeds) {
    const isMatch =
      b.name_zh.includes(q) ||
      b.name_en.toLowerCase().includes(q) ||
      b.name_ja?.includes(q) ||
      b.name_cn?.includes(q);

    if (isMatch) {
      const isExact = b.name_zh === query || b.name_en.toLowerCase() === q;
      results.push({
        breed: b.name_zh,
        breedData: b,
        display: `${b.name_zh} ${b.emoji ?? ''} (${b.name_en})`,
        matchType: isExact ? 'exact' : 'fuzzy',
      });
    }
  }

  // Sort: exact matches first
  results.sort((a, b) => (a.matchType === 'exact' ? -1 : 1) - (b.matchType === 'exact' ? -1 : 1));

  return results.slice(0, limit);
}
