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

    // 3. Today's Sales Total
    const todaySales = await Sale.aggregate([
      { $match: { date: { $gte: today } } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]);
    const todaySalesAmount = todaySales.length > 0 ? todaySales[0].total : 0;

    // 4. Monthly Sales Total
    const monthlySales = await Sale.aggregate([
      { $match: { date: { $gte: firstDayOfMonth } } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]);
    const monthlySalesAmount = monthlySales.length > 0 ? monthlySales[0].total : 0;

    // 5. Monthly Purchases Total
    const monthlyPurchases = await Purchase.aggregate([
      { $match: { date: { $gte: firstDayOfMonth } } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]);
    const monthlyPurchasesAmount = monthlyPurchases.length > 0 ? monthlyPurchases[0].total : 0;

    // 6. Recent Sales (Last 5)
    const recentSales = await Sale.find()
      .populate('customerId', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    // 7. Low Stock Products
    const lowStockProducts = await Product.find({
      $expr: { $lte: ['$currentStock', '$minimumStock'] },
      isActive: true
    }).limit(10);

    // 8. All active products for stock cards
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
          monthlyPurchasesAmount
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
