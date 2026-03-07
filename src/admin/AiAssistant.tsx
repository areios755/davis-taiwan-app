import { useState } from 'react';
import { useAuth } from './AdminApp';
import { adminApi } from '@/lib/api';
import { Bot, Download, Loader2 } from 'lucide-react';

interface AiResult {
  breeds: Array<{
    name_zh: string; name_en: string; name_ja: string; emoji: string;
    coat_type: string; product_keys: string[]; reason: string; confidence: string;
  }>;
  products: Array<{
    id: string; category: string; icon: string; tag_zh: string; tag_en: string;
    reason_zh: string; reason_en: string;
    steps: Array<{ role: string; name: string; dilution: string; time: string }>;
    confidence: string;
  }>;
  summary: string;
}

export default function AiAssistant() {
  const { token, role } = useAuth();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiResult | null>(null);
  const [error, setError] = useState('');
  const [importMsg, setImportMsg] = useState('');

  if (role === 'viewer') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">您沒有權限使用 AI 助手</p>
      </div>
    );
  }

  const handleAnalyze = async () => {
    if (text.trim().length < 10) { setError('文字太短（至少 10 字）'); return; }
    setLoading(true);
    setError('');
    setResult(null);
    setImportMsg('');

    const res = await adminApi.aiAssist(token, text);
    setLoading(false);
    if (res.success && res.data) {
      setResult(res.data as AiResult);
    } else {
      setError(res.error || 'AI 分析失敗');
    }
  };

  const handleImportProducts = async () => {
    if (!result || result.products.length === 0) return;
    setImportMsg('匯入中...');
    const rows = result.products.map((p) => ({
      product_key: p.id,
      category: p.category,
      tag_zh: p.tag_zh,
      tag_en: p.tag_en,
      reason_zh: p.reason_zh,
      reason_en: p.reason_en,
    }));
    const res = await adminApi.importProducts(token, rows);
    if (res.success && res.data) {
      setImportMsg(`產品匯入完成: ${res.data.ok} 成功 / ${res.data.fail} 失敗`);
    } else {
      setImportMsg('匯入失敗');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-davis-navy mb-2">AI 助手</h1>
      <p className="text-sm text-gray-400 mb-6">貼入對話紀錄、培訓資料或文章，AI 將自動提取品種配方資訊</p>

      <div className="bg-white rounded-xl border p-4 mb-6">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-davis-blue/30"
          placeholder="在此貼入文字內容（最多 20,000 字）..."
        />
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-gray-400">{text.length.toLocaleString()} / 20,000 字</span>
          <button onClick={handleAnalyze} disabled={loading} className="btn-davis flex items-center gap-1 disabled:opacity-50">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Bot size={16} />}
            {loading ? '分析中...' : 'AI 分析'}
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3 mb-4">{error}</div>}
      {importMsg && <div className="bg-blue-50 text-blue-600 text-sm rounded-xl p-3 mb-4">{importMsg}</div>}

      {result && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-davis-light rounded-xl p-4">
            <p className="text-sm text-davis-navy">{result.summary}</p>
          </div>

          {/* Extracted breeds */}
          {result.breeds.length > 0 && (
            <div className="bg-white rounded-xl border p-4">
              <h3 className="font-bold text-davis-navy mb-3">提取到的品種 ({result.breeds.length})</h3>
              <div className="space-y-2">
                {result.breeds.map((b, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <span className="text-2xl">{b.emoji || '🐾'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{b.name_zh} <span className="text-gray-400">({b.name_en})</span></p>
                      <p className="text-xs text-gray-500">{b.coat_type} · {(b.product_keys || []).join(', ')}</p>
                      <p className="text-xs text-gray-400 mt-1">{b.reason}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${b.confidence === 'high' ? 'bg-green-50 text-green-600' : b.confidence === 'medium' ? 'bg-yellow-50 text-yellow-600' : 'bg-gray-100 text-gray-500'}`}>
                      {b.confidence}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Extracted products */}
          {result.products.length > 0 && (
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-davis-navy">提取到的配方 ({result.products.length})</h3>
                <button onClick={handleImportProducts} className="btn-davis-outline flex items-center gap-1 text-xs">
                  <Download size={14} /> 匯入產品
                </button>
              </div>
              <div className="space-y-2">
                {result.products.map((p, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span>{p.icon || '✨'}</span>
                      <span className="font-medium text-sm">{p.tag_zh}</span>
                      <span className="text-xs text-gray-400">({p.id})</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ml-auto ${p.confidence === 'high' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'}`}>
                        {p.confidence}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{p.reason_zh}</p>
                    {p.steps && p.steps.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {p.steps.map((s, j) => (
                          <div key={j} className="text-xs text-gray-400">
                            {s.role}: {s.name} ({s.dilution}, {s.time})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.breeds.length === 0 && result.products.length === 0 && (
            <p className="text-center text-gray-400 py-8">未從文字中提取到品種或配方資訊</p>
          )}
        </div>
      )}
    </div>
  );
}
