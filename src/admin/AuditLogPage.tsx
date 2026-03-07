import { useState, useEffect } from 'react';
import { useAuth } from './AdminApp';
import { adminApi } from '@/lib/api';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface AuditEntry {
  id: string;
  username: string;
  role: string;
  action: string;
  target_type: string;
  target_id: string | null;
  target_name: string | null;
  changes: { before?: Record<string, unknown> | null; after?: Record<string, unknown> | null } | null;
  ip_address: string;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  login: '登入',
  create_product: '新增產品',
  update_product: '修改產品',
  delete_product: '刪除產品',
  import_products: '匯入產品',
  create_breed: '新增品種',
  update_breed: '修改品種',
  delete_breed: '刪除品種',
  import_breeds: '匯入品種',
  update_settings: '修改設定',
  create_user: '新增使用者',
  update_user: '修改使用者',
  delete_user: '刪除使用者',
  approve_cert: '通過認證',
  reject_cert: '拒絕認證',
};

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-50 text-green-700',
  update: 'bg-blue-50 text-blue-700',
  delete: 'bg-red-50 text-red-700',
  import: 'bg-purple-50 text-purple-700',
  login: 'bg-gray-50 text-gray-600',
  approve: 'bg-green-50 text-green-700',
  reject: 'bg-red-50 text-red-700',
};

function getActionColor(action: string) {
  const prefix = action.split('_')[0];
  return ACTION_COLORS[prefix] || 'bg-gray-50 text-gray-600';
}

const ALL_ACTIONS = [
  'login',
  'create_product', 'update_product', 'delete_product', 'import_products',
  'create_breed', 'update_breed', 'delete_breed', 'import_breeds',
  'update_settings',
  'create_user', 'update_user', 'delete_user',
];

export default function AuditLogPage() {
  const { token } = useAuth();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [filterAction, setFilterAction] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const PAGE_SIZE = 50;

  const load = (offset = 0) => {
    setLoading(true);
    adminApi.getAuditLog(token, {
      limit: PAGE_SIZE,
      offset,
      action: filterAction || undefined,
      user: filterUser || undefined,
      from: filterFrom || undefined,
      to: filterTo || undefined,
    }).then((res) => {
      if (res.success && res.data) {
        setLogs(res.data.logs as unknown as AuditEntry[]);
        setTotal(res.data.total);
      }
      setLoading(false);
    });
  };

  useEffect(() => { setPage(0); load(0); }, [token, filterAction, filterUser, filterFrom, filterTo]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    load(newPage * PAGE_SIZE);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-davis-navy mb-4">操作紀錄</h1>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">操作類型</label>
            <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm">
              <option value="">全部</option>
              {ALL_ACTIONS.map((a) => (
                <option key={a} value={a}>{ACTION_LABELS[a] || a}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">使用者</label>
            <input value={filterUser} onChange={(e) => setFilterUser(e.target.value)}
              placeholder="輸入使用者名稱"
              className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">開始日期</label>
            <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">結束日期</label>
            <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <p className="text-gray-400 text-center py-12">載入中...</p>
      ) : logs.length === 0 ? (
        <p className="text-gray-400 text-center py-12">無操作紀錄</p>
      ) : (
        <>
          <div className="text-xs text-gray-400 mb-2">共 {total} 筆紀錄</div>
          <div className="space-y-2">
            {logs.map((log) => {
              const isExpanded = expandedId === log.id;
              return (
                <div key={log.id} className="bg-white rounded-xl border overflow-hidden">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                    className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getActionColor(log.action)}`}>
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                        <span className="text-sm font-medium text-davis-navy">{log.target_name || log.target_id || ''}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                        <span>{log.username} ({log.role})</span>
                        <span>·</span>
                        <span>{formatTime(log.created_at)}</span>
                      </div>
                    </div>
                    {log.changes ? (
                      isExpanded ? <ChevronUp size={16} className="text-gray-400 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />
                    ) : null}
                  </button>

                  {isExpanded && log.changes && (
                    <div className="px-4 pb-4 border-t">
                      <DiffView changes={log.changes} action={log.action} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button onClick={() => handlePageChange(page - 1)} disabled={page === 0}
                className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-30">
                上一頁
              </button>
              <span className="text-sm text-gray-500">{page + 1} / {totalPages}</span>
              <button onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages - 1}
                className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-30">
                下一頁
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function DiffView({ changes, action }: { changes: { before?: Record<string, unknown> | null; after?: Record<string, unknown> | null }; action: string }) {
  const { before, after } = changes;

  // Import summary
  if (action.startsWith('import_')) {
    const info = after as Record<string, unknown> | null;
    return (
      <div className="mt-3 text-sm">
        <p className="text-gray-600">
          匯入結果: 成功 <span className="text-green-600 font-medium">{String(info?.ok ?? 0)}</span> /
          失敗 <span className="text-red-600 font-medium">{String(info?.fail ?? 0)}</span> /
          共 <span className="font-medium">{String(info?.total ?? 0)}</span> 筆
        </p>
      </div>
    );
  }

  // Create: show after only
  if (!before && after) {
    return (
      <div className="mt-3 text-sm">
        <p className="text-xs text-green-600 font-medium mb-1">新增內容</p>
        <div className="bg-green-50 rounded-lg p-3 text-xs font-mono overflow-x-auto max-h-48 overflow-y-auto">
          {Object.entries(after).filter(([k]) => !k.startsWith('password')).map(([k, v]) => (
            <div key={k}><span className="text-gray-500">{k}:</span> <span className="text-green-700">{JSON.stringify(v)}</span></div>
          ))}
        </div>
      </div>
    );
  }

  // Delete: show before only
  if (before && !after) {
    return (
      <div className="mt-3 text-sm">
        <p className="text-xs text-red-600 font-medium mb-1">刪除內容</p>
        <div className="bg-red-50 rounded-lg p-3 text-xs font-mono overflow-x-auto max-h-48 overflow-y-auto">
          {Object.entries(before).filter(([k]) => !k.startsWith('password')).map(([k, v]) => (
            <div key={k}><span className="text-gray-500">{k}:</span> <span className="text-red-700">{JSON.stringify(v)}</span></div>
          ))}
        </div>
      </div>
    );
  }

  // Update: show diff
  if (before && after) {
    const allKeys = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(k => !k.startsWith('password'));
    const changedKeys = allKeys.filter(k => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
    if (changedKeys.length === 0) return <p className="mt-3 text-xs text-gray-400">無變更</p>;
    return (
      <div className="mt-3 text-sm">
        <p className="text-xs text-blue-600 font-medium mb-1">變更欄位</p>
        <div className="bg-blue-50 rounded-lg p-3 text-xs font-mono overflow-x-auto max-h-48 overflow-y-auto space-y-1">
          {changedKeys.map(k => (
            <div key={k}>
              <span className="text-gray-500">{k}:</span>{' '}
              <span className="text-red-600 line-through">{JSON.stringify(before[k])}</span>{' '}
              <span className="text-green-700">{JSON.stringify(after[k])}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
