import React, { lazy, Suspense, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import { AuthProvider, AuthContext } from './context/AuthContext';
import InstallPWA from './components/InstallPWA';

// Code-split routes with React.lazy for ultra-fast initial load times
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const StockPage = lazy(() => import('./pages/StockPage'));
const CustomersPage = lazy(() => import('./pages/CustomersPage'));
const SuppliersPage = lazy(() => import('./pages/SuppliersPage'));
const PurchasesPage = lazy(() => import('./pages/PurchasesPage'));
const NewPurchasePage = lazy(() => import('./pages/NewPurchasePage'));
const SalesPage = lazy(() => import('./pages/SalesPage'));
const NewSalePage = lazy(() => import('./pages/NewSalePage'));
const AlertsPage = lazy(() => import('./pages/AlertsPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const Invoice = lazy(() => import('./pages/Invoice'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));

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
      </Router>
    </AuthProvider>
  );
}

export default App;
