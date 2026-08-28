const express = require('express');
const router = express.Router();
const { getPurchases, getPurchaseById, createPurchase } = require('../controllers/purchaseController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getPurchases)
  .post(protect, createPurchase);

router.route('/:id')
  .get(protect, getPurchaseById);

module.exports = router;
