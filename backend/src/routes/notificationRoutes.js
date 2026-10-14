const express = require('express');
const router = express.Router();
const {
  getVapidPublicKey,
  subscribe,
  unsubscribe,
  sendTest
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

router.get('/vapid-key', protect, getVapidPublicKey);
router.post('/subscribe', protect, subscribe);
router.post('/unsubscribe', protect, unsubscribe);
router.post('/test', protect, sendTest);

module.exports = router;
