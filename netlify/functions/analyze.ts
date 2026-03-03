import type { Handler, HandlerEvent } from '@netlify/functions';

// ============================================================
// Rate Limiting (in-memory, per-instance)
// ============================================================
const RATE_LIMIT_WINDOW = 60_000;    // 1 minute
const RATE_LIMIT_MAX = 10;           // Max requests per IP per window
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

// ============================================================
// Product Name Normalization
// ============================================================
const PRODUCT_NORMALIZE_MAP: Record<string, string> = {
  // 🔴 MIGRATION: Copy from original analyze.js product mapping
  '奢華洗劑': '奢華洗劑',
  'Luxury Shampoo': '奢華洗劑',
  // Add all variants...
};

function normalizeProductName(name: string): string {
  return PRODUCT_NORMALIZE_MAP[name.trim()] ?? name.trim();
}

// ============================================================
// Season Detection
// ============================================================
function getCurrentSeason(): { name: string; hint: string } {
  const month = new Date().getMonth() + 1;
  if ([3, 4, 5].includes(month)) return {
    name: '春季',
    hint: '現在是春季換毛期，許多犬貓正在大量換毛。建議加強底層護理、除廢毛產品。Signature 等級可考慮使用「護毛精華」強化毛囊。',
  };
  if ([6, 7, 8].includes(month)) return {
    name: '夏季',
    hint: '現在是夏季高溫潮濕。建議加強清潔力、除臭產品。Signature 等級可考慮使用「薄荷尤加利洗劑」清涼舒緩。',
  };
  if ([9, 10, 11].includes(month)) return {
    name: '秋季',
    hint: '現在是秋季，氣候轉乾。建議加強保濕與滋潤。Signature 等級可考慮使用「滋潤護毛素」雙層護理。',
  };
  return {
    name: '冬季',
    hint: '現在是冬季，乾冷容易產生靜電與乾癢。建議加強深層滋養。Signature 等級可考慮使用「絲蛋白護毛素」修護毛鱗片。',
  };
}

// ============================================================
// Main Handler
// ============================================================
const handler: Handler = async (event: HandlerEvent) => {
  // CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',  // 🔴 TODO: Replace with whitelist
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // Rate limit
  const clientIp = event.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? 'unknown';
  if (!checkRateLimit(clientIp)) {
    return { statusCode: 429, headers, body: JSON.stringify({ error: 'Too many requests' }) };
  }

  try {
    const body = JSON.parse(event.body ?? '{}');
    const { image, breed, color, weight, lang = 'zh-TW', hotel, season: _season } = body;

    if (!image && !breed) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'image or breed required' }) };
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'API key not configured' }) };
    }

    const seasonInfo = getCurrentSeason();

    // Language instruction
    const langMap: Record<string, string> = {
      'zh-TW': '請用繁體中文回覆',
      'zh-CN': '请用简体中文回复',
      en: 'Please respond in English',
      ja: '日本語で回答してください',
    };

    // 🔴 MIGRATION: Copy full BASE_PROMPT from original analyze.js
    // This is the core AI prompt that structures the three-tier recommendation
    const systemPrompt = `你是 Davis 寵物洗護 AI 顧問。根據寵物照片或品種資訊，推薦三個等級的洗護方案。

【產品資料庫】
（🔴 MIGRATION: 從原始 analyze.js 搬入完整產品資料庫 prompt）

【三等級結構】
Basic（基礎洗）: 1洗1護
Advanced（進階洗）: 2洗1護
Signature（完美SPA）: 3洗2護

【當季建議】
${seasonInfo.hint}

【輸出格式】
請以 JSON 格式回覆，結構如下：
{
  "breed": "品種名",
  "pet_type": "狗" or "貓",
  "coat_analysis": "毛質分析描述",
  "tiers": {
    "basic": { "label": "基礎洗", "description": "...", "steps": [...] },
    "advanced": { "label": "進階洗", "description": "...", "steps": [...] },
    "signature": { "label": "完美SPA", "description": "...", "steps": [...] }
  }
}

每個 step 結構：
{ "phase": "第一洗", "product_name": "產品名", "dilution": "12:1", "dwell_time": "5-8min", "tip": "使用建議" }

${langMap[lang] ?? langMap['zh-TW']}
只回覆 JSON，不要加 markdown 格式或其他文字。`;

    // Build messages
    const userContent: Array<Record<string, unknown>> = [];

    if (image) {
      userContent.push({
        type: 'image',
        source: { type: 'base64', media_type: 'image/jpeg', data: image },
      });
    }

    let textPrompt = '請分析這隻寵物並推薦洗護方案。';
    if (breed) textPrompt += `\n品種：${breed}`;
    if (color) textPrompt += `\n毛色：${color}（請考慮毛色因素選擇適合的增色產品）`;
    if (weight) textPrompt += `\n體重：${weight}kg`;

    userContent.push({ type: 'text', text: textPrompt });

    // Call Claude API — using Sonnet (cost-effective, vision-capable)
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',  // ✅ Sonnet, not Opus
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('Claude API error:', response.status, errBody);
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'AI analysis failed' }) };
    }

    const aiResponse = await response.json();
    const textContent = aiResponse.content?.find((c: { type: string }) => c.type === 'text')?.text ?? '';

    // Parse JSON from response
    let parsed;
    try {
      // Strip markdown code fences if present
      const cleaned = textContent.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error('Failed to parse AI response:', textContent.substring(0, 200));
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to parse AI response' }) };
    }

    // Normalize product names in the result
    for (const tierKey of ['basic', 'advanced', 'signature']) {
      const tier = parsed.tiers?.[tierKey];
      if (tier?.steps) {
        for (const step of tier.steps) {
          step.product_name = normalizeProductName(step.product_name);
        }
      }
    }

    // Token usage
    const tokens = {
      input: aiResponse.usage?.input_tokens ?? 0,
      output: aiResponse.usage?.output_tokens ?? 0,
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          result: { ...parsed, source: 'ai' },
          tokens,
        },
      }),
    };
  } catch (err) {
    console.error('Analyze error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

export { handler };
