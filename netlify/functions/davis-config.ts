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
    'Cache-Control': 'no-store, no-cache, must-revalidate',
  };
}

const handler: Handler = async (event) => {
  const origin = event.headers['origin'] || event.headers['Origin'];
  const headers = corsHeaders(origin);

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  const supaUrl = process.env.SUPABASE_URL;
  const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supaUrl || !supaKey) {
    return { statusCode: 200, headers, body: JSON.stringify({ dynamic: false }) };
  }

  try {
    const sb = createClient(supaUrl, supaKey);

    const [settingsRes, productsRes, breedsRes] = await Promise.all([
      sb.from('davis_settings').select('*'),
      sb.from('davis_products').select('*').eq('is_active', true),
      sb.from('breed_groups').select('*').eq('is_active', true).order('sort_order'),
    ]);

    // Parse settings
    const settings: Record<string, unknown> = {};
    (settingsRes.data || []).forEach((s: { key: string; value: unknown }) => {
      try {
        settings[s.key] = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
      } catch {
        settings[s.key] = s.value;
      }
    });

    // Strip sensitive keys — NEVER expose API keys to frontend
    delete settings['anthropic_api_key'];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        dynamic: true,
        settings,
        products: productsRes.data || [],
        breeds: breedsRes.data || [],
      }),
    };
  } catch (err) {
    console.error('davis-config error:', err);
    return { statusCode: 200, headers, body: JSON.stringify({ dynamic: false }) };
  }
};

export { handler };
