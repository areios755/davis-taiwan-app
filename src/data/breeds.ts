import type { DavisBreed } from '@/types';

/**
 * Davis breed database — static fallback.
 * Authoritative data lives in Supabase `breed_groups` table.
 * Used for offline breed search and tier building.
 */
export const BREEDS: Record<string, DavisBreed> = {
  // ── 犬 - 蓬鬆造型類 ──
  poodle:          { id: 'poodle', name_zh: '貴賓犬', name_en: 'Poodle', name_ja: 'プードル', name_cn: '贵宾犬', pet_type: '狗', coat_type: '捲毛', emoji: '🐩', product_keys: ['fluffy_coarse_styling'] },
  bichon:          { id: 'bichon', name_zh: '比熊犬', name_en: 'Bichon Frise', name_ja: 'ビション・フリーゼ', name_cn: '比熊犬', pet_type: '狗', coat_type: '捲毛', emoji: '☁️', product_keys: ['fluffy_coarse_styling'] },
  pomeranian:      { id: 'pomeranian', name_zh: '博美犬', name_en: 'Pomeranian', name_ja: 'ポメラニアン', name_cn: '博美犬', pet_type: '狗', coat_type: '長毛', emoji: '🦊', product_keys: ['fluffy_coarse_styling', 'white_coat_brighten'] },
  schnauzer:       { id: 'schnauzer', name_zh: '雪納瑞', name_en: 'Schnauzer', name_ja: 'シュナウザー', name_cn: '雪纳瑞', pet_type: '狗', coat_type: '硬毛', product_keys: ['fluffy_coarse_styling', 'degrease_deep_clean'] },
  // ── 犬 - 長毛柔順類 ──
  maltese:         { id: 'maltese', name_zh: '馬爾濟斯', name_en: 'Maltese', name_ja: 'マルチーズ', name_cn: '马尔济斯', pet_type: '狗', coat_type: '長毛', emoji: '🤍', product_keys: ['detangling'] },
  maltipoo:        { id: 'maltipoo', name_zh: '瑪爾泰迪', name_en: 'Maltipoo', name_ja: 'マルプー', name_cn: '玛尔泰迪', pet_type: '狗', coat_type: '捲毛', emoji: '🧸', product_keys: ['white_coat_brighten', 'detangling'] },
  yorkie:          { id: 'yorkie', name_zh: '約克夏㹴', name_en: 'Yorkshire Terrier', name_ja: 'ヨークシャー・テリア', name_cn: '约克夏梗', pet_type: '狗', coat_type: '長毛', product_keys: ['detangling'] },
  shih_tzu:        { id: 'shih_tzu', name_zh: '西施犬', name_en: 'Shih Tzu', name_ja: 'シー・ズー', name_cn: '西施犬', pet_type: '狗', coat_type: '長毛', product_keys: ['detangling', 'flat_face_eye_clean'] },
  westie:          { id: 'westie', name_zh: '西高地白梗', name_en: 'West Highland White Terrier', name_ja: 'ウエスト・ハイランド・ホワイト・テリア', name_cn: '西高地白梗', pet_type: '狗', coat_type: '硬毛', product_keys: ['fluffy_coarse_styling', 'white_coat_brighten'] },
  // ── 犬 - 小型活力類 ──
  chihuahua:       { id: 'chihuahua', name_zh: '吉娃娃', name_en: 'Chihuahua', name_ja: 'チワワ', name_cn: '吉娃娃', pet_type: '狗', coat_type: '短毛', product_keys: ['oatmeal_gentle_clean'] },
  dachshund:       { id: 'dachshund', name_zh: '臘腸犬', name_en: 'Dachshund', name_ja: 'ダックスフント', name_cn: '腊肠犬', pet_type: '狗', coat_type: '短毛', product_keys: ['degrease_deep_clean'] },
  papillon:        { id: 'papillon', name_zh: '蝴蝶犬', name_en: 'Papillon', name_ja: 'パピヨン', name_cn: '蝴蝶犬', pet_type: '狗', coat_type: '長毛', product_keys: ['detangling'] },
  min_pin:         { id: 'min_pin', name_zh: '迷你品犬', name_en: 'Miniature Pinscher', name_ja: 'ミニチュア・ピンシャー', name_cn: '迷你品犬', pet_type: '狗', coat_type: '短毛', product_keys: ['degrease_deep_clean'] },
  jack_russell:    { id: 'jack_russell', name_zh: '傑克羅素㹴', name_en: 'Jack Russell Terrier', name_ja: 'ジャック・ラッセル・テリア', name_cn: '杰克罗素梗', pet_type: '狗', coat_type: '短毛', product_keys: ['degrease_deep_clean'] },
  // ── 犬 - 扁臉類 ──
  french_bulldog:  { id: 'french_bulldog', name_zh: '法國鬥牛犬', name_en: 'French Bulldog', name_ja: 'フレンチ・ブルドッグ', name_cn: '法国斗牛犬', pet_type: '狗', coat_type: '短毛', product_keys: ['degrease_deep_clean', 'flat_face_eye_clean'] },
  english_bulldog: { id: 'english_bulldog', name_zh: '英國鬥牛犬', name_en: 'English Bulldog', name_ja: 'イングリッシュ・ブルドッグ', name_cn: '英国斗牛犬', pet_type: '狗', coat_type: '短毛', product_keys: ['degrease_deep_clean', 'flat_face_eye_clean'] },
  pug:             { id: 'pug', name_zh: '巴哥犬', name_en: 'Pug', name_ja: 'パグ', name_cn: '巴哥犬', pet_type: '狗', coat_type: '短毛', emoji: '🐶', product_keys: ['degrease_deep_clean', 'flat_face_eye_clean'] },
  // ── 犬 - 中型犬 ──
  cocker:          { id: 'cocker', name_zh: '可卡犬', name_en: 'Cocker Spaniel', name_ja: 'コッカー・スパニエル', name_cn: '可卡犬', pet_type: '狗', coat_type: '長毛', product_keys: ['detangling', 'degrease_deep_clean'] },
  pitbull:         { id: 'pitbull', name_zh: '比特犬', name_en: 'Pit Bull', name_ja: 'ピットブル', name_cn: '比特犬', pet_type: '狗', coat_type: '短毛', product_keys: ['degrease_deep_clean'] },
  // ── 犬 - 掉毛類 ──
  corgi:           { id: 'corgi', name_zh: '柯基', name_en: 'Corgi', name_ja: 'コーギー', name_cn: '柯基', pet_type: '狗', coat_type: '雙層毛', emoji: '🦮', product_keys: ['deshed_dog'] },
  shiba:           { id: 'shiba', name_zh: '柴犬', name_en: 'Shiba Inu', name_ja: '柴犬', name_cn: '柴犬', pet_type: '狗', coat_type: '雙層毛', emoji: '🦊', product_keys: ['deshed_dog'] },
  labrador:        { id: 'labrador', name_zh: '拉布拉多', name_en: 'Labrador Retriever', name_ja: 'ラブラドール・レトリバー', name_cn: '拉布拉多', pet_type: '狗', coat_type: '雙層毛', product_keys: ['deshed_dog', 'heavy_duty_clean'] },
  golden:          { id: 'golden', name_zh: '黃金獵犬', name_en: 'Golden Retriever', name_ja: 'ゴールデン・レトリバー', name_cn: '金毛猎犬', pet_type: '狗', coat_type: '長毛', product_keys: ['deshed_dog', 'detangling'] },
  husky:           { id: 'husky', name_zh: '哈士奇', name_en: 'Husky', name_ja: 'ハスキー', name_cn: '哈士奇', pet_type: '狗', coat_type: '雙層毛', product_keys: ['deshed_dog'] },
  samoyed:         { id: 'samoyed', name_zh: '薩摩耶', name_en: 'Samoyed', name_ja: 'サモエド', name_cn: '萨摩耶', pet_type: '狗', coat_type: '長毛', emoji: '☁️', product_keys: ['deshed_dog', 'white_coat_brighten'] },
  border_collie:   { id: 'border_collie', name_zh: '邊境牧羊犬', name_en: 'Border Collie', name_ja: 'ボーダー・コリー', name_cn: '边境牧羊犬', pet_type: '狗', coat_type: '長毛', product_keys: ['deshed_dog', 'detangling'] },
  german_shepherd: { id: 'german_shepherd', name_zh: '德國牧羊犬', name_en: 'German Shepherd', name_ja: 'ジャーマン・シェパード', name_cn: '德国牧羊犬', pet_type: '狗', coat_type: '雙層毛', product_keys: ['deshed_dog', 'heavy_duty_clean'] },
  bernese:         { id: 'bernese', name_zh: '伯恩山犬', name_en: 'Bernese Mountain Dog', name_ja: 'バーニーズ・マウンテン・ドッグ', name_cn: '伯恩山犬', pet_type: '狗', coat_type: '長毛', product_keys: ['deshed_dog', 'detangling'] },
  akita:           { id: 'akita', name_zh: '秋田犬', name_en: 'Akita', name_ja: '秋田犬', name_cn: '秋田犬', pet_type: '狗', coat_type: '雙層毛', product_keys: ['deshed_dog'] },
  dalmatian:       { id: 'dalmatian', name_zh: '大麥町', name_en: 'Dalmatian', name_ja: 'ダルメシアン', name_cn: '大麦町', pet_type: '狗', coat_type: '短毛', product_keys: ['degrease_deep_clean'] },
  // ── 犬 - 其他 ──
  beagle:          { id: 'beagle', name_zh: '米格魯', name_en: 'Beagle', name_ja: 'ビーグル', name_cn: '米格鲁', pet_type: '狗', coat_type: '短毛', emoji: '🐶', product_keys: ['degrease_deep_clean'] },
  mixed_dog:       { id: 'mixed_dog', name_zh: '米克斯犬', name_en: 'Mixed Breed', name_ja: 'ミックス犬', name_cn: '混种犬', pet_type: '狗', coat_type: '混合', emoji: '🐕', product_keys: ['degrease_deep_clean'] },
  puppy:           { id: 'puppy', name_zh: '幼犬', name_en: 'Puppy', name_ja: '子犬', name_cn: '幼犬', pet_type: '狗', coat_type: '混合', emoji: '🐣', product_keys: ['oatmeal_gentle_clean'] },
  // ── 貓 - 短毛類 ──
  british_sh:      { id: 'british_sh', name_zh: '英國短毛貓', name_en: 'British Shorthair', name_ja: 'ブリティッシュ・ショートヘア', name_cn: '英国短毛猫', pet_type: '貓', coat_type: '短毛', emoji: '🐈', product_keys: ['deshed_cat', 'hypoallergenic_daily'] },
  american_sh:     { id: 'american_sh', name_zh: '美國短毛貓', name_en: 'American Shorthair', name_ja: 'アメリカン・ショートヘア', name_cn: '美国短毛猫', pet_type: '貓', coat_type: '短毛', product_keys: ['deshed_cat'] },
  russian_blue:    { id: 'russian_blue', name_zh: '俄羅斯藍貓', name_en: 'Russian Blue', name_ja: 'ロシアンブルー', name_cn: '俄罗斯蓝猫', pet_type: '貓', coat_type: '短毛', product_keys: ['deshed_cat', 'dark_coat_brighten'] },
  scottish_fold:   { id: 'scottish_fold', name_zh: '蘇格蘭折耳', name_en: 'Scottish Fold', name_ja: 'スコティッシュ・フォールド', name_cn: '苏格兰折耳', pet_type: '貓', coat_type: '短毛', product_keys: ['hypoallergenic_daily'] },
  // ── 貓 - 長毛類 ──
  ragdoll:         { id: 'ragdoll', name_zh: '布偶貓', name_en: 'Ragdoll', name_ja: 'ラグドール', name_cn: '布偶猫', pet_type: '貓', coat_type: '長毛', emoji: '💜', product_keys: ['detangling', 'deshed_cat'] },
  maine_coon:      { id: 'maine_coon', name_zh: '緬因貓', name_en: 'Maine Coon', name_ja: 'メインクーン', name_cn: '缅因猫', pet_type: '貓', coat_type: '長毛', product_keys: ['detangling', 'deshed_cat'] },
  persian:         { id: 'persian', name_zh: '波斯貓', name_en: 'Persian', name_ja: 'ペルシャ', name_cn: '波斯猫', pet_type: '貓', coat_type: '長毛', product_keys: ['detangling', 'flat_face_eye_clean'] },
  chinchilla:      { id: 'chinchilla', name_zh: '金吉拉', name_en: 'Chinchilla', name_ja: 'チンチラ', name_cn: '金吉拉', pet_type: '貓', coat_type: '長毛', product_keys: ['detangling', 'white_coat_brighten'] },
  // ── 貓 - 扁臉 ──
  exotic_sh:       { id: 'exotic_sh', name_zh: '異國短毛貓', name_en: 'Exotic Shorthair', name_ja: 'エキゾチック・ショートヘア', name_cn: '异国短毛猫', pet_type: '貓', coat_type: '短毛', product_keys: ['flat_face_eye_clean', 'hypoallergenic_daily'] },
  kitten:          { id: 'kitten', name_zh: '幼貓', name_en: 'Kitten', name_ja: '子猫', name_cn: '幼猫', pet_type: '貓', coat_type: '混合', emoji: '🐣', product_keys: ['oatmeal_gentle_clean'] },
};

/**
 * Breed alias map — maps variant names (e.g. from 毛安住/汪得福) to canonical breed IDs.
 */
export const BREED_ALIAS_MAP: Record<string, string> = {
  // 毛安住/汪得福 aliases
  '貴賓（迷你/玩具）': 'poodle', '中型貴賓': 'poodle', '巨型貴賓': 'poodle',
  '比熊': 'bichon', '博美': 'pomeranian',
  '約克夏': 'yorkie', '西施': 'shih_tzu',
  '法鬥': 'french_bulldog', '巴哥': 'pug',
  '柯基': 'corgi', '柴犬': 'shiba',
  '米格魯': 'beagle',
  '迷你雪納瑞': 'schnauzer', '中型雪納瑞': 'schnauzer',
  '薩摩耶': 'samoyed', '馬爾濟斯': 'maltese',
  '吉娃娃': 'chihuahua', '臘腸': 'dachshund',
  '蝴蝶犬': 'papillon', '迷你品犬': 'min_pin',
  '傑克羅素': 'jack_russell', '可卡': 'cocker',
  '比特犬': 'pitbull', '邊境牧羊犬': 'border_collie',
  '德國牧羊犬': 'german_shepherd', '伯恩山犬': 'bernese',
  '秋田犬': 'akita', '大麥町': 'dalmatian',
  '米克斯': 'mixed_dog',
  // Chinese name → ID (non-duplicate entries)
  '貴賓犬': 'poodle', '比熊犬': 'bichon', '博美犬': 'pomeranian',
  '瑪爾泰迪': 'maltipoo',
  '約克夏㹴': 'yorkie', '西施犬': 'shih_tzu', '西高地白梗': 'westie',
  '臘腸犬': 'dachshund', '傑克羅素㹴': 'jack_russell',
  '法國鬥牛犬': 'french_bulldog', '英國鬥牛犬': 'english_bulldog',
  '巴哥犬': 'pug', '可卡犬': 'cocker',
  '拉布拉多': 'labrador', '黃金獵犬': 'golden',
  '哈士奇': 'husky', '米克斯犬': 'mixed_dog',
  '幼犬': 'puppy',
  '英國短毛貓': 'british_sh', '美國短毛貓': 'american_sh',
  '俄羅斯藍貓': 'russian_blue', '蘇格蘭折耳': 'scottish_fold',
  '布偶貓': 'ragdoll', '緬因貓': 'maine_coon',
  '波斯貓': 'persian', '金吉拉': 'chinchilla',
  '異國短毛貓': 'exotic_sh', '幼貓': 'kitten',
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
  // Direct lookup
  const direct = BREED_BY_ZH.get(name) ?? BREED_BY_EN.get(name.toLowerCase());
  if (direct) return direct;
  // Alias lookup
  const aliasId = BREED_ALIAS_MAP[name];
  if (aliasId) return BREEDS[aliasId];
  return undefined;
}

export function getAllBreeds(): DavisBreed[] {
  return Object.values(BREEDS);
}

export function getBreedsByType(petType: '狗' | '貓'): DavisBreed[] {
  return Object.values(BREEDS).filter((b) => b.pet_type === petType);
}

/** Fetch breeds from Supabase (with static fallback) */
export async function fetchBreeds(): Promise<DavisBreed[]> {
  try {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) return getAllBreeds();

    const res = await fetch(`${url}/rest/v1/breed_groups?select=*&is_active=eq.true&order=sort_order`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return getAllBreeds();

    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return getAllBreeds();

    return rows.map((r: Record<string, unknown>) => ({
      id: (r.davis_breed_id as string) || (r.id as string),
      name_zh: r.name as string,
      name_en: (r.name_en as string) || '',
      name_ja: (r.name_ja as string) || '',
      name_cn: (r.name_cn as string) || '',
      pet_type: (r.species === 'dog' ? '狗' : '貓') as '狗' | '貓',
      coat_type: ((r.coat_types as string[]) || [])[0] || '混合',
      emoji: (r.emoji as string) || undefined,
      product_keys: (r.davis_product_keys as string[]) || [],
    }));
  } catch {
    return getAllBreeds();
  }
}
