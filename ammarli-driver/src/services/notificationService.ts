import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
let notifee: any = null;
let AndroidImportance: any = null;
let AndroidVisibility: any = null;
let AndroidCategory: any = null;

try {
  const NotifeeModule = require('@notifee/react-native');
  notifee = NotifeeModule.default;
  AndroidImportance = NotifeeModule.AndroidImportance;
  AndroidVisibility = NotifeeModule.AndroidVisibility;
  AndroidCategory = NotifeeModule.AndroidCategory;
} catch (e) {
  console.warn('Notifee native module not found (likely running in Expo Go). Notifee features will be disabled.');
}

// Set handler to ALWAYS show notification (even when app is open or in background)
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
      priority: Notifications.AndroidNotificationPriority.MAX,
    }),
  });
}

export async function setupPushNotifications() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('ammarli-orders', {
      name: 'Ammarli Orders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      enableVibrate: true,
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('urgent-driver-orders', {
      name: 'Urgent Driver Orders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: '#FF231F7C',
      enableVibrate: true,
      sound: 'default',
    });

    // ── قنوات الزبون ───────────────────────────────────────────────────────
    await Notifications.setNotificationChannelAsync('customer-driver-found', {
      name: 'تم العثور على سائق',
      importance: Notifications.AndroidImportance.HIGH,
      enableVibrate: true,
      sound: 'driver_found.wav',   // assets/sounds/driver_found.wav
    });

    await Notifications.setNotificationChannelAsync('customer-driver-arrived', {
      name: 'السائق عند الباب',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
      sound: 'driver_arrived.wav', // assets/sounds/driver_arrived.wav
    });

    // ── Notifee Full-Screen Channel (طلبية جديدة — شاشة كاملة) ────────────
    await setupNotifeeOrderChannel();
  }

  if (Device.isDevice) {
    const existingStatus = await Notifications.getPermissionsAsync();
    let isGranted = (existingStatus as any).granted;

    if (!isGranted) {
      const newStatus = await Notifications.requestPermissionsAsync();
      isGranted = (newStatus as any).granted;
    }

    if (!isGranted) {
      console.log('Failed to get push token for push notification!');
    }
  }

  if (Platform.OS !== 'web') {
    // Category with "Accept" and "Decline" buttons
    await Notifications.setNotificationCategoryAsync('NEW_ORDER', [
      {
        identifier: 'accept',
        buttonTitle: 'قبول',
        options: { opensAppToForeground: true },
      },
      {
        identifier: 'decline',
        buttonTitle: 'رفض',
        options: { isDestructive: true, opensAppToForeground: false },
      },
    ]);
  }

  // Category for active order tap — no buttons, just opens the app
  // Removed because setNotificationCategoryAsync requires at least one action.
  // Tap action opens the app by default.
}

/**
 * Registers the device's Expo Push Token with the backend so the server
 * can send FCM/APNs push notifications to this device.
 * Safe to call on every app launch — the backend should deduplicate tokens.
 */
export async function registerPushTokenWithBackend(): Promise<void> {
  if (Platform.OS === 'web' || !Device.isDevice) return; // Push tokens only work on real mobile devices

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Push] Permission not granted — skipping token registration');
      return;
    }

    // Get the native FCM/APNs token for Firebase Admin SDK
    const tokenData = await Notifications.getDevicePushTokenAsync();
    const pushToken = tokenData.data;

    if (!pushToken) return;

    // Dynamically import api to avoid circular deps at module level
    const { api } = await import('./api');
    await api.patch('/users/me/push-token', { pushToken });
    console.log('[Push] Token registered with backend:', pushToken);
  } catch (err) {
    // Non-fatal — push will degrade gracefully to socket-only notifications
    console.warn('[Push] Failed to register push token:', err);
  }
}

// ── 1a. Target: Customer (When a Driver is Found) ─────────────────────────
export async function triggerDriverFoundNotification() {
  if (Platform.OS === 'web') return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🚚 تم العثور على سائق!',
      body: 'تم العثور على سائق لطلبيتك. اضغط هنا لتتبع موقع السائق.',
      sound: 'driver_found.wav', // iOS: place file in app bundle root
      categoryIdentifier: 'CUSTOMER_ORDER_TRACKING',
      data: { type: 'CUSTOMER_ORDER_TRACKING' },
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: {
      channelId: 'customer-driver-found', // Android: uses driver_found.wav channel
    },
  });
}

// ── 1b. Target: Customer (When Driver Arrives at location) ─────────────────
export async function triggerDriverArrivedNotification() {
  if (Platform.OS === 'web') return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'السائق في الخارج! 📍',
      body: 'سائقك وصل وينتظرك بالخارج. الرجاء استلام الطلبية.',
      sound: 'driver_arrived.wav', // iOS: place file in app bundle root
      categoryIdentifier: 'CUSTOMER_ORDER_TRACKING',
      data: { type: 'CUSTOMER_ORDER_TRACKING' },
      priority: Notifications.AndroidNotificationPriority.MAX,
    },
    trigger: {
      channelId: 'customer-driver-arrived', // Android: uses driver_arrived.wav channel
    },
  });
}

// ── 2. Target: Driver (When New Order Arrives) ──────────────────────────────
export async function triggerNewOrderNotification() {
  if (Platform.OS === 'web') return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'طلبية مياه جديدة! 💧',
      body: 'يوجد زبون جديد في منطقتك ينتظر التوصيل.',
      sound: 'default',
      categoryIdentifier: 'NEW_ORDER', // Shows "قبول" and "رفض" buttons
      data: {
        type: 'NEW_ORDER',
      },
      priority: Notifications.AndroidNotificationPriority.MAX,
    },
    trigger: {
      channelId: 'urgent-driver-orders',
    },
  });
}

// ── 3. Target: Driver (When Order is Active/Pending) ───────────────────────
export async function triggerPendingOrderReminder() {
  if (Platform.OS === 'web') return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '⏳ تذكير: طلبية معلقة',
      body: 'لا تنسَ أن لديك طلبية قيد التوصيل حالياً. اضغط للعودة للتفاصيل.',
      sound: 'default',
      categoryIdentifier: 'ACTIVE_ORDER',
      data: {
        type: 'ACTIVE_ORDER',
      },
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: {
      channelId: 'urgent-driver-orders',
    },
  });
}

// ── Clear notification tray when the user comes back to the app ──────────────
export async function clearAllLocalNotifications() {
  if (Platform.OS === 'web') return;
  await Notifications.dismissAllNotificationsAsync();
  if (notifee) {
    await notifee.cancelAllNotifications();
  }
}

// ── Notifee: Full-Screen Order Channel Setup ──────────────────────────────────
// Call this once inside setupPushNotifications() on Android.
export async function setupNotifeeOrderChannel() {
  if (Platform.OS !== 'android' || !notifee) return;
  await notifee.createChannel({
    id: 'incoming-order-fullscreen',
    name: 'طلبية جديدة (شاشة كاملة)',
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC, // Visible on locked screen
    vibration: true,
    vibrationPattern: [0, 800, 400, 800, 400, 800, 400], // Strong, continuous-feeling vibration
    sound: 'alert',  // → android/app/src/main/res/raw/alert.mp3
  });
}

// ── Notifee: Trigger Full-Screen Incoming Order Notification ─────────────────
// AndroidCategory.CALL = highest OS priority — bypasses DND & lock screen.
// fullScreenAction opens the app's main Activity, expo-router then routes
// to /(driver)/incoming-order via the notification data.
export async function triggerFullScreenOrderNotification(params?: {
  orderId?: string;
  customerName?: string;
  price?: string;
  address?: string;
  distance?: string;
  rating?: string;
  orderType?: string;
}) {
  const p = params ?? {};
  
  // Package the entire order payload into a string so the UI can parse it easily
  const orderPayload = {
    orderId:      p.orderId      ?? '',
    customerName: p.customerName ?? 'زبون جديد',
    price:        p.price        ?? '2500',
    address:      p.address      ?? 'الجزائر العاصمة',
    distance:     p.distance     ?? '2.5 كم',
    rating:       p.rating       ?? '4.8',
    orderType:    p.orderType    ?? 'spring_water',
  };

  if (!notifee) {
    console.warn('Notifee not available, skipping full-screen notification');
    return;
  }

  await notifee.displayNotification({
    id: 'incoming-order',
    title: '<b>🚨 طلبية مياه جديدة! 💧</b>',
    body: `${orderPayload.customerName} — ${orderPayload.distance} — ${orderPayload.price} د.ج\nقم بفتح التطبيق لرؤية التفاصيل`,
    data: {
      type:    'INCOMING_ORDER_FULLSCREEN',
      payload: JSON.stringify(orderPayload),
    },
    android: {
      channelId:  'incoming-order-fullscreen',
      importance: AndroidImportance.HIGH,
      category:   AndroidCategory.CALL,        // Highest OS priority
      visibility: AndroidVisibility.PUBLIC,
      ongoing:    true,                        // Prevents the user from swiping it away natively
      autoCancel: false,

      // ── Full-Screen Intent: wakes device, shows over other apps ───────────
      fullScreenAction: {
        id:             'incoming_order_screen',
        launchActivity: 'default',             // Opens MainActivity → expo-router
      },

      // ── Tray Action Buttons (fallback if device shows tray instead) ───────
      actions: [
        {
          title:       '✅ قبول',
          pressAction: { id: 'accept', launchActivity: 'default' },
        },
        {
          title:       '❌ رفض',
          pressAction: { id: 'decline' },
        },
      ],

      pressAction: { id: 'default', launchActivity: 'default' },
    },
  });
}
