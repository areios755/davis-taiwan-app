import { useState, useEffect } from 'react';
import { useAuth } from './AdminApp';
import { adminApi } from '@/lib/api';
import { Plus, Pencil, Trash2, X, ChevronUp, ChevronDown } from 'lucide-react';

interface ComboStep {
  step: number;
  role: string;
  product_key: string;
  note: string;
}

interface Combo {
  id: number;
  combo_key: string;
  name: string;
  description: string;
  target_breeds: string[];
  target_needs: string;
  products: ComboStep[];
  tips: string;
  is_active: boolean;
  sort_order: number;
}

interface BreedRef { davis_breed_id: string; name: string; species: string }
interface ProductRef { product_key: string; name_zh: string; category: string }

const ROLES = ['前置處理', '清潔', '功能', '護毛素'];

const EMPTY_STEP: ComboStep = { step: 1, role: '清潔', product_key: '', note: '' };

const EMPTY_COMBO: Omit<Combo, 'id'> = {
  combo_key: '', name: '', description: '',
  target_breeds: [], target_needs: '',
  products: [{ ...EMPTY_STEP }],
  tips: '', is_active: true, sort_order: 0,
};

export default function ComboManager() {
  const { token, role } = useAuth();
  const canEdit = role === 'admin' || role === 'editor';
  const [combos, setCombos] = useState<Combo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<(Combo | Omit<Combo, 'id'>) | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const [breeds, setBreeds] = useState<BreedRef[]>([]);
  const [products, setProducts] = useState<ProductRef[]>([]);
  const [breedSearch, setBreedSearch] = useState('');

  const load = () => {
    setLoading(true);
    adminApi.getCombos(token).then(res => {
      if (res.success && res.data) setCombos(res.data.combos as unknown as Combo[]);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
    adminApi.getBreeds(token).then(res => {
      if (res.success && res.data) {
        setBreeds((res.data.breeds as unknown as BreedRef[]).filter(b => b.davis_breed_id));
      }
    });
    adminApi.getProducts(token).then(res => {
      if (res.success && res.data) {
        setProducts(res.data.products as unknown as ProductRef[]);
      }
    });
  }, [token]);

  const openEdit = (c: Combo) => { setEditing({ ...c, products: c.products?.map(s => ({ ...s })) || [] }); setMsg(''); setBreedSearch(''); };
  const openCreate = () => { setEditing({ ...EMPTY_COMBO, products: [{ ...EMPTY_STEP }] }); setMsg(''); setBreedSearch(''); };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.name.trim()) { setMsg('名稱必填'); return; }
    setSaving(true);
    setMsg('');

    const numberedProducts = editing.products.map((s, i) => ({ ...s, step: i + 1 }));
    const payload = { ...editing, products: numberedProducts };

    let res;
    if ('id' in editing && editing.id) {
      res = await adminApi.updateCombo(token, editing.id, payload as unknown as Record<string, unknown>);
    } else {
      res = await adminApi.createCombo(token, payload as unknown as Record<string, unknown>);
    }

    setSaving(false);
    if (res.success) { setEditing(null); load(); }
    else setMsg(res.error || '儲存失敗');
  };

  const handleDelete = async (c: Combo) => {
    if (!confirm(`確定刪除「${c.name}」？`)) return;
    await adminApi.deleteCombo(token, c.id);
    load();
  };

  // Step management
  const addStep = () => {
    if (!editing) return;
    setEditing({ ...editing, products: [...editing.products, { step: editing.products.length + 1, role: '功能', product_key: '', note: '' }] });
  };
  const removeStep = (idx: number) => {
    if (!editing || editing.products.length <= 1) return;
    setEditing({ ...editing, products: editing.products.filter((_, i) => i !== idx) });
  };
  const moveStep = (idx: number, dir: -1 | 1) => {
    if (!editing) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= editing.products.length) return;
    const arr = [...editing.products];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    setEditing({ ...editing, products: arr });
  };
  const updateStep = (idx: number, field: keyof ComboStep, value: string) => {
    if (!editing) return;
    const arr = [...editing.products];
    arr[idx] = { ...arr[idx], [field]: value };
    setEditing({ ...editing, products: arr });
  };

  // Breed toggle
  const toggleBreed = (breedId: string) => {
    if (!editing) return;
    const current = editing.target_breeds;
    setEditing({
      ...editing,
      target_breeds: current.includes(breedId)
        ? current.filter(b => b !== breedId)
        : [...current, breedId],
    });
  };

  const filteredBreeds = breeds.filter(b => {
    if (!breedSearch) return true;
    const q = breedSearch.toLowerCase();
    return b.name.toLowerCase().includes(q) || b.davis_breed_id.toLowerCase().includes(q);
  });

  const getBreedName = (id: string) => breeds.find(b => b.davis_breed_id === id)?.name || id;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-davis-navy">組合推薦</h1>
        {canEdit && (
          <button onClick={openCreate} className="btn-davis flex items-center gap-1 text-sm">
            <Plus size={16} /> 新增組合
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-12">載入中...</p>
      ) : (
        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="px-4 py-3 font-medium">名稱</th>
                <th className="px-4 py-3 font-medium">適用品種</th>
                <th className="px-4 py-3 font-medium w-16">步驟</th>
                <th className="px-4 py-3 font-medium w-16">狀態</th>
                <th className="px-4 py-3 font-medium w-20">操作</th>
              </tr>
            </thead>
            <tbody>
              {combos.map(c => (
                <tr key={c.id} className={`border-b hover:bg-gray-50 ${canEdit ? 'cursor-pointer' : ''}`}
                  onClick={() => canEdit && openEdit(c)}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-davis-navy">{c.name}</p>
                    <p className="text-xs text-gray-400 line-clamp-1">{c.description}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(!c.target_breeds || c.target_breeds.length === 0) ? (
                        <span className="text-xs text-gray-400">通用</span>
                      ) : c.target_breeds.slice(0, 3).map(b => (
                        <span key={b} className="bg-davis-light text-davis-blue text-xs px-2 py-0.5 rounded-full">{getBreedName(b)}</span>
                      ))}
                      {c.target_breeds && c.target_breeds.length > 3 && (
                        <span className="text-xs text-gray-400">+{c.target_breeds.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">{c.products?.length || 0}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${c.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                      {c.is_active ? '啟用' : '停用'}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    {canEdit && (
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(c)} className="p-1 text-gray-400 hover:text-davis-blue"><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(c)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {combos.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">尚無組合，點擊「新增組合」開始</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit / Create Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-davis-navy">
                {'id' in editing && editing.id ? '編輯組合' : '新增組合'}
              </h2>
              <button onClick={() => setEditing(null)}><X size={20} className="text-gray-400" /></button>
            </div>

            <div className="space-y-4">
              {/* Basic fields */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="組合 Key" value={editing.combo_key}
                  onChange={v => setEditing({ ...editing, combo_key: v })} placeholder="如 fluffy_styling" />
                <Field label="名稱 *" value={editing.name}
                  onChange={v => setEditing({ ...editing, name: v })} placeholder="如 蓬鬆造型組合" />
              </div>
              <Field label="描述" value={editing.description}
                onChange={v => setEditing({ ...editing, description: v })} />
              <Field label="適用需求" value={editing.target_needs}
                onChange={v => setEditing({ ...editing, target_needs: v })} placeholder="如 需要毛根立體的品種" />

              {/* Target breeds */}
              <div>
                <label className="text-xs text-gray-500 block mb-1">適用品種</label>
                {editing.target_breeds.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {editing.target_breeds.map(b => (
                      <span key={b} className="inline-flex items-center gap-1 bg-davis-light text-davis-blue text-xs px-2 py-1 rounded-full">
                        {getBreedName(b)}
                        <button onClick={() => toggleBreed(b)} className="hover:text-red-500"><X size={12} /></button>
                      </span>
                    ))}
                  </div>
                )}
                <input value={breedSearch} onChange={e => setBreedSearch(e.target.value)}
                  placeholder="搜尋品種..." className="w-full px-3 py-1.5 border rounded-lg text-sm mb-2" />
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                  {filteredBreeds.slice(0, 40).map(b => (
                    <button key={b.davis_breed_id} onClick={() => toggleBreed(b.davis_breed_id)}
                      className={`text-xs px-2 py-1 rounded-full transition-colors ${
                        editing.target_breeds.includes(b.davis_breed_id)
                          ? 'bg-davis-blue text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {b.name}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">不選品種 = 通用組合（所有品種適用）</p>
              </div>

              {/* Steps editor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-500 font-medium">洗護步驟</label>
                  <button onClick={addStep} className="text-xs text-davis-blue hover:underline flex items-center gap-1">
                    <Plus size={12} /> 新增步驟
                  </button>
                </div>
                <div className="space-y-2">
                  {editing.products.map((step, idx) => (
                    <div key={idx} className="border rounded-lg p-3 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-davis-navy">Step {idx + 1}</span>
                        <div className="flex gap-1">
                          <button onClick={() => moveStep(idx, -1)} disabled={idx === 0}
                            className="p-1 text-gray-400 hover:text-davis-blue disabled:opacity-30"><ChevronUp size={14} /></button>
                          <button onClick={() => moveStep(idx, 1)} disabled={idx === editing.products.length - 1}
                            className="p-1 text-gray-400 hover:text-davis-blue disabled:opacity-30"><ChevronDown size={14} /></button>
                          <button onClick={() => removeStep(idx)}
                            className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-400 block mb-0.5">角色</label>
                          <select value={step.role} onChange={e => updateStep(idx, 'role', e.target.value)}
                            className="w-full px-2 py-1.5 border rounded-lg text-sm bg-white">
                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 block mb-0.5">產品</label>
                          <select value={step.product_key} onChange={e => updateStep(idx, 'product_key', e.target.value)}
                            className="w-full px-2 py-1.5 border rounded-lg text-sm bg-white">
                            <option value="">-- 選擇產品 --</option>
                            {products.map(p => <option key={p.product_key} value={p.product_key}>{p.name_zh}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="mt-2">
                        <label className="text-xs text-gray-400 block mb-0.5">備註</label>
                        <input value={step.note} onChange={e => updateStep(idx, 'note', e.target.value)}
                          className="w-full px-2 py-1.5 border rounded-lg text-sm" placeholder="如：洗護頻率>20天用" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tips */}
              <Field label="專業提示 Tips" value={editing.tips}
                onChange={v => setEditing({ ...editing, tips: v })} />

              {/* Active toggle + sort order */}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <button type="button" onClick={() => setEditing({ ...editing, is_active: !editing.is_active })}
                    className={`relative w-10 h-6 rounded-full transition-colors ${editing.is_active ? 'bg-davis-blue' : 'bg-gray-200'}`}>
                    <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${editing.is_active ? 'translate-x-4' : ''}`} />
                  </button>
                  <span className="text-sm">{editing.is_active ? '啟用中' : '已停用'}</span>
                </label>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500">排序</label>
                  <input type="number" value={editing.sort_order}
                    onChange={e => setEditing({ ...editing, sort_order: parseInt(e.target.value) || 0 })}
                    className="w-16 px-2 py-1 border rounded-lg text-sm" />
                </div>
              </div>
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
      <input value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-davis-blue/30" />
    </div>
  );
}
