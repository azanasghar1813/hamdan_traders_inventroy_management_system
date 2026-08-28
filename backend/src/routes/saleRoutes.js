const express = require('express');
const router = express.Router();
const { getSales, getSaleById, createSale } = require('../controllers/saleController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getSales)
  .post(protect, createSale);

router.route('/:id')
  .get(protect, getSaleById);

module.exports = router;
