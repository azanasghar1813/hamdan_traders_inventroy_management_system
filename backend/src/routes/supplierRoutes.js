const express = require('express');
const router = express.Router();
const { getSuppliers, createSupplier, updateSupplier } = require('../controllers/supplierController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getSuppliers)
  .post(protect, createSupplier);

router.route('/:id')
  .put(protect, updateSupplier);

module.exports = router;
