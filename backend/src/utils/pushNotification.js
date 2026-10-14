const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const email = process.env.VAPID_EMAIL || 'mailto:support@hamdantraders.com';

if (publicKey && privateKey) {
  try {
    webpush.setVapidDetails(email, publicKey, privateKey);
  } catch (err) {
    console.error('Failed to configure VAPID details:', err.message);
  }
}

/**
 * Send a web push notification to all registered subscriptions
 * @param {Object} payload - Notification data { title, body, icon, url, data }
 */
const sendPushNotification = async (payload) => {
  if (!publicKey || !privateKey) {
    console.warn('Cannot send push notification: VAPID keys not configured in environment.');
    return { success: false, reason: 'VAPID keys missing' };
  }

  try {
    const subscriptions = await PushSubscription.find({});
    if (!subscriptions || subscriptions.length === 0) {
      return { success: true, count: 0 };
    }

    const notificationPayload = JSON.stringify({
      title: payload.title || 'Hamdan Traders Alert',
      body: payload.body || 'Low stock update',
      icon: payload.icon || '/logo.png',
      badge: '/logo.png',
      data: {
        url: payload.url || '/alerts'
      }
    });

    const sendPromises = subscriptions.map(async (sub) => {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: {
          auth: sub.keys.auth,
          p256dh: sub.keys.p256dh
        }
      };

      try {
        await webpush.sendNotification(pushConfig, notificationPayload);
      } catch (err) {
        // If subscription is expired or invalid (404 or 410 Gone), delete it
        if (err.statusCode === 404 || err.statusCode === 410) {
          await PushSubscription.deleteOne({ _id: sub._id });
        } else {
          console.error('Push notification send error:', err.message);
        }
      }
    });

    await Promise.all(sendPromises);
    return { success: true, count: subscriptions.length };
  } catch (err) {
    console.error('sendPushNotification error:', err);
    return { success: false, error: err.message };
  }
};

module.exports = {
  sendPushNotification
};
