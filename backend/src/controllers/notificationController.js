const PushSubscription = require('../models/PushSubscription');
const { sendPushNotification } = require('../utils/pushNotification');

// @desc    Get VAPID public key
// @route   GET /api/notifications/vapid-key
// @access  Public
const getVapidPublicKey = async (req, res) => {
  try {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    if (!publicKey) {
      return res.status(500).json({
        success: false,
        message: 'VAPID public key not configured on server'
      });
    }

    res.json({
      success: true,
      publicKey
    });
  } catch (error) {
    console.error('getVapidPublicKey error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Subscribe device to push notifications
// @route   POST /api/notifications/subscribe
// @access  Private / Public (stores subscription)
const subscribe = async (req, res) => {
  try {
    const { endpoint, keys, expirationTime } = req.body;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription payload. Endpoint and keys are required.'
      });
    }

    const userId = req.user ? req.user._id : null;
    const userAgent = req.headers['user-agent'] || '';

    // Upsert subscription
    const subscription = await PushSubscription.findOneAndUpdate(
      { endpoint },
      {
        endpoint,
        expirationTime,
        keys: {
          p256dh: keys.p256dh,
          auth: keys.auth
        },
        userId,
        userAgent
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({
      success: true,
      message: 'Subscribed to push notifications successfully',
      data: subscription
    });
  } catch (error) {
    console.error('subscribe error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Unsubscribe device
// @route   POST /api/notifications/unsubscribe
// @access  Public
const unsubscribe = async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ success: false, message: 'Endpoint is required' });
    }

    await PushSubscription.deleteOne({ endpoint });

    res.json({
      success: true,
      message: 'Unsubscribed successfully'
    });
  } catch (error) {
    console.error('unsubscribe error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Send test notification to verify setup
// @route   POST /api/notifications/test
// @access  Private
const sendTest = async (req, res) => {
  try {
    const result = await sendPushNotification({
      title: '🔔 Test Notification - Hamdan Traders',
      body: 'Your device is successfully connected to receive real-time low stock alerts!',
      url: '/alerts'
    });

    res.json({
      success: true,
      message: 'Test notification triggered',
      result
    });
  } catch (error) {
    console.error('sendTest error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getVapidPublicKey,
  subscribe,
  unsubscribe,
  sendTest
};
