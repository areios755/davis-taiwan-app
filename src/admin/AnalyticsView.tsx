import { useState, useEffect } from 'react';
import { useAuth } from './AdminApp';
import { adminApi } from '@/lib/api';

const INPUT_PRICE = 3;
const OUTPUT_PRICE = 15;

interface Summary {
  days: number;
  periodTotal: number;
  daily: { date: string; count: number }[];
  topBreeds: { breed: string; count: number }[];
  monthTokens: { input_tokens: number; output_tokens: number; ai_calls: number };
  yearTokens: { input_tokens: number; output_tokens: number; ai_calls: number };
  currentMonth: string;
  currentYear: string;
}

export default function AnalyticsView() {
  const { token } = useAuth();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminApi.getAnalyticsSummary(token, days).then((res) => {
      if (res.success && res.data) setData(res.data);
      setLoading(false);
    });
  }, [token, days]);

  const cost = (tokens: { input_tokens: number; output_tokens: number }) =>
    ((tokens.input_tokens / 1_000_000) * INPUT_PRICE + (tokens.output_tokens / 1_000_000) * OUTPUT_PRICE).toFixed(2);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-davis-navy">數據分析</h1>
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-full text-xs ${days === d ? 'bg-davis-blue text-white' : 'bg-gray-100 text-gray-600'}`}>
              {d} 天
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-12">載入中...</p>
      ) : data ? (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card label={`${days} 天分析次數`} value={String(data.periodTotal)} />
            <Card label={`本月 AI 呼叫`} value={String(data.monthTokens.ai_calls)} />
            <Card label={`本月成本`} value={`$${cost(data.monthTokens)}`} sub="USD" />
            <Card label={`年度成本`} value={`$${cost(data.yearTokens)}`} sub="USD" />
          </div>

          {/* Token detail */}
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-bold text-davis-navy mb-3">Token 使用明細</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400 text-xs">本月 ({data.currentMonth})</p>
                <p>Input: {(data.monthTokens.input_tokens / 1000).toFixed(1)}K tok</p>
                <p>Output: {(data.monthTokens.output_tokens / 1000).toFixed(1)}K tok</p>
                <p className="text-davis-gold font-medium">Cost: ${cost(data.monthTokens)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">年度 ({data.currentYear})</p>
                <p>Input: {(data.yearTokens.input_tokens / 1000).toFixed(1)}K tok</p>
                <p>Output: {(data.yearTokens.output_tokens / 1000).toFixed(1)}K tok</p>
                <p className="text-davis-gold font-medium">Cost: ${cost(data.yearTokens)}</p>
              </div>
            </div>
          </div>

          {/* Daily chart (simple bar) */}
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-bold text-davis-navy mb-3">每日分析次數</h3>
            {data.daily.length === 0 ? (
              <p className="text-gray-400 text-sm">無資料</p>
            ) : (
              <div className="flex items-end gap-1 h-32 overflow-x-auto">
                {data.daily.slice(-30).map((d) => {
                  const max = Math.max(...data.daily.map((x) => x.count), 1);
                  const h = (d.count / max) * 100;
                  return (
                    <div key={d.date} className="flex flex-col items-center min-w-[16px]" title={`${d.date}: ${d.count}`}>
                      <div className="bg-davis-blue rounded-t w-3" style={{ height: `${Math.max(h, 2)}%` }} />
                      <span className="text-[8px] text-gray-300 mt-0.5">{d.date.slice(8)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top breeds */}
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-bold text-davis-navy mb-3">熱門品種</h3>
            {data.topBreeds.length === 0 ? (
              <p className="text-gray-400 text-sm">無資料</p>
            ) : (
              <div className="space-y-2">
                {data.topBreeds.map((b, i) => (
                  <div key={b.breed} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-5">{i + 1}</span>
                    <span className="text-sm flex-1">{b.breed}</span>
                    <div className="w-32 bg-gray-100 rounded-full h-2">
                      <div className="bg-davis-blue h-2 rounded-full"
                        style={{ width: `${(b.count / data.topBreeds[0].count) * 100}%` }} />
                    </div>
                    <span className="text-xs text-gray-400 w-8 text-right">{b.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="text-gray-400 text-center py-12">無法載入資料</p>
      )}
    </div>
  );
}

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-davis-navy">{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}
