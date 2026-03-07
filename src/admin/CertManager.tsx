import { useState, useEffect } from 'react';
import { useAuth } from './AdminApp';
import { adminApi } from '@/lib/api';
import { CheckCircle, XCircle, Clock, ExternalLink } from 'lucide-react';

interface Cert {
  id: string;
  name: string;
  shop_name: string;
  city: string;
  phone?: string;
  email?: string;
  instagram?: string;
  facebook?: string;
  status: string;
  created_at: string;
  approved_at?: string;
}

export default function CertManager() {
  const { token } = useAuth();
  const [certs, setCerts] = useState<Cert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [updating, setUpdating] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    adminApi.getCertifications(token).then((res) => {
      if (res.success && res.data) setCerts(res.data.certs as unknown as Cert[]);
      setLoading(false);
    });
  };

  useEffect(load, [token]);

  const handleStatus = async (id: string, status: string) => {
    setUpdating(id);
    await adminApi.updateCertStatus(token, id, status);
    setUpdating(null);
    load();
  };

  const filtered = filter === 'all' ? certs : certs.filter((c) => c.status === filter);
  const pendingCount = certs.filter((c) => c.status === 'pending').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-davis-navy">
          認證審核
          {pendingCount > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingCount}</span>
          )}
        </h1>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs ${filter === f ? 'bg-davis-blue text-white' : 'bg-gray-100 text-gray-600'}`}>
            {f === 'all' ? '全部' : f === 'pending' ? '待審' : f === 'approved' ? '已通過' : '已拒絕'}
            {f === 'pending' && pendingCount > 0 && ` (${pendingCount})`}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-12">載入中...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-400 text-center py-12">無認證申請</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-davis-navy">{c.shop_name}</h3>
                  <p className="text-sm text-gray-600">{c.name} · {c.city || '—'}</p>
                  <p className="text-xs text-gray-400 mt-1">ID: {c.id}</p>
                </div>
                <StatusBadge status={c.status} />
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

              <div className="text-xs text-gray-400 mt-2">
                申請時間: {new Date(c.created_at).toLocaleString('zh-TW')}
                {c.approved_at && ` · 通過: ${new Date(c.approved_at).toLocaleString('zh-TW')}`}
              </div>

              {/* Actions */}
              {c.status === 'pending' && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleStatus(c.id, 'approved')}
                    disabled={updating === c.id}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-sm hover:bg-green-100 disabled:opacity-50"
                  >
                    <CheckCircle size={14} /> 通過
                  </button>
                  <button
                    onClick={() => handleStatus(c.id, 'rejected')}
                    disabled={updating === c.id}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100 disabled:opacity-50"
                  >
                    <XCircle size={14} /> 拒絕
                  </button>
                </div>
              )}
              {c.status !== 'pending' && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleStatus(c.id, 'pending')}
                    disabled={updating === c.id}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg text-xs hover:bg-gray-100 disabled:opacity-50"
                  >
                    <Clock size={12} /> 回復待審
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'approved') return <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">已通過</span>;
  if (status === 'rejected') return <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full">已拒絕</span>;
  return <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full">待審核</span>;
}
