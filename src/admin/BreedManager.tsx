import { useState, useEffect, useRef } from 'react';
import { useAuth } from './AdminApp';
import { adminApi } from '@/lib/api';
import { Pencil, X, Info, Plus, Trash2, Download, Upload, FileSpreadsheet } from 'lucide-react';
import { exportExcel, downloadTemplate, parseExcel } from '@/lib/excel';

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

const EMPTY_BREED: Omit<Breed, 'id'> = {
  name: '',
  name_en: '',
  name_ja: '',
  name_cn: '',
  species: 'dog',
  size_range: '',
  weight_range: '',
  coat_types: [],
  davis_breed_id: '',
  davis_product_keys: [],
  coat_characteristics: '',
  grooming_tips: '',
  seasonal_notes: '',
  emoji: '',
  is_active: true,
};

const EXPORT_COLUMNS = [
  'name', 'name_en', 'name_cn', 'name_ja', 'species',
  'coat_types', 'emoji', 'davis_breed_id', 'davis_product_keys',
  'coat_characteristics',
];

export default function BreedManager() {
  const { token, role } = useAuth();
  const canEdit = role === 'admin' || role === 'editor';
  const [breeds, setBreeds] = useState<Breed[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Breed | null>(null);
  const [creating, setCreating] = useState<Omit<Breed, 'id'> | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [filter, setFilter] = useState<'all' | 'dog' | 'cat'>('all');
  const [deleting, setDeleting] = useState<Breed | null>(null);

  // Import state
  const fileRef = useRef<HTMLInputElement>(null);
  const [importRows, setImportRows] = useState<Record<string, unknown>[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');

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

  const handleCreate = async () => {
    if (!creating) return;
    if (!creating.name.trim()) { setMsg('品種名稱為必填'); return; }
    if (!creating.species) { setMsg('請選擇類型（犬/貓）'); return; }
    setSaving(true);
    setMsg('');
    const res = await adminApi.saveBreed(token, creating as Record<string, unknown>);
    setSaving(false);
    if (res.success) {
      setCreating(null);
      load();
    } else {
      setMsg(res.error || '新增失敗');
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const id = deleting.davis_breed_id || String(deleting.id);
    const res = await adminApi.deleteBreed(token, id);
    setDeleting(null);
    if (res.success) {
      load();
    } else {
      setMsg(res.error || '刪除失敗');
    }
  };

  const handleExport = () => {
    const date = new Date().toISOString().slice(0, 10);
    exportExcel(breeds as unknown as Record<string, unknown>[], EXPORT_COLUMNS, `davis-breeds-${date}.xlsx`);
  };

  const handleTemplate = () => {
    downloadTemplate(EXPORT_COLUMNS, 'davis-breeds-template.xlsx');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await parseExcel(file);
      // Convert comma-separated strings to arrays for coat_types and davis_product_keys
      for (const row of rows) {
        if (typeof row.coat_types === 'string') {
          row.coat_types = (row.coat_types as string).split(',').map(s => s.trim()).filter(Boolean);
        }
        if (typeof row.davis_product_keys === 'string') {
          row.davis_product_keys = (row.davis_product_keys as string).split(',').map(s => s.trim()).filter(Boolean);
        }
      }
      setImportRows(rows);
      setImportMsg('');
    } catch {
      setImportMsg('Excel 檔案解析失敗');
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const existingNames = new Set(breeds.map(b => b.name));
  const existingBreedIds = new Set(breeds.filter(b => b.davis_breed_id).map(b => b.davis_breed_id));

  const handleImport = async () => {
    if (!importRows) return;
    setImporting(true);
    setImportMsg('');
    const res = await adminApi.importBreeds(token, importRows);
    setImporting(false);
    if (res.success && res.data) {
      setImportMsg(`匯入完成: 成功 ${res.data.ok} / 失敗 ${res.data.fail} / 共 ${res.data.total}`);
      setImportRows(null);
      load();
    } else {
      setImportMsg(res.error || '匯入失敗');
    }
  };

  const filtered = filter === 'all' ? breeds : breeds.filter((b) => b.species === filter);

  // Shared form fields renderer
  const renderForm = (data: Omit<Breed, 'id'>, setData: (d: Omit<Breed, 'id'>) => void) => (
    <div className="space-y-3">
      <p className="text-xs text-davis-blue font-medium">基本資料</p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">品種名稱（繁中）<span className="text-red-400">*</span></label>
          <input value={data.name || ''} onChange={(e) => setData({ ...data, name: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">English Name</label>
          <input value={data.name_en || ''} onChange={(e) => setData({ ...data, name_en: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">日文名</label>
          <input value={data.name_ja || ''} onChange={(e) => setData({ ...data, name_ja: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">簡中名</label>
          <input value={data.name_cn || ''} onChange={(e) => setData({ ...data, name_cn: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Species <span className="text-red-400">*</span></label>
          <select value={data.species || 'dog'} onChange={(e) => setData({ ...data, species: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm">
            <option value="dog">犬</option>
            <option value="cat">貓</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">體型</label>
          <input value={data.size_range || ''} onChange={(e) => setData({ ...data, size_range: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="小型 / 中型 / 大型" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">體重範圍</label>
          <input value={data.weight_range || ''} onChange={(e) => setData({ ...data, weight_range: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="3-6kg" />
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500 block mb-1">毛質類型（逗號分隔）</label>
        <input
          value={(data.coat_types || []).join(', ')}
          onChange={(e) => setData({ ...data, coat_types: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
          className="w-full px-3 py-2 border rounded-lg text-sm"
          placeholder="捲毛, 長毛"
        />
      </div>

      <div className="border-t pt-3 mt-3">
        <p className="text-xs text-davis-blue font-medium mb-3">Davis 洗護欄位</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Davis Breed ID</label>
          <input value={data.davis_breed_id || ''} onChange={(e) => setData({ ...data, davis_breed_id: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm font-mono" placeholder="e.g. poodle" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Emoji</label>
          <input value={data.emoji || ''} onChange={(e) => setData({ ...data, emoji: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500 block mb-1">Product Keys（逗號分隔）</label>
        <input
          value={(data.davis_product_keys || []).join(', ')}
          onChange={(e) => setData({ ...data, davis_product_keys: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
          className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
          placeholder="heavy_duty_clean, detangling"
        />
      </div>

      <div>
        <label className="text-xs text-gray-500 block mb-1">毛質特徵</label>
        <textarea value={data.coat_characteristics || ''} onChange={(e) => setData({ ...data, coat_characteristics: e.target.value })}
          rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" />
      </div>

      <div>
        <label className="text-xs text-gray-500 block mb-1">美容技巧</label>
        <textarea value={data.grooming_tips || ''} onChange={(e) => setData({ ...data, grooming_tips: e.target.value })}
          rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" />
      </div>

      <div>
        <label className="text-xs text-gray-500 block mb-1">季節注意</label>
        <textarea value={data.seasonal_notes || ''} onChange={(e) => setData({ ...data, seasonal_notes: e.target.value })}
          rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={data.is_active !== false}
          onChange={(e) => setData({ ...data, is_active: e.target.checked })}
          className="rounded" />
        啟用此品種
      </label>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-davis-navy">品種管理</h1>
        <div className="flex gap-2 items-center flex-wrap">
          {(['all', 'dog', 'cat'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs ${filter === f ? 'bg-davis-blue text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              {f === 'all' ? '全部' : f === 'dog' ? '狗' : '貓'}
            </button>
          ))}
          <button onClick={handleExport} className="flex items-center gap-1 px-3 py-1.5 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            <Download size={14} /> 匯出
          </button>
          <button onClick={handleTemplate} className="flex items-center gap-1 px-3 py-1.5 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            <FileSpreadsheet size={14} /> 範本
          </button>
          {canEdit && (
            <>
              <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1 px-3 py-1.5 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                <Upload size={14} /> 匯入
              </button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFileSelect} className="hidden" />
              <button
                onClick={() => { setCreating({ ...EMPTY_BREED }); setMsg(''); }}
                className="text-sm flex items-center gap-1 px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#D4A843' }}
              >
                <Plus size={16} /> 新增品種
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-sm flex items-center gap-2">
        <Info size={16} className="text-blue-500 shrink-0" />
        <span className="text-blue-700">
          品種資料與毛安住共用，修改將同步影響兩個系統。
        </span>
      </div>

      {importMsg && <p className={`text-sm mb-3 ${importMsg.includes('失敗') ? 'text-red-500' : 'text-green-600'}`}>{importMsg}</p>}
      {msg && !editing && !creating && <p className="text-red-500 text-sm mb-3">{msg}</p>}

      {/* Import Preview Modal */}
      {importRows && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setImportRows(null)}>
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-davis-navy">匯入預覽 ({importRows.length} 筆)</h2>
              <button onClick={() => setImportRows(null)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-2 py-2 text-left">狀態</th>
                    <th className="px-2 py-2 text-left">name</th>
                    <th className="px-2 py-2 text-left">species</th>
                    <th className="px-2 py-2 text-left">davis_breed_id</th>
                  </tr>
                </thead>
                <tbody>
                  {importRows.map((row, i) => {
                    const name = String(row.name || '');
                    const bid = String(row.davis_breed_id || '');
                    const isExisting = (bid && existingBreedIds.has(bid)) || existingNames.has(name);
                    return (
                      <tr key={i} className="border-b">
                        <td className="px-2 py-1.5">
                          {!name ? <span className="text-gray-400">略過</span>
                            : isExisting ? <span className="text-blue-600 font-medium">更新</span>
                            : <span className="text-green-600 font-medium">新增</span>}
                        </td>
                        <td className="px-2 py-1.5">{name || '—'}</td>
                        <td className="px-2 py-1.5">{String(row.species || '')}</td>
                        <td className="px-2 py-1.5 font-mono">{bid || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {importMsg && <p className="text-red-500 text-sm mt-3">{importMsg}</p>}
            <div className="flex gap-3 mt-4">
              <button onClick={() => setImportRows(null)} className="btn-davis-outline flex-1">取消</button>
              <button onClick={handleImport} disabled={importing} className="btn-davis flex-1 disabled:opacity-50">
                {importing ? '匯入中...' : '確認匯入'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                <th className="px-4 py-3 font-medium w-24">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id} className="border-b hover:bg-gray-50">
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
                    {canEdit && (
                      <div className="flex gap-1">
                        <button onClick={() => setEditing({ ...b })} className="p-1 text-gray-400 hover:text-davis-blue" title="編輯">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setDeleting(b)} className="p-1 text-gray-400 hover:text-red-500" title="刪除">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {creating && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setCreating(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-davis-navy">新增品種</h2>
              <button onClick={() => setCreating(null)}><X size={20} className="text-gray-400" /></button>
            </div>

            {renderForm(creating, (d) => setCreating(d))}

            {msg && <p className="text-red-500 text-sm mt-3">{msg}</p>}

            <div className="flex gap-3 mt-6">
              <button onClick={() => setCreating(null)} className="btn-davis-outline flex-1">取消</button>
              <button onClick={handleCreate} disabled={saving} className="btn-davis flex-1 disabled:opacity-50">
                {saving ? '新增中...' : '新增'}
              </button>
            </div>
          </div>
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

            {renderForm(editing, (d) => setEditing(d as Breed))}

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

      {/* Delete Confirmation Modal */}
      {deleting && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setDeleting(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-davis-navy mb-2">確認刪除</h2>
            <p className="text-sm text-gray-600 mb-4">
              確定要刪除品種「{deleting.emoji} {deleting.name}」嗎？此操作無法復原。
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleting(null)} className="btn-davis-outline flex-1">取消</button>
              <button onClick={handleDelete} className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600">
                刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
