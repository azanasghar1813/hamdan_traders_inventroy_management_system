import React, { lazy, Suspense, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import { AuthProvider, AuthContext } from './context/AuthContext';
import InstallPWA from './components/InstallPWA';
import ErrorBoundary from './components/ErrorBoundary';

// Helper to auto-retry dynamic import on fresh deployment if chunk hash changed
const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    const pageHasBeenForceRefreshed = sessionStorage.getItem('chunk_force_refreshed');

    try {
      const component = await componentImport();
      sessionStorage.removeItem('chunk_force_refreshed');
      return component;
    } catch (error) {
      if (!pageHasBeenForceRefreshed) {
        sessionStorage.setItem('chunk_force_refreshed', 'true');
        window.location.reload();
        return new Promise(() => {}); // prevent execution until reload completes
      }
      throw error;
    }
  });

// Code-split routes with auto-retry on new deployments
const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'));
const ProductsPage = lazyWithRetry(() => import('./pages/ProductsPage'));
const StockPage = lazyWithRetry(() => import('./pages/StockPage'));
const CustomersPage = lazyWithRetry(() => import('./pages/CustomersPage'));
const SuppliersPage = lazyWithRetry(() => import('./pages/SuppliersPage'));
const PurchasesPage = lazyWithRetry(() => import('./pages/PurchasesPage'));
const NewPurchasePage = lazyWithRetry(() => import('./pages/NewPurchasePage'));
const SalesPage = lazyWithRetry(() => import('./pages/SalesPage'));
const NewSalePage = lazyWithRetry(() => import('./pages/NewSalePage'));
const AlertsPage = lazyWithRetry(() => import('./pages/AlertsPage'));
const ReportsPage = lazyWithRetry(() => import('./pages/ReportsPage'));
const Invoice = lazyWithRetry(() => import('./pages/Invoice'));
const LoginPage = lazyWithRetry(() => import('./pages/LoginPage'));
const UsersPage = lazyWithRetry(() => import('./pages/UsersPage'));

const PageLoader = () => (
  <div className="flex h-64 items-center justify-center text-sm font-medium text-gray-500">
    <div className="animate-spin inline-block w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full mr-2.5"></div>
    Loading...
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div className="flex h-screen items-center justify-center font-medium text-gray-500">Loading Hamdan Traders...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <InstallPWA />
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

            <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="stock" element={<StockPage />} />

              <Route path="sales" element={<SalesPage />} />
              <Route path="sales/new" element={<NewSalePage />} />
              <Route path="invoice/sale/:id" element={<Invoice />} />

              <Route path="purchases" element={<PurchasesPage />} />
              <Route path="purchases/new" element={<NewPurchasePage />} />
              <Route path="invoice/purchase/:id" element={<Invoice />} />

              <Route path="customers" element={<CustomersPage />} />
              <Route path="suppliers" element={<SuppliersPage />} />
              <Route path="alerts" element={<AlertsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="users" element={<UsersPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        </ErrorBoundary>
      </Router>
    </AuthProvider>
  );
}

export default App;
