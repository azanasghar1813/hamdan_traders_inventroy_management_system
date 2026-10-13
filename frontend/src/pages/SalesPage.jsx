import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { 
  FiPlus, 
  FiEye, 
  FiXCircle, 
  FiRefreshCw, 
  FiDollarSign, 
  FiSearch, 
  FiFilter, 
  FiArrowUp, 
  FiArrowDown, 
  FiX, 
  FiCalendar 
} from 'react-icons/fi';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

const SalesPage = () => {
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search parameters support (e.g. /sales?customerId=...)
  const [searchParams, setSearchParams] = useSearchParams();
  const urlCustomerId = searchParams.get('customerId') || '';

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState(urlCustomerId);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Sorting States
  const [sortField, setSortField] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'

  const [paymentModalData, setPaymentModalData] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  const fetchSalesAndCustomers = async () => {
    try {
      const [salesRes, custRes] = await Promise.all([
        api.get('/sales'),
        api.get('/customers')
      ]);
      setSales(salesRes.data.data);
      setCustomers(custRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const [salesRes, custRes] = await Promise.all([
          api.get('/sales'),
          api.get('/customers')
        ]);
        if (!ignore) {
          setSales(salesRes.data.data);
          setCustomers(custRes.data.data);
        }
      } catch (err) {
        if (!ignore) console.error(err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const handleToggleCancel = async (sale) => {
    const action = sale.isCancelled ? 'restore' : 'cancel';
    if (window.confirm(`Are you sure you want to ${action} Invoice ${sale.invoiceNumber}? This will automatically adjust stock levels and customer balance.`)) {
      try {
        await api.put(`/sales/${sale._id}/toggle-cancel`);
        fetchSalesAndCustomers();
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
      fetchSalesAndCustomers();
    } catch (err) {
      alert(err.response?.data?.message || 'Error processing payment');
    }
  };

  // Quick Date Presets
  const handleDatePreset = (preset) => {
    const today = new Date();
    if (preset === 'TODAY') {
      const formatted = format(today, 'yyyy-MM-dd');
      setStartDate(formatted);
      setEndDate(formatted);
    } else if (preset === 'WEEK') {
      setStartDate(format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
      setEndDate(format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
    } else if (preset === 'MONTH') {
      setStartDate(format(startOfMonth(today), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(today), 'yyyy-MM-dd'));
    } else if (preset === 'CLEAR') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Toggle Sorting
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedCustomerId('');
    setStatusFilter('ALL');
    setStartDate('');
    setEndDate('');
    setSearchParams({});
  };

  const hasActiveFilters = Boolean(
    searchQuery || selectedCustomerId || statusFilter !== 'ALL' || startDate || endDate
  );

  // Filtered and Sorted Sales Memo
  const filteredSales = useMemo(() => {
    return sales
      .filter((sale) => {
        // Customer filter
        if (selectedCustomerId) {
          const custId = sale.customerId?._id || sale.customerId;
          if (custId !== selectedCustomerId) return false;
        }

        // Status filter
        if (statusFilter !== 'ALL') {
          if (statusFilter === 'CANCELLED') {
            if (!sale.isCancelled) return false;
          } else {
            if (sale.isCancelled || sale.status !== statusFilter) return false;
          }
        }

        // Search query (invoice # or customer name)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const invMatch = sale.invoiceNumber?.toLowerCase().includes(q);
          const custMatch = sale.customerId?.name?.toLowerCase().includes(q);
          if (!invMatch && !custMatch) return false;
        }

        // Date range filter
        if (startDate || endDate) {
          const saleDate = new Date(sale.date);
          if (startDate) {
            const start = startOfDay(new Date(startDate));
            if (saleDate < start) return false;
          }
          if (endDate) {
            const end = endOfDay(new Date(endDate));
            if (saleDate > end) return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        let valA, valB;
        if (sortField === 'date') {
          valA = new Date(a.date).getTime();
          valB = new Date(b.date).getTime();
        } else if (sortField === 'invoiceNumber') {
          valA = a.invoiceNumber || '';
          valB = b.invoiceNumber || '';
        } else if (sortField === 'customer') {
          valA = (a.customerId?.name || '').toLowerCase();
          valB = (b.customerId?.name || '').toLowerCase();
        } else if (sortField === 'total') {
          valA = Number(a.grandTotal || 0);
          valB = Number(b.grandTotal || 0);
        } else if (sortField === 'paid') {
          valA = Number(a.paid || 0);
          valB = Number(b.paid || 0);
        } else if (sortField === 'remaining') {
          valA = Number(a.remaining || 0);
          valB = Number(b.remaining || 0);
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [sales, selectedCustomerId, statusFilter, searchQuery, startDate, endDate, sortField, sortOrder]);

  // Summary Metrics for filtered sales
  const summary = useMemo(() => {
    let grandTotal = 0;
    let paid = 0;
    let remaining = 0;
    let cancelledCount = 0;
    let cancelledTotal = 0;

    filteredSales.forEach((s) => {
      if (s.isCancelled) {
        cancelledCount += 1;
        cancelledTotal += Number(s.grandTotal || 0);
      } else {
        grandTotal += Number(s.grandTotal || 0);
        paid += Number(s.paid || 0);
        remaining += Number(s.remaining || 0);
      }
    });

    return {
      activeCount: filteredSales.filter(s => !s.isCancelled).length,
      cancelledCount,
      cancelledTotal,
      grandTotal,
      paid,
      remaining
    };
  }, [filteredSales]);

  // Render Sort Header Indicator
  const renderSortIndicator = (field) => {
    if (sortField !== field) {
      return <span className="opacity-30 ml-1 text-xs">↕</span>;
    }
    return sortOrder === 'asc' ? (
      <FiArrowUp className="inline ml-1 text-blue-600 text-xs" />
    ) : (
      <FiArrowDown className="inline ml-1 text-blue-600 text-xs" />
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Sales History</h1>
          <p className="text-xs text-gray-500 mt-0.5">Filter, search, and track all customer sales invoices</p>
        </div>
        <Link
          to="/sales/new"
          className="w-full sm:w-auto justify-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center shadow-sm font-medium transition-colors"
        >
          <FiPlus className="mr-2" /> New Sale
        </Link>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <div className="bg-white p-3.5 rounded-lg shadow-sm border border-gray-200">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Invoices</span>
          <p className="text-xl font-bold text-gray-900 mt-1">{summary.activeCount}</p>
          <span className="text-[10px] text-gray-400">Total matched</span>
        </div>
        <div className="bg-white p-3.5 rounded-lg shadow-sm border border-gray-200">
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Total Sales</span>
          <p className="text-xl font-bold text-blue-900 mt-1">Rs. {summary.grandTotal.toLocaleString()}</p>
          <span className="text-[10px] text-gray-400">Active only</span>
        </div>
        <div className="bg-white p-3.5 rounded-lg shadow-sm border border-gray-200">
          <span className="text-xs font-semibold text-green-600 uppercase tracking-wider">Total Paid</span>
          <p className="text-xl font-bold text-green-900 mt-1">Rs. {summary.paid.toLocaleString()}</p>
          <span className="text-[10px] text-gray-400">Received</span>
        </div>
        <div className="bg-white p-3.5 rounded-lg shadow-sm border border-gray-200">
          <span className="text-xs font-semibold text-yellow-600 uppercase tracking-wider">Total Remaining</span>
          <p className="text-xl font-bold text-yellow-900 mt-1">Rs. {summary.remaining.toLocaleString()}</p>
          <span className="text-[10px] text-gray-400">Outstanding</span>
        </div>
        <div className="bg-white p-3.5 rounded-lg shadow-sm border border-red-200">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-red-600 uppercase tracking-wider">Cancelled Sales</span>
            <span className="px-1.5 py-0.2 bg-red-100 text-red-700 text-[10px] font-bold rounded-full">
              {summary.cancelledCount}
            </span>
          </div>
          <p className="text-xl font-bold text-red-700 mt-1">Rs. {summary.cancelledTotal.toLocaleString()}</p>
          <span className="text-[10px] text-red-400">Excluded from sales</span>
        </div>
      </div>

      {/* Filter & Sorting Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between mb-3 border-b pb-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <FiFilter className="text-blue-600" />
            <span>Filters & Search</span>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-xs text-red-600 hover:text-red-800 font-medium flex items-center gap-1 hover:underline cursor-pointer"
            >
              <FiX className="w-3.5 h-3.5" /> Clear All Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search by Invoice # or Customer */}
          <div className="relative">
            <label className="block text-xs font-medium text-gray-600 mb-1">Search</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Invoice # or customer name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <FiSearch className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
            </div>
          </div>

          {/* Customer Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Customer</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => {
                setSelectedCustomerId(e.target.value);
                if (e.target.value) {
                  setSearchParams({ customerId: e.target.value });
                } else {
                  setSearchParams({});
                }
              }}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            >
              <option value="">All Customers</option>
              {customers.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="PAID">Paid</option>
              <option value="PARTIAL">Partial</option>
              <option value="UNPAID">Unpaid</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Quick Sort Dropdown */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Sort By</label>
            <select
              value={`${sortField}-${sortOrder}`}
              onChange={(e) => {
                const [f, o] = e.target.value.split('-');
                setSortField(f);
                setSortOrder(o);
              }}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            >
              <option value="date-desc">Date (Newest First)</option>
              <option value="date-asc">Date (Oldest First)</option>
              <option value="total-desc">Total (High to Low)</option>
              <option value="total-asc">Total (Low to High)</option>
              <option value="remaining-desc">Remaining (High to Low)</option>
              <option value="remaining-asc">Remaining (Low to High)</option>
              <option value="customer-asc">Customer Name (A-Z)</option>
              <option value="customer-desc">Customer Name (Z-A)</option>
              <option value="invoiceNumber-asc">Invoice # (Ascending)</option>
              <option value="invoiceNumber-desc">Invoice # (Descending)</option>
            </select>
          </div>
        </div>

        {/* Date Range & Quick Presets */}
        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-medium text-gray-600 flex items-center gap-1">
              <FiCalendar className="text-gray-400" /> Date Range:
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
            />
            <span className="text-xs text-gray-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
            />
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => handleDatePreset('CLEAR')}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                Clear Date
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400 mr-1">Presets:</span>
            <button
              type="button"
              onClick={() => handleDatePreset('TODAY')}
              className="px-2 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handleDatePreset('WEEK')}
              className="px-2 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
            >
              This Week
            </button>
            <button
              type="button"
              onClick={() => handleDatePreset('MONTH')}
              className="px-2 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
            >
              This Month
            </button>
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 responsive-table">
          <thead className="bg-gray-50">
            <tr>
              <th
                onClick={() => handleSort('invoiceNumber')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none"
              >
                Invoice #{renderSortIndicator('invoiceNumber')}
              </th>
              <th
                onClick={() => handleSort('date')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none"
              >
                Date{renderSortIndicator('date')}
              </th>
              <th
                onClick={() => handleSort('customer')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none"
              >
                Customer{renderSortIndicator('customer')}
              </th>
              <th
                onClick={() => handleSort('total')}
                className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none"
              >
                Total{renderSortIndicator('total')}
              </th>
              <th
                onClick={() => handleSort('paid')}
                className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none"
              >
                Paid{renderSortIndicator('paid')}
              </th>
              <th
                onClick={() => handleSort('remaining')}
                className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none"
              >
                Remaining{renderSortIndicator('remaining')}
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                Actions
              </th>
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
            ) : filteredSales.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-10 text-center text-gray-500 text-sm">
                  {hasActiveFilters ? (
                    <div>
                      <p className="font-medium text-gray-700">No sales match your active filters.</p>
                      <button
                        onClick={clearAllFilters}
                        className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-semibold underline"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  ) : (
                    'No sales found.'
                  )}
                </td>
              </tr>
            ) : (
              filteredSales.map((sale) => (
                <tr key={sale._id} className={`hover:bg-gray-50 ${sale.isCancelled ? 'bg-red-50 opacity-75' : ''}`}>
                  <td data-label="Invoice #" className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${sale.isCancelled ? 'text-red-700 line-through' : 'text-gray-900'}`}>
                    {sale.invoiceNumber}
                  </td>
                  <td data-label="Date" className={`px-6 py-4 whitespace-nowrap text-sm ${sale.isCancelled ? 'text-red-600 line-through' : 'text-gray-500'}`}>
                    {format(new Date(sale.date), 'dd MMM yyyy, hh:mm a')}
                  </td>
                  <td data-label="Customer" className={`px-6 py-4 whitespace-nowrap text-sm ${sale.isCancelled ? 'text-red-600 line-through' : 'text-gray-900'}`}>
                    <button
                      type="button"
                      onClick={() => setSelectedCustomerId(sale.customerId?._id || '')}
                      className="hover:text-blue-600 hover:underline cursor-pointer text-left font-medium"
                      title="Filter by this customer"
                    >
                      {sale.customerId?.name || 'Walk-in / Unknown'}
                    </button>
                  </td>
                  <td data-label="Total" className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${sale.isCancelled ? 'text-red-600 line-through' : ''}`}>
                    Rs. {Number(sale.grandTotal).toLocaleString()}
                  </td>
                  <td data-label="Paid" className={`px-6 py-4 whitespace-nowrap text-sm text-right ${sale.isCancelled ? 'text-red-600 line-through' : 'text-green-600 font-medium'}`}>
                    Rs. {Number(sale.paid).toLocaleString()}
                  </td>
                  <td data-label="Remaining" className={`px-6 py-4 whitespace-nowrap text-sm text-right ${sale.isCancelled ? 'text-red-600 line-through' : 'text-red-600 font-medium'}`}>
                    Rs. {Number(sale.remaining).toLocaleString()}
                  </td>
                  <td data-label="Status" className="px-6 py-4 whitespace-nowrap text-center text-sm">
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
                  <td data-label="Actions" className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link to={`/invoice/sale/${sale._id}`} className="text-gray-600 hover:text-blue-900 inline-block mr-4" title="View Invoice">
                      <FiEye size={18} />
                    </Link>
                    {!sale.isCancelled && Number(sale.remaining) > 0 && (
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Payment Modal */}
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
                <p className="text-sm text-red-600 mb-4">Remaining Balance: <span className="font-bold">Rs. {Number(paymentModalData.remaining).toLocaleString()}</span></p>

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
