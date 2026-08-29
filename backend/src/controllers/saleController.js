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
      .populate('items.productId', 'name unit');
      
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
    const invoiceNumber = `INV-${(count + 1).toString().padStart(4, '0')}`;

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

// @desc    Toggle Sale Cancellation Status (Cancel/Restore)
// @route   PUT /api/sales/:id/toggle-cancel
// @access  Private
const toggleSaleStatus = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const sale = await Sale.findById(req.params.id).session(session);
    if (!sale) throw new Error('Sale not found');

    const isCancelling = !sale.isCancelled;

    // 1. Process each item
    for (const item of sale.items) {
      const product = await Product.findById(item.productId).session(session);
      if (!product) continue;

      if (isCancelling) {
        // Revert stock (Increase stock because sale is cancelled)
        product.currentStock += Number(item.quantity);
        
        await StockMovement.create([{
          productId: item.productId,
          type: 'SALE_CANCEL',
          quantity: Math.abs(Number(item.quantity)),
          reason: `Cancelled Sales Invoice: ${sale.invoiceNumber}`,
          referenceId: sale._id,
          date: new Date()
        }], { session });

      } else {
        // Restore sale (Decrease stock again)
        if (product.currentStock < item.quantity) {
          throw new Error(`Cannot restore sale. Insufficient Stock for product. Available: ${product.currentStock}, Requested: ${item.quantity}`);
        }
        product.currentStock -= Number(item.quantity);

        await StockMovement.create([{
          productId: item.productId,
          type: 'SALE_RESTORE',
          quantity: -Math.abs(Number(item.quantity)),
          reason: `Restored Sales Invoice: ${sale.invoiceNumber}`,
          referenceId: sale._id,
          date: new Date()
        }], { session });
      }
      
      await product.save({ session });
    }

    // 2. Update customer balance
    const customer = await Customer.findById(sale.customerId).session(session);
    if (customer) {
      if (isCancelling) {
        customer.currentBalance -= Number(sale.remaining);
      } else {
        customer.currentBalance += Number(sale.remaining);
      }
      await customer.save({ session });
    }

    // 3. Update sale status
    sale.isCancelled = isCancelling;
    await sale.save({ session });

    await session.commitTransaction();
    res.json({ success: true, data: sale, message: isCancelling ? 'Sale cancelled successfully' : 'Sale restored successfully' });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

// @desc    Add Payment to a Sale
// @route   POST /api/sales/:id/payment
// @access  Private
const addSalePayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { amount } = req.body;
    const paymentAmount = Number(amount);

    if (!paymentAmount || paymentAmount <= 0) {
      throw new Error('Please provide a valid payment amount');
    }

    const sale = await Sale.findById(req.params.id).session(session);
    if (!sale) throw new Error('Sale not found');
    if (sale.isCancelled) throw new Error('Cannot add payment to a cancelled sale');
    if (sale.remaining <= 0) throw new Error('This invoice is already fully paid');
    if (paymentAmount > sale.remaining) throw new Error(`Payment amount (Rs. ${paymentAmount}) cannot exceed remaining balance (Rs. ${sale.remaining})`);

    // 1. Update Sale amounts and status
    sale.paid += paymentAmount;
    sale.remaining -= paymentAmount;
    
    if (sale.remaining <= 0) {
      sale.status = 'PAID';
    } else {
      sale.status = 'PARTIAL';
    }
    
    await sale.save({ session });

    // 2. Update Customer Balance
    const customer = await Customer.findById(sale.customerId).session(session);
    if (customer) {
      customer.currentBalance -= paymentAmount;
      await customer.save({ session });
    }

    await session.commitTransaction();
    res.json({ success: true, data: sale, message: `Payment of Rs. ${paymentAmount} added successfully` });
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
  createSale,
  toggleSaleStatus,
  addSalePayment
};
