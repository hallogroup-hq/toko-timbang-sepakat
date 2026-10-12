import React, { useState, useEffect } from 'react';
import { ToastProvider } from './components/Toast.tsx';
import { Navbar } from './components/Navbar.tsx';
import { MobileBottomNav } from './components/MobileBottomNav.tsx';
import { Footer } from './components/Footer.tsx';

// Public Pages
import { HomePage } from './pages/HomePage.tsx';
import { CatalogPage } from './pages/CatalogPage.tsx';
import { ProductDetailPage } from './pages/ProductDetailPage.tsx';
import { CartPage } from './pages/CartPage.tsx';
import { CheckoutPage } from './pages/CheckoutPage.tsx';
import { InfoPage } from './pages/InfoPage.tsx';

// Admin Pages
import { AdminLayout } from './pages/admin/AdminLayout.tsx';
import { AdminLoginPage } from './pages/admin/AdminLoginPage.tsx';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage.tsx';
import { AdminProductsPage } from './pages/admin/AdminProductsPage.tsx';
import { AdminPricingPage } from './pages/admin/AdminPricingPage.tsx';
import { AdminImportPage } from './pages/admin/AdminImportPage.tsx';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage.tsx';
import { AdminImagesPage } from './pages/admin/AdminImagesPage.tsx';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage.tsx';

export const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState(window.location.pathname || '/');
  const [adminUser, setAdminUser] = useState<any | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Parse query params
  const [queryParams, setQueryParams] = useState<Record<string, string>>(() => {
    const params = new URLSearchParams(window.location.search);
    const obj: Record<string, string> = {};
    params.forEach((val, key) => {
      obj[key] = val;
    });
    return obj;
  });

  const navigate = (path: string, query?: Record<string, string>) => {
    let url = path;
    if (query && Object.keys(query).length > 0) {
      const q = new URLSearchParams(query).toString();
      url += `?${q}`;
      setQueryParams(query);
    } else {
      setQueryParams({});
    }

    window.history.pushState({}, '', url);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
      const params = new URLSearchParams(window.location.search);
      const obj: Record<string, string> = {};
      params.forEach((val, key) => {
        obj[key] = val;
      });
      setQueryParams(obj);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Check admin session when in admin route
  useEffect(() => {
    if (currentPath.startsWith('/admin')) {
      fetch('/api/admin/auth/me')
        .then((r) => {
          if (r.ok) return r.json();
          throw new Error('Not logged in');
        })
        .then((res) => {
          if (res.user) setAdminUser(res.user);
        })
        .catch(() => {
          setAdminUser(null);
        })
        .finally(() => setCheckingAuth(false));
    } else {
      setCheckingAuth(false);
    }
  }, [currentPath]);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
    } finally {
      setAdminUser(null);
      navigate('/admin/login');
    }
  };

  // Admin routing
  if (currentPath.startsWith('/admin')) {
    if (currentPath === '/admin/login') {
      return (
        <ToastProvider>
          <AdminLoginPage
            onLoginSuccess={(user) => {
              setAdminUser(user);
              navigate('/admin');
            }}
            onNavigateHome={() => navigate('/')}
          />
        </ToastProvider>
      );
    }

    if (checkingAuth) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 text-xs text-zinc-400">
          Memeriksa sesi admin...
        </div>
      );
    }

    if (!adminUser) {
      return (
        <ToastProvider>
          <AdminLoginPage
            onLoginSuccess={(user) => {
              setAdminUser(user);
              navigate('/admin');
            }}
            onNavigateHome={() => navigate('/')}
          />
        </ToastProvider>
      );
    }

    let adminContent = <AdminDashboardPage onNavigate={navigate} />;
    if (currentPath === '/admin/produk') {
      adminContent = <AdminProductsPage />;
    } else if (currentPath === '/admin/harga') {
      adminContent = <AdminPricingPage />;
    } else if (currentPath === '/admin/import') {
      adminContent = <AdminImportPage />;
    } else if (currentPath === '/admin/foto') {
      adminContent = <AdminImagesPage />;
    } else if (currentPath === '/admin/permintaan' || currentPath === '/admin/pesanan') {
      adminContent = <AdminOrdersPage />;
    } else if (currentPath === '/admin/pengaturan') {
      adminContent = <AdminSettingsPage />;
    }

    return (
      <ToastProvider>
        <AdminLayout
          currentPath={currentPath}
          adminUser={adminUser}
          onNavigate={navigate}
          onLogout={handleLogout}
        >
          {adminContent}
        </AdminLayout>
      </ToastProvider>
    );
  }

  // Public routing
  let publicPage = <HomePage onNavigate={navigate} />;

  if (currentPath === '/produk') {
    publicPage = (
      <CatalogPage
        initialQuery={queryParams.q || ''}
        initialCategory={queryParams.category || ''}
        onNavigate={navigate}
      />
    );
  } else if (currentPath.startsWith('/produk/')) {
    const slug = currentPath.replace('/produk/', '');
    publicPage = <ProductDetailPage slug={slug} onNavigate={navigate} />;
  } else if (currentPath === '/keranjang') {
    publicPage = <CartPage onNavigate={navigate} />;
  } else if (currentPath === '/checkout') {
    publicPage = <CheckoutPage onNavigate={navigate} />;
  } else if (currentPath === '/informasi') {
    publicPage = <InfoPage onNavigate={navigate} />;
  }

  return (
    <ToastProvider>
      <div className="min-h-screen flex flex-col bg-zinc-50 text-zinc-900">
        <Navbar currentPath={currentPath} onNavigate={navigate} />
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 pt-4 sm:pt-6">
          {publicPage}
        </main>
        <Footer onNavigate={navigate} />
        <MobileBottomNav currentPath={currentPath} onNavigate={navigate} />
      </div>
    </ToastProvider>
  );
};

export default App;
