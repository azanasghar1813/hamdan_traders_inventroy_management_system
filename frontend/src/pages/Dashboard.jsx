import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiBox, FiAlertTriangle, FiDollarSign, FiShoppingCart, FiArrowRight } from 'react-icons/fi';

import api from '../services/api';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const { data } = await api.get('/dashboard');
      setStats(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-10">Loading dashboard...</div>;
  if (!stats) return <div className="text-center py-10 text-red-500">Failed to load data.</div>;

  const { summary, recentSales, lowStockProducts, allProductsStock } = stats;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Overview</h1>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <Link to="/sales/new" className="flex-1 sm:flex-none text-center px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 shadow-sm">
            + New Sale
          </Link>
          <Link to="/purchases/new" className="flex-1 sm:flex-none text-center px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-200 shadow-sm">
            + New Purchase
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border-t-4 border-blue-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
              <FiBox className="text-xl" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Products</p>
              <p className="text-2xl font-bold text-gray-900">{summary.totalProducts}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-t-4 border-red-500 cursor-pointer hover:bg-gray-50 transition" onClick={() => window.location.href='/alerts'}>
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100 text-red-600 mr-4">
              <FiAlertTriangle className="text-xl" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Low Stock Alerts</p>
              <p className="text-2xl font-bold text-gray-900">{summary.lowStockCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-t-4 border-green-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
              <FiDollarSign className="text-xl" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Today's Sales</p>
              <p className="text-2xl font-bold text-gray-900">Rs. {summary.todaySalesAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-t-4 border-purple-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600 mr-4">
              <FiShoppingCart className="text-xl" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Monthly Sales</p>
              <p className="text-2xl font-bold text-gray-900">Rs. {summary.monthlySalesAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Low Stock Warnings */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6 border-t-4 border-red-500">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center">
              <FiAlertTriangle className="mr-2 text-red-500" /> Low Stock Warnings
            </h2>
            <Link to="/stock" className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
              View all <FiArrowRight className="ml-1" />
            </Link>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stock</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Min Stock</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {lowStockProducts && lowStockProducts.map(product => (
                  <tr key={product._id}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold text-red-600">
                      {product.currentStock} {product.unit}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-500">
                      {product.minimumStock} {product.unit}
                    </td>
                  </tr>
                ))}
                {(!lowStockProducts || lowStockProducts.length === 0) && (
                  <tr>
                    <td colSpan="3" className="px-4 py-8 text-center text-gray-500 text-sm">
                      No low stock warnings. All products are sufficiently stocked.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-800">Recent Sales</h2>
            <Link to="/sales" className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
              View all <FiArrowRight className="ml-1" />
            </Link>
          </div>
          <div className="space-y-4">
            {recentSales.map((sale) => (
              <div key={sale._id} className="flex justify-between items-center border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="text-sm font-bold text-gray-800">{sale.invoiceNumber}</p>
                  <p className="text-xs text-gray-500">{sale.customerId?.name || 'Unknown'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-600">Rs. {sale.grandTotal.toLocaleString()}</p>
                  <p className="text-[10px] text-gray-400">{new Date(sale.date).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
            {recentSales.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No recent sales.</p>
            )}
          </div>
        </div>
      </div>

      {/* Product Stock Cards */}
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
          <FiBox className="mr-2 text-blue-500" /> Current Inventory Overview
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {allProductsStock && allProductsStock.map(product => (
            <div key={product._id} className="bg-white rounded-lg shadow border border-gray-100 p-4 flex flex-col items-center justify-center text-center hover:shadow-md transition">
              <h3 className="text-sm font-bold text-gray-800 mb-2 truncate w-full">{product.name}</h3>
              <div className="text-2xl font-black text-blue-600 mb-1">{product.currentStock}</div>
              <p className="text-xs font-medium text-gray-500 uppercase">{product.unit}</p>
            </div>
          ))}
          {(!allProductsStock || allProductsStock.length === 0) && (
             <div className="col-span-full py-6 text-center text-gray-500 bg-white rounded-lg shadow">
               No products available.
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
