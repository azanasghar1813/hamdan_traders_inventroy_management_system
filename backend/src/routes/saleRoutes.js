const express = require('express');
const router = express.Router();
const { getSales, getSaleById, createSale, toggleSaleStatus, addSalePayment } = require('../controllers/saleController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getSales)
  .post(protect, createSale);

router.route('/:id')
  .get(protect, getSaleById);

router.route('/:id/toggle-cancel')
  .put(protect, toggleSaleStatus);

router.route('/:id/payment')
  .post(protect, addSalePayment);

module.exports = router;
