import { PRODUCTS } from '@/data/products';
import type { DavisProduct } from '@/types';

export interface BreedCombo {
  name: string;
  description: string;
  product_keys: string[];
}

/**
 * Match a breed + optional color to a recommended product combo.
 * Returns the best matching combo for marketing display.
 */
export function getBreedCombo(breed: string, color?: string | null): BreedCombo {
  const b = breed.toLowerCase();
  const c = (color ?? '').toLowerCase();

  // White poodle / bichon
  if ((b.includes('貴賓') || b.includes('poodle') || b.includes('比熊') || b.includes('bichon')) &&
      (c.includes('白') || c.includes('white') || c.includes('奶油') || c.includes('cream'))) {
    return {
      name: '白毛護色組合',
      description: '抗氧化提亮 + 柔順護理，維持白毛亮麗光澤',
      product_keys: ['white_coat_brighten', 'detangling', 'natural_elastic'],
    };
  }

  // Red / apricot poodle
  if ((b.includes('貴賓') || b.includes('poodle')) &&
      (c.includes('紅') || c.includes('red') || c.includes('棕') || c.includes('杏') || c.includes('apricot'))) {
    return {
      name: '紅毛光澤組合',
      description: '深色增艷 + 奢華光澤，讓毛色更加飽滿亮麗',
      product_keys: ['dark_coat_brighten', 'humid_oil_control', 'natural_elastic'],
    };
  }

  // Poodle / bichon / pomeranian / schnauzer (fluffy types)
  if (b.includes('貴賓') || b.includes('poodle') || b.includes('比熊') || b.includes('bichon') ||
      b.includes('博美') || b.includes('pomeranian') || b.includes('雪納瑞') || b.includes('schnauzer')) {
    return {
      name: '蓬鬆造型組合',
      description: '質感支撐 + 蓬鬆立體，造型維持更持久',
      product_keys: ['fluffy_coarse_styling', 'heavy_duty_clean', 'natural_elastic'],
    };
  }

  // French bulldog / pug / english bulldog (flat face)
  if (b.includes('法鬥') || b.includes('法國鬥牛') || b.includes('french bulldog') ||
      b.includes('巴哥') || b.includes('pug') || b.includes('英國鬥牛') || b.includes('english bulldog')) {
    return {
      name: '敏感肌組合',
      description: '溫和清潔 + 眼周護理，專為扁臉毛孩設計',
      product_keys: ['oatmeal_gentle_clean', 'flat_face_eye_clean', 'hypoallergenic_daily'],
    };
  }

  // Golden / labrador / large double coat
  if (b.includes('金毛') || b.includes('黃金') || b.includes('golden') ||
      b.includes('拉布拉多') || b.includes('labrador') ||
      b.includes('伯恩山') || b.includes('bernese')) {
    return {
      name: '大型犬蓬鬆組合',
      description: '去廢毛 + 深層滋潤，換毛季必備組合',
      product_keys: ['deshed_dog', 'humid_oil_control', 'detangling'],
    };
  }

  // Maltese / yorkie / shih tzu (silky long coat)
  if (b.includes('馬爾濟斯') || b.includes('maltese') || b.includes('瑪爾泰迪') || b.includes('maltipoo') ||
      b.includes('約克夏') || b.includes('yorkie') || b.includes('西施') || b.includes('shih tzu')) {
    return {
      name: '長毛絲滑組合',
      description: '柔順解結 + 深層滋養，長毛不打結更亮麗',
      product_keys: ['detangling', 'natural_elastic', 'humid_oil_control'],
    };
  }

  // Corgi / shiba / husky / double coat shedders
  if (b.includes('柯基') || b.includes('corgi') ||
      b.includes('柴犬') || b.includes('shiba') ||
      b.includes('哈士奇') || b.includes('husky') ||
      b.includes('薩摩耶') || b.includes('samoyed') ||
      b.includes('秋田') || b.includes('akita') ||
      b.includes('德國牧羊') || b.includes('german shepherd') ||
      b.includes('邊境牧羊') || b.includes('border collie')) {
    return {
      name: '換毛季必備組合',
      description: '去廢毛 + 強效清潔，換毛季效率翻倍',
      product_keys: ['deshed_dog', 'heavy_duty_clean', 'oatmeal_gentle_clean'],
    };
  }

  // British shorthair / American shorthair (short coat cats)
  if (b.includes('英短') || b.includes('英國短毛') || b.includes('british') ||
      b.includes('美短') || b.includes('美國短毛') || b.includes('american short') ||
      b.includes('俄羅斯藍') || b.includes('russian blue') ||
      b.includes('蘇格蘭') || b.includes('scottish')) {
    return {
      name: '短毛貓蓬鬆組合',
      description: '貓專用去廢毛 + 溫和清潔，短毛也能蓬鬆亮麗',
      product_keys: ['deshed_cat', 'oatmeal_gentle_clean', 'fluffy_coarse_styling'],
    };
  }

  // Persian / ragdoll / maine coon / chinchilla (long coat cats)
  if (b.includes('波斯') || b.includes('persian') ||
      b.includes('布偶') || b.includes('ragdoll') ||
      b.includes('緬因') || b.includes('maine coon') ||
      b.includes('金吉拉') || b.includes('chinchilla') ||
      b.includes('異國短毛') || b.includes('exotic')) {
    return {
      name: '長毛貓完美組合',
      description: '柔順解結 + 去油前置，長毛貓洗護全套方案',
      product_keys: ['detangling', 'degrease_pretreat', 'flat_face_eye_clean'],
    };
  }

  // Default combo
  return {
    name: '基礎經典組合',
    description: '萬用經典搭配，適合各種犬貓日常洗護',
    product_keys: ['humid_oil_control', 'heavy_duty_clean', 'oatmeal_gentle_clean'],
  };
}

/** Get product objects for a combo, filtering out missing products */
export function getComboProducts(combo: BreedCombo): DavisProduct[] {
  return combo.product_keys
    .map((key) => PRODUCTS[key])
    .filter((p): p is DavisProduct => !!p);
}

/** Get related/paired products for a given product */
export function getPairedProducts(productId: string): DavisProduct[] {
  const pairings: Record<string, string[]> = {
    degrease_pretreat: ['heavy_duty_clean', 'oatmeal_gentle_clean'],
    heavy_duty_clean: ['detangling', 'humid_oil_control'],
    degrease_deep_clean: ['oatmeal_gentle_clean', 'natural_elastic'],
    oatmeal_gentle_clean: ['hypoallergenic_daily', 'flat_face_eye_clean'],
    fluffy_coarse_styling: ['heavy_duty_clean', 'natural_elastic'],
    detangling: ['natural_elastic', 'humid_oil_control'],
    natural_elastic: ['detangling', 'fluffy_coarse_styling'],
    white_coat_brighten: ['detangling', 'heavy_duty_clean'],
    dark_coat_brighten: ['humid_oil_control', 'heavy_duty_clean'],
    deshed_dog: ['heavy_duty_clean', 'oatmeal_gentle_clean'],
    deshed_cat: ['oatmeal_gentle_clean', 'hypoallergenic_daily'],
    hypoallergenic_daily: ['oatmeal_gentle_clean', 'flat_face_eye_clean'],
    humid_oil_control: ['heavy_duty_clean', 'detangling'],
    flat_face_eye_clean: ['oatmeal_gentle_clean', 'hypoallergenic_daily'],
    spa_deep_clean: ['humid_oil_control', 'natural_elastic'],
  };

  const keys = pairings[productId] ?? [];
  return keys.map((k) => PRODUCTS[k]).filter((p): p is DavisProduct => !!p);
}
