const express = require('express');
const router = express.Router();
const { getSalesReport, getPurchaseReport } = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');

router.get('/sales', protect, getSalesReport);
router.get('/purchases', protect, getPurchaseReport);

module.exports = router;
