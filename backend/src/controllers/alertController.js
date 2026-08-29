const Product = require('../models/Product');

// @desc    Get low stock and expiry alerts
// @route   GET /api/alerts
// @access  Private
const getAlerts = async (req, res) => {
  try {
    // 1. Find Low Stock Products
    // Using aggregation or simple find. We need where currentStock <= minimumStock
    const lowStockProducts = await Product.find({
      $expr: { $lte: ['$currentStock', '$minimumStock'] },
      minimumStock: { $gt: 0 },
      isActive: true
    }).populate('categoryId', 'name');

    // 2. Find Expiring Products (within next 30 days) or already expired
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringProducts = await Product.find({
      expiryDate: { $lte: thirtyDaysFromNow },
      currentStock: { $gt: 0 }, // Only care if we actually have stock
      isActive: true
    }).populate('categoryId', 'name').sort({ expiryDate: 1 });

    res.json({
      success: true,
      data: {
        lowStock: lowStockProducts,
        expiring: expiringProducts
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAlerts
};
