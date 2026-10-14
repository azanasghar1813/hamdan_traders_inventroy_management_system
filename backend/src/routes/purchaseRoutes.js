const express = require('express');
const router = express.Router();
const { getPurchases, getPurchaseById, createPurchase, togglePurchaseStatus, addPurchasePayment, getNextPurchaseNumber } = require('../controllers/purchaseController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getPurchases)
  .post(protect, createPurchase);

router.get('/next-number', protect, getNextPurchaseNumber);

router.route('/:id')
  .get(protect, getPurchaseById);

router.route('/:id/toggle-cancel')
  .put(protect, togglePurchaseStatus);

router.route('/:id/payment')
  .post(protect, addPurchasePayment);

module.exports = router;
