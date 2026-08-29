const StockMovement = require('../models/StockMovement');
const Product = require('../models/Product');
const mongoose = require('mongoose');

// @desc    Get all stock movements (with optional product filter)
// @route   GET /api/stock
// @access  Private
const getStockMovements = async (req, res) => {
  try {
    const { productId } = req.query;
    const filter = productId ? { productId } : {};

    const movements = await StockMovement.find(filter)
      .populate('productId', 'name unit')
      .sort({ date: -1, createdAt: -1 });

    res.json({ success: true, data: movements });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add a manual stock adjustment (DAMAGE, RETURN, ADJUSTMENT)
// @route   POST /api/stock/adjust
// @access  Private
const adjustStock = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { productId, type, quantity, reason } = req.body;

    if (!['DAMAGE', 'RETURN', 'ADJUSTMENT'].includes(type)) {
      throw new Error('Invalid adjustment type. Allowed types: DAMAGE, RETURN, ADJUSTMENT');
    }

    if (!quantity || quantity === 0) {
      throw new Error('Quantity must be provided and cannot be 0');
    }

    const product = await Product.findById(productId).session(session);
    if (!product) {
      throw new Error('Product not found');
    }

    // Verify stock doesn't go below 0
    if (product.currentStock + Number(quantity) < 0) {
      throw new Error(`Insufficient stock. Available: ${product.currentStock}, Requested adjustment: ${quantity}`);
    }

    // Create movement record
    await StockMovement.create([{
      productId,
      type,
      quantity: Number(quantity),
      reason,
      date: new Date()
    }], { session });

    // Update product stock
    product.currentStock += Number(quantity);
    await product.save({ session });

    await session.commitTransaction();
    res.status(201).json({ success: true, message: 'Stock adjusted successfully' });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

module.exports = {
  getStockMovements,
  adjustStock
};
