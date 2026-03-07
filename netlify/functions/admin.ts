import type { Handler } from '@netlify/functions';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { corsHeaders } from './lib/cors';

// ============================================================
// Rate Limiting
// ============================================================
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

// ============================================================
// Helpers
// ============================================================
function json(code: number, obj: unknown, headers: Record<string, string>) {
  return { statusCode: code, headers, body: JSON.stringify(obj) };
}

function hashPw(pw: string): string {
  return crypto.createHash('sha256')
    .update((process.env.PASSWORD_SALT || 'davis_salt_') + pw)
    .digest('hex');
}

function makeToken(username: string, role: string): string {
  const secret = process.env.DAVIS_TOKEN_SECRET;
  if (!secret) throw new Error('DAVIS_TOKEN_SECRET not set');
  const exp = Math.floor(Date.now() / 1000) + 8 * 60 * 60; // 8 hours
  const sig = crypto.createHash('sha256')
    .update(`${username}:${role}:${exp}:${secret}`)
    .digest('hex').slice(0, 16);
  return Buffer.from(JSON.stringify({ username, role, exp, sig })).toString('base64');
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

function getSupa() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// ============================================================
// Audit Log Helper
// ============================================================
async function auditLog(
  sb: SupabaseClient,
  user: { username: string; role: string },
  action: string,
  targetType: string,
  targetId: string | null,
  targetName: string | null,
  changes: { before?: unknown; after?: unknown } | null,
  ip: string,
) {
  try {
    await sb.from('davis_audit_log').insert({
      username: user.username,
      role: user.role,
      action,
      target_type: targetType,
      target_id: targetId,
      target_name: targetName,
      changes,
      ip_address: ip,
    });
  } catch {
    // Never let audit log failure break main operation
  }
}

// ============================================================
// Handler
// ============================================================
const handler: Handler = async (event) => {
  const origin = event.headers['origin'] || event.headers['Origin'];
  const headers = corsHeaders(origin);

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  const sb = getSupa();
  if (!sb) return json(500, { error: 'Missing Supabase config' }, headers);

  const clientIp = event.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? 'unknown';
  if (!checkRate(clientIp)) return json(429, { error: 'Too many requests' }, headers);

  const method = event.httpMethod;
  const path = event.path.replace('/.netlify/functions/admin', '').replace('/api/admin', '') || '/';
  let body: Record<string, unknown> = {};
  try { body = event.body ? JSON.parse(event.body) : {}; } catch { body = {}; }

  const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';

  // ── Login ──
  if (path === '/login' && method === 'POST') {
    const { username, password } = body;
    if (!username || !password) return json(400, { error: '缺少帳號或密碼' }, headers);

    const adminUser = process.env.DAVIS_ADMIN_USERNAME || '';
    const adminPw = process.env.DAVIS_ADMIN_PASSWORD || '';

    if (adminUser && username === adminUser && password === adminPw) {
      auditLog(sb, { username: String(username), role: 'admin' }, 'login', 'user', String(username), null, null, clientIp);
      return json(200, {
        ok: true,
        token: makeToken(String(username), 'admin'),
        role: 'admin',
        displayName: '管理員',
      }, headers);
    }

    // Check DB users
    const { data: users } = await sb.from('davis_users')
      .select('*')
      .eq('username', String(username));
    const user = users?.[0];
    if (user && user.password_hash === hashPw(String(password))) {
      auditLog(sb, { username: String(username), role: user.role }, 'login', 'user', String(username), null, null, clientIp);
      return json(200, {
        ok: true,
        token: makeToken(String(username), user.role),
        role: user.role,
        displayName: user.display_name || username,
      }, headers);
    }

    return json(401, { error: '帳號或密碼錯誤' }, headers);
  }

  // ── Auth required for everything below ──
  const currentUser = verifyToken(authHeader);
  if (!currentUser) return json(401, { error: '未授權' }, headers);
  const isAdmin = currentUser.role === 'admin';
  const isEditor = currentUser.role === 'editor';
  const canEdit = isAdmin || isEditor;

  // ── Me ──
  if (path === '/me' && method === 'GET') {
    return json(200, { username: currentUser.username, role: currentUser.role }, headers);
  }

  // ── Change password ──
  if (path === '/change-password' && method === 'POST') {
    const { old_password, new_password } = body;
    if (!new_password || String(new_password).length < 8) return json(400, { error: '新密碼至少 8 字元' }, headers);
    if (currentUser.username === process.env.DAVIS_ADMIN_USERNAME) return json(400, { error: '主管理員密碼請在 Netlify 環境變數中修改' }, headers);

    const { data: users } = await sb.from('davis_users').select('*').eq('username', currentUser.username);
    const user = users?.[0];
    if (!user || user.password_hash !== hashPw(String(old_password))) return json(401, { error: '舊密碼錯誤' }, headers);

    await sb.from('davis_users').update({
      password_hash: hashPw(String(new_password)),
      updated_at: new Date().toISOString(),
    }).eq('username', currentUser.username);

    return json(200, { ok: true }, headers);
  }

  // ══ Read-only endpoints (all authenticated users) ══

  if (path === '/settings' && method === 'GET') {
    const { data } = await sb.from('davis_settings').select('*');
    const settings: Record<string, unknown> = {};
    (data || []).forEach((s: { key: string; value: unknown }) => {
      try { settings[s.key] = typeof s.value === 'string' ? JSON.parse(s.value as string) : s.value; } catch { settings[s.key] = s.value; }
    });
    return json(200, { settings }, headers);
  }

  if (path === '/products' && method === 'GET') {
    const { data } = await sb.from('davis_products').select('*').order('product_key');
    return json(200, { products: data || [] }, headers);
  }

  if (path === '/breeds' && method === 'GET') {
    const { data } = await sb.from('breed_groups').select('*').order('species').order('name');
    return json(200, { breeds: data || [] }, headers);
  }

  if (path === '/combos' && method === 'GET') {
    const { data } = await sb.from('davis_combos').select('*').order('sort_order').order('created_at');
    return json(200, { combos: data || [] }, headers);
  }

  // ── Audit Log ──
  if (path === '/audit-log' && method === 'GET') {
    if (!canEdit) return json(403, { error: '權限不足' }, headers);
    const limit = parseInt(event.queryStringParameters?.limit || '100') || 100;
    const offset = parseInt(event.queryStringParameters?.offset || '0') || 0;
    const action = event.queryStringParameters?.action || '';
    const user = event.queryStringParameters?.user || '';
    const from = event.queryStringParameters?.from || '';
    const to = event.queryStringParameters?.to || '';

    let query = sb.from('davis_audit_log').select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (action) query = query.eq('action', action);
    if (user) query = query.eq('username', user);
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to + 'T23:59:59.999Z');

    const { data, count } = await query;
    return json(200, { logs: data || [], total: count || 0 }, headers);
  }

  // ── Analytics summary ──
  if (path === '/analytics/summary' && method === 'GET') {
    const days = parseInt(event.queryStringParameters?.days || '30') || 30;
    const since = new Date(Date.now() - days * 86_400_000).toISOString();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();

    const [dailyR, breedR, monthR, yearR] = await Promise.all([
      sb.from('davis_analytics').select('created_at').gte('created_at', since).order('created_at'),
      sb.from('davis_analytics').select('breed').gte('created_at', since),
      sb.from('davis_analytics').select('tokens_in,tokens_out').gte('created_at', monthStart),
      sb.from('davis_analytics').select('tokens_in,tokens_out').gte('created_at', yearStart),
    ]);

    const dailyMap: Record<string, number> = {};
    (dailyR.data || []).forEach((r: { created_at: string }) => {
      const d = r.created_at.slice(0, 10);
      dailyMap[d] = (dailyMap[d] || 0) + 1;
    });
    const daily = Object.entries(dailyMap).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));

    const breedMap: Record<string, number> = {};
    (breedR.data || []).forEach((r: { breed: string }) => {
      const b = r.breed || '未知';
      breedMap[b] = (breedMap[b] || 0) + 1;
    });
    const topBreeds = Object.entries(breedMap).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([breed, count]) => ({ breed, count }));

    function sumTokens(rows: Array<{ tokens_in: number; tokens_out: number }> | null) {
      let inp = 0, outp = 0, calls = 0;
      (rows || []).forEach(r => { inp += r.tokens_in || 0; outp += r.tokens_out || 0; if (r.tokens_in > 0) calls++; });
      return { input_tokens: inp, output_tokens: outp, ai_calls: calls };
    }

    return json(200, {
      days,
      periodTotal: (dailyR.data || []).length,
      daily,
      topBreeds,
      monthTokens: sumTokens(monthR.data),
      yearTokens: sumTokens(yearR.data),
      currentMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      currentYear: `${now.getFullYear()}`,
    }, headers);
  }

  // ── Users list ──
  if (path === '/users' && method === 'GET') {
    if (!isAdmin) return json(403, { error: '權限不足' }, headers);
    const { data } = await sb.from('davis_users')
      .select('username,role,display_name,created_at,updated_at')
      .order('created_at');
    return json(200, { users: data || [] }, headers);
  }

  // ══ Editor + Admin: Products, Breeds CRUD ══

  // ── Products CRUD ──
  if (path === '/products' && method === 'POST') {
    if (!canEdit) return json(403, { error: '權限不足' }, headers);
    if (!body.product_key) return json(400, { error: '缺少 product_key' }, headers);

    // Fetch existing for diff
    const { data: existing } = await sb.from('davis_products').select('*').eq('product_key', String(body.product_key)).maybeSingle();
    const isCreate = !existing;

    const { error } = await sb.from('davis_products').upsert(body, { onConflict: 'product_key' });
    if (!error) {
      auditLog(sb, currentUser,
        isCreate ? 'create_product' : 'update_product',
        'product', String(body.product_key), String(body.name_zh || body.product_key),
        { before: existing || null, after: body },
        clientIp,
      );
    }
    return json(error ? 500 : 200, error ? { error: error.message } : { ok: true }, headers);
  }

  // ── Product Image Upload ──
  if (path === '/products/upload-image' && method === 'POST') {
    if (!canEdit) return json(403, { error: '權限不足' }, headers);
    const { product_key, image_data } = body;
    if (!product_key || !image_data) return json(400, { error: '缺少 product_key 或 image_data' }, headers);
    const b64str = String(image_data);
    // Validate size (~200KB base64 ≈ 150KB binary)
    if (b64str.length > 300_000) return json(400, { error: '圖片過大，請壓縮後再上傳 (上限 200KB)' }, headers);
    const { error } = await sb.from('davis_products').update({ image_data: b64str }).eq('product_key', String(product_key));
    if (!error) {
      auditLog(sb, currentUser, 'update_product', 'product', String(product_key), null,
        { before: null, after: { action: 'upload_image' } }, clientIp);
    }
    return json(error ? 500 : 200, error ? { error: error.message } : { ok: true }, headers);
  }

  if (path.startsWith('/products/') && method === 'DELETE') {
    if (!canEdit) return json(403, { error: '權限不足' }, headers);
    const productKey = decodeURIComponent(path.split('/products/')[1]);

    const { data: existing } = await sb.from('davis_products').select('*').eq('product_key', productKey).maybeSingle();
    await sb.from('davis_products').delete().eq('product_key', productKey);
    auditLog(sb, currentUser, 'delete_product', 'product', productKey, existing?.name_zh || productKey,
      { before: existing || null, after: null }, clientIp);
    return json(200, { ok: true }, headers);
  }

  if (path === '/products/import' && method === 'POST') {
    if (!canEdit) return json(403, { error: '權限不足' }, headers);
    const rows = (body.rows as Array<Record<string, unknown>>) || [];
    let ok = 0, fail = 0;
    for (const row of rows) {
      if (!row.product_key) { fail++; continue; }
      const { error } = await sb.from('davis_products').upsert(row, { onConflict: 'product_key' });
      if (error) fail++; else ok++;
    }
    auditLog(sb, currentUser, 'import_products', 'product', null, null,
      { before: null, after: { total: rows.length, ok, fail } }, clientIp);
    return json(200, { ok, fail, total: rows.length }, headers);
  }

  // ── Breeds CRUD ──
  if (path === '/breeds' && method === 'POST') {
    if (!canEdit) return json(403, { error: '權限不足' }, headers);
    if (!body.name) return json(400, { error: '缺少 name' }, headers);

    const lookupKey = body.davis_breed_id ? String(body.davis_breed_id) : null;
    let existing = null;
    if (lookupKey) {
      const r = await sb.from('breed_groups').select('*').eq('davis_breed_id', lookupKey).maybeSingle();
      existing = r.data;
    }
    const isCreate = !existing;

    const { error } = await sb.from('breed_groups').upsert(body, { onConflict: 'davis_breed_id' });
    if (!error) {
      auditLog(sb, currentUser,
        isCreate ? 'create_breed' : 'update_breed',
        'breed', lookupKey || String(body.name), String(body.name),
        { before: existing || null, after: body },
        clientIp,
      );
    }
    return json(error ? 500 : 200, error ? { error: error.message } : { ok: true }, headers);
  }

  if (path.startsWith('/breeds/') && method === 'DELETE') {
    if (!canEdit) return json(403, { error: '權限不足' }, headers);
    const breedId = decodeURIComponent(path.split('/breeds/')[1]);
    const isNumeric = /^\d+$/.test(breedId);

    const { data: existing } = isNumeric
      ? await sb.from('breed_groups').select('*').eq('id', Number(breedId)).maybeSingle()
      : await sb.from('breed_groups').select('*').eq('davis_breed_id', breedId).maybeSingle();

    const { error } = isNumeric
      ? await sb.from('breed_groups').delete().eq('id', Number(breedId))
      : await sb.from('breed_groups').delete().eq('davis_breed_id', breedId);

    auditLog(sb, currentUser, 'delete_breed', 'breed', breedId, existing?.name || breedId,
      { before: existing || null, after: null }, clientIp);
    return json(error ? 500 : 200, error ? { error: error.message } : { ok: true }, headers);
  }

  if (path === '/breeds/import' && method === 'POST') {
    if (!canEdit) return json(403, { error: '權限不足' }, headers);
    const rows = (body.rows as Array<Record<string, unknown>>) || [];
    let ok = 0, fail = 0;
    for (const row of rows) {
      if (!row.name) { fail++; continue; }
      const { error } = await sb.from('breed_groups').upsert(row, { onConflict: 'davis_breed_id' });
      if (error) fail++; else ok++;
    }
    auditLog(sb, currentUser, 'import_breeds', 'breed', null, null,
      { before: null, after: { total: rows.length, ok, fail } }, clientIp);
    return json(200, { ok, fail, total: rows.length }, headers);
  }

  // ── Combos CRUD ──
  if (path === '/combos' && method === 'POST') {
    if (!canEdit) return json(403, { error: '權限不足' }, headers);
    if (!body.name) return json(400, { error: '缺少 name' }, headers);

    const insertData = {
      combo_key: body.combo_key || String(body.name).replace(/\s+/g, '_').toLowerCase(),
      name: body.name,
      description: body.description || '',
      target_breeds: body.target_breeds || [],
      target_needs: body.target_needs || '',
      products: body.products || [],
      tips: body.tips || '',
      is_active: body.is_active !== false,
      sort_order: typeof body.sort_order === 'number' ? body.sort_order : 0,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await sb.from('davis_combos').insert(insertData).select().single();
    if (!error) {
      auditLog(sb, currentUser, 'create_combo', 'combo', data?.id?.toString() || null, String(body.name),
        { before: null, after: insertData }, clientIp);
    }
    return json(error ? 500 : 200, error ? { error: error.message } : { ok: true, combo: data }, headers);
  }

  if (path.startsWith('/combos/') && method === 'PATCH') {
    if (!canEdit) return json(403, { error: '權限不足' }, headers);
    const comboId = parseInt(path.split('/combos/')[1]);
    if (isNaN(comboId)) return json(400, { error: '無效 ID' }, headers);

    const { data: existing } = await sb.from('davis_combos').select('*').eq('id', comboId).maybeSingle();
    if (!existing) return json(404, { error: '組合不存在' }, headers);

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of ['combo_key', 'name', 'description', 'target_breeds', 'target_needs', 'products', 'tips', 'is_active', 'sort_order']) {
      if (body[key] !== undefined) updateData[key] = body[key];
    }

    const { error } = await sb.from('davis_combos').update(updateData).eq('id', comboId);
    if (!error) {
      auditLog(sb, currentUser, 'update_combo', 'combo', String(comboId), existing.name,
        { before: existing, after: updateData }, clientIp);
    }
    return json(error ? 500 : 200, error ? { error: error.message } : { ok: true }, headers);
  }

  if (path.startsWith('/combos/') && method === 'DELETE') {
    if (!canEdit) return json(403, { error: '權限不足' }, headers);
    const comboId = parseInt(path.split('/combos/')[1]);
    if (isNaN(comboId)) return json(400, { error: '無效 ID' }, headers);

    const { data: existing } = await sb.from('davis_combos').select('*').eq('id', comboId).maybeSingle();
    await sb.from('davis_combos').delete().eq('id', comboId);
    auditLog(sb, currentUser, 'delete_combo', 'combo', String(comboId), existing?.name || '',
      { before: existing || null, after: null }, clientIp);
    return json(200, { ok: true }, headers);
  }

  // ══ Admin only: Settings, Users, Seed ══
  if (!isAdmin) return json(403, { error: '僅管理員可執行此操作' }, headers);

  // ── Settings update ──
  if (path === '/settings' && method === 'PUT') {
    const ALLOWED_KEYS = [
      'enabled_languages', 'embed_whitelist', 'embed_use_real_ai', 'embed_fake_delay_ms',
      'ai_pricing', 'site_title', 'site_description',
      'contact_line', 'contact_email', 'certify_enabled', 'share_enabled',
    ];
    const changedKeys: string[] = [];
    for (const [key, value] of Object.entries(body)) {
      if (!ALLOWED_KEYS.includes(key)) continue;
      changedKeys.push(key);
      await sb.from('davis_settings').upsert({
        key,
        value: JSON.stringify(value),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });
    }
    auditLog(sb, currentUser, 'update_settings', 'settings', null, changedKeys.join(', '),
      { before: null, after: body }, clientIp);
    return json(200, { ok: true }, headers);
  }

  // ── User CRUD ──
  if (path === '/users' && method === 'POST') {
    const { username, password, role, display_name } = body;
    if (!username || !password) return json(400, { error: '缺少帳號或密碼' }, headers);
    if (String(password).length < 8) return json(400, { error: '密碼至少 8 字元' }, headers);
    if (username === process.env.DAVIS_ADMIN_USERNAME) return json(400, { error: '不可建立與主管理員相同的帳號' }, headers);
    const safeRole = ['viewer', 'editor', 'admin'].includes(String(role)) ? String(role) : 'viewer';
    const insertData = {
      username: String(username),
      password_hash: hashPw(String(password)),
      role: safeRole,
      display_name: String(display_name || username),
      updated_at: new Date().toISOString(),
    };
    const { error } = await sb.from('davis_users').insert(insertData);
    if (error) {
      const msg = error.code === '23505' ? '使用者名稱已存在'
        : error.code === '42P01' ? 'davis_users 資料表不存在，請先建立'
        : error.message || '建立使用者失敗';
      return json(500, { error: msg }, headers);
    }
    auditLog(sb, currentUser, 'create_user', 'user', String(username), String(display_name || username),
      { before: null, after: { username, role: safeRole, display_name: display_name || username } }, clientIp);
    return json(200, { ok: true }, headers);
  }

  if (path.startsWith('/users/') && !path.includes('reset-password') && method === 'DELETE') {
    const username = decodeURIComponent(path.split('/users/')[1]);
    if (username === process.env.DAVIS_ADMIN_USERNAME) return json(400, { error: '不可刪除主管理員' }, headers);
    const { data: existing } = await sb.from('davis_users').select('username,role,display_name').eq('username', username).maybeSingle();
    await sb.from('davis_users').delete().eq('username', username);
    auditLog(sb, currentUser, 'delete_user', 'user', username, existing?.display_name || username,
      { before: existing || null, after: null }, clientIp);
    return json(200, { ok: true }, headers);
  }

  if (path === '/users/reset-password' && method === 'POST') {
    const { username, new_password } = body;
    if (!username || !new_password) return json(400, { error: '缺少資料' }, headers);
    if (username === process.env.DAVIS_ADMIN_USERNAME) return json(400, { error: '主管理員密碼請在環境變數修改' }, headers);
    await sb.from('davis_users').update({
      password_hash: hashPw(String(new_password)),
      updated_at: new Date().toISOString(),
    }).eq('username', String(username));
    auditLog(sb, currentUser, 'update_user', 'user', String(username), null,
      { before: null, after: { action: 'reset_password' } }, clientIp);
    return json(200, { ok: true }, headers);
  }

  // ── Seed ──
  if (path === '/seed' && method === 'POST') {
    const { products, breeds, combos } = body;
    let pOk = 0, bOk = 0, cOk = 0;
    if (Array.isArray(products)) {
      for (const p of products) {
        const { error } = await sb.from('davis_products').upsert(p as Record<string, unknown>, { onConflict: 'product_key' });
        if (!error) pOk++;
      }
    }
    if (Array.isArray(breeds)) {
      for (const b of breeds) {
        const { error } = await sb.from('breed_groups').upsert(b as Record<string, unknown>, { onConflict: 'davis_breed_id' });
        if (!error) bOk++;
      }
    }
    if (Array.isArray(combos)) {
      for (const c of combos) {
        const { error } = await sb.from('davis_combos').upsert(c as Record<string, unknown>, { onConflict: 'combo_key' });
        if (!error) cOk++;
      }
    }
    return json(200, { products_seeded: pOk, breeds_seeded: bOk, combos_seeded: cOk }, headers);
  }

  return json(404, { error: 'Not found: ' + path }, headers);
};

export { handler };
