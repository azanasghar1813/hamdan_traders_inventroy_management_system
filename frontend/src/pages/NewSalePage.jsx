import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { FiTrash2 } from 'react-icons/fi';

const NewSalePage = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState([{ productId: '', quantity: 1, price: 0, total: 0 }]);
  const [discount, setDiscount] = useState(0);
  const [paid, setPaid] = useState(0);

  useEffect(() => {
    fetchCustomersAndProducts();
  }, []);

  const fetchCustomersAndProducts = async () => {
    try {
      const [custRes, prodRes] = await Promise.all([
        api.get('/customers'),
        api.get('/products')
      ]);
      setCustomers(custRes.data.data.filter(c => c.isActive));
      // Only show products that have stock
      setProducts(prodRes.data.data.filter(p => p.isActive && p.currentStock > 0));
    } catch (err) {
      console.error(err);
    }
  };

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
    if (!customerId || items.length === 0 || items.some(i => !i.productId)) {
      return alert('Please select a customer and at least one valid product.');
    }

    try {
      const response = await api.post('/sales', {
        customerId,
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Customer *</label>
          <select 
            required 
            value={customerId} 
            onChange={(e) => setCustomerId(e.target.value)}
            className="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">-- Select Customer --</option>
            {customers.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3 border-b pb-2">Sale Items</h3>
          {items.map((item, index) => {
            const selectedProduct = products.find(p => p._id === item.productId);
            const stockAvailable = selectedProduct ? selectedProduct.currentStock : 0;
            const stockError = item.productId && item.quantity > stockAvailable;

            return (
              <div key={index} className={`flex flex-col md:flex-row gap-4 items-start md:items-end mb-4 p-4 rounded-md border ${stockError ? 'border-red-400 bg-red-50' : 'border-transparent bg-gray-50'}`}>
                <div className="flex-1 w-full">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Product *</label>
                  <select 
                    required 
                    value={item.productId} 
                    onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">Select Product</option>
                    {products.map(p => <option key={p._id} value={p._id}>{p.name} ({p.currentStock} in stock)</option>)}
                  </select>
                </div>
                <div className="w-full md:w-24">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Qty *</label>
                  <input 
                    type="number" min="1" required 
                    value={item.quantity} 
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md text-sm ${stockError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'}`} 
                  />
                  {stockError && <span className="text-red-500 text-[10px] absolute">Exceeds stock!</span>}
                </div>
                <div className="w-full md:w-32">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Sale Price (Rs) *</label>
                  <input 
                    type="number" min="0" step="0.01" required 
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
            className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
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
                className="w-24 px-2 py-1 border border-gray-300 rounded text-right"
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
                className="w-24 px-2 py-1 border border-gray-300 rounded text-right"
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
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium shadow-sm"
          >
            Complete Sale
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewSalePage;
