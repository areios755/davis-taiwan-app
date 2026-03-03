import { Routes, Route } from 'react-router-dom';
import { useEmbed } from '@/hooks/useEmbed';

// Layouts
import MainLayout from '@/components/layout/MainLayout';

// Pages
import HomePage from '@/pages/HomePage';
import AnalyzePage from '@/pages/AnalyzePage';
import ProductsPage from '@/pages/ProductsPage';
import ProductDetailPage from '@/pages/ProductDetailPage';
import GroomersPage from '@/pages/GroomersPage';
import CertifyPage from '@/pages/CertifyPage';
import VerifyPage from '@/pages/VerifyPage';
import ShareViewPage from '@/pages/ShareViewPage';

// Admin (lazy loaded)
import AdminApp from '@/admin/AdminApp';

export default function App() {
  const { isEmbed } = useEmbed();

  // Embed mode: show only the analyze page with minimal chrome
  if (isEmbed) {
    return <AnalyzePage />;
  }

  return (
    <Routes>
      {/* Public routes with main layout */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/analyze" element={<AnalyzePage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/:id" element={<ProductDetailPage />} />
        <Route path="/groomers" element={<GroomersPage />} />
        <Route path="/groomers/:id" element={<VerifyPage />} />
        <Route path="/certify" element={<CertifyPage />} />
        <Route path="/verify/:id" element={<VerifyPage />} />
        <Route path="/r/:id" element={<ShareViewPage />} />
      </Route>

      {/* Admin routes (separate layout) */}
      <Route path="/admin/*" element={<AdminApp />} />
    </Routes>
  );
}
