import { useState, useEffect } from 'react';
import { useAuth } from './AdminApp';
import { adminApi } from '@/lib/api';
import {
  CheckCircle, XCircle, Clock, ExternalLink, Ban,
  RotateCcw, RefreshCw, AlertTriangle, ChevronDown, ChevronUp,
} from 'lucide-react';

interface Cert {
  id: string;
  cert_id?: string;
  name: string;
  shop_name: string;
  city: string;
  district?: string;
  address?: string;
  phone?: string;
  email?: string;
  instagram?: string;
  facebook?: string;
  note?: string;
  status: string;
  created_at: string;
  approved_at?: string;
  expires_at?: string;
  suspended_at?: string;
  suspend_reason?: string;
  revoked_at?: string;
  revoke_reason?: string;
  admin_notes?: string;
}

type Filter = 'all' | 'pending' | 'approved' | 'suspended' | 'revoked' | 'expired' | 'rejected';

const FILTER_LABELS: Record<Filter, string> = {
  all: '全部',
  pending: '待審核',
  approved: '已通過',
  suspended: '已停權',
  revoked: '已撤銷',
  expired: '已過期',
  rejected: '已拒絕',
};

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function CertManager() {
  const { token, role } = useAuth();
  const canEdit = role === 'admin' || role === 'editor';
  const [certs, setCerts] = useState<Cert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [updating, setUpdating] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Reason modal
  const [modal, setModal] = useState<{ id: string; action: 'suspend' | 'revoke' } | null>(null);
  const [reason, setReason] = useState('');

  const load = () => {
    setLoading(true);
    adminApi.getCertifications(token).then((res) => {
      if (res.success && res.data) setCerts(res.data.certs as unknown as Cert[]);
      setLoading(false);
    });
  };

  useEffect(load, [token]);

  const handleAction = async (id: string, action: string, extra?: Record<string, unknown>) => {
    setUpdating(id);
    await adminApi.updateCertAction(token, id, action, extra);
    setUpdating(null);
    load();
  };

  const submitReason = async () => {
    if (!modal || !reason.trim()) return;
    await handleAction(modal.id, modal.action, { reason: reason.trim() });
    setModal(null);
    setReason('');
  };

  const handleNotesBlur = async (id: string, notes: string) => {
    await adminApi.updateCertAction(token, id, 'update_notes', { admin_notes: notes });
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filtered = filter === 'all' ? certs : certs.filter((c) => c.status === filter);
  const counts = certs.reduce((acc, c) => { acc[c.status] = (acc[c.status] || 0) + 1; return acc; }, {} as Record<string, number>);
  const expiringCount = certs.filter((c) => c.status === 'approved' && c.expires_at && daysUntil(c.expires_at) <= 30 && daysUntil(c.expires_at) > 0).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-davis-navy">
          認證管理
          {(counts.pending || 0) > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{counts.pending}</span>
          )}
        </h1>
      </div>

      {/* Stats bar */}
      {(expiringCount > 0 || (counts.expired || 0) > 0) && (
        <div className="flex gap-3 mb-4">
          {expiringCount > 0 && (
            <div className="flex items-center gap-1 bg-yellow-50 border border-yellow-200 text-yellow-700 px-3 py-1.5 rounded-lg text-xs">
              <AlertTriangle size={14} />
              即將到期 {expiringCount} 人
            </div>
          )}
          {(counts.expired || 0) > 0 && (
            <div className="flex items-center gap-1 bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-xs">
              <Clock size={14} />
              已過期 {counts.expired} 人
            </div>
          )}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs transition-colors ${filter === f ? 'bg-davis-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {FILTER_LABELS[f]}
            {f !== 'all' && (counts[f] || 0) > 0 && ` (${counts[f]})`}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-12">載入中...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-400 text-center py-12">無認證申請</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => {
            const isExpanding = daysUntil(c.expires_at || '') <= 30 && daysUntil(c.expires_at || '') > 0 && c.status === 'approved';
            const isExpanded = expanded.has(c.id);

            return (
              <div key={c.id} className={`bg-white rounded-xl border p-4 ${isExpanding ? 'border-yellow-300' : ''}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-davis-navy">{c.shop_name}</h3>
                    <p className="text-sm text-gray-600">{c.name} · {[c.city, c.district, c.address].filter(Boolean).join('') || '—'}</p>
                    <p className="text-xs text-gray-400 mt-1">認證編號: {c.cert_id || '—'}</p>
                  </div>
                  <StatusBadge cert={c} />
                </div>

                {/* Contact info */}
                <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500">
                  {c.phone && <span>📞 {c.phone}</span>}
                  {c.email && <span>📧 {c.email}</span>}
                  {c.instagram && (
                    <a href={c.instagram} target="_blank" rel="noopener noreferrer" className="text-davis-blue flex items-center gap-0.5 hover:underline">
                      IG <ExternalLink size={10} />
                    </a>
                  )}
                  {c.facebook && (
                    <a href={c.facebook} target="_blank" rel="noopener noreferrer" className="text-davis-blue flex items-center gap-0.5 hover:underline">
                      FB <ExternalLink size={10} />
                    </a>
                  )}
                </div>

                {/* Dates */}
                <div className="text-xs text-gray-400 mt-2 space-y-0.5">
                  <p>申請: {new Date(c.created_at).toLocaleString('zh-TW')}</p>
                  {c.approved_at && <p>通過: {new Date(c.approved_at).toLocaleString('zh-TW')}</p>}
                  {c.expires_at && c.status === 'approved' && (
                    <p className={isExpanding ? 'text-yellow-600 font-medium' : ''}>
                      到期: {new Date(c.expires_at).toLocaleDateString('zh-TW')}
                      {isExpanding && ` (${daysUntil(c.expires_at)} 天後到期)`}
                    </p>
                  )}
                </div>

                {/* Status-specific info */}
                {c.status === 'suspended' && c.suspend_reason && (
                  <div className="mt-2 bg-orange-50 text-orange-700 text-xs rounded-lg p-2">
                    停權原因: {c.suspend_reason}
                  </div>
                )}
                {c.status === 'revoked' && c.revoke_reason && (
                  <div className="mt-2 bg-red-50 text-red-700 text-xs rounded-lg p-2">
                    撤銷原因: {c.revoke_reason}
                  </div>
                )}

                {/* Actions */}
                {canEdit && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {c.status === 'pending' && (
                      <>
                        <ActionBtn icon={<CheckCircle size={14} />} label="通過" color="green"
                          disabled={updating === c.id} onClick={() => handleAction(c.id, 'approve')} />
                        <ActionBtn icon={<XCircle size={14} />} label="拒絕" color="red"
                          disabled={updating === c.id} onClick={() => handleAction(c.id, 'reject')} />
                      </>
                    )}
                    {c.status === 'approved' && (
                      <>
                        <ActionBtn icon={<Ban size={14} />} label="停權" color="orange"
                          disabled={updating === c.id} onClick={() => { setModal({ id: c.id, action: 'suspend' }); setReason(''); }} />
                        <ActionBtn icon={<XCircle size={14} />} label="撤銷" color="red"
                          disabled={updating === c.id} onClick={() => { setModal({ id: c.id, action: 'revoke' }); setReason(''); }} />
                        <ActionBtn icon={<RefreshCw size={14} />} label="續約" color="blue"
                          disabled={updating === c.id} onClick={() => handleAction(c.id, 'renew')} />
                      </>
                    )}
                    {c.status === 'suspended' && (
                      <>
                        <ActionBtn icon={<RotateCcw size={14} />} label="恢復" color="green"
                          disabled={updating === c.id} onClick={() => handleAction(c.id, 'restore')} />
                        <ActionBtn icon={<XCircle size={14} />} label="撤銷" color="red"
                          disabled={updating === c.id} onClick={() => { setModal({ id: c.id, action: 'revoke' }); setReason(''); }} />
                      </>
                    )}
                    {c.status === 'expired' && (
                      <>
                        <ActionBtn icon={<RefreshCw size={14} />} label="續約" color="blue"
                          disabled={updating === c.id} onClick={() => handleAction(c.id, 'renew')} />
                        <ActionBtn icon={<XCircle size={14} />} label="撤銷" color="red"
                          disabled={updating === c.id} onClick={() => { setModal({ id: c.id, action: 'revoke' }); setReason(''); }} />
                      </>
                    )}
                    {c.status === 'rejected' && (
                      <ActionBtn icon={<Clock size={12} />} label="回復待審" color="gray"
                        disabled={updating === c.id} onClick={() => handleAction(c.id, 'pending')} small />
                    )}
                  </div>
                )}

                {/* Expandable notes */}
                <button
                  onClick={() => toggleExpand(c.id)}
                  className="flex items-center gap-1 text-xs text-gray-400 mt-3 hover:text-gray-600"
                >
                  {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  備註 {c.note ? '(有申請備註)' : ''}
                </button>
                {isExpanded && (
                  <div className="mt-2 space-y-2">
                    {c.note && (
                      <div className="text-xs bg-gray-50 rounded-lg p-2">
                        <span className="text-gray-400">申請備註: </span>
                        <span className="text-gray-600">{c.note}</span>
                      </div>
                    )}
                    {canEdit && (
                      <textarea
                        defaultValue={c.admin_notes || ''}
                        placeholder="管理員備註..."
                        onBlur={(e) => handleNotesBlur(c.id, e.target.value)}
                        className="w-full text-xs border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-davis-blue/30 min-h-[60px]"
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reason Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-davis-navy mb-4">
              {modal.action === 'suspend' ? '停權認證' : '撤銷認證'}
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              {modal.action === 'suspend'
                ? '請填寫停權原因，此資訊將記錄在系統中。'
                : '請填寫撤銷原因。撤銷為最終決定，無法恢復。'}
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="原因（必填）..."
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-davis-blue/30 min-h-[100px] mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setModal(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                取消
              </button>
              <button
                onClick={submitReason}
                disabled={!reason.trim() || updating === modal.id}
                className={`px-4 py-2 text-sm text-white rounded-lg disabled:opacity-50 ${
                  modal.action === 'suspend' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                確認{modal.action === 'suspend' ? '停權' : '撤銷'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionBtn({ icon, label, color, disabled, onClick, small }: {
  icon: React.ReactNode; label: string; color: string;
  disabled: boolean; onClick: () => void; small?: boolean;
}) {
  const colors: Record<string, string> = {
    green: 'bg-green-50 text-green-600 hover:bg-green-100',
    red: 'bg-red-50 text-red-600 hover:bg-red-100',
    orange: 'bg-orange-50 text-orange-600 hover:bg-orange-100',
    blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
    gray: 'bg-gray-50 text-gray-600 hover:bg-gray-100',
  };
  return (
    <button onClick={onClick} disabled={disabled}
      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg ${small ? 'text-xs' : 'text-sm'} disabled:opacity-50 ${colors[color] || colors.gray}`}>
      {icon} {label}
    </button>
  );
}

function StatusBadge({ cert }: { cert: Cert }) {
  const { status, expires_at } = cert;
  const isExpiring = status === 'approved' && expires_at && daysUntil(expires_at) <= 30 && daysUntil(expires_at) > 0;

  if (status === 'approved' && isExpiring) {
    return <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full">即將到期</span>;
  }
  if (status === 'approved') return <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">已通過</span>;
  if (status === 'suspended') return <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full">已停權</span>;
  if (status === 'revoked') return <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full">已撤銷</span>;
  if (status === 'expired') return <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">已過期</span>;
  if (status === 'rejected') return <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full">已拒絕</span>;
  return <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full">待審核</span>;
}
