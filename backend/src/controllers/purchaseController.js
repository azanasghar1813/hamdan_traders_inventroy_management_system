const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const StockMovement = require('../models/StockMovement');
const { getNextSequence } = require('../models/Counter');
const { runInTransaction } = require('../utils/transactionHelper');

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
    console.error('getPurchases error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve purchases' });
  }
};

// @desc    Get single purchase
// @route   GET /api/purchases/:id
// @access  Private
const getPurchaseById = async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id)
      .populate('supplierId', 'name phone address')
      .populate('items.productId', 'name unit');

    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase not found' });
    }

    res.json({ success: true, data: purchase });
  } catch (error) {
    console.error('getPurchaseById error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve purchase details' });
  }
};

// @desc    Create new purchase
// @route   POST /api/purchases
// @access  Private
const createPurchase = async (req, res) => {
  try {
    const { supplierId, items, discount = 0, paid = 0, date } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'No purchase items provided' });
    }

    if (!supplierId) {
      return res.status(400).json({ success: false, message: 'Supplier ID is required' });
    }

    // Server-side Financial Calculations
    let calculatedSubtotal = 0;
    const validatedItems = items.map(item => {
      const parsedQty = Number(item.quantity);
      const quantity = Number.isNaN(parsedQty) || parsedQty < 1 ? 1 : parsedQty;
      const rawCost = item.cost !== undefined ? item.cost : (item.price !== undefined ? item.price : item.unitCost);
      const parsedCost = Number(rawCost);
      const cost = Number.isNaN(parsedCost) ? 0 : Math.max(0, parsedCost);
      const total = quantity * cost;
      calculatedSubtotal += total;

      return {
        productId: item.productId,
        quantity,
        cost,
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

      // 2. Generate unique atomic purchase number
      const purchaseNumber = await getNextSequence('purchase_invoice', 'PUR', 4, session, Purchase, 'purchaseNumber');

      // 3. Create Purchase Document
      const purchase = new Purchase({
        purchaseNumber,
        supplierId,
        items: validatedItems,
        subtotal: calculatedSubtotal,
        discount: validatedDiscount,
        grandTotal: calculatedGrandTotal,
        paid: validatedPaid,
        remaining: calculatedRemaining,
        date: date || new Date(),
        status
      });

      await purchase.save(opts);

      // 4. Increase product stock & update purchase price
      for (const item of validatedItems) {
        const product = await Product.findById(item.productId).session(session);
        product.currentStock += Number(item.quantity);
        product.purchasePrice = Number(item.cost);
        await product.save(opts);

        const movement = new StockMovement({
          productId: item.productId,
          type: 'PURCHASE',
          quantity: Number(item.quantity),
          reason: `Purchase Invoice: ${purchaseNumber}`,
          referenceId: purchase._id,
          date: date || new Date()
        });
        await movement.save(opts);
      }

      // 5. Update supplier balance
      const supplier = await Supplier.findById(supplierId).session(session);
      if (!supplier) throw new Error('Supplier not found');

      supplier.currentBalance += Number(calculatedRemaining);
      await supplier.save(opts);

      return purchase;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('createPurchase error:', error);
    res.status(400).json({ success: false, message: error.message || 'Failed to create purchase' });
  }
};

// @desc    Toggle Purchase Cancellation Status (Cancel/Restore)
// @route   PUT /api/purchases/:id/toggle-cancel
// @access  Private
const togglePurchaseStatus = async (req, res) => {
  try {
    const updatedPurchase = await runInTransaction(async (session) => {
      const opts = session ? { session } : {};

      const purchase = await Purchase.findById(req.params.id).session(session);
      if (!purchase) throw new Error('Purchase not found');

      const isCancelling = !purchase.isCancelled;

      // 1. Process each item
      for (const item of purchase.items) {
        const product = await Product.findById(item.productId).session(session);
        if (!product) continue;

        if (isCancelling) {
          // Revert stock (Decrease stock because purchase is cancelled)
          product.currentStock -= Number(item.quantity);

          const movement = new StockMovement({
            productId: item.productId,
            type: 'PURCHASE_CANCEL',
            quantity: -Math.abs(Number(item.quantity)),
            reason: `Cancelled Purchase Invoice: ${purchase.purchaseNumber}`,
            referenceId: purchase._id,
            date: new Date()
          });
          await movement.save(opts);
        } else {
          // Restore purchase (Increase stock again)
          product.currentStock += Number(item.quantity);

          const movement = new StockMovement({
            productId: item.productId,
            type: 'PURCHASE_RESTORE',
            quantity: Math.abs(Number(item.quantity)),
            reason: `Restored Purchase Invoice: ${purchase.purchaseNumber}`,
            referenceId: purchase._id,
            date: new Date()
          });
          await movement.save(opts);
        }

        await product.save(opts);
      }

      // 2. Update supplier balance
      const supplier = await Supplier.findById(purchase.supplierId).session(session);
      if (supplier) {
        if (isCancelling) {
          supplier.currentBalance -= Number(purchase.remaining);
        } else {
          supplier.currentBalance += Number(purchase.remaining);
        }
        await supplier.save(opts);
      }

      // 3. Update purchase status
      purchase.isCancelled = isCancelling;
      await purchase.save(opts);

      return { purchase, isCancelling };
    });

    res.json({
      success: true,
      data: updatedPurchase.purchase,
      message: updatedPurchase.isCancelling ? 'Purchase cancelled successfully' : 'Purchase restored successfully'
    });
  } catch (error) {
    console.error('togglePurchaseStatus error:', error);
    res.status(400).json({ success: false, message: error.message || 'Failed to update purchase status' });
  }
};

// @desc    Add Payment to a Purchase
// @route   POST /api/purchases/:id/payment
// @access  Private
const addPurchasePayment = async (req, res) => {
  try {
    const { amount } = req.body;
    const paymentAmount = Number(amount);

    if (!paymentAmount || paymentAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Please provide a valid payment amount' });
    }

    const updatedPurchase = await runInTransaction(async (session) => {
      const opts = session ? { session } : {};

      const purchase = await Purchase.findById(req.params.id).session(session);
      if (!purchase) throw new Error('Purchase not found');
      if (purchase.isCancelled) throw new Error('Cannot add payment to a cancelled purchase');
      if (purchase.remaining <= 0) throw new Error('This invoice is already fully paid');
      if (paymentAmount > purchase.remaining) {
        throw new Error(`Payment amount (Rs. ${paymentAmount}) cannot exceed remaining balance (Rs. ${purchase.remaining})`);
      }

      purchase.paid += paymentAmount;
      purchase.remaining -= paymentAmount;

      if (purchase.remaining <= 0) {
        purchase.status = 'PAID';
      } else {
        purchase.status = 'PARTIAL';
      }

      await purchase.save(opts);

      const supplier = await Supplier.findById(purchase.supplierId).session(session);
      if (supplier) {
        supplier.currentBalance -= paymentAmount;
        await supplier.save(opts);
      }

      return purchase;
    });

    res.json({
      success: true,
      data: updatedPurchase,
      message: `Payment of Rs. ${paymentAmount} added successfully`
    });
  } catch (error) {
    console.error('addPurchasePayment error:', error);
    res.status(400).json({ success: false, message: error.message || 'Failed to process payment' });
  }
};

module.exports = {
  getPurchases,
  getPurchaseById,
  createPurchase,
  togglePurchaseStatus,
  addPurchasePayment
};
