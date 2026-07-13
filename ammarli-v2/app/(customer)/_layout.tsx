// Customer Stack Layout
// All screens inside (customer)/ share this layout
import { Stack, router } from 'expo-router';
import { AppState, AppStateStatus, View, Alert } from 'react-native';
import { useEffect, useRef } from 'react';
import { useCustomerStore } from '../../src/store/useCustomerStore';
import { useAuthStore } from '../../src/store/useAuthStore';
import {
  triggerDriverFoundNotification,
  triggerDriverArrivedNotification,
  clearAllLocalNotifications,
} from '../../src/services/notificationService';
import * as Notifications from 'expo-notifications';
import { socketService } from '../../src/services/socket';
import OfflineBar from '../../components/OfflineBar';

export default function CustomerLayout() {
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const notifFired = useRef(false);
  const token = useAuthStore((s) => s.token);
  const userProfile = useAuthStore((s) => s.userProfile);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState) => {
      const prevState = appState.current;
      appState.current = nextState;

      // ── الزبون أغلق التطبيق وله طلبية نشطة ─────────────────────────────────
      if (prevState === 'active' && nextState === 'background') {
        const { activeOrder } = useCustomerStore.getState();
        if (activeOrder && !notifFired.current) {
          notifFired.current = true;
          // Use the typed function which targets the correct channel + custom sound
          await triggerDriverFoundNotification();
        }
      }

      // ── الزبون عاد للتطبيق ────────────────────────────────────────────────────────────
      if (prevState === 'background' && nextState === 'active') {
        notifFired.current = false;
        await clearAllLocalNotifications();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    // ── Connect Socket and Setup Listeners ─────────────────────────────
    const setupSocket = async () => {
      if (token && userProfile?.id) {
        console.log('🔄 Auth state ready, connecting Customer Socket...');
        await socketService.connectAsUser(); // Wait for socket to be created

        socketService.on('request_accepted', (data) => {
          console.log('✅ SOCKET RECEIVED (request_accepted):', data);
          useCustomerStore.getState().handleSocketOrderUpdate(data);
        });

        socketService.on('ride_started', (data) => {
          console.log('✅ SOCKET RECEIVED (ride_started):', data);
          useCustomerStore.getState().handleSocketOrderUpdate(data);
        });

        socketService.on('driver_arrived', async (data) => {
          console.log('🔔 SOCKET: driver_arrived received', data);
          useCustomerStore.getState().handleSocketOrderUpdate(data);
          // إشعار الزبون بوصول السائق
          try { await triggerDriverArrivedNotification(); } catch (_) { }
          // Navigation is handled by order-tracking.tsx or the active order banner
        });

        socketService.on('request_completed', (data) => {
          console.log('✅ SOCKET RECEIVED (request_completed):', data);
          useCustomerStore.getState().handleSocketOrderUpdate(data);
        });

        socketService.on('request_cancelled', (data) => {
          console.log('✅ SOCKET RECEIVED (request_cancelled):', data);
          useCustomerStore.getState().handleSocketOrderUpdate(data);

          const title = data.alertTitle || 'تنبيه';
          const message = data.alertMessage || (data.status === 'EXPIRED' ? 'عذراً، لا يوجد سائقون متاحون حالياً وتم إلغاء الطلب.' : 'تم إلغاء الطلبية من الطرف الآخر.');

          Alert.alert(
            title,
            message,
            [{
              text: 'حسناً', onPress: () => {
                useCustomerStore.getState().clearActiveOrderStore();
                if (data.action === 'RE_ROUTING') {
                  router.replace('/(customer)/searching-driver');
                } else {
                  router.replace('/(customer)/(tabs)');
                }
              }
            }]
          );
        });

        socketService.on('request_searching', (data) => {
          console.log('✅ SOCKET RECEIVED (request_searching):', data);
          useCustomerStore.getState().handleSocketOrderUpdate(data);

          if (data.requeued) {
            const title = data.alertTitle || 'تنبيه';
            const message = data.alertMessage || 'لقد اعتذر السائق عن التوصيل. جاري البحث عن سائق آخر فوراً...';

            Alert.alert(title, message, [
              {
                text: 'حسناً', onPress: () => {
                  // As requested: clear store in both scenarios
                  useCustomerStore.getState().clearActiveOrderStore();

                  if (data.action === 'GO_HOME') {
                    router.replace('/(customer)/(tabs)');
                  } else {
                    router.replace('/(customer)/searching-driver');
                  }
                }
              }
            ]);
          }
          // Do NOT replace to order-tracking here! User should stay on searching-driver
        });
      }
    };

    setupSocket();

    return () => {
      if (token) {
        socketService.disconnect();
      }
    };
  }, [token, userProfile?.id]);

  return (
    <View style={{ flex: 1 }}>
      <OfflineBar />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="login" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="register" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="forgot-password" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="help" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="edit-profile" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="security" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="privacy" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="order-details" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="tank-order-details" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="driver-arrived" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
        <Stack.Screen name="location-picker" options={{ animation: 'slide_from_bottom', headerShown: false }} />
        <Stack.Screen name="cancel-order" options={{ animation: 'slide_from_bottom', headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      </Stack>
    </View>
  );
}
