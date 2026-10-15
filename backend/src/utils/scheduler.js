const cron = require('node-cron');
const Product = require('../models/Product');
const { sendPushNotification } = require('./pushNotification');

/**
 * Scan all active inventory items and send a consolidated low-stock summary push
 */
const sendDailyLowStockSummary = async () => {
  try {
    console.log('[Scheduler] Running low stock daily inventory check...');
    const lowStockProducts = await Product.find({
      isActive: true,
      isDeleted: false,
      $expr: { $lte: ['$currentStock', '$minimumStock'] }
    }).select('name currentStock minimumStock unit');

    if (!lowStockProducts || lowStockProducts.length === 0) {
      console.log('[Scheduler] All products are sufficiently stocked. No alert sent.');
      return { success: true, count: 0, message: 'All products sufficiently stocked' };
    }

    let payload;
    if (lowStockProducts.length === 1) {
      const p = lowStockProducts[0];
      const unitLabel = p.unit ? ` ${p.unit}` : '';
      payload = {
        title: '📋 Rozana Low Stock Report (11:00 AM)',
        body: `Sirf 1 item ka stock kam hai: ${p.name} (Baqi: ${p.currentStock}${unitLabel}). Supplier order ke liye tap karein.`,
        url: '/alerts'
      };
    } else {
      const preview = lowStockProducts
        .slice(0, 3)
        .map(p => `${p.name} (${p.currentStock}${p.unit ? ' ' + p.unit : ''})`)
        .join(', ');
      const extra = lowStockProducts.length > 3 ? ` aur mazeed ${lowStockProducts.length - 3} items` : '';
      payload = {
        title: `📋 Rozana Low Stock Report (${lowStockProducts.length} Items)`,
        body: `Total ${lowStockProducts.length} items ka stock kam hai: ${preview}${extra}. Supplier order ke liye tap karein.`,
        url: '/alerts'
      };
    }

    const pushResult = await sendPushNotification(payload);
    console.log('[Scheduler] Daily summary sent successfully:', pushResult);
    return { success: true, count: lowStockProducts.length, pushResult };
  } catch (error) {
    console.error('[Scheduler] Error running daily low stock summary:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Initialize background cron schedules
 */
const initScheduler = () => {
  // Run everyday at 11:00 AM Pakistan Standard Time (PKT) for testing
  cron.schedule(
    '0 11 * * *',
    async () => {
      console.log('[Cron] Triggering 11:00 AM PKT daily low stock summary...');
      await sendDailyLowStockSummary();
    },
    {
      scheduled: true,
      timezone: 'Asia/Karachi'
    }
  );
  console.log('✓ Scheduled daily low stock alerts at 11:00 AM (Asia/Karachi)');
};

module.exports = {
  sendDailyLowStockSummary,
  initScheduler
};
