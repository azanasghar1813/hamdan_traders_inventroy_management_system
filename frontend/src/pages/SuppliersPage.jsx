import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import useViewPreference from '../hooks/useViewPreference';
import ViewToggle from '../components/ViewToggle';
import MobileListView from '../components/MobileListView';
import MobileCardView from '../components/MobileCardView';
import { FiPlus, FiEdit, FiSearch, FiDollarSign, FiTrash2, FiEye, FiExternalLink, FiFileText } from 'react-icons/fi';
import { format } from 'date-fns';

const SuppliersPage = () => {
  const [view, setView] = useViewPreference('suppliers', 'card');
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);

  // Supplier Purchases History Modal State
  const [historySupplier, setHistorySupplier] = useState(null);
  const [supplierPurchases, setSupplierPurchases] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '', phone: '', address: '', openingBalance: 0, isActive: true
  });

  const fetchSuppliers = async (keyword = '') => {
    try {
      const { data } = await api.get(`/suppliers${keyword ? `?keyword=${keyword}` : ''}`);
      setSuppliers(data.data);
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
        const { data } = await api.get('/suppliers');
        if (!ignore) setSuppliers(data.data);
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

  const handleSearch = (e) => {
    e.preventDefault();
    fetchSuppliers(search);
  };

  const openModal = (supplier = null) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({
        name: supplier.name, phone: supplier.phone || '', address: supplier.address || '',
        openingBalance: supplier.openingBalance, isActive: supplier.isActive
      });
    } else {
      setEditingSupplier(null);
      setFormData({ name: '', phone: '', address: '', openingBalance: 0, isActive: true });
    }
    setIsModalOpen(true);
  };

  const handlePhoneChange = (e) => {
    let val = e.target.value.replace(/\D/g, ''); // Keep only numbers
    if (val.length > 11) val = val.slice(0, 11);
    if (val.length > 4) {
      val = val.slice(0, 4) + '-' + val.slice(4);
    }
    setFormData({ ...formData, phone: val });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingSupplier) {
        await api.put(`/suppliers/${editingSupplier._id}`, formData);
      } else {
        await api.post('/suppliers', formData);
      }
      setIsModalOpen(false);
      fetchSuppliers(search);
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving supplier');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (supplier) => {
    if (window.confirm(`Are you sure you want to delete ${supplier.name}? This will hide them, but keep them in past invoices.`)) {
      try {
        await api.delete(`/suppliers/${supplier._id}`);
        fetchSuppliers(search);
      } catch (err) {
        alert(err.response?.data?.message || 'Error deleting supplier');
      }
    }
  };

  const toggleStatus = async (supplier) => {
    const nextStatus = !supplier.isActive;
    setSuppliers(prev => prev.map(s => s._id === supplier._id ? { ...s, isActive: nextStatus } : s));
    try {
      await api.put(`/suppliers/${supplier._id}`, { isActive: nextStatus });
    } catch (err) {
      console.error('Error updating supplier status:', err);
      setSuppliers(prev => prev.map(s => s._id === supplier._id ? { ...s, isActive: !nextStatus } : s));
      alert('Error updating status');
    }
  };

  const openHistoryModal = async (supplier) => {
    setHistorySupplier(supplier);
    setLoadingHistory(true);
    try {
      const { data } = await api.get(`/purchases?supplierId=${supplier._id}`);
      setSupplierPurchases(data.data || []);
    } catch (err) {
      console.error(err);
      alert('Error loading purchases history for this supplier');
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <h1 className="text-2xl font-bold text-gray-800">Suppliers</h1>
          <ViewToggle view={view} onChange={setView} />
        </div>
        
        <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-4">
          <form onSubmit={handleSearch} className="flex-1 md:w-64 relative">
            <input
              type="text"
              placeholder="Search suppliers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <FiSearch className="absolute left-3 top-3 text-gray-400" />
          </form>
          
          <button
            onClick={() => openModal()}
            className="w-full sm:w-auto justify-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center shadow-sm min-h-[44px]"
          >
            <FiPlus className="mr-2" /> Add Supplier
          </button>
        </div>
      </div>

      {/* Desktop Table (hidden on mobile) */}
      <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Current Balance</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="5" className="px-6 py-10 text-center text-gray-500">
                  <div className="animate-pulse flex flex-col items-center">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="text-sm">Loading suppliers...</div>
                  </div>
                </td>
              </tr>
            ) : suppliers.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-10 text-center text-gray-500 text-sm">
                  No suppliers found.
                </td>
              </tr>
            ) : (
              suppliers.map((supplier) => (
                <tr key={supplier._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-left">
                  <div className="flex flex-col text-left">
                    <button
                      type="button"
                      onClick={() => openHistoryModal(supplier)}
                      className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline text-left cursor-pointer flex items-center gap-1.5"
                      title="Click to view complete purchase history"
                    >
                      <span>{supplier.name}</span>
                      <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-200 font-medium">History</span>
                    </button>
                    <div className="text-xs text-gray-500 mt-0.5">{supplier.address || '-'}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{supplier.phone || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                  <span className={supplier.currentBalance > 0 ? 'text-red-600' : 'text-gray-900'}>
                    Rs. {supplier.currentBalance.toLocaleString()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                  <button
                    type="button"
                    onClick={() => toggleStatus(supplier)}
                    className="inline-flex items-center gap-2 group cursor-pointer focus:outline-none"
                    title={`Click to switch to ${supplier.isActive ? 'Inactive' : 'Active'}`}
                  >
                    <span
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        supplier.isActive ? 'bg-green-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          supplier.isActive ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full transition-colors ${
                      supplier.isActive ? 'bg-green-100 text-green-800 group-hover:bg-green-200' : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                    }`}>
                      {supplier.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => openModal(supplier)} className="text-blue-600 hover:text-blue-900 mr-3">
                    <FiEdit className="inline" /> Edit
                  </button>
                  <button onClick={() => handleDelete(supplier)} className="text-red-600 hover:text-red-900">
                    <FiTrash2 className="inline" /> Delete
                  </button>
                </td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>

      {/* Mobile: List or Card View */}
      <div className="md:hidden">
        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500 text-sm">
            Loading suppliers...
          </div>
        ) : view === 'list' ? (
          <MobileListView
            items={suppliers}
            emptyText="No suppliers found."
            onSelect={(s) => openHistoryModal(s)}
            renderRow={(s) => (
              <>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 truncate">
                    {s.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {s.phone || 'No phone'} {s.address ? `• ${s.address}` : ''}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-bold text-sm whitespace-nowrap ${s.currentBalance > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    Rs. {s.currentBalance.toLocaleString()}
                  </p>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {s.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <span className="text-gray-300 text-xl leading-none ml-1" aria-hidden="true">
                  ›
                </span>
              </>
            )}
          />
        ) : (
          <MobileCardView
            items={suppliers}
            emptyText="No suppliers found."
            onSelect={(s) => openHistoryModal(s)}
            renderCard={(s, onSelect) => (
              <div className="space-y-3">
                <div className="flex justify-between items-start cursor-pointer" onClick={() => onSelect(s)}>
                  <div>
                    <div className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                      <span>{s.name}</span>
                      <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-200 font-medium">History</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{s.phone || 'No phone number'}</div>
                    <div className="text-xs text-gray-500">{s.address || 'No address provided'}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-500 block">Balance</span>
                    <span className={`font-bold text-base ${s.currentBalance > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      Rs. {s.currentBalance.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => toggleStatus(s)}
                    className="inline-flex items-center gap-2 cursor-pointer focus:outline-none min-h-[44px]"
                    title={`Click to switch to ${s.isActive ? 'Inactive' : 'Active'}`}
                  >
                    <span
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        s.isActive ? 'bg-green-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          s.isActive ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      s.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openModal(s)}
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-xs font-medium min-h-[36px]"
                    >
                      <FiEdit className="inline mr-1" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(s)}
                      className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded text-xs font-medium min-h-[36px]"
                    >
                      <FiTrash2 className="inline mr-1" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          />
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                {editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="px-6 py-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name *</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input type="text" placeholder="03XX-XXXXXXX" value={formData.phone} onChange={handlePhoneChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md" rows="2" />
              </div>
              
              {!editingSupplier && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Opening Balance (if any)</label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiDollarSign className="text-gray-400" />
                    </div>
                    <input type="number" min="0" value={formData.openingBalance} onChange={e => setFormData({...formData, openingBalance: e.target.value})} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md" />
                  </div>
                </div>
              )}

              {editingSupplier && (
                <div className="mb-4 flex items-center">
                  <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
                  <label className="ml-2 block text-sm text-gray-700">Supplier is Active</label>
                </div>
              )}
              
              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center">
                  {saving ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Purchases History Modal */}
      {historySupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-gray-900">
                    Purchase History: {historySupplier.name}
                  </h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    historySupplier.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {historySupplier.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Phone: {historySupplier.phone || 'N/A'} • Address: {historySupplier.address || 'N/A'}
                </p>
              </div>
              <button 
                onClick={() => setHistorySupplier(null)} 
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold p-1 leading-none"
              >
                &times;
              </button>
            </div>

            {/* Quick KPI stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-white border-b border-gray-100">
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                <span className="text-xs text-blue-600 font-medium">Total Purchases</span>
                <p className="text-lg font-bold text-blue-900">{supplierPurchases.length}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <span className="text-xs text-gray-600 font-medium">Total Billed</span>
                <p className="text-lg font-bold text-gray-900">
                  Rs. {supplierPurchases.reduce((sum, p) => sum + (p.isCancelled ? 0 : p.grandTotal), 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                <span className="text-xs text-green-600 font-medium">Total Paid</span>
                <p className="text-lg font-bold text-green-900">
                  Rs. {supplierPurchases.reduce((sum, p) => sum + (p.isCancelled ? 0 : p.paid), 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                <span className="text-xs text-red-600 font-medium">Current Balance</span>
                <p className="text-lg font-bold text-red-900">
                  Rs. {historySupplier.currentBalance.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Purchases list */}
            <div className="overflow-y-auto flex-1 p-4">
              {loadingHistory ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-2"></div>
                  <p className="text-sm">Loading complete purchases history...</p>
                </div>
              ) : supplierPurchases.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FiFileText className="mx-auto text-4xl text-gray-300 mb-2" />
                  <p className="text-base font-medium">No purchases recorded for this supplier yet.</p>
                  <Link
                    to="/purchases/new"
                    className="mt-3 inline-block text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    + Create First Purchase
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-medium">
                      <tr>
                        <th className="px-4 py-2.5 text-left">Purchase #</th>
                        <th className="px-4 py-2.5 text-left">Date</th>
                        <th className="px-4 py-2.5 text-right">Total</th>
                        <th className="px-4 py-2.5 text-right">Paid</th>
                        <th className="px-4 py-2.5 text-right">Remaining</th>
                        <th className="px-4 py-2.5 text-center">Status</th>
                        <th className="px-4 py-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {supplierPurchases.map(purchase => (
                        <tr key={purchase._id} className={purchase.isCancelled ? 'bg-red-50/50 opacity-70' : 'hover:bg-gray-50'}>
                          <td className="px-4 py-2.5 font-medium text-gray-900">
                            {purchase.purchaseNumber}
                          </td>
                          <td className="px-4 py-2.5 text-gray-500 text-xs">
                            {purchase.date ? format(new Date(purchase.date), 'dd MMM yyyy, hh:mm a') : '-'}
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium text-gray-900">
                            Rs. {purchase.grandTotal.toLocaleString()}
                          </td>
                          <td className="px-4 py-2.5 text-right text-green-600 font-medium">
                            Rs. {purchase.paid.toLocaleString()}
                          </td>
                          <td className="px-4 py-2.5 text-right text-red-600 font-medium">
                            Rs. {purchase.remaining.toLocaleString()}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {purchase.isCancelled ? (
                              <span className="px-2 py-0.5 text-[11px] font-semibold bg-red-100 text-red-800 rounded-full">
                                CANCELLED
                              </span>
                            ) : (
                              <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${
                                purchase.status === 'PAID' ? 'bg-green-100 text-green-800' :
                                purchase.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {purchase.status}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <Link
                              to={`/invoice/purchase/${purchase._id}`}
                              className="text-blue-600 hover:text-blue-800 font-medium text-xs flex items-center justify-end gap-1"
                              title="View and print invoice"
                            >
                              <FiEye className="w-3.5 h-3.5" />
                              <span>Invoice</span>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
              <Link
                to={`/purchases?supplierId=${historySupplier._id}`}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
              >
                <FiExternalLink className="w-3.5 h-3.5" />
                <span>Open in Purchases History Page</span>
              </Link>
              <button
                type="button"
                onClick={() => setHistorySupplier(null)}
                className="px-4 py-1.5 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-md text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuppliersPage;
