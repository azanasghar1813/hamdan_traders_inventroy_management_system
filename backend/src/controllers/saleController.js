const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const StockMovement = require('../models/StockMovement');
const { getNextSequence } = require('../models/Counter');
const { runInTransaction } = require('../utils/transactionHelper');

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
    console.error('getSales error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve sales' });
  }
};

// @desc    Get single sale
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
    console.error('getSaleById error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve sale details' });
  }
};

// @desc    Create new sale
// @route   POST /api/sales
// @access  Private
const createSale = async (req, res) => {
  try {
    const { customerId, items, discount = 0, paid = 0, date } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'No sale items provided' });
    }

    if (!customerId) {
      return res.status(400).json({ success: false, message: 'Customer ID is required' });
    }

    // Server-side Financial Calculations
    let calculatedSubtotal = 0;
    const validatedItems = items.map(item => {
      const parsedQty = Number(item.quantity);
      const quantity = Number.isNaN(parsedQty) || parsedQty < 1 ? 1 : parsedQty;
      const rawPrice = item.price !== undefined ? item.price : item.unitPrice;
      const parsedPrice = Number(rawPrice);
      const price = Number.isNaN(parsedPrice) ? 0 : Math.max(0, parsedPrice);
      const total = quantity * price;
      calculatedSubtotal += total;

      return {
        productId: item.productId,
        quantity,
        price,
        total
      };
    });

    const validatedDiscount = Math.max(0, Number(discount) || 0);
    const validatedPaid = Math.max(0, Number(paid) || 0);
    const calculatedGrandTotal = Math.max(0, calculatedSubtotal - validatedDiscount);
    const calculatedRemaining = Math.max(0, calculatedGrandTotal - validatedPaid);

    let status = 'UNPAID';
    if (validatedPaid >= calculatedGrandTotal && calculatedGrandTotal > 0) status = 'PAID';
    else if (validatedPaid > 0) status = 'PARTIAL';
    else if (calculatedGrandTotal === 0) status = 'PAID';

    const result = await runInTransaction(async (session) => {
      const opts = session ? { session } : {};

      // 1. Verify all products exist
      for (const item of validatedItems) {
        const product = await Product.findById(item.productId).session(session);
        if (!product) throw new Error(`Product not found: ${item.productId}`);
      }

      // 2. Generate unique atomic invoice number
      const invoiceNumber = await getNextSequence('sale_invoice', 'INV', 4, session);

      // 3. Create Sale Document
      const sale = new Sale({
        invoiceNumber,
        customerId,
        items: validatedItems,
        subtotal: calculatedSubtotal,
        discount: validatedDiscount,
        grandTotal: calculatedGrandTotal,
        paid: validatedPaid,
        remaining: calculatedRemaining,
        date: date || new Date(),
        status
      });

      await sale.save(opts);

      // 4. Process each item (Decrease stock & log movement)
      for (const item of validatedItems) {
        const product = await Product.findById(item.productId).session(session);
        product.currentStock -= Number(item.quantity);
        await product.save(opts);

        const movement = new StockMovement({
          productId: item.productId,
          type: 'SALE',
          quantity: -Math.abs(Number(item.quantity)),
          reason: `Sales Invoice: ${invoiceNumber}`,
          referenceId: sale._id,
          date: date || new Date()
        });
        await movement.save(opts);
      }

      // 5. Update customer balance
      const customer = await Customer.findById(customerId).session(session);
      if (!customer) throw new Error('Customer not found');

      customer.currentBalance += Number(calculatedRemaining);
      await customer.save(opts);

      return sale;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('createSale error:', error);
    res.status(400).json({ success: false, message: error.message || 'Failed to create sale' });
  }
};

// @desc    Toggle Sale Cancellation Status (Cancel/Restore)
// @route   PUT /api/sales/:id/toggle-cancel
// @access  Private
const toggleSaleStatus = async (req, res) => {
  try {
    const updatedSale = await runInTransaction(async (session) => {
      const opts = session ? { session } : {};

      const sale = await Sale.findById(req.params.id).session(session);
      if (!sale) throw new Error('Sale not found');

      const isCancelling = !sale.isCancelled;

      // 1. Process items stock restoration / reversal
      for (const item of sale.items) {
        const product = await Product.findById(item.productId).session(session);
        if (!product) continue;

        if (isCancelling) {
          product.currentStock += Number(item.quantity);
          const movement = new StockMovement({
            productId: item.productId,
            type: 'SALE_CANCEL',
            quantity: Math.abs(Number(item.quantity)),
            reason: `Cancelled Sales Invoice: ${sale.invoiceNumber}`,
            referenceId: sale._id,
            date: new Date()
          });
          await movement.save(opts);
        } else {
          product.currentStock -= Number(item.quantity);
          const movement = new StockMovement({
            productId: item.productId,
            type: 'SALE_RESTORE',
            quantity: -Math.abs(Number(item.quantity)),
            reason: `Restored Sales Invoice: ${sale.invoiceNumber}`,
            referenceId: sale._id,
            date: new Date()
          });
          await movement.save(opts);
        }

        await product.save(opts);
      }

      // 2. Update customer balance
      const customer = await Customer.findById(sale.customerId).session(session);
      if (customer) {
        if (isCancelling) {
          customer.currentBalance -= Number(sale.remaining);
        } else {
          customer.currentBalance += Number(sale.remaining);
        }
        await customer.save(opts);
      }

      // 3. Update sale status
      sale.isCancelled = isCancelling;
      await sale.save(opts);

      return { sale, isCancelling };
    });

    res.json({
      success: true,
      data: updatedSale.sale,
      message: updatedSale.isCancelling ? 'Sale cancelled successfully' : 'Sale restored successfully'
    });
  } catch (error) {
    console.error('toggleSaleStatus error:', error);
    res.status(400).json({ success: false, message: error.message || 'Failed to update sale status' });
  }
};

// @desc    Add Payment to a Sale
// @route   POST /api/sales/:id/payment
// @access  Private
const addSalePayment = async (req, res) => {
  try {
    const { amount } = req.body;
    const paymentAmount = Number(amount);

    if (!paymentAmount || paymentAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Please provide a valid payment amount' });
    }

    const updatedSale = await runInTransaction(async (session) => {
      const opts = session ? { session } : {};

      const sale = await Sale.findById(req.params.id).session(session);
      if (!sale) throw new Error('Sale not found');
      if (sale.isCancelled) throw new Error('Cannot add payment to a cancelled sale');
      if (sale.remaining <= 0) throw new Error('This invoice is already fully paid');
      if (paymentAmount > sale.remaining) {
        throw new Error(`Payment amount (Rs. ${paymentAmount}) cannot exceed remaining balance (Rs. ${sale.remaining})`);
      }

      sale.paid += paymentAmount;
      sale.remaining -= paymentAmount;

      if (sale.remaining <= 0) {
        sale.status = 'PAID';
      } else {
        sale.status = 'PARTIAL';
      }

      await sale.save(opts);

      const customer = await Customer.findById(sale.customerId).session(session);
      if (customer) {
        customer.currentBalance -= paymentAmount;
        await customer.save(opts);
      }

      return sale;
    });

    res.json({
      success: true,
      data: updatedSale,
      message: `Payment of Rs. ${paymentAmount} added successfully`
    });
  } catch (error) {
    console.error('addSalePayment error:', error);
    res.status(400).json({ success: false, message: error.message || 'Failed to process payment' });
  }
};

module.exports = {
  getSales,
  getSaleById,
  createSale,
  toggleSaleStatus,
  addSalePayment
};
