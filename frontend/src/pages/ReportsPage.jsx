import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { FiDownload, FiFilter, FiImage } from 'react-icons/fi';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas-pro';

const ReportsPage = () => {
  const [activeTab, setActiveTab] = useState('sales');
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Default to current month
    const date = new Date();
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      fetchReport();
    }
  }, [activeTab, startDate, endDate]);

  const fetchReport = async () => {
    setLoading(true);
    setReportData(null); // Prevent crash on tab switch by clearing old data shape
    try {
      const endpoint = activeTab === 'sales' ? '/reports/sales' : '/reports/purchases';
      const { data } = await api.get(`${endpoint}?startDate=${startDate}&endDate=${endDate}`);
      setReportData(data.data);
    } catch (err) {
      console.error(err);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (e) => {
    e.preventDefault();
    fetchReport();
  };

  const exportToPDF = () => {
    if (!reportData) return;

    const items = activeTab === 'sales' ? reportData.sales : reportData.purchases;
    if (!items || items.length === 0) return alert('No data to export');

    const doc = new jsPDF();
    const title = activeTab === 'sales' ? 'Sales Report' : 'Purchases Report';
    
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Date Range: ${startDate} to ${endDate}`, 14, 30);
    doc.text(`Total ${activeTab === 'sales' ? 'Sales' : 'Purchases'}: Rs. ${(reportData.summary.totalSales || reportData.summary.totalPurchases || 0).toLocaleString()}`, 14, 38);

    const headers = [['Date', 'Reference', activeTab === 'sales' ? 'Customer' : 'Supplier', 'Total', 'Paid', 'Remaining', 'Status']];
    const data = items.map(item => [
      item.date ? format(new Date(item.date), 'yyyy-MM-dd') : '-',
      item.invoiceNumber || item.purchaseNumber,
      activeTab === 'sales' ? item.customerId?.name : item.supplierId?.name,
      `Rs. ${item.grandTotal?.toLocaleString() || 0}`,
      `Rs. ${item.paid?.toLocaleString() || 0}`,
      `Rs. ${item.remaining?.toLocaleString() || 0}`,
      item.status
    ]);

    doc.autoTable({
      startY: 45,
      head: headers,
      body: data,
    });

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

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Financial Reports</h1>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <button 
            onClick={exportToPDF}
            disabled={loading || !reportData || (activeTab === 'sales' ? !reportData.sales?.length : !reportData.purchases?.length)}
            className="flex-1 sm:flex-none flex justify-center items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <FiDownload className="mr-2" /> Download PDF
          </button>
          <button 
            onClick={exportToImage}
            disabled={loading || !reportData || (activeTab === 'sales' ? !reportData.sales?.length : !reportData.purchases?.length)}
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
            className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-medium ${activeTab === 'sales' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
            onClick={() => setActiveTab('sales')}
          >
            Sales Report
          </button>
          <button 
            className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-medium ${activeTab === 'purchases' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
            onClick={() => setActiveTab('purchases')}
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
              onChange={e => setStartDate(e.target.value)} 
              className="w-full sm:w-auto px-3 py-1.5 border border-gray-300 rounded-md text-sm"
              required
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <label className="text-sm text-gray-600 font-medium">To:</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
              className="w-full sm:w-auto px-3 py-1.5 border border-gray-300 rounded-md text-sm"
              required
            />
          </div>
          <button type="submit" className="w-full sm:w-auto px-4 py-1.5 bg-gray-800 text-white rounded-md text-sm hover:bg-gray-700 flex justify-center items-center mt-2 sm:mt-0">
            <FiFilter className="mr-2" /> Filter
          </button>
        </form>
      </div>

      {loading ? (
        <div className="text-center py-10">Generating report...</div>
      ) : reportData ? (
        <div id="report-content" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6 border-b-4 border-blue-500">
              <p className="text-sm font-medium text-gray-500 mb-1">
                Total {activeTab === 'sales' ? 'Sales' : 'Purchases'}
              </p>
              <p className="text-3xl font-bold text-gray-900">
                Rs. {(reportData.summary.totalSales || reportData.summary.totalPurchases || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6 border-b-4 border-green-500">
              <p className="text-sm font-medium text-gray-500 mb-1">Total Paid / Received</p>
              <p className="text-3xl font-bold text-green-600">
                Rs. {(reportData.summary.totalPaid || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6 border-b-4 border-red-500">
              <p className="text-sm font-medium text-gray-500 mb-1">Total Outstanding / Remaining</p>
              <p className="text-3xl font-bold text-red-600">
                Rs. {(reportData.summary.totalRemaining || 0).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
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
                  reportData.sales?.map(sale => (
                    <tr key={sale._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sale.date ? format(new Date(sale.date), 'dd MMM yyyy') : '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{sale.invoiceNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sale.customerId?.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">Rs. {sale.grandTotal?.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">Rs. {sale.paid?.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">Rs. {sale.remaining?.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${sale.status === 'PAID' ? 'bg-green-100 text-green-800' : sale.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                          {sale.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  reportData.purchases?.map(pur => (
                    <tr key={pur._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pur.date ? format(new Date(pur.date), 'dd MMM yyyy') : '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{pur.purchaseNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{pur.supplierId?.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">Rs. {pur.grandTotal?.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">Rs. {pur.paid?.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">Rs. {pur.remaining?.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${pur.status === 'PAID' ? 'bg-green-100 text-green-800' : pur.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                          {pur.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
                
                {((activeTab === 'sales' && (!reportData.sales || reportData.sales.length === 0)) || (activeTab === 'purchases' && (!reportData.purchases || reportData.purchases.length === 0))) && (
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
      ) : null}
    </div>
  );
};

export default ReportsPage;
