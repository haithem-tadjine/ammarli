import { Stack } from 'expo-router';
import { I18nManager, AppState, AppStateStatus, View } from 'react-native';
import { useEffect, useRef } from 'react';
import { useDriverStore } from '../../src/store/useDriverStore';
import {
  triggerPendingOrderReminder,
  clearAllLocalNotifications,
} from '../../src/services/notificationService';
import OfflineBar from '../../components/OfflineBar';

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export default function DriverLayout() {
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState) => {
      const prevState = appState.current;
      appState.current = nextState;

      // ── App went to background ──────────────────────────────────────────
      if (prevState === 'active' && nextState === 'background') {
        const { activeDriverOrder } = useDriverStore.getState();

        if (activeDriverOrder) {
          // السائق لديه طلبية قيد التنفيذ → نذكّره بإشعار محلي
          await triggerPendingOrderReminder();
        }
      }

      // ── App came back to foreground ─────────────────────────────────────
      if (prevState === 'background' && nextState === 'active') {
        // امسح شريط الإشعارات حتى لا تبقى تنبيهات قديمة
        await clearAllLocalNotifications();
      }
    });

    return () => {
      subscription.remove();
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

