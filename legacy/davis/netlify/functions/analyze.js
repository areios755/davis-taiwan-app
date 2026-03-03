const https = require("https");

function httpsPost(options, body, timeoutMs = 9000) {
  return new Promise((resolve, reject) => {
    let timer;
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        clearTimeout(timer);
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { reject(new Error("Parse error: " + data.slice(0, 200))); }
      });
    });
    timer = setTimeout(() => { req.destroy(new Error("TIMEOUT")); }, timeoutMs);
    req.on("error", (err) => { clearTimeout(timer); reject(err); });
    req.write(body);
    req.end();
  });
}

// Fire-and-forget analytics log
function logAnalytics(row) {
  const SUPA_URL = process.env.SUPABASE_URL;
  const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SUPA_URL || !SUPA_KEY) return;
  const url = new URL(SUPA_URL + "/rest/v1/davis_analytics");
  const body = JSON.stringify(row);
  try {
    const req = https.request({
      hostname: url.hostname, port: 443, path: url.pathname, method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body), apikey: SUPA_KEY, Authorization: "Bearer " + SUPA_KEY, Prefer: "return=minimal" },
    });
    req.on("error", () => {});
    req.write(body);
    req.end();
  } catch {}
}

const LANG_RULES = {
  "zh-TW": "所有文字欄位（coat_analysis/personality_note/note/tagline/highlight/tip/mix_note）輸出繁體中文。",
  "zh-CN": "所有文字欄位（coat_analysis/personality_note/note/tagline/highlight/tip/mix_note）輸出簡體中文。",
  "en": "Output all text fields (coat_analysis/personality_note/note/tagline/highlight/tip/mix_note) in concise professional English suitable for groomers. Keep breed/pet_type in Chinese.",
};

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { statusCode: 500, body: JSON.stringify({ error: "API key not configured." }) };

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) }; }

  const { imageBase64, mediaType, lang, source, is_embed } = body;
  if (!imageBase64) return { statusCode: 400, body: JSON.stringify({ error: "缺少圖片" }) };
  if (imageBase64.length > 750000) return { statusCode: 413, body: JSON.stringify({ error: "圖片太大" }) };

  const langRule = LANG_RULES[lang] || LANG_RULES["zh-TW"];

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

【輸出語言】
${langRule}

只輸出JSON，格式：
{"breed":"品種","pet_type":"狗或貓","coat_analysis":"毛質(20字)","personality_note":"個性(20字)","tiers":{"basic":{"label":"基礎推薦","tagline":"核心價值(15字)","steps":[{"phase":"第一洗・深層清潔","products":["產品名"],"mix_note":"","dilution":"稀釋X:1","dwell_time":"停留X分鐘","tip":"要點(10字)"}],"highlight":"亮點(15字)"},"advanced":{"label":"進階推薦","tagline":"","steps":[],"highlight":""},"signature":{"label":"完美推薦","tagline":"","steps":[],"highlight":""}},"note":"叮嚀(25字)"}`;

  const requestBody = JSON.stringify({
    model: "claude-opus-4-6",
    max_tokens: 1500,
    system: systemPrompt,
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: mediaType || "image/jpeg", data: imageBase64 } },
        { type: "text", text: "分析這隻毛孩，只輸出JSON。" }
      ]
    }]
  });

  try {
    const result = await httpsPost({
      hostname: "api.anthropic.com",
      path: "/v1/messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(requestBody),
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
    }, requestBody);

    if (result.status !== 200) {
      const apiErr = result.body?.error?.message || JSON.stringify(result.body).slice(0, 300);
      return { statusCode: 502, body: JSON.stringify({ error: `API錯誤(${result.status}): ${apiErr}` }) };
    }

    const text = result.body.content.map(c => c.text || "").join("");
    let parsed;
    try {
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      parsed = JSON.parse(text.slice(start, end + 1));
    } catch(e) {
      return { statusCode: 500, body: JSON.stringify({ error: "JSON解析失敗: " + text.slice(0, 200) }) };
    }
    // Fire-and-forget analytics with token usage
    const usage = result.body.usage || {};
    logAnalytics({
      breed: parsed.breed || "",
      pet_type: parsed.pet_type || "",
      source: source || "direct",
      lang: lang || "zh-TW",
      is_embed: !!is_embed,
      is_real_ai: true,
      model: "claude-opus-4-6",
      input_tokens: usage.input_tokens || 0,
      output_tokens: usage.output_tokens || 0,
      user_agent: (event.headers["user-agent"] || "").slice(0, 300),
    });
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed) };

  } catch (err) {
    const isTimeout = err.message === "TIMEOUT" || err.code === "ECONNRESET";
    return { statusCode: isTimeout ? 504 : 500, body: JSON.stringify({ error: err.message, timeout: isTimeout }) };
  }
};
