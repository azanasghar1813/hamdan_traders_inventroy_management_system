import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { FiPlus, FiEye, FiXCircle, FiRefreshCw, FiDollarSign } from 'react-icons/fi';
import { format } from 'date-fns';

const SalesPage = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  // Payment Modal State
  const [paymentModalData, setPaymentModalData] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      const { data } = await api.get('/sales');
      setSales(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCancel = async (sale) => {
    const action = sale.isCancelled ? 'restore' : 'cancel';
    if (window.confirm(`Are you sure you want to ${action} Invoice ${sale.invoiceNumber}? This will automatically adjust stock levels and customer balance.`)) {
      try {
        await api.put(`/sales/${sale._id}/toggle-cancel`);
        fetchSales();
      } catch (err) {
        alert(err.response?.data?.message || `Error trying to ${action} sale`);
      }
    }
  };

  const openPaymentModal = (sale) => {
    setPaymentModalData(sale);
    setPaymentAmount('');
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/sales/${paymentModalData._id}/payment`, { amount: paymentAmount });
      setPaymentModalData(null);
      fetchSales();
    } catch (err) {
      alert(err.response?.data?.message || 'Error processing payment');
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Sales History</h1>
        <Link
          to="/sales/new"
          className="w-full sm:w-auto justify-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center shadow-sm"
        >
          <FiPlus className="mr-2" /> New Sale
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="8" className="px-6 py-10 text-center text-gray-500">
                  <div className="animate-pulse flex flex-col items-center">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="text-sm">Loading sales...</div>
                  </div>
                </td>
              </tr>
            ) : sales.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-10 text-center text-gray-500 text-sm">
                  No sales found.
                </td>
              </tr>
            ) : (
              sales.map((sale) => (
              <tr key={sale._id} className={`hover:bg-gray-50 ${sale.isCancelled ? 'bg-red-50 opacity-75' : ''}`}>
                <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${sale.isCancelled ? 'text-red-700 line-through' : 'text-gray-900'}`}>
                  {sale.invoiceNumber}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm ${sale.isCancelled ? 'text-red-600 line-through' : 'text-gray-500'}`}>
                  {format(new Date(sale.date), 'dd MMM yyyy, hh:mm a')}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm ${sale.isCancelled ? 'text-red-600 line-through' : 'text-gray-900'}`}>
                  {sale.customerId?.name}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${sale.isCancelled ? 'text-red-600 line-through' : ''}`}>
                  Rs. {sale.grandTotal.toLocaleString()}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${sale.isCancelled ? 'text-red-600 line-through' : 'text-green-600'}`}>
                  Rs. {sale.paid.toLocaleString()}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${sale.isCancelled ? 'text-red-600 line-through' : 'text-red-600'}`}>
                  Rs. {sale.remaining.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                  {sale.isCancelled ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                      CANCELLED
                    </span>
                  ) : (
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${sale.status === 'PAID' ? 'bg-green-100 text-green-800' : 
                        sale.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                      {sale.status}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link to={`/invoice/sale/${sale._id}`} className="text-gray-600 hover:text-blue-900 inline-block mr-4" title="View Invoice">
                    <FiEye size={18} />
                  </Link>
                  {!sale.isCancelled && sale.remaining > 0 && (
                    <button 
                      onClick={() => openPaymentModal(sale)}
                      className="text-green-600 hover:text-green-900 inline-block mr-4"
                      title="Add Payment"
                    >
                      <FiDollarSign size={18} />
                    </button>
                  )}
                  <button 
                    onClick={() => handleToggleCancel(sale)}
                    className={`${sale.isCancelled ? 'text-green-600 hover:text-green-900' : 'text-red-600 hover:text-red-900'} inline-block`}
                    title={sale.isCancelled ? "Restore Sale" : "Cancel Sale"}
                  >
                    {sale.isCancelled ? <FiRefreshCw size={18} /> : <FiXCircle size={18} />}
                  </button>
                </td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>

      {paymentModalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                Add Payment
              </h3>
              <button onClick={() => setPaymentModalData(null)} className="text-gray-400 hover:text-gray-500">&times;</button>
            </div>
            
            <form onSubmit={handlePaymentSubmit} className="px-6 py-4">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-1">Invoice: <span className="font-semibold">{paymentModalData.invoiceNumber}</span></p>
                <p className="text-sm text-gray-600 mb-1">Customer: <span className="font-semibold">{paymentModalData.customerId?.name}</span></p>
                <p className="text-sm text-red-600 mb-4">Remaining Balance: <span className="font-bold">Rs. {paymentModalData.remaining.toLocaleString()}</span></p>

                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount (Rs.) *</label>
                <input 
                  type="number" 
                  required 
                  min="1"
                  max={paymentModalData.remaining}
                  value={paymentAmount} 
                  onChange={e => setPaymentAmount(e.target.value)} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500" 
                  placeholder="Enter amount..."
                />
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setPaymentModalData(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 shadow-sm"
                >
                  Save Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesPage;
