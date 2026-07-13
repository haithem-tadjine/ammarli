import { Stack } from 'expo-router';
import { I18nManager, AppState, AppStateStatus, View } from 'react-native';
import { useEffect, useRef } from 'react';
import { useDriverStore } from '../../src/store/useDriverStore';
import * as Notifications from 'expo-notifications';
import {
  triggerPendingOrderReminder,
  clearAllLocalNotifications,
} from '../../src/services/notificationService';
import { useAuthStore } from '../../src/store/useAuthStore';
import { socketService } from '../../src/services/socket';
import OfflineBar from '../../components/OfflineBar';

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export default function DriverLayout() {
  const appState = useRef<AppStateStatus>(AppState.currentState);
  // Store the scheduled notification ID so we can cancel it if driver returns
  const scheduledNotifId = useRef<string | null>(null);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState) => {
      const prevState = appState.current;
      appState.current = nextState;

      // ── App went to background ──────────────────────────────────────────
      if (prevState === 'active' && nextState === 'background') {
        const storeState = useDriverStore.getState();
        const { driverStatus, activeDriverOrder, registeredDriver } = storeState;

        if (activeDriverOrder) {
          // Driver has an active accepted order → fire "pending order" notification immediately
          await triggerPendingOrderReminder();

        } else if (driverStatus === 'AVAILABLE' && registeredDriver) {
          // Driver is online and available → schedule "new order" notification via OS.
          // We use a native `seconds` trigger instead of a JS setTimeout so the OS
          // daemon handles the delay — the JS thread is free to be frozen by the OS.
          const id = await Notifications.scheduleNotificationAsync({
            content: {
              title: 'طلبية مياه جديدة! 💧',
              body: 'يوجد زبون جديد في منطقتك ينتظر التوصيل.',
              sound: 'default',
              categoryIdentifier: 'NEW_ORDER',
              data: { type: 'NEW_ORDER' },
              priority: Notifications.AndroidNotificationPriority.MAX,
            },
            trigger: {
              channelId: 'urgent-driver-orders',
              seconds: 5,       // OS fires this after 5s — no JS thread needed
              repeats: false,
            },
          });
          scheduledNotifId.current = id;
        }
      }

      // ── App came back to foreground ─────────────────────────────────────
      if (prevState === 'background' && nextState === 'active') {
        // Cancel the pending OS-scheduled notification if driver came back before it fired
        if (scheduledNotifId.current) {
          await Notifications.cancelScheduledNotificationAsync(scheduledNotifId.current);
          scheduledNotifId.current = null;
        }
        // Clear the notification tray so stale alerts are dismissed
        await clearAllLocalNotifications();
      }
    });

    return () => {
      subscription.remove();
      // Cancel on unmount as well
      if (scheduledNotifId.current) {
        Notifications.cancelScheduledNotificationAsync(scheduledNotifId.current);
      }
    };
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <OfflineBar />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_left' }}>
        {/* Full-screen overlay for incoming new orders — covers lock screen */}
        <Stack.Screen
          name="incoming-order"
          options={{
            presentation:  'fullScreenModal',
            headerShown:   false,
            animation:     'fade',
            gestureEnabled: false,  // Prevent swipe-dismiss
          }}
        />
        <Stack.Screen
          name="customer-rating"
          options={{
            presentation: 'transparentModal',
            headerShown: false,
            animation: 'fade',
          }}
        />
      </Stack>
    </View>
  );
}

