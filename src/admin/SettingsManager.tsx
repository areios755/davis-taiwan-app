import { useState, useEffect } from 'react';
import { useAuth } from './AdminApp';
import { adminApi } from '@/lib/api';
import { Save } from 'lucide-react';

export default function SettingsManager() {
  const { token, role } = useAuth();
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [whitelistText, setWhitelistText] = useState('');

  useEffect(() => {
    adminApi.getSettings(token).then((res) => {
      if (res.success && res.data) {
        setSettings(res.data.settings);
        const wl = res.data.settings.embed_whitelist;
        setWhitelistText(Array.isArray(wl) ? (wl as string[]).join('\n') : '');
      }
      setLoading(false);
    });
  }, [token]);

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    const urls = whitelistText.split('\n').map(s => s.trim()).filter(Boolean);
    const res = await adminApi.updateSettings(token, { ...settings, embed_whitelist: urls });
    setSaving(false);
    setMsg(res.success ? '已儲存' : (res.error || '儲存失敗'));
  };

  if (role !== 'admin') {
    return <div className="text-center py-12 text-gray-400">僅管理員可存取設定</div>;
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">載入中...</div>;
  }

  const MODEL_OPTIONS = [
    { label: 'Claude Haiku 3.5（日常）', model: 'claude-haiku-4-5-20241022', input_per_mtok: 0.80, output_per_mtok: 4 },
    { label: 'Claude Sonnet 4.5（高品質）', model: 'claude-sonnet-4-5-20250929', input_per_mtok: 3, output_per_mtok: 15 },
  ];

  const aiPricing = (settings.ai_pricing || { model: 'claude-haiku-4-5-20241022', input_per_mtok: 0.80, output_per_mtok: 4, currency: 'USD' }) as {
    model: string; input_per_mtok: number; output_per_mtok: number; currency: string;
  };

  const handleModelChange = (modelId: string) => {
    const opt = MODEL_OPTIONS.find(o => o.model === modelId);
    if (opt) {
      setSettings({ ...settings, ai_pricing: { ...aiPricing, model: opt.model, input_per_mtok: opt.input_per_mtok, output_per_mtok: opt.output_per_mtok } });
    }
  };

  const selectedOpt = MODEL_OPTIONS.find(o => o.model === aiPricing.model);
  const estCostPerCall = selectedOpt ? ((5000 / 1_000_000) * selectedOpt.input_per_mtok + (1500 / 1_000_000) * selectedOpt.output_per_mtok).toFixed(4) : '—';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-davis-navy">系統設定</h1>
        <button onClick={handleSave} disabled={saving} className="btn-davis flex items-center gap-1 text-sm disabled:opacity-50">
          <Save size={16} />
          {saving ? '儲存中...' : '儲存'}
        </button>
      </div>

      {msg && (
        <div className={`rounded-xl p-3 mb-4 text-sm ${msg === '已儲存' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
          {msg}
        </div>
      )}

      <div className="space-y-6">
        {/* Embed whitelist */}
        <Section title="Embed 白名單" desc="允許嵌入 iframe 的網域（每行一個）">
          <textarea
            value={whitelistText}
            onChange={(e) => setWhitelistText(e.target.value)}
            rows={5}
            className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
            placeholder={"https://example.com\nhttps://another.com"}
          />
        </Section>

        {/* AI Model */}
        <Section title="AI 模型" desc="選擇分析用的 Claude 模型">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">模型</label>
              <select value={aiPricing.model} onChange={(e) => handleModelChange(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
                {MODEL_OPTIONS.map(o => (
                  <option key={o.model} value={o.model}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <div className="text-sm text-gray-500">
                <span>Input: ${aiPricing.input_per_mtok}/MTok</span>
                <span className="mx-2">·</span>
                <span>Output: ${aiPricing.output_per_mtok}/MTok</span>
                <p className="text-xs text-gray-400 mt-1">預估每次分析成本 ≈ ${estCostPerCall} USD</p>
              </div>
            </div>
          </div>
        </Section>

        {/* Site settings */}
        <Section title="網站設定">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">網站標題</label>
              <input value={String(settings.site_title || '')}
                onChange={(e) => setSettings({ ...settings, site_title: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">聯絡 Email</label>
              <input value={String(settings.contact_email || '')}
                onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>
        </Section>

        {/* Toggles */}
        <Section title="功能開關">
          <div className="space-y-3">
            <Toggle
              label="維護模式"
              desc="啟用後前台顯示維護中訊息"
              checked={Boolean(settings.maintenance_mode)}
              onChange={(v) => setSettings({ ...settings, maintenance_mode: v })}
            />
            <Toggle
              label="認證功能"
              desc="啟用美容師認證申請"
              checked={settings.certify_enabled !== false}
              onChange={(v) => setSettings({ ...settings, certify_enabled: v })}
            />
            <Toggle
              label="分享功能"
              desc="啟用結果分享連結"
              checked={settings.share_enabled !== false}
              onChange={(v) => setSettings({ ...settings, share_enabled: v })}
            />
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <h3 className="font-bold text-davis-navy mb-1">{title}</h3>
      {desc && <p className="text-xs text-gray-400 mb-3">{desc}</p>}
      {children}
    </div>
  );
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <div>
        <span className="text-sm font-medium text-davis-navy">{label}</span>
        <p className="text-xs text-gray-400">{desc}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition-colors ${checked ? 'bg-davis-blue' : 'bg-gray-200'}`}
      >
        <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </button>
    </label>
  );
}
