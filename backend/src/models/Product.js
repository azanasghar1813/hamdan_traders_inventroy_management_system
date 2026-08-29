const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, default: 'Unnamed Product', index: true },

    unit: { type: String },
    purchasePrice: { type: Number, min: 0 },
    salePrice: { type: Number, min: 0 },
    currentStock: { type: Number, default: 0, min: 0 },
    minimumStock: { type: Number, default: 0 },
    expiryDate: { type: Date },
    isDeleted: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
