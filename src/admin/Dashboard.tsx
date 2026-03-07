import { useState, useEffect } from 'react';
import { useAuth } from './AdminApp';
import { adminApi } from '@/lib/api';
import { BarChart3, Package, Dog, Award, Bot, TrendingUp } from 'lucide-react';

interface Summary {
  periodTotal: number;
  daily: { date: string; count: number }[];
  topBreeds: { breed: string; count: number }[];
  monthTokens: { input_tokens: number; output_tokens: number; ai_calls: number };
  currentMonth: string;
}

const INPUT_PRICE = 3;   // $/MTok
const OUTPUT_PRICE = 15;  // $/MTok

type Page = 'dashboard' | 'products' | 'breeds' | 'settings' | 'analytics' | 'users' | 'ai' | 'certs';

export default function Dashboard({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const { token } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getAnalyticsSummary(token, 30).then((res) => {
      if (res.success && res.data) setSummary(res.data);
      setLoading(false);
    });
  }, [token]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayCount = summary?.daily.find((d) => d.date === todayStr)?.count || 0;

  const monthCost = summary
    ? ((summary.monthTokens.input_tokens / 1_000_000) * INPUT_PRICE +
       (summary.monthTokens.output_tokens / 1_000_000) * OUTPUT_PRICE).toFixed(2)
    : '0.00';

  return (
    <div>
      <h1 className="text-2xl font-bold text-davis-navy mb-6">儀表板</h1>

      {loading ? (
        <div className="text-center py-12 text-gray-400">載入中...</div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="今日分析" value={String(todayCount)} icon={<BarChart3 size={20} />} />
            <StatCard label="30 日總計" value={String(summary?.periodTotal || 0)} icon={<TrendingUp size={20} />} />
            <StatCard label="本月 AI 呼叫" value={String(summary?.monthTokens.ai_calls || 0)} icon={<Bot size={20} />} />
            <StatCard label={`本月成本 (USD)`} value={`$${monthCost}`} icon={<BarChart3 size={20} />} />
          </div>

          {/* Top breeds */}
          {summary && summary.topBreeds.length > 0 && (
            <div className="bg-white rounded-xl border p-4 mb-6">
              <h2 className="font-bold text-davis-navy mb-3">熱門品種 (30天)</h2>
              <div className="space-y-2">
                {summary.topBreeds.slice(0, 5).map((b) => (
                  <div key={b.breed} className="flex items-center justify-between">
                    <span className="text-sm">{b.breed}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-davis-blue h-2 rounded-full"
                          style={{ width: `${Math.min(100, (b.count / summary.topBreeds[0].count) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 w-8 text-right">{b.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick links */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <QuickLink icon={<Package size={20} />} label="產品管理" onClick={() => onNavigate('products')} />
            <QuickLink icon={<Dog size={20} />} label="品種管理" onClick={() => onNavigate('breeds')} />
            <QuickLink icon={<Award size={20} />} label="認證審核" onClick={() => onNavigate('certs')} />
            <QuickLink icon={<Bot size={20} />} label="AI 助手" onClick={() => onNavigate('ai')} />
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex items-center gap-2 text-davis-blue mb-2">{icon}<span className="text-xs text-gray-400">{label}</span></div>
      <p className="text-2xl font-bold text-davis-navy">{value}</p>
    </div>
  );
}

function QuickLink({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="bg-white rounded-xl border p-4 flex items-center gap-3 hover:bg-davis-light transition-colors text-left">
      <div className="text-davis-blue">{icon}</div>
      <span className="text-sm font-medium text-davis-navy">{label}</span>
    </button>
  );
}
