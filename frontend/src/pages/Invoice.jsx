import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { FiPrinter, FiArrowLeft, FiShare2 } from 'react-icons/fi';
import { format } from 'date-fns';
import html2canvas from 'html2canvas-pro';

const Invoice = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine if it's a sale or purchase invoice based on the URL path
  const isSale = location.pathname.includes('/sale/');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const endpoint = isSale ? `/sales/${id}` : `/purchases/${id}`;
        const response = await api.get(endpoint);
        if (!ignore) setData(response.data.data);
      } catch (err) {
        if (!ignore) {
          console.error(err);
          alert('Failed to load invoice details.');
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [id, isSale]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="text-center py-10 font-medium text-gray-600">Loading invoice...</div>;
  if (!data) return <div className="text-center py-10 text-red-500 font-semibold">Invoice not found.</div>;

  const partyName = isSale ? data.customerId?.name : data.supplierId?.name;
  const partyPhone = isSale ? data.customerId?.phone : data.supplierId?.phone;
  const partyAddress = isSale ? data.customerId?.address : data.supplierId?.address;
  const invoiceNumber = isSale ? data.invoiceNumber : data.purchaseNumber;

  const handleShare = async () => {
    if (isSharing) return;
    setIsSharing(true);

    const element = document.getElementById('printable-invoice');
    if (!element) {
      setIsSharing(false);
      return;
    }

    try {
      const canvas = await html2canvas(element, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 1000,
        removeContainer: true,
      });

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Could not generate receipt image blob');

      const fileName = `${invoiceNumber}.png`;
      const file = new File([blob], fileName, {
        type: 'image/png',
        lastModified: Date.now(),
      });

      const triggerDownload = () => {
        const url = URL.createObjectURL(file);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
      };

      // Check if browser supports sharing files (Mobile devices)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `Invoice ${invoiceNumber}`,
          });
          return;
        } catch (shareErr) {
          // If user cancelled the share dialog, do not download
          if (shareErr.name === 'AbortError') {
            return;
          }
          // Some Android devices fail with mixed metadata, retry with files only
          try {
            await navigator.share({ files: [file] });
            return;
          } catch (retryErr) {
            if (retryErr.name === 'AbortError') return;
            triggerDownload();
          }
        }
      } else if (navigator.share) {
        // Fallback for browsers that support text share only
        try {
          await navigator.share({
            title: `Invoice ${invoiceNumber}`,
            text: `Invoice ${invoiceNumber} from Hamdan Traders`,
          });
        } catch (textShareErr) {
          if (textShareErr.name !== 'AbortError') {
            triggerDownload();
          }
        }
      } else {
        // Desktop or browsers without Web Share API
        triggerDownload();
      }
    } catch (error) {
      console.error('Error sharing image:', error);
      alert('Failed to generate receipt image: ' + error.message);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mb-10 print:mb-0 print:max-w-none print:w-full">
      {/* Controls Bar (Hidden during print) */}
      <div className="flex justify-between items-center mb-5 print:hidden">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-600 hover:text-gray-900 flex items-center font-medium text-sm transition-colors cursor-pointer"
        >
          <FiArrowLeft className="mr-1.5" /> Back
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            disabled={isSharing}
            className="flex px-3.5 py-1.5 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 items-center text-sm font-medium disabled:opacity-70 disabled:cursor-wait transition-all cursor-pointer"
          >
            <FiShare2 className={`mr-1.5 ${isSharing ? 'animate-spin' : ''}`} />
            {isSharing ? 'Generating...' : 'Share / Image'}
          </button>
          <button
            onClick={handlePrint}
            disabled={isSharing}
            className="flex px-3.5 py-1.5 bg-gray-900 text-white rounded-md shadow-sm hover:bg-gray-800 items-center text-sm font-medium disabled:opacity-50 transition-all cursor-pointer"
          >
            <FiPrinter className="mr-1.5" /> Print
          </button>
        </div>
      </div>

      {/* Unified Receipt Card (Used for Screen, Print, and Image Share) */}
      <div className="overflow-x-auto w-full pb-6">
        <div
          id="printable-invoice"
          className="bg-white mx-auto text-black p-5 sm:p-6 rounded-xl shadow-md border border-gray-200 print:border-none print:shadow-none print:px-3 print:py-2 print:rounded-none print:max-w-[70mm] print:w-[92%]"
          style={{
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            width: '100%',
            maxWidth: '380px',
            boxSizing: 'border-box',
          }}
        >
          {/* Header */}
          <div className="text-center mb-3">
            <h2 className="text-2xl font-black uppercase tracking-wide mb-1" style={{ letterSpacing: '0.03em' }}>
              HAMDAN TRADERS
            </h2>
            <p className="text-xs font-normal mb-1">
              0319-2828305 &nbsp;|&nbsp; 0300-2970372
            </p>
            <p className="text-xs font-bold uppercase tracking-wider">
              ONLY DELIVERY AVAILABLE
            </p>
          </div>

          <div className="border-b-[1.5px] border-black my-3" />

          {/* Invoice & Party Metadata */}
          <div className="space-y-1.5 text-xs">
            <div className="grid grid-cols-[85px_1fr] items-baseline">
              <span className="font-bold">Invoice #:</span>
              <span>{invoiceNumber}</span>
            </div>
            <div className="grid grid-cols-[85px_1fr] items-baseline">
              <span className="font-bold">Date:</span>
              <span>{format(new Date(data.date), 'dd/MM/yyyy')}</span>
            </div>
            <div className="grid grid-cols-[85px_1fr] items-baseline">
              <span className="font-bold">Time:</span>
              <span>{format(new Date(data.date), 'hh:mm a')}</span>
            </div>

            <div className="border-t border-dashed border-black my-2.5" />

            <div className="grid grid-cols-[85px_1fr] items-start">
              <span className="font-bold">{isSale ? 'Customer:' : 'Supplier:'}</span>
              <span className="leading-tight break-words">{partyName || 'Cash / Walk-in'}</span>
            </div>
            {partyPhone && (
              <div className="grid grid-cols-[85px_1fr] items-baseline">
                <span className="font-bold">Phone:</span>
                <span>{partyPhone}</span>
              </div>
            )}
            {partyAddress && (
              <div className="grid grid-cols-[85px_1fr] items-start">
                <span className="font-bold">Address:</span>
                <span className="text-[11px] leading-tight break-words">{partyAddress}</span>
              </div>
            )}
          </div>

          <div className="border-b-[1.5px] border-black my-3" />

          {/* Boxed Items Table */}
          <table className="w-full text-xs border-collapse border border-black mb-3">
            <thead>
              <tr className="border-b border-black">
                <th className="py-1.5 px-2 text-left font-bold border-r border-black" style={{ width: '40%' }}>
                  Item
                </th>
                <th className="py-1.5 px-1 text-center font-bold border-r border-black" style={{ width: '18%' }}>
                  Rate
                </th>
                <th className="py-1.5 px-1 text-center font-bold border-r border-black" style={{ width: '16%' }}>
                  Qty
                </th>
                <th className="py-1.5 px-2 text-center font-bold" style={{ width: '26%' }}>
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => {
                const price = isSale ? item.price : item.cost;
                const total = (price || 0) * item.quantity;
                return (
                  <tr key={index} className="border-b border-black last:border-b-0">
                    <td className="py-2 px-2 align-top text-left border-r border-black">
                      <div className="font-bold leading-tight">{item.productId?.name || 'Unknown Product'}</div>
                    </td>
                    <td className="py-2 px-1 align-top text-center font-normal border-r border-black">
                      {price?.toLocaleString()}
                    </td>
                    <td className="py-2 px-1 align-top text-center font-normal border-r border-black">
                      {item.quantity}
                    </td>
                    <td className="py-2 px-2 align-top text-center font-normal">
                      Rs. {total.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Totals Section */}
          <div className="flex justify-end mb-3">
            <div className="w-[62%] space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="font-bold">Subtotal:</span>
                <span>Rs. {data.subtotal?.toLocaleString()}</span>
              </div>
              {data.discount > 0 && (
                <div className="flex justify-between">
                  <span className="font-bold">Discount:</span>
                  <span>- Rs. {data.discount?.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline font-bold text-sm">
                <span className="font-black text-sm">TOTAL:</span>
                <span className="font-black text-sm">Rs. {data.grandTotal?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">Paid:</span>
                <span>Rs. {data.paid?.toLocaleString()}</span>
              </div>
              <div className="border-t border-dashed border-black my-1" />
              <div className="flex justify-between font-bold">
                <span>Balance:</span>
                <span>Rs. {data.remaining?.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="border-b-[1.5px] border-black my-3" />

          {/* Invoice Opened & Status Section */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="font-bold">Invoice Opened:</span>
              <span>{format(new Date(data.date), 'dd/MM/yyyy hh:mm a')}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="font-bold">Status:</span>
              <span className="font-bold text-sm">
                {data.status === 'PAID' ? 'Paid' : data.status === 'PARTIAL' ? 'Partial' : 'Unpaid'}
              </span>
            </div>
          </div>

          <div className="border-t border-dashed border-black my-3" />

          {/* Footer */}
          <div className="text-center mt-3 text-xs space-y-1">
            <p className="font-bold italic text-xs">Behtareen Taste, Hamesha Aapke Sath!</p>
            <p className="text-[11px] text-gray-800">Thank you for your business.</p>
            <p className="text-[10px] font-bold text-gray-800 mt-2.5">-- Powered By: www.corevex.tech --</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Invoice;
