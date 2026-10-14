const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema(
  {
    purchaseNumber: { type: String, required: true, unique: true },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    items: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true, min: 1 },
        cost: { type: Number, required: true, min: 0 },
        total: { type: Number, required: true, min: 0 }
      }
    ],
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    paid: { type: Number, required: true },
    remaining: { type: Number, required: true },
    date: { type: Date, default: Date.now, index: true },
    status: { type: String, enum: ['PAID', 'PARTIAL', 'UNPAID'], default: 'UNPAID' },
    isCancelled: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Indexes for fast history, supplier filtering, and dashboard aggregations
purchaseSchema.index({ supplierId: 1, date: -1 });
purchaseSchema.index({ isCancelled: 1, date: -1 });
purchaseSchema.index({ date: -1, isCancelled: 1 });

module.exports = mongoose.model('Purchase', purchaseSchema);
