import { useState } from 'react';

/**
 * 🔴 TODO: Full admin rewrite
 * Migrate from original admin/index.html (72,566 bytes).
 * Includes: Dashboard, ProductManager, BreedManager, SettingsManager,
 *           AnalyticsView, UserManager, AiAssistant, CertManager.
 *
 * See rewrite-spec-v2.md §12 for full admin structure.
 */
export default function AdminApp() {
  const [token, setToken] = useState<string | null>(null);

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-sm">
          <h1 className="text-xl font-bold text-davis-navy mb-6">Davis Admin</h1>
          <form onSubmit={(e) => { e.preventDefault(); /* TODO: login */ }}>
            <input type="text" placeholder="Username" className="w-full mb-3 px-4 py-2 border rounded-lg" />
            <input type="password" placeholder="Password" className="w-full mb-4 px-4 py-2 border rounded-lg" />
            <button type="submit" className="btn-davis w-full">Login</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-4">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-gray-500">TODO: Implement admin panels</p>
      </div>
    </div>
  );
}
