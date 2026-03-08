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

function json(status: number, data: unknown, headers: Record<string, string>) {
  return { statusCode: status, headers, body: JSON.stringify(data) };
}

function logEmail(to: string | undefined, subject: string, body: string) {
  console.log('EMAIL_NOTIFY:', JSON.stringify({ to: to || '(no email)', subject, body }));
}

function oneYearFromNow(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

async function auditLog(
  sb: ReturnType<typeof createClient>,
  actor: string, action: string, targetType: string,
  targetId: string | null, targetName: string, diff: unknown, ip: string,
) {
  try {
    await sb.from('davis_audit_log').insert({
      actor, action, target_type: targetType,
      target_id: targetId, target_name: targetName,
      diff: diff || {}, ip,
    });
  } catch { /* never break main flow */ }
}

// Auto-expire: mark approved certs with past expires_at as expired
async function autoExpire(sb: ReturnType<typeof createClient>) {
  try {
    const now = new Date().toISOString();
    const { data: expired } = await sb.from('davis_certifications')
      .select('id,cert_id,name,email,expires_at')
      .eq('status', 'approved')
      .lt('expires_at', now);
    if (expired && expired.length > 0) {
      const ids = expired.map((e: Record<string, unknown>) => e.id);
      await sb.from('davis_certifications')
        .update({ status: 'expired' })
        .in('id', ids);
      for (const cert of expired) {
        const c = cert as Record<string, string>;
        logEmail(c.email,
          'Davis 認證已到期 — 請續約',
          `${c.name} 您好，\n您的 Davis 認證（${c.cert_id}）已於 ${formatDate(c.expires_at)} 到期。\n請聯繫 Davis Taiwan 辦理續約。`,
        );
      }
    }
  } catch { /* best effort */ }
}

const handler: Handler = async (event) => {
  const origin = event.headers['origin'] || event.headers['Origin'];
  const headers = corsHeaders(origin);

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  const sb = getSupa();
  if (!sb) return json(500, { error: 'Missing config' }, headers);

  const clientIp = event.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? 'unknown';
  if (!checkRate(clientIp)) return json(429, { error: 'Too many requests' }, headers);

  const method = event.httpMethod;
  const rawPath = event.path.replace('/.netlify/functions/certify', '').replace('/api/certify', '') || '/';

  // Public: lookup single certification by cert_id (DV-XXXXXXXX)
  if (method === 'GET' && rawPath === '/') {
    const certId = event.queryStringParameters?.id;
    if (!certId) return json(400, { error: 'Missing id' }, headers);

    const { data, error } = await sb.from('davis_certifications').select('*').eq('cert_id', certId).single();
    if (error || !data) return json(404, { error: '查無此認證編號' }, headers);

    // Auto-expire if needed
    if (data.status === 'approved' && data.expires_at && new Date(data.expires_at) < new Date()) {
      await sb.from('davis_certifications').update({ status: 'expired' }).eq('id', data.id);
      data.status = 'expired';
    }

    // Hide sensitive fields
    const { phone: _phone, admin_notes: _notes, suspend_reason: _sr, revoke_reason: _rr, ...pub } = data;
    return json(200, { ok: true, cert: pub }, headers);
  }

  // Public: apply for certification
  if (method === 'POST' && rawPath === '/') {
    let body: Record<string, unknown>;
    try { body = JSON.parse(event.body ?? '{}'); } catch { return json(400, { error: 'Invalid JSON' }, headers); }

    const shopName = String(body.shop_name || '');
    const name = String(body.name || body.owner_name || '');
    if (!shopName || !name) return json(400, { error: '店名和姓名必填' }, headers);
    if (shopName.length > 50) return json(400, { error: '店名過長（上限50字）' }, headers);
    if (name.length > 20) return json(400, { error: '姓名過長（上限20字）' }, headers);

    const note = String(body.note || '');
    if (note.length > 500) return json(400, { error: '說明過長（上限500字）' }, headers);

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

    const { error } = await sb.from('davis_certifications').insert(row).select().single();
    if (error) {
      console.log('Supabase insert error:', JSON.stringify(error));
      return json(500, { error: '申請失敗，請稍後再試', detail: error.message }, headers);
    }

    return json(200, { ok: true, id: certId, cert_id: certId, message: '申請已送出，審核後會通知您' }, headers);
  }

  // Admin: require token
  const user = verifyToken(event.headers['authorization'] || event.headers['Authorization'] || '');
  if (!user) return json(401, { error: 'Unauthorized' }, headers);

  // Admin: list certifications (auto-expire first)
  if (method === 'GET' && rawPath === '/list') {
    await autoExpire(sb);

    const status = event.queryStringParameters?.status || '';
    let query = sb.from('davis_certifications')
      .select('*')
      .order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data } = await query;
    return json(200, { ok: true, certs: data || [] }, headers);
  }

  // Admin: PATCH actions — approve/reject/suspend/restore/revoke/renew/update_notes
  if (method === 'PATCH' && rawPath.length > 1) {
    if (user.role !== 'admin' && user.role !== 'editor') {
      return json(403, { error: '權限不足' }, headers);
    }

    const id = rawPath.slice(1);
    let body: Record<string, unknown>;
    try { body = JSON.parse(event.body ?? '{}'); } catch { return json(400, { error: 'Invalid JSON' }, headers); }

    const action = String(body.action || body.status || '');

    // Fetch current cert for email notification
    const { data: cert } = await sb.from('davis_certifications').select('*').eq('id', id).single();
    if (!cert) return json(404, { error: '找不到此認證' }, headers);

    const updates: Record<string, unknown> = {};
    let emailSubject = '';
    let emailBody = '';

    switch (action) {
      case 'approved':
      case 'approve': {
        updates.status = 'approved';
        updates.approved_at = new Date().toISOString();
        updates.expires_at = oneYearFromNow();
        updates.suspended_at = null;
        updates.suspend_reason = null;

        const expiresFormatted = formatDate(updates.expires_at as string);
        emailSubject = '恭喜！您的 Davis 認證美容師申請已通過';
        emailBody = `${cert.name} 您好，\n恭喜您通過 Davis Taiwan 認證美容師審核！\n認證編號：${cert.cert_id}\n有效期限：${expiresFormatted}（一年）\n驗證頁面：https://davistaiwan.netlify.app/verify/${cert.cert_id}\n到期前我們會通知您續約。感謝您對 Davis 品牌的支持！`;
        break;
      }

      case 'rejected':
      case 'reject': {
        updates.status = 'rejected';
        break;
      }

      case 'suspended':
      case 'suspend': {
        const reason = String(body.reason || '').trim();
        if (!reason) return json(400, { error: '停權原因必填' }, headers);
        updates.status = 'suspended';
        updates.suspended_at = new Date().toISOString();
        updates.suspend_reason = reason;

        emailSubject = 'Davis 認證美容師資格已暫停';
        emailBody = `${cert.name} 您好，\n您的 Davis 認證美容師資格已被暫停。\n原因：${reason}\n如有疑問請聯繫 Davis Taiwan。`;
        break;
      }

      case 'restore': {
        updates.status = 'approved';
        updates.suspended_at = null;
        updates.suspend_reason = null;
        // Keep or extend expires_at if it was expired
        if (!cert.expires_at || new Date(cert.expires_at) < new Date()) {
          updates.expires_at = oneYearFromNow();
        }

        emailSubject = 'Davis 認證美容師資格已恢復';
        emailBody = `${cert.name} 您好，\n恭喜，您的 Davis 認證已恢復有效。`;
        break;
      }

      case 'revoked':
      case 'revoke': {
        const reason = String(body.reason || '').trim();
        if (!reason) return json(400, { error: '撤銷原因必填' }, headers);
        updates.status = 'revoked';
        updates.revoked_at = new Date().toISOString();
        updates.revoke_reason = reason;

        emailSubject = 'Davis 認證美容師資格已被撤銷';
        emailBody = `${cert.name} 您好，\n很遺憾通知您，您的 Davis 認證美容師資格已被撤銷。\n原因：${reason}\n此決定為最終決定。`;
        break;
      }

      case 'renew': {
        updates.status = 'approved';
        updates.expires_at = oneYearFromNow();

        const expiresFormatted = formatDate(updates.expires_at as string);
        emailSubject = 'Davis 認證已成功續約';
        emailBody = `${cert.name} 您好，\n您的 Davis 認證已成功續約。\n新的有效期限：${expiresFormatted}\n感謝您持續支持 Davis 品牌！`;
        break;
      }

      case 'update_notes': {
        updates.admin_notes = String(body.admin_notes ?? '');
        break;
      }

      case 'pending': {
        updates.status = 'pending';
        updates.approved_at = null;
        updates.expires_at = null;
        updates.suspended_at = null;
        updates.suspend_reason = null;
        updates.revoked_at = null;
        updates.revoke_reason = null;
        break;
      }

      default:
        return json(400, { error: `不支援的操作: ${action}` }, headers);
    }

    const { error } = await sb.from('davis_certifications').update(updates).eq('id', id);
    if (error) return json(500, { error: '更新失敗', detail: error.message }, headers);

    // Audit log
    auditLog(sb, user.username, `cert_${action}`, 'certification', id,
      `${cert.shop_name} (${cert.cert_id || ''})`,
      { before: { status: cert.status }, after: updates, reason: body.reason || null },
      clientIp,
    );

    // Email notification
    if (emailSubject) {
      logEmail(cert.email, emailSubject, emailBody);
    }

    return json(200, { ok: true }, headers);
  }

  return json(404, { error: 'Not found' }, headers);
};

export { handler };
