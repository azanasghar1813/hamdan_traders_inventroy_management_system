const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');

// Helper to construct date filter
const getDateFilter = (startDate, endDate) => {
  const filter = {};
  if (startDate && endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    filter.date = { $gte: new Date(startDate), $lte: end };
  } else if (startDate) {
    filter.date = { $gte: new Date(startDate) };
  } else if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    filter.date = { $lte: end };
  }
  return filter;
};

// @desc    Get Sales Report
// @route   GET /api/reports/sales
// @access  Private
const getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const filter = getDateFilter(startDate, endDate);

    const sales = await Sale.find(filter)
      .populate('customerId', 'name phone')
      .sort({ date: 1 });

    const summary = sales.reduce((acc, sale) => {
      acc.totalSales += sale.grandTotal;
      acc.totalPaid += sale.paid;
      acc.totalRemaining += sale.remaining;
      return acc;
    }, { totalSales: 0, totalPaid: 0, totalRemaining: 0 });

    res.json({ success: true, data: { sales, summary } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Purchases Report
// @route   GET /api/reports/purchases
// @access  Private
const getPurchaseReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const filter = getDateFilter(startDate, endDate);

    const purchases = await Purchase.find(filter)
      .populate('supplierId', 'name phone')
      .sort({ date: 1 });

    const summary = purchases.reduce((acc, pur) => {
      acc.totalPurchases += pur.grandTotal;
      acc.totalPaid += pur.paid;
      acc.totalRemaining += pur.remaining;
      return acc;
    }, { totalPurchases: 0, totalPaid: 0, totalRemaining: 0 });

    res.json({ success: true, data: { purchases, summary } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getSalesReport,
  getPurchaseReport
};
