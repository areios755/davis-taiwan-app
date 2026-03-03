const https = require("https");

function supaInsert(table, row, serviceKey, supaUrl) {
  const url = new URL(supaUrl + "/rest/v1/" + table);
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(row);
    const req = https.request({
      hostname: url.hostname, port: 443, path: url.pathname, method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        apikey: serviceKey,
        Authorization: "Bearer " + serviceKey,
        Prefer: "return=minimal",
      },
    }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve({ status: res.statusCode }));
    });
    req.on("error", (err) => resolve({ status: 500, error: err.message }));
    req.write(body);
    req.end();
  });
}

exports.handler = async (event) => {
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" };
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: cors, body: "Method Not Allowed" };

  const SUPA_URL = process.env.SUPABASE_URL;
  const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SUPA_URL || !SUPA_KEY) return { statusCode: 200, headers: cors, body: '{"ok":true,"logged":false}' };

  let body;
  try { body = JSON.parse(event.body); } catch { return { statusCode: 400, headers: cors, body: '{"error":"Invalid JSON"}' }; }

  const row = {
    breed: (body.breed || "").slice(0, 100),
    pet_type: (body.pet_type || "").slice(0, 20),
    source: (body.source || "direct").slice(0, 100),
    lang: (body.lang || "zh-TW").slice(0, 10),
    is_embed: !!body.is_embed,
    is_real_ai: body.is_real_ai !== false,
    tier_selected: (body.tier_selected || "").slice(0, 30),
    model: (body.model || "").slice(0, 50),
    input_tokens: parseInt(body.input_tokens) || 0,
    output_tokens: parseInt(body.output_tokens) || 0,
    user_agent: (event.headers["user-agent"] || "").slice(0, 300),
  };

  await supaInsert("davis_analytics", row, SUPA_KEY, SUPA_URL);
  return { statusCode: 200, headers: { ...cors, "Content-Type": "application/json" }, body: '{"ok":true}' };
};
