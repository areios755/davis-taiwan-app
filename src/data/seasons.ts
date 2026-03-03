import type { SeasonConfig, SeasonId } from '@/types';

export const SEASONS: Record<SeasonId, SeasonConfig> = {
  spring: {
    id: 'spring',
    months: [3, 4, 5],
    name_zh: '春季',
    name_en: 'Spring',
    name_ja: '春',
    name_cn: '春季',
    description_zh: '換毛季節，加強底層護理與除廢毛',
    prompt_hint: '現在是春季換毛期，許多犬貓正在大量換毛。建議加強底層護理、除廢毛產品。Signature 等級可考慮使用「護毛精華」強化毛囊。',
  },
  summer: {
    id: 'summer',
    months: [6, 7, 8],
    name_zh: '夏季',
    name_en: 'Summer',
    name_ja: '夏',
    name_cn: '夏季',
    description_zh: '高溫潮濕，注重清潔除臭與皮膚透氣',
    prompt_hint: '現在是夏季高溫潮濕。建議加強清潔力、除臭產品。皮膚容易悶熱，Signature 等級可考慮使用「薄荷尤加利洗劑」清涼舒緩。',
  },
  autumn: {
    id: 'autumn',
    months: [9, 10, 11],
    name_zh: '秋季',
    name_en: 'Autumn',
    name_ja: '秋',
    name_cn: '秋季',
    description_zh: '氣候乾燥，補充滋潤與保濕',
    prompt_hint: '現在是秋季，氣候轉乾。建議加強保濕與滋潤。Signature 等級可考慮使用「滋潤護毛素」雙層護理。',
  },
  winter: {
    id: 'winter',
    months: [12, 1, 2],
    name_zh: '冬季',
    name_en: 'Winter',
    name_ja: '冬',
    name_cn: '冬季',
    description_zh: '寒冷乾燥，深層滋養與靜電防護',
    prompt_hint: '現在是冬季，乾冷容易產生靜電與乾癢。建議加強深層滋養。Signature 等級可考慮使用「絲蛋白護毛素」修護毛鱗片。',
  },
};

export function getCurrentSeason(): SeasonConfig {
  const month = new Date().getMonth() + 1;
  const entry = Object.values(SEASONS).find((s) => s.months.includes(month));
  return entry ?? SEASONS.spring;
}
