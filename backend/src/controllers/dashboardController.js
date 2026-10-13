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

    // 1. Total Products Count
    const totalProducts = await Product.countDocuments({ isActive: true });

    // 2. Low Stock Count
    const lowStockCount = await Product.countDocuments({
      $expr: { $lte: ['$currentStock', '$minimumStock'] },
      isActive: true
    });

    // 3. Today's Sales Total (Active only)
    const todaySales = await Sale.aggregate([
      { $match: { date: { $gte: today }, isCancelled: { $ne: true } } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]);
    const todaySalesAmount = todaySales.length > 0 ? todaySales[0].total : 0;

    // 4. Monthly Sales Total (Active only)
    const monthlySales = await Sale.aggregate([
      { $match: { date: { $gte: firstDayOfMonth }, isCancelled: { $ne: true } } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]);
    const monthlySalesAmount = monthlySales.length > 0 ? monthlySales[0].total : 0;

    // 5. Monthly Purchases Total (Active only)
    const monthlyPurchases = await Purchase.aggregate([
      { $match: { date: { $gte: firstDayOfMonth }, isCancelled: { $ne: true } } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]);
    const monthlyPurchasesAmount = monthlyPurchases.length > 0 ? monthlyPurchases[0].total : 0;

    // 6. Cancelled Sales Total & Count (Monthly)
    const cancelledSales = await Sale.aggregate([
      { $match: { date: { $gte: firstDayOfMonth }, isCancelled: true } },
      { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } }
    ]);
    const cancelledSalesAmount = cancelledSales.length > 0 ? cancelledSales[0].total : 0;
    const cancelledSalesCount = cancelledSales.length > 0 ? cancelledSales[0].count : 0;

    // 7. Cancelled Purchases Total & Count (Monthly)
    const cancelledPurchases = await Purchase.aggregate([
      { $match: { date: { $gte: firstDayOfMonth }, isCancelled: true } },
      { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } }
    ]);
    const cancelledPurchasesAmount = cancelledPurchases.length > 0 ? cancelledPurchases[0].total : 0;
    const cancelledPurchasesCount = cancelledPurchases.length > 0 ? cancelledPurchases[0].count : 0;

    // 8. Recent Sales (Last 5)
    const recentSales = await Sale.find()
      .populate('customerId', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    // 9. Low Stock Products
    const lowStockProducts = await Product.find({
      $expr: { $lte: ['$currentStock', '$minimumStock'] },
      isActive: true
    }).limit(10);

    // 10. All active products for stock cards
    const allProductsStock = await Product.find({ isActive: true })
      .select('name currentStock unit')
      .sort({ name: 1 });

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
