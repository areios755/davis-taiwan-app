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
    'Content-Type': 'application/json',
  };
}

const RATE_WINDOW = 60_000;
const RATE_MAX = 30;
const rateMap = new Map<string, { count: number; resetAt: number }>();

function checkRate(ip: string): boolean {
  const now = Date.now();
  const e = rateMap.get(ip);
  if (!e || now > e.resetAt) { rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW }); return true; }
  if (e.count >= RATE_MAX) return false;
  e.count++;
  return true;
}

const handler: Handler = async (event) => {
  const origin = event.headers['origin'] || event.headers['Origin'];
  const headers = corsHeaders(origin);

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method Not Allowed' };

  const clientIp = event.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? 'unknown';
  if (!checkRate(clientIp)) return { statusCode: 429, headers, body: JSON.stringify({ error: 'Too many requests' }) };

  const supaUrl = process.env.SUPABASE_URL;
  const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supaUrl || !supaKey) {
    return { statusCode: 200, headers, body: '{"ok":true,"logged":false}' };
  }

  let body: Record<string, unknown>;
  try { body = JSON.parse(event.body ?? '{}'); } catch { return { statusCode: 400, headers, body: '{"error":"Invalid JSON"}' }; }

  const row = {
    event_type: 'page_view',
    breed: String(body.breed || '').slice(0, 100),
    tier: String(body.tier_selected || '').slice(0, 30),
    tokens_in: parseInt(String(body.input_tokens)) || 0,
    tokens_out: parseInt(String(body.output_tokens)) || 0,
    model: String(body.model || '').slice(0, 50),
    ip_address: clientIp,
    user_agent: (event.headers['user-agent'] || '').slice(0, 300),
  };

  try {
    const sb = createClient(supaUrl, supaKey);
    await sb.from('davis_analytics').insert(row);
  } catch {
    // Silent fail for analytics
  }

  return { statusCode: 200, headers, body: '{"ok":true}' };
};

export { handler };
