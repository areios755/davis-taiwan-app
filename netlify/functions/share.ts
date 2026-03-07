import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const ALLOWED_ORIGINS = [
  'https://davis-taiwan.netlify.app',
  'https://davis-taiwan.com',
  'http://localhost:5173',
  'http://localhost:8888',
];

function corsHeaders(origin?: string) {
  const allowed = origin && ALLOWED_ORIGINS.some(o => origin.startsWith(o)) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };
}

const RATE_WINDOW = 60_000;
const RATE_MAX = 20;
const rateMap = new Map<string, { count: number; resetAt: number }>();

function checkRate(ip: string): boolean {
  const now = Date.now();
  const e = rateMap.get(ip);
  if (!e || now > e.resetAt) { rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW }); return true; }
  if (e.count >= RATE_MAX) return false;
  e.count++;
  return true;
}

function randomId(len = 6): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let id = '';
  for (let i = 0; i < len; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

function getSupa() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const handler: Handler = async (event) => {
  const origin = event.headers['origin'] || event.headers['Origin'];
  const headers = corsHeaders(origin);

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  const sb = getSupa();
  if (!sb) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Missing config' }) };

  const clientIp = event.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? 'unknown';
  if (!checkRate(clientIp)) return { statusCode: 429, headers, body: JSON.stringify({ error: 'Too many requests' }) };

  // GET: read shared result
  if (event.httpMethod === 'GET') {
    const id = event.queryStringParameters?.id;
    if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing id' }) };

    const { data, error } = await sb.from('davis_shares').select('*').eq('id', id).single();
    if (error || !data) return { statusCode: 404, headers, body: JSON.stringify({ error: '找不到此分享結果，可能已過期' }) };

    // Increment view count (fire-and-forget)
    sb.from('davis_shares').update({ view_count: ((data.view_count as number) || 0) + 1 }).eq('id', id).then(() => {}, () => {});

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, share: data }) };
  }

  // POST: save shared result
  if (event.httpMethod === 'POST') {
    let body: Record<string, unknown>;
    try { body = JSON.parse(event.body ?? '{}'); } catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

    const { result, breed, tier } = body;
    if (!result) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing result' }) };

    const payloadSize = JSON.stringify(result).length;
    if (payloadSize > 50_000) return { statusCode: 413, headers, body: JSON.stringify({ error: '結果資料過大' }) };

    // Generate unique ID (retry up to 3x)
    let id = '';
    for (let tries = 0; tries < 3; tries++) {
      id = randomId(6);
      const { data: existing } = await sb.from('davis_shares').select('id').eq('id', id);
      if (!existing?.length) break;
    }

    const row = {
      id,
      result_data: result,
      breed: (breed as string) || (result as Record<string, unknown>)?.breed || '',
      tier: (tier as string) || '',
      created_at: new Date().toISOString(),
    };

    const { error } = await sb.from('davis_shares').insert(row);
    if (error) return { statusCode: 500, headers, body: JSON.stringify({ error: '儲存失敗' }) };

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, id, url: `/r/${id}` }) };
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
};

export { handler };
