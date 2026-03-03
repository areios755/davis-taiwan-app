import type { ColorKeyword } from '@/types';

/**
 * Coat color keywords used to parse inputs like "紅貴賓" → breed: 貴賓犬, color: 紅棕色
 * product_hint suggests a specific product when this color is detected.
 */
export const COLOR_KEYWORDS: ColorKeyword[] = [
  { keyword: '紅', zh: '紅棕色', en: 'red/brown', product_hint: '高級炫彩洗劑' },
  { keyword: '奶油', zh: '奶油白', en: 'cream/white', product_hint: '高級炫彩洗劑' },
  { keyword: '黑', zh: '黑色', en: 'black', product_hint: '炫黑洗劑' },
  { keyword: '白', zh: '白色', en: 'white', product_hint: '高級炫彩洗劑' },
  { keyword: '灰', zh: '灰色', en: 'gray', product_hint: null },
  { keyword: '棕', zh: '棕色', en: 'brown', product_hint: '高級炫彩洗劑' },
  { keyword: '金', zh: '金色', en: 'golden', product_hint: '高級炫彩洗劑' },
  { keyword: '巧克力', zh: '巧克力色', en: 'chocolate', product_hint: '高級炫彩洗劑' },
  { keyword: '藍', zh: '藍灰色', en: 'blue/gray', product_hint: null },
  { keyword: '三花', zh: '三花/玳瑁', en: 'calico', product_hint: null },
  { keyword: '虎斑', zh: '虎斑', en: 'tabby', product_hint: null },
  { keyword: '橘', zh: '橘色', en: 'orange', product_hint: '高級炫彩洗劑' },
  { keyword: '銀', zh: '銀色', en: 'silver', product_hint: null },
  { keyword: '杏', zh: '杏色', en: 'apricot', product_hint: '高級炫彩洗劑' },
];
