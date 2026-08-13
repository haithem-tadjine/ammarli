import { I18nManager } from 'react-native';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { triggerFullScreenOrderNotification } from './src/services/notificationService';

// Force RTL layout on the Native Bridge BEFORE the app initializes
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

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

// Continue with standard Expo Router initialization
import 'expo-router/entry';
