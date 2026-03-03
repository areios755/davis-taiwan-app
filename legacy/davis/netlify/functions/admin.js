const https = require("https");
const crypto = require("crypto");

function hashPw(pw) { return crypto.createHash("sha256").update("davis_salt_" + pw).digest("hex"); }

function supaReq(method, path, body, serviceKey, supaUrl) {
  const url = new URL(supaUrl + "/rest/v1" + path);
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: url.hostname, port: 443, path: url.pathname + url.search, method,
      headers: {
        "Content-Type": "application/json", apikey: serviceKey, Authorization: "Bearer " + serviceKey,
        Prefer: method === "POST" ? "return=representation,resolution=merge-duplicates" : method === "PATCH" ? "return=representation" : "return=representation",
      },
    };
    const req = https.request(opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => { try { resolve({ status: res.statusCode, data: data ? JSON.parse(data) : null }); } catch { resolve({ status: res.statusCode, data }); } });
    });
    req.on("error", reject);
    if (body) req.write(typeof body === "string" ? body : JSON.stringify(body));
    req.end();
  });
}

function json(code, obj) {
  return { statusCode: code, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization" }, body: JSON.stringify(obj) };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS" }, body: "" };

  const SUPA_URL = process.env.SUPABASE_URL;
  const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY;
  const ADMIN_USER = process.env.DAVIS_ADMIN_USERNAME || "";
  const ADMIN_PW = process.env.DAVIS_ADMIN_PASSWORD || "";

  if (!SUPA_URL || !SUPA_KEY) return json(500, { error: "Missing Supabase config" });

  const method = event.httpMethod;
  const path = event.path.replace("/.netlify/functions/admin", "").replace("/api/admin", "") || "/";
  let body;
  try { body = event.body ? JSON.parse(event.body) : {}; } catch { body = {}; }

  // ── Token helper ──
  function makeToken(username, role) {
    const sig = crypto.createHash("sha256").update(username + ":" + role + ":davis_token_secret").digest("hex").slice(0, 16);
    return Buffer.from(JSON.stringify({ username, role, sig })).toString("base64");
  }

  // ── Auth ──
  const authHeader = event.headers.authorization || "";
  const rawToken = authHeader.replace("Bearer ", "");
  let currentUser = null;
  if (rawToken) {
    try {
      const decoded = JSON.parse(Buffer.from(rawToken, "base64").toString());
      const expectedSig = crypto.createHash("sha256").update(decoded.username + ":" + decoded.role + ":davis_token_secret").digest("hex").slice(0, 16);
      if (decoded.sig === expectedSig) currentUser = { username: decoded.username, role: decoded.role };
    } catch {}
  }

  // ── Login ──
  if (path === "/login" && method === "POST") {
    const { username, password } = body;
    if (!username || !password) return json(400, { error: "缺少帳號或密碼" });
    if (ADMIN_USER && username === ADMIN_USER && password === ADMIN_PW) {
      return json(200, { ok: true, token: makeToken(username, "admin"), role: "admin", displayName: "管理員" });
    }
    const r = await supaReq("GET", `/davis_users?username=eq.${encodeURIComponent(username)}&select=*`, null, SUPA_KEY, SUPA_URL);
    const user = (r.data || [])[0];
    if (user && user.password_hash === hashPw(password)) {
      return json(200, { ok: true, token: makeToken(username, user.role), role: user.role, displayName: user.display_name || username });
    }
    return json(401, { error: "帳號或密碼錯誤" });
  }

  if (!currentUser) return json(401, { error: "未授權" });
  const isAdmin = currentUser.role === "admin";

  // ── Change own password ──
  if (path === "/change-password" && method === "POST") {
    const { old_password, new_password } = body;
    if (!new_password || new_password.length < 4) return json(400, { error: "新密碼至少 4 字元" });
    if (currentUser.username === ADMIN_USER) return json(400, { error: "主管理員密碼請在 Netlify 環境變數中修改" });
    const r = await supaReq("GET", `/davis_users?username=eq.${encodeURIComponent(currentUser.username)}&select=*`, null, SUPA_KEY, SUPA_URL);
    const user = (r.data || [])[0];
    if (!user || user.password_hash !== hashPw(old_password)) return json(401, { error: "舊密碼錯誤" });
    await supaReq("PATCH", `/davis_users?username=eq.${encodeURIComponent(currentUser.username)}`, { password_hash: hashPw(new_password), updated_at: new Date().toISOString() }, SUPA_KEY, SUPA_URL);
    return json(200, { ok: true });
  }

  // ── Me ──
  if (path === "/me" && method === "GET") return json(200, { username: currentUser.username, role: currentUser.role });

  // ══ Read-only (admin + viewer) ══
  if (path === "/settings" && method === "GET") {
    const r = await supaReq("GET", "/davis_settings?select=*", null, SUPA_KEY, SUPA_URL);
    const settings = {}; (r.data || []).forEach((s) => (settings[s.key] = s.value));
    return json(200, { settings });
  }
  if (path === "/products" && method === "GET") {
    const r = await supaReq("GET", "/davis_products?select=*&order=sort_order,id", null, SUPA_KEY, SUPA_URL);
    return json(200, { products: r.data || [] });
  }
  if (path === "/breeds" && method === "GET") {
    const r = await supaReq("GET", "/davis_breeds?select=*&order=sort_order,name_zh", null, SUPA_KEY, SUPA_URL);
    return json(200, { breeds: r.data || [] });
  }

  // ── Analytics summary ──
  if (path === "/analytics/summary" && method === "GET") {
    const qs = event.queryStringParameters || {};
    const days = parseInt(qs.days) || 30;
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();

    const [dailyR, breedR, sourceR, totalR, monthR, yearR] = await Promise.all([
      supaReq("GET", `/davis_analytics?select=created_at&created_at=gte.${since}&order=created_at.asc`, null, SUPA_KEY, SUPA_URL),
      supaReq("GET", `/davis_analytics?select=breed&created_at=gte.${since}`, null, SUPA_KEY, SUPA_URL),
      supaReq("GET", `/davis_analytics?select=source,is_embed,is_real_ai&created_at=gte.${since}`, null, SUPA_KEY, SUPA_URL),
      supaReq("GET", `/davis_analytics?select=id&order=id.desc&limit=1`, null, SUPA_KEY, SUPA_URL),
      supaReq("GET", `/davis_analytics?select=input_tokens,output_tokens&created_at=gte.${monthStart}&is_real_ai=eq.true`, null, SUPA_KEY, SUPA_URL),
      supaReq("GET", `/davis_analytics?select=input_tokens,output_tokens&created_at=gte.${yearStart}&is_real_ai=eq.true`, null, SUPA_KEY, SUPA_URL),
    ]);

    const dailyMap = {};
    (dailyR.data || []).forEach(r => { const d = r.created_at.slice(0, 10); dailyMap[d] = (dailyMap[d] || 0) + 1; });
    const daily = Object.entries(dailyMap).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));

    const breedMap = {};
    (breedR.data || []).forEach(r => { const b = r.breed || '未知'; breedMap[b] = (breedMap[b] || 0) + 1; });
    const topBreeds = Object.entries(breedMap).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([breed, count]) => ({ breed, count }));

    const sourceMap = {};
    let embedCount = 0, directCount = 0, realAiCount = 0, fakeAiCount = 0;
    (sourceR.data || []).forEach(r => {
      const s = r.source || 'direct'; sourceMap[s] = (sourceMap[s] || 0) + 1;
      if (r.is_embed) embedCount++; else directCount++;
      if (r.is_real_ai) realAiCount++; else fakeAiCount++;
    });
    const sources = Object.entries(sourceMap).map(([source, count]) => ({ source, count })).sort((a, b) => b[1] - a[1]);

    function sumTokens(rows) {
      let inp = 0, outp = 0, calls = 0;
      (rows || []).forEach(r => { inp += (r.input_tokens || 0); outp += (r.output_tokens || 0); if (r.input_tokens > 0) calls++; });
      return { input_tokens: inp, output_tokens: outp, ai_calls: calls };
    }

    return json(200, {
      days, periodTotal: (dailyR.data || []).length,
      allTimeTotal: totalR.data && totalR.data[0] ? totalR.data[0].id : 0,
      daily, topBreeds, sources,
      embedVsDirect: { embed: embedCount, direct: directCount },
      realVsFake: { real: realAiCount, fake: fakeAiCount },
      monthTokens: sumTokens(monthR.data), yearTokens: sumTokens(yearR.data),
      currentMonth: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`,
      currentYear: `${now.getFullYear()}`,
    });
  }

  // ── Users list ──
  if (path === "/users" && method === "GET") {
    if (!isAdmin) return json(403, { error: "權限不足" });
    const r = await supaReq("GET", "/davis_users?select=username,role,display_name,created_at,updated_at&order=created_at", null, SUPA_KEY, SUPA_URL);
    return json(200, { users: r.data || [] });
  }

  // ══ Write endpoints (admin only) ══
  if (!isAdmin) return json(403, { error: "僅管理員可執行此操作" });

  if (path === "/settings" && method === "PUT") {
    for (const [key, value] of Object.entries(body)) {
      await supaReq("POST", "/davis_settings", { key, value: JSON.stringify(value), updated_at: new Date().toISOString() }, SUPA_KEY, SUPA_URL);
    }
    return json(200, { ok: true });
  }

  if (path === "/products" && method === "POST") { if (!body.id) return json(400, { error: "缺少 id" }); body.updated_at = new Date().toISOString(); const r = await supaReq("POST", "/davis_products", body, SUPA_KEY, SUPA_URL); return json(r.status < 300 ? 200 : 500, r.data); }
  if (path.startsWith("/products/") && method === "DELETE") { const id = decodeURIComponent(path.split("/products/")[1]); await supaReq("DELETE", `/davis_products?id=eq.${encodeURIComponent(id)}`, null, SUPA_KEY, SUPA_URL); return json(200, { ok: true }); }
  if (path === "/products/import" && method === "POST") { const rows = body.rows || []; let ok = 0, fail = 0; for (const row of rows) { if (!row.id) { fail++; continue; } row.updated_at = new Date().toISOString(); const r = await supaReq("POST", "/davis_products", row, SUPA_KEY, SUPA_URL); if (r.status < 300) ok++; else fail++; } return json(200, { ok, fail, total: rows.length }); }

  if (path === "/breeds" && method === "POST") { if (!body.name_zh) return json(400, { error: "缺少 name_zh" }); body.updated_at = new Date().toISOString(); const r = await supaReq("POST", "/davis_breeds", body, SUPA_KEY, SUPA_URL); return json(r.status < 300 ? 200 : 500, r.data); }
  if (path.startsWith("/breeds/") && method === "DELETE") { const name = decodeURIComponent(path.split("/breeds/")[1]); await supaReq("DELETE", `/davis_breeds?name_zh=eq.${encodeURIComponent(name)}`, null, SUPA_KEY, SUPA_URL); return json(200, { ok: true }); }
  if (path === "/breeds/import" && method === "POST") { const rows = body.rows || []; let ok = 0, fail = 0; for (const row of rows) { if (!row.name_zh) { fail++; continue; } row.updated_at = new Date().toISOString(); const r = await supaReq("POST", "/davis_breeds", row, SUPA_KEY, SUPA_URL); if (r.status < 300) ok++; else fail++; } return json(200, { ok, fail, total: rows.length }); }

  // User CRUD
  if (path === "/users" && method === "POST") {
    const { username, password, role, display_name } = body;
    if (!username || !password) return json(400, { error: "缺少帳號或密碼" });
    if (username === ADMIN_USER) return json(400, { error: "不可建立與主管理員相同的帳號" });
    const r = await supaReq("POST", "/davis_users", { username, password_hash: hashPw(password), role: role || "viewer", display_name: display_name || username, updated_at: new Date().toISOString() }, SUPA_KEY, SUPA_URL);
    return json(r.status < 300 ? 200 : 500, { ok: r.status < 300 });
  }
  if (path.startsWith("/users/") && method === "DELETE") {
    const username = decodeURIComponent(path.split("/users/")[1]);
    if (username === ADMIN_USER) return json(400, { error: "不可刪除主管理員" });
    await supaReq("DELETE", `/davis_users?username=eq.${encodeURIComponent(username)}`, null, SUPA_KEY, SUPA_URL);
    return json(200, { ok: true });
  }
  if (path === "/users/reset-password" && method === "POST") {
    const { username, new_password } = body;
    if (!username || !new_password) return json(400, { error: "缺少資料" });
    if (username === ADMIN_USER) return json(400, { error: "主管理員密碼請在環境變數修改" });
    await supaReq("PATCH", `/davis_users?username=eq.${encodeURIComponent(username)}`, { password_hash: hashPw(new_password), updated_at: new Date().toISOString() }, SUPA_KEY, SUPA_URL);
    return json(200, { ok: true });
  }

  if (path === "/seed" && method === "POST") {
    const { products, breeds } = body;
    let pOk = 0, bOk = 0;
    if (products) { for (const p of products) { p.updated_at = new Date().toISOString(); const r = await supaReq("POST", "/davis_products", p, SUPA_KEY, SUPA_URL); if (r.status < 300) pOk++; } }
    if (breeds) { for (const b of breeds) { b.updated_at = new Date().toISOString(); const r = await supaReq("POST", "/davis_breeds", b, SUPA_KEY, SUPA_URL); if (r.status < 300) bOk++; } }
    return json(200, { products_seeded: pOk, breeds_seeded: bOk });
  }

  return json(404, { error: "Not found: " + path });
};
