import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Award, MapPin, ExternalLink, ShieldOff } from 'lucide-react';

type Tier = 'bronze' | 'silver' | 'gold';

const TIER_DISPLAY: Record<Tier, { title: string; color: string; iconColor: string }> = {
  bronze: { title: 'Davis 認證美容師', color: '#CD7F32', iconColor: 'text-[#CD7F32]' },
  silver: { title: 'Davis 專業美容師', color: '#C0C0C0', iconColor: 'text-[#C0C0C0]' },
  gold:   { title: 'Davis 大師美容師', color: '#FFD700', iconColor: 'text-[#FFD700]' },
};

interface CertPublic {
  id: string;
  cert_id?: string;
  name: string;
  shop_name: string;
  city?: string;
  district?: string;
  instagram?: string;
  facebook?: string;
  tier?: Tier;
  status: string;
  created_at: string;
  approved_at?: string;
  expires_at?: string;
}

export default function VerifyPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const [cert, setCert] = useState<CertPublic | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) { setError('缺少認證編號'); setLoading(false); return; }

    const safeId = id.replace(/[^a-zA-Z0-9-]/g, '');
    if (!safeId) { setError('無效的認證編號'); setLoading(false); return; }

    fetch(`/.netlify/functions/certify?id=${encodeURIComponent(safeId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.cert) {
          setCert(data.cert);
        } else {
          setError(data.error || '查無此認證編號');
        }
      })
      .catch(() => setError('查詢失敗'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-lg mx-auto p-4 py-16 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-davis-blue border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-500">{t('common.loading')}</p>
      </div>
    );
  }

  if (error || !cert) {
    return (
      <div className="max-w-lg mx-auto p-4 py-16 text-center">
        <p className="text-6xl mb-4">🔍</p>
        <p className="text-gray-600 mb-4">{error || '查無此認證編號'}</p>
        <Link to="/groomers" className="btn-davis">{t('groomers.find_cta')}</Link>
      </div>
    );
  }

  const isApproved = cert.status === 'approved';
  const isExpired = cert.status === 'expired';
  const isInvalid = cert.status === 'suspended' || cert.status === 'revoked';
  const tier = (cert.tier || 'bronze') as Tier;
  const td = TIER_DISPLAY[tier];

  return (
    <div className="max-w-lg mx-auto p-4 py-8">
      {/* Badge card */}
      {isInvalid ? (
        <div className="rounded-2xl p-8 text-center bg-gray-100 text-gray-700">
          <ShieldOff className="mx-auto mb-4 text-gray-400" size={64} />
          <h1 className="text-xl font-bold mb-1">{cert.shop_name}</h1>
          <p className="text-sm text-gray-500">{cert.name}</p>
          <div className="mt-4">
            <span className="bg-red-100 text-red-700 px-4 py-1.5 rounded-full text-sm font-medium">
              此認證已失效
            </span>
          </div>
          <p className="text-xs mt-4 text-gray-400">認證編號: {cert.cert_id || cert.id}</p>
        </div>
      ) : (
        <div className={`rounded-2xl p-8 text-center ${
          isApproved
            ? 'bg-gradient-to-b from-davis-navy to-davis-blue text-white'
            : isExpired
              ? 'bg-gray-200 text-gray-700'
              : 'bg-gray-100 text-gray-700'
        }`}>
          <Award
            className="mx-auto mb-4"
            size={72}
            style={{ color: isApproved ? td.color : '#9ca3af' }}
          />
          <h1 className="text-xl font-bold mb-1">{cert.shop_name}</h1>
          <p className={`text-sm ${isApproved ? 'text-white/70' : 'text-gray-500'}`}>{cert.name}</p>

          {isApproved && (
            <div className="mt-4">
              <span
                className="px-4 py-1.5 rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: td.color }}
              >
                {td.title}
              </span>
            </div>
          )}
          {isExpired && (
            <div className="mt-4">
              <span className="bg-gray-300 text-gray-600 px-4 py-1.5 rounded-full text-sm font-medium">
                認證已過期
              </span>
            </div>
          )}
          {cert.status === 'pending' && (
            <div className="mt-4">
              <span className="bg-yellow-100 text-yellow-700 px-4 py-1.5 rounded-full text-sm font-medium">
                {t('certify.pending')}
              </span>
            </div>
          )}

          <p className={`text-xs mt-4 ${isApproved ? 'text-white/50' : 'text-gray-400'}`}>
            認證編號: {cert.cert_id || cert.id}
          </p>
        </div>
      )}

      {/* Details */}
      <div className="mt-6 space-y-3">
        {(cert.city || cert.district) && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin size={16} className="text-gray-400" />
            {[cert.city, cert.district].filter(Boolean).join('')}
          </div>
        )}
        {isApproved && cert.instagram && (
          <a href={cert.instagram} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-davis-blue hover:underline">
            Instagram <ExternalLink size={12} />
          </a>
        )}
        {isApproved && cert.facebook && (
          <a href={cert.facebook} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-davis-blue hover:underline">
            Facebook <ExternalLink size={12} />
          </a>
        )}
        {cert.approved_at && (
          <p className="text-xs text-gray-400">
            認證日期: {new Date(cert.approved_at).toLocaleDateString('zh-TW')}
          </p>
        )}
        {isApproved && cert.expires_at && (
          <p className="text-xs text-gray-400">
            有效至: {new Date(cert.expires_at).toLocaleDateString('zh-TW')}
          </p>
        )}
        {isExpired && cert.expires_at && (
          <p className="text-xs text-gray-400">
            已於 {new Date(cert.expires_at).toLocaleDateString('zh-TW')} 到期
          </p>
        )}
      </div>
    </div>
  );
}
