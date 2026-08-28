const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const StockMovement = require('../models/StockMovement');
const mongoose = require('mongoose');

// @desc    Get all purchases
// @route   GET /api/purchases
// @access  Private
const getPurchases = async (req, res) => {
  try {
    const purchases = await Purchase.find({})
      .populate('supplierId', 'name phone')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: purchases });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get purchase by ID
// @route   GET /api/purchases/:id
// @access  Private
const getPurchaseById = async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id)
      .populate('supplierId', 'name phone address')
      .populate('items.productId', 'name sku unit');
      
    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase not found' });
    }
    res.json({ success: true, data: purchase });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new purchase
// @route   POST /api/purchases
// @access  Private
const createPurchase = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { supplierId, items, subtotal, discount, grandTotal, paid, remaining, date } = req.body;

    if (!items || items.length === 0) {
      throw new Error('No purchase items provided');
    }

    // Generate unique purchase number (e.g., PUR-YYYYMMDD-XXXX)
    const count = await Purchase.countDocuments();
    const purchaseNumber = `PUR-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${(count + 1).toString().padStart(4, '0')}`;

    let status = 'UNPAID';
    if (paid >= grandTotal) status = 'PAID';
    else if (paid > 0) status = 'PARTIAL';

    // 1. Create Purchase Document
    const purchase = await Purchase.create([{
      purchaseNumber,
      supplierId,
      items,
      subtotal,
      discount: discount || 0,
      grandTotal,
      paid,
      remaining,
      date: date || new Date(),
      status
    }], { session });

    const purchaseId = purchase[0]._id;

    // Process each item
    for (const item of items) {
      const product = await Product.findById(item.productId).session(session);
      if (!product) throw new Error(`Product not found: ${item.productId}`);

      // 2. Increase product stock & update purchase price
      product.currentStock += Number(item.quantity);
      product.purchasePrice = Number(item.cost); // Optional: Update cost price to latest
      await product.save({ session });

      // 3. Create stock movement
      await StockMovement.create([{
        productId: item.productId,
        type: 'PURCHASE',
        quantity: Number(item.quantity),
        reason: `Purchase Invoice: ${purchaseNumber}`,
        referenceId: purchaseId,
        date: date || new Date()
      }], { session });
    }

    // 4. Update supplier balance (Increase balance by remaining amount)
    const supplier = await Supplier.findById(supplierId).session(session);
    if (!supplier) throw new Error('Supplier not found');
    
    supplier.currentBalance += Number(remaining);
    await supplier.save({ session });

    await session.commitTransaction();
    res.status(201).json({ success: true, data: purchase[0] });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

module.exports = {
  getPurchases,
  getPurchaseById,
  createPurchase
};
