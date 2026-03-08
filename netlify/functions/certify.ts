import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { corsHeaders } from './lib/cors';

const RATE_WINDOW = 60_000;
const RATE_MAX = 15;
const rateMap = new Map<string, { count: number; resetAt: number }>();

function checkRate(ip: string): boolean {
  const now = Date.now();
  const e = rateMap.get(ip);
  if (!e || now > e.resetAt) { rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW }); return true; }
  if (e.count >= RATE_MAX) return false;
  e.count++;
  return true;
}

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

function genCertId(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let s = 'DV-';
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
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

  const method = event.httpMethod;
  const rawPath = event.path.replace('/.netlify/functions/certify', '').replace('/api/certify', '') || '/';

  // Public: lookup single certification by cert_id (DV-XXXXXXXX)
  if (method === 'GET' && rawPath === '/') {
    const certId = event.queryStringParameters?.id;
    if (!certId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing id' }) };

    const { data, error } = await sb.from('davis_certifications').select('*').eq('cert_id', certId).single();
    if (error || !data) return { statusCode: 404, headers, body: JSON.stringify({ error: '查無此認證編號' }) };

    // Hide sensitive fields
    const { phone: _phone, ...pub } = data;
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, cert: pub }) };
  }

  // Public: apply for certification
  if (method === 'POST' && rawPath === '/') {
    let body: Record<string, unknown>;
    try { body = JSON.parse(event.body ?? '{}'); } catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

    const shopName = String(body.shop_name || '');
    const name = String(body.name || body.owner_name || '');
    if (!shopName || !name) return { statusCode: 400, headers, body: JSON.stringify({ error: '店名和姓名必填' }) };
    if (shopName.length > 50) return { statusCode: 400, headers, body: JSON.stringify({ error: '店名過長（上限50字）' }) };
    if (name.length > 20) return { statusCode: 400, headers, body: JSON.stringify({ error: '姓名過長（上限20字）' }) };

    const note = String(body.note || '');
    if (note.length > 500) return { statusCode: 400, headers, body: JSON.stringify({ error: '說明過長（上限500字）' }) };

    // Generate unique cert_id (DV-XXXXXXXX)
    let certId = '';
    for (let tries = 0; tries < 5; tries++) {
      certId = genCertId();
      const { data: existing } = await sb.from('davis_certifications').select('cert_id').eq('cert_id', certId);
      if (!existing?.length) break;
    }

    const row = {
      cert_id: certId,
      name,
      shop_name: shopName,
      phone: String(body.phone || '').slice(0, 20),
      city: String(body.city || '').slice(0, 20),
      email: String(body.email || '').slice(0, 100),
      instagram: String(body.ig_url || body.instagram || '').slice(0, 200),
      facebook: String(body.fb_url || body.facebook || '').slice(0, 200),
      note: note || null,
      status: 'pending',
    };

    console.log('Certify request body:', JSON.stringify(body));
    console.log('Certify insert row:', JSON.stringify(row));

    const { data: inserted, error } = await sb.from('davis_certifications').insert(row).select().single();
    if (error) {
      console.log('Supabase insert error:', JSON.stringify(error));
      return { statusCode: 500, headers, body: JSON.stringify({ error: '申請失敗，請稍後再試', detail: error.message }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, id: certId, cert_id: certId, message: '申請已送出，審核後會通知您' }) };
  }

  // Admin: require token
  const user = verifyToken(event.headers['authorization'] || event.headers['Authorization'] || '');
  if (!user) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };

  // Admin: list certifications
  if (method === 'GET' && rawPath === '/list') {
    const isAdmin = user.role === 'admin';
    const status = event.queryStringParameters?.status || '';
    let query = sb.from('davis_certifications')
      .select(isAdmin ? '*' : 'id,cert_id,name,shop_name,city,instagram,facebook,status,created_at')
      .order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data } = await query;
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, certs: data || [] }) };
  }

  // Admin: approve/reject
  if (method === 'PATCH' && rawPath.length > 1) {
    if (user.role !== 'admin') return { statusCode: 403, headers, body: JSON.stringify({ error: '僅管理員可審核認證' }) };
    const id = rawPath.slice(1);
    let body: Record<string, unknown>;
    try { body = JSON.parse(event.body ?? '{}'); } catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

    const allowedStatuses = ['approved', 'rejected', 'pending'];
    const updates: Record<string, unknown> = {};
    if (typeof body.status === 'string' && allowedStatuses.includes(body.status)) {
      updates.status = body.status;
      if (body.status === 'approved') {
        updates.approved_at = new Date().toISOString();
      }
    }
    if (Object.keys(updates).length === 0) return { statusCode: 400, headers, body: JSON.stringify({ error: '無有效更新欄位' }) };

    const { error } = await sb.from('davis_certifications').update(updates).eq('id', id);
    if (error) return { statusCode: 500, headers, body: JSON.stringify({ error: '更新失敗' }) };
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  }

  return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
};

export { handler };
