import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, List, ExternalLink } from 'lucide-react';

interface Groomer {
  id: string;
  name: string;
  shop_name: string;
  city: string;
  instagram?: string;
  facebook?: string;
  status: string;
  created_at: string;
}

export default function GroomersPage() {
  const { t } = useTranslation();
  const [view, setView] = useState<'list' | 'map'>('list');
  const [groomers, setGroomers] = useState<Groomer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) { setLoading(false); return; }

    const now = new Date().toISOString();
    fetch(
      `${url}/rest/v1/davis_certifications?select=id,cert_id,name,shop_name,city,instagram,facebook,status,created_at&status=eq.approved&expires_at=gt.${now}&order=created_at.desc`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    )
      .then((r) => r.json())
      .then((rows) => {
        if (Array.isArray(rows)) setGroomers(rows);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-4 py-8">
      <h1 className="text-2xl font-bold text-davis-navy mb-2">{t('groomers.title')}</h1>

      {/* View toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setView('list')}
          className={`flex items-center gap-1 px-4 py-2 rounded-full text-sm transition-colors ${
            view === 'list' ? 'bg-davis-blue text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          <List size={16} />
          {t('groomers.list_view')}
        </button>
        <button
          onClick={() => setView('map')}
          className={`flex items-center gap-1 px-4 py-2 rounded-full text-sm transition-colors ${
            view === 'map' ? 'bg-davis-blue text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          <MapPin size={16} />
          {t('groomers.map_view')}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-davis-blue border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">{t('common.loading')}</p>
        </div>
      ) : view === 'list' ? (
        <div>
          {groomers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-6xl mb-4">🏪</p>
              <p className="text-gray-500">目前尚無認證美容師</p>
            </div>
          ) : (
            <div className="space-y-3">
              {groomers.map((g) => (
                <div key={g.id} className="card-davis">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-davis-navy">{g.shop_name}</h3>
                      <p className="text-sm text-gray-600">{g.name}</p>
                      {g.city && (
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                          <MapPin size={12} />
                          {g.city}
                        </p>
                      )}
                    </div>
                    <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
                      {t('groomers.verified')}
                    </span>
                  </div>
                  {(g.instagram || g.facebook) && (
                    <div className="flex gap-3 mt-3">
                      {g.instagram && (
                        <a
                          href={g.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-davis-blue flex items-center gap-1 hover:underline"
                        >
                          Instagram <ExternalLink size={10} />
                        </a>
                      )}
                      {g.facebook && (
                        <a
                          href={g.facebook}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-davis-blue flex items-center gap-1 hover:underline"
                        >
                          Facebook <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-100 rounded-xl p-8 text-center">
          <MapPin className="mx-auto text-gray-400 mb-3" size={48} />
          <p className="text-gray-500">地圖功能即將推出</p>
          <p className="text-xs text-gray-400 mt-1">敬請期待 Leaflet 地圖整合</p>
        </div>
      )}
    </div>
  );
}
