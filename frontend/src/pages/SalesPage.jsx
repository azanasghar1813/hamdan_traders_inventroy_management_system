import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import useViewPreference from '../hooks/useViewPreference';
import ViewToggle from '../components/ViewToggle';
import MobileListView from '../components/MobileListView';
import MobileCardView from '../components/MobileCardView';
import { 
  FiPlus, 
  FiEye, 
  FiEdit2,
  FiXCircle, 
  FiRefreshCw, 
  FiDollarSign, 
  FiSearch, 
  FiArrowUp, 
  FiArrowDown, 
  FiX, 
  FiCalendar 
} from 'react-icons/fi';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

const SalesPage = () => {
  const navigate = useNavigate();
  const [view, setView] = useViewPreference('sales', 'card');
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search parameters support (e.g. /sales?customerId=...)
  const [searchParams, setSearchParams] = useSearchParams();
  const urlCustomerId = searchParams.get('customerId') || '';

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState(urlCustomerId);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Sorting States (default newest first)
  const [sortField, setSortField] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1, limit: 25 });


  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [paymentModalData, setPaymentModalData] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  // Fetch customers once
  useEffect(() => {
    let ignore = false;
    api.get('/customers')
      .then((res) => {
        if (!ignore) setCustomers(res.data.data || []);
      })
      .catch((err) => {
        if (!ignore) console.error(err);
      });
    return () => {
      ignore = true;
    };
  }, []);

  // Fetch paginated sales from server
  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const params = new URLSearchParams();
        params.set('page', page);
        params.set('limit', limit);
        if (searchQuery.trim()) params.set('search', searchQuery.trim());
        if (selectedCustomerId) params.set('customerId', selectedCustomerId);
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
        params.set('sortField', sortField);
        params.set('sortOrder', sortOrder);

        const res = await api.get(`/sales?${params.toString()}`);
        if (!ignore) {
          setSales(res.data.data || []);
          if (res.data.pagination) setPagination(res.data.pagination);

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
  }, [page, limit, searchQuery, selectedCustomerId, startDate, endDate, sortField, sortOrder, refreshTrigger]);

  const handleToggleCancel = async (sale) => {
    const action = sale.isCancelled ? 'restore' : 'cancel';
    if (window.confirm(`Are you sure you want to ${action} Invoice ${sale.invoiceNumber}? This will automatically adjust stock levels and customer balance.`)) {
      setTogglingId(sale._id);
      try {
        await api.put(`/sales/${sale._id}/toggle-cancel`);
        setRefreshTrigger((prev) => prev + 1);
      } catch (err) {
        alert(err.response?.data?.message || `Error trying to ${action} sale`);
      } finally {
        setTogglingId(null);
      }
    }
  };

  const openPaymentModal = (sale) => {
    setPaymentModalData(sale);
    setPaymentAmount('');
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setSubmittingPayment(true);
    try {
      await api.post(`/sales/${paymentModalData._id}/payment`, { amount: paymentAmount });
      setPaymentModalData(null);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      alert(err.response?.data?.message || 'Error processing payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Quick Date Presets
  const handleDatePreset = (preset) => {
    setPage(1);
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
    setPage(1);
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
    setStartDate('');
    setEndDate('');
    setPage(1);
    setSearchParams({});
  };

  const hasActiveFilters = Boolean(
    searchQuery || selectedCustomerId || startDate || endDate
  );

  // Display sales returned by server for current page
  const filteredSales = sales;

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
      {/* Header & Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center mb-3 sm:mb-6 gap-3">
        {/* Top row on Mobile / Left+Center on Desktop */}
        <div className="flex items-center justify-between gap-2 w-full sm:w-auto sm:flex-1">
          <div className="shrink-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Sales History</h1>
            <p className="text-xs text-gray-500 hidden sm:block mt-0.5">Filter, search, and track all customer sales invoices</p>
          </div>

          {/* Search bar in the center */}
          <div className="relative flex-1 max-w-[200px] sm:max-w-xs mx-1 sm:mx-4">
            <input
              type="text"
              placeholder="Search invoice or customer..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-8 pr-7 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white shadow-xs"
            />
            <FiSearch className="absolute left-2.5 top-2.5 text-gray-400 w-3.5 h-3.5" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setPage(1);
                }}
                className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 cursor-pointer"
                title="Clear search"
              >
                <FiX className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* List and Box icons on Mobile */}
          <div className="shrink-0">
            <ViewToggle view={view} onChange={setView} />
          </div>
        </div>

        {/* New Sale Button (full width on mobile, auto on desktop) */}
        <Link
          to="/sales/new"
          className="w-full sm:w-auto justify-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center shadow-sm font-semibold text-sm transition-colors min-h-[40px] shrink-0"
        >
          <FiPlus className="mr-1.5" /> New Sale
        </Link>
      </div>

      {/* Single-Line Filters Bar (Customer, Date range, Presets) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 sm:p-2.5 mb-5 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {/* Customer Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-gray-600 hidden sm:inline">Customer:</span>
            <select
              value={selectedCustomerId}
              onChange={(e) => {
                setSelectedCustomerId(e.target.value);
                setPage(1);
                if (e.target.value) {
                  setSearchParams({ customerId: e.target.value });
                } else {
                  setSearchParams({});
                }
              }}
              className="px-2.5 py-1.5 text-xs font-medium border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-700 cursor-pointer max-w-[140px] sm:max-w-[180px] truncate"
            >
              <option value="">All Customers</option>
              {customers.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="h-4 w-px bg-gray-200 mx-0.5" />

          {/* Date Range */}
          <div className="flex items-center gap-1">
            <FiCalendar className="text-gray-400 w-3.5 h-3.5 shrink-0" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="px-1.5 py-1 text-xs border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              title="Start Date"
            />
            <span className="text-xs text-gray-400">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="px-1.5 py-1 text-xs border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              title="End Date"
            />
          </div>

          <div className="h-4 w-px bg-gray-200 mx-0.5" />

          {/* Presets */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleDatePreset('TODAY')}
              className="px-2 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors whitespace-nowrap cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handleDatePreset('WEEK')}
              className="px-2 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors whitespace-nowrap cursor-pointer"
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => handleDatePreset('MONTH')}
              className="px-2 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors whitespace-nowrap cursor-pointer"
            >
              Month
            </button>
          </div>

          {/* Clear Active Filters */}
          {hasActiveFilters && (
            <>
              <div className="h-4 w-px bg-gray-200 mx-0.5" />
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1 px-2 py-1 rounded bg-red-50 hover:bg-red-100 transition-colors whitespace-nowrap cursor-pointer"
                title="Clear all filters"
              >
                <FiX className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Desktop Table (hidden on mobile) */}
      <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
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
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="7" className="px-6 py-10 text-center text-gray-500">
                  <div className="animate-pulse flex flex-col items-center">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="text-sm">Loading sales...</div>
                  </div>
                </td>
              </tr>
            ) : filteredSales.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-10 text-center text-gray-500 text-sm">
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
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${sale.isCancelled ? 'text-red-700 line-through' : 'text-gray-900'}`}>
                    {sale.invoiceNumber}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${sale.isCancelled ? 'text-red-600 line-through' : 'text-gray-500'}`}>
                    {format(new Date(sale.date), 'dd MMM yyyy, hh:mm a')}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${sale.isCancelled ? 'text-red-600 line-through' : 'text-gray-900'}`}>
                    <button
                      type="button"
                      onClick={() => setSelectedCustomerId(sale.customerId?._id || '')}
                      className="hover:text-blue-600 hover:underline cursor-pointer text-left font-medium"
                      title="Filter by this customer"
                    >
                      {sale.customerId?.name || 'Walk-in / Unknown'}
                    </button>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${sale.isCancelled ? 'text-red-600 line-through' : ''}`}>
                    Rs. {Number(sale.grandTotal).toLocaleString()}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${sale.isCancelled ? 'text-red-600 line-through' : 'text-green-600 font-medium'}`}>
                    Rs. {Number(sale.paid).toLocaleString()}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${sale.isCancelled ? 'text-red-600 line-through' : 'text-red-600 font-medium'}`}>
                    Rs. {Number(sale.remaining).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link to={`/invoice/sale/${sale._id}`} className="text-gray-600 hover:text-blue-900 active:scale-90 transition-transform inline-block mr-3" title="View Invoice">
                      <FiEye size={18} />
                    </Link>
                    {!sale.isCancelled && (
                      <Link to={`/sales/edit/${sale._id}`} className="text-amber-600 hover:text-amber-800 active:scale-90 transition-transform inline-block mr-3" title="Edit Sale">
                        <FiEdit2 size={17} />
                      </Link>
                    )}
                    {!sale.isCancelled && Number(sale.remaining) > 0 && (
                      <button 
                        onClick={() => openPaymentModal(sale)}
                        className="text-green-600 hover:text-green-900 active:scale-90 transition-transform inline-block mr-3"
                        title="Add Payment"
                      >
                        <FiDollarSign size={18} />
                      </button>
                    )}
                    <button 
                      onClick={() => handleToggleCancel(sale)}
                      disabled={togglingId === sale._id}
                      className={`${sale.isCancelled ? 'text-green-600 hover:text-green-900' : 'text-red-600 hover:text-red-900'} active:scale-90 transition-transform inline-block disabled:opacity-50`}
                      title={sale.isCancelled ? "Restore Sale" : "Cancel Sale"}
                    >
                      {togglingId === sale._id ? (
                        <FiRefreshCw size={18} className="animate-spin" />
                      ) : sale.isCancelled ? (
                        <FiRefreshCw size={18} />
                      ) : (
                        <FiXCircle size={18} />
                      )}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile: List or Card View */}
      <div className="md:hidden">
        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500 text-sm">
            Loading sales...
          </div>
        ) : view === 'list' ? (
          <MobileListView
            items={filteredSales}
            emptyText={hasActiveFilters ? "No sales match your active filters." : "No sales found."}
            onSelect={(s) => navigate(`/invoice/sale/${s._id}`)}
            renderRow={(s) => (
              <>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold truncate text-sm ${s.isCancelled ? 'line-through text-red-700' : 'text-gray-900'}`}>
                    {s.invoiceNumber}
                  </p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {s.customerId?.name || 'Walk-in'} • {format(new Date(s.date), 'dd MMM yyyy')}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-bold text-sm whitespace-nowrap ${s.isCancelled ? 'line-through text-red-600' : 'text-gray-900'}`}>
                    Rs. {Number(s.grandTotal).toLocaleString()}
                  </p>
                </div>
                <span className="text-gray-300 text-xl leading-none ml-1" aria-hidden="true">
                  ›
                </span>
              </>
            )}
          />
        ) : (
          <MobileCardView
            items={filteredSales}
            emptyText={hasActiveFilters ? "No sales match your active filters." : "No sales found."}
            onSelect={(s) => navigate(`/invoice/sale/${s._id}`)}
            renderCard={(s, onSelect) => (
              <div className="space-y-3">
                <div className="flex justify-between items-start cursor-pointer" onClick={() => onSelect(s)}>
                  <div>
                    <span className={`font-bold text-sm ${s.isCancelled ? 'line-through text-red-700' : 'text-gray-900'}`}>
                      {s.invoiceNumber}
                    </span>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {format(new Date(s.date), 'dd MMM yyyy, hh:mm a')}
                    </div>
                    <div className="text-xs font-medium text-blue-600 mt-1">
                      {s.customerId?.name || 'Walk-in / Unknown'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold text-base ${s.isCancelled ? 'line-through text-red-600' : 'text-gray-900'}`}>
                      Rs. {Number(s.grandTotal).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs border-t pt-2 border-gray-100">
                  <div>
                    <span className="text-gray-500">Paid: </span>
                    <span className="font-semibold text-green-600">Rs. {Number(s.paid).toLocaleString()}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-500">Remaining: </span>
                    <span className="font-semibold text-red-600">Rs. {Number(s.remaining).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 text-xs">
                  <Link
                    to={`/invoice/sale/${s._id}`}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-medium flex items-center gap-1 min-h-[36px]"
                  >
                    <FiEye /> View
                  </Link>
                  {!s.isCancelled && (
                    <Link
                      to={`/sales/edit/${s._id}`}
                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded font-medium flex items-center gap-1 min-h-[36px]"
                    >
                      <FiEdit2 /> Edit
                    </Link>
                  )}
                  {!s.isCancelled && Number(s.remaining) > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openPaymentModal(s);
                      }}
                      className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded font-medium flex items-center gap-1 min-h-[36px]"
                    >
                      <FiDollarSign /> Pay
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleCancel(s);
                    }}
                    disabled={togglingId === s._id}
                    className={`px-3 py-1.5 rounded font-medium flex items-center gap-1 min-h-[36px] active:scale-95 transition-all disabled:opacity-50 ${
                      s.isCancelled ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-red-50 text-red-700 hover:bg-red-100'
                    }`}
                  >
                    {togglingId === s._id ? (
                      <FiRefreshCw className="animate-spin" />
                    ) : s.isCancelled ? (
                      <FiRefreshCw />
                    ) : (
                      <FiXCircle />
                    )}
                    {s.isCancelled ? 'Restore' : 'Cancel'}
                  </button>
                </div>
              </div>
            )}
          />
        )}
      </div>

      {/* Pagination Controls */}
      {pagination.total > 0 && (
        <div className="bg-white rounded-lg shadow px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 border border-gray-100">
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span>
              Showing <span className="font-semibold text-gray-800">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
              <span className="font-semibold text-gray-800">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{' '}
              <span className="font-semibold text-gray-800">{pagination.total}</span> invoices
            </span>
            <div className="flex items-center gap-1.5 border-l border-gray-200 pl-3">
              <label className="text-gray-400">Per page:</label>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(1)}
              disabled={pagination.page <= 1}
              className="px-2.5 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-gray-600 font-medium"
              title="First Page"
            >
              «
            </button>
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={pagination.page <= 1}
              className="px-3 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-gray-600 font-medium"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-xs font-semibold text-blue-600 bg-blue-50 rounded border border-blue-200">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <button
              onClick={() => setPage((prev) => Math.min(pagination.totalPages || 1, prev + 1))}
              disabled={pagination.page >= (pagination.totalPages || 1)}
              className="px-3 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-gray-600 font-medium"
            >
              Next
            </button>
            <button
              onClick={() => setPage(pagination.totalPages || 1)}
              disabled={pagination.page >= (pagination.totalPages || 1)}
              className="px-2.5 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-gray-600 font-medium"
              title="Last Page"
            >
              »
            </button>
          </div>
        </div>
      )}

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
                  disabled={submittingPayment}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 active:scale-95 transition-all shadow-sm disabled:opacity-75"
                >
                  {submittingPayment ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-1 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    'Save Payment'
                  )}
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
