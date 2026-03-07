import { useState, useEffect } from 'react';
import { useAuth } from './AdminApp';
import { adminApi } from '@/lib/api';
import { Pencil, X, Info } from 'lucide-react';

interface Breed {
  id: number;
  name: string;
  name_en: string;
  name_ja: string;
  name_cn: string;
  species: string;
  size_range: string;
  weight_range: string;
  coat_types: string[];
  davis_breed_id: string;
  davis_product_keys: string[];
  coat_characteristics: string;
  grooming_tips: string;
  seasonal_notes: string;
  emoji: string;
  is_active: boolean;
}

export default function BreedManager() {
  const { token } = useAuth();
  const [breeds, setBreeds] = useState<Breed[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Breed | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [filter, setFilter] = useState<'all' | 'dog' | 'cat'>('all');

  const load = () => {
    setLoading(true);
    adminApi.getBreeds(token).then((res) => {
      if (res.success && res.data) setBreeds(res.data.breeds as unknown as Breed[]);
      setLoading(false);
    });
  };

  useEffect(load, [token]);

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    setMsg('');
    const payload = {
      name: editing.name,
      name_en: editing.name_en,
      name_ja: editing.name_ja,
      name_cn: editing.name_cn,
      species: editing.species,
      size_range: editing.size_range,
      weight_range: editing.weight_range,
      coat_types: editing.coat_types,
      davis_breed_id: editing.davis_breed_id,
      davis_product_keys: editing.davis_product_keys,
      coat_characteristics: editing.coat_characteristics,
      grooming_tips: editing.grooming_tips,
      seasonal_notes: editing.seasonal_notes,
      emoji: editing.emoji,
      is_active: editing.is_active,
    };
    const res = await adminApi.saveBreed(token, payload);
    setSaving(false);
    if (res.success) {
      setEditing(null);
      load();
    } else {
      setMsg(res.error || '儲存失敗');
    }
  };

  const filtered = filter === 'all' ? breeds : breeds.filter((b) => b.species === filter);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-davis-navy">品種管理</h1>
        <div className="flex gap-2">
          {(['all', 'dog', 'cat'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs ${filter === f ? 'bg-davis-blue text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              {f === 'all' ? '全部' : f === 'dog' ? '狗' : '貓'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-sm flex items-center gap-2">
        <Info size={16} className="text-blue-500 shrink-0" />
        <span className="text-blue-700">
          品種資料與毛安住共用，修改將同步影響兩個系統。
        </span>
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-12">載入中...</p>
      ) : (
        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="px-4 py-3 font-medium">品種</th>
                <th className="px-4 py-3 font-medium">類型</th>
                <th className="px-4 py-3 font-medium">Davis ID</th>
                <th className="px-4 py-3 font-medium">配方</th>
                <th className="px-4 py-3 font-medium w-16">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => setEditing({ ...b })}>
                  <td className="px-4 py-3">
                    <span>{b.emoji || ''} {b.name}</span>
                    <span className="text-xs text-gray-400 ml-1">({b.name_en})</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${b.species === 'dog' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                      {b.species === 'dog' ? '犬' : '貓'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{b.davis_breed_id || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{(b.davis_product_keys || []).join(', ') || '—'}</td>
                  <td className="px-4 py-3">
                    <button className="p-1 text-gray-400 hover:text-davis-blue"><Pencil size={14} /></button>
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
                {editing.emoji} {editing.name} ({editing.name_en})
              </h2>
              <button onClick={() => setEditing(null)}><X size={20} className="text-gray-400" /></button>
            </div>

            <div className="space-y-3">
              {/* Basic info */}
              <p className="text-xs text-davis-blue font-medium">基本資料</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">品種名稱（繁中）</label>
                  <input value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">English Name</label>
                  <input value={editing.name_en || ''} onChange={(e) => setEditing({ ...editing, name_en: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">日文名</label>
                  <input value={editing.name_ja || ''} onChange={(e) => setEditing({ ...editing, name_ja: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">簡中名</label>
                  <input value={editing.name_cn || ''} onChange={(e) => setEditing({ ...editing, name_cn: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Species</label>
                  <select value={editing.species || 'dog'} onChange={(e) => setEditing({ ...editing, species: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="dog">犬</option>
                    <option value="cat">貓</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">體型</label>
                  <input value={editing.size_range || ''} onChange={(e) => setEditing({ ...editing, size_range: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="小型 / 中型 / 大型" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">體重範圍</label>
                  <input value={editing.weight_range || ''} onChange={(e) => setEditing({ ...editing, weight_range: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="3-6kg" />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">毛質類型（逗號分隔）</label>
                <input
                  value={(editing.coat_types || []).join(', ')}
                  onChange={(e) => setEditing({ ...editing, coat_types: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="捲毛, 長毛"
                />
              </div>

              {/* Davis fields */}
              <div className="border-t pt-3 mt-3">
                <p className="text-xs text-davis-blue font-medium mb-3">Davis 洗護欄位</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Davis Breed ID</label>
                  <input value={editing.davis_breed_id || ''} onChange={(e) => setEditing({ ...editing, davis_breed_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-mono" placeholder="e.g. poodle" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Emoji</label>
                  <input value={editing.emoji || ''} onChange={(e) => setEditing({ ...editing, emoji: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Product Keys（逗號分隔）</label>
                <input
                  value={(editing.davis_product_keys || []).join(', ')}
                  onChange={(e) => setEditing({ ...editing, davis_product_keys: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                  className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                  placeholder="heavy_duty_clean, detangling"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">毛質特徵</label>
                <textarea value={editing.coat_characteristics || ''} onChange={(e) => setEditing({ ...editing, coat_characteristics: e.target.value })}
                  rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">美容技巧</label>
                <textarea value={editing.grooming_tips || ''} onChange={(e) => setEditing({ ...editing, grooming_tips: e.target.value })}
                  rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">季節注意</label>
                <textarea value={editing.seasonal_notes || ''} onChange={(e) => setEditing({ ...editing, seasonal_notes: e.target.value })}
                  rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editing.is_active !== false}
                  onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                  className="rounded" />
                啟用此品種
              </label>
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
