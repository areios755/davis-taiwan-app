// netlify/functions/share.js
// POST /api/share        → 儲存分析結果，回傳短ID
// GET  /api/share?id=xxx → 讀取分析結果
const https = require("https");

function supaReq(method, path, body, key, url) {
  const u = new URL(url + "/rest/v1" + path);
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: u.hostname, port: 443, path: u.pathname + u.search, method,
      headers: {
        "Content-Type": "application/json",
        apikey: key, Authorization: "Bearer " + key,
        Prefer: "return=representation",
        ...(bodyStr ? { "Content-Length": Buffer.byteLength(bodyStr) } : {}),
      },
    };
    const req = https.request(opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, data: data ? JSON.parse(data) : null }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on("error", reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function json(code, obj) {
  return {
    statusCode: code,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" },
    body: JSON.stringify(obj),
  };
}

function randomId(len = 6) {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789"; // 易讀字符，去掉容易混淆的
  let id = "";
  for (let i = 0; i < len; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "GET,POST,OPTIONS" }, body: "" };

  const SUPA_URL = process.env.SUPABASE_URL;
  const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SUPA_URL || !SUPA_KEY) return json(500, { error: "Missing config" });

  // ── GET: 讀取分享結果 ──
  if (event.httpMethod === "GET") {
    const id = (event.queryStringParameters || {}).id;
    if (!id) return json(400, { error: "Missing id" });

    const r = await supaReq("GET", `/davis_shares?id=eq.${encodeURIComponent(id)}&select=*`, null, SUPA_KEY, SUPA_URL);
    const row = (r.data || [])[0];
    if (!row) return json(404, { error: "找不到此分享結果，可能已過期" });

    // 累加瀏覽次數（fire-and-forget）
    supaReq("PATCH", `/davis_shares?id=eq.${encodeURIComponent(id)}`,
      { view_count: (row.view_count || 0) + 1 }, SUPA_KEY, SUPA_URL).catch(() => {});

    return json(200, { ok: true, share: row });
  }

  // ── POST: 儲存分析結果 ──
  if (event.httpMethod === "POST") {
    let body;
    try { body = JSON.parse(event.body); } catch { return json(400, { error: "Invalid JSON" }); }

    const { result, breed, tier, source, hotel } = body;
    if (!result) return json(400, { error: "Missing result" });
    // Size limit: prevent oversized payloads from bloating DB
    const payloadSize = JSON.stringify(result).length;
    if (payloadSize > 50000) return json(413, { error: "結果資料過大" });
    const resultStr = JSON.stringify(result);
    if (resultStr.length > 50000) return json(413, { error: "分析結果資料過大" });

    // 產生唯一 ID（retry 最多 3 次避免碰撞）
    let id, tries = 0;
    while (tries < 3) {
      id = randomId(6);
      const check = await supaReq("GET", `/davis_shares?id=eq.${id}&select=id`, null, SUPA_KEY, SUPA_URL);
      if (!(check.data || []).length) break;
      tries++;
    }

    const row = {
      id,
      result_json: result,
      breed: breed || result.breed || "",
      tier: tier || "",
      source: source || "direct",
      hotel: hotel || "",
      view_count: 0,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const r = await supaReq("POST", "/davis_shares", row, SUPA_KEY, SUPA_URL);
    if (r.status !== 201 && r.status !== 200) {
      return json(500, { error: "儲存失敗", detail: r.data });
    }

    return json(200, { ok: true, id, url: `/r/${id}` });
  }

  return json(405, { error: "Method Not Allowed" });
};
