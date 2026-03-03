// 安全地把 API key 傳給前端（只在 server side 讀環境變數）
exports.handler = async () => {
  const apiKey = process.env.ANTHROPIC_API_KEY || '';
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ k: apiKey })
  };
};
