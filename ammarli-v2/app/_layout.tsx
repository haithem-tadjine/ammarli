/**
 * ─── Root Layout ───────────────────────────────────────────────────────────────
 * Responsibilities:
 *  1. Load Cairo font (Arabic + Latin support)
 *  2. Initialize i18n (Arabic default, RTL)
 *  3. Hydrate auth state from AsyncStorage BEFORE routing
 *  4. Register Expo Push Token with backend after hydration
 *  5. Hide native splash screen when fonts are ready
 *  6. Provide GestureHandler + SafeArea context to the whole app
 */

import {
  Cairo_400Regular,
  Cairo_600SemiBold,
  Cairo_700Bold,
  useFonts,
} from '@expo-google-fonts/cairo';
import { SplashScreen, Stack, router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { setupPushNotifications, registerPushTokenWithBackend } from '../src/services/notificationService';
import { useEffect, useState, useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { I18nManager, Platform, View, LogBox } from 'react-native';
import { useAuthStore } from '../src/store/useAuthStore';
import { useDriverStore } from '../src/store/useDriverStore';
import NewOrderCard from '../components/NewOrderCard';

// Ignore the Expo Go warning about remote push notifications since we only use local ones in dev
LogBox.ignoreLogs(['expo-notifications: Android Push notifications']);

// Force RTL globally for the entire app (Mobile)
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

// Polyfill DOMException to prevent runtime errors with certain Babel/Metro configurations
if (typeof global.DOMException === 'undefined') {
  (global as any).DOMException = class DOMException extends Error {
    constructor(message?: string, name?: string) {
      super(message);
      this.name = name || 'DOMException';
    }
  };
}

// Force RTL globally for Web
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  document.documentElement.dir = 'rtl';
}

// Initialize i18n side-effect (must be imported before any screen renders)
import '../src/shared/localization/i18n';

// ─── Notifee Global Background Handler ──────────────────────────────────────
// 🚨 CRITICAL: This MUST live at module scope (outside any component/hook).
//    When the app is fully killed, React components don't exist — only this
//    top-level registration survives and allows Notifee to wake the JS engine.
import notifee, { EventType, Event as NotifeeEvent } from '@notifee/react-native';

notifee.onBackgroundEvent(async ({ type, detail }: NotifeeEvent) => {
  if (type === EventType.ACTION_PRESS) {
    // Always cancel the notification immediately, regardless of action
    if (detail.notification?.id) {
      await notifee.cancelNotification(detail.notification.id);
    }
    // 'accept' and 'decline' navigation is handled by incoming-order.tsx itself
    // when it mounts via fullScreenAction. No router call needed here.
  }
});
// ────────────────────────────────────────────────────────────────────────────

// Prevent native splash from hiding until fonts are loaded
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [fontError, setFontError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadAppFonts() {
      try {
        await require('expo-font').loadAsync({
          'Cairo-Regular': Cairo_400Regular,
          'Cairo-SemiBold': Cairo_600SemiBold,
          'Cairo-Bold': Cairo_700Bold,
        });
      } catch (e) {
        console.warn('Font load timeout or error:', e);
        setFontError(e as Error);
      } finally {
        setFontsLoaded(true);
      }
    }
    loadAppFonts();
  }, []);

  const hydratedRef = useRef(false);

  useEffect(() => {
    // ── Notifee Wake-up & Foreground Listeners ─────────────────────────────────
    async function checkInitialWakeup() {
      const initialNotification = await notifee.getInitialNotification();
      if (initialNotification?.notification?.data?.type === 'INCOMING_ORDER_FULLSCREEN') {
        const payloadStr = initialNotification.notification.data.payload as string;
        useDriverStore.getState().handleSocketDispatch(JSON.parse(payloadStr));
        if (initialNotification.notification.id) {
          await notifee.cancelNotification(initialNotification.notification.id);
        }
      }
    }
    checkInitialWakeup();

    const unsubscribeForeground = notifee.onForegroundEvent(async ({ type, detail }) => {
      if (type === EventType.DELIVERED && detail.notification?.data?.type === 'INCOMING_ORDER_FULLSCREEN') {
        const payloadStr = detail.notification.data.payload as string;
        useDriverStore.getState().handleSocketDispatch(JSON.parse(payloadStr));
        if (detail.notification.id) {
          await notifee.cancelNotification(detail.notification.id);
        }
      }
      if (type === EventType.PRESS && detail.notification?.data?.type === 'INCOMING_ORDER_FULLSCREEN') {
        const payloadStr = detail.notification.data.payload as string;
        useDriverStore.getState().handleSocketDispatch(JSON.parse(payloadStr));
        if (detail.notification.id) {
          await notifee.cancelNotification(detail.notification.id);
        }
      }
    });
    // ────────────────────────────────────────────────────────────────────────────

    // إعداد قنوات الإشعارات والصلاحيات
    setupPushNotifications();

    // ── Hydrate auth state from storage before any routing ─────────────────
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      useAuthStore.getState().hydrate().then((role) => {
        // After hydration, register push token if user is already logged in
        if (role) {
          registerPushTokenWithBackend();
        }
      });
    }

    // الاستماع للتفاعل مع إشعارات النظام
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response: Notifications.NotificationResponse) => {
        const actionId = response.actionIdentifier;
        const data = response.notification.request.content.data as Record<string, string>;
        const notifType = data?.type;

        // ── 1. الزبون ضغط على زر "قبول" في إشعار طلبية جديدة ─────────────
        if (actionId === 'accept' || (actionId === Notifications.DEFAULT_ACTION_IDENTIFIER && notifType === 'NEW_ORDER')) {
          router.push({
            pathname: '/(driver)/order-acceptance' as any,
            params: {
              customerName: data.customerName ?? 'زبون جديد',
              price:        data.price        ?? '2500',
              address:      data.address      ?? 'الجزائر العاصمة',
              orderType:    data.orderType    ?? 'spring_water',
              distance:     data.distance     ?? '2.5 كم',
              rating:       data.rating       ?? '4.8',
              items: JSON.stringify([
                {
                  id: 1,
                  name: 'مياه',
                  qty: data.quantity ?? 1,
                  unit: data.orderType === 'bottles' ? 'قوارير' : 'لتر',
                  price: data.price ?? '2500',
                  image: null,
                },
              ]),
              capacity: data.quantity ?? '1000',
            },
          });
          return;
        }

        // ── 2. زر "رفض" من إشعار طلبية جديدة ─────────────────────────────
        if (actionId === 'decline') {
          console.log('Driver declined the order from background notification');
          return;
        }

        // ── 3. ضغط على إشعار "طلبية قيد التوصيل" (ACTIVE_ORDER) ──────────
        if (actionId === Notifications.DEFAULT_ACTION_IDENTIFIER && notifType === 'ACTIVE_ORDER') {
          router.push({
            pathname: '/(driver)/order-details' as any,
            params: {
              customerName: data.customerName ?? 'الزبون',
              price:        data.price        ?? '2500',
              address:      data.address      ?? 'الجزائر العاصمة',
              orderType:    data.orderType    ?? 'spring_water',
              distance:     data.distance     ?? '2.5 كم',
              orderNumber:  data.orderNumber  ?? '',
            },
          });
        }

        // ── 4. الزبون ضغط على إشعار تتبع طلبيته ─────────────────────────
        if (actionId === Notifications.DEFAULT_ACTION_IDENTIFIER && notifType === 'CUSTOMER_ORDER_TRACKING') {
          router.push('/(customer)/order-tracking' as any);
        }
      }
    );

    if (fontsLoaded || fontError) {
      // Hide the native splash → our custom /splash screen takes over
      SplashScreen.hideAsync();
    }

    return () => {
      subscription.remove();
      unsubscribeForeground();
    };
  }, [fontsLoaded, fontError]);

  const globalIncomingOrder = useDriverStore(s => s.incomingOrdersQueue[0]);

  // NOTE: We always render the Stack so expo-router can process
  // router.replace() calls from the splash screen, even while fonts
  // are still loading. The native SplashScreen stays visible until
  // SplashScreen.hideAsync() fires above, so users see no unstyled content.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="splash" />
          <Stack.Screen name="role-selection" />
          <Stack.Screen name="(customer)" />
          <Stack.Screen name="(driver)" />
        </Stack>
        
        {/* ── System Integration: Render NewOrderCard globally when active ── */}
        {globalIncomingOrder && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, elevation: 9999, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
            <NewOrderCard 
              customerName={globalIncomingOrder.customer.name}
              price={Number(globalIncomingOrder.total || 0)}
              address={globalIncomingOrder.deliveryAddress.label}
              distance={globalIncomingOrder.deliveryAddress.distance}
              rating={5.0}
              orderType={
                useDriverStore.getState().registeredDriver?.driverType === 'Bottled' ? 'bottles' :
                useDriverStore.getState().registeredDriver?.waterType === 'well' ? 'well_water' :
                useDriverStore.getState().registeredDriver?.waterType === 'construction' ? 'construction_water' : 'spring_water'
              }
              quantity={globalIncomingOrder.items?.map(i => i.detail).join(' + ') || ''}
              totalSeconds={30}
              onAccept={() => {
                useDriverStore.getState().acceptDriverOrder(globalIncomingOrder).then(() => {
                  router.push({
                    pathname: '/(driver)/order-acceptance' as any,
                    params: { 
                      customerName: globalIncomingOrder.customer.name,
                      customerPhone: globalIncomingOrder.customer.phone,
                      customerLat: globalIncomingOrder.deliveryAddress.lat.toString(),
                      customerLng: globalIncomingOrder.deliveryAddress.lng.toString(),
                      price: globalIncomingOrder.total.toString(),
                      address: globalIncomingOrder.deliveryAddress.label,
                      orderType: useDriverStore.getState().registeredDriver?.waterType || 'spring',
                      capacity: globalIncomingOrder.items?.[0]?.detail?.replace(/\D/g, '') || '1000',
                      floor: globalIncomingOrder.items?.[0]?.floor || 'غير محدد',
                      distance: globalIncomingOrder.deliveryAddress.distance,
                      rating: '5.0',
                      items: JSON.stringify(globalIncomingOrder.items.map((i, idx) => ({ id: idx, name: i.description, qty: i.qty || 1, unit: i.detail, price: i.unitPrice || i.price })))
                    }
                  });
                });
              }}
              onDecline={() => {
                useDriverStore.getState().refuseDriverOrder(globalIncomingOrder.orderId);
                useDriverStore.getState().shiftIncomingQueue();
              }}
            />
          </View>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
