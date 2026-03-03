// netlify/functions/ai-assist.js
// 後台 AI 助手 — 透過後端轉發 Anthropic API 呼叫
const https = require("https");
const crypto = require("crypto");

function httpsPost(hostname, path, headers, bodyStr, timeoutMs = 25000) {
  return new Promise((resolve, reject) => {
    let timer;
    const opts = {
      hostname, port: 443, path, method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(bodyStr), ...headers },
    };
    const req = https.request(opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        clearTimeout(timer);
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { reject(new Error("Parse error: " + data.slice(0, 300))); }
      });
    });
    timer = setTimeout(() => { req.destroy(new Error("TIMEOUT")); }, timeoutMs);
    req.on("error", (e) => { clearTimeout(timer); reject(e); });
    req.write(bodyStr);
    req.end();
  });
}

function json(code, obj) {
  return {
    statusCode: code,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization" },
    body: JSON.stringify(obj),
  };
}

// Verify admin token (same logic as admin.js)
function verifyToken(authHeader) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  try {
    const payload = JSON.parse(Buffer.from(authHeader.slice(7), "base64").toString());
    const { username, role, exp, sig } = payload;
    const now = Math.floor(Date.now() / 1000);
    if (exp && exp < now) return null;
    const expected = crypto.createHash("sha256").update(username + ":" + role + ":" + exp + ":" + (process.env.DAVIS_TOKEN_SECRET || (process.env.TOKEN_SECRET || "davis_token_secret_change_me"))).digest("hex").slice(0, 16);
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
      "id": "配方唯一ID（如：掉毛季（犬））",
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
          "dilution": "💧 稀釋 X:1",
          "time": "⏱ 停留 X 分鐘後沖淨",
          "tip": ""
        }
      ],
      "confidence": "high/medium/low"
    }
  ],
  "summary": "本次分析摘要（說明提取到了什麼）"
}

若文字資訊不足，對應陣列給 []。只輸出 JSON，不要任何說明文字。`;

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "POST,OPTIONS" }, body: "" };
  if (event.httpMethod !== "POST") return json(405, { error: "Method Not Allowed" });

  // Auth check
  const user = verifyToken(event.headers.authorization || event.headers.Authorization || "");
  if (!user) return json(401, { error: "Unauthorized" });

  let body;
  try { body = JSON.parse(event.body); } catch { return json(400, { error: "Invalid JSON" }); }
  const { text } = body;
  if (!text || text.trim().length < 10) return json(400, { error: "文字太短" });
  if (text.length > 20000) return json(413, { error: "文字過長，請控制在 20,000 字以內" });
  if (text.length > 20000) return json(400, { error: "文字過長，請分段輸入（上限 20,000 字）" });

  // 直接用環境變數
  const apiKey = process.env.ANTHROPIC_API_KEY || "";
  if (!apiKey) return json(400, { error: "Netlify 環境變數 ANTHROPIC_API_KEY 未設定" });

  // Call Anthropic
  const reqBody = JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: "請分析以下文字並提取配方與品種資料：\n\n" + text }],
  });

  try {
    const resp = await httpsPost(
      "api.anthropic.com",
      "/v1/messages",
      { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      reqBody,
      28000
    );

    if (resp.status !== 200) {
      const msg = resp.body?.error?.message || JSON.stringify(resp.body);
      return json(resp.status, { error: "Anthropic API 錯誤：" + msg });
    }

    const raw = (resp.body.content || []).map((c) => c.text || "").join("");
    const s = raw.indexOf("{"), e = raw.lastIndexOf("}");
    if (s === -1) return json(500, { error: "AI 未回傳有效 JSON" });

    const result = JSON.parse(raw.slice(s, e + 1));
    return json(200, result);

  } catch (err) {
    return json(500, { error: err.message || "呼叫失敗" });
  }
};
