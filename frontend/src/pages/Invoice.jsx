import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { FiPrinter, FiArrowLeft, FiShare2, FiImage, FiFileText } from 'react-icons/fi';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas-pro';

const Invoice = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Determine if it's a sale or purchase invoice based on the URL path
  const isSale = location.pathname.includes('/sale/');
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(null); // 'pdf' or 'image' or null

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

  const handleShare = async (type) => {
    if (isSharing) return; // Prevent double clicks
    setIsSharing(type);
    
    const element = document.getElementById('printable-invoice');
    if (!element) {
      setIsSharing(null);
      return;
    }
    
    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      
      let file;
      if (type === 'image') {
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        file = new File([blob], `${invoiceNumber}.png`, { type: 'image/png' });
      } else {
        const imgData = canvas.toDataURL('image/png');
        const doc = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = doc.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        doc.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        const pdfBlob = doc.output('blob');
        file = new File([pdfBlob], `${invoiceNumber}.pdf`, { type: 'application/pdf' });
      }

      const triggerDownload = () => {
        const url = URL.createObjectURL(file);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name;
        link.click();
        URL.revokeObjectURL(url);
      };

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `Invoice ${invoiceNumber}`,
            text: 'Here is your invoice.'
          });
        } catch (shareErr) {
          // If share is aborted by user, do nothing. If it fails due to lost gesture, fallback to download.
          if (shareErr.name !== 'AbortError') {
            triggerDownload();
          }
        }
      } else {
        // Fallback to traditional download
        triggerDownload();
      }
    } catch (error) {
      console.error('Error sharing/exporting:', error);
      alert('Failed to process ' + type + ' export: ' + error.message);
    } finally {
      setIsSharing(null);
    }
  };

  return (
    <div className="max-w-xl mx-auto mb-10">
      {/* Controls (Hidden during print) */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <button 
          onClick={() => navigate(-1)} 
          className="text-gray-600 hover:text-gray-900 flex items-center font-medium"
        >
          <FiArrowLeft className="mr-2" /> Back
        </button>
        <div className="flex flex-wrap justify-end gap-2">
          <button 
            onClick={() => handleShare('pdf')}
            disabled={isSharing !== null}
            className="flex px-3 py-2 bg-red-600 text-white rounded-md shadow-sm hover:bg-red-700 items-center text-sm sm:text-base disabled:opacity-70 disabled:cursor-wait"
          >
            <FiShare2 className={`mr-1 ${isSharing === 'pdf' ? 'animate-spin' : ''}`} /> 
            {isSharing === 'pdf' ? 'Wait...' : 'PDF'}
          </button>
          <button 
            onClick={() => handleShare('image')}
            disabled={isSharing !== null}
            className="flex px-3 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 items-center text-sm sm:text-base disabled:opacity-70 disabled:cursor-wait"
          >
            <FiShare2 className={`mr-1 ${isSharing === 'image' ? 'animate-spin' : ''}`} /> 
            {isSharing === 'image' ? 'Wait...' : 'Image'}
          </button>
          <button 
            onClick={handlePrint}
            disabled={isSharing !== null}
            className="flex px-3 py-2 bg-gray-800 text-white rounded-md shadow-sm hover:bg-gray-900 items-center text-sm sm:text-base disabled:opacity-50"
          >
            <FiPrinter className="mr-1" /> Print
          </button>
        </div>
      </div>

      {/* Printable Area Wrapper for Mobile scroll */}
      <div className="overflow-x-auto w-full pb-4">
        <div id="printable-invoice" className="bg-white p-2 sm:p-6 rounded-lg shadow-sm border border-gray-200 print:shadow-none print:border-none print:p-0 w-full min-w-0">
        
        {/* Header */}
        <div className="flex flex-row justify-between items-start border-b-2 border-yellow-500 pb-3 mb-4">
          {/* Text on Left */}
          <div className="flex flex-col justify-center text-left w-auto mt-0">
            <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-wide">HAMDAN TRADERS</h2>
            <p className="text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wider">Frozen Items Supplier</p>
            <p className="text-[10px] sm:text-xs italic font-medium text-yellow-600 mb-1">Behtareen Taste, Hamesha Aapke Sath!</p>
            
            <p className="text-xs sm:text-sm font-bold text-gray-800 mt-1">📞 0319-2828305 | 0300-2970372</p>
            <p className="text-xs sm:text-sm font-bold text-red-600">Only Delivery Available</p>
          </div>
          
          {/* Logo on Right */}
          <div className="flex justify-end w-auto">
            <img src="/logo.png" alt="Hamdan Traders" className="h-16 sm:h-24 object-contain" />
          </div>
        </div>

        {/* Info Section */}
        <div className="flex flex-row justify-between mb-4 gap-2">
          <div>
            <h3 className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 sm:mb-2">
              {isSale ? 'Billed To' : 'Supplier'}
            </h3>
            <p className="text-sm sm:text-lg font-bold text-gray-900">{partyName || 'Cash / Walk-in'}</p>
            {partyPhone && <p className="text-xs sm:text-sm text-gray-600 mt-1">Phone: {partyPhone}</p>}
            {partyAddress && <p className="text-xs sm:text-sm text-gray-600 whitespace-pre-wrap">{partyAddress}</p>}
          </div>
          <div className="text-right">
            <h3 className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 sm:mb-2">Details</h3>
            <p className="text-xs sm:text-sm text-gray-900 mb-1">
              <span className="font-semibold text-gray-600 mr-1 sm:mr-2">Invoice #:</span> 
              {invoiceNumber}
            </p>
            <p className="text-xs sm:text-sm text-gray-900 mb-1">
              <span className="font-semibold text-gray-600 mr-1 sm:mr-2">Date:</span> 
              {format(new Date(data.date), 'dd MMM, yyyy')}
            </p>
            <p className="text-xs sm:text-sm text-gray-900 mb-1">
              <span className="font-semibold text-gray-600 mr-1 sm:mr-2">Status:</span> 
              <span className={`font-bold ${data.status === 'PAID' ? 'text-green-600' : data.status === 'PARTIAL' ? 'text-yellow-600' : 'text-red-600'}`}>
                {data.status}
              </span>
            </p>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-4">
          <table className="w-full text-left border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-400">
                <th className="py-1 px-1 sm:py-2 sm:px-3 border border-gray-300 text-[10px] sm:text-sm font-bold text-gray-700 uppercase tracking-wider text-center w-8 sm:w-12">#</th>
                <th className="py-1 px-1 sm:py-2 sm:px-3 border border-gray-300 text-[10px] sm:text-sm font-bold text-gray-700 uppercase tracking-wider">Item</th>
                <th className="py-1 px-1 sm:py-2 sm:px-3 border border-gray-300 text-[10px] sm:text-sm font-bold text-gray-700 uppercase tracking-wider text-center">Qty</th>
                <th className="py-1 px-1 sm:py-2 sm:px-3 border border-gray-300 text-[10px] sm:text-sm font-bold text-gray-700 uppercase tracking-wider text-right">Price</th>
                <th className="py-1 px-1 sm:py-2 sm:px-3 border border-gray-300 text-[10px] sm:text-sm font-bold text-gray-700 uppercase tracking-wider text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => (
                <tr key={index} className="border-b border-gray-300">
                  <td className="py-1 px-1 sm:py-2 sm:px-3 border border-gray-300 text-xs sm:text-sm text-gray-800 text-center">{index + 1}</td>
                  <td className="py-1 px-1 sm:py-2 sm:px-3 border border-gray-300">
                    <p className="text-xs sm:text-sm font-bold text-gray-900">{item.productId?.name || 'Unknown Product'}</p>
                  </td>
                  <td className="py-1 px-1 sm:py-2 sm:px-3 border border-gray-300 text-xs sm:text-sm font-bold text-gray-900 text-center">{item.quantity}</td>
                  <td className="py-1 px-1 sm:py-2 sm:px-3 border border-gray-300 text-xs sm:text-sm text-gray-800 text-right">
                    {(isSale ? item.price : item.cost)?.toLocaleString()}
                  </td>
                  <td className="py-1 px-1 sm:py-2 sm:px-3 border border-gray-300 text-xs sm:text-sm font-bold text-gray-900 text-right">
                    {(((isSale ? item.price : item.cost) || 0) * item.quantity).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-[65%] sm:w-72">
            <div className="flex justify-between py-1 sm:py-2 border-b border-gray-200">
              <span className="text-xs sm:text-sm font-medium text-gray-600">Subtotal:</span>
              <span className="text-xs sm:text-sm font-bold text-gray-900">Rs. {data.subtotal?.toLocaleString()}</span>
            </div>
            {data.discount > 0 && (
              <div className="flex justify-between py-1 sm:py-2 border-b border-gray-200">
                <span className="text-xs sm:text-sm font-medium text-gray-600">Discount:</span>
                <span className="text-xs sm:text-sm font-bold text-red-600">- Rs. {data.discount?.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between py-1 sm:py-2 border-b-2 border-gray-800">
              <span className="text-sm sm:text-lg font-bold text-gray-900">Grand Total:</span>
              <span className="text-sm sm:text-lg font-bold text-gray-900">Rs. {data.grandTotal?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-200 mt-1 sm:mt-2">
              <span className="text-xs sm:text-sm font-medium text-gray-600">Amount Paid:</span>
              <span className="text-xs sm:text-sm font-bold text-green-600">Rs. {data.paid?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-xs sm:text-sm font-bold text-gray-900">Balance:</span>
              <span className={`text-xs sm:text-sm font-bold ${data.remaining > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                Rs. {data.remaining?.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t-2 border-yellow-500 text-center">
          <p className="text-md font-bold text-gray-800 mb-1 italic">Behtareen Taste, Hamesha Aapke Sath!</p>
          <p className="text-xs text-gray-500">Thank you for your business. For queries, please contact the numbers above.</p>
        </div>

      </div>
      </div>
    </div>
  );
};

export default Invoice;
