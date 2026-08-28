import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiBox, FiAlertTriangle, FiDollarSign, FiShoppingCart, FiArrowRight } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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

  const { summary, recentSales, chartData } = stats;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Overview</h1>
        <div className="flex gap-3">
          <Link to="/sales/new" className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 shadow-sm">
            + New Sale
          </Link>
          <Link to="/purchases/new" className="px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-200 shadow-sm">
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
        
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Sales Trend (Last 7 Days)</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{fontSize: 12}} tickFormatter={(val) => val.split('-').slice(1).join('/')} />
                <YAxis tick={{fontSize: 12}} tickFormatter={(val) => `Rs ${val/1000}k`} />
                <Tooltip 
                  formatter={(value) => [`Rs. ${value.toLocaleString()}`, 'Sales']}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
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
    </div>
  );
};

export default Dashboard;
