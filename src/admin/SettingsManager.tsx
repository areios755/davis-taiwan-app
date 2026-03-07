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

  const aiPricing = (settings.ai_pricing || { model: 'claude-sonnet-4-5-20250929', input_per_mtok: 3, output_per_mtok: 15, currency: 'USD' }) as {
    model: string; input_per_mtok: number; output_per_mtok: number; currency: string;
  };

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

        {/* AI Pricing */}
        <Section title="AI 定價" desc="用於成本計算（Sonnet 4.5 預設）">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Model</label>
              <input value={aiPricing.model} onChange={(e) => setSettings({ ...settings, ai_pricing: { ...aiPricing, model: e.target.value } })}
                className="w-full px-3 py-2 border rounded-lg text-sm font-mono" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Input $/MTok</label>
              <input type="number" step="0.1" value={aiPricing.input_per_mtok}
                onChange={(e) => setSettings({ ...settings, ai_pricing: { ...aiPricing, input_per_mtok: Number(e.target.value) } })}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Output $/MTok</label>
              <input type="number" step="0.1" value={aiPricing.output_per_mtok}
                onChange={(e) => setSettings({ ...settings, ai_pricing: { ...aiPricing, output_per_mtok: Number(e.target.value) } })}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Currency</label>
              <input value={aiPricing.currency} onChange={(e) => setSettings({ ...settings, ai_pricing: { ...aiPricing, currency: e.target.value } })}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
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
