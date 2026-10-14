const Product = require('../models/Product');
const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');
const StockMovement = require('../models/StockMovement');

// @desc    Get dashboard statistics
// @route   GET /api/dashboard
// @access  Private
const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      totalProducts,
      lowStockCount,
      todaySales,
      monthlySales,
      monthlyPurchases,
      cancelledSales,
      cancelledPurchases,
      recentSales,
      lowStockProducts,
      allProductsStock
    ] = await Promise.all([
      // 1. Total Products Count (Active & not deleted)
      Product.countDocuments({ isActive: true, isDeleted: { $ne: true } }),

      // 2. Low Stock Count (Active & not deleted)
      Product.countDocuments({
        $expr: { $lte: ['$currentStock', '$minimumStock'] },
        isActive: true,
        isDeleted: { $ne: true }
      }),

      // 3. Today's Sales Total (Active only)
      Sale.aggregate([
        { $match: { date: { $gte: today }, isCancelled: { $ne: true } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } }
      ]),

      // 4. Monthly Sales Total (Active only)
      Sale.aggregate([
        { $match: { date: { $gte: firstDayOfMonth }, isCancelled: { $ne: true } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } }
      ]),

      // 5. Monthly Purchases Total (Active only)
      Purchase.aggregate([
        { $match: { date: { $gte: firstDayOfMonth }, isCancelled: { $ne: true } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } }
      ]),

      // 6. Cancelled Sales Total & Count (Monthly)
      Sale.aggregate([
        { $match: { date: { $gte: firstDayOfMonth }, isCancelled: true } },
        { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } }
      ]),

      // 7. Cancelled Purchases Total & Count (Monthly)
      Purchase.aggregate([
        { $match: { date: { $gte: firstDayOfMonth }, isCancelled: true } },
        { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } }
      ]),

      // 8. Recent Sales (Last 5)
      Sale.find()
        .populate('customerId', 'name')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),

      // 9. Low Stock Products (Active & not deleted)
      Product.find({
        $expr: { $lte: ['$currentStock', '$minimumStock'] },
        isActive: true,
        isDeleted: { $ne: true }
      })
        .limit(10)
        .lean(),

      // 10. All active products for stock cards (not deleted)
      Product.find({ isActive: true, isDeleted: { $ne: true } })
        .select('name currentStock unit')
        .sort({ name: 1 })
        .lean()
    ]);

    const todaySalesAmount = todaySales.length > 0 ? todaySales[0].total : 0;
    const monthlySalesAmount = monthlySales.length > 0 ? monthlySales[0].total : 0;
    const monthlyPurchasesAmount = monthlyPurchases.length > 0 ? monthlyPurchases[0].total : 0;
    const cancelledSalesAmount = cancelledSales.length > 0 ? cancelledSales[0].total : 0;
    const cancelledSalesCount = cancelledSales.length > 0 ? cancelledSales[0].count : 0;
    const cancelledPurchasesAmount = cancelledPurchases.length > 0 ? cancelledPurchases[0].total : 0;
    const cancelledPurchasesCount = cancelledPurchases.length > 0 ? cancelledPurchases[0].count : 0;

    res.json({
      success: true,
      data: {
        summary: {
          totalProducts,
          lowStockCount,
          todaySalesAmount,
          monthlySalesAmount,
          monthlyPurchasesAmount,
          cancelledSalesAmount,
          cancelledSalesCount,
          cancelledPurchasesAmount,
          cancelledPurchasesCount
        },
        recentSales,
        lowStockProducts,
        allProductsStock
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getDashboardStats
};
