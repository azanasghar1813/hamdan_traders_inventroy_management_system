import React, { useState, useEffect } from 'react';
import api from '../services/api';
import useViewPreference from '../hooks/useViewPreference';
import ViewToggle from '../components/ViewToggle';
import MobileListView from '../components/MobileListView';
import MobileCardView from '../components/MobileCardView';
import { FiPlus, FiSearch, FiTrash2, FiEdit2 } from 'react-icons/fi';

const ProductsPage = () => {
  const [view, setView] = useViewPreference('products', 'card');
  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    unit: 'Box',
    purchasePrice: '',
    salePrice: '',
    minimumStock: '',
    openingStock: '',
    expiryDate: '',
    isActive: true
  });

  const fetchProducts = async (keyword = '') => {
    try {
      const { data } = await api.get(`/products${keyword ? `?keyword=${keyword}` : ''}`);
      setProducts(data.data);
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
        const { data } = await api.get('/products');
        if (!ignore) setProducts(data.data);
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
    fetchProducts(search);
  };

  const openModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        unit: product.unit || 'Box',
        purchasePrice: product.purchasePrice,
        salePrice: product.salePrice,
        minimumStock: product.minimumStock,
        openingStock: '',
        expiryDate: product.expiryDate ? product.expiryDate.split('T')[0] : '',
        isActive: product.isActive
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        unit: 'Box',
        purchasePrice: '',
        salePrice: '',
        minimumStock: '',
        openingStock: '',
        expiryDate: '',
        isActive: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingProduct) {
        await api.put(`/products/${editingProduct._id}`, formData);
      } else {
        await api.post('/products', formData);
      }
      setIsModalOpen(false);
      fetchProducts(search);
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving product');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (product) => {
    const nextStatus = !product.isActive;
    // Optimistic UI update for instant response
    setProducts(prev => prev.map(p => p._id === product._id ? { ...p, isActive: nextStatus } : p));
    try {
      await api.put(`/products/${product._id}`, { isActive: nextStatus });
    } catch (err) {
      console.error('Error updating product status:', err);
      // Revert on error
      setProducts(prev => prev.map(p => p._id === product._id ? { ...p, isActive: !nextStatus } : p));
      alert('Error updating status');
    }
  };

  const handleDelete = async (product) => {
    if (window.confirm(`Are you sure you want to delete ${product.name}? This will hide it from the inventory, but keep it in past invoices.`)) {
      try {
        await api.delete(`/products/${product._id}`);
        fetchProducts(search);
      } catch (err) {
        alert(err.response?.data?.message || 'Error deleting product');
      }
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <h1 className="text-2xl font-bold text-gray-800">Products</h1>
          <ViewToggle view={view} onChange={setView} />
        </div>
        
        <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-4">
          <form onSubmit={handleSearch} className="flex-1 md:w-64 relative">
            <input
              type="text"
              placeholder="Search products..."
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
            <FiPlus className="mr-2" /> Add Product
          </button>
        </div>
      </div>

      {/* Desktop Table (hidden on mobile) */}
      <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>

              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Purchase Price</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Sale Price</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stock</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Min Stock</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry</th>
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
                    <div className="text-sm">Loading products...</div>
                  </div>
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-10 text-center text-gray-500 text-sm">
                  No products found.
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product._id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex flex-col text-left">
                    <div className="text-sm font-medium text-gray-900">{product.name}</div>
                    <div className="text-xs text-gray-500">Unit: {product.unit}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                  Rs. {Number(product.purchasePrice).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                  Rs. {Number(product.salePrice).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                  <span className={`font-bold ${product.currentStock <= product.minimumStock ? 'text-red-600' : 'text-gray-900'}`}>
                    {product.currentStock} {product.unit}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                  {product.minimumStock} {product.unit}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {product.expiryDate ? new Date(product.expiryDate).toLocaleDateString() : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                  <button
                    type="button"
                    onClick={() => toggleStatus(product)}
                    className="inline-flex items-center gap-2 group cursor-pointer focus:outline-none"
                    title={`Click to switch to ${product.isActive ? 'Inactive' : 'Active'}`}
                  >
                    <span
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        product.isActive ? 'bg-green-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          product.isActive ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full transition-colors ${
                      product.isActive ? 'bg-green-100 text-green-800 group-hover:bg-green-200' : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                    }`}>
                      {product.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => openModal(product)} className="text-blue-600 hover:text-blue-900 mr-4">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(product)} className="text-red-600 hover:text-red-900">
                    <FiTrash2 className="inline mr-1" /> Delete
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
            Loading products...
          </div>
        ) : view === 'list' ? (
          <MobileListView
            items={products}
            emptyText="No products found."
            onSelect={(p) => openModal(p)}
            renderRow={(p) => {
              const isLowStock = p.currentStock <= p.minimumStock;
              return (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">
                      {p.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      Unit: {p.unit} {p.expiryDate ? `• Exp: ${new Date(p.expiryDate).toLocaleDateString()}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-sm text-gray-900 whitespace-nowrap">
                      Rs. {Number(p.salePrice).toLocaleString()}
                    </p>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                      isLowStock ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {p.currentStock} {p.unit}
                    </span>
                  </div>
                  <span className="text-gray-300 text-xl leading-none ml-1" aria-hidden="true">
                    ›
                  </span>
                </>
              );
            }}
          />
        ) : (
          <MobileCardView
            items={products}
            emptyText="No products found."
            onSelect={(p) => openModal(p)}
            renderCard={(p, onSelect) => {
              const isLowStock = p.currentStock <= p.minimumStock;
              return (
                <div className="space-y-3">
                  <div className="flex justify-between items-start cursor-pointer" onClick={() => onSelect(p)}>
                    <div>
                      <div className="text-base font-bold text-gray-900">{p.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">Unit: {p.unit}</div>
                      {p.expiryDate && (
                        <div className="text-xs text-amber-700 mt-0.5">
                          Expires: {new Date(p.expiryDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        isLowStock ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        Stock: {p.currentStock} {p.unit}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs border-t pt-2 border-gray-100">
                    <div>
                      <span className="text-gray-500">Purchase Price: </span>
                      <span className="font-semibold text-gray-800">Rs. {Number(p.purchasePrice).toLocaleString()}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-500">Sale Price: </span>
                      <span className="font-semibold text-blue-600">Rs. {Number(p.salePrice).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => toggleStatus(p)}
                      className="inline-flex items-center gap-2 cursor-pointer focus:outline-none min-h-[44px]"
                      title={`Click to switch to ${p.isActive ? 'Inactive' : 'Active'}`}
                    >
                      <span
                        className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                          p.isActive ? 'bg-green-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            p.isActive ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        p.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {p.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openModal(p)}
                        className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-xs font-medium min-h-[36px]"
                      >
                        <FiEdit2 className="inline mr-1" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(p)}
                        className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded text-xs font-medium min-h-[36px]"
                      >
                        <FiTrash2 className="inline mr-1" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            }}
          />
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-y-auto max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                {editingProduct ? 'Edit Product' : 'Add Product'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>


                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <input type="text" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="e.g. Box, Kg, Pack" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Stock</label>
                  <input type="number" min="0" placeholder="0" value={formData.minimumStock} onChange={e => setFormData({...formData, minimumStock: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Price</label>
                  <input type="number" min="0" step="0.01" placeholder="0" value={formData.purchasePrice} onChange={e => setFormData({...formData, purchasePrice: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sale Price</label>
                  <input type="number" min="0" step="0.01" placeholder="0" value={formData.salePrice} onChange={e => setFormData({...formData, salePrice: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                  <input type="date" value={formData.expiryDate} onChange={e => setFormData({...formData, expiryDate: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
                {!editingProduct && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Opening Stock <span className="text-xs text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.openingStock}
                      onChange={e => setFormData({...formData, openingStock: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="0"
                    />
                  </div>
                )}
                <div className="flex items-end mb-2">
                  <div className="flex items-center h-5">
                    <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
                    <label className="ml-2 block text-sm text-gray-700">Product is Active</label>
                  </div>
                </div>
              </div>
              
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
                  ) : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
