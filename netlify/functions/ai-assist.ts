import type { Handler } from '@netlify/functions';
import crypto from 'crypto';
import { corsHeaders } from './lib/cors';

function verifyToken(authHeader: string): { username: string; role: string } | null {
  if (!authHeader.startsWith('Bearer ')) return null;
  try {
    const payload = JSON.parse(Buffer.from(authHeader.slice(7), 'base64').toString());
    const { username, role, exp, sig } = payload;
    if (exp && exp < Math.floor(Date.now() / 1000)) return null;
    const secret = process.env.DAVIS_TOKEN_SECRET;
    if (!secret) return null;
    const expected = crypto.createHash('sha256')
      .update(`${username}:${role}:${exp}:${secret}`)
      .digest('hex').slice(0, 16);
    if (sig !== expected) return null;
    return { username, role };
  } catch { return null; }
}

const SYSTEM_PROMPT = `你是 Davis Taiwan 寵物洗護顧問系統的 AI 後台編輯器。

任務：分析用戶貼入的文字（對話紀錄、文章、培訓資料等），提取：
1. 新的品種洗護資訊（含多語言）
2. 新的洗護配方組合

現有 Davis 產品名稱（請用這些名稱）：
清潔類：去油膏前置處理、強效清潔洗劑、泡沫柑橘洗劑、蘇打燕麥洗劑
毛質類：蓬鬆硬毛造型、柔順解結、掉毛季（犬）、掉毛季（貓）、扁臉眼周清潔
色澤類：淺色白毛亮澤、黑色深色護色、紅棕色暖色提亮
SPA類：Signature SPA（焦慮型）、水療甜瓜洗劑
護毛：純粹全效護毛素、滋潤護毛素、輕盈乳液、燕麥免沖護毛素

請輸出嚴格 JSON 格式：
{
  "breeds": [
    {
      "name_zh": "品種繁中名稱",
      "name_en": "English name",
      "name_ja": "日本語名",
      "emoji": "🐾",
      "coat_type": "double/single/wire/curly/long/short/flat_face/shedding",
      "product_keys": ["配方ID1","配方ID2"],
      "reason": "為何推薦這些配方（15-25字）",
      "confidence": "high/medium/low"
    }
  ],
  "products": [
    {
      "id": "配方唯一ID",
      "category": "cleaning/coat_type/coat_color/sensitive/spa/cat",
      "icon": "✨",
      "tag_zh": "適用標籤（繁中）",
      "tag_en": "Tag in English",
      "tag_ja": "タグ（日本語）",
      "reason_zh": "推薦理由（繁中，20-40字）",
      "reason_en": "Reason in English",
      "reason_ja": "理由（日本語）",
      "note_zh": "注意事項（選填）",
      "steps": [
        {
          "role": "Step 1 · 主洗",
          "name": "產品繁中名稱",
          "name_en": "Product name EN",
          "name_ja": "製品名 JA",
          "dilution": "稀釋 X:1",
          "time": "停留 X 分鐘後沖淨",
          "tip": ""
        }
      ],
      "confidence": "high/medium/low"
    }
  ],
  "summary": "本次分析摘要（說明提取到了什麼）"
}

若文字資訊不足，對應陣列給 []。只輸出 JSON，不要任何說明文字。`;

const handler: Handler = async (event) => {
  const origin = event.headers['origin'] || event.headers['Origin'];
  const headers = corsHeaders(origin);

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  const user = verifyToken(event.headers['authorization'] || event.headers['Authorization'] || '');
  if (!user) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };

  let body: Record<string, unknown>;
  try { body = JSON.parse(event.body ?? '{}'); } catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const text = String(body.text || '');
  if (text.trim().length < 10) return { statusCode: 400, headers, body: JSON.stringify({ error: '文字太短' }) };
  if (text.length > 20_000) return { statusCode: 413, headers, body: JSON.stringify({ error: '文字過長，請控制在 20,000 字以內' }) };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'ANTHROPIC_API_KEY 未設定' }) };

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: '請分析以下文字並提取配方與品種資料：\n\n' + text }],
      }),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({})) as Record<string, unknown>;
      const msg = (errBody.error as Record<string, unknown>)?.message || JSON.stringify(errBody);
      return { statusCode: response.status, headers, body: JSON.stringify({ error: 'Anthropic API 錯誤：' + msg }) };
    }

    const aiRes = await response.json() as {
      content: Array<{ type: string; text?: string }>;
    };
    const raw = aiRes.content?.map(c => c.text || '').join('') || '';
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end === -1) return { statusCode: 500, headers, body: JSON.stringify({ error: 'AI 未回傳有效 JSON' }) };

    const result = JSON.parse(raw.slice(start, end + 1));
    return { statusCode: 200, headers, body: JSON.stringify(result) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err instanceof Error ? err.message : '呼叫失敗' }) };
  }
};

export { handler };
