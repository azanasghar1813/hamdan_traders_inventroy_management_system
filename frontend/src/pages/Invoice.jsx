import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { FiPrinter, FiArrowLeft } from 'react-icons/fi';
import { format } from 'date-fns';

const Invoice = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Determine if it's a sale or purchase invoice based on the URL path
  const isSale = location.pathname.includes('/invoice/sale');
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoiceDetails();
  }, [id]);

  const fetchInvoiceDetails = async () => {
    try {
      const endpoint = isSale ? `/sales/${id}` : `/purchases/${id}`;
      const response = await api.get(endpoint);
      setData(response.data.data);
    } catch (err) {
      console.error(err);
      alert('Failed to load invoice details.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="text-center py-10">Loading invoice...</div>;
  if (!data) return <div className="text-center py-10 text-red-500">Invoice not found.</div>;

  const partyName = isSale ? data.customerId?.name : data.supplierId?.name;
  const partyPhone = isSale ? data.customerId?.phone : data.supplierId?.phone;
  const partyAddress = isSale ? data.customerId?.address : data.supplierId?.address;
  const invoiceNumber = isSale ? data.invoiceNumber : data.purchaseNumber;

  return (
    <div className="max-w-4xl mx-auto mb-10">
      {/* Controls (Hidden during print) */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <button 
          onClick={() => navigate(-1)} 
          className="text-gray-600 hover:text-gray-900 flex items-center font-medium"
        >
          <FiArrowLeft className="mr-2" /> Back
        </button>
        <button 
          onClick={handlePrint}
          className="px-6 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 flex items-center"
        >
          <FiPrinter className="mr-2" /> Print Invoice
        </button>
      </div>

      {/* Printable Area */}
      <div className="bg-white p-10 rounded-lg shadow-sm border border-gray-200 print:shadow-none print:border-none print:p-0">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-gray-800 pb-6 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 uppercase tracking-wider mb-1">
              {isSale ? 'Tax Invoice' : 'Purchase Record'}
            </h1>
            <p className="text-sm text-gray-500 font-medium tracking-widest">{invoiceNumber}</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold text-gray-800">Dubai Food & Cafe</h2>
            <p className="text-sm text-gray-600 mt-1">123 Business Road, Suite 400</p>
            <p className="text-sm text-gray-600">Cityville, Country</p>
            <p className="text-sm text-gray-600">Phone: (555) 123-4567</p>
          </div>
        </div>

        {/* Info Section */}
        <div className="flex justify-between mb-10">
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              {isSale ? 'Billed To' : 'Supplier'}
            </h3>
            <p className="text-lg font-bold text-gray-900">{partyName || 'Cash / Walk-in'}</p>
            {partyPhone && <p className="text-sm text-gray-600 mt-1">Phone: {partyPhone}</p>}
            {partyAddress && <p className="text-sm text-gray-600 whitespace-pre-wrap">{partyAddress}</p>}
          </div>
          <div className="text-right">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Details</h3>
            <p className="text-sm text-gray-900 mb-1">
              <span className="font-semibold text-gray-600 mr-2">Date:</span> 
              {format(new Date(data.date), 'dd MMMM, yyyy')}
            </p>
            <p className="text-sm text-gray-900 mb-1">
              <span className="font-semibold text-gray-600 mr-2">Status:</span> 
              <span className={`font-bold ${data.status === 'PAID' ? 'text-green-600' : data.status === 'PARTIAL' ? 'text-yellow-600' : 'text-red-600'}`}>
                {data.status}
              </span>
            </p>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-10">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="py-3 px-2 text-sm font-bold text-gray-700 uppercase tracking-wider">#</th>
                <th className="py-3 px-2 text-sm font-bold text-gray-700 uppercase tracking-wider">Item Description</th>
                <th className="py-3 px-2 text-sm font-bold text-gray-700 uppercase tracking-wider text-center">Qty</th>
                <th className="py-3 px-2 text-sm font-bold text-gray-700 uppercase tracking-wider text-right">Price</th>
                <th className="py-3 px-2 text-sm font-bold text-gray-700 uppercase tracking-wider text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => (
                <tr key={index} className="border-b border-gray-200">
                  <td className="py-4 px-2 text-sm text-gray-600">{index + 1}</td>
                  <td className="py-4 px-2">
                    <p className="text-sm font-bold text-gray-900">{item.productId?.name || 'Unknown Product'}</p>
                    <p className="text-xs text-gray-500">{item.productId?.sku}</p>
                  </td>
                  <td className="py-4 px-2 text-sm text-gray-800 text-center">{item.quantity}</td>
                  <td className="py-4 px-2 text-sm text-gray-800 text-right">
                    Rs. {(isSale ? item.price : item.cost)?.toLocaleString()}
                  </td>
                  <td className="py-4 px-2 text-sm font-bold text-gray-900 text-right">
                    Rs. {(((isSale ? item.price : item.cost) || 0) * item.quantity).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-full md:w-1/2 lg:w-1/3">
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-600">Subtotal:</span>
              <span className="text-sm font-bold text-gray-900">Rs. {data.subtotal?.toLocaleString()}</span>
            </div>
            {data.discount > 0 && (
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-600">Discount:</span>
                <span className="text-sm font-bold text-red-600">- Rs. {data.discount?.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between py-3 border-b-2 border-gray-800">
              <span className="text-lg font-bold text-gray-900">Grand Total:</span>
              <span className="text-lg font-bold text-gray-900">Rs. {data.grandTotal?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-200 mt-2">
              <span className="text-sm font-medium text-gray-600">Amount Paid:</span>
              <span className="text-sm font-bold text-green-600">Rs. {data.paid?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm font-bold text-gray-900">Remaining Balance:</span>
              <span className={`text-sm font-bold ${data.remaining > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                Rs. {data.remaining?.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-gray-200 text-center">
          <p className="text-sm font-bold text-gray-800 mb-1">Thank you for your business!</p>
          <p className="text-xs text-gray-500">If you have any questions concerning this invoice, use the following contact information:</p>
          <p className="text-xs font-bold text-gray-600 mt-2">support@dubaifoodandcafe.com | (555) 123-4567</p>
        </div>

      </div>
    </div>
  );
};

export default Invoice;
