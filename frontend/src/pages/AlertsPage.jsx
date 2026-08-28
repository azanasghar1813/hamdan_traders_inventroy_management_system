import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { FiAlertTriangle, FiClock } from 'react-icons/fi';
import { format, differenceInDays } from 'date-fns';

const AlertsPage = () => {
  const [lowStock, setLowStock] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const { data } = await api.get('/alerts');
      setLowStock(data.data.lowStock);
      setExpiring(data.data.expiring);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-10">Loading alerts...</div>;

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Inventory Alerts</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Low Stock Section */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="bg-red-50 border-b border-red-100 px-6 py-4 flex items-center">
            <FiAlertTriangle className="text-red-500 text-xl mr-3" />
            <h2 className="text-lg font-bold text-red-800">Low Stock Alerts ({lowStock.length})</h2>
          </div>
          
          <div className="p-0 overflow-y-auto max-h-96">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stock</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Min Required</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {lowStock.map(item => (
                  <tr key={item._id} className="hover:bg-red-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{item.name}</div>
                      <div className="text-xs text-gray-500">{item.sku}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600 text-right">
                      {item.currentStock} {item.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                      {item.minimumStock} {item.unit}
                    </td>
                  </tr>
                ))}
                {lowStock.length === 0 && (
                  <tr>
                    <td colSpan="3" className="px-6 py-8 text-center text-gray-500 text-sm">
                      All products are sufficiently stocked.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Expiry Section */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="bg-yellow-50 border-b border-yellow-100 px-6 py-4 flex items-center">
            <FiClock className="text-yellow-600 text-xl mr-3" />
            <h2 className="text-lg font-bold text-yellow-800">Approaching Expiry ({expiring.length})</h2>
          </div>
          
          <div className="p-0 overflow-y-auto max-h-96">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stock</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Expires In</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {expiring.map(item => {
                  const daysLeft = differenceInDays(new Date(item.expiryDate), new Date());
                  const isExpired = daysLeft < 0;

                  return (
                    <tr key={item._id} className={isExpired ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-yellow-50'}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                        <div className="text-xs text-gray-500">{format(new Date(item.expiryDate), 'dd MMM yyyy')}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                        {item.currentStock} {item.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        {isExpired ? (
                          <span className="text-red-600 font-bold">Expired {Math.abs(daysLeft)} days ago</span>
                        ) : (
                          <span className="text-yellow-700 font-bold">{daysLeft} days</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {expiring.length === 0 && (
                  <tr>
                    <td colSpan="3" className="px-6 py-8 text-center text-gray-500 text-sm">
                      No products are expiring within the next 30 days.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AlertsPage;
