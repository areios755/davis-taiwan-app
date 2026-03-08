import type { Handler, HandlerEvent } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from './lib/cors';

// ============================================================
// Rate Limiting
// ============================================================
const RATE_WINDOW = 60_000;
const RATE_MAX = 10;
const rateMap = new Map<string, { count: number; resetAt: number }>();

function checkRate(ip: string): boolean {
  const now = Date.now();
  const e = rateMap.get(ip);
  if (!e || now > e.resetAt) { rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW }); return true; }
  if (e.count >= RATE_MAX) return false;
  e.count++;
  return true;
}

// ============================================================
// Language rules (from legacy)
// ============================================================
const LANG_RULES: Record<string, string> = {
  'zh-TW': '所有文字欄位（coat_analysis/note/tagline/highlight/tip/mix_note）輸出繁體中文。',
  'zh-CN': '所有文字欄位（coat_analysis/note/tagline/highlight/tip/mix_note）輸出簡體中文。',
  'en': 'Output all text fields (coat_analysis/note/tagline/highlight/tip/mix_note) in concise professional English suitable for groomers. Keep breed/pet_type in Chinese.',
  'ja': 'すべてのテキストフィールド（coat_analysis/note/tagline/highlight/tip/mix_note）を日本語で出力。breed/pet_typeは中国語のまま。',
};

// ============================================================
// Product name normalization
// ============================================================
const PRODUCT_NORMALIZE: Record<string, string> = {
  'Luxury Shampoo': '奢華洗劑', 'Davis Best Luxury Shampoo': '奢華洗劑',
  'Grubby Dog Shampoo': '強效清潔洗劑', 'Detangling Shampoo': '柔順洗劑',
  'Texturizing Shampoo': '質感洗劑', 'De-Shed Shampoo': '輕盈洗劑',
  'Premium Color Enhancing Shampoo': '高級炫彩洗劑', 'Black Coat Shampoo': '炫黑洗劑',
  'Oatmeal & Aloe Shampoo': '燕麥蘆薈洗劑', 'Baking Soda & Oatmeal Shampoo': '蘇打燕麥洗劑',
  'Lather-A-Pup Citrus Shampoo': '泡沫柑橘洗劑', 'Pure Planet Cucumber Melon Shampoo': '水療甜瓜洗劑',
  'Plum Natural Shampoo': '洋李天然洗劑', 'Creme Rinse & Conditioner': '滋潤護毛素',
  'Pure Planet Complete Conditioner': '純粹全效護毛素', 'Oatmeal Leave-On Conditioner': '燕麥蘆薈護毛素',
  'De-Shed Rinser': '輕盈乳液', 'Pure Planet Deep Cleansing Shampoo': '純粹深層清潔洗劑',
  'Lavender Magic Shampoo': '魔力薰衣草洗劑', 'Flower Bamboo Shampoo': '竹節花香氛洗劑',
  'Davis Degrease Shampoo': '戴維斯去油膏', 'Davis Spa Facial': 'Davis Spa 潔面乳',
};

function normalizeProduct(name: string): string {
  return PRODUCT_NORMALIZE[name.trim()] ?? name.trim();
}

// ============================================================
// Season hint
// ============================================================
function seasonHint(): string {
  const m = new Date().getMonth() + 1;
  if ([3, 4, 5].includes(m)) return '春季換毛期，加強底層護理除廢毛';
  if ([6, 7, 8].includes(m)) return '夏季高溫潮濕，加強清潔力除臭';
  if ([9, 10, 11].includes(m)) return '秋季轉乾，加強保濕滋潤';
  return '冬季乾冷，加強深層滋養防靜電';
}

// ============================================================
// Supabase helper
// ============================================================
function getSupa() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// ============================================================
// Handler
// ============================================================
const handler: Handler = async (event: HandlerEvent) => {
  const origin = event.headers['origin'] || event.headers['Origin'];
  const headers = corsHeaders(origin);

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const clientIp = event.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? 'unknown';
  if (!checkRate(clientIp)) return { statusCode: 429, headers, body: JSON.stringify({ error: '請求過於頻繁，請稍後再試' }) };

  try {
    const body = JSON.parse(event.body ?? '{}');
    // Accept both "image" (frontend) and "imageBase64" (legacy) field names
    const imageBase64 = body.image || body.imageBase64;
    const { mediaType, lang, source, is_embed: isEmbed } = body;

    console.log('[analyze] Request origin:', origin);
    console.log('[analyze] Has image:', !!imageBase64, imageBase64 ? `length: ${imageBase64.length}` : 'MISSING');
    console.log('[analyze] Body keys:', Object.keys(body).join(', '));

    if (!imageBase64) return { statusCode: 400, headers, body: JSON.stringify({ error: '缺少圖片' }) };
    if (imageBase64.length > 750_000) return { statusCode: 413, headers, body: JSON.stringify({ error: '圖片太大' }) };

    const apiKey = process.env.ANTHROPIC_API_KEY;
    console.log('[analyze] ANTHROPIC_API_KEY exists:', !!apiKey, apiKey ? `prefix: ${apiKey.slice(0, 10)}...` : 'NOT SET');
    if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'API key not configured' }) };

    const langRule = LANG_RULES[lang] || LANG_RULES['zh-TW'];

    // System prompt — complete product database from legacy
    const systemPrompt = `你是 Davis Taiwan 寵物洗護 AI 顧問。分析照片中的毛孩，用以下產品設計三等級洗護方案。

【產品庫】（名稱:稀釋比例:停留時間）
第一洗: 戴維斯去油膏:原液局部:5min | 強效清潔洗劑:犬50:1貓30:1:3-5min | 泡沫柑橘洗劑:10:1:3-5min | 蘇打燕麥洗劑:10:1:3min | 水療甜瓜洗劑:10:1:3-5min | 奢華洗劑:12:1:5-8min
第二洗: 柔順洗劑:10:1:5-8min | 洋李天然洗劑:24:1:5min | 質感洗劑:10:1:5-8min | 高級炫彩洗劑:10:1:5-8min | 炫黑洗劑:10:1:5-8min | 輕盈洗劑(犬用):10:1:5-8min | 輕盈洗劑(貓用):10:1:5min | 燕麥蘆薈洗劑:12:1:5-8min | 茶樹精油洗劑:5:1:5-10min | 無淚洗劑:10:1:3-5min | 蜂蜜杏仁洗劑:10:1:5-8min | 蘆薈蛋白滋養洗劑:10:1:5-8min | 櫻桃果醬洗劑:10:1:5-8min
SPA第三洗: 純粹深層清潔洗劑:50:1:5-10min | 魔力薰衣草洗劑:10:1:5-8min | 竹節花香氛洗劑:10:1:5-8min | 卡瓦樹舒緩洗劑:10:1:5-10min | 甘甜曲奇洗劑:10:1:5-8min | 熱帶椰子柔順洗劑:10:1:5-8min
護毛素: 純粹全效護毛素:10:1:3-5min沖淨 | 滋潤護毛素:7:1:3-5min沖淨 | 燕麥蘆薈護毛素:7:1:免沖 | 輕盈乳液:7:1:3-5min沖淨

【品種規則】
焦慮型(吉娃娃/博美/貴賓/約克夏/馬爾濟斯/瑪爾泰迪)→Signature必用卡瓦樹舒緩洗劑
體味重(拉拉/黃金/米格魯/法鬥/巴哥)→第一洗必用奢華洗劑
白/淺色毛→第二洗必用高級炫彩洗劑
雙層掉毛(柴/柯基/哈士奇/黃金)→第二洗必用輕盈洗劑(犬用)
扁臉(法鬥/英鬥/巴哥/波斯/異短)→第一洗用水療甜瓜洗劑

【品種辨識】
貴賓 vs 比熊：貴賓口吻部較長/四肢修長；比熊口吻極短眼睛圓大黑眼圈
泰迪熊剪貴賓很常見，頭圓不代表是比熊，台灣白色圓頭捲毛犬優先判貴賓
瑪爾泰迪(Maltipoo)=馬爾濟斯x貴賓，體型嬌小2-4kg，白/淺色多

【照片規則】
沒有貓狗或太模糊→{"no_pet":true}
有清楚寵物→輸出完整JSON

【等級】
Basic:第一洗+護毛素(1洗1護)
Advanced:第一洗+第二洗+護毛素(2洗1護)
Signature:第一洗+第二洗+SPA+護毛素x2(3洗2護)

【當季建議】${seasonHint()}

【輸出語言】
${langRule}

只輸出JSON，格式：
{"breed":"品種","pet_type":"狗或貓","coat_analysis":"毛質(20字內)","tiers":{"basic":{"label":"基礎推薦","tagline":"(25字內)","steps":[{"phase":"第一洗・深層清潔","products":["產品名"],"mix_note":"(15字內)","dilution":"稀釋X:1","dwell_time":"停留X分鐘","tip":"(20字內)"}],"highlight":"(30字內)"},"advanced":{"label":"進階推薦","tagline":"","steps":[],"highlight":""},"signature":{"label":"完美推薦","tagline":"","steps":[],"highlight":""}},"note":"叮嚀(25字內)"}
步驟數不限，三洗二護就是5步。每欄位嚴守字數上限以節省token。`;

    // Read model from settings
    let aiModel = 'claude-haiku-4-5-20251001';
    const sb2 = getSupa();
    if (sb2) {
      const { data: modelSetting } = await sb2.from('davis_settings').select('value').eq('key', 'ai_pricing').single();
      if (modelSetting?.value?.model) aiModel = modelSetting.value.model;
    }

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: aiModel,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: imageBase64 } },
            { type: 'text', text: '分析這隻毛孩，只輸出JSON。' },
          ],
        }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Claude API error:', response.status, errText);
      return { statusCode: 502, headers, body: JSON.stringify({ error: `API錯誤(${response.status})` }) };
    }

    const aiRes = await response.json() as {
      content: Array<{ type: string; text?: string }>;
      stop_reason?: string;
      usage?: { input_tokens?: number; output_tokens?: number };
    };

    // === DEBUG: Full Claude response structure ===
    console.log('=== CLAUDE RAW RESPONSE START ===');
    console.log(JSON.stringify(aiRes.content));
    console.log('=== CLAUDE RAW RESPONSE END ===');
    console.log('Stop reason:', aiRes.stop_reason);

    const rawText = aiRes.content?.find(c => c.type === 'text')?.text ?? '';

    console.log('=== RAW TEXT START ===');
    console.log(rawText.substring(0, 500));
    console.log('=== RAW TEXT END ===');
    console.log('First 3 chars:', JSON.stringify(rawText.substring(0, 3)));
    console.log('Last 3 chars:', JSON.stringify(rawText.substring(rawText.length - 3)));
    console.log('Raw text length:', rawText.length);

    // Parse JSON — robust markdown fence stripping
    let parsed: Record<string, unknown>;
    try {
      let text = rawText.trim();

      // Strip markdown code fences (various formats)
      if (text.startsWith('```json')) {
        text = text.slice(7);
      } else if (text.startsWith('```')) {
        text = text.slice(3);
      }
      if (text.endsWith('```')) {
        text = text.slice(0, -3);
      }
      text = text.trim();

      console.log('After fence strip, first 3 chars:', JSON.stringify(text.substring(0, 3)));
      console.log('After fence strip, last 3 chars:', JSON.stringify(text.substring(text.length - 3)));

      // Handle truncated response from max_tokens
      if (aiRes.stop_reason === 'max_tokens') {
        console.log('WARNING: Response truncated by max_tokens!');
        // Try to recover: extract what we can from truncated JSON
        const breedMatch = text.match(/"breed"\s*:\s*"([^"]*)"/);
        const petTypeMatch = text.match(/"pet_type"\s*:\s*"([^"]*)"/);
        const coatMatch = text.match(/"coat_analysis"\s*:\s*"([^"]*)"/);

        // Try to extract complete tiers using greedy match for each
        const basicMatch = text.match(/"basic"\s*:\s*(\{[\s\S]*?"highlight"\s*:\s*"[^"]*"\s*\})/);
        const advancedMatch = text.match(/"advanced"\s*:\s*(\{[\s\S]*?"highlight"\s*:\s*"[^"]*"\s*\})/);

        if (basicMatch && advancedMatch) {
          console.log('Truncation recovery: using basic + advanced, duplicating for signature');
          const advancedObj = JSON.parse(advancedMatch[1]);
          parsed = {
            breed: breedMatch?.[1] || '未知',
            pet_type: petTypeMatch?.[1] || '狗',
            coat_analysis: coatMatch?.[1] || '',
            tiers: {
              basic: JSON.parse(basicMatch[1]),
              advanced: advancedObj,
              signature: { ...advancedObj, label: '完美推薦', tagline: '（分析結果過長，顯示進階方案替代）' },
            },
            note: '建議諮詢專業美容師',
          };
        } else {
          throw new Error('Response truncated and unable to recover partial tiers');
        }
      } else {
        // Normal parse path
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON object found in response');

        console.log('JSON match length:', jsonMatch[0].length);
        parsed = JSON.parse(jsonMatch[0]);
        console.log('=== PARSE SUCCESS === keys:', Object.keys(parsed).join(', '));
      }
    } catch (parseErr) {
      console.log('=== PARSE ERROR ===');
      console.log('Error:', parseErr instanceof Error ? parseErr.message : String(parseErr));
      console.log('Attempted to parse:', rawText.substring(0, 300));
      console.log('Full raw text:', rawText);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'AI 回應解析失敗，請重試' }) };
    }

    // Normalize product names in tiers
    const tiers = parsed.tiers as Record<string, { steps?: Array<{ products?: string[]; product_name?: string }> }> | undefined;
    if (tiers) {
      for (const key of ['basic', 'advanced', 'signature'] as const) {
        const tier = tiers[key];
        if (!tier?.steps) continue;
        for (const step of tier.steps) {
          if (step.products) step.products = step.products.map(normalizeProduct);
          if (step.product_name) step.product_name = normalizeProduct(step.product_name);
        }
      }
    }

    // Token usage
    const usage = aiRes.usage ?? {};
    const tokensIn = usage.input_tokens ?? 0;
    const tokensOut = usage.output_tokens ?? 0;

    // Fire-and-forget analytics
    const sb = getSupa();
    if (sb) {
      sb.from('davis_analytics').insert({
        event_type: 'analyze',
        breed: (parsed.breed as string) || '',
        tokens_in: tokensIn,
        tokens_out: tokensOut,
        model: aiModel,
        ip_address: clientIp,
        user_agent: (event.headers['user-agent'] || '').slice(0, 300),
      }).then(() => {}, () => {});
    }

    // Return result wrapped in { result, tokens } to match frontend AnalyzeResponse type
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        result: {
          ...parsed,
          source: isEmbed ? (source || 'embed') : 'direct',
        },
        tokens: { input: tokensIn, output: tokensOut },
      }),
    };
  } catch (err) {
    const isTimeout = err instanceof Error && (err.message === 'TIMEOUT' || err.message.includes('ECONNRESET'));
    console.error('Analyze error:', err);
    return {
      statusCode: isTimeout ? 504 : 500,
      headers,
      body: JSON.stringify({ error: isTimeout ? '分析超時，請重試' : 'Internal server error' }),
    };
  }
};

export { handler };
