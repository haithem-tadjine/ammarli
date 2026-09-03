import { I18nManager } from 'react-native';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { triggerFullScreenOrderNotification } from './src/services/notificationService';

// Force RTL layout on the Native Bridge BEFORE the app initializes
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

let notifee = null;
let EventType = null;
try {
  const NotifeeModule = require('@notifee/react-native');
  notifee = NotifeeModule.default;
  EventType = NotifeeModule.EventType;
} catch (e) {
  console.warn('Notifee not available in background');
}

// ── Background Notification Handler (FCM Data Messages) ───────────
const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND-NOTIFICATION-TASK';

TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Background notification task error:', error);
    return;
  }
  if (data) {
    // Expo Notifications wraps the data differently sometimes based on background state
    const notificationPayload = data?.notification?.request?.content?.data || data?.notification?.data || data;
    
    if (notificationPayload?.type === 'dispatch_offer') {
      try {
        const orderData = JSON.parse(notificationPayload.payload || '{}');
        await triggerFullScreenOrderNotification({
          orderId: orderData.id || orderData._id || orderData.orderId || '',
          customerName: orderData.user?.firstName || 'زبون جديد',
          price: String(orderData.total || '2500'),
          address: orderData.pickupAddress || 'الجزائر العاصمة',
          // Usually matchedDrivers contains the distance
          distance: orderData.matchedDrivers?.[0]?.dist ? `${orderData.matchedDrivers[0].dist.toFixed(2)} كم` : '2.5 كم',
          orderType: orderData.waterType || 'spring_water',
        });
      } catch (e) {
        console.error('Failed to parse dispatch_offer payload in background', e);
      }
    }
  }
});

Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);

// ── Notifee Background Action Handler ──────────────────────────────────────
if (notifee && EventType) {
  notifee.onBackgroundEvent(async ({ type, detail }) => {
    const { notification, pressAction } = detail;
    if (type === EventType.ACTION_PRESS && pressAction?.id) {
      
      let orderPayload = {};
      try {
         orderPayload = JSON.parse(notification?.data?.payload || '{}');
      } catch(e) {}
      
      const orderId = orderPayload.orderId || notification?.data?.orderId;
      
      if (pressAction.id === 'accept') {
        console.log('[Notifee Background] Accept pressed for order:', orderId);
        if (orderId) {
          const { api } = require('./src/services/api');
          try {
            await api.post(`/requests/${orderId}/lock`);
            console.log('[Notifee Background] Successfully accepted order');
          } catch (e) {
            console.error('[Notifee Background] Failed to accept order:', e);
          }
        }
        if (notification?.id) {
           await notifee.cancelNotification(notification.id);
        }
      } else if (pressAction.id === 'decline') {
        console.log('[Notifee Background] Decline pressed for order:', orderId);
        if (orderId) {
          const { api } = require('./src/services/api');
          try {
            await api.post(`/requests/${orderId}/reject`);
            console.log('[Notifee Background] Successfully rejected order');
          } catch (e) {
            console.error('[Notifee Background] Failed to reject order:', e);
          }
        }
        if (notification?.id) {
           await notifee.cancelNotification(notification.id);
        }
      }
    }
  });
}

// Continue with standard Expo Router initialization
import 'expo-router/entry';
