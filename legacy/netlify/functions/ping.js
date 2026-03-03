// 診斷用 endpoint - 部署後訪問 /api/ping 看環境狀況
exports.handler = async (event) => {
  const apiKey = process.env.ANTHROPIC_API_KEY || '';
  
  // 實際打一個最小的 API 請求
  const https = require('https');
  
  const testBody = JSON.stringify({
    model: 'claude-opus-4-6',
    max_tokens: 10,
    messages: [{ role: 'user', content: 'Say: OK' }]
  });

  const result = await new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(testBody),
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data.slice(0, 500) }));
    });
    req.on('error', e => resolve({ status: 0, body: 'Network error: ' + e.message }));
    setTimeout(() => resolve({ status: 0, body: 'Timeout after 8s' }), 8000);
    req.write(testBody);
    req.end();
  });

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key_set: apiKey.length > 0,
      api_key_prefix: apiKey ? apiKey.slice(0, 8) + '...' : 'NOT SET',
      api_test_status: result.status,
      api_test_response: result.body,
      node_version: process.version,
      timestamp: new Date().toISOString()
    }, null, 2)
  };
};
