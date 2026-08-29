const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, default: 'Unnamed Customer', index: true },
    phone: { type: String, index: true },
    address: { type: String, default: '' },
    isDeleted: { type: Boolean, default: false },
    openingBalance: { type: Number, default: 0 },
    currentBalance: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Customer', customerSchema);
