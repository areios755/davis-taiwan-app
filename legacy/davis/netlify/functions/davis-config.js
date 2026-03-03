const https = require("https");

function supaGet(path, serviceKey, supaUrl) {
  const url = new URL(supaUrl + "/rest/v1" + path);
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: url.hostname, port: 443, path: url.pathname + url.search, method: "GET",
      headers: { "Content-Type": "application/json", apikey: serviceKey, Authorization: "Bearer " + serviceKey },
    }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => { try { resolve(JSON.parse(data)); } catch { resolve([]); } });
    });
    req.on("error", () => resolve([]));
    req.end();
  });
}

exports.handler = async (event) => {
  const h = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=60" };
  const SUPA_URL = process.env.SUPABASE_URL;
  const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY;
  const apiKey = process.env.ANTHROPIC_API_KEY || "";

  // If no Supabase, return minimal config (API key only, like before)
  if (!SUPA_URL || !SUPA_KEY) {
    return { statusCode: 200, headers: h, body: JSON.stringify({ k: apiKey, dynamic: false }) };
  }

  try {
    const [settingsRows, products, breeds] = await Promise.all([
      supaGet("/davis_settings?select=*", SUPA_KEY, SUPA_URL),
      supaGet("/davis_products?select=*&active=eq.true&order=sort_order,id", SUPA_KEY, SUPA_URL),
      supaGet("/davis_breeds?select=*&active=eq.true&order=sort_order,name_zh", SUPA_KEY, SUPA_URL),
    ]);

    const settings = {};
    (settingsRows || []).forEach((s) => {
      try { settings[s.key] = typeof s.value === "string" ? JSON.parse(s.value) : s.value; } catch { settings[s.key] = s.value; }
    });

    return {
      statusCode: 200, headers: h,
      body: JSON.stringify({
        k: apiKey,
        dynamic: true,
        settings,
        products: products || [],
        breeds: breeds || [],
      }),
    };
  } catch (err) {
    return { statusCode: 200, headers: h, body: JSON.stringify({ k: apiKey, dynamic: false, error: err.message }) };
  }
};
