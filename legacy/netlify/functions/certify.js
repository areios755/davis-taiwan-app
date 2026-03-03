// netlify/functions/certify.js
// GET  /api/certify?id=DV-xxx        → 公開查詢認證（驗證頁用）
// POST /api/certify                  → 申請認證（公開）
// GET  /api/certify/list             → 後台列表（需 token）
// PATCH /api/certify/:id             → 後台審核（需 token）
const https = require("https");
const crypto = require("crypto");

function supaReq(method, path, body, key, url) {
  const u = new URL(url + "/rest/v1" + path);
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: u.hostname, port: 443,
      path: u.pathname + u.search, method,
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
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
    body: JSON.stringify(obj),
  };
}

function verifyToken(authHeader) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  try {
    const payload = JSON.parse(Buffer.from(authHeader.slice(7), "base64").toString());
    const { username, role, exp, sig } = payload;
    const now = Math.floor(Date.now() / 1000);
    if (exp && exp < now) return null; // expired
    const expected = crypto.createHash("sha256")
      .update(username + ":" + role + ":" + exp + ":" + (process.env.DAVIS_TOKEN_SECRET || (process.env.TOKEN_SECRET || "davis_token_secret_change_me")))
      .digest("hex").slice(0, 16);
    if (sig !== expected) return null;
    return { username, role };
  } catch { return null; }
}

function genId() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "DV-";
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return {
    statusCode: 204,
    headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS" },
    body: "",
  };

  const SUPA_URL = process.env.SUPABASE_URL;
  const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SUPA_URL || !SUPA_KEY) return json(500, { error: "Missing config" });

  const method = event.httpMethod;
  const rawPath = event.path.replace("/.netlify/functions/certify", "").replace("/api/certify", "") || "/";

  // ── 公開：查詢單筆認證 GET /api/certify?id=xxx ──
  if (method === "GET" && rawPath === "/") {
    const id = (event.queryStringParameters || {}).id;
    if (!id) return json(400, { error: "Missing id" });

    const r = await supaReq("GET",
      `/davis_certifications?id=eq.${encodeURIComponent(id)}&select=*`,
      null, SUPA_KEY, SUPA_URL);
    const row = (r.data || [])[0];
    if (!row) return json(404, { error: "查無此認證編號" });

    // 累加瀏覽數
    supaReq("PATCH",
      `/davis_certifications?id=eq.${encodeURIComponent(id)}`,
      { view_count: (row.view_count || 0) + 1 }, SUPA_KEY, SUPA_URL).catch(() => {});

    // 隱藏敏感欄位再回傳
    const { phone, note, ...pub } = row;
    return json(200, { ok: true, cert: pub });
  }

  // ── 公開：申請認證 POST /api/certify ──
  if (method === "POST" && rawPath === "/") {
    let body;
    try { body = JSON.parse(event.body); } catch { return json(400, { error: "Invalid JSON" }); }

    const { shop_name, owner_name, phone, city, address, ig_url, fb_url, line_id, note } = body;
    if (!shop_name || !owner_name) return json(400, { error: "店名和姓名必填" });
    // Input length limits to prevent spam/abuse
    if (shop_name.length > 50) return json(400, { error: "店名過長" });
    if (owner_name.length > 20) return json(400, { error: "姓名過長" });
    if (note && note.length > 500) return json(400, { error: "申請說明過長" });
    if (ig_url && ig_url.length > 200) return json(400, { error: "IG 網址過長" });
    if (fb_url && fb_url.length > 200) return json(400, { error: "FB 網址過長" });
    if (String(shop_name).length > 50) return json(400, { error: "店名過長（上限50字）" });
    if (String(owner_name).length > 20) return json(400, { error: "姓名過長（上限20字）" });
    if (note && String(note).length > 500) return json(400, { error: "說明過長（上限500字）" });

    let id, tries = 0;
    while (tries < 5) {
      id = genId();
      const check = await supaReq("GET",
        `/davis_certifications?id=eq.${id}&select=id`,
        null, SUPA_KEY, SUPA_URL);
      if (!(check.data || []).length) break;
      tries++;
    }

    const row = {
      id, shop_name, owner_name,
      phone: phone || "", city: city || "", address: address || "",
      ig_url: ig_url || "", fb_url: fb_url || "", line_id: line_id || "",
      note: note || "", status: "pending", badge_level: "certified",
      view_count: 0, created_at: new Date().toISOString(),
    };

    const r = await supaReq("POST", "/davis_certifications", row, SUPA_KEY, SUPA_URL);
    if (r.status !== 201 && r.status !== 200)
      return json(500, { error: "申請失敗，請稍後再試" });

    return json(200, { ok: true, id, message: "申請已送出，審核後會通知您" });
  }

  // ── 以下需要 admin token ──
  const user = verifyToken(event.headers.authorization || event.headers.Authorization || "");
  if (!user) return json(401, { error: "Unauthorized" });

  // ── 後台：列表 GET /api/certify/list ──
  if (method === "GET" && rawPath === "/list") {
    const isAdmin = user.role === "admin";
    const status = (event.queryStringParameters || {}).status || "";
    const filter = status ? `&status=eq.${status}` : "";
    const fields = isAdmin
      ? "*"
      : "id,shop_name,owner_name,city,ig_url,fb_url,line_id,status,badge_level,approved_at,expires_at,created_at,view_count";
    const r = await supaReq("GET",
      `/davis_certifications?select=${fields}&order=created_at.desc${filter}`,
      null, SUPA_KEY, SUPA_URL);
    return json(200, { ok: true, certs: r.data || [] });
  }

  // ── 後台：審核 PATCH /api/certify/:id — admin only ──
  if (method === "PATCH" && rawPath.length > 1) {
    if (user.role !== "admin") return json(403, { error: "僅管理員可審核認證" });
    const id = rawPath.slice(1);
    let body;
    try { body = JSON.parse(event.body); } catch { return json(400, { error: "Invalid JSON" }); }

    const allowedStatuses = ["approved", "rejected", "pending"];
    const allowedLevels = ["certified", "advanced", "master"];
    const updates = {};
    if (body.status && allowedStatuses.includes(body.status)) updates.status = body.status;
    if (body.badge_level && allowedLevels.includes(body.badge_level)) updates.badge_level = body.badge_level;
    if (body.status === "approved") {
      updates.approved_at = new Date().toISOString();
      updates.expires_at = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    }
    if (Object.keys(updates).length === 0) return json(400, { error: "無有效更新欄位" });

    const r = await supaReq("PATCH",
      `/davis_certifications?id=eq.${encodeURIComponent(id)}`,
      updates, SUPA_KEY, SUPA_URL);
    if (r.status !== 200 && r.status !== 204)
      return json(500, { error: "更新失敗" });
    return json(200, { ok: true });
  }
  return json(404, { error: "Not found" });
};
