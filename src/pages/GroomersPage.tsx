import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, ExternalLink, Award, Navigation, User } from 'lucide-react';

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
  lat?: number;
  lng?: number;
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
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState('');

  useEffect(() => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) { setLoading(false); return; }

    const now = new Date().toISOString();
    fetch(
      `${url}/rest/v1/davis_certifications?select=id,cert_id,name,shop_name,city,district,photo_url,instagram,facebook,lat,lng,expires_at,status,created_at&status=eq.approved&expires_at=gt.${now}&order=created_at.desc`,
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

  // Cities that have groomers
  const availableCities = useMemo(() => {
    const cities = new Set(groomers.map((g) => g.city).filter(Boolean));
    return Array.from(cities).sort();
  }, [groomers]);

  // Filter and sort
  const displayGroomers = useMemo(() => {
    let list = selectedCity
      ? groomers.filter((g) => g.city === selectedCity)
      : groomers;

    if (userPos) {
      list = [...list].sort((a, b) => {
        const distA = (a.lat && a.lng) ? haversine(userPos.lat, userPos.lng, a.lat, a.lng) : Infinity;
        const distB = (b.lat && b.lng) ? haversine(userPos.lat, userPos.lng, b.lat, b.lng) : Infinity;
        return distA - distB;
      });
    }

    return list;
  }, [groomers, selectedCity, userPos]);

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

      {/* Location + City filter */}
      <div className="mb-6 space-y-3">
        {/* GPS button */}
        <button
          onClick={handleLocate}
          disabled={locating}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-davis-blue text-white hover:brightness-110 transition-all disabled:opacity-50"
        >
          <Navigation size={14} />
          {locating ? '定位中...' : userPos ? '已定位' : '使用目前位置'}
        </button>
        {locError && <p className="text-xs text-red-500">{locError}</p>}
        {userPos && (
          <p className="text-xs text-green-600">已取得您的位置，依距離排序中</p>
        )}

        {/* City pills */}
        {availableCities.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setSelectedCity(null); }}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                !selectedCity ? 'bg-davis-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              全部
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
            return (
              <div key={g.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                <div className="flex gap-4">
                  {/* Photo */}
                  <div className="flex-shrink-0">
                    {g.photo_url ? (
                      <img src={g.photo_url} alt={g.shop_name} className="w-16 h-16 rounded-xl object-cover" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-davis-light flex items-center justify-center">
                        <User size={28} className="text-davis-blue/40" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-davis-navy">{g.shop_name}</h3>
                        <p className="text-sm text-gray-600">{g.name}</p>
                      </div>
                      <div className="flex items-center gap-1 bg-green-50 text-green-700 text-xs px-2 py-1 rounded-full font-medium flex-shrink-0">
                        <Award size={12} />
                        認證
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
                    <div className="flex flex-wrap items-center gap-3 mt-2">
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
