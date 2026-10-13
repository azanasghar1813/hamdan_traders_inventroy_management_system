import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { FiTrash2 } from 'react-icons/fi';
import SelectOrTypeInput from '../components/SelectOrTypeInput';

const NewPurchasePage = () => {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [supplier, setSupplier] = useState({ id: '', name: '', isManual: false });
  const [items, setItems] = useState([{ productId: '', quantity: 1, cost: 0, total: 0 }]);
  const [discount, setDiscount] = useState(0);
  const [paid, setPaid] = useState(0);


  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const [suppRes, prodRes] = await Promise.all([
          api.get('/suppliers'),
          api.get('/products')
        ]);
        if (!ignore) {
          setSuppliers(suppRes.data.data.filter(s => s.isActive));
          setProducts(prodRes.data.data.filter(p => p.isActive));
        }
      } catch (err) {
        if (!ignore) console.error(err);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    if (field === 'productId') {
      const product = products.find(p => p._id === value);
      newItems[index].productId = value;
      newItems[index].cost = product ? product.purchasePrice : 0;
      newItems[index].total = (Number(newItems[index].quantity) || 0) * (Number(newItems[index].cost) || 0);
    } else {
      newItems[index][field] = value === '' ? '' : Number(value);
      const qty = Number(newItems[index].quantity) || 0;
      const cst = Number(newItems[index].cost) || 0;
      newItems[index].total = qty * cst;
    }
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { productId: '', quantity: 1, cost: 0, total: 0 }]);
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
    if ((!supplier.id && !supplier.name) || items.length === 0 || items.some(i => !i.productId)) {
      return alert('Please select or enter a supplier and at least one valid product.');
    }

    try {
      let finalSupplierId = supplier.id;
      // If entered manually or no id, find existing by name or create new supplier
      if (!finalSupplierId && supplier.name) {
        const trimmedName = supplier.name.trim();
        const existing = suppliers.find(s => s.name.toLowerCase() === trimmedName.toLowerCase());
        if (existing) {
          finalSupplierId = existing._id;
        } else {
          const createRes = await api.post('/suppliers', { name: trimmedName });
          finalSupplierId = createRes.data.data._id;
        }
      }

      const response = await api.post('/purchases', {
        supplierId: finalSupplierId,
        items: items.map(i => ({
          productId: i.productId,
          quantity: Number(i.quantity) || 1,
          cost: Number(i.cost) || 0,
          total: (Number(i.quantity) || 1) * (Number(i.cost) || 0)
        })),
        subtotal,
        discount,
        grandTotal,
        paid,
        remaining
      });
      navigate(`/invoice/purchase/${response.data.data._id}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating purchase');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">New Purchase</h1>
      
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
        <div className="mb-6">
          <SelectOrTypeInput
            label="Select Supplier"
            entityName="Supplier"
            items={suppliers}
            value={supplier}
            onChange={setSupplier}
            required
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
                  {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              </div>
              <div className="w-full md:w-24">
                <label className="block text-xs font-medium text-gray-700 mb-1">Qty</label>
                <input 
                  type="number" min="1" 
                  value={item.quantity} 
                  onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" 
                />
              </div>
              <div className="w-full md:w-32">
                <label className="block text-xs font-medium text-gray-700 mb-1">Unit Cost (Rs)</label>
                <input 
                  type="number" min="0" step="0.01" 
                  value={item.cost} 
                  onChange={(e) => handleItemChange(index, 'cost', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" 
                />
              </div>
              <div className="w-full md:w-32">
                <label className="block text-xs font-medium text-gray-700 mb-1">Total (Rs)</label>
                <input 
                  type="text" disabled 
                  value={item.total.toFixed(2)} 
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
                onChange={(e) => setDiscount(Number(e.target.value))}
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
                onChange={(e) => setPaid(Number(e.target.value))}
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
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 min-h-[44px] rounded-md font-semibold shadow-sm transition-colors cursor-pointer text-base"
          >
            Save Purchase
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewPurchasePage;
