import type { Handler } from '@netlify/functions';

const handler: Handler = async () => {
  const apiKey = process.env.ANTHROPIC_API_KEY || '';
  const supaUrl = process.env.SUPABASE_URL || '';

  let apiTest = { status: 0, body: 'skipped' };

  if (apiKey) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Say: OK' }],
        }),
      });

      clearTimeout(timeout);
      const text = await res.text();
      apiTest = { status: res.status, body: text.slice(0, 500) };
    } catch (e) {
      apiTest = { status: 0, body: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key_set: apiKey.length > 0,
      api_key_prefix: apiKey ? apiKey.slice(0, 8) + '...' : 'NOT SET',
      supabase_url: supaUrl ? supaUrl.slice(0, 30) + '...' : 'NOT SET',
      api_test_status: apiTest.status,
      api_test_response: apiTest.body,
      node_version: process.version,
      timestamp: new Date().toISOString(),
    }, null, 2),
  };
};

export { handler };
