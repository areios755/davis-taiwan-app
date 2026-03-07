#!/usr/bin/env node
/**
 * Seed davis_products and breed_groups into Supabase via REST API.
 * Usage: node scripts/seed-supabase.mjs
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envText = readFileSync(resolve(__dirname, '..', '.env'), 'utf8');
const env = {};
envText.split('\n').forEach(l => {
  const m = l.match(/^([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
});

const SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'resolution=merge-duplicates',
};

// ============================================================
// PRODUCTS DATA (15 scenarios from legacy index.html)
// ============================================================
const products = [
  {
    product_key: 'degrease_pretreat',
    name_zh: '去油膏前置處理',
    name_en: 'Degrease Pre-treatment',
    name_cn: '去油膏前置处理',
    name_ja: '脱脂プレトリートメント',
    category: 'specialty',
    series: 'salon',
    tag_zh: '油尾巴・皮脂分泌過多・CFA推薦',
    tag_en: 'Oily tail, excess sebum, CFA recommended',
    tag_cn: '油尾巴・皮脂分泌过多・CFA推荐',
    tag_ja: 'オイリーテール・皮脂過多・CFA推奨',
    reason_zh: 'CFA官方推薦。專門處理貓咪油尾巴及皮脂分泌過度問題，預防油脂堆積堵塞後引起的細菌感染。有傷口時不可使用。',
    reason_en: 'CFA officially recommended. Specifically treats oily tail and excessive sebum in cats, preventing bacterial infection from oil buildup. Do not use on wounds.',
    reason_cn: 'CFA官方推荐。专门处理猫咪油尾巴及皮脂分泌过度问题，预防油脂堆积堵塞后引起的细菌感染。有伤口时不可使用。',
    reason_ja: 'CFA公式推奨。猫のオイリーテールや過剰な皮脂分泌を専門的に処理し、油脂蓄積による細菌感染を予防します。傷がある場合は使用不可。',
    note_zh: '有傷口或病理性油脂堵塞時，請先使用洗樂舒，不可直接用去油膏。',
    note_en: 'For wounds or pathological oil blockage, use medicated shampoo first. Do not apply degrease directly.',
    note_cn: '有伤口或病理性油脂堵塞时，请先使用洗乐舒，不可直接用去油膏。',
    note_ja: '傷や病的な油脂詰まりがある場合は、まず薬用シャンプーを使用してください。',
    dilution: '原液',
    dwell_time: '3-5min',
    usage_steps: [
      { role: '前置 · 局部使用', name: '去油膏 Davis Degrease Shampoo', dilution: '原液直接塗抹油脂部位', time: '靜置 3–5 分鐘後再進行主洗' }
    ],
  },
  {
    product_key: 'heavy_duty_clean',
    name_zh: '強效深層清潔',
    name_en: 'Heavy Duty Deep Clean',
    name_cn: '强效深层清洁',
    name_ja: '強力ディープクレンジング',
    category: 'shampoo',
    series: 'salon',
    tag_zh: '非常髒・污垢重・STEP 1首選',
    tag_en: 'Very dirty, heavy grime, best first step',
    tag_cn: '非常脏・污垢重・STEP 1首选',
    tag_ja: '非常に汚れた・汚れがひどい・STEP1に最適',
    reason_zh: '快速去除嚴重污垢，適合戶外犬或非常髒的毛孩。強效但溫和，可作為日常洗護的第一步。',
    reason_en: 'Quickly removes heavy grime. Ideal for outdoor dogs or very dirty pets. Powerful yet gentle, great as first wash step.',
    reason_cn: '快速去除严重污垢，适合户外犬或非常脏的毛孩。强效但温和，可作为日常洗护的第一步。',
    reason_ja: '頑固な汚れを素早く除去。アウトドア犬や非常に汚れたペットに最適。強力でありながら優しい処方。',
    note_zh: '非常髒的毛孩建議連續使用兩次強效洗劑，再進行護毛程序。',
    note_en: 'For very dirty pets, use twice consecutively before conditioning.',
    note_cn: '非常脏的毛孩建议连续使用两次强效洗剂，再进行护毛程序。',
    note_ja: '非常に汚れている場合は、コンディショニング前に2回連続使用をお勧めします。',
    dilution: '50:1(犬) / 30:1(貓)',
    dwell_time: '3-5min',
    usage_steps: [
      { role: 'Step 1 · 強效主洗', name: '強效清潔洗劑 Grubby Dog Shampoo', dilution: '犬稀釋 50:1 / 貓稀釋 30:1', time: '停留 3–5 分鐘，充分起泡去除污垢' },
      { role: 'Step 2 · 護毛', name: '滋潤護毛素 Creme Rinse & Conditioner', dilution: '稀釋 7:1（水:護毛素）', time: '停留 3 分鐘後沖淨，補充毛髮營養' }
    ],
  },
  {
    product_key: 'degrease_deep_clean',
    name_zh: '去油深層清潔',
    name_en: 'Degreasing Deep Clean',
    name_cn: '去油深层清洁',
    name_ja: '脱脂ディープクレンジング',
    category: 'shampoo',
    series: 'salon',
    tag_zh: '油脂偏重・護週期頻繁・橘子油溫和去油',
    tag_en: 'Oily coat, frequent grooming, gentle citrus degreasing',
    tag_cn: '油脂偏重・护周期频繁・橘子油温和去油',
    tag_ja: 'オイリーコート・頻繁なグルーミング・柑橘系の穏やかな脱脂',
    reason_zh: '橘子油溫和去油，適合護理週期較為頻繁的犬貓。比強效洗劑更溫和，日常去油首選。',
    reason_en: 'Gentle citrus oil degreasing for pets with frequent grooming schedules. Milder than heavy duty, daily degreasing choice.',
    reason_cn: '橘子油温和去油，适合护理周期较为频繁的犬猫。比强效洗剂更温和，日常去油首选。',
    reason_ja: '柑橘オイルで穏やかに脱脂。頻繁にグルーミングするペットに最適。強力洗剤より優しい処方。',
    dilution: '10:1',
    dwell_time: '3-5min',
    usage_steps: [
      { role: 'Step 1 · 溫和去油主洗', name: '泡沫柑橘洗劑 Lather-A-Pup Citrus Shampoo', dilution: '稀釋 10:1（水:洗劑）', time: '停留 3–5 分鐘，橘子油成分溫和去油' },
      { role: 'Step 2 · 護毛', name: '滋潤護毛素 Creme Rinse & Conditioner', dilution: '稀釋 7:1（水:護毛素）', time: '停留 3 分鐘後沖淨' }
    ],
  },
  {
    product_key: 'oatmeal_gentle_clean',
    name_zh: '蘇打燕麥溫和清潔',
    name_en: 'Baking Soda & Oatmeal Gentle Clean',
    name_cn: '苏打燕麦温和清洁',
    name_ja: 'ベーキングソーダ＆オートミール・ジェントルクレンジング',
    category: 'shampoo',
    series: 'salon',
    tag_zh: '幼犬幼貓・老年犬貓・特別溫和',
    tag_en: 'Puppies, kittens, seniors, extra gentle',
    tag_cn: '幼犬幼猫・老年犬猫・特别温和',
    tag_ja: '子犬・子猫・シニア・超ジェントル',
    reason_zh: '特別適合幼犬幼貓、老年犬貓。內含燕麥成分可以加強皮膚屏障，舒緩乾燥和瘙癢。',
    reason_en: 'Ideal for puppies, kittens, and seniors. Oatmeal strengthens skin barrier and soothes dryness and itching.',
    reason_cn: '特别适合幼犬幼猫、老年犬猫。内含燕麦成分可以加强皮肤屏障，舒缓干燥和瘙痒。',
    reason_ja: '子犬・子猫・シニアに最適。オートミール成分が皮膚バリアを強化し、乾燥やかゆみを和らげます。',
    note_zh: '幼犬幼貓首選，成分最溫和，不刺激眼睛和皮膚。',
    note_en: 'Top choice for puppies and kittens. Gentlest formula, non-irritating to eyes and skin.',
    note_cn: '幼犬幼猫首选，成分最温和，不刺激眼睛和皮肤。',
    note_ja: '子犬・子猫に一番のおすすめ。最も穏やかな処方で、目や肌を刺激しません。',
    dilution: '10:1',
    dwell_time: '3min',
    usage_steps: [
      { role: 'Step 1 · 溫和主洗', name: '蘇打燕麥洗劑 Baking Soda & Oatmeal Shampoo', dilution: '稀釋 10:1（水:洗劑）', time: '溫柔按摩，停留 3 分鐘' },
      { role: 'Step 2 · 護毛', name: '燕麥免沖護毛素 Oatmeal Leave-On Conditioner', dilution: '免稀釋均勻噴塗', time: '不沖淨，直接吹乾' }
    ],
  },
  {
    product_key: 'fluffy_coarse_styling',
    name_zh: '蓬鬆硬毛造型',
    name_en: 'Fluffy Coarse Coat Styling',
    name_cn: '蓬松硬毛造型',
    name_ja: 'ふんわりハードコート・スタイリング',
    category: 'shampoo',
    series: 'show_beauty',
    tag_zh: '硬毛・捲毛・需要蓬鬆立體毛根支撐',
    tag_en: 'Coarse coat, curly coat, volume and root support',
    tag_cn: '硬毛・卷毛・需要蓬松立体毛根支撑',
    tag_ja: 'ハードコート・カーリーコート・ボリュームと根元サポート',
    reason_zh: '質感洗劑為硬毛和彈性毛提供毛根支撐；清爽型護毛素不讓毛髮變軟塌，蓬鬆造型效果最佳。',
    reason_en: 'Texturizing shampoo provides root support for coarse and elastic coats; light conditioner prevents flatness for best volume.',
    reason_cn: '质感洗剂为硬毛和弹性毛提供毛根支撑；清爽型护毛素不让毛发变软塌，蓬松造型效果最佳。',
    reason_ja: 'テクスチャライジングシャンプーがハードコートに根元からのサポートを提供。軽いコンディショナーでふんわりスタイリング。',
    note_zh: '吹整時搭配圓梳由內向外梳開，蓬鬆效果更顯著。適合貴賓、比熊、雪納瑞等需要造型的品種。',
    note_en: 'Use round brush while blow-drying for best volume. Ideal for Poodles, Bichons, Schnauzers.',
    note_cn: '吹整时搭配圆梳由内向外梳开，蓬松效果更显著。适合贵宾、比熊、雪纳瑞等需要造型的品种。',
    note_ja: 'ブロー時にラウンドブラシで内側から外側へ梳かすとボリュームアップ。プードル、ビションなどに最適。',
    dilution: '10:1',
    dwell_time: '3-5min',
    usage_steps: [
      { role: 'Step 1 · 主洗', name: '質感洗劑 Texturizing Shampoo', dilution: '稀釋 10:1（水:洗劑）', time: '停留 3–5 分鐘，均勻按摩至毛根' },
      { role: 'Step 2 · 護毛（清爽型）', name: '純粹護毛素 Pure Planet Complete Conditioner', dilution: '稀釋 10:1（水:護毛素）', time: '均勻塗抹後沖淨，拉毛首選清爽配方' }
    ],
  },
  {
    product_key: 'detangling',
    name_zh: '柔順解結',
    name_en: 'Detangling & Smoothing',
    name_cn: '柔顺解结',
    name_ja: 'もつれ解き＆スムージング',
    category: 'shampoo',
    series: 'salon',
    tag_zh: '長毛・易打結・梳理阻力大',
    tag_en: 'Long coat, easy tangling, high brushing resistance',
    tag_cn: '长毛・易打结・梳理阻力大',
    tag_ja: 'ロングコート・絡みやすい・ブラッシング抵抗が大きい',
    reason_zh: '先降低梳理摩擦阻力，護毛素補充毛髮養分做收尾；長毛打結族群三步驟才能持久柔順。',
    reason_en: 'Reduces brushing friction first, conditioner replenishes nutrients. Three-step process for lasting smoothness on long coats.',
    reason_cn: '先降低梳理摩擦阻力，护毛素补充毛发养分做收尾；长毛打结族群三步骤才能持久柔顺。',
    reason_ja: 'ブラッシングの摩擦を軽減し、コンディショナーで栄養補給。ロングコートの持続的なスムーズさのための3ステッププロセス。',
    note_zh: '嚴重打結建議先手動輕柔解開再下水，避免濕梳拉傷毛幹。',
    note_en: 'For severe tangles, gently detangle by hand before bathing to avoid wet-brushing damage.',
    note_cn: '严重打结建议先手动轻柔解开再下水，避免湿梳拉伤毛干。',
    note_ja: 'ひどい絡みは入浴前に手で優しくほぐしてください。濡れた状態でのブラッシングは毛を傷めます。',
    dilution: '10:1',
    dwell_time: '3-5min',
    usage_steps: [
      { role: 'Step 1 · 主洗', name: '柔順洗劑 Detangling Shampoo', dilution: '稀釋 10:1（水:洗劑）', time: '分區起泡，停留 3–5 分鐘' },
      { role: 'Step 2 · 護毛（沖淨型）', name: '滋潤護毛素 Creme Rinse & Conditioner', dilution: '稀釋 7:1（水:護毛素）', time: '沿毛流方向均勻塗抹，停留 3 分鐘後沖淨' },
      { role: 'Step 3 · 護毛（免沖，進階選用）', name: '燕麥免沖護毛素 Oatmeal Leave-On Conditioner', dilution: '免稀釋，少量噴於毛尖', time: '不沖淨，吹整前使用效果更好' }
    ],
  },
  {
    product_key: 'natural_elastic',
    name_zh: '天然柔韌彈性',
    name_en: 'Natural Soft & Elastic',
    name_cn: '天然柔韧弹性',
    name_ja: 'ナチュラル・ソフト＆エラスティック',
    category: 'shampoo',
    series: 'salon',
    tag_zh: '軟毛・飄逸毛・恢復柔韌彈性',
    tag_en: 'Soft coat, flowing coat, restores elasticity',
    tag_cn: '软毛・飘逸毛・恢复柔韧弹性',
    tag_ja: 'ソフトコート・しなやかな毛・弾力回復',
    reason_zh: '天然洋李萃取，適合貓狗軟毛和飄逸毛質，恢復毛髮柔韌彈性，讓被毛更有光澤感。',
    reason_en: 'Natural plum extract restores elasticity and shine to soft, flowing coats for both dogs and cats.',
    reason_cn: '天然洋李萃取，适合猫狗软毛和飘逸毛质，恢复毛发柔韧弹性，让被毛更有光泽感。',
    reason_ja: '天然プラムエキスがソフトコートの弾力と光沢を回復。犬猫のしなやかな毛質に最適。',
    dilution: '24:1',
    dwell_time: '3min',
    usage_steps: [
      { role: 'Step 1 · 主洗', name: '天然洋李洗劑 Plum Natural Shampoo', dilution: '稀釋 24:1（水:洗劑）', time: '停留 3 分鐘，溫和清潔' },
      { role: 'Step 2 · 護毛', name: '滋潤護毛素 Creme Rinse & Conditioner', dilution: '稀釋 7:1（水:護毛素）', time: '停留 3 分鐘後沖淨' }
    ],
  },
  {
    product_key: 'white_coat_brighten',
    name_zh: '淺色白毛亮澤',
    name_en: 'Light & White Coat Brightening',
    name_cn: '浅色白毛亮泽',
    name_ja: 'ライト＆ホワイトコート・ブライトニング',
    category: 'shampoo',
    series: 'show_beauty',
    tag_zh: '白毛・淺色系・抗氧化提亮',
    tag_en: 'White coat, light colors, anti-oxidation brightening',
    tag_cn: '白毛・浅色系・抗氧化提亮',
    tag_ja: 'ホワイトコート・ライトカラー・抗酸化ブライトニング',
    reason_zh: '特別適合白毛抗氧化，讓淺色系毛髮看起來更乾淨亮白，色澤呈現更均勻。',
    reason_en: 'Anti-oxidation formula specially designed for white coats, making light-colored fur look cleaner and brighter.',
    reason_cn: '特别适合白毛抗氧化，让浅色系毛发看起来更干净亮白，色泽呈现更均匀。',
    reason_ja: 'ホワイトコートの酸化防止に特化。淡い色の被毛をより清潔で明るく、均一な色合いに。',
    dilution: '10:1',
    dwell_time: '5min',
    usage_steps: [
      { role: 'Step 1 · 主洗', name: '高級炫彩洗劑 Premium Color Enhancing Shampoo', dilution: '稀釋 10:1（水:洗劑）', time: '停留 5 分鐘，特別適合白毛抗氧化' },
      { role: 'Step 2 · 護毛', name: '滋潤護毛素 Creme Rinse & Conditioner', dilution: '稀釋 7:1（水:護毛素）', time: '停留 3 分鐘後沖淨，提升光澤感' }
    ],
  },
  {
    product_key: 'dark_coat_brighten',
    name_zh: '黑色深色亮澤',
    name_en: 'Black & Dark Coat Brightening',
    name_cn: '黑色深色亮泽',
    name_ja: 'ブラック＆ダークコート・ブライトニング',
    category: 'shampoo',
    series: 'show_beauty',
    tag_zh: '黑毛・深色系・滋潤溫和配方',
    tag_en: 'Black coat, dark colors, moisturizing gentle formula',
    tag_cn: '黑毛・深色系・滋润温和配方',
    tag_ja: 'ブラックコート・ダークカラー・保湿ジェントル処方',
    reason_zh: '滋潤溫和配方，洗後深色毛髮更顯亮澤乾淨，視覺差異明顯。適合展示前使用。',
    reason_en: 'Moisturizing gentle formula. Dark coats look noticeably shinier and cleaner after use. Great for show prep.',
    reason_cn: '滋润温和配方，洗后深色毛发更显亮泽干净，视觉差异明显。适合展示前使用。',
    reason_ja: '保湿ジェントル処方。ダークコートが明らかに艶やかで清潔に。ショー前の使用に最適。',
    dilution: '10:1',
    dwell_time: '5min',
    usage_steps: [
      { role: 'Step 1 · 主洗', name: '炫黑洗劑 Black Coat Shampoo', dilution: '稀釋 10:1（水:洗劑）', time: '停留 5 分鐘，讓色澤成分充分滲透' },
      { role: 'Step 2 · 護毛', name: '滋潤護毛素 Creme Rinse & Conditioner', dilution: '稀釋 7:1（水:護毛素）', time: '停留 3 分鐘後沖淨，提升光澤感' }
    ],
  },
  {
    product_key: 'deshed_dog',
    name_zh: '掉毛季（犬）',
    name_en: 'De-Shedding Season (Dog)',
    name_cn: '掉毛季（犬）',
    name_ja: '換毛期（犬）',
    category: 'shampoo',
    series: 'salon',
    tag_zh: '換毛季・雙層毛・提升梳理效率',
    tag_en: 'Shedding season, double coat, improved brushing efficiency',
    tag_cn: '换毛季・双层毛・提升梳理效率',
    tag_ja: '換毛期・ダブルコート・ブラッシング効率アップ',
    reason_zh: '富含泛醇、氨基酸等營養成分強化健康毛囊，幫助浮毛脫落，梳毛前後差異明顯。換毛季必備。',
    reason_en: 'Rich in panthenol and amino acids to strengthen healthy follicles. Helps loose fur shed easily. Essential for shedding season.',
    reason_cn: '富含泛醇、氨基酸等营养成分强化健康毛囊，帮助浮毛脱落，梳毛前后差异明显。换毛季必备。',
    reason_ja: 'パンテノールやアミノ酸で健康な毛包を強化。浮き毛の脱落を促進。換毛期の必需品。',
    note_zh: '非常髒可前置強效洗劑做底層預清潔，再接掉毛季流程。',
    note_en: 'For very dirty pets, pre-wash with heavy duty shampoo before de-shedding routine.',
    note_cn: '非常脏可前置强效洗剂做底层预清洁，再接掉毛季流程。',
    note_ja: '非常に汚れている場合は、換毛ケアの前に強力シャンプーで予洗いしてください。',
    dilution: '10:1',
    dwell_time: '5min',
    usage_steps: [
      { role: 'Step 1 · 主洗', name: '輕盈洗劑 Davis De-Shed Shampoo', dilution: '稀釋 10:1（水:洗劑）', time: '停留 5 分鐘，充分按摩底層被毛' },
      { role: 'Step 2 · 輕盈乳液', name: '輕盈乳液 Davis De-Shed Rinser', dilution: '稀釋 7:1（水:乳液）', time: '停留 3 分鐘後沖淨；洗後趁濕梳毛效率最高' }
    ],
  },
  {
    product_key: 'deshed_cat',
    name_zh: '掉毛季（貓）',
    name_en: 'De-Shedding Season (Cat)',
    name_cn: '掉毛季（猫）',
    name_ja: '換毛期（猫）',
    category: 'shampoo',
    series: 'salon',
    tag_zh: '貓咪換毛季・PH值更偏向貓・低敏',
    tag_en: 'Cat shedding season, cat-optimized pH, hypoallergenic',
    tag_cn: '猫咪换毛季・PH值更偏向猫・低敏',
    tag_ja: '猫の換毛期・猫に最適なpH・低刺激',
    reason_zh: 'PH值和香味更偏向貓，對貓來講更低敏。適合藍貓類型毛質，換毛季清潔與梳理效率大幅提升。',
    reason_en: 'pH and fragrance optimized for cats, lower sensitivity. Ideal for British Shorthair type coats. Greatly improves shedding season grooming.',
    reason_cn: 'PH值和香味更偏向猫，对猫来讲更低敏。适合蓝猫类型毛质，换毛季清洁与梳理效率大幅提升。',
    reason_ja: 'pHと香りが猫に最適化された低刺激処方。ブリティッシュショートヘアタイプの毛質に最適。換毛期のグルーミング効率を大幅に向上。',
    note_zh: '只做貓洗護的店鋪首選貓專用版本。',
    note_en: 'Cat-only grooming shops should choose this cat-specific version.',
    note_cn: '只做猫洗护的店铺首选猫专用版本。',
    note_ja: '猫専門のグルーミングショップにはこの猫専用バージョンがおすすめ。',
    dilution: '10:1',
    dwell_time: '3-5min',
    usage_steps: [
      { role: 'Step 1 · 主洗（貓專用）', name: '輕盈洗劑貓用 Davis De-Shed Plus Shampoo', dilution: '稀釋 10:1（水:洗劑）', time: '輕柔按摩，停留 3–5 分鐘' },
      { role: 'Step 2 · 輕盈乳液', name: '輕盈乳液 Davis De-Shed Rinser', dilution: '稀釋 7:1（水:乳液）', time: '停留 3 分鐘後沖淨' }
    ],
  },
  {
    product_key: 'hypoallergenic_daily',
    name_zh: '低敏日常保養',
    name_en: 'Hypoallergenic Daily Care',
    name_cn: '低敏日常保养',
    name_ja: '低刺激デイリーケア',
    category: 'shampoo',
    series: 'skin_care',
    tag_zh: '幼犬幼貓・敏感皮膚・乾燥季日常',
    tag_en: 'Puppies, kittens, sensitive skin, dry season daily',
    tag_cn: '幼犬幼猫・敏感皮肤・干燥季日常',
    tag_ja: '子犬・子猫・敏感肌・乾燥シーズンのデイリーケア',
    reason_zh: '膠狀燕麥成分起到保濕和舒緩作用，緩解乾燥引起的瘙癢發紅。短毛、超短毛、無毛品種首選。',
    reason_en: 'Colloidal oatmeal moisturizes and soothes, relieving dryness-related itching and redness. Best for short, ultra-short, and hairless breeds.',
    reason_cn: '胶状燕麦成分起到保湿和舒缓作用，缓解干燥引起的瘙痒发红。短毛、超短毛、无毛品种首选。',
    reason_ja: 'コロイダルオートミールが保湿・鎮静。乾燥によるかゆみや赤みを緩和。短毛・超短毛・無毛種に最適。',
    note_zh: '適合幼犬幼貓、老年犬貓、皮膚敏感個體，或乾燥季節日常保養。',
    note_en: 'Suitable for puppies, kittens, seniors, sensitive individuals, or dry season daily care.',
    note_cn: '适合幼犬幼猫、老年犬猫、皮肤敏感个体，或干燥季节日常保养。',
    note_ja: '子犬・子猫・シニア・敏感肌の個体、または乾燥シーズンのデイリーケアに最適。',
    dilution: '12:1',
    dwell_time: '2-3min',
    usage_steps: [
      { role: 'Step 1 · 溫和主洗', name: '燕麥蘆薈洗劑 Oatmeal & Aloe Shampoo', dilution: '稀釋 12:1（水:洗劑）', time: '溫柔按摩全身，停留 2–3 分鐘' },
      { role: 'Step 2 · 護毛（免沖）', name: '燕麥免沖護毛素 Oatmeal Leave-On Conditioner', dilution: '免稀釋，均勻噴塗全身', time: '不沖淨，直接吹乾即可' }
    ],
  },
  {
    product_key: 'humid_oil_control',
    name_zh: '潮濕控油止癢',
    name_en: 'Humid Season Oil Control',
    name_cn: '潮湿控油止痒',
    name_ja: '湿気シーズン・オイルコントロール',
    category: 'shampoo',
    series: 'salon',
    tag_zh: '潮濕季節・油脂旺盛・體味重',
    tag_en: 'Humid season, oily skin, strong body odor',
    tag_cn: '潮湿季节・油脂旺盛・体味重',
    tag_ja: '湿気の多い季節・オイリースキン・体臭が強い',
    reason_zh: '潮濕季節油脂分泌旺盛時使用，有效分解體味，讓毛孩長時間保持清爽。',
    reason_en: 'For humid seasons with excessive oil secretion. Effectively breaks down body odor, keeping pets fresh longer.',
    reason_cn: '潮湿季节油脂分泌旺盛时使用，有效分解体味，让毛孩长时间保持清爽。',
    reason_ja: '湿気の多い季節の過剰な皮脂分泌に。体臭を効果的に分解し、長時間清潔を維持。',
    dilution: '12:1',
    dwell_time: '5min',
    usage_steps: [
      { role: 'Step 1 · 主洗（分解體味）', name: '奢華洗劑 Davis Best Luxury Shampoo', dilution: '稀釋 12:1（水:洗劑）', time: '停留 5 分鐘，分解體味' },
      { role: 'Step 2 · 護毛', name: '滋潤護毛素 Creme Rinse & Conditioner', dilution: '稀釋 7:1（水:護毛素）', time: '停留 3 分鐘後沖淨' }
    ],
  },
  {
    product_key: 'flat_face_eye_clean',
    name_zh: '扁臉眼周清潔',
    name_en: 'Flat Face & Eye Area Cleaning',
    name_cn: '扁脸眼周清洁',
    name_ja: 'フラットフェイス・アイエリアクレンジング',
    category: 'specialty',
    series: 'skin_care',
    tag_zh: '扁臉犬貓・淚痕・眼周精細清潔',
    tag_en: 'Flat-faced breeds, tear stains, detailed eye area cleaning',
    tag_cn: '扁脸犬猫・泪痕・眼周精细清洁',
    tag_ja: '短頭種・涙やけ・目の周りの精密クレンジング',
    reason_zh: '甜瓜洗劑無皂無淚配方，溫和無負擔，適合藥浴前準備。潔面乳無淚配方專門溫和去除面部污垢和暗沉，有淚痕的犬貓首選。',
    reason_en: 'Tearless cucumber melon formula, gentle and suitable for pre-medicated bath. Facial cleanser gently removes facial grime and dark stains. Best for tear-stained pets.',
    reason_cn: '甜瓜洗剂无皂无泪配方，温和无负担，适合药浴前准备。洁面乳无泪配方专门温和去除面部污垢和暗沉，有泪痕的犬猫首选。',
    reason_ja: 'キューカンバーメロンの無涙処方。穏やかで薬浴前の準備に最適。フェイシャルクレンザーが顔の汚れや涙やけを優しく除去。',
    note_zh: '少量多次、分區處理、嚴格避開眼球。若眼周出現紅腫或異常分泌物，請諮詢獸醫。',
    note_en: 'Apply small amounts repeatedly, work in sections, strictly avoid eyeball. Consult vet if redness or abnormal discharge occurs.',
    note_cn: '少量多次、分区处理、严格避开眼球。若眼周出现红肿或异常分泌物，请咨询兽医。',
    note_ja: '少量ずつ繰り返し塗布し、部分的に処理。眼球は厳禁。赤みや異常な分泌物がある場合は獣医師に相談。',
    dilution: '10:1',
    dwell_time: '3-5min',
    usage_steps: [
      { role: 'Step 1 · 全身主洗（無皂無淚）', name: '甜瓜洗劑 Pure Planet Cucumber Melon Shampoo', dilution: '稀釋 10:1（水:洗劑）；16盎司為即用配方', time: '全身使用，臉部可輕洗，嚴格避開眼球' },
      { role: 'Step 2 · 眼周精細清潔', name: 'Davis Spa 潔面乳 Davis Spa Facial', dilution: '少量直接使用，不稀釋', time: '沿眼周外圈少量多次，濕布擦拭或沖淨' }
    ],
  },
  {
    product_key: 'spa_deep_clean',
    name_zh: 'SPA深層清潔',
    name_en: 'SPA Deep Cleansing',
    name_cn: 'SPA深层清洁',
    name_ja: 'SPAディープクレンジング',
    category: 'spa',
    series: 'salon',
    tag_zh: 'SPA進階・深層清潔・比強效更溫和',
    tag_en: 'SPA advanced, deep cleansing, gentler than heavy duty',
    tag_cn: 'SPA进阶・深层清洁・比强效更温和',
    tag_ja: 'SPAアドバンスド・ディープクレンジング・強力洗剤より穏やか',
    reason_zh: '一般選擇進階系列的客戶使用，比強效更溫和。深層清潔毛囊，配合SPA護毛素讓毛質全面升級。',
    reason_en: 'For clients choosing premium services. Gentler than heavy duty. Deep cleanses follicles with SPA conditioner for overall coat upgrade.',
    reason_cn: '一般选择进阶系列的客户使用，比强效更温和。深层清洁毛囊，配合SPA护毛素让毛质全面升级。',
    reason_ja: 'プレミアムサービスを選ぶお客様向け。強力洗剤より穏やか。SPAコンディショナーとの組み合わせで毛質を全面的にアップグレード。',
    note_zh: '薰衣草系列適合柔順升級，竹節花系列適合蓬鬆升級。',
    note_en: 'Lavender series for smoothing upgrade, Flower Bamboo series for volume upgrade.',
    note_cn: '薰衣草系列适合柔顺升级，竹节花系列适合蓬松升级。',
    note_ja: 'ラベンダーシリーズはスムージングアップグレードに、フラワーバンブーシリーズはボリュームアップグレードに。',
    dilution: '50:1',
    dwell_time: '5min',
    usage_steps: [
      { role: 'Step 1 · SPA進階清潔', name: '純粹深層清潔洗劑 Pure Planet Deep Cleansing Shampoo', dilution: '稀釋 50:1（水:洗劑）', time: '停留 5 分鐘，溫和而徹底滲透毛囊' },
      { role: 'Step 2 · SPA護毛', name: '純粹護毛素 Pure Planet Complete Conditioner', dilution: '稀釋 10:1（水:護毛素）', time: '均勻塗抹後沖淨' },
      { role: 'Step 3 · 毛質升級（選用）', name: '魔力薰衣草洗劑 Lavender Magic Shampoo 或 竹節花洗劑 Flower Bamboo Shampoo', dilution: '稀釋 10:1', time: '停留 3 分鐘後沖淨' }
    ],
  },
];

// ============================================================
// BREEDS DATA (40 breeds from legacy index.html)
// ============================================================

// Map legacy Chinese scenario names → product_keys
const SCENARIO_TO_KEY = {
  '蓬鬆硬毛造型': 'fluffy_coarse_styling',
  '柔順解結': 'detangling',
  '天然柔韌彈性': 'natural_elastic',
  '淺色白毛亮澤': 'white_coat_brighten',
  '黑色深色亮澤': 'dark_coat_brighten',
  '去油深層清潔': 'degrease_deep_clean',
  '強效深層清潔': 'heavy_duty_clean',
  '去油膏前置處理': 'degrease_pretreat',
  '蘇打燕麥溫和清潔': 'oatmeal_gentle_clean',
  '掉毛季（犬）': 'deshed_dog',
  '掉毛季（貓）': 'deshed_cat',
  '低敏日常保養': 'hypoallergenic_daily',
  '潮濕控油止癢': 'humid_oil_control',
  '扁臉眼周清潔': 'flat_face_eye_clean',
  'SPA深層清潔': 'spa_deep_clean',
};

const breeds = [
  // ── 犬 - 蓬鬆造型類 ──
  { species: 'dog', name: '貴賓犬', name_en: 'Poodle', name_ja: 'プードル', name_cn: '贵宾犬', emoji: '🐩', coat_types: ['捲毛'], davis_breed_id: 'poodle', scenarios: ['蓬鬆硬毛造型'], aliases: ['貴賓（迷你/玩具）','中型貴賓','巨型貴賓'] },
  { species: 'dog', name: '比熊犬', name_en: 'Bichon Frise', name_ja: 'ビション・フリーゼ', name_cn: '比熊犬', emoji: '☁️', coat_types: ['捲毛'], davis_breed_id: 'bichon', scenarios: ['蓬鬆硬毛造型'], aliases: ['比熊'] },
  { species: 'dog', name: '博美犬', name_en: 'Pomeranian', name_ja: 'ポメラニアン', name_cn: '博美犬', emoji: '🦊', coat_types: ['長毛','雙層毛'], davis_breed_id: 'pomeranian', scenarios: ['蓬鬆硬毛造型','淺色白毛亮澤'], aliases: ['博美'] },
  { species: 'dog', name: '雪納瑞', name_en: 'Schnauzer', name_ja: 'シュナウザー', name_cn: '雪纳瑞', coat_types: ['硬毛'], davis_breed_id: 'schnauzer', scenarios: ['蓬鬆硬毛造型','去油深層清潔'], aliases: ['迷你雪納瑞','中型雪納瑞'] },
  // ── 犬 - 長毛柔順類 ──
  { species: 'dog', name: '馬爾濟斯', name_en: 'Maltese', name_ja: 'マルチーズ', name_cn: '马尔济斯', emoji: '🤍', coat_types: ['長毛'], davis_breed_id: 'maltese', scenarios: ['柔順解結'], aliases: ['馬爾濟斯'] },
  { species: 'dog', name: '瑪爾泰迪', name_en: 'Maltipoo', name_ja: 'マルプー', name_cn: '玛尔泰迪', emoji: '🧸', coat_types: ['捲毛','長毛'], davis_breed_id: 'maltipoo', scenarios: ['淺色白毛亮澤','柔順解結'] },
  { species: 'dog', name: '約克夏㹴', name_en: 'Yorkshire Terrier', name_ja: 'ヨークシャー・テリア', name_cn: '约克夏梗', coat_types: ['長毛'], davis_breed_id: 'yorkie', scenarios: ['柔順解結'], aliases: ['約克夏'] },
  { species: 'dog', name: '西施犬', name_en: 'Shih Tzu', name_ja: 'シー・ズー', name_cn: '西施犬', coat_types: ['長毛'], davis_breed_id: 'shih_tzu', scenarios: ['柔順解結','扁臉眼周清潔'], aliases: ['西施'] },
  { species: 'dog', name: '西高地白梗', name_en: 'West Highland White Terrier', name_ja: 'ウエスト・ハイランド・ホワイト・テリア', name_cn: '西高地白梗', coat_types: ['硬毛'], davis_breed_id: 'westie', scenarios: ['蓬鬆硬毛造型','淺色白毛亮澤'] },
  // ── 犬 - 小型活力類 ──
  { species: 'dog', name: '吉娃娃', name_en: 'Chihuahua', name_ja: 'チワワ', name_cn: '吉娃娃', coat_types: ['短毛'], davis_breed_id: 'chihuahua', scenarios: ['蘇打燕麥溫和清潔'], aliases: ['吉娃娃'] },
  { species: 'dog', name: '臘腸犬', name_en: 'Dachshund', name_ja: 'ダックスフント', name_cn: '腊肠犬', coat_types: ['短毛'], davis_breed_id: 'dachshund', scenarios: ['去油深層清潔'], aliases: ['臘腸'] },
  { species: 'dog', name: '蝴蝶犬', name_en: 'Papillon', name_ja: 'パピヨン', name_cn: '蝴蝶犬', coat_types: ['長毛'], davis_breed_id: 'papillon', scenarios: ['柔順解結'], aliases: ['蝴蝶犬'] },
  { species: 'dog', name: '迷你品犬', name_en: 'Miniature Pinscher', name_ja: 'ミニチュア・ピンシャー', name_cn: '迷你品犬', coat_types: ['短毛'], davis_breed_id: 'min_pin', scenarios: ['去油深層清潔'], aliases: ['迷你品犬'] },
  { species: 'dog', name: '傑克羅素㹴', name_en: 'Jack Russell Terrier', name_ja: 'ジャック・ラッセル・テリア', name_cn: '杰克罗素梗', coat_types: ['短毛'], davis_breed_id: 'jack_russell', scenarios: ['去油深層清潔'], aliases: ['傑克羅素'] },
  // ── 犬 - 扁臉類 ──
  { species: 'dog', name: '法國鬥牛犬', name_en: 'French Bulldog', name_ja: 'フレンチ・ブルドッグ', name_cn: '法国斗牛犬', coat_types: ['短毛'], davis_breed_id: 'french_bulldog', scenarios: ['去油深層清潔','扁臉眼周清潔'], aliases: ['法鬥'] },
  { species: 'dog', name: '英國鬥牛犬', name_en: 'English Bulldog', name_ja: 'イングリッシュ・ブルドッグ', name_cn: '英国斗牛犬', coat_types: ['短毛'], davis_breed_id: 'english_bulldog', scenarios: ['去油深層清潔','扁臉眼周清潔'] },
  { species: 'dog', name: '巴哥犬', name_en: 'Pug', name_ja: 'パグ', name_cn: '巴哥犬', emoji: '🐶', coat_types: ['短毛'], davis_breed_id: 'pug', scenarios: ['去油深層清潔','扁臉眼周清潔'], aliases: ['巴哥'] },
  // ── 犬 - 中型犬 ──
  { species: 'dog', name: '可卡犬', name_en: 'Cocker Spaniel', name_ja: 'コッカー・スパニエル', name_cn: '可卡犬', coat_types: ['長毛'], davis_breed_id: 'cocker', scenarios: ['柔順解結','去油深層清潔'], aliases: ['可卡'] },
  { species: 'dog', name: '比特犬', name_en: 'Pit Bull', name_ja: 'ピットブル', name_cn: '比特犬', coat_types: ['短毛'], davis_breed_id: 'pitbull', scenarios: ['去油深層清潔'], aliases: ['比特犬'] },
  // ── 犬 - 掉毛類 ──
  { species: 'dog', name: '柯基', name_en: 'Corgi', name_ja: 'コーギー', name_cn: '柯基', emoji: '🦮', coat_types: ['雙層毛'], davis_breed_id: 'corgi', scenarios: ['掉毛季（犬）'], aliases: ['柯基'] },
  { species: 'dog', name: '柴犬', name_en: 'Shiba Inu', name_ja: '柴犬', name_cn: '柴犬', emoji: '🦊', coat_types: ['雙層毛'], davis_breed_id: 'shiba', scenarios: ['掉毛季（犬）'], aliases: ['柴犬'] },
  { species: 'dog', name: '拉布拉多', name_en: 'Labrador Retriever', name_ja: 'ラブラドール・レトリバー', name_cn: '拉布拉多', coat_types: ['短毛','雙層毛'], davis_breed_id: 'labrador', scenarios: ['掉毛季（犬）','強效深層清潔'] },
  { species: 'dog', name: '黃金獵犬', name_en: 'Golden Retriever', name_ja: 'ゴールデン・レトリバー', name_cn: '金毛猎犬', coat_types: ['長毛','雙層毛'], davis_breed_id: 'golden', scenarios: ['掉毛季（犬）','柔順解結'] },
  { species: 'dog', name: '哈士奇', name_en: 'Husky', name_ja: 'ハスキー', name_cn: '哈士奇', coat_types: ['雙層毛'], davis_breed_id: 'husky', scenarios: ['掉毛季（犬）'] },
  { species: 'dog', name: '薩摩耶', name_en: 'Samoyed', name_ja: 'サモエド', name_cn: '萨摩耶', emoji: '☁️', coat_types: ['長毛','雙層毛'], davis_breed_id: 'samoyed', scenarios: ['掉毛季（犬）','淺色白毛亮澤'], aliases: ['薩摩耶'] },
  { species: 'dog', name: '邊境牧羊犬', name_en: 'Border Collie', name_ja: 'ボーダー・コリー', name_cn: '边境牧羊犬', coat_types: ['長毛','雙層毛'], davis_breed_id: 'border_collie', scenarios: ['掉毛季（犬）','柔順解結'], aliases: ['邊境牧羊犬'] },
  { species: 'dog', name: '德國牧羊犬', name_en: 'German Shepherd', name_ja: 'ジャーマン・シェパード', name_cn: '德国牧羊犬', coat_types: ['雙層毛'], davis_breed_id: 'german_shepherd', scenarios: ['掉毛季（犬）','強效深層清潔'], aliases: ['德國牧羊犬'] },
  { species: 'dog', name: '伯恩山犬', name_en: 'Bernese Mountain Dog', name_ja: 'バーニーズ・マウンテン・ドッグ', name_cn: '伯恩山犬', coat_types: ['長毛','雙層毛'], davis_breed_id: 'bernese', scenarios: ['掉毛季（犬）','柔順解結'], aliases: ['伯恩山犬'] },
  { species: 'dog', name: '秋田犬', name_en: 'Akita', name_ja: '秋田犬', name_cn: '秋田犬', coat_types: ['雙層毛'], davis_breed_id: 'akita', scenarios: ['掉毛季（犬）'], aliases: ['秋田犬'] },
  { species: 'dog', name: '大麥町', name_en: 'Dalmatian', name_ja: 'ダルメシアン', name_cn: '大麦町', coat_types: ['短毛'], davis_breed_id: 'dalmatian', scenarios: ['去油深層清潔'], aliases: ['大麥町'] },
  // ── 犬 - 其他 ──
  { species: 'dog', name: '米格魯', name_en: 'Beagle', name_ja: 'ビーグル', name_cn: '米格鲁', emoji: '🐶', coat_types: ['短毛'], davis_breed_id: 'beagle', scenarios: ['去油深層清潔'], aliases: ['米格魯'] },
  { species: 'dog', name: '米克斯犬', name_en: 'Mixed Breed', name_ja: 'ミックス犬', name_cn: '混种犬', emoji: '🐕', coat_types: ['混合'], davis_breed_id: 'mixed_dog', scenarios: ['去油深層清潔'], aliases: ['米克斯'] },
  { species: 'dog', name: '幼犬', name_en: 'Puppy', name_ja: '子犬', name_cn: '幼犬', emoji: '🐣', coat_types: ['混合'], davis_breed_id: 'puppy', scenarios: ['蘇打燕麥溫和清潔'] },
  // ── 貓 - 短毛類 ──
  { species: 'cat', name: '英國短毛貓', name_en: 'British Shorthair', name_ja: 'ブリティッシュ・ショートヘア', name_cn: '英国短毛猫', emoji: '🐈', coat_types: ['短毛','雙層毛'], davis_breed_id: 'british_sh', scenarios: ['掉毛季（貓）','低敏日常保養'] },
  { species: 'cat', name: '美國短毛貓', name_en: 'American Shorthair', name_ja: 'アメリカン・ショートヘア', name_cn: '美国短毛猫', coat_types: ['短毛'], davis_breed_id: 'american_sh', scenarios: ['掉毛季（貓）'] },
  { species: 'cat', name: '俄羅斯藍貓', name_en: 'Russian Blue', name_ja: 'ロシアンブルー', name_cn: '俄罗斯蓝猫', coat_types: ['短毛','雙層毛'], davis_breed_id: 'russian_blue', scenarios: ['掉毛季（貓）','黑色深色亮澤'] },
  { species: 'cat', name: '蘇格蘭折耳', name_en: 'Scottish Fold', name_ja: 'スコティッシュ・フォールド', name_cn: '苏格兰折耳', coat_types: ['短毛'], davis_breed_id: 'scottish_fold', scenarios: ['低敏日常保養'] },
  // ── 貓 - 長毛類 ──
  { species: 'cat', name: '布偶貓', name_en: 'Ragdoll', name_ja: 'ラグドール', name_cn: '布偶猫', emoji: '💜', coat_types: ['長毛'], davis_breed_id: 'ragdoll', scenarios: ['柔順解結','掉毛季（貓）'] },
  { species: 'cat', name: '緬因貓', name_en: 'Maine Coon', name_ja: 'メインクーン', name_cn: '缅因猫', coat_types: ['長毛'], davis_breed_id: 'maine_coon', scenarios: ['柔順解結','掉毛季（貓）'] },
  { species: 'cat', name: '波斯貓', name_en: 'Persian', name_ja: 'ペルシャ', name_cn: '波斯猫', coat_types: ['長毛'], davis_breed_id: 'persian', scenarios: ['柔順解結','扁臉眼周清潔'] },
  { species: 'cat', name: '金吉拉', name_en: 'Chinchilla', name_ja: 'チンチラ', name_cn: '金吉拉', coat_types: ['長毛'], davis_breed_id: 'chinchilla', scenarios: ['柔順解結','淺色白毛亮澤'] },
  // ── 貓 - 扁臉 ──
  { species: 'cat', name: '異國短毛貓', name_en: 'Exotic Shorthair', name_ja: 'エキゾチック・ショートヘア', name_cn: '异国短毛猫', coat_types: ['短毛'], davis_breed_id: 'exotic_sh', scenarios: ['扁臉眼周清潔','低敏日常保養'] },
  { species: 'cat', name: '幼貓', name_en: 'Kitten', name_ja: '子猫', name_cn: '幼猫', emoji: '🐣', coat_types: ['混合'], davis_breed_id: 'kitten', scenarios: ['蘇打燕麥溫和清潔'] },
];

// Normalize product keys — ensure all objects have the same fields
const allProductKeys = new Set();
products.forEach(p => Object.keys(p).forEach(k => allProductKeys.add(k)));
products.forEach(p => {
  for (const k of allProductKeys) {
    if (!(k in p)) p[k] = null;
  }
});

// Transform breeds for Supabase insert
const breedRows = breeds.map(b => ({
  species: b.species,
  name: b.name,
  name_en: b.name_en,
  name_ja: b.name_ja,
  name_cn: b.name_cn,
  emoji: b.emoji || null,
  coat_types: b.coat_types,
  davis_breed_id: b.davis_breed_id,
  davis_product_keys: b.scenarios.map(s => SCENARIO_TO_KEY[s]).filter(Boolean),
  aliases: b.aliases || [],
  is_active: true,
  sort_order: 0,
}));

// ============================================================
// SEED FUNCTIONS
// ============================================================
async function seedTable(table, rows) {
  console.log(`\nSeeding ${table} (${rows.length} rows)...`);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(rows),
  });
  const text = await res.text();
  if (res.ok) {
    console.log(`  ✅ ${table}: ${res.status} OK`);
  } else {
    console.error(`  ❌ ${table}: ${res.status}`, text);
  }
  return res.ok;
}

async function main() {
  console.log('=== Davis Supabase Seed ===');
  console.log('URL:', SUPABASE_URL);
  console.log('Key:', SERVICE_KEY.substring(0, 20) + '...');

  const p = await seedTable('davis_products', products);
  const b = await seedTable('breed_groups', breedRows);

  // Verify
  console.log('\n=== Verification ===');
  for (const table of ['davis_products', 'breed_groups']) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=id&limit=1`, { headers });
    const data = await r.json();
    console.log(`${table}: ${r.status === 200 ? '✅' : '❌'} (${Array.isArray(data) ? data.length + '+ rows' : 'error'})`);
  }

  if (p && b) {
    console.log('\n🎉 Seed complete!');
  } else {
    console.log('\n⚠️  Some seeds failed. Check errors above.');
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
