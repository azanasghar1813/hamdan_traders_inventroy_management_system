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
    const { productId, type = 'ADJUSTMENT', quantity, action, reason } = req.body;

    const parsedQty = Math.abs(Number(quantity));
    if (!parsedQty || isNaN(parsedQty) || parsedQty === 0) {
      throw new Error('Quantity must be provided and cannot be 0');
    }

    // Determine signed quantity based on action ('ADD' or 'REMOVE') or given sign
    let finalQuantity = parsedQty;
    if (action === 'REMOVE' || (action !== 'ADD' && Number(quantity) < 0)) {
      finalQuantity = -parsedQty;
    }

    const validTypes = ['DAMAGE', 'RETURN', 'ADJUSTMENT'];
    const movementType = validTypes.includes(type) ? type : 'ADJUSTMENT';

    const product = await Product.findById(productId).session(session);
    if (!product) {
      throw new Error('Product not found');
    }

    // Create movement record
    const defaultReason = finalQuantity > 0 ? 'Stock Added Manually' : 'Stock Removed Manually';
    await StockMovement.create([{
      productId,
      type: movementType,
      quantity: finalQuantity,
      reason: reason && reason.trim() ? reason.trim() : defaultReason,
      date: new Date()
    }], { session });

    // Update product stock
    product.currentStock += finalQuantity;
    await product.save({ session });

    await session.commitTransaction();
    res.status(201).json({
      success: true,
      message: 'Stock adjusted successfully',
      data: {
        productId,
        currentStock: product.currentStock,
        change: finalQuantity
      }
    });
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
