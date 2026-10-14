import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { FiTrash2, FiArrowLeft } from 'react-icons/fi';
import SelectOrTypeInput from '../components/SelectOrTypeInput';

const NewPurchasePage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [supplier, setSupplier] = useState({ id: '', name: '', isManual: false });
  const [items, setItems] = useState([{ productId: '', quantity: '', cost: '', total: 0 }]);
  const [discount, setDiscount] = useState('');
  const [paid, setPaid] = useState('');
  const [nextNumberInfo, setNextNumberInfo] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(isEditing);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const fetchPromises = [
          api.get('/suppliers'),
          api.get('/products')
        ];
        if (!isEditing) {
          fetchPromises.push(api.get('/purchases/next-number').catch(() => ({ data: { data: null } })));
        } else {
          fetchPromises.push(api.get(`/purchases/${id}`).catch(() => ({ data: { data: null } })));
        }

        const [suppRes, prodRes, extraRes] = await Promise.all(fetchPromises);
        if (!ignore) {
          setSuppliers(suppRes.data.data.filter(s => s.isActive));
          setProducts(prodRes.data.data.filter(p => p.isActive));

          if (!isEditing && extraRes.data?.data) {
            setNextNumberInfo(extraRes.data.data);
          } else if (isEditing && extraRes.data?.data) {
            const purData = extraRes.data.data;
            const isGeneral = !purData.supplierId || purData.supplierId.name === 'General Supplier';
            setSupplier({
              id: isGeneral ? '' : (purData.supplierId?._id || ''),
              name: isGeneral ? '' : (purData.supplierId?.name || ''),
              isManual: false
            });
            setItems(purData.items.map(item => ({
              productId: item.productId?._id || item.productId,
              quantity: item.quantity,
              cost: item.cost,
              total: item.total || (item.quantity * item.cost)
            })));
            setDiscount(purData.discount ? String(purData.discount) : '');
            setPaid(purData.paid ? String(purData.paid) : '');
            setNextNumberInfo({ nextNumber: purData.purchaseNumber, orderNumber: 'Edit' });
          }
        }
      } catch (err) {
        if (!ignore) console.error(err);
      } finally {
        if (!ignore) setLoadingEdit(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [id, isEditing]);

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    if (field === 'productId') {
      const product = products.find(p => p._id === value);
      newItems[index].productId = value;
      newItems[index].cost = product ? product.purchasePrice : '';
      newItems[index].total = (Number(newItems[index].quantity) || 0) * (Number(newItems[index].cost) || 0);
    } else {
      newItems[index][field] = value;
      const qty = Number(newItems[index].quantity) || 0;
      const cst = Number(newItems[index].cost) || 0;
      newItems[index].total = qty * cst;
    }
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { productId: '', quantity: '', cost: '', total: 0 }]);
  };

  const removeItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const subtotal = items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const grandTotal = Math.max(0, subtotal - (Number(discount) || 0));
  const remaining = grandTotal - (Number(paid) || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.length === 0 || items.some(i => !i.productId)) {
      return alert('Please select at least one valid product.');
    }

    setSubmitting(true);
    try {
      let finalSupplierId = supplier.id || null;
      // If entered manually or no id, find existing by name or create new supplier
      if (!finalSupplierId && supplier.name && supplier.name.trim()) {
        const trimmedName = supplier.name.trim();
        const existing = suppliers.find(s => s.name.toLowerCase() === trimmedName.toLowerCase());
        if (existing) {
          finalSupplierId = existing._id;
        } else {
          const createRes = await api.post('/suppliers', { name: trimmedName });
          finalSupplierId = createRes.data.data._id;
        }
      }

      const numDiscount = Number(discount) || 0;
      const numPaid = Number(paid) || 0;
      const numGrandTotal = Math.max(0, subtotal - numDiscount);
      const numRemaining = numGrandTotal - numPaid;

      const payload = {
        supplierId: finalSupplierId,
        items: items.map(i => ({
          productId: i.productId,
          quantity: Number(i.quantity) || 1,
          cost: Number(i.cost) || 0,
          total: (Number(i.quantity) || 1) * (Number(i.cost) || 0)
        })),
        subtotal,
        discount: numDiscount,
        grandTotal: numGrandTotal,
        paid: numPaid,
        remaining: numRemaining
      };

      let response;
      if (isEditing) {
        response = await api.put(`/purchases/${id}`, payload);
      } else {
        response = await api.post('/purchases', payload);
      }

      navigate(`/invoice/purchase/${response.data.data._id}`);
    } catch (err) {
      setSubmitting(false);
      alert(err.response?.data?.message || `Error ${isEditing ? 'updating' : 'creating'} purchase`);
    }
  };

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/purchases');
    }
  };

  if (loadingEdit) {
    return <div className="text-center py-10 font-medium text-gray-500">Loading purchase details for editing...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors border border-gray-200 shadow-2xs cursor-pointer"
            title="Go back to Purchases"
            aria-label="Back"
          >
            <FiArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{isEditing ? 'Edit Purchase Invoice' : 'New Purchase'}</h1>
            <p className="text-xs text-gray-500 mt-0.5">{isEditing ? 'Modify items, quantities, or costs' : 'Enter stock receipt details to generate purchase invoice'}</p>
          </div>
        </div>
        {nextNumberInfo && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-sm font-semibold shadow-xs">
            <span className="text-xs uppercase tracking-wider text-blue-600 font-medium">Purchase No:</span>
            <span className="font-mono text-base">{nextNumberInfo.nextNumber}</span>
            <span className="text-xs text-blue-600 font-normal">
              (Order #{nextNumberInfo.orderNumber})
            </span>
          </div>
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
        <div className="mb-6">
          <SelectOrTypeInput
            label="Select Supplier (Optional)"
            entityName="Supplier"
            items={suppliers}
            value={supplier}
            onChange={setSupplier}
          />
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3 border-b pb-2">Purchase Items</h3>
          {items.map((item, index) => (
            <div key={index} className="flex flex-col md:flex-row gap-4 items-start md:items-end mb-4 bg-gray-50 p-4 rounded-md">
              <div className="flex-1 w-full">
                <label className="block text-xs font-medium text-gray-700 mb-1">Product</label>
                <select 
                  value={item.productId} 
                  onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">Select Product</option>
                  {products.map(p => (
                    <option key={p._id} value={p._id}>
                      {p.name} ({p.currentStock} in stock)
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-full md:w-24">
                <label className="block text-xs font-medium text-gray-700 mb-1">Qty</label>
                <input 
                  type="number" min="1" 
                  value={item.quantity} 
                  placeholder="1"
                  onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" 
                />
              </div>
              <div className="w-full md:w-32">
                <label className="block text-xs font-medium text-gray-700 mb-1">Unit Cost (Rs)</label>
                <input 
                  type="number" min="0" step="0.01" 
                  value={item.cost} 
                  placeholder="0"
                  onChange={(e) => handleItemChange(index, 'cost', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" 
                />
              </div>
              <div className="w-full md:w-32">
                <label className="block text-xs font-medium text-gray-700 mb-1">Total (Rs)</label>
                <input 
                  type="text" disabled 
                  value={(Number(item.total) || 0).toFixed(2)} 
                  className="w-full px-3 py-2 border border-gray-200 bg-gray-100 rounded-md text-sm font-medium" 
                />
              </div>
              <div className="w-full md:w-10 flex justify-center">
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700 p-2">
                    <FiTrash2 />
                  </button>
                )}
              </div>
            </div>
          ))}
          <button 
            type="button" 
            onClick={addItem} 
            className="mt-2 min-h-[44px] px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium rounded-md transition-colors cursor-pointer inline-flex items-center"
          >
            + Add Another Item
          </button>
        </div>

        <div className="flex justify-end">
          <div className="w-full md:w-1/3 bg-gray-50 p-4 rounded-md border border-gray-200">
            <div className="flex justify-between mb-2 text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">Rs. {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-2 items-center text-sm">
              <span className="text-gray-600">Discount:</span>
              <input 
                type="number" min="0" 
                value={discount} 
                placeholder="0"
                onChange={(e) => setDiscount(e.target.value)}
                className="w-28 min-h-[44px] px-3 py-2 border border-gray-300 rounded-md text-right text-base"
              />
            </div>
            <div className="flex justify-between mb-4 text-lg font-bold">
              <span>Grand Total:</span>
              <span>Rs. {grandTotal.toFixed(2)}</span>
            </div>
            
            <hr className="my-3 border-gray-300" />
            
            <div className="flex justify-between mb-2 items-center text-sm">
              <span className="text-gray-600">Amount Paid:</span>
              <input 
                type="number" min="0" 
                value={paid} 
                placeholder="0"
                onChange={(e) => setPaid(e.target.value)}
                className="w-28 min-h-[44px] px-3 py-2 border border-gray-300 rounded-md text-right text-base"
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Remaining:</span>
              <span className={`font-medium ${remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                Rs. {remaining.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button 
            type="submit" 
            disabled={submitting}
            className={`flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-8 py-3 min-h-[44px] rounded-md font-semibold shadow-sm transition-all text-base ${submitting ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {submitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                {isEditing ? 'Updating Purchase Invoice...' : 'Creating Purchase Invoice...'}
              </>
            ) : (
              isEditing ? 'Update Purchase Invoice' : 'Save Purchase'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewPurchasePage;
