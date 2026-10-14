import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { FiDownload, FiFilter, FiImage, FiPackage, FiSearch } from 'react-icons/fi';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable, { applyPlugin } from 'jspdf-autotable';
import html2canvas from 'html2canvas-pro';

applyPlugin(jsPDF);

// Extracts unlayered CSS rules from stylesheets so html2canvas can read Tailwind v4 @layer utilities
const getUnlayeredStyles = () => {
  let cssText = '';
  try {
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        const rules = sheet.cssRules || sheet.rules;
        if (!rules) continue;
        const unwrap = (ruleList) => {
          for (const rule of Array.from(ruleList)) {
            if (rule.cssRules && rule.cssRules.length > 0) {
              if (rule.constructor?.name === 'CSSLayerBlockRule' || !rule.type) {
                unwrap(rule.cssRules);
              } else if (rule.type === CSSRule.MEDIA_RULE || rule.constructor?.name === 'CSSMediaRule') {
                cssText += `@media ${rule.conditionText || rule.media?.mediaText} {\n`;
                unwrap(rule.cssRules);
                cssText += `}\n`;
              } else if (rule.type === CSSRule.SUPPORTS_RULE || rule.constructor?.name === 'CSSSupportsRule') {
                cssText += `@supports ${rule.conditionText} {\n`;
                unwrap(rule.cssRules);
                cssText += `}\n`;
              } else {
                cssText += rule.cssText + '\n';
              }
            } else if (rule.cssText) {
              cssText += rule.cssText + '\n';
            }
          }
        };
        unwrap(rules);
      } catch {
        // Cross-domain stylesheets can't be read directly
      }
    }
  } catch (err) {
    console.warn('Could not extract unlayered styles', err);
  }
  return cssText;
};

const ReportsPage = () => {
  const [activeTab, setActiveTab] = useState('sales');

  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
  });

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [queryTrigger, setQueryTrigger] = useState(0);

  const [itemSearch, setItemSearch] = useState('');
  const [itemSort, setItemSort] = useState('qty-desc');
  const [exportingType, setExportingType] = useState(null); // 'pdf' | 'image' | null

  useEffect(() => {
    let ignore = false;
    const loadReport = async () => {
      if (!startDate || !endDate) return;
      try {
        const endpoint = activeTab === 'sales' ? '/reports/sales' : '/reports/purchases';
        const { data } = await api.get(`${endpoint}?startDate=${startDate}&endDate=${endDate}`);
        if (!ignore) {
          setReportData(data.data);
        }
      } catch (err) {
        if (!ignore) {
          console.error(err);
          setReportData(null);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadReport();
    return () => {
      ignore = true;
    };
  }, [activeTab, startDate, endDate, queryTrigger]);

  const handleFilter = (e) => {
    e.preventDefault();
    setLoading(true);
    setReportData(null);
    setQueryTrigger((prev) => prev + 1);
  };

  const filteredItemStats = useMemo(() => {
    if (!reportData?.itemStats) return [];
    let list = reportData.itemStats;
    if (itemSearch.trim()) {
      const q = itemSearch.toLowerCase();
      list = list.filter((i) => i.name.toLowerCase().includes(q));
    }
    const sorted = [...list];
    if (itemSort === 'qty-desc') sorted.sort((a, b) => b.totalQuantity - a.totalQuantity);
    else if (itemSort === 'amount-desc') sorted.sort((a, b) => b.totalAmount - a.totalAmount);
    else if (itemSort === 'orders-desc') sorted.sort((a, b) => b.orderCount - a.orderCount);
    else if (itemSort === 'name-asc') sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }, [reportData?.itemStats, itemSearch, itemSort]);

  const formattedStartDate = useMemo(() => {
    if (!startDate) return '-';
    try {
      return format(new Date(startDate + 'T00:00:00'), 'dd MMM yyyy');
    } catch {
      return startDate;
    }
  }, [startDate]);

  const formattedEndDate = useMemo(() => {
    if (!endDate) return '-';
    try {
      return format(new Date(endDate + 'T00:00:00'), 'dd MMM yyyy');
    } catch {
      return endDate;
    }
  }, [endDate]);

  // Professional PDF Export with Multi-Page Boundary Awareness
  const exportToPDF = () => {
    if (!reportData) return;

    const items = activeTab === 'sales' ? reportData.sales : reportData.purchases;
    if (!items || items.length === 0) {
      alert('No data to export');
      return;
    }

    setExportingType('pdf');
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Official Company Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(17, 24, 39);
      doc.text('HAMDAN TRADERS', 14, 18);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(75, 85, 99);
      doc.text('FROZEN ITEMS SUPPLIER & WHOLESALE DISTRIBUTION', 14, 23);

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(217, 119, 6);
      doc.text('Behtareen Taste, Hamesha Aapke Sath! | Phone: 0319-2828305 / 0300-2970372', 14, 28);

      // Gold Accent Divider Line
      doc.setDrawColor(234, 179, 8);
      doc.setLineWidth(0.8);
      doc.line(14, 31, pageWidth - 14, 31);

      // Report Title & Metadata
      const title = activeTab === 'sales' ? 'OFFICIAL SALES & REVENUE REPORT' : 'OFFICIAL PURCHASES & EXPENSES REPORT';
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(activeTab === 'sales' ? 30 : 15, activeTab === 'sales' ? 64 : 118, activeTab === 'sales' ? 175 : 110);
      doc.text(title, 14, 38);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(55, 65, 81);
      doc.text(`Period: ${formattedStartDate} to ${formattedEndDate}`, 14, 43);
      doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`, pageWidth - 14, 43, { align: 'right' });

      // Summary Metric Cards in PDF
      const summary = reportData.summary || {};
      const boxY = 47;
      const boxH = 14;
      const boxW = (pageWidth - 28 - 9) / 4;

      const totalVal = summary.totalSales || summary.totalPurchases || 0;
      const totalQty = summary.totalQuantity || 0;
      const totalPaid = summary.totalPaid || 0;
      const totalRem = summary.totalRemaining || 0;

      const metrics = [
        { label: `Total ${activeTab === 'sales' ? 'Sales' : 'Purchases'}`, value: `Rs. ${totalVal.toLocaleString()}`, color: [30, 64, 175] },
        { label: 'Total Quantity', value: `${totalQty.toLocaleString()} Units`, color: [126, 34, 206] },
        { label: 'Total Received / Paid', value: `Rs. ${totalPaid.toLocaleString()}`, color: [22, 101, 52] },
        { label: 'Balance Outstanding', value: `Rs. ${totalRem.toLocaleString()}`, color: [161, 98, 7] },
      ];

      metrics.forEach((m, idx) => {
        const x = 14 + idx * (boxW + 3);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(x, boxY, boxW, boxH, 1.5, 1.5, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(m.label.toUpperCase(), x + 2.5, boxY + 4.5);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(m.color[0], m.color[1], m.color[2]);
        doc.text(m.value, x + 2.5, boxY + 10.5);
      });

      let currentY = boxY + boxH + 6;

      if (summary.cancelledCount > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(220, 38, 38);
        doc.text(
          `* Notice: ${summary.cancelledCount} cancelled orders (Rs. ${(summary.cancelledTotal || 0).toLocaleString()}) excluded from totals`,
          14,
          currentY
        );
        currentY += 5;
      }

      // 1. Transactions autoTable
      const headers = [
        ['Date', 'Reference', activeTab === 'sales' ? 'Customer' : 'Supplier', 'Total (PKR)', 'Paid (PKR)', 'Remaining (PKR)', 'Status'],
      ];
      const data = items.map((item) => [
        item.date ? format(new Date(item.date), 'dd/MM/yyyy') : '-',
        item.invoiceNumber || item.purchaseNumber,
        (activeTab === 'sales' ? item.customerId?.name : item.supplierId?.name) || 'Walk-in Party',
        item.grandTotal?.toLocaleString() || '0',
        item.paid?.toLocaleString() || '0',
        item.remaining?.toLocaleString() || '0',
        item.isCancelled ? 'CANCELLED' : item.status,
      ]);

      autoTable(doc, {
        startY: currentY,
        head: headers,
        body: data,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2.2, font: 'helvetica' },
        headStyles: {
          fillColor: activeTab === 'sales' ? [37, 99, 235] : [13, 148, 136],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 25, fontStyle: 'bold' },
          2: { cellWidth: 'auto' },
          3: { halign: 'right', fontStyle: 'bold' },
          4: { halign: 'right', textColor: [22, 101, 52] },
          5: { halign: 'right', textColor: [185, 28, 28] },
          6: { halign: 'center', cellWidth: 24, fontStyle: 'bold' },
        },
        didDrawPage: () => {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(156, 163, 175);
          doc.text('Hamdan Traders Inventory Management System', 14, pageHeight - 8);
          doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
        },
      });

      // 2. Item-wise Breakdown table
      if (reportData.itemStats && reportData.itemStats.length > 0) {
        let finalY = (doc.lastAutoTable?.finalY || 100) + 12;
        if (finalY > pageHeight - 45) {
          doc.addPage();
          finalY = 18;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(126, 34, 206);
        doc.text(`Item-wise ${activeTab === 'sales' ? 'Sales' : 'Purchases'} Breakdown (${reportData.itemStats.length} items)`, 14, finalY);

        const itemHeaders = [['Product Name', 'Unit', 'Total Qty', 'Total Amount (PKR)', 'Avg Rate (PKR)', 'Orders']];
        const itemData = reportData.itemStats.map((item) => {
          const avg = item.totalQuantity > 0 ? Math.round(item.totalAmount / item.totalQuantity) : 0;
          return [
            item.name,
            item.unit || 'Units',
            item.totalQuantity.toLocaleString(),
            item.totalAmount.toLocaleString(),
            avg.toLocaleString(),
            item.orderCount.toString(),
          ];
        });

        autoTable(doc, {
          startY: finalY + 4,
          head: itemHeaders,
          body: itemData,
          theme: 'striped',
          styles: { fontSize: 8, cellPadding: 2.2, font: 'helvetica' },
          headStyles: {
            fillColor: [126, 34, 206],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
          },
          columnStyles: {
            0: { fontStyle: 'bold' },
            1: { halign: 'center' },
            2: { halign: 'right', fontStyle: 'bold', textColor: [126, 34, 206] },
            3: { halign: 'right', fontStyle: 'bold' },
            4: { halign: 'right' },
            5: { halign: 'center' },
          },
          didDrawPage: () => {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(156, 163, 175);
            doc.text('Hamdan Traders Inventory Management System', 14, pageHeight - 8);
            doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
          },
        });
      }

      doc.save(`${activeTab}_report_${startDate}_to_${endDate}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
      alert('Failed to generate PDF: ' + err.message);
    } finally {
      setExportingType(null);
    }
  };

  // High-Definition, Beautifully Formatted Image Export
  const exportToImage = async () => {
    const element = document.getElementById('report-content');
    if (!element) return;

    setExportingType('image');
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 1200,
        onclone: (clonedDoc, clonedElement) => {
          // Force clean desktop width for a crisp, widescreen dashboard report
          clonedElement.style.width = '1120px';
          clonedElement.style.maxWidth = '1120px';
          clonedElement.style.minWidth = '1120px';
          clonedElement.style.boxSizing = 'border-box';
          clonedElement.style.padding = '32px';
          clonedElement.style.backgroundColor = '#ffffff';

          // Inject unlayered CSS rules from Tailwind v4
          try {
            const unlayeredCss = getUnlayeredStyles();
            if (unlayeredCss) {
              const styleTag = clonedDoc.createElement('style');
              styleTag.setAttribute('type', 'text/css');
              styleTag.id = 'unlayered-tailwind-styles';
              styleTag.textContent = unlayeredCss;
              clonedDoc.head.appendChild(styleTag);
            }
          } catch (e) {
            console.warn('Failed to inject unlayered styles', e);
          }

          // Prepend official report header banner for exported image
          try {
            const exportHeader = clonedDoc.createElement('div');
            exportHeader.style.paddingBottom = '16px';
            exportHeader.style.marginBottom = '24px';
            exportHeader.style.borderBottom = '2px solid #e2e8f0';
            exportHeader.style.display = 'flex';
            exportHeader.style.justifyContent = 'space-between';
            exportHeader.style.alignItems = 'center';
            exportHeader.innerHTML = `
              <div>
                <h2 style="font-size: 22px; font-weight: 900; color: #111827; margin: 0; text-transform: uppercase; letter-spacing: 0.03em;">
                  ${activeTab === 'sales' ? 'OFFICIAL SALES REPORT' : 'OFFICIAL PURCHASES REPORT'}
                </h2>
                <p style="font-size: 12px; font-weight: 600; color: #4b5563; margin: 4px 0 0 0;">
                  Period: <strong style="color: #111827;">${formattedStartDate}</strong> to <strong style="color: #111827;">${formattedEndDate}</strong>
                </p>
              </div>
              <div style="text-align: right; font-size: 11px; color: #6b7280; font-weight: 500;">
                Generated: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}
              </div>
            `;
            clonedElement.insertBefore(exportHeader, clonedElement.firstChild);
          } catch (err) {
            console.warn('Failed to prepend export header', err);
          }
        },
      });

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${activeTab}_report_${startDate}_to_${endDate}.png`;
      link.click();
    } catch (error) {
      console.error('Error exporting image:', error);
      alert('Failed to export image: ' + error.message);
    } finally {
      setExportingType(null);
    }
  };

  const items = activeTab === 'sales' ? reportData?.sales : reportData?.purchases;
  const noExportData = loading || !reportData || !items?.length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-gray-900 tracking-wide uppercase">
              {activeTab === 'sales' ? 'OFFICIAL SALES REPORT' : 'OFFICIAL PURCHASES REPORT'}
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                activeTab === 'sales'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-teal-50 text-teal-700 border-teal-200'
              }`}
            >
              Live
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-600 font-medium">
            <span>
              Period: <strong className="text-gray-900">{formattedStartDate}</strong> to <strong className="text-gray-900">{formattedEndDate}</strong>
            </span>
            <span className="text-gray-300 hidden sm:inline">•</span>
            <span>
              Generated: <strong className="text-gray-700">{format(new Date(), 'dd MMM yyyy, hh:mm a')}</strong>
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <button
            onClick={exportToPDF}
            disabled={noExportData || exportingType !== null}
            className="flex-1 sm:flex-none flex justify-center items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm font-medium transition-all"
          >
            <FiDownload className={`mr-2 ${exportingType === 'pdf' ? 'animate-bounce' : ''}`} />
            {exportingType === 'pdf' ? 'Generating PDF...' : 'Download PDF'}
          </button>
          <button
            onClick={exportToImage}
            disabled={noExportData || exportingType !== null}
            className="flex-1 sm:flex-none flex justify-center items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm font-medium transition-all"
          >
            <FiImage className={`mr-2 ${exportingType === 'image' ? 'animate-bounce' : ''}`} />
            {exportingType === 'image' ? 'Generating Image...' : 'Download Image'}
          </button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white p-4 rounded-lg shadow flex flex-col md:flex-row justify-between items-center gap-4 border-l-4 border-blue-500">
        <div className="flex bg-gray-100 p-1 rounded-md w-full md:w-auto">
          <button
            className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'sales' ? 'bg-white shadow text-blue-600 font-semibold' : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => {
              setActiveTab('sales');
              setLoading(true);
              setReportData(null);
            }}
          >
            Sales Report
          </button>
          <button
            className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'purchases' ? 'bg-white shadow text-blue-600 font-semibold' : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => {
              setActiveTab('purchases');
              setLoading(true);
              setReportData(null);
            }}
          >
            Purchases Report
          </button>
        </div>

        <form onSubmit={handleFilter} className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <label className="text-sm text-gray-600 font-medium">From:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full sm:w-auto px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 outline-none"
              required
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <label className="text-sm text-gray-600 font-medium">To:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full sm:w-auto px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 outline-none"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto px-4 py-1.5 bg-gray-800 text-white rounded-md text-sm hover:bg-gray-700 flex justify-center items-center mt-2 sm:mt-0 shadow-sm"
          >
            <FiFilter className="mr-2" /> Filter
          </button>
        </form>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mb-3"></div>
          <p className="font-medium text-sm">Generating report data...</p>
        </div>
      ) : reportData ? (
        // Report Content Wrapper for Mobile scroll
        <div className="overflow-x-auto w-full pb-4">
          <div
            id="report-content"
            className="space-y-6 min-w-[800px] md:min-w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8"
            style={{
              fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              backgroundColor: '#ffffff',
              color: '#1f2937',
            }}
          >
            {/* Embedded styles for html2canvas compatibility & perfect report formatting */}
            <style>{`
              #report-content {
                box-sizing: border-box;
                background-color: #ffffff !important;
              }
              .rpt-summary-grid {
                display: grid;
                grid-template-columns: repeat(5, minmax(0, 1fr));
                gap: 16px;
              }
              @media (max-width: 1024px) {
                .rpt-summary-grid {
                  grid-template-columns: repeat(2, minmax(0, 1fr));
                }
              }
              @media (max-width: 640px) {
                .rpt-summary-grid {
                  grid-template-columns: repeat(1, minmax(0, 1fr));
                }
              }
              .rpt-items-grid {
                display: grid;
                grid-template-columns: repeat(4, minmax(0, 1fr));
                gap: 16px;
              }
              @media (max-width: 1024px) {
                .rpt-items-grid {
                  grid-template-columns: repeat(3, minmax(0, 1fr));
                }
              }
              @media (max-width: 768px) {
                .rpt-items-grid {
                  grid-template-columns: repeat(2, minmax(0, 1fr));
                }
              }
              @media (max-width: 500px) {
                .rpt-items-grid {
                  grid-template-columns: repeat(1, minmax(0, 1fr));
                }
              }
              .rpt-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 13px;
                text-align: left;
              }
              .rpt-table th {
                background-color: #f8fafc;
                color: #475569;
                font-weight: 700;
                text-transform: uppercase;
                font-size: 11px;
                letter-spacing: 0.05em;
                padding: 12px 16px;
                border-bottom: 2px solid #cbd5e1;
              }
              .rpt-table td {
                padding: 12px 16px;
                border-bottom: 1px solid #e2e8f0;
                color: #1e293b;
              }
              .rpt-badge {
                display: inline-block;
                padding: 3px 10px;
                border-radius: 9999px;
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.025em;
              }
            `}</style>

            {/* Executive Summary Cards */}
            <div className="rpt-summary-grid">
              {/* Card 1: Total Sales/Purchases */}
              <div
                className="rounded-lg p-4"
                style={{
                  backgroundColor: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderLeft: '5px solid #0284c7',
                  borderRadius: '8px',
                  padding: '16px',
                }}
              >
                <p style={{ fontSize: '11px', fontWeight: '700', color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>
                  Total {activeTab === 'sales' ? 'Sales' : 'Purchases'}
                </p>
                <p style={{ fontSize: '22px', fontWeight: '800', color: '#0c4a6e', margin: '0 0 2px 0' }}>
                  Rs. {(reportData.summary.totalSales || reportData.summary.totalPurchases || 0).toLocaleString()}
                </p>
                <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: '500' }}>Active transactions</span>
              </div>

              {/* Card 2: Total Qty Sold/Purchased */}
              <div
                className="rounded-lg p-4"
                style={{
                  backgroundColor: '#faf5ff',
                  border: '1px solid #e9d5ff',
                  borderLeft: '5px solid #9333ea',
                  borderRadius: '8px',
                  padding: '16px',
                }}
              >
                <p style={{ fontSize: '11px', fontWeight: '700', color: '#7e22ce', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>
                  Total Qty {activeTab === 'sales' ? 'Sold' : 'Purchased'}
                </p>
                <p style={{ fontSize: '22px', fontWeight: '800', color: '#581c87', margin: '0 0 2px 0' }}>
                  {(reportData.summary.totalQuantity || 0).toLocaleString()} <span style={{ fontSize: '12px', fontWeight: '600' }}>Units</span>
                </p>
                <span style={{ fontSize: '11px', color: '#9333ea', fontWeight: '500' }}>
                  {reportData.summary.totalDistinctItems || 0} products ({reportData.summary.totalLineItems || 0} lines)
                </span>
              </div>

              {/* Card 3: Total Paid */}
              <div
                className="rounded-lg p-4"
                style={{
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderLeft: '5px solid #16a34a',
                  borderRadius: '8px',
                  padding: '16px',
                }}
              >
                <p style={{ fontSize: '11px', fontWeight: '700', color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>
                  Total Paid / Received
                </p>
                <p style={{ fontSize: '22px', fontWeight: '800', color: '#14532d', margin: '0 0 2px 0' }}>
                  Rs. {(reportData.summary.totalPaid || 0).toLocaleString()}
                </p>
                <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: '500' }}>Received amount</span>
              </div>

              {/* Card 4: Total Remaining */}
              <div
                className="rounded-lg p-4"
                style={{
                  backgroundColor: '#fefce8',
                  border: '1px solid #fef08a',
                  borderLeft: '5px solid #ca8a04',
                  borderRadius: '8px',
                  padding: '16px',
                }}
              >
                <p style={{ fontSize: '11px', fontWeight: '700', color: '#a16207', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>
                  Total Remaining
                </p>
                <p style={{ fontSize: '22px', fontWeight: '800', color: '#713f12', margin: '0 0 2px 0' }}>
                  Rs. {(reportData.summary.totalRemaining || 0).toLocaleString()}
                </p>
                <span style={{ fontSize: '11px', color: '#ca8a04', fontWeight: '500' }}>Balance outstanding</span>
              </div>

              {/* Card 5: Cancelled */}
              <div
                className="rounded-lg p-4"
                style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderLeft: '5px solid #dc2626',
                  borderRadius: '8px',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontSize: '11px', fontWeight: '700', color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>
                      Cancelled {activeTab === 'sales' ? 'Sales' : 'Orders'}
                    </p>
                    <p style={{ fontSize: '22px', fontWeight: '800', color: '#7f1d1d', margin: '0 0 2px 0' }}>
                      Rs. {(reportData.summary.cancelledTotal || 0).toLocaleString()}
                    </p>
                  </div>
                  <span
                    style={{
                      padding: '2px 8px',
                      fontSize: '11px',
                      backgroundColor: '#fee2e2',
                      color: '#991b1b',
                      borderRadius: '9999px',
                      fontWeight: '800',
                    }}
                  >
                    {reportData.summary.cancelledCount || 0}
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: '500' }}>Excluded from totals</span>
              </div>
            </div>

            {/* Item Breakdown Cards */}
            <div
              className="rounded-xl p-5 space-y-4"
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '20px',
              }}
            >
              <div
                className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: '14px',
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <div>
                  <h2
                    className="text-lg font-bold text-gray-800 flex items-center gap-2"
                    style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <FiPackage className="text-purple-600" />
                    Item {activeTab === 'sales' ? 'Sales' : 'Purchases'} Breakdown
                  </h2>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                    Summary cards for all items {activeTab === 'sales' ? 'sold' : 'purchased'} ({reportData.itemStats?.length || 0} items)
                  </p>
                </div>

                {/* Filter & Sort Controls for items (Excluded from export image via data-html2canvas-ignore) */}
                <div data-html2canvas-ignore="true" className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-56">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                    <input
                      type="text"
                      placeholder="Search items..."
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <select
                    value={itemSort}
                    onChange={(e) => setItemSort(e.target.value)}
                    className="px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-md bg-white focus:ring-1 focus:ring-blue-500 outline-none"
                  >
                    <option value="qty-desc">Sort: Highest Qty</option>
                    <option value="amount-desc">Sort: Highest Value</option>
                    <option value="orders-desc">Sort: Most Orders</option>
                    <option value="name-asc">Sort: Name (A-Z)</option>
                  </select>
                </div>
              </div>

              {/* Cards Grid */}
              {filteredItemStats.length === 0 ? (
                <div style={{ padding: '32px 0', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                  {itemSearch ? 'No items match your search filter.' : `No items ${activeTab === 'sales' ? 'sold' : 'purchased'} in this period.`}
                </div>
              ) : (
                <div className="rpt-items-grid">
                  {filteredItemStats.map((item) => {
                    const avgPrice = item.totalQuantity > 0 ? Math.round(item.totalAmount / item.totalQuantity) : 0;
                    return (
                      <div
                        key={item.productId}
                        className="rounded-lg transition-shadow"
                        style={{
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          padding: '14px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                            <h3
                              style={{
                                fontSize: '13px',
                                fontWeight: '700',
                                color: '#0f172a',
                                margin: 0,
                                lineHeight: '1.3',
                              }}
                              title={item.name}
                            >
                              {item.name}
                            </h3>
                            <span
                              style={{
                                padding: '2px 8px',
                                fontSize: '11px',
                                fontWeight: '700',
                                backgroundColor: '#e0f2fe',
                                color: '#0369a1',
                                borderRadius: '4px',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {item.unit || 'Units'}
                            </span>
                          </div>

                          {/* Quantity Highlight Box */}
                          <div
                            style={{
                              backgroundColor: '#ffffff',
                              borderRadius: '6px',
                              padding: '10px 12px',
                              border: '1px solid #e2e8f0',
                              marginBottom: '10px',
                            }}
                          >
                            <span style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>
                              {activeTab === 'sales' ? 'Total Quantity Sold' : 'Total Quantity Purchased'}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
                              <span style={{ fontSize: '20px', fontWeight: '800', color: '#7e22ce' }}>
                                {item.totalQuantity.toLocaleString()}
                              </span>
                              <span style={{ fontSize: '11px', fontWeight: '600', color: '#475569' }}>
                                {item.unit || 'units'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Financial Details */}
                        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px', fontSize: '12px', color: '#475569' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span>Total Value:</span>
                            <span style={{ fontWeight: '700', color: '#0f172a' }}>Rs. {item.totalAmount.toLocaleString()}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span>Avg Rate:</span>
                            <span style={{ fontWeight: '600', color: '#334155' }}>Rs. {avgPrice.toLocaleString()} / {item.unit || 'unit'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span>Order Count:</span>
                            <span style={{ fontWeight: '600', color: '#334155' }}>{item.orderCount} {item.orderCount === 1 ? 'order' : 'orders'}</span>
                          </div>
                          {item.currentStock !== null && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '6px', marginTop: '4px', fontSize: '11px' }}>
                              <span style={{ color: '#64748b' }}>Current Stock:</span>
                              <span style={{ fontWeight: '700', color: item.currentStock > 0 ? '#15803d' : '#b91c1c' }}>
                                {item.currentStock} {item.unit || 'units'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Data Table */}
            <div
              className="rounded-xl overflow-hidden"
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                  Detailed Transactions Log ({items?.length || 0} Records)
                </h3>
                <span style={{ fontSize: '11px', color: '#64748b' }}>All figures in PKR (Rs.)</span>
              </div>

              <table className="rpt-table responsive-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Reference</th>
                    <th>{activeTab === 'sales' ? 'Customer' : 'Supplier'}</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                    <th style={{ textAlign: 'right' }}>Paid</th>
                    <th style={{ textAlign: 'right' }}>Remaining</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activeTab === 'sales' ? (
                    reportData.sales?.map((sale) => (
                      <tr key={sale._id} style={{ backgroundColor: sale.isCancelled ? '#fef2f2' : '#ffffff' }}>
                        <td data-label="Date" style={{ textDecoration: sale.isCancelled ? 'line-through' : 'none', color: sale.isCancelled ? '#991b1b' : '#475569' }}>
                          {sale.date ? format(new Date(sale.date), 'dd MMM yyyy') : '-'}
                        </td>
                        <td data-label="Reference" style={{ fontWeight: '700', color: sale.isCancelled ? '#991b1b' : '#0f172a' }}>
                          {sale.invoiceNumber}
                        </td>
                        <td data-label="Customer" style={{ color: sale.isCancelled ? '#991b1b' : '#1e293b' }}>
                          {sale.customerId?.name || 'Walk-in Customer'}
                        </td>
                        <td data-label="Total" style={{ textAlign: 'right', fontWeight: '700', color: sale.isCancelled ? '#991b1b' : '#0f172a' }}>
                          Rs. {sale.grandTotal?.toLocaleString()}
                        </td>
                        <td data-label="Paid" style={{ textAlign: 'right', color: sale.isCancelled ? '#9ca3af' : '#16a34a', fontWeight: '600' }}>
                          Rs. {sale.paid?.toLocaleString()}
                        </td>
                        <td data-label="Remaining" style={{ textAlign: 'right', color: sale.isCancelled ? '#9ca3af' : sale.remaining > 0 ? '#dc2626' : '#475569', fontWeight: '600' }}>
                          Rs. {sale.remaining?.toLocaleString()}
                        </td>
                        <td data-label="Status" style={{ textAlign: 'center' }}>
                          {sale.isCancelled ? (
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 8px',
                                borderRadius: '9999px',
                                fontSize: '11px',
                                fontWeight: '700',
                                backgroundColor: '#fee2e2',
                                color: '#991b1b',
                                border: '1px solid #fca5a5',
                              }}
                            >
                              CANCELLED
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 8px',
                                borderRadius: '9999px',
                                fontSize: '11px',
                                fontWeight: '700',
                                backgroundColor: sale.status === 'PAID' ? '#dcfce7' : sale.status === 'PARTIAL' ? '#fef9c3' : '#fee2e2',
                                color: sale.status === 'PAID' ? '#166534' : sale.status === 'PARTIAL' ? '#854d0e' : '#991b1b',
                                border: `1px solid ${sale.status === 'PAID' ? '#86efac' : sale.status === 'PARTIAL' ? '#fde047' : '#fca5a5'}`,
                              }}
                            >
                              {sale.status}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    reportData.purchases?.map((pur) => (
                      <tr key={pur._id} style={{ backgroundColor: pur.isCancelled ? '#fef2f2' : '#ffffff' }}>
                        <td data-label="Date" style={{ textDecoration: pur.isCancelled ? 'line-through' : 'none', color: pur.isCancelled ? '#991b1b' : '#475569' }}>
                          {pur.date ? format(new Date(pur.date), 'dd MMM yyyy') : '-'}
                        </td>
                        <td data-label="Reference" style={{ fontWeight: '700', color: pur.isCancelled ? '#991b1b' : '#0f172a' }}>
                          {pur.purchaseNumber}
                        </td>
                        <td data-label="Supplier" style={{ color: pur.isCancelled ? '#991b1b' : '#1e293b' }}>
                          {pur.supplierId?.name || 'Walk-in Supplier'}
                        </td>
                        <td data-label="Total" style={{ textAlign: 'right', fontWeight: '700', color: pur.isCancelled ? '#991b1b' : '#0f172a' }}>
                          Rs. {pur.grandTotal?.toLocaleString()}
                        </td>
                        <td data-label="Paid" style={{ textAlign: 'right', color: pur.isCancelled ? '#9ca3af' : '#16a34a', fontWeight: '600' }}>
                          Rs. {pur.paid?.toLocaleString()}
                        </td>
                        <td data-label="Remaining" style={{ textAlign: 'right', color: pur.isCancelled ? '#9ca3af' : pur.remaining > 0 ? '#dc2626' : '#475569', fontWeight: '600' }}>
                          Rs. {pur.remaining?.toLocaleString()}
                        </td>
                        <td data-label="Status" style={{ textAlign: 'center' }}>
                          {pur.isCancelled ? (
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 8px',
                                borderRadius: '9999px',
                                fontSize: '11px',
                                fontWeight: '700',
                                backgroundColor: '#fee2e2',
                                color: '#991b1b',
                                border: '1px solid #fca5a5',
                              }}
                            >
                              CANCELLED
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 8px',
                                borderRadius: '9999px',
                                fontSize: '11px',
                                fontWeight: '700',
                                backgroundColor: pur.status === 'PAID' ? '#dcfce7' : pur.status === 'PARTIAL' ? '#fef9c3' : '#fee2e2',
                                color: pur.status === 'PAID' ? '#166534' : pur.status === 'PARTIAL' ? '#854d0e' : '#991b1b',
                                border: `1px solid ${pur.status === 'PAID' ? '#86efac' : pur.status === 'PARTIAL' ? '#fde047' : '#fca5a5'}`,
                              }}
                            >
                              {pur.status}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}

                  {((activeTab === 'sales' && (!reportData.sales || reportData.sales.length === 0)) ||
                    (activeTab === 'purchases' && (!reportData.purchases || reportData.purchases.length === 0))) && (
                    <tr>
                      <td colSpan="7" style={{ padding: '40px 16px', textAlign: 'center', color: '#64748b' }}>
                        No records found for the selected date range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Official Report Footer */}
            <div
              className="flex flex-col sm:flex-row justify-between items-center text-xs text-gray-500 pt-4 border-t border-gray-200 gap-2"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '16px',
                borderTop: '1px solid #e2e8f0',
                fontSize: '11px',
                color: '#64748b',
                marginTop: '16px',
              }}
            >
              <p style={{ margin: 0 }}>
                Hamdan Traders Inventory Management System • Confidential Business Financial Report
              </p>
              <p style={{ margin: 0, fontWeight: '600', color: '#334155' }}>
                System Verified & Generated
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ReportsPage;
