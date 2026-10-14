import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiBox, FiAlertTriangle, FiDollarSign, FiShoppingCart, FiArrowRight } from 'react-icons/fi';

import api from '../services/api';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nextNumbers, setNextNumbers] = useState({ sale: null, purchase: null });

  useEffect(() => {
    let ignore = false;
    const loadDashboard = async () => {
      try {
        const [dashRes, saleNumRes, purNumRes] = await Promise.all([
          api.get('/dashboard'),
          api.get('/sales/next-number').catch(() => ({ data: { data: null } })),
          api.get('/purchases/next-number').catch(() => ({ data: { data: null } }))
        ]);
        if (!ignore) {
          setStats(dashRes.data.data);
          setNextNumbers({
            sale: saleNumRes.data?.data,
            purchase: purNumRes.data?.data
          });
        }
      } catch (err) {
        if (!ignore) console.error(err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadDashboard();
    return () => {
      ignore = true;
    };
  }, []);

  if (loading) return <div className="text-center py-10">Loading dashboard...</div>;
  if (!stats) return <div className="text-center py-10 text-red-500">Failed to load data.</div>;

  const { summary, recentSales, allProductsStock } = stats;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Overview</h1>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <Link
            to="/sales/new"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 shadow-sm active:scale-95 transition-all"
          >
            <span>+ New Sale</span>
            {nextNumbers.sale?.nextNumber && (
              <span className="text-xs bg-blue-700/90 text-blue-100 px-1.5 py-0.5 rounded font-mono">
                {nextNumbers.sale.nextNumber}
              </span>
            )}
          </Link>
          <Link
            to="/purchases/new"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-200 shadow-sm active:scale-95 transition-all"
          >
            <span>+ New Purchase</span>
            {nextNumbers.purchase?.nextNumber && (
              <span className="text-xs bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded font-mono">
                {nextNumbers.purchase.nextNumber}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Summary Cards - Single Horizontal Line on Mobile, Grid on Tablet/Desktop */}
      <div className="flex overflow-x-auto no-scrollbar gap-3 pb-1 md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-6 snap-x">
        {/* Card 1: Total Products */}
        <div className="min-w-[145px] sm:min-w-[170px] flex-1 shrink-0 snap-start bg-white rounded-xl shadow-xs p-3.5 sm:p-5 border-t-4 border-blue-500">
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <div className="p-2 sm:p-3 rounded-full bg-blue-100 text-blue-600 shrink-0">
              <FiBox className="text-base sm:text-xl" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-500 truncate">Total Products</p>
              <p className="text-base sm:text-2xl font-bold text-gray-900 truncate">{summary.totalProducts}</p>
            </div>
          </div>
        </div>

        {/* Card 2: Low Stock Alerts */}
        <div
          className="min-w-[145px] sm:min-w-[170px] flex-1 shrink-0 snap-start bg-white rounded-xl shadow-xs p-3.5 sm:p-5 border-t-4 border-red-500 cursor-pointer hover:bg-gray-50 transition"
          onClick={() => (window.location.href = '/alerts')}
        >
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <div className="p-2 sm:p-3 rounded-full bg-red-100 text-red-600 shrink-0">
              <FiAlertTriangle className="text-base sm:text-xl" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-500 truncate">Low Stock Alerts</p>
              <p className="text-base sm:text-2xl font-bold text-gray-900 truncate">{summary.lowStockCount}</p>
            </div>
          </div>
        </div>

        {/* Card 3: Today's Sales */}
        <div className="min-w-[145px] sm:min-w-[170px] flex-1 shrink-0 snap-start bg-white rounded-xl shadow-xs p-3.5 sm:p-5 border-t-4 border-green-500">
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <div className="p-2 sm:p-3 rounded-full bg-green-100 text-green-600 shrink-0">
              <FiDollarSign className="text-base sm:text-xl" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-500 truncate">Today's Sales</p>
              <p className="text-base sm:text-2xl font-bold text-gray-900 truncate">
                Rs. {summary.todaySalesAmount.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Card 4: Monthly Sales */}
        <div className="min-w-[145px] sm:min-w-[170px] flex-1 shrink-0 snap-start bg-white rounded-xl shadow-xs p-3.5 sm:p-5 border-t-4 border-purple-500">
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <div className="p-2 sm:p-3 rounded-full bg-purple-100 text-purple-600 shrink-0">
              <FiShoppingCart className="text-base sm:text-xl" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-500 truncate">Monthly Sales</p>
              <p className="text-base sm:text-2xl font-bold text-gray-900 truncate">
                Rs. {summary.monthlySalesAmount.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Small Secondary Metrics & Cancelled Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-red-200 p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-red-600 uppercase tracking-wider block">Cancelled Sales</span>
            <p className="text-lg font-bold text-red-700 mt-0.5">Rs. {(summary.cancelledSalesAmount || 0).toLocaleString()}</p>
            <span className="text-[11px] text-gray-400">This Month (Excluded)</span>
          </div>
          <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
            {summary.cancelledSalesCount || 0} orders
          </span>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-orange-200 p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-orange-600 uppercase tracking-wider block">Cancelled Purchases</span>
            <p className="text-lg font-bold text-orange-700 mt-0.5">Rs. {(summary.cancelledPurchasesAmount || 0).toLocaleString()}</p>
            <span className="text-[11px] text-gray-400">This Month (Excluded)</span>
          </div>
          <span className="px-2.5 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">
            {summary.cancelledPurchasesCount || 0} orders
          </span>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-indigo-200 p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider block">Monthly Purchases</span>
            <p className="text-lg font-bold text-indigo-900 mt-0.5">Rs. {(summary.monthlyPurchasesAmount || 0).toLocaleString()}</p>
            <span className="text-[11px] text-gray-400">Active Purchases</span>
          </div>
          <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 text-xs font-semibold rounded-full">
            Active
          </span>
        </div>
      </div>

      {/* Recent Sales Section (with scroller if > 5 items, up to 20 sales) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-blue-50 text-blue-600">
              <FiShoppingCart className="w-4 h-4" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-gray-800">Recent Sales</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {recentSales.length}
            </span>
          </div>
          <Link to="/sales" className="text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center">
            View all <FiArrowRight className="ml-1" />
          </Link>
        </div>

        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {recentSales.map((sale) => (
            <div
              key={sale._id}
              className="flex justify-between items-center p-2.5 rounded-lg hover:bg-gray-50 transition border border-gray-100"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-bold ${sale.isCancelled ? 'text-red-600 line-through' : 'text-gray-900'}`}>
                    {sale.invoiceNumber}
                  </p>
                  {sale.isCancelled && (
                    <span className="px-1.5 py-0.5 text-[10px] bg-red-100 text-red-700 font-bold rounded">
                      Cancelled
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 font-medium">{sale.customerId?.name || 'Walk-in Customer'}</p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${sale.isCancelled ? 'text-red-500 line-through' : 'text-emerald-700'}`}>
                  Rs. {sale.grandTotal.toLocaleString()}
                </p>
                <p className="text-[11px] text-gray-400 font-medium">{new Date(sale.date).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
          {recentSales.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-6">No recent sales.</p>
          )}
        </div>
      </div>

      {/* Upgraded Current Inventory Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-blue-50 text-blue-600">
              <FiBox className="w-4 h-4" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-gray-800">Current Inventory Overview</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {allProductsStock?.length || 0} Products
            </span>
          </div>
          <Link to="/stock" className="text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center">
            Manage Stock <FiArrowRight className="ml-1" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
          {allProductsStock && allProductsStock.map((product) => {
            const isWarning = (product.currentStock || 0) <= (product.minimumStock || 0);
            return (
              <div
                key={product._id}
                className={`rounded-xl p-3.5 border transition-all shadow-xs flex flex-col justify-between ${
                  isWarning
                    ? 'bg-red-50/40 border-red-300 hover:border-red-400 hover:shadow-sm'
                    : 'bg-emerald-50/20 border-emerald-200 hover:border-emerald-300 hover:shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-1.5 mb-2">
                    <h3 className="text-sm font-bold text-gray-900 truncate" title={product.name}>
                      {product.name}
                    </h3>
                    <span
                      className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full shrink-0 uppercase tracking-wider ${
                        isWarning
                          ? 'bg-red-100 text-red-700 border border-red-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {isWarning ? 'Low Stock' : 'In Stock'}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xs font-medium text-gray-500">Current Stock:</span>
                    <span
                      className={`text-lg font-black ${
                        isWarning ? 'text-red-600' : 'text-emerald-700'
                      }`}
                    >
                      {product.currentStock?.toLocaleString() || 0}
                      <span className="text-xs font-semibold text-gray-500 ml-1 uppercase">{product.unit || ''}</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 mt-1 pt-1.5 border-t border-gray-100/80">
                    <span className="text-[11px] font-medium text-gray-400">Min Stock:</span>
                    <span className="font-semibold text-gray-700">
                      {product.minimumStock?.toLocaleString() || 0} {product.unit || ''}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          {(!allProductsStock || allProductsStock.length === 0) && (
            <div className="col-span-full py-8 text-center text-gray-500 bg-gray-50 rounded-lg">
              No products available in inventory.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
