const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Product name is required'], trim: true, index: true },

    unit: { type: String },
    purchasePrice: { type: Number, min: 0 },
    salePrice: { type: Number, min: 0 },
    currentStock: { type: Number, default: 0 },
    minimumStock: { type: Number, default: 0 },
    expiryDate: { type: Date },
    isDeleted: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// Index for active/non-deleted product lookups and dashboard counts
productSchema.index({ isActive: 1, isDeleted: 1 });

module.exports = mongoose.model('Product', productSchema);
