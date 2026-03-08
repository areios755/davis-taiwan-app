import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, ExternalLink, Award, Navigation, User } from 'lucide-react';

type Tier = 'bronze' | 'silver' | 'gold';

const TIER_ORDER: Record<Tier, number> = { gold: 0, silver: 1, bronze: 2 };
const TIER_INFO: Record<Tier, { label: string; emoji: string; color: string; border: string }> = {
  bronze: { label: '認證美容師', emoji: '🥉', color: '#CD7F32', border: 'border-gray-100' },
  silver: { label: '專業美容師', emoji: '🥈', color: '#C0C0C0', border: 'border-gray-300' },
  gold:   { label: '大師美容師', emoji: '🥇', color: '#FFD700', border: 'border-yellow-400' },
};

interface Groomer {
  id: string;
  cert_id?: string;
  name: string;
  shop_name: string;
  city: string;
  district?: string;
  photo_url?: string;
  instagram?: string;
  facebook?: string;
  line_id?: string;
  lat?: number;
  lng?: number;
  tier?: Tier;
  expires_at?: string;
  status: string;
  created_at: string;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function GroomersPage() {
  const { t } = useTranslation();
  const [groomers, setGroomers] = useState<Groomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<Tier | 'all'>('all');
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState('');

  useEffect(() => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) { setLoading(false); return; }

    const now = new Date().toISOString();
    fetch(
      `${url}/rest/v1/davis_certifications?select=id,cert_id,name,shop_name,city,district,photo_url,instagram,facebook,line_id,lat,lng,tier,expires_at,status,created_at&status=eq.approved&expires_at=gt.${now}&order=created_at.desc`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    )
      .then((r) => r.json())
      .then((rows) => {
        if (Array.isArray(rows)) setGroomers(rows);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setLocError('您的瀏覽器不支援定位功能');
      return;
    }
    setLocating(true);
    setLocError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
        setSelectedCity(null);
      },
      () => {
        setLocError('無法取得位置，請改用城市篩選');
        setLocating(false);
      },
      { timeout: 10000 },
    );
  };

  const availableCities = useMemo(() => {
    const cities = new Set(groomers.map((g) => g.city).filter(Boolean));
    return Array.from(cities).sort();
  }, [groomers]);

  const displayGroomers = useMemo(() => {
    let list = selectedCity ? groomers.filter((g) => g.city === selectedCity) : groomers;
    if (selectedTier !== 'all') list = list.filter((g) => (g.tier || 'bronze') === selectedTier);

    // Sort: tier first (gold > silver > bronze), then distance or name
    list = [...list].sort((a, b) => {
      const tierA = TIER_ORDER[(a.tier || 'bronze') as Tier];
      const tierB = TIER_ORDER[(b.tier || 'bronze') as Tier];
      if (tierA !== tierB) return tierA - tierB;

      if (userPos) {
        const distA = (a.lat && a.lng) ? haversine(userPos.lat, userPos.lng, a.lat, a.lng) : Infinity;
        const distB = (b.lat && b.lng) ? haversine(userPos.lat, userPos.lng, b.lat, b.lng) : Infinity;
        return distA - distB;
      }
      return a.shop_name.localeCompare(b.shop_name, 'zh-TW');
    });

    return list;
  }, [groomers, selectedCity, selectedTier, userPos]);

  const getDistance = (g: Groomer): number | null => {
    if (!userPos || !g.lat || !g.lng) return null;
    return haversine(userPos.lat, userPos.lng, g.lat, g.lng);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 py-8">
      {/* Hero */}
      <div className="text-center mb-8">
        <Award className="mx-auto text-davis-gold mb-3" size={48} />
        <h1 className="text-2xl font-bold text-davis-navy mb-2">尋找你附近的 Davis 認證美容師</h1>
        <p className="text-gray-500 text-sm">經 Davis Taiwan 實體考核通過，專業洗護品質保證</p>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-3">
        {/* GPS + tier filter row */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleLocate}
            disabled={locating}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-davis-blue text-white hover:brightness-110 transition-all disabled:opacity-50"
          >
            <Navigation size={14} />
            {locating ? '定位中...' : userPos ? '已定位' : '使用目前位置'}
          </button>

          {/* Tier filter pills */}
          {(['all', 'gold', 'silver', 'bronze'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTier(t)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                selectedTier === t ? 'bg-davis-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t === 'all' ? '全部等級' : `${TIER_INFO[t].emoji} ${TIER_INFO[t].label}`}
            </button>
          ))}
        </div>

        {locError && <p className="text-xs text-red-500">{locError}</p>}
        {userPos && <p className="text-xs text-green-600">已取得您的位置，依距離排序中</p>}

        {/* City pills */}
        {availableCities.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCity(null)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                !selectedCity ? 'bg-davis-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              全部城市
            </button>
            {availableCities.map((city) => (
              <button
                key={city}
                onClick={() => { setSelectedCity(city); setUserPos(null); }}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  selectedCity === city ? 'bg-davis-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {city}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Groomer list */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-davis-blue border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">{t('common.loading')}</p>
        </div>
      ) : displayGroomers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-6xl mb-4">🏪</p>
          <p className="text-gray-600 mb-2">
            {selectedCity
              ? `目前${selectedCity}尚無 Davis 認證美容師，歡迎申請成為第一位！`
              : '目前尚無 Davis 認證美容師'}
          </p>
          <Link to="/certify" className="btn-davis mt-4 inline-block">立即申請認證</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {displayGroomers.map((g) => {
            const dist = getDistance(g);
            const tier = (g.tier || 'bronze') as Tier;
            const ti = TIER_INFO[tier];
            const isGold = tier === 'gold';
            const isSilver = tier === 'silver';

            return (
              <div
                key={g.id}
                className={`bg-white rounded-xl border shadow-sm p-4 hover:shadow-md transition-shadow ${ti.border} ${isGold ? 'border-2 ring-1 ring-yellow-200' : isSilver ? 'border-2' : ''}`}
              >
                <div className="flex gap-4">
                  {/* Photo + tier badge */}
                  <div className="flex-shrink-0 relative">
                    {g.photo_url ? (
                      <img src={g.photo_url} alt={g.shop_name} className="w-16 h-16 rounded-xl object-cover" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-davis-light flex items-center justify-center">
                        <User size={28} className="text-davis-blue/40" />
                      </div>
                    )}
                    {/* Tier badge overlay */}
                    <div
                      className="absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full flex items-center justify-center text-xs border-2 border-white shadow-sm"
                      style={{ backgroundColor: ti.color }}
                      title={`${ti.emoji} ${ti.label}`}
                    >
                      <span className="text-white text-[10px] font-bold">
                        {tier === 'gold' ? 'G' : tier === 'silver' ? 'S' : 'B'}
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-davis-navy">{g.shop_name}</h3>
                        <p className="text-sm text-gray-600">{g.name}</p>
                      </div>
                      <div
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium flex-shrink-0"
                        style={{ backgroundColor: ti.color + '18', color: ti.color }}
                      >
                        <Award size={12} />
                        {ti.label}
                      </div>
                    </div>

                    {/* Location + distance */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-gray-500">
                      {(g.city || g.district) && (
                        <span className="flex items-center gap-1">
                          <MapPin size={12} />
                          {[g.city, g.district].filter(Boolean).join('')}
                        </span>
                      )}
                      {dist !== null && (
                        <span className="text-davis-blue font-medium">
                          距離您約 {dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`}
                        </span>
                      )}
                    </div>

                    {/* Cert info */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-400">
                      {g.cert_id && <span>編號 {g.cert_id}</span>}
                      {g.expires_at && <span>有效至 {new Date(g.expires_at).toLocaleDateString('zh-TW')}</span>}
                    </div>

                    {/* Social + verify link */}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {g.line_id && (
                        <a
                          href={`https://line.me/R/ti/p/${g.line_id.startsWith('@') ? g.line_id : '@' + g.line_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium text-white bg-[#06C755] hover:brightness-110 transition-all"
                        >
                          加入 LINE 諮詢
                        </a>
                      )}
                      {g.instagram && (
                        <a href={g.instagram} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-davis-blue flex items-center gap-0.5 hover:underline">
                          IG <ExternalLink size={10} />
                        </a>
                      )}
                      {g.facebook && (
                        <a href={g.facebook} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-davis-blue flex items-center gap-0.5 hover:underline">
                          FB <ExternalLink size={10} />
                        </a>
                      )}
                      {g.cert_id && (
                        <Link to={`/verify/${g.cert_id}`}
                          className="text-xs text-davis-gold font-medium hover:underline">
                          查看認證
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CTA */}
      {!loading && groomers.length > 0 && (
        <div className="text-center mt-8 pt-6 border-t border-gray-100">
          <p className="text-sm text-gray-500 mb-3">想成為 Davis 認證美容師？</p>
          <Link to="/certify" className="btn-davis">立即申請認證</Link>
        </div>
      )}
    </div>
  );
}
