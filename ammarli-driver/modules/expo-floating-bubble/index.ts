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
