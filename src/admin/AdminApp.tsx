import { useState, useEffect, createContext, useContext } from 'react';
import { adminApi } from '@/lib/api';
import Dashboard from './Dashboard';
import ProductManager from './ProductManager';
import BreedManager from './BreedManager';
import SettingsManager from './SettingsManager';
import AnalyticsView from './AnalyticsView';
import UserManager from './UserManager';
import AiAssistant from './AiAssistant';
import CertManager from './CertManager';
import AuditLogPage from './AuditLogPage';
import {
  LayoutDashboard, Package, Dog, Settings, BarChart3,
  Users, Bot, Award, LogOut, Menu, X, ClipboardList,
} from 'lucide-react';

interface AuthCtx {
  token: string;
  role: string;
  username: string;
}

const AuthContext = createContext<AuthCtx>({ token: '', role: '', username: '' });
export function useAuth() { return useContext(AuthContext); }

type Page = 'dashboard' | 'products' | 'breeds' | 'settings' | 'analytics' | 'users' | 'ai' | 'certs' | 'audit';

const NAV: { id: Page; label: string; icon: typeof LayoutDashboard; minRole?: 'editor' | 'admin' }[] = [
  { id: 'dashboard', label: '儀表板', icon: LayoutDashboard },
  { id: 'products', label: '產品管理', icon: Package },
  { id: 'breeds', label: '品種管理', icon: Dog },
  { id: 'certs', label: '認證審核', icon: Award },
  { id: 'analytics', label: '數據分析', icon: BarChart3 },
  { id: 'ai', label: 'AI 助手', icon: Bot, minRole: 'editor' },
  { id: 'audit', label: '操作紀錄', icon: ClipboardList, minRole: 'editor' },
  { id: 'users', label: '使用者', icon: Users, minRole: 'admin' },
  { id: 'settings', label: '系統設定', icon: Settings, minRole: 'admin' },
];

function hasAccess(userRole: string, minRole?: 'editor' | 'admin'): boolean {
  if (!minRole) return true;
  if (minRole === 'editor') return userRole === 'editor' || userRole === 'admin';
  return userRole === 'admin';
}

export default function AdminApp() {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem('davis_admin_token'));
  const [role, setRole] = useState(() => sessionStorage.getItem('davis_admin_role') || '');
  const [username, setUsername] = useState(() => sessionStorage.getItem('davis_admin_user') || '');
  const [page, setPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Login form
  const [loginUser, setLoginUser] = useState('');
  const [loginPw, setLoginPw] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Verify token on mount
  useEffect(() => {
    if (!token) return;
    adminApi.me(token).then((res) => {
      if (!res.success) {
        sessionStorage.removeItem('davis_admin_token');
        setToken(null);
      }
    });
  }, [token]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErr('');
    setLoginLoading(true);
    const res = await adminApi.login(loginUser, loginPw);
    setLoginLoading(false);
    if (res.success && res.data) {
      const { token: t, role: r, displayName } = res.data;
      sessionStorage.setItem('davis_admin_token', t);
      sessionStorage.setItem('davis_admin_role', r);
      sessionStorage.setItem('davis_admin_user', displayName || loginUser);
      setToken(t);
      setRole(r);
      setUsername(displayName || loginUser);
    } else {
      setLoginErr(res.error || '登入失敗');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('davis_admin_token');
    sessionStorage.removeItem('davis_admin_role');
    sessionStorage.removeItem('davis_admin_user');
    setToken(null);
    setRole('');
    setUsername('');
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-davis-navy to-davis-blue flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-davis-navy">Davis Admin</h1>
            <p className="text-sm text-gray-400 mt-1">管理後台</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="text" value={loginUser} onChange={(e) => setLoginUser(e.target.value)}
              placeholder="帳號" autoComplete="username"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-davis-blue/30"
            />
            <input
              type="password" value={loginPw} onChange={(e) => setLoginPw(e.target.value)}
              placeholder="密碼" autoComplete="current-password"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-davis-blue/30"
            />
            {loginErr && <p className="text-red-500 text-sm">{loginErr}</p>}
            <button type="submit" disabled={loginLoading} className="btn-davis w-full disabled:opacity-50">
              {loginLoading ? '登入中...' : '登入'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <Dashboard onNavigate={setPage} />;
      case 'products': return <ProductManager />;
      case 'breeds': return <BreedManager />;
      case 'settings': return <SettingsManager />;
      case 'analytics': return <AnalyticsView />;
      case 'users': return <UserManager />;
      case 'ai': return <AiAssistant />;
      case 'certs': return <CertManager />;
      case 'audit': return <AuditLogPage />;
    }
  };

  return (
    <AuthContext.Provider value={{ token, role, username }}>
      <div className="min-h-screen bg-gray-50 flex">
        {/* Sidebar overlay for mobile */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-60 bg-davis-navy text-white flex flex-col transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-4 flex items-center justify-between border-b border-white/10">
            <h2 className="font-bold text-lg">Davis Admin</h2>
            <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 py-2 overflow-y-auto">
            {NAV.filter((item) => hasAccess(role, item.minRole)).map((item) => (
              <button
                key={item.id}
                onClick={() => { setPage(item.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                  page === item.id ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-white/10">
            <div className="text-xs text-white/40 mb-2">{username} ({role})</div>
            <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-white/60 hover:text-white">
              <LogOut size={16} />
              登出
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0">
          <header className="bg-white border-b px-4 py-3 flex items-center gap-3 lg:hidden">
            <button onClick={() => setSidebarOpen(true)}>
              <Menu size={24} className="text-davis-navy" />
            </button>
            <h1 className="font-bold text-davis-navy">Davis Admin</h1>
          </header>
          <div className="p-4 lg:p-6 max-w-6xl">
            {renderPage()}
          </div>
        </main>
      </div>
    </AuthContext.Provider>
  );
}
