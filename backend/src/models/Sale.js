const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    items: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true, min: 0 },
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
    category: { type: String, enum: ['City', 'Pizza Branches'], default: 'City', index: true },
    isCancelled: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Indexes for fast history, customer filtering, and dashboard aggregations
saleSchema.index({ customerId: 1, date: -1 });
saleSchema.index({ isCancelled: 1, date: -1 });
saleSchema.index({ date: -1, isCancelled: 1 });

module.exports = mongoose.model('Sale', saleSchema);
