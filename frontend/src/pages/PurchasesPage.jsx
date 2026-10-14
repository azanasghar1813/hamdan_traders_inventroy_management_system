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

const PurchasesPage = () => {
  const navigate = useNavigate();
  const [view, setView] = useViewPreference('purchases', 'card');
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search parameters support (e.g. /purchases?supplierId=...)
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSupplierId = searchParams.get('supplierId') || '';

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState(urlSupplierId);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Sorting States
  const [sortField, setSortField] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1, limit: 25 });


  // Payment Modal State
  const [paymentModalData, setPaymentModalData] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  // Fetch suppliers once
  useEffect(() => {
    let ignore = false;
    api.get('/suppliers')
      .then((res) => {
        if (!ignore) setSuppliers(res.data.data || []);
      })
      .catch((err) => {
        if (!ignore) console.error(err);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch paginated purchases from server
  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const params = new URLSearchParams();
        params.set('page', page);
        params.set('limit', limit);
        if (searchQuery.trim()) params.set('search', searchQuery.trim());
        if (selectedSupplierId) params.set('supplierId', selectedSupplierId);
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
        params.set('sortField', sortField);
        params.set('sortOrder', sortOrder);

        const res = await api.get(`/purchases?${params.toString()}`);
        if (!ignore) {
          setPurchases(res.data.data || []);
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
  }, [page, limit, searchQuery, selectedSupplierId, startDate, endDate, sortField, sortOrder, refreshTrigger]);

  const handleToggleCancel = async (purchase) => {
    const action = purchase.isCancelled ? 'restore' : 'cancel';
    if (window.confirm(`Are you sure you want to ${action} Purchase Invoice ${purchase.purchaseNumber}? This will automatically adjust stock levels and supplier balance.`)) {
      setTogglingId(purchase._id);
      try {
        await api.put(`/purchases/${purchase._id}/toggle-cancel`);
        setRefreshTrigger((prev) => prev + 1);
      } catch (err) {
        alert(err.response?.data?.message || `Error trying to ${action} purchase`);
      } finally {
        setTogglingId(null);
      }
    }
  };

  const openPaymentModal = (purchase) => {
    setPaymentModalData(purchase);
    setPaymentAmount('');
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setSubmittingPayment(true);
    try {
      await api.post(`/purchases/${paymentModalData._id}/payment`, { amount: paymentAmount });
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
    setSelectedSupplierId('');
    setStartDate('');
    setEndDate('');
    setPage(1);
    setSearchParams({});
  };

  const hasActiveFilters = Boolean(
    searchQuery || selectedSupplierId || startDate || endDate
  );

  // Display purchases returned by server for current page
  const filteredPurchases = purchases;

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
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Purchases History</h1>
            <p className="text-xs text-gray-500 hidden sm:block mt-0.5">Filter, search, and track all supplier purchase invoices</p>
          </div>

          {/* Search bar in the center */}
          <div className="relative flex-1 max-w-[200px] sm:max-w-xs mx-1 sm:mx-4">
            <input
              type="text"
              placeholder="Search purchase or supplier..."
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

        {/* New Purchase Button (full width on mobile, auto on desktop) */}
        <Link
          to="/purchases/new"
          className="w-full sm:w-auto justify-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center shadow-sm font-semibold text-sm transition-colors min-h-[40px] shrink-0"
        >
          <FiPlus className="mr-1.5" /> New Purchase
        </Link>
      </div>

      {/* Single-Line Filters Bar (Supplier, Date range, Presets) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 sm:p-2.5 mb-5 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {/* Supplier Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-gray-600 hidden sm:inline">Supplier:</span>
            <select
              value={selectedSupplierId}
              onChange={(e) => {
                setSelectedSupplierId(e.target.value);
                setPage(1);
                if (e.target.value) {
                  setSearchParams({ supplierId: e.target.value });
                } else {
                  setSearchParams({});
                }
              }}
              className="px-2.5 py-1.5 text-xs font-medium border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-700 cursor-pointer max-w-[140px] sm:max-w-[180px] truncate"
            >
              <option value="">All Suppliers</option>
              {suppliers.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
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

      {/* Purchases Table */}
      {/* Desktop Table (hidden on mobile) */}
      <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                onClick={() => handleSort('purchaseNumber')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none"
              >
                Purchase #{renderSortIndicator('purchaseNumber')}
              </th>
              <th
                onClick={() => handleSort('date')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none"
              >
                Date{renderSortIndicator('date')}
              </th>
              <th
                onClick={() => handleSort('supplier')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none"
              >
                Supplier{renderSortIndicator('supplier')}
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
                    <div className="text-sm">Loading purchases...</div>
                  </div>
                </td>
              </tr>
            ) : filteredPurchases.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-10 text-center text-gray-500 text-sm">
                  {hasActiveFilters ? (
                    <div>
                      <p className="font-medium text-gray-700">No purchases match your active filters.</p>
                      <button
                        onClick={clearAllFilters}
                        className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-semibold underline"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  ) : (
                    'No purchases found.'
                  )}
                </td>
              </tr>
            ) : (
              filteredPurchases.map((purchase) => (
                <tr key={purchase._id} className={`hover:bg-gray-50 ${purchase.isCancelled ? 'bg-red-50 opacity-75' : ''}`}>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${purchase.isCancelled ? 'text-red-700 line-through' : 'text-gray-900'}`}>
                    {purchase.purchaseNumber}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${purchase.isCancelled ? 'text-red-600 line-through' : 'text-gray-500'}`}>
                    {format(new Date(purchase.date), 'dd MMM yyyy, hh:mm a')}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${purchase.isCancelled ? 'text-red-600 line-through' : 'text-gray-900'}`}>
                    <button
                      type="button"
                      onClick={() => setSelectedSupplierId(purchase.supplierId?._id || '')}
                      className="hover:text-blue-600 hover:underline cursor-pointer text-left font-medium"
                      title="Filter by this supplier"
                    >
                      {purchase.supplierId?.name || 'Unknown Supplier'}
                    </button>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${purchase.isCancelled ? 'text-red-600 line-through' : ''}`}>
                    Rs. {Number(purchase.grandTotal).toLocaleString()}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${purchase.isCancelled ? 'text-red-600 line-through' : 'text-green-600 font-medium'}`}>
                    Rs. {Number(purchase.paid).toLocaleString()}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${purchase.isCancelled ? 'text-red-600 line-through' : 'text-red-600 font-medium'}`}>
                    Rs. {Number(purchase.remaining).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link to={`/invoice/purchase/${purchase._id}`} className="text-gray-600 hover:text-blue-900 active:scale-90 transition-transform inline-block mr-3" title="View Invoice">
                      <FiEye size={18} />
                    </Link>
                    {!purchase.isCancelled && (
                      <Link to={`/purchases/edit/${purchase._id}`} className="text-amber-600 hover:text-amber-800 active:scale-90 transition-transform inline-block mr-3" title="Edit Purchase">
                        <FiEdit2 size={17} />
                      </Link>
                    )}
                    {!purchase.isCancelled && Number(purchase.remaining) > 0 && (
                      <button 
                        onClick={() => openPaymentModal(purchase)}
                        className="text-green-600 hover:text-green-900 active:scale-90 transition-transform inline-block mr-3"
                        title="Add Payment"
                      >
                        <FiDollarSign size={18} />
                      </button>
                    )}
                    <button 
                      onClick={() => handleToggleCancel(purchase)}
                      disabled={togglingId === purchase._id}
                      className={`${purchase.isCancelled ? 'text-green-600 hover:text-green-900' : 'text-red-600 hover:text-red-900'} active:scale-90 transition-transform inline-block disabled:opacity-50`}
                      title={purchase.isCancelled ? "Restore Purchase" : "Cancel Purchase"}
                    >
                      {togglingId === purchase._id ? (
                        <FiRefreshCw size={18} className="animate-spin" />
                      ) : purchase.isCancelled ? (
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
            Loading purchases...
          </div>
        ) : view === 'list' ? (
          <MobileListView
            items={filteredPurchases}
            emptyText={hasActiveFilters ? "No purchases match your active filters." : "No purchases found."}
            onSelect={(p) => navigate(`/invoice/purchase/${p._id}`)}
            renderRow={(p) => (
              <>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold truncate text-sm ${p.isCancelled ? 'line-through text-red-700' : 'text-gray-900'}`}>
                    {p.purchaseNumber}
                  </p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {p.supplierId?.name || 'Unknown Supplier'} • {format(new Date(p.date), 'dd MMM yyyy')}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-bold text-sm whitespace-nowrap ${p.isCancelled ? 'line-through text-red-600' : 'text-gray-900'}`}>
                    Rs. {Number(p.grandTotal).toLocaleString()}
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
            items={filteredPurchases}
            emptyText={hasActiveFilters ? "No purchases match your active filters." : "No purchases found."}
            onSelect={(p) => navigate(`/invoice/purchase/${p._id}`)}
            renderCard={(p, onSelect) => (
              <div className="space-y-3">
                <div className="flex justify-between items-start cursor-pointer" onClick={() => onSelect(p)}>
                  <div>
                    <span className={`font-bold text-sm ${p.isCancelled ? 'line-through text-red-700' : 'text-gray-900'}`}>
                      {p.purchaseNumber}
                    </span>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {format(new Date(p.date), 'dd MMM yyyy, hh:mm a')}
                    </div>
                    <div className="text-xs font-medium text-blue-600 mt-1">
                      {p.supplierId?.name || 'Unknown Supplier'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold text-base ${p.isCancelled ? 'line-through text-red-600' : 'text-gray-900'}`}>
                      Rs. {Number(p.grandTotal).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs border-t pt-2 border-gray-100">
                  <div>
                    <span className="text-gray-500">Paid: </span>
                    <span className="font-semibold text-green-600">Rs. {Number(p.paid).toLocaleString()}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-500">Remaining: </span>
                    <span className="font-semibold text-red-600">Rs. {Number(p.remaining).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 text-xs">
                  <Link
                    to={`/invoice/purchase/${p._id}`}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-medium flex items-center gap-1 min-h-[36px]"
                  >
                    <FiEye /> View
                  </Link>
                  {!p.isCancelled && (
                    <Link
                      to={`/purchases/edit/${p._id}`}
                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded font-medium flex items-center gap-1 min-h-[36px]"
                    >
                      <FiEdit2 /> Edit
                    </Link>
                  )}
                  {!p.isCancelled && Number(p.remaining) > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openPaymentModal(p);
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
                      handleToggleCancel(p);
                    }}
                    disabled={togglingId === p._id}
                    className={`px-3 py-1.5 rounded font-medium flex items-center gap-1 min-h-[36px] active:scale-95 transition-all disabled:opacity-50 ${
                      p.isCancelled ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-red-50 text-red-700 hover:bg-red-100'
                    }`}
                  >
                    {togglingId === p._id ? (
                      <FiRefreshCw className="animate-spin" />
                    ) : p.isCancelled ? (
                      <FiRefreshCw />
                    ) : (
                      <FiXCircle />
                    )}
                    {p.isCancelled ? 'Restore' : 'Cancel'}
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
              <span className="font-semibold text-gray-800">{pagination.total}</span> purchases
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
                <p className="text-sm text-gray-600 mb-1">Invoice: <span className="font-semibold">{paymentModalData.purchaseNumber}</span></p>
                <p className="text-sm text-gray-600 mb-1">Supplier: <span className="font-semibold">{paymentModalData.supplierId?.name}</span></p>
                <p className="text-sm text-red-600 mb-4">Remaining Balance: <span className="font-bold">Rs. {Number(paymentModalData.remaining).toLocaleString()}</span></p>

                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">Payment Amount (Rs.) *</label>
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(String(paymentModalData.remaining))}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline cursor-pointer"
                  >
                    Pay Full (Rs. {Number(paymentModalData.remaining).toLocaleString()})
                  </button>
                </div>
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
              
              <div className="flex flex-col-reverse sm:flex-row justify-between gap-2.5 mt-6 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setPaymentModalData(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={submittingPayment}
                    onClick={async () => {
                      setSubmittingPayment(true);
                      try {
                        await api.post(`/purchases/${paymentModalData._id}/payment`, { amount: paymentModalData.remaining });
                        setPaymentModalData(null);
                        setRefreshTrigger((prev) => prev + 1);
                      } catch (err) {
                        alert(err.response?.data?.message || 'Error processing payment');
                      } finally {
                        setSubmittingPayment(false);
                      }
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-green-600 hover:bg-green-700 active:scale-95 text-white rounded-md text-sm font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-75"
                    title="Mark entire remaining balance as paid"
                  >
                    ✓ Mark as Paid
                  </button>
                  <button
                    type="submit"
                    disabled={submittingPayment || !paymentAmount}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 active:scale-95 transition-all text-sm font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
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
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchasesPage;
