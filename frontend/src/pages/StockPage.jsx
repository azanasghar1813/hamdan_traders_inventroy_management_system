import React, { useState, useEffect } from 'react';
import api from '../services/api';
import useViewPreference from '../hooks/useViewPreference';
import ViewToggle from '../components/ViewToggle';
import MobileListView from '../components/MobileListView';
import MobileCardView from '../components/MobileCardView';
import { FiSearch, FiSliders } from 'react-icons/fi';
import { format } from 'date-fns';

const StockPage = () => {
  const [view, setView] = useViewPreference('stock', 'card');
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [adjustmentAction, setAdjustmentAction] = useState('ADD'); // 'ADD' or 'REMOVE'
  const [adjusting, setAdjusting] = useState(false);
  
  const [formData, setFormData] = useState({
    quantity: '',
    reason: ''
  });

  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' or 'movements'

  const fetchData = async () => {
    try {
      const [productsRes, movementsRes] = await Promise.all([
        api.get('/products'),
        api.get('/stock')
      ]);
      setProducts(productsRes.data.data);
      setMovements(movementsRes.data.data);
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
        const [productsRes, movementsRes] = await Promise.all([
          api.get('/products'),
          api.get('/stock')
        ]);
        if (!ignore) {
          setProducts(productsRes.data.data);
          setMovements(movementsRes.data.data);
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

  const openAdjustmentModal = (product) => {
    setSelectedProduct(product);
    setAdjustmentAction('ADD');
    setFormData({ quantity: '', reason: '' });
    setIsModalOpen(true);
  };

  const handleAdjustment = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const qty = Math.abs(Number(formData.quantity));
    if (!qty || isNaN(qty) || qty <= 0) {
      alert('Please enter a valid quantity greater than 0');
      return;
    }

    setAdjusting(true);
    try {
      await api.post('/stock/adjust', {
        productId: selectedProduct._id,
        action: adjustmentAction, // 'ADD' or 'REMOVE'
        type: adjustmentAction === 'REMOVE' ? 'DAMAGE' : 'ADJUSTMENT',
        quantity: qty,
        reason: formData.reason ? formData.reason.trim() : (adjustmentAction === 'ADD' ? 'Stock Added Manually' : 'Stock Removed Manually')
      });
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error adjusting stock');
    } finally {
      setAdjusting(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="text-center py-10">Loading stock data...</div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <h1 className="text-2xl font-bold text-gray-800">Stock Management</h1>
          <ViewToggle view={view} onChange={setView} />
        </div>
        
        <div className="flex flex-wrap bg-gray-200 rounded-lg p-1 w-full sm:w-auto">
          <button 
            className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap ${activeTab === 'inventory' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
            onClick={() => setActiveTab('inventory')}
          >
            Current Inventory
          </button>
          <button 
            className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap ${activeTab === 'movements' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
            onClick={() => setActiveTab('movements')}
          >
            Movement History
          </button>
        </div>
      </div>

      {activeTab === 'inventory' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <div className="relative md:w-64">
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <FiSearch className="absolute left-3 top-3 text-gray-400" />
            </div>
          </div>
          
          {/* Desktop Inventory Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stock</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Min Stock</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => (
                  <tr key={product._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-right">
                      <span className={product.currentStock <= product.minimumStock ? 'text-red-600' : 'text-gray-900'}>
                        {product.currentStock} {product.unit}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                      {product.minimumStock} {product.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {product.currentStock <= product.minimumStock ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Low Stock</span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">OK</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => openAdjustmentModal(product)} 
                        className="text-blue-600 hover:text-blue-900 flex items-center justify-end w-full"
                      >
                        <FiSliders className="mr-1" /> Adjust
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Inventory View */}
          <div className="md:hidden p-4">
            {view === 'list' ? (
              <MobileListView
                items={filteredProducts}
                emptyText="No products found."
                onSelect={(p) => openAdjustmentModal(p)}
                renderRow={(p) => {
                  const isLow = p.currentStock <= p.minimumStock;
                  return (
                    <>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 truncate">
                          {p.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          Min required: {p.minimumStock} {p.unit}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-bold text-sm whitespace-nowrap ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
                          {p.currentStock} {p.unit}
                        </p>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          isLow ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {isLow ? 'Low Stock' : 'OK'}
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
                items={filteredProducts}
                emptyText="No products found."
                onSelect={(p) => openAdjustmentModal(p)}
                renderCard={(p, onSelect) => {
                  const isLow = p.currentStock <= p.minimumStock;
                  return (
                    <div className="space-y-3">
                      <div className="flex justify-between items-start cursor-pointer" onClick={() => onSelect(p)}>
                        <div>
                          <div className="text-base font-bold text-gray-900">{p.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">Unit: {p.unit}</div>
                        </div>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          isLow ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {isLow ? 'Low Stock' : 'OK'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs border-t pt-2 border-gray-100">
                        <div>
                          <span className="text-gray-500">Current Stock: </span>
                          <span className={`font-bold ${isLow ? 'text-red-600' : 'text-gray-900'}`}>{p.currentStock} {p.unit}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-gray-500">Min Required: </span>
                          <span className="font-semibold text-gray-700">{p.minimumStock} {p.unit}</span>
                        </div>
                      </div>

                      <div className="flex justify-end pt-2 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={() => openAdjustmentModal(p)}
                          className="px-4 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-xs font-semibold flex items-center gap-1.5 min-h-[36px]"
                        >
                          <FiSliders /> Adjust Stock
                        </button>
                      </div>
                    </div>
                  );
                }}
              />
            )}
          </div>
        </div>
      )}

      {activeTab === 'movements' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Desktop Movements Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qty Change</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason/Ref</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {movements.map((mov) => (
                  <tr key={mov._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(mov.date), 'dd MMM yyyy, HH:mm')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {mov.productId?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${mov.type === 'SALE' || mov.type === 'DAMAGE' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}
                        ${mov.type === 'ADJUSTMENT' ? 'bg-blue-100 text-blue-800' : ''}
                      `}>
                        {mov.type}
                      </span>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-right ${mov.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {mov.quantity > 0 ? '+' : ''}{mov.quantity} {mov.productId?.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {mov.reason || '-'}
                    </td>
                  </tr>
                ))}
                {movements.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-gray-500 text-sm">
                      No stock movements recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Movements View */}
          <div className="md:hidden p-4">
            {view === 'list' ? (
              <MobileListView
                items={movements}
                emptyText="No stock movements recorded yet."
                renderRow={(mov) => (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate">
                        {mov.productId?.name || 'Product'}
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {mov.type} {mov.reason ? `• ${mov.reason}` : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-bold text-sm whitespace-nowrap ${mov.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {mov.quantity > 0 ? '+' : ''}{mov.quantity} {mov.productId?.unit}
                      </p>
                      <span className="text-[10px] text-gray-400 block">
                        {format(new Date(mov.date), 'dd MMM, HH:mm')}
                      </span>
                    </div>
                  </>
                )}
              />
            ) : (
              <MobileCardView
                items={movements}
                emptyText="No stock movements recorded yet."
                renderCard={(mov) => (
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-sm font-bold text-gray-900">{mov.productId?.name || 'Product'}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{format(new Date(mov.date), 'dd MMM yyyy, hh:mm a')}</div>
                      </div>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        mov.type === 'SALE' || mov.type === 'DAMAGE' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {mov.type}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-gray-100 text-xs">
                      <span className="text-gray-500">Quantity change:</span>
                      <span className={`font-bold ${mov.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {mov.quantity > 0 ? '+' : ''}{mov.quantity} {mov.productId?.unit}
                      </span>
                    </div>
                    {mov.reason && (
                      <div className="text-xs text-gray-500">
                        <span className="font-medium text-gray-600">Ref: </span> {mov.reason}
                      </div>
                    )}
                  </div>
                )}
              />
            )}
          </div>
        </div>
      )}

      {/* Adjustment Modal */}
      {isModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto overflow-hidden animate-fadeIn">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Adjust Stock</h3>
                <p className="text-xs text-gray-500 mt-0.5">Add or remove inventory units easily</p>
              </div>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)} 
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none p-1 rounded hover:bg-gray-200 transition cursor-pointer"
                title="Close"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleAdjustment} className="px-6 py-5">
              {/* Product Info Card */}
              <div className="mb-4 p-3.5 bg-blue-50/70 border border-blue-100 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Product</p>
                  <p className="text-base font-bold text-gray-900">{selectedProduct.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-gray-500">Current Stock</p>
                  <p className="text-base font-black text-blue-900">
                    {selectedProduct.currentStock} {selectedProduct.unit || 'units'}
                  </p>
                </div>
              </div>

              {/* Action Selection Tabs (Add Stock vs Remove Stock) */}
              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Adjustment Type *
                </label>
                <div className="grid grid-cols-2 gap-2.5 p-1 bg-gray-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setAdjustmentAction('ADD')}
                    className={`py-2.5 px-3 rounded-md text-sm font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      adjustmentAction === 'ADD'
                        ? 'bg-emerald-600 text-white shadow'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    <span>➕ Add Stock</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustmentAction('REMOVE')}
                    className={`py-2.5 px-3 rounded-md text-sm font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      adjustmentAction === 'REMOVE'
                        ? 'bg-red-600 text-white shadow'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    <span>➖ Remove Stock</span>
                  </button>
                </div>
              </div>

              {/* Quantity Input */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  {adjustmentAction === 'ADD' ? 'Quantity to Add *' : 'Quantity to Remove *'}
                </label>
                <div className="relative">
                  <input 
                    type="number" 
                    min="0.01"
                    step="any"
                    required 
                    value={formData.quantity} 
                    onChange={e => setFormData({ ...formData, quantity: e.target.value })} 
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-base font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                    placeholder={adjustmentAction === 'ADD' ? 'e.g., 10' : 'e.g., 5 (no minus sign needed)'} 
                    autoFocus
                  />
                  <span className="absolute right-3.5 top-2.5 text-sm font-medium text-gray-400 pointer-events-none">
                    {selectedProduct.unit || 'units'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {adjustmentAction === 'REMOVE' 
                    ? '💡 Minus (-) lagane ki zaroorat nahi hai, system khud stock kam karega.' 
                    : '💡 Yeh quantity seedha current stock mein jama ho jayegi.'}
                </p>
              </div>

              {/* Live Preview Box */}
              {Number(formData.quantity) > 0 && (
                <div className={`mb-4 p-3 rounded-lg border text-xs flex items-center justify-between ${
                  adjustmentAction === 'ADD'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}>
                  <div>
                    <span className="font-semibold">Calculation: </span>
                    <span>
                      {selectedProduct.currentStock} {adjustmentAction === 'ADD' ? '+' : '-'} {Number(formData.quantity)}
                    </span>
                  </div>
                  <div className="font-bold text-sm">
                    New Stock: <span className="underline">
                      {adjustmentAction === 'ADD'
                        ? selectedProduct.currentStock + Number(formData.quantity)
                        : selectedProduct.currentStock - Number(formData.quantity)
                      } {selectedProduct.unit || 'units'}
                    </span>
                  </div>
                </div>
              )}

              {/* Quick Reason Suggestions & Input */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason / Notes (Optional)</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(adjustmentAction === 'ADD'
                    ? ['Restock / Extra', 'Supplier Return', 'Physical Count Correction']
                    : ['Damage / Wastage', 'Expired', 'Missing / Count Correction']
                  ).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setFormData({ ...formData, reason: tag })}
                      className="px-2 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-200 cursor-pointer transition"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <input 
                  type="text"
                  value={formData.reason} 
                  onChange={e => setFormData({ ...formData, reason: e.target.value })} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-1 focus:ring-blue-500" 
                  placeholder={adjustmentAction === 'ADD' ? 'e.g., Direct stock purchase' : 'e.g., Damaged during delivery'}
                />
              </div>
              
              {/* Footer Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={adjusting || !formData.quantity}
                  className={`px-5 py-2 rounded-lg shadow-sm text-sm font-bold text-white transition cursor-pointer disabled:opacity-50 ${
                    adjustmentAction === 'ADD'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {adjusting 
                    ? 'Updating...' 
                    : adjustmentAction === 'ADD' 
                      ? `➕ Confirm Add (+${Number(formData.quantity) || 0})` 
                      : `➖ Confirm Remove (-${Number(formData.quantity) || 0})`
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockPage;
