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
      .populate('items.productId', 'name unit currentStock')
      .sort({ date: 1 });

    const itemMap = {};
    let totalLineItems = 0;

    const summary = sales.reduce((acc, sale) => {
      if (sale.isCancelled) {
        acc.cancelledCount += 1;
        acc.cancelledTotal += Number(sale.grandTotal || 0);
      } else {
        acc.totalSales += Number(sale.grandTotal || 0);
        acc.totalPaid += Number(sale.paid || 0);
        acc.totalRemaining += Number(sale.remaining || 0);

        // Aggregate items
        if (Array.isArray(sale.items)) {
          sale.items.forEach((it) => {
            const pId = it.productId?._id ? it.productId._id.toString() : (it.productId ? String(it.productId) : 'unknown');
            const name = it.productId?.name || 'Unknown Product';
            const unit = it.productId?.unit || 'Units';
            const qty = Number(it.quantity || 0);
            const total = Number(it.total || (it.price ? it.price * qty : 0));

            totalLineItems += 1;
            acc.totalQuantity += qty;

            if (!itemMap[pId]) {
              itemMap[pId] = {
                productId: pId,
                name,
                unit,
                totalQuantity: 0,
                totalAmount: 0,
                orderCount: 0,
                currentStock: it.productId?.currentStock ?? null
              };
            }
            itemMap[pId].totalQuantity += qty;
            itemMap[pId].totalAmount += total;
            itemMap[pId].orderCount += 1;
          });
        }
      }
      return acc;
    }, {
      totalSales: 0,
      totalPaid: 0,
      totalRemaining: 0,
      cancelledCount: 0,
      cancelledTotal: 0,
      totalQuantity: 0
    });

    const itemStats = Object.values(itemMap).sort((a, b) => b.totalQuantity - a.totalQuantity);
    summary.totalDistinctItems = itemStats.length;
    summary.totalLineItems = totalLineItems;

    res.json({ success: true, data: { sales, summary, itemStats } });
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
      .populate('items.productId', 'name unit currentStock')
      .sort({ date: 1 });

    const itemMap = {};
    let totalLineItems = 0;

    const summary = purchases.reduce((acc, pur) => {
      if (pur.isCancelled) {
        acc.cancelledCount += 1;
        acc.cancelledTotal += Number(pur.grandTotal || 0);
      } else {
        acc.totalPurchases += Number(pur.grandTotal || 0);
        acc.totalPaid += Number(pur.paid || 0);
        acc.totalRemaining += Number(pur.remaining || 0);

        // Aggregate items
        if (Array.isArray(pur.items)) {
          pur.items.forEach((it) => {
            const pId = it.productId?._id ? it.productId._id.toString() : (it.productId ? String(it.productId) : 'unknown');
            const name = it.productId?.name || 'Unknown Product';
            const unit = it.productId?.unit || 'Units';
            const qty = Number(it.quantity || 0);
            const total = Number(it.total || (it.cost ? it.cost * qty : 0));

            totalLineItems += 1;
            acc.totalQuantity += qty;

            if (!itemMap[pId]) {
              itemMap[pId] = {
                productId: pId,
                name,
                unit,
                totalQuantity: 0,
                totalAmount: 0,
                orderCount: 0,
                currentStock: it.productId?.currentStock ?? null
              };
            }
            itemMap[pId].totalQuantity += qty;
            itemMap[pId].totalAmount += total;
            itemMap[pId].orderCount += 1;
          });
        }
      }
      return acc;
    }, {
      totalPurchases: 0,
      totalPaid: 0,
      totalRemaining: 0,
      cancelledCount: 0,
      cancelledTotal: 0,
      totalQuantity: 0
    });

    const itemStats = Object.values(itemMap).sort((a, b) => b.totalQuantity - a.totalQuantity);
    summary.totalDistinctItems = itemStats.length;
    summary.totalLineItems = totalLineItems;

    res.json({ success: true, data: { purchases, summary, itemStats } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getSalesReport,
  getPurchaseReport
};
