const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const StockMovement = require('../models/StockMovement');
const mongoose = require('mongoose');

// @desc    Get all sales
// @route   GET /api/sales
// @access  Private
const getSales = async (req, res) => {
  try {
    const sales = await Sale.find({})
      .populate('customerId', 'name phone')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: sales });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get sale by ID
// @route   GET /api/sales/:id
// @access  Private
const getSaleById = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('customerId', 'name phone address')
      .populate('items.productId', 'name sku unit');
      
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }
    res.json({ success: true, data: sale });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new sale
// @route   POST /api/sales
// @access  Private
const createSale = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { customerId, items, subtotal, discount, grandTotal, paid, remaining, date } = req.body;

    if (!items || items.length === 0) {
      throw new Error('No sale items provided');
    }

    // 1. Check stock for all items BEFORE creating anything
    for (const item of items) {
      const product = await Product.findById(item.productId).session(session);
      if (!product) throw new Error(`Product not found: ${item.productId}`);
      
      if (product.currentStock < item.quantity) {
        throw new Error(`Insufficient Stock for ${product.name}. Available: ${product.currentStock}, Requested: ${item.quantity}`);
      }
    }

    // Generate unique invoice number (e.g., INV-YYYYMMDD-XXXX)
    const count = await Sale.countDocuments();
    const invoiceNumber = `INV-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${(count + 1).toString().padStart(4, '0')}`;

    let status = 'UNPAID';
    if (paid >= grandTotal) status = 'PAID';
    else if (paid > 0) status = 'PARTIAL';

    // 2. Create Sale Document
    const sale = await Sale.create([{
      invoiceNumber,
      customerId,
      items,
      subtotal,
      discount: discount || 0,
      grandTotal,
      paid,
      remaining,
      date: date || new Date(),
      status
    }], { session });

    const saleId = sale[0]._id;

    // 3. Process each item (Decrease stock & log movement)
    for (const item of items) {
      const product = await Product.findById(item.productId).session(session);
      
      product.currentStock -= Number(item.quantity);
      await product.save({ session });

      await StockMovement.create([{
        productId: item.productId,
        type: 'SALE',
        quantity: -Math.abs(Number(item.quantity)), // Ensure it's negative
        reason: `Sales Invoice: ${invoiceNumber}`,
        referenceId: saleId,
        date: date || new Date()
      }], { session });
    }

    // 4. Update customer balance (Increase customer balance by remaining unpaid amount)
    const customer = await Customer.findById(customerId).session(session);
    if (!customer) throw new Error('Customer not found');
    
    customer.currentBalance += Number(remaining);
    await customer.save({ session });

    await session.commitTransaction();
    res.status(201).json({ success: true, data: sale[0] });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

module.exports = {
  getSales,
  getSaleById,
  createSale
};
