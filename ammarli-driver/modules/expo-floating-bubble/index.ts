import { requireNativeModule } from 'expo-modules-core';

const ExpoFloatingBubble = requireNativeModule('ExpoFloatingBubble');

export function checkPermission(): boolean {
  return ExpoFloatingBubble.checkPermission();
}

export function requestPermission(): void {
  ExpoFloatingBubble.requestPermission();
}

export function enableBubble(enabled: boolean): void {
  ExpoFloatingBubble.enableBubble(enabled);
}

export function showBubble(): void {
  ExpoFloatingBubble.showBubble();
}

export function hideBubble(): void {
  ExpoFloatingBubble.hideBubble();
}

export function setBadge(count: number): void {
  ExpoFloatingBubble.setBadge(count);
}

export function showMessage(message: string): void {
  ExpoFloatingBubble.showMessage(message);
}

/**
 * showOrderCard — displays a native order-info card on top of any running app.
 *
 * Requires the FloatingBubbleService to be running (i.e. the driver app is in
 * the background) and the "Draw over other apps" permission to be granted.
 */
export function showOrderCard(params: {
  customerName: string;
  price: string;
  serviceType: string;
  address: string;
  distance: string;
  orderId: string;
  quantity?: string;
}): void {
  ExpoFloatingBubble.showOrderCard(params);
}

/**
 * hideOrderCard — programmatically dismisses the order card overlay.
 */
export function hideOrderCard(): void {
  ExpoFloatingBubble.hideOrderCard();
}

/**
 * showLockScreenCard — fires a Full-Screen Intent notification that wakes the
 * screen and shows LockScreenOrderActivity above the keyguard.
 * Use this when the screen is off / locked.
 */
export function showLockScreenCard(params: {
  customerName: string;
  price: string;
  serviceType: string;
  address: string;
  distance: string;
  orderId: string;
  quantity?: string;
}): void {
  ExpoFloatingBubble.showLockScreenCard(params);
}
