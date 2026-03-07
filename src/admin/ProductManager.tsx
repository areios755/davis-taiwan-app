import { useState, useEffect } from 'react';
import { useAuth } from './AdminApp';
import { adminApi } from '@/lib/api';
import { Plus, Pencil, Trash2, X } from 'lucide-react';

interface Product {
  product_key: string;
  name_zh: string;
  name_en: string;
  name_ja: string;
  name_cn: string;
  category: string;
  tag_zh: string;
  tag_en: string;
  tag_ja: string;
  tag_cn: string;
  reason_zh: string;
  reason_en: string;
  reason_ja: string;
  reason_cn: string;
  note_zh: string;
  note_en: string;
  note_ja: string;
  note_cn: string;
  dilution: string;
  dwell_time: string;
}

const EMPTY_PRODUCT: Product = {
  product_key: '', name_zh: '', name_en: '', name_ja: '', name_cn: '',
  category: 'shampoo',
  tag_zh: '', tag_en: '', tag_ja: '', tag_cn: '',
  reason_zh: '', reason_en: '', reason_ja: '', reason_cn: '',
  note_zh: '', note_en: '', note_ja: '', note_cn: '',
  dilution: '', dwell_time: '',
};

const CATEGORIES = ['shampoo', 'conditioner', 'spa', 'specialty'];
const CAT_LABELS: Record<string, string> = { shampoo: '洗劑', conditioner: '護毛素', spa: 'SPA', specialty: '特殊護理' };

export default function ProductManager() {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = () => {
    setLoading(true);
    adminApi.getProducts(token).then((res) => {
      if (res.success && res.data) setProducts(res.data.products as unknown as Product[]);
      setLoading(false);
    });
  };

  useEffect(load, [token]);

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.product_key.trim()) { setMsg('product_key 必填'); return; }
    setSaving(true);
    setMsg('');
    const res = await adminApi.saveProduct(token, editing as unknown as Record<string, unknown>);
    setSaving(false);
    if (res.success) {
      setEditing(null);
      load();
    } else {
      setMsg(res.error || '儲存失敗');
    }
  };

  const handleDelete = async (key: string) => {
    if (!confirm(`確定刪除 ${key}？`)) return;
    await adminApi.deleteProduct(token, key);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-davis-navy">產品管理</h1>
        <button onClick={() => setEditing({ ...EMPTY_PRODUCT })} className="btn-davis flex items-center gap-1 text-sm">
          <Plus size={16} /> 新增
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-12">載入中...</p>
      ) : (
        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="px-4 py-3 font-medium">Key</th>
                <th className="px-4 py-3 font-medium">名稱 (中)</th>
                <th className="px-4 py-3 font-medium">分類</th>
                <th className="px-4 py-3 font-medium">稀釋</th>
                <th className="px-4 py-3 font-medium w-20">操作</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.product_key} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => setEditing({ ...p })}>
                  <td className="px-4 py-3 font-mono text-xs">{p.product_key}</td>
                  <td className="px-4 py-3">{p.name_zh}</td>
                  <td className="px-4 py-3"><span className="bg-davis-light text-davis-blue text-xs px-2 py-0.5 rounded-full">{CAT_LABELS[p.category] || p.category}</span></td>
                  <td className="px-4 py-3 text-gray-500">{p.dilution}</td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <button onClick={() => setEditing({ ...p })} className="p-1 text-gray-400 hover:text-davis-blue"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(p.product_key)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-davis-navy">
                {editing.product_key ? '編輯產品' : '新增產品'}
              </h2>
              <button onClick={() => setEditing(null)}><X size={20} className="text-gray-400" /></button>
            </div>

            <div className="space-y-3">
              <Field label="Product Key" value={editing.product_key} onChange={(v) => setEditing({ ...editing, product_key: v })} placeholder="e.g. heavy_duty_clean" />

              <div className="grid grid-cols-2 gap-3">
                <Field label="名稱 (繁中)" value={editing.name_zh} onChange={(v) => setEditing({ ...editing, name_zh: v })} />
                <Field label="Name (EN)" value={editing.name_en} onChange={(v) => setEditing({ ...editing, name_en: v })} />
                <Field label="名前 (JA)" value={editing.name_ja} onChange={(v) => setEditing({ ...editing, name_ja: v })} />
                <Field label="名称 (简中)" value={editing.name_cn} onChange={(v) => setEditing({ ...editing, name_cn: v })} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">分類</label>
                  <select value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
                  </select>
                </div>
                <Field label="稀釋比例" value={editing.dilution} onChange={(v) => setEditing({ ...editing, dilution: v })} placeholder="10:1" />
                <Field label="停留時間" value={editing.dwell_time} onChange={(v) => setEditing({ ...editing, dwell_time: v })} placeholder="3-5min" />
              </div>

              <hr />
              <p className="text-xs text-gray-400 font-medium">適用標籤</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tag (繁中)" value={editing.tag_zh} onChange={(v) => setEditing({ ...editing, tag_zh: v })} />
                <Field label="Tag (EN)" value={editing.tag_en} onChange={(v) => setEditing({ ...editing, tag_en: v })} />
                <Field label="Tag (JA)" value={editing.tag_ja} onChange={(v) => setEditing({ ...editing, tag_ja: v })} />
                <Field label="Tag (简中)" value={editing.tag_cn} onChange={(v) => setEditing({ ...editing, tag_cn: v })} />
              </div>

              <hr />
              <p className="text-xs text-gray-400 font-medium">推薦理由</p>
              <AreaField label="理由 (繁中)" value={editing.reason_zh} onChange={(v) => setEditing({ ...editing, reason_zh: v })} />
              <AreaField label="Reason (EN)" value={editing.reason_en} onChange={(v) => setEditing({ ...editing, reason_en: v })} />

              <hr />
              <p className="text-xs text-gray-400 font-medium">注意事項</p>
              <AreaField label="注意 (繁中)" value={editing.note_zh} onChange={(v) => setEditing({ ...editing, note_zh: v })} />
              <AreaField label="Note (EN)" value={editing.note_en} onChange={(v) => setEditing({ ...editing, note_en: v })} />
            </div>

            {msg && <p className="text-red-500 text-sm mt-3">{msg}</p>}

            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditing(null)} className="btn-davis-outline flex-1">取消</button>
              <button onClick={handleSave} disabled={saving} className="btn-davis flex-1 disabled:opacity-50">
                {saving ? '儲存中...' : '儲存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs text-gray-500 block mb-1">{label}</label>
      <input value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-davis-blue/30" />
    </div>
  );
}

function AreaField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs text-gray-500 block mb-1">{label}</label>
      <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} rows={2}
        className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-davis-blue/30" />
    </div>
  );
}
