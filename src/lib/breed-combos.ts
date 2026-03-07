import { PRODUCTS } from '@/data/products';
import type { DavisProduct } from '@/types';

export interface ComboStep {
  step: number;
  role: string;
  product_key: string;
  note?: string;
}

export interface ProductCombo {
  id: string;
  name: string;
  description: string;
  target_breeds: string[];
  target_needs: string;
  steps: ComboStep[];
  tips?: string;
}

// ============================================================
// Static fallback data
// ============================================================

const STATIC_COMBOS: ProductCombo[] = [
  {
    id: 'fluffy_styling', name: '蓬鬆造型組合',
    description: '毛根立體支撐，造型持久蓬鬆',
    target_breeds: ['poodle', 'bichon', 'pomeranian', 'schnauzer', 'westie'],
    target_needs: '需要毛根立體，洗護後有拉毛修剪需求',
    steps: [
      { step: 1, role: '清潔', product_key: 'heavy_duty_clean', note: '洗護頻率>20天用強效洗劑，<20天用泡沫柑橘' },
      { step: 2, role: '功能', product_key: 'natural_elastic', note: '白色用高級炫彩洗劑，追求蓬鬆用天然洋李洗劑' },
      { step: 3, role: '護毛素', product_key: 'spa_deep_clean', note: '純粹全效護毛素' },
    ],
    tips: '需要毛根立體，洗護後有拉毛修剪需求',
  },
  {
    id: 'long_coat_smooth', name: '長毛柔順組合',
    description: '防打結，降低梳理阻力，長毛柔順亮麗',
    target_breeds: ['shih_tzu', 'maltese', 'yorkie', 'maltipoo', 'papillon'],
    target_needs: '長毛犬種防打結，降低梳理阻力',
    steps: [
      { step: 1, role: '清潔', product_key: 'degrease_deep_clean', note: '泡沫柑橘洗劑' },
      { step: 2, role: '功能', product_key: 'detangling', note: '日常用柔順洗劑，進階用薰衣草洗劑' },
      { step: 3, role: '護毛素', product_key: 'natural_elastic', note: '日常用滋潤護毛素，進階用高級皮毛護理霜' },
    ],
    tips: '防打結，降低梳理阻力',
  },
  {
    id: 'deshed_combo', name: '換毛季組合',
    description: '減少浮毛，提升梳理效率，換毛季必備',
    target_breeds: ['corgi', 'labrador', 'golden', 'shiba', 'husky', 'samoyed', 'border_collie', 'german_shepherd', 'bernese', 'akita'],
    target_needs: '雙層毛換毛季掉毛嚴重',
    steps: [
      { step: 1, role: '清潔', product_key: 'heavy_duty_clean', note: '洗護頻率>15天用強效洗劑，<15天用泡沫柑橘' },
      { step: 2, role: '功能', product_key: 'deshed_dog', note: '防脫毛洗劑' },
      { step: 3, role: '護毛素', product_key: 'deshed_rinse', note: '防脫毛乳液' },
    ],
    tips: '換毛季必備，減少浮毛提升梳理效率',
  },
  {
    id: 'black_coat', name: '黑色系護色組合',
    description: '黑色毛髮護色固色，保持深邃光澤',
    target_breeds: [],
    target_needs: '黑色毛髮（黑貴賓、黑柴、黑拉布拉多等）',
    steps: [
      { step: 1, role: '清潔', product_key: 'degrease_deep_clean', note: '泡沫柑橘洗劑' },
      { step: 2, role: '功能', product_key: 'black_coat_shampoo', note: '炫黑洗劑' },
      { step: 3, role: '護毛素', product_key: 'detangling', note: '滋潤護毛素' },
    ],
    tips: '黑色毛髮需要油脂保護，洗護過程注意補水',
  },
  {
    id: 'red_brown_coat', name: '紅棕色系護色組合',
    description: '提亮紅棕色毛色，維持飽滿光澤',
    target_breeds: [],
    target_needs: '紅棕色毛髮（紅貴賓、杏色貴賓、橘色博美等）',
    steps: [
      { step: 1, role: '清潔', product_key: 'heavy_duty_clean', note: '洗護頻率>20天用強效洗劑，<20天用泡沫柑橘' },
      { step: 2, role: '功能', product_key: 'white_coat_brighten', note: '高級炫彩洗劑' },
      { step: 3, role: '護毛素', product_key: 'natural_elastic', note: '需要拉毛修毛用純粹護毛素，其他用滋潤護毛素' },
    ],
    tips: '深色系都用炫黑，紅棕色用炫彩提亮',
  },
  {
    id: 'white_coat', name: '白毛護色組合',
    description: '抗氧化提亮，維持白毛亮麗不泛黃',
    target_breeds: [],
    target_needs: '白色毛髮（白貴賓、比熊、白博美等）',
    steps: [
      { step: 1, role: '清潔', product_key: 'heavy_duty_clean', note: '洗護頻率>20天用強效洗劑，<20天用泡沫柑橘' },
      { step: 2, role: '功能', product_key: 'white_coat_brighten', note: '高級炫彩洗劑抗氧化提亮' },
      { step: 3, role: '護毛素', product_key: 'spa_deep_clean', note: '純粹全效護毛素' },
    ],
    tips: '白毛需要持續使用炫彩洗劑才能看到效果',
  },
  {
    id: 'short_coat_oily', name: '短毛油脂組合',
    description: '控油清潔，水油平衡，適合短毛油脂犬種',
    target_breeds: ['french_bulldog', 'english_bulldog', 'beagle', 'pug', 'dachshund', 'min_pin', 'jack_russell', 'pitbull', 'dalmatian'],
    target_needs: '短毛油脂偏多，需要控油止癢',
    steps: [
      { step: 1, role: '清潔', product_key: 'oatmeal_gentle_clean', note: '第二步用茶樹油的話→蘇打燕麥；其他→泡沫柑橘' },
      { step: 2, role: '功能', product_key: 'humid_oil_control', note: '茶樹精油洗劑控油止癢' },
      { step: 3, role: '護毛素', product_key: 'deshed_rinse', note: '有掉毛問題用防脫毛乳液，掉毛不嚴重用燕麥免洗護毛素' },
    ],
    tips: '注意水油平衡，去油同時要注意補水',
  },
  {
    id: 'sensitive_puppy', name: '敏感肌/幼犬組合',
    description: '溫和低敏，適合幼犬、老年犬及過敏體質',
    target_breeds: ['puppy', 'chihuahua'],
    target_needs: '幼犬、老年犬、容易過敏犬貓',
    steps: [
      { step: 1, role: '清潔', product_key: 'oatmeal_baking_soda', note: '蘇打燕麥洗劑' },
      { step: 2, role: '功能', product_key: 'melon_shampoo', note: '甜瓜洗劑或低敏洗劑' },
      { step: 3, role: '護毛素', product_key: 'hypoallergenic_daily', note: '短毛用燕麥免洗護毛素，長毛用純粹護毛素' },
    ],
    tips: '燕麥止癢補水適合乾燥過敏犬貓，天生容易過敏不確定過敏源選甜瓜或低敏',
  },
  {
    id: 'skin_health', name: '皮膚健康組合',
    description: '舒緩發紅乾燥，修復皮膚屏障',
    target_breeds: [],
    target_needs: '皮膚發紅、乾燥、搔癢',
    steps: [
      { step: 1, role: '清潔', product_key: 'oatmeal_baking_soda', note: '蘇打燕麥洗劑' },
      { step: 2, role: '功能', product_key: 'oatmeal_gentle_clean', note: '燕麥蘆薈洗劑' },
      { step: 3, role: '護毛素', product_key: 'hypoallergenic_daily', note: '燕麥免洗護毛素' },
    ],
    tips: '皮膚問題嚴重請先諮詢獸醫',
  },
  {
    id: 'cat_basic', name: '短毛貓基礎組合',
    description: '短毛貓日常清潔，去廢毛提升蓬鬆',
    target_breeds: ['british_sh', 'american_sh', 'russian_blue', 'scottish_fold'],
    target_needs: '短毛貓日常洗護',
    steps: [
      { step: 1, role: '清潔', product_key: 'heavy_duty_clean', note: '洗護>1個月用強效洗劑，<1個月用泡沫柑橘。前置：洗護>1個月用去油膏去油味' },
      { step: 2, role: '功能', product_key: 'deshed_cat', note: '防脫毛洗劑' },
      { step: 3, role: '護毛素', product_key: 'deshed_rinse', note: '防脫毛乳液' },
    ],
    tips: '貓咪洗護週期較長時需先去油膏前置',
  },
  {
    id: 'cat_long_coat', name: '長毛貓完美組合',
    description: '長毛蓬鬆柔順，減少糾結與浮毛',
    target_breeds: ['ragdoll', 'persian', 'chinchilla', 'maine_coon'],
    target_needs: '長毛貓洗護，追求蓬鬆柔順',
    steps: [
      { step: 1, role: '清潔', product_key: 'heavy_duty_clean', note: '強效洗劑或泡沫柑橘' },
      { step: 2, role: '功能', product_key: 'detangling', note: '柔順洗劑防打結' },
      { step: 3, role: '護毛素', product_key: 'deshed_rinse', note: '防脫毛乳液或滋潤護毛素' },
    ],
    tips: '長毛貓建議搭配柔順洗劑減少糾結',
  },
  {
    id: 'cat_daily', name: '貓咪日常組合',
    description: '日常基礎洗護，簡單有效',
    target_breeds: ['exotic_sh', 'kitten'],
    target_needs: '貓咪一般日常洗護',
    steps: [
      { step: 1, role: '清潔', product_key: 'heavy_duty_clean', note: '強效洗劑' },
      { step: 2, role: '功能', product_key: 'deshed_cat', note: '防脫毛洗劑' },
      { step: 3, role: '護毛素', product_key: 'deshed_rinse', note: '防脫毛乳液' },
    ],
  },
  {
    id: 'cat_premium', name: '貓咪進階精緻護理',
    description: '頂級SPA護理，全面提升毛質光澤',
    target_breeds: [],
    target_needs: '追求頂級護理效果的貓咪',
    steps: [
      { step: 1, role: '清潔', product_key: 'spa_deep_clean', note: '純粹深層清潔' },
      { step: 2, role: '功能', product_key: 'kava_shampoo', note: '卡瓦洗劑' },
      { step: 3, role: '護毛素', product_key: 'natural_elastic', note: '高級皮毛護理霜' },
    ],
    tips: '不確定推薦什麼時，推薦此組合',
  },
  {
    id: 'dog_premium', name: '犬進階精緻護理',
    description: '頂級SPA護理，全面提升毛質光澤',
    target_breeds: ['mixed_dog', 'cocker'],
    target_needs: '追求頂級護理效果的犬種',
    steps: [
      { step: 1, role: '清潔', product_key: 'spa_deep_clean', note: '純粹深層清潔' },
      { step: 2, role: '功能', product_key: 'kava_shampoo', note: '卡瓦洗劑' },
      { step: 3, role: '護毛素', product_key: 'natural_elastic', note: '高級皮毛護理霜' },
    ],
    tips: '不確定推薦什麼時，推薦此組合',
  },
];

// ============================================================
// Dynamic combos from DB (module-level cache)
// ============================================================

let _combos: ProductCombo[] = STATIC_COMBOS;
let _loaded = false;
let _promise: Promise<ProductCombo[]> | null = null;

/** Fetch combos from davis_combos table. Caches result. Falls back to static data. */
export async function fetchCombos(): Promise<ProductCombo[]> {
  if (_loaded) return _combos;
  if (_promise) return _promise;

  _promise = (async () => {
    try {
      const url = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!url || !key) return _combos;

      const res = await fetch(
        `${url}/rest/v1/davis_combos?select=*&is_active=eq.true&order=sort_order,created_at`,
        { headers: { apikey: key, Authorization: `Bearer ${key}` } },
      );
      const rows = await res.json();

      if (Array.isArray(rows) && rows.length > 0) {
        _combos = rows.map((r: Record<string, unknown>) => ({
          id: (r.combo_key as string) || `combo_${r.id}`,
          name: (r.name as string) || '',
          description: (r.description as string) || '',
          target_breeds: Array.isArray(r.target_breeds) ? r.target_breeds as string[] : [],
          target_needs: (r.target_needs as string) || '',
          steps: Array.isArray(r.products) ? r.products as ComboStep[] : [],
          tips: (r.tips as string) || '',
        }));
        _loaded = true;
      }
    } catch {
      // Silent fail — use static fallback
    }
    return _combos;
  })();

  return _promise;
}

/** Reset cache (for testing or forced refresh) */
export function resetCombosCache() {
  _combos = STATIC_COMBOS;
  _loaded = false;
  _promise = null;
}

// ============================================================
// Matching functions (work with cached or static data)
// ============================================================

/** Match a breed + optional color to the best combo */
export function getBreedCombo(breed: string, color?: string | null): ProductCombo {
  const b = breed.toLowerCase();
  const c = (color ?? '').toLowerCase();

  // Color-based matching first
  if (c.includes('黑') || c.includes('black')) {
    const match = _combos.find((cb) => cb.id === 'black_coat');
    if (match) return match;
  }
  if (c.includes('白') || c.includes('white') || c.includes('奶油') || c.includes('cream')) {
    const match = _combos.find((cb) => cb.id === 'white_coat');
    if (match) return match;
  }
  if (c.includes('紅') || c.includes('red') || c.includes('棕') || c.includes('杏') || c.includes('apricot') || c.includes('橘') || c.includes('orange')) {
    const match = _combos.find((cb) => cb.id === 'red_brown_coat');
    if (match) return match;
  }

  // Breed-based matching — find combo with this breed in target_breeds
  const breedId = resolveBreedId(b);
  if (breedId) {
    const match = _combos.find((cb) => cb.target_breeds.includes(breedId));
    if (match) return match;
  }

  // Fallback: detect cat vs dog for premium default
  const catBreeds = ['british_sh', 'american_sh', 'russian_blue', 'scottish_fold', 'ragdoll', 'maine_coon', 'persian', 'chinchilla', 'exotic_sh', 'kitten'];
  const isCat = b.includes('貓') || b.includes('cat') || catBreeds.includes(breedId ?? '');
  return _combos.find((cb) => cb.id === (isCat ? 'cat_premium' : 'dog_premium')) ?? _combos[_combos.length - 1];
}

/** Get all combos for a specific breed (may match multiple) */
export function getCombosForBreed(breedId: string): ProductCombo[] {
  return _combos.filter((cb) => cb.target_breeds.includes(breedId));
}

/** Get product objects for a combo's steps */
export function getComboProducts(combo: ProductCombo): DavisProduct[] {
  return combo.steps
    .map((s) => PRODUCTS[s.product_key])
    .filter((p): p is DavisProduct => !!p);
}

/** Get all combos */
export function getAllCombos(): ProductCombo[] {
  return _combos;
}

/** Get related/paired products for a given product (based on combos) */
export function getPairedProducts(productId: string): DavisProduct[] {
  const seen = new Set<string>();
  const result: DavisProduct[] = [];

  for (const combo of _combos) {
    const hasProduct = combo.steps.some((s) => s.product_key === productId);
    if (hasProduct) {
      for (const s of combo.steps) {
        if (s.product_key !== productId && !seen.has(s.product_key)) {
          seen.add(s.product_key);
          const p = PRODUCTS[s.product_key];
          if (p) result.push(p);
        }
      }
    }
    if (result.length >= 4) break;
  }

  return result;
}

// ============================================================
// Seed data for DB migration
// ============================================================

export function getSeedCombos(): Record<string, unknown>[] {
  return STATIC_COMBOS.map((c, i) => ({
    combo_key: c.id,
    name: c.name,
    description: c.description,
    target_breeds: c.target_breeds,
    target_needs: c.target_needs,
    products: c.steps,
    tips: c.tips || '',
    is_active: true,
    sort_order: i,
  }));
}

// ============================================================
// Helpers
// ============================================================

function resolveBreedId(breed: string): string | null {
  const map: Record<string, string> = {
    '貴賓': 'poodle', 'poodle': 'poodle',
    '比熊': 'bichon', 'bichon': 'bichon',
    '博美': 'pomeranian', 'pomeranian': 'pomeranian',
    '雪納瑞': 'schnauzer', 'schnauzer': 'schnauzer',
    '西高地': 'westie', 'westie': 'westie',
    '馬爾濟斯': 'maltese', 'maltese': 'maltese',
    '瑪爾泰迪': 'maltipoo', 'maltipoo': 'maltipoo',
    '約克夏': 'yorkie', 'yorkie': 'yorkie',
    '西施': 'shih_tzu', 'shih tzu': 'shih_tzu',
    '蝴蝶犬': 'papillon', 'papillon': 'papillon',
    '法鬥': 'french_bulldog', '法國鬥牛': 'french_bulldog', 'french bulldog': 'french_bulldog',
    '英國鬥牛': 'english_bulldog', 'english bulldog': 'english_bulldog',
    '巴哥': 'pug', 'pug': 'pug',
    '比格': 'beagle', '米格魯': 'beagle', 'beagle': 'beagle',
    '臘腸': 'dachshund', 'dachshund': 'dachshund',
    '迷你品': 'min_pin',
    '傑克羅素': 'jack_russell',
    '比特犬': 'pitbull', 'pitbull': 'pitbull',
    '大麥町': 'dalmatian', 'dalmatian': 'dalmatian',
    '柯基': 'corgi', 'corgi': 'corgi',
    '柴犬': 'shiba', 'shiba': 'shiba',
    '拉布拉多': 'labrador', 'labrador': 'labrador',
    '黃金': 'golden', '金毛': 'golden', 'golden': 'golden',
    '哈士奇': 'husky', 'husky': 'husky',
    '薩摩耶': 'samoyed', 'samoyed': 'samoyed',
    '邊境牧羊': 'border_collie', 'border collie': 'border_collie',
    '德國牧羊': 'german_shepherd', 'german shepherd': 'german_shepherd',
    '伯恩山': 'bernese', 'bernese': 'bernese',
    '秋田': 'akita', 'akita': 'akita',
    '可卡': 'cocker', 'cocker': 'cocker',
    '吉娃娃': 'chihuahua', 'chihuahua': 'chihuahua',
    '幼犬': 'puppy', 'puppy': 'puppy',
    '米克斯': 'mixed_dog', 'mixed': 'mixed_dog',
    '英短': 'british_sh', '英國短毛': 'british_sh', 'british': 'british_sh',
    '美短': 'american_sh', '美國短毛': 'american_sh',
    '俄羅斯藍': 'russian_blue', 'russian blue': 'russian_blue',
    '蘇格蘭': 'scottish_fold', 'scottish': 'scottish_fold',
    '布偶': 'ragdoll', 'ragdoll': 'ragdoll',
    '緬因': 'maine_coon', 'maine coon': 'maine_coon',
    '波斯': 'persian', 'persian': 'persian',
    '金吉拉': 'chinchilla', 'chinchilla': 'chinchilla',
    '異國短毛': 'exotic_sh', 'exotic': 'exotic_sh',
    '幼貓': 'kitten', 'kitten': 'kitten',
  };

  for (const [key, id] of Object.entries(map)) {
    if (breed.includes(key)) return id;
  }
  return null;
}
