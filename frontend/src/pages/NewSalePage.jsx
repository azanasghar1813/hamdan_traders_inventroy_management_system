import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { FiTrash2 } from 'react-icons/fi';
import SelectOrTypeInput from '../components/SelectOrTypeInput';

const NewSalePage = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [customer, setCustomer] = useState({ id: '', name: '', isManual: false });
  const [items, setItems] = useState([{ productId: '', quantity: 1, price: 0, total: 0 }]);
  const [discount, setDiscount] = useState(0);
  const [paid, setPaid] = useState(0);


  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const [custRes, prodRes] = await Promise.all([
          api.get('/customers'),
          api.get('/products')
        ]);
        if (!ignore) {
          setCustomers(custRes.data.data.filter(c => c.isActive));
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
      newItems[index].price = product ? product.sellingPrice : 0;
      newItems[index].total = newItems[index].quantity * newItems[index].price;
    } else {
      newItems[index][field] = Number(value);
      newItems[index].total = newItems[index].quantity * newItems[index].price;
    }
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { productId: '', quantity: 1, price: 0, total: 0 }]);
  };

  const removeItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const grandTotal = subtotal - discount;
  const remaining = grandTotal - paid;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if ((!customer.id && !customer.name) || items.length === 0 || items.some(i => !i.productId)) {
      return alert('Please select or enter a customer and at least one valid product.');
    }

    try {
      let finalCustomerId = customer.id;
      // If entered manually or no id, find existing by name or create new customer
      if (!finalCustomerId && customer.name) {
        const trimmedName = customer.name.trim();
        const existing = customers.find(c => c.name.toLowerCase() === trimmedName.toLowerCase());
        if (existing) {
          finalCustomerId = existing._id;
        } else {
          const createRes = await api.post('/customers', { name: trimmedName });
          finalCustomerId = createRes.data.data._id;
        }
      }

      const response = await api.post('/sales', {
        customerId: finalCustomerId,
        items,
        subtotal,
        discount,
        grandTotal,
        paid,
        remaining
      });
      navigate(`/invoice/sale/${response.data.data._id}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating sale');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">New Sale Invoice</h1>
      
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
        <div className="mb-6">
          <SelectOrTypeInput
            label="Select Customer"
            entityName="Customer"
            items={customers}
            value={customer}
            onChange={setCustomer}
            required
          />
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3 border-b pb-2">Sale Items</h3>
          {items.map((item, index) => {
            return (
              <div key={index} className="flex flex-col md:flex-row gap-4 items-start md:items-end mb-4 p-4 rounded-md border border-transparent bg-gray-50">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Product</label>
                  <select 
                    value={item.productId} 
                    onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
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
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white" 
                  />
                </div>
                <div className="w-full md:w-32">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Sale Price (Rs)</label>
                  <input 
                    type="number" min="0" step="0.01" 
                    value={item.price} 
                    onChange={(e) => handleItemChange(index, 'price', e.target.value)}
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
            );
          })}
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
            Complete Sale
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewSalePage;
