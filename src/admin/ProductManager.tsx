import { useState, useEffect, useRef } from 'react';
import { useAuth } from './AdminApp';
import { adminApi } from '@/lib/api';
import { Plus, Pencil, Trash2, X, Download, Upload, FileSpreadsheet, Camera } from 'lucide-react';
import { exportExcel, downloadTemplate, parseExcel } from '@/lib/excel';
import { compressProductImage, formatFileSize } from '@/lib/image-compressor';
import { getProductImageSrc } from '@/lib/product-image';

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
  image_url?: string;
  image_data?: string;
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

const EXPORT_COLUMNS = [
  'product_key', 'name_zh', 'name_en', 'name_cn', 'name_ja',
  'category', 'dilution', 'dwell_time',
  'tag_zh', 'reason_zh', 'note_zh',
];

export default function ProductManager() {
  const { token, role } = useAuth();
  const canEdit = role === 'admin' || role === 'editor';
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // Image upload state
  const imgRef = useRef<HTMLInputElement>(null);
  const [imgPreview, setImgPreview] = useState<string | null>(null);
  const [imgBase64, setImgBase64] = useState<string | null>(null);
  const [imgInfo, setImgInfo] = useState<{ original: number; compressed: number } | null>(null);
  const [uploadingImg, setUploadingImg] = useState(false);

  // Import state
  const fileRef = useRef<HTMLInputElement>(null);
  const [importRows, setImportRows] = useState<Record<string, unknown>[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');

  const load = () => {
    setLoading(true);
    adminApi.getProducts(token).then((res) => {
      if (res.success && res.data) setProducts(res.data.products as unknown as Product[]);
      setLoading(false);
    });
  };

  useEffect(load, [token]);

  const resetImgState = () => {
    setImgPreview(null);
    setImgBase64(null);
    setImgInfo(null);
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.product_key.trim()) { setMsg('product_key 必填'); return; }
    setSaving(true);
    setMsg('');

    // Save product data (without image_data — that goes separately)
    const payload = { ...editing };
    delete (payload as Record<string, unknown>).image_data;
    const res = await adminApi.saveProduct(token, payload as unknown as Record<string, unknown>);

    if (res.success && imgBase64 && editing.product_key) {
      // Upload image
      setUploadingImg(true);
      const imgRes = await adminApi.uploadProductImage(token, editing.product_key, imgBase64);
      setUploadingImg(false);
      if (!imgRes.success) {
        setMsg(imgRes.error || '圖片上傳失敗');
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    if (res.success) {
      setEditing(null);
      resetImgState();
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

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await compressProductImage(file);
      setImgBase64(result.base64);
      setImgPreview(`data:image/jpeg;base64,${result.base64}`);
      setImgInfo({ original: result.originalSize, compressed: result.compressedSize });
    } catch {
      setMsg('圖片處理失敗');
    }
    if (imgRef.current) imgRef.current.value = '';
  };

  const handleExport = () => {
    const date = new Date().toISOString().slice(0, 10);
    exportExcel(products as unknown as Record<string, unknown>[], EXPORT_COLUMNS, `davis-products-${date}.xlsx`);
  };

  const handleTemplate = () => {
    downloadTemplate(EXPORT_COLUMNS, 'davis-products-template.xlsx');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await parseExcel(file);
      setImportRows(rows);
      setImportMsg('');
    } catch {
      setImportMsg('Excel 檔案解析失敗');
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const existingKeys = new Set(products.map(p => p.product_key));

  const handleImport = async () => {
    if (!importRows) return;
    setImporting(true);
    setImportMsg('');
    const res = await adminApi.importProducts(token, importRows);
    setImporting(false);
    if (res.success && res.data) {
      setImportMsg(`匯入完成: 成功 ${res.data.ok} / 失敗 ${res.data.fail} / 共 ${res.data.total}`);
      setImportRows(null);
      load();
    } else {
      setImportMsg(res.error || '匯入失敗');
    }
  };

  const openEdit = (p: Product) => {
    setEditing({ ...p });
    resetImgState();
    setMsg('');
  };

  // Current image to display in modal
  const currentImgSrc = imgPreview || (editing ? getProductImageSrc(editing) : null);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-davis-navy">產品管理</h1>
        <div className="flex gap-2 items-center flex-wrap">
          <button onClick={handleExport} className="flex items-center gap-1 px-3 py-1.5 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            <Download size={14} /> 匯出 Excel
          </button>
          <button onClick={handleTemplate} className="flex items-center gap-1 px-3 py-1.5 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            <FileSpreadsheet size={14} /> 下載範本
          </button>
          {canEdit && (
            <>
              <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1 px-3 py-1.5 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                <Upload size={14} /> 匯入 Excel
              </button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFileSelect} className="hidden" />
              <button onClick={() => { setEditing({ ...EMPTY_PRODUCT }); resetImgState(); setMsg(''); }} className="btn-davis flex items-center gap-1 text-sm">
                <Plus size={16} /> 新增
              </button>
            </>
          )}
        </div>
      </div>

      {importMsg && <p className={`text-sm mb-3 ${importMsg.includes('失敗') ? 'text-red-500' : 'text-green-600'}`}>{importMsg}</p>}

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
                    <th className="px-2 py-2 text-left">product_key</th>
                    <th className="px-2 py-2 text-left">name_zh</th>
                    <th className="px-2 py-2 text-left">category</th>
                  </tr>
                </thead>
                <tbody>
                  {importRows.map((row, i) => {
                    const key = String(row.product_key || '');
                    const isNew = key && !existingKeys.has(key);
                    const isUpdate = key && existingKeys.has(key);
                    return (
                      <tr key={i} className="border-b">
                        <td className="px-2 py-1.5">
                          {!key ? <span className="text-gray-400">略過</span>
                            : isNew ? <span className="text-green-600 font-medium">新增</span>
                            : isUpdate ? <span className="text-blue-600 font-medium">更新</span>
                            : null}
                        </td>
                        <td className="px-2 py-1.5 font-mono">{key || '—'}</td>
                        <td className="px-2 py-1.5">{String(row.name_zh || '')}</td>
                        <td className="px-2 py-1.5">{String(row.category || '')}</td>
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
                <th className="px-4 py-3 font-medium w-12">照片</th>
                <th className="px-4 py-3 font-medium">Key</th>
                <th className="px-4 py-3 font-medium">名稱 (中)</th>
                <th className="px-4 py-3 font-medium">分類</th>
                <th className="px-4 py-3 font-medium">稀釋</th>
                <th className="px-4 py-3 font-medium w-20">操作</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const imgSrc = getProductImageSrc(p);
                return (
                  <tr key={p.product_key} className={`border-b hover:bg-gray-50 ${canEdit ? 'cursor-pointer' : ''}`} onClick={() => canEdit && openEdit(p)}>
                    <td className="px-4 py-2">
                      {imgSrc ? (
                        <img src={imgSrc} alt="" className="w-10 h-10 rounded-lg object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <Camera size={14} className="text-gray-300" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{p.product_key}</td>
                    <td className="px-4 py-3">{p.name_zh}</td>
                    <td className="px-4 py-3"><span className="bg-davis-light text-davis-blue text-xs px-2 py-0.5 rounded-full">{CAT_LABELS[p.category] || p.category}</span></td>
                    <td className="px-4 py-3 text-gray-500">{p.dilution}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      {canEdit && (
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(p)} className="p-1 text-gray-400 hover:text-davis-blue"><Pencil size={14} /></button>
                          <button onClick={() => handleDelete(p.product_key)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit / Create Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => { setEditing(null); resetImgState(); }}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-davis-navy">
                {editing.product_key ? '編輯產品' : '新增產品'}
              </h2>
              <button onClick={() => { setEditing(null); resetImgState(); }}><X size={20} className="text-gray-400" /></button>
            </div>

            {/* Product Image Section */}
            <div className="flex flex-col items-center mb-4">
              {currentImgSrc ? (
                <img src={currentImgSrc} alt="產品照片"
                  className="w-[200px] h-[200px] rounded-xl object-cover border border-gray-200" />
              ) : (
                <div className="w-[200px] h-[200px] rounded-xl bg-gray-100 border border-gray-200 flex flex-col items-center justify-center">
                  <Camera size={32} className="text-gray-300 mb-1" />
                  <span className="text-xs text-gray-400">尚無產品照片</span>
                </div>
              )}

              {imgInfo && (
                <p className="text-xs text-gray-500 mt-2">
                  {formatFileSize(imgInfo.original)} → {formatFileSize(imgInfo.compressed)}
                  {imgInfo.compressed < imgInfo.original && (
                    <span className="text-green-600 ml-1">
                      (-{Math.round((1 - imgInfo.compressed / imgInfo.original) * 100)}%)
                    </span>
                  )}
                </p>
              )}

              {canEdit && (
                <>
                  <button
                    onClick={() => imgRef.current?.click()}
                    className="mt-2 px-4 py-1.5 text-xs border rounded-lg text-gray-600 hover:bg-gray-50 flex items-center gap-1"
                    disabled={uploadingImg}
                  >
                    <Camera size={12} />
                    {currentImgSrc ? '更換照片' : '上傳照片'}
                  </button>
                  <input ref={imgRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                </>
              )}
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
              <button onClick={() => { setEditing(null); resetImgState(); }} className="btn-davis-outline flex-1">取消</button>
              <button onClick={handleSave} disabled={saving || uploadingImg} className="btn-davis flex-1 disabled:opacity-50">
                {uploadingImg ? '上傳圖片中...' : saving ? '儲存中...' : '儲存'}
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
