import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { FiPrinter, FiArrowLeft, FiShare2, FiEdit2, FiCopy, FiCheck, FiX, FiDownload } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
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
  const [previewImage, setPreviewImage] = useState(null);
  const [previewBlob, setPreviewBlob] = useState(null);
  const [copied, setCopied] = useState(false);

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

  const rawPartyName = isSale ? data.customerId?.name : data.supplierId?.name;
  const isGenericParty = !rawPartyName ||
    rawPartyName.trim().toLowerCase() === 'walk-in' ||
    rawPartyName.trim().toLowerCase() === 'cash / walk-in' ||
    rawPartyName.trim().toLowerCase() === 'general supplier' ||
    rawPartyName.trim().toLowerCase() === 'unnamed customer' ||
    rawPartyName.trim().toLowerCase() === 'unnamed supplier';

  const partyName = isGenericParty ? null : rawPartyName;
  const partyPhone = isSale ? data.customerId?.phone : data.supplierId?.phone;
  const partyAddress = isSale ? data.customerId?.address : data.supplierId?.address;
  const invoiceNumber = isSale ? data.invoiceNumber : data.purchaseNumber;

  const triggerDownload = (file, fileName) => {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleShare = async () => {
    if (isSharing) return;
    setIsSharing(true);

    const element = document.getElementById('printable-invoice');
    if (!element) {
      setIsSharing(false);
      return;
    }

    try {
      // 1. Wait for custom fonts to be fully loaded and ready
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
      // 2. Allow React state update and browser layout to settle completely
      await new Promise((resolve) => setTimeout(resolve, 150));

      // 3. Snapshot with 2x Retina scale and fixed container geometry
      const canvas = await html2canvas(element, {
        scale: 2, // 2x Retina scale for crystal clear, sharp borders and typography
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 420,
        onclone: (clonedDoc) => {
          if (clonedDoc.defaultView) {
            clonedDoc.defaultView.scrollTo(0, 0);
          }
          const styleEl = clonedDoc.createElement('style');
          styleEl.textContent = `
            #printable-invoice {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
              color: #000000 !important;
              background-color: #ffffff !important;
            }
            #printable-invoice table {
              border-collapse: collapse !important;
            }
            #printable-invoice th, #printable-invoice td {
              color: #000000 !important;
            }
          `;
          clonedDoc.head.appendChild(styleEl);

          const clonedElement = clonedDoc.getElementById('printable-invoice');
          if (clonedElement) {
            clonedElement.style.width = '380px';
            clonedElement.style.maxWidth = '380px';
            clonedElement.style.minWidth = '380px';
            clonedElement.style.boxSizing = 'border-box';
            clonedElement.style.padding = '22px';
            clonedElement.style.margin = '0 auto';
            clonedElement.style.backgroundColor = '#ffffff';
            clonedElement.style.boxShadow = 'none';
            clonedElement.style.borderRadius = '8px';
            clonedElement.style.border = '1px solid #e5e7eb';
          }
        }
      });

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Could not generate receipt image blob');

      const fileName = `${invoiceNumber}.png`;
      const file = new File([blob], fileName, {
        type: 'image/png',
        lastModified: Date.now(),
      });

      const imgUrl = URL.createObjectURL(blob);
      setPreviewBlob(blob);
      setPreviewImage(imgUrl);

      // Check if browser supports native file sharing (e.g. Safari on iOS, Chrome on Android)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `Invoice ${invoiceNumber}`,
          });
          // User shared successfully through native share sheet
          setPreviewImage(null);
          return;
        } catch (shareErr) {
          if (shareErr.name === 'AbortError') {
            // User dismissed share dialog
            setPreviewImage(null);
            return;
          }
        }
      }

      // If browser doesn't support direct file sharing (like Chrome on iPhone, or desktop):
      // The preview modal stays open allowing them to Copy Image, WhatsApp text share, or Download!
    } catch (error) {
      console.error('Error sharing image:', error);
      alert('Failed to generate receipt image: ' + error.message);
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyImage = async () => {
    try {
      if (navigator.clipboard && window.ClipboardItem && previewBlob) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': previewBlob })
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } else {
        alert('Please press and hold the receipt image below and select "Copy".');
      }
    } catch (err) {
      console.warn('Clipboard copy error:', err);
      alert('Could not copy automatically. Please press and hold the receipt image and tap "Copy".');
    }
  };

  const handleWhatsAppTextShare = () => {
    const customerName = data?.customerId?.name || 'Customer';
    const text = `*INVOICE ${invoiceNumber}*\n` +
      `*HAMDAN TRADERS*\n` +
      `Contact at: 0300-2970372\n` +
      `Date: ${format(new Date(data.date), 'dd/MM/yyyy')}\n` +
      `Customer: ${customerName}\n` +
      (data.category ? `Category: ${data.category}\n` : '') +
      `--------------------------\n` +
      `*Grand Total: Rs. ${Number(data.grandTotal || 0).toLocaleString()}*\n` +
      `Paid: Rs. ${Number(data.paid || 0).toLocaleString()}\n` +
      `Remaining Balance: Rs. ${Number(data.remaining || 0).toLocaleString()}\n` +
      `Status: ${data.status}\n` +
      `--------------------------\n` +
      `Thank you for your business!`;

    const phone = data?.customerId?.phone ? data.customerId.phone.replace(/[^0-9]/g, '') : '';
    const waUrl = phone
      ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

    window.open(waUrl, '_blank');
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
          {!data.isCancelled && (
            <button
              onClick={() => navigate(isSale ? `/sales/edit/${data._id}` : `/purchases/edit/${data._id}`)}
              disabled={isSharing}
              className="flex px-3.5 py-1.5 bg-amber-600 text-white rounded-md shadow-sm hover:bg-amber-700 items-center text-sm font-medium disabled:opacity-50 transition-all cursor-pointer"
              title="Edit this invoice"
            >
              <FiEdit2 className="mr-1.5" /> Edit
            </button>
          )}
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
            backgroundColor: '#ffffff',
            color: '#000000',
          }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 4px 0', color: '#000000' }}>
              HAMDAN TRADERS
            </h2>
            <p style={{ fontSize: '12px', fontWeight: 'normal', margin: '0 0 4px 0', color: '#000000' }}>
              Contact at : 0300-2970372
            </p>
            <p style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0, color: '#000000' }}>
              DELIVERY AVAILABLE
            </p>
          </div>

          {/* Solid Separator */}
          <div style={{ borderBottom: '2px solid #000000', margin: '10px 0', width: '100%', height: 0 }} />

          {/* Invoice & Party Metadata */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', color: '#000000', marginBottom: '6px' }}>
            <tbody>
              <tr>
                <td style={{ width: '90px', fontWeight: 'bold', padding: '2px 0', verticalAlign: 'top' }}>Invoice #:</td>
                <td style={{ padding: '2px 0', verticalAlign: 'top' }}>{invoiceNumber}</td>
              </tr>
              <tr>
                <td style={{ width: '90px', fontWeight: 'bold', padding: '2px 0', verticalAlign: 'top' }}>Date:</td>
                <td style={{ padding: '2px 0', verticalAlign: 'top' }}>{format(new Date(data.date), 'dd/MM/yyyy')}</td>
              </tr>
              <tr>
                <td style={{ width: '90px', fontWeight: 'bold', padding: '2px 0', verticalAlign: 'top' }}>Time:</td>
                <td style={{ padding: '2px 0', verticalAlign: 'top' }}>{format(new Date(data.date), 'hh:mm a')}</td>
              </tr>
              {isSale && data.category && (
                <tr>
                  <td style={{ width: '90px', fontWeight: 'bold', padding: '2px 0', verticalAlign: 'top' }}>Category:</td>
                  <td style={{ padding: '2px 0', verticalAlign: 'top', fontWeight: 'bold' }}>{data.category}</td>
                </tr>
              )}

              {partyName && (
                <>
                  <tr>
                    <td colSpan={2} style={{ padding: '5px 0' }}>
                      <div style={{ borderBottom: '1px dashed #000000', width: '100%', height: 0 }} />
                    </td>
                  </tr>
                  <tr>
                    <td style={{ width: '90px', fontWeight: 'bold', padding: '2px 0', verticalAlign: 'top' }}>
                      {isSale ? 'Customer:' : 'Supplier:'}
                    </td>
                    <td style={{ padding: '2px 0', verticalAlign: 'top', fontWeight: '600', wordBreak: 'break-word' }}>
                      {partyName}
                    </td>
                  </tr>
                  {partyPhone && (
                    <tr>
                      <td style={{ width: '90px', fontWeight: 'bold', padding: '2px 0', verticalAlign: 'top' }}>Phone:</td>
                      <td style={{ padding: '2px 0', verticalAlign: 'top' }}>{partyPhone}</td>
                    </tr>
                  )}
                  {partyAddress && (
                    <tr>
                      <td style={{ width: '90px', fontWeight: 'bold', padding: '2px 0', verticalAlign: 'top' }}>Address:</td>
                      <td style={{ padding: '2px 0', verticalAlign: 'top', fontSize: '11px', wordBreak: 'break-word' }}>
                        {partyAddress}
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>

          {/* Solid Separator */}
          <div style={{ borderBottom: '2px solid #000000', margin: '10px 0', width: '100%', height: 0 }} />

          {/* Boxed Items Table */}
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              border: '1.5px solid #000000',
              tableLayout: 'fixed',
              fontSize: '11.5px',
              color: '#000000',
              marginBottom: '12px'
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <th style={{ width: '42%', border: '1px solid #000000', padding: '6px 5px', textAlign: 'left', fontWeight: 'bold' }}>
                  Item
                </th>
                <th style={{ width: '18%', border: '1px solid #000000', padding: '6px 3px', textAlign: 'center', fontWeight: 'bold' }}>
                  Rate
                </th>
                <th style={{ width: '15%', border: '1px solid #000000', padding: '6px 3px', textAlign: 'center', fontWeight: 'bold' }}>
                  Qty
                </th>
                <th style={{ width: '25%', border: '1px solid #000000', padding: '6px 5px', textAlign: 'right', fontWeight: 'bold' }}>
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => {
                const price = isSale ? item.price : item.cost;
                const total = (price || 0) * item.quantity;
                return (
                  <tr key={index}>
                    <td style={{ border: '1px solid #000000', padding: '6px 5px', textAlign: 'left', verticalAlign: 'top', fontWeight: 'bold', wordBreak: 'break-word' }}>
                      {item.productId?.name || 'Unknown Product'}
                    </td>
                    <td style={{ border: '1px solid #000000', padding: '6px 3px', textAlign: 'center', verticalAlign: 'top' }}>
                      {price?.toLocaleString()}
                    </td>
                    <td style={{ border: '1px solid #000000', padding: '6px 3px', textAlign: 'center', verticalAlign: 'top' }}>
                      {item.quantity}
                    </td>
                    <td style={{ border: '1px solid #000000', padding: '6px 5px', textAlign: 'right', verticalAlign: 'top' }}>
                      Rs. {total.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Totals Section (Right Aligned Table) */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', marginBottom: '10px' }}>
            <table style={{ width: '65%', borderCollapse: 'collapse', fontSize: '12px', color: '#000000' }}>
              <tbody>
                <tr>
                  <td style={{ textAlign: 'left', fontWeight: 'bold', padding: '3px 0' }}>Subtotal:</td>
                  <td style={{ textAlign: 'right', padding: '3px 0' }}>Rs. {data.subtotal?.toLocaleString()}</td>
                </tr>
                {data.discount > 0 && (
                  <tr>
                    <td style={{ textAlign: 'left', fontWeight: 'bold', padding: '3px 0' }}>Discount:</td>
                    <td style={{ textAlign: 'right', padding: '3px 0' }}>- Rs. {data.discount?.toLocaleString()}</td>
                  </tr>
                )}
                <tr>
                  <td style={{ textAlign: 'left', fontWeight: '900', fontSize: '13.5px', padding: '4px 0' }}>TOTAL:</td>
                  <td style={{ textAlign: 'right', fontWeight: '900', fontSize: '13.5px', padding: '4px 0' }}>Rs. {data.grandTotal?.toLocaleString()}</td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'left', fontWeight: 'bold', padding: '3px 0' }}>Paid:</td>
                  <td style={{ textAlign: 'right', padding: '3px 0' }}>Rs. {data.paid?.toLocaleString()}</td>
                </tr>
                <tr>
                  <td colSpan={2} style={{ padding: '4px 0' }}>
                    <div style={{ borderBottom: '1px dashed #000000', width: '100%', height: 0 }} />
                  </td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'left', fontWeight: 'bold', padding: '3px 0' }}>Balance:</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '3px 0' }}>Rs. {data.remaining?.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Solid Separator */}
          <div style={{ borderBottom: '2px solid #000000', margin: '10px 0', width: '100%', height: 0 }} />

          {/* Status Section */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', color: '#000000', margin: '4px 0' }}>
            <tbody>
              <tr>
                <td style={{ textAlign: 'left', fontWeight: 'bold', padding: '2px 0' }}>Status:</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '13.5px', padding: '2px 0' }}>
                  {data.status === 'PAID' ? 'Paid' : data.status === 'PARTIAL' ? 'Partial' : 'Unpaid'}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Dashed Separator */}
          <div style={{ borderBottom: '1px dashed #000000', margin: '10px 0', width: '100%', height: 0 }} />

          {/* Footer */}
          <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '12px', color: '#000000' }}>
            <p style={{ fontWeight: 'bold', fontStyle: 'italic', margin: '0 0 3px 0', fontSize: '12px' }}>
              Behtareen Taste, Hamesha Aapke Sath!
            </p>
            <p style={{ fontSize: '11px', color: '#374151', margin: '0 0 6px 0' }}>
              Thank you for your business.
            </p>
            <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#4b5563', margin: 0 }}>
              -- Powered By: www.corevex.tech --
            </p>
          </div>
        </div>
      </div>

      {/* Receipt Image Share & Preview Modal (Vital for iPhone Chrome & Desktop) */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden flex flex-col my-auto border border-gray-100 animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="px-4 py-3 bg-gray-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-base">🧾</span>
                <span className="font-bold text-sm">Receipt Image Ready</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="text-gray-300 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
                title="Close"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* iPhone Hint Banner */}
            <div className="bg-blue-50 px-4 py-2.5 border-b border-blue-100 text-xs text-blue-900 leading-snug">
              <span className="font-bold">📱 iPhone Tip:</span> Press & hold the receipt image below to <strong>Share / Copy</strong> directly to WhatsApp, or use the buttons below!
            </div>

            {/* Receipt Image Preview Container */}
            <div className="p-4 bg-gray-100 flex justify-center items-center max-h-[50vh] overflow-y-auto">
              <img
                src={previewImage}
                alt={`Invoice ${invoiceNumber}`}
                className="rounded-lg shadow-md max-w-full h-auto select-auto"
                style={{ WebkitTouchCallout: 'default' }}
              />
            </div>

            {/* Action Buttons */}
            <div className="p-4 bg-white space-y-2">
              <button
                type="button"
                onClick={handleCopyImage}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                {copied ? <FiCheck className="text-green-300 text-base" /> : <FiCopy className="text-base" />}
                {copied ? 'Image Copied to Clipboard!' : 'Copy Image to Clipboard'}
              </button>

              <button
                type="button"
                onClick={handleWhatsAppTextShare}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <FaWhatsapp className="text-lg" />
                Share on WhatsApp (Summary)
              </button>

              <button
                type="button"
                onClick={() => triggerDownload(previewBlob, `${invoiceNumber}.png`)}
                className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl text-sm flex items-center justify-center gap-2 border border-gray-200 transition-colors cursor-pointer"
              >
                <FiDownload className="text-base" />
                Download Image (PNG)
              </button>

              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="w-full py-1.5 text-xs text-gray-500 hover:text-gray-700 text-center font-medium cursor-pointer"
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

export default Invoice;
