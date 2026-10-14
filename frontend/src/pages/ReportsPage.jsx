import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { FiDownload, FiFilter, FiImage, FiPackage, FiSearch } from 'react-icons/fi';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas-pro';

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

  const exportToPDF = () => {
    if (!reportData) return;

    const items = activeTab === 'sales' ? reportData.sales : reportData.purchases;
    if (!items || items.length === 0) return alert('No data to export');

    const doc = new jsPDF();
    const title = activeTab === 'sales' ? 'Sales Report' : 'Purchases Report';

    doc.setFontSize(18);
    doc.text(title, 14, 20);

    doc.setFontSize(10);
    doc.text(`Date Range: ${startDate} to ${endDate}`, 14, 28);
    doc.text(
      `Total ${activeTab === 'sales' ? 'Sales' : 'Purchases'}: Rs. ${(
        reportData.summary.totalSales || reportData.summary.totalPurchases || 0
      ).toLocaleString()} | Total Qty: ${(reportData.summary.totalQuantity || 0).toLocaleString()} Units (${reportData.summary.totalDistinctItems || 0} Products)`,
      14,
      35
    );
    let startY = 41;
    if (reportData.summary?.cancelledCount > 0) {
      doc.setTextColor(220, 38, 38);
      doc.text(
        `Cancelled: ${reportData.summary.cancelledCount} orders (Rs. ${(reportData.summary.cancelledTotal || 0).toLocaleString()}) - Excluded from totals`,
        14,
        startY
      );
      doc.setTextColor(0, 0, 0);
      startY += 6;
    }

    const headers = [
      ['Date', 'Reference', activeTab === 'sales' ? 'Customer' : 'Supplier', 'Total', 'Paid', 'Remaining', 'Status'],
    ];
    const data = items.map((item) => [
      item.date ? format(new Date(item.date), 'yyyy-MM-dd') : '-',
      item.invoiceNumber || item.purchaseNumber,
      activeTab === 'sales' ? item.customerId?.name : item.supplierId?.name,
      `Rs. ${item.grandTotal?.toLocaleString() || 0}`,
      `Rs. ${item.paid?.toLocaleString() || 0}`,
      `Rs. ${item.remaining?.toLocaleString() || 0}`,
      item.isCancelled ? 'CANCELLED' : item.status,
    ]);

    doc.autoTable({
      startY: startY + 2,
      head: headers,
      body: data,
    });

    // Add Item-wise breakdown table to PDF
    if (reportData.itemStats && reportData.itemStats.length > 0) {
      const finalY = (doc.lastAutoTable?.finalY || 100) + 12;
      doc.setFontSize(14);
      doc.text(`Item-wise ${activeTab === 'sales' ? 'Sales' : 'Purchases'} Summary`, 14, finalY);
      const itemHeaders = [['Product Name', 'Unit', 'Total Qty', 'Total Amount', 'Orders Count']];
      const itemData = reportData.itemStats.map((item) => [
        item.name,
        item.unit || 'Units',
        item.totalQuantity.toLocaleString(),
        `Rs. ${item.totalAmount.toLocaleString()}`,
        item.orderCount.toString(),
      ]);
      doc.autoTable({
        startY: finalY + 4,
        head: itemHeaders,
        body: itemData,
      });
    }

    doc.save(`${activeTab}_report_${startDate}_to_${endDate}.pdf`);
  };

  const exportToImage = async () => {
    const element = document.getElementById('report-content');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, { scale: 2 });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${activeTab}_report_${startDate}_to_${endDate}.png`;
      link.click();
    } catch (error) {
      console.error('Error exporting image:', error);
      alert('Failed to export image.');
    }
  };

  const items = activeTab === 'sales' ? reportData?.sales : reportData?.purchases;
  const noExportData = loading || !reportData || !items?.length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Financial Reports</h1>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <button
            onClick={exportToPDF}
            disabled={noExportData}
            className="flex-1 sm:flex-none flex justify-center items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <FiDownload className="mr-2" /> Download PDF
          </button>
          <button
            onClick={exportToImage}
            disabled={noExportData}
            className="flex-1 sm:flex-none flex justify-center items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <FiImage className="mr-2" /> Download Image
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-lg shadow flex flex-col md:flex-row justify-between items-center gap-4 border-l-4 border-blue-500">
        <div className="flex bg-gray-100 p-1 rounded-md w-full md:w-auto">
          <button
            className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-medium ${activeTab === 'sales' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'
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
            className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-medium ${activeTab === 'purchases' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'
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

        <form
          onSubmit={handleFilter}
          className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full md:w-auto"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <label className="text-sm text-gray-600 font-medium">From:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full sm:w-auto px-3 py-1.5 border border-gray-300 rounded-md text-sm"
              required
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <label className="text-sm text-gray-600 font-medium">To:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full sm:w-auto px-3 py-1.5 border border-gray-300 rounded-md text-sm"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto px-4 py-1.5 bg-gray-800 text-white rounded-md text-sm hover:bg-gray-700 flex justify-center items-center mt-2 sm:mt-0"
          >
            <FiFilter className="mr-2" /> Filter
          </button>
        </form>
      </div>

      {loading ? (
        <div className="text-center py-10">Generating report...</div>
      ) : reportData ? (
        // Report Content Wrapper for Mobile scroll
        <div className="overflow-x-auto w-full pb-4">
          <div id="report-content" className="space-y-6 min-w-[800px] md:min-w-full">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white rounded-lg shadow p-5 border-b-4 border-blue-500">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Total {activeTab === 'sales' ? 'Sales' : 'Purchases'}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  Rs. {(reportData.summary.totalSales || reportData.summary.totalPurchases || 0).toLocaleString()}
                </p>
                <span className="text-[11px] text-gray-400">Active transactions</span>
              </div>
              <div className="bg-white rounded-lg shadow p-5 border-b-4 border-purple-500">
                <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-1">
                  Total Qty {activeTab === 'sales' ? 'Sold' : 'Purchased'}
                </p>
                <p className="text-2xl font-bold text-purple-700">
                  {(reportData.summary.totalQuantity || 0).toLocaleString()} <span className="text-xs font-semibold text-purple-500">Units</span>
                </p>
                <span className="text-[11px] text-gray-400">
                  {reportData.summary.totalDistinctItems || 0} items ({reportData.summary.totalLineItems || 0} lines)
                </span>
              </div>
              <div className="bg-white rounded-lg shadow p-5 border-b-4 border-green-500">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Paid / Received</p>
                <p className="text-2xl font-bold text-green-600">
                  Rs. {(reportData.summary.totalPaid || 0).toLocaleString()}
                </p>
                <span className="text-[11px] text-gray-400">Received amount</span>
              </div>
              <div className="bg-white rounded-lg shadow p-5 border-b-4 border-yellow-500">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Remaining</p>
                <p className="text-2xl font-bold text-yellow-600">
                  Rs. {(reportData.summary.totalRemaining || 0).toLocaleString()}
                </p>
                <span className="text-[11px] text-gray-400">Balance outstanding</span>
              </div>
              <div className="bg-white rounded-lg shadow p-5 border-b-4 border-red-500">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-1">
                      Cancelled {activeTab === 'sales' ? 'Sales' : 'Orders'}
                    </p>
                    <p className="text-2xl font-bold text-red-700">
                      Rs. {(reportData.summary.cancelledTotal || 0).toLocaleString()}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full font-bold">
                    {reportData.summary.cancelledCount || 0}
                  </span>
                </div>
                <span className="text-[11px] text-red-400">Excluded from totals</span>
              </div>
            </div>

            {/* Item Breakdown Cards */}
            <div className="bg-white rounded-lg shadow p-5 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <FiPackage className="text-purple-600" />
                    Item {activeTab === 'sales' ? 'Sales' : 'Purchases'} Breakdown
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Quantity and value cards for all items {activeTab === 'sales' ? 'sold' : 'purchased'} ({reportData.itemStats?.length || 0} items)
                  </p>
                </div>

                {/* Filter & Sort Controls for items */}
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
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
                <div className="py-8 text-center text-gray-500 text-sm">
                  {itemSearch ? 'No items match your search filter.' : `No items ${activeTab === 'sales' ? 'sold' : 'purchased'} in this period.`}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredItemStats.map((item) => {
                    const avgPrice = item.totalQuantity > 0 ? Math.round(item.totalAmount / item.totalQuantity) : 0;
                    return (
                      <div
                        key={item.productId}
                        className="bg-gray-50/70 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex justify-between items-start gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2" title={item.name}>
                              {item.name}
                            </h3>
                            <span className="px-2 py-0.5 text-[11px] font-medium rounded bg-blue-100 text-blue-800 shrink-0">
                              {item.unit || 'Units'}
                            </span>
                          </div>

                          {/* Quantity Highlight */}
                          <div className="bg-white rounded-md p-3 border border-gray-100 mb-3 shadow-xs">
                            <span className="text-[11px] text-gray-500 uppercase tracking-wider block font-medium">
                              {activeTab === 'sales' ? 'Total Quantity Sold' : 'Total Quantity Purchased'}
                            </span>
                            <div className="flex items-baseline gap-1.5 mt-0.5">
                              <span className="text-2xl font-extrabold text-purple-700">
                                {item.totalQuantity.toLocaleString()}
                              </span>
                              <span className="text-xs font-semibold text-gray-600">
                                {item.unit || 'units'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Financial Details */}
                        <div className="space-y-1.5 text-xs text-gray-600 border-t border-gray-200/80 pt-2.5">
                          <div className="flex justify-between">
                            <span>Total Value:</span>
                            <span className="font-bold text-gray-900">Rs. {item.totalAmount.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Avg Price / Rate:</span>
                            <span className="font-medium text-gray-700">Rs. {avgPrice.toLocaleString()} / {item.unit || 'unit'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Order Frequency:</span>
                            <span className="font-medium text-gray-700">{item.orderCount} {item.orderCount === 1 ? 'order' : 'orders'}</span>
                          </div>
                          {item.currentStock !== null && (
                            <div className="flex justify-between pt-1 border-t border-dashed border-gray-200 text-[11px]">
                              <span className="text-gray-500">Current Stock:</span>
                              <span className={`font-semibold ${item.currentStock > 0 ? 'text-green-700' : 'text-red-600'}`}>
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
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 responsive-table">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {activeTab === 'sales' ? 'Customer' : 'Supplier'}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {activeTab === 'sales' ? (
                    reportData.sales?.map((sale) => (
                      <tr key={sale._id} className={`hover:bg-gray-50 ${sale.isCancelled ? 'bg-red-50/60' : ''}`}>
                        <td data-label="Date" className={`px-6 py-4 whitespace-nowrap text-sm ${sale.isCancelled ? 'text-red-700 line-through' : 'text-gray-500'}`}>
                          {sale.date ? format(new Date(sale.date), 'dd MMM yyyy') : '-'}
                        </td>
                        <td data-label="Reference" className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${sale.isCancelled ? 'text-red-700 line-through' : 'text-gray-900'}`}>
                          {sale.invoiceNumber}
                        </td>
                        <td data-label="Customer" className={`px-6 py-4 whitespace-nowrap text-sm ${sale.isCancelled ? 'text-red-700' : 'text-gray-900'}`}>
                          {sale.customerId?.name}
                        </td>
                        <td data-label="Total" className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${sale.isCancelled ? 'text-red-600 line-through' : ''}`}>
                          Rs. {sale.grandTotal?.toLocaleString()}
                        </td>
                        <td data-label="Paid" className={`px-6 py-4 whitespace-nowrap text-sm text-right ${sale.isCancelled ? 'text-gray-400 line-through' : 'text-green-600'}`}>
                          Rs. {sale.paid?.toLocaleString()}
                        </td>
                        <td data-label="Remaining" className={`px-6 py-4 whitespace-nowrap text-sm text-right ${sale.isCancelled ? 'text-gray-400 line-through' : 'text-red-600'}`}>
                          Rs. {sale.remaining?.toLocaleString()}
                        </td>
                        <td data-label="Status" className="px-6 py-4 whitespace-nowrap text-center text-sm">
                          {sale.isCancelled ? (
                            <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-bold rounded-full bg-red-100 text-red-800 border border-red-200">
                              CANCELLED
                            </span>
                          ) : (
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${sale.status === 'PAID'
                                  ? 'bg-green-100 text-green-800'
                                  : sale.status === 'PARTIAL'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                            >
                              {sale.status}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    reportData.purchases?.map((pur) => (
                      <tr key={pur._id} className={`hover:bg-gray-50 ${pur.isCancelled ? 'bg-red-50/60' : ''}`}>
                        <td data-label="Date" className={`px-6 py-4 whitespace-nowrap text-sm ${pur.isCancelled ? 'text-red-700 line-through' : 'text-gray-500'}`}>
                          {pur.date ? format(new Date(pur.date), 'dd MMM yyyy') : '-'}
                        </td>
                        <td data-label="Reference" className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${pur.isCancelled ? 'text-red-700 line-through' : 'text-gray-900'}`}>
                          {pur.purchaseNumber}
                        </td>
                        <td data-label="Supplier" className={`px-6 py-4 whitespace-nowrap text-sm ${pur.isCancelled ? 'text-red-700' : 'text-gray-900'}`}>
                          {pur.supplierId?.name}
                        </td>
                        <td data-label="Total" className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${pur.isCancelled ? 'text-red-600 line-through' : ''}`}>
                          Rs. {pur.grandTotal?.toLocaleString()}
                        </td>
                        <td data-label="Paid" className={`px-6 py-4 whitespace-nowrap text-sm text-right ${pur.isCancelled ? 'text-gray-400 line-through' : 'text-green-600'}`}>
                          Rs. {pur.paid?.toLocaleString()}
                        </td>
                        <td data-label="Remaining" className={`px-6 py-4 whitespace-nowrap text-sm text-right ${pur.isCancelled ? 'text-gray-400 line-through' : 'text-red-600'}`}>
                          Rs. {pur.remaining?.toLocaleString()}
                        </td>
                        <td data-label="Status" className="px-6 py-4 whitespace-nowrap text-center text-sm">
                          {pur.isCancelled ? (
                            <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-bold rounded-full bg-red-100 text-red-800 border border-red-200">
                              CANCELLED
                            </span>
                          ) : (
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${pur.status === 'PAID'
                                  ? 'bg-green-100 text-green-800'
                                  : pur.status === 'PARTIAL'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
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
                        <td colSpan="7" className="px-6 py-10 text-center text-gray-500">
                          No records found for the selected date range.
                        </td>
                      </tr>
                    )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ReportsPage;
