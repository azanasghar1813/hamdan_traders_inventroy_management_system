const express = require('express');
const router = express.Router();
const { getStockMovements, adjustStock } = require('../controllers/stockController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getStockMovements);

router.route('/adjust')
  .post(protect, adjustStock);

module.exports = router;
