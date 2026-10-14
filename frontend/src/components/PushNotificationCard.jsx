import React, { useState, useEffect } from 'react';
import {
  isPushNotificationSupported,
  getNotificationPermission,
  getExistingSubscription,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  sendTestPushNotification
} from '../utils/pushManager';
import { FiBell, FiCheckCircle, FiAlertCircle, FiSend, FiX, FiSmartphone } from 'react-icons/fi';

const PushNotificationCard = ({ compact = false }) => {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testStatus, setTestStatus] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const checkStatus = async () => {
      const isSupp = isPushNotificationSupported();
      setSupported(isSupp);
      if (isSupp) {
        setPermission(getNotificationPermission());
        const sub = await getExistingSubscription();
        setIsSubscribed(!!sub);
      }
    };
    checkStatus();
  }, []);

  const handleSubscribe = async () => {
    setLoading(true);
    setErrorMessage('');
    setTestStatus(null);
    try {
      await subscribeToPushNotifications();
      setIsSubscribed(true);
      setPermission(getNotificationPermission());
      setTestStatus({
        type: 'success',
        message: '🎉 Notifications enabled! Tap "Send Test" to verify your device.'
      });
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to enable push notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      await unsubscribeFromPushNotifications();
      setIsSubscribed(false);
      setTestStatus(null);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to unsubscribe');
    } finally {
      setLoading(false);
    }
  };

  const handleSendTest = async () => {
    setLoading(true);
    setTestStatus(null);
    setErrorMessage('');
    try {
      const res = await sendTestPushNotification();
      if (res.success) {
        setTestStatus({
          type: 'success',
          message: '📲 Test notification sent! Check your phone notification tray.'
        });
      } else {
        setErrorMessage(res.message || 'Test failed');
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to send test');
    } finally {
      setLoading(false);
    }
  };

  if (!supported) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 flex items-start space-x-3">
        <FiAlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
        <div>
          <p className="font-semibold">Web Push Not Supported on this Browser</p>
          <p className="text-xs text-amber-700 mt-0.5">
            To receive mobile push notifications, please open Hamdan Traders in Chrome on Android or Safari (installed to Home Screen) on iOS 16.4+.
          </p>
        </div>
      </div>
    );
  }

  // Compact Header / Banner version
  if (compact) {
    if (isSubscribed) {
      return (
        <div className="flex items-center space-x-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
          <FiCheckCircle className="w-3.5 h-3.5 text-emerald-600" />
          <span className="font-medium hidden sm:inline">Mobile Alerts Active</span>
          <button
            onClick={handleSendTest}
            disabled={loading}
            className="ml-1 text-emerald-800 hover:text-emerald-950 font-bold underline cursor-pointer disabled:opacity-50"
            title="Send test notification to phone"
          >
            {loading ? 'Sending...' : 'Test'}
          </button>
        </div>
      );
    }

    return (
      <button
        onClick={handleSubscribe}
        disabled={loading}
        className="flex items-center space-x-2 text-xs text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-full border border-indigo-200 font-medium transition cursor-pointer"
        title="Enable Low Stock Notifications"
      >
        <FiBell className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
        <span>Enable Mobile Alerts</span>
      </button>
    );
  }

  // Full Card version (ideal for Alerts Page)
  return (
    <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-xl shadow-lg p-6 mb-8 border border-indigo-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 backdrop-blur-sm border border-white/20">
            <FiSmartphone className="w-6 h-6 text-indigo-300" />
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-lg font-bold text-white tracking-wide">
                Real-Time Low Stock Push Notifications
              </h2>
              {isSubscribed ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  <FiCheckCircle className="w-3 h-3 mr-1" /> Active on this device
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  Not Enabled
                </span>
              )}
            </div>
            <p className="text-sm text-indigo-200 mt-1 max-w-xl">
              Jab bhi kisi item ka stock kam hoga, aapke mobile par foran sound aur vibration ke sath notification aayegi:
            </p>
            <p className="text-xs text-amber-200/90 font-mono mt-1 bg-black/25 px-2.5 py-1 rounded inline-block border border-amber-400/20">
              🚨 Malai Topping ka stock kam ho gaya hai! Baqi sirf 4 boxes reh gaye hain.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!isSubscribed ? (
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-md transition-all duration-200 flex items-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <FiBell className="w-4 h-4" />
              <span>{loading ? 'Enabling...' : 'Enable Mobile Notifications'}</span>
            </button>
          ) : (
            <>
              <button
                onClick={handleSendTest}
                disabled={loading}
                className="px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white font-medium rounded-lg border border-white/20 backdrop-blur-sm transition flex items-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                <FiSend className="w-4 h-4 text-indigo-200" />
                <span>{loading ? 'Sending...' : '⚡ Send Test Notification'}</span>
              </button>
              <button
                onClick={handleUnsubscribe}
                disabled={loading}
                className="text-xs text-indigo-300 hover:text-red-300 underline cursor-pointer px-2 py-1"
              >
                Disable
              </button>
            </>
          )}
        </div>
      </div>

      {testStatus && (
        <div className="mt-4 p-3 bg-emerald-500/20 border border-emerald-400/30 rounded-lg text-sm text-emerald-200 flex items-center justify-between">
          <span>{testStatus.message}</span>
          <button onClick={() => setTestStatus(null)} className="text-emerald-300 hover:text-white">
            <FiX className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="mt-4 p-3 bg-red-500/20 border border-red-400/30 rounded-lg text-sm text-red-200 flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage('')} className="text-red-300 hover:text-white">
            <FiX className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default PushNotificationCard;
