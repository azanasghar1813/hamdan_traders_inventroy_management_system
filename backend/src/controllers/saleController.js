const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const StockMovement = require('../models/StockMovement');
const { getNextSequence, peekNextSequence } = require('../models/Counter');
const { runInTransaction } = require('../utils/transactionHelper');
const { sendPushNotification } = require('../utils/pushNotification');

// Helper to check for low stock products and dispatch real-time web push notification
const checkAndNotifyLowStock = async (productIds) => {
  if (!productIds || productIds.length === 0) return;
  try {
    const lowStockProducts = await Product.find({
      _id: { $in: productIds },
      $expr: { $lte: ['$currentStock', '$minimumStock'] }
    }).select('name currentStock minimumStock unit');

    if (lowStockProducts.length > 0) {
      if (lowStockProducts.length === 1) {
        const p = lowStockProducts[0];
        const unitLabel = p.unit ? ` ${p.unit}` : '';
        await sendPushNotification({
          title: `🚨 Low Stock Alert: ${p.name}`,
          body: `${p.name} ka stock kam ho gaya hai! Baqi sirf ${p.currentStock}${unitLabel} reh gaye hain.`,
          url: '/alerts'
        });
      } else {
        const productSummaries = lowStockProducts
          .slice(0, 3)
          .map(p => `${p.name} (Baqi: ${p.currentStock}${p.unit ? ' ' + p.unit : ''})`)
          .join(', ');
        const extra = lowStockProducts.length > 3 ? ` aur mazeed ${lowStockProducts.length - 3} items` : '';
        await sendPushNotification({
          title: `🚨 Low Stock Alert (${lowStockProducts.length} Items)`,
          body: `${productSummaries}${extra} ka stock kam ho gaya hai! Baraye meharbani check karein.`,
          url: '/alerts'
        });
      }
    }
  } catch (err) {
    console.error('Failed to trigger low stock push notification:', err.message);
  }
};

// @desc    Get sales with pagination and filtering
// @route   GET /api/sales
// @access  Private
const getSales = async (req, res) => {
  try {
    const { page, limit, customerId, search, startDate, endDate, sortField = 'date', sortOrder = 'desc', all } = req.query;

    const filter = {};

    if (customerId) {
      filter.customerId = customerId;
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        filter.date.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    if (search && search.trim()) {
      const q = search.trim();
      const matchingCustomers = await Customer.find({
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { phone: { $regex: q, $options: 'i' } }
        ]
      }).select('_id');
      const custIds = matchingCustomers.map((c) => c._id);

      filter.$or = [
        { invoiceNumber: { $regex: q, $options: 'i' } },
        { customerId: { $in: custIds } }
      ];
    }

    const sortMap = {
      date: 'date',
      invoiceNumber: 'invoiceNumber',
      total: 'grandTotal',
      paid: 'paid',
      remaining: 'remaining',
      createdAt: 'createdAt'
    };
    const sortProp = sortMap[sortField] || 'date';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const sortObj = { [sortProp]: sortDirection, _id: sortDirection };

    // Compute Summary Totals across all matching records
    const summaryAgg = await Sale.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalSales: {
            $sum: { $cond: [{ $eq: ['$isCancelled', true] }, 0, '$grandTotal'] }
          },
          totalPaid: {
            $sum: { $cond: [{ $eq: ['$isCancelled', true] }, 0, '$paid'] }
          },
          totalRemaining: {
            $sum: { $cond: [{ $eq: ['$isCancelled', true] }, 0, '$remaining'] }
          },
          activeCount: {
            $sum: { $cond: [{ $eq: ['$isCancelled', true] }, 0, 1] }
          },
          cancelledTotal: {
            $sum: { $cond: [{ $eq: ['$isCancelled', true] }, '$grandTotal', 0] }
          },
          cancelledCount: {
            $sum: { $cond: [{ $eq: ['$isCancelled', true] }, 1, 0] }
          }
        }
      }
    ]);

    const summary = summaryAgg.length > 0 ? summaryAgg[0] : {
      totalSales: 0,
      totalPaid: 0,
      totalRemaining: 0,
      activeCount: 0,
      cancelledTotal: 0,
      cancelledCount: 0
    };
    delete summary._id;

    // Check if pagination is requested
    const isPaginated = (page !== undefined || limit !== undefined) && all !== 'true';

    if (isPaginated) {
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.max(1, parseInt(limit, 10) || 25);
      const total = await Sale.countDocuments(filter);
      const totalPages = Math.ceil(total / limitNum) || 1;

      const sales = await Sale.find(filter)
        .populate('customerId', 'name phone')
        .sort(sortObj)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum);

      return res.json({
        success: true,
        data: sales,
        pagination: {
          total,
          page: pageNum,
          totalPages,
          limit: limitNum
        },
        summary
      });
    }

    // Default or all=true: return full list (backward compatible)
    const sales = await Sale.find(filter)
      .populate('customerId', 'name phone')
      .sort(sortObj);

    res.json({
      success: true,
      data: sales,
      pagination: {
        total: sales.length,
        page: 1,
        totalPages: 1,
        limit: sales.length
      },
      summary
    });
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

    let resolvedCustomerId = customerId;
    if (!resolvedCustomerId) {
      let walkInCust = await Customer.findOne({ name: 'Walk-in' });
      if (!walkInCust) {
        walkInCust = await Customer.create({ name: 'Walk-in', phone: '', address: '' });
      }
      resolvedCustomerId = walkInCust._id;
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

      // 1. Verify all products exist in a single batch query
      const productIds = validatedItems.map(i => i.productId);
      const existingProducts = await Product.find({ _id: { $in: productIds } })
        .select('_id')
        .session(session);

      if (existingProducts.length !== productIds.length) {
        const foundIds = new Set(existingProducts.map(p => p._id.toString()));
        const missing = productIds.find(id => !foundIds.has(id.toString()));
        throw new Error(`Product not found: ${missing}`);
      }

      // 2. Generate unique atomic invoice number
      const invoiceNumber = await getNextSequence('sale_invoice', 'INV', 4, session, Sale, 'invoiceNumber');

      // 3. Create Sale Document
      const sale = new Sale({
        invoiceNumber,
        customerId: resolvedCustomerId,
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

      // 4. Batch update stock using atomic bulkWrite (1 round-trip)
      const stockBulkOps = validatedItems.map(item => ({
        updateOne: {
          filter: { _id: item.productId },
          update: { $inc: { currentStock: -Number(item.quantity) } }
        }
      }));
      await Product.bulkWrite(stockBulkOps, opts);

      // 5. Batch insert stock movements (1 round-trip)
      const movementDocs = validatedItems.map(item => ({
        productId: item.productId,
        type: 'SALE',
        quantity: -Math.abs(Number(item.quantity)),
        reason: `Sales Invoice: ${invoiceNumber}`,
        referenceId: sale._id,
        date: date || new Date()
      }));
      await StockMovement.insertMany(movementDocs, opts);

      // 6. Update customer balance atomically
      const customer = await Customer.findByIdAndUpdate(
        resolvedCustomerId,
        { $inc: { currentBalance: Number(calculatedRemaining) } },
        { new: true, ...opts }
      );
      if (!customer) throw new Error('Customer not found');

      return sale;
    });

    // Check if any sold item's stock reached or went below minimum threshold
    checkAndNotifyLowStock(validatedItems.map(i => i.productId)).catch(err =>
      console.error('Low stock push check error:', err)
    );

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('createSale error:', error);
    res.status(400).json({ success: false, message: error.message || 'Failed to create sale' });
  }
};

// @desc    Update an existing sale order
// @route   PUT /api/sales/:id
// @access  Private
const updateSale = async (req, res) => {
  try {
    const { id } = req.params;
    const { customerId, items, discount = 0, paid = 0, date } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'No sale items provided' });
    }

    let resolvedCustomerId = customerId;
    if (!resolvedCustomerId) {
      let walkInCust = await Customer.findOne({ name: 'Walk-in' });
      if (!walkInCust) {
        walkInCust = await Customer.create({ name: 'Walk-in', phone: '', address: '' });
      }
      resolvedCustomerId = walkInCust._id;
    }

    // Financial calculations
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

      const oldSale = await Sale.findById(id).session(session);
      if (!oldSale) throw new Error('Sale not found');
      if (oldSale.isCancelled) throw new Error('Cancelled sales cannot be edited');

      // 1. Revert previous stock changes if sale was active
      for (const item of oldSale.items) {
        await Product.findByIdAndUpdate(
          item.productId,
          { $inc: { currentStock: Number(item.quantity) } },
          opts
        );
      }

      // 2. Revert previous customer remaining balance
      if (oldSale.customerId) {
        await Customer.findByIdAndUpdate(
          oldSale.customerId,
          { $inc: { currentBalance: -Number(oldSale.remaining) } },
          opts
        );
      }

      // 3. Remove old stock movement logs for this invoice
      await StockMovement.deleteMany({ referenceId: oldSale._id }, opts);

      // 4. Verify all new products exist
      const productIds = validatedItems.map(i => i.productId);
      const existingProducts = await Product.find({ _id: { $in: productIds } })
        .select('_id')
        .session(session);

      if (existingProducts.length !== productIds.length) {
        const foundIds = new Set(existingProducts.map(p => p._id.toString()));
        const missing = productIds.find(pid => !foundIds.has(pid.toString()));
        throw new Error(`Product not found: ${missing}`);
      }

      // 5. Apply new stock decrements
      const stockBulkOps = validatedItems.map(item => ({
        updateOne: {
          filter: { _id: item.productId },
          update: { $inc: { currentStock: -Number(item.quantity) } }
        }
      }));
      await Product.bulkWrite(stockBulkOps, opts);

      // 6. Record new stock movements
      const movementDocs = validatedItems.map(item => ({
        productId: item.productId,
        type: 'SALE',
        quantity: -Math.abs(Number(item.quantity)),
        reason: `Sales Invoice (Edited): ${oldSale.invoiceNumber}`,
        referenceId: oldSale._id,
        date: date || oldSale.date
      }));
      await StockMovement.insertMany(movementDocs, opts);

      // 7. Update new customer balance
      await Customer.findByIdAndUpdate(
        resolvedCustomerId,
        { $inc: { currentBalance: Number(calculatedRemaining) } },
        opts
      );

      // 8. Update Sale document
      oldSale.customerId = resolvedCustomerId;
      oldSale.items = validatedItems;
      oldSale.subtotal = calculatedSubtotal;
      oldSale.discount = validatedDiscount;
      oldSale.grandTotal = calculatedGrandTotal;
      oldSale.paid = validatedPaid;
      oldSale.remaining = calculatedRemaining;
      if (date) oldSale.date = date;
      oldSale.status = status;

      await oldSale.save(opts);
      return oldSale;
    });

    // Check if any updated item's stock is low
    checkAndNotifyLowStock(validatedItems.map(i => i.productId)).catch(err =>
      console.error('Low stock push check error:', err)
    );

    res.json({ success: true, data: result, message: 'Sale updated successfully' });
  } catch (error) {
    console.error('updateSale error:', error);
    res.status(400).json({ success: false, message: error.message || 'Failed to update sale' });
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

// @desc    Get upcoming next sale invoice number preview
// @route   GET /api/sales/next-number
// @access  Private
const getNextSaleNumber = async (req, res) => {
  try {
    const data = await peekNextSequence('sale_invoice', 'INV', 4, Sale, 'invoiceNumber');
    res.json({ success: true, data });
  } catch (error) {
    console.error('getNextSaleNumber error:', error);
    res.status(500).json({ success: false, message: 'Failed to preview next invoice number' });
  }
};

module.exports = {
  getSales,
  getSaleById,
  createSale,
  updateSale,
  toggleSaleStatus,
  addSalePayment,
  getNextSaleNumber
};
