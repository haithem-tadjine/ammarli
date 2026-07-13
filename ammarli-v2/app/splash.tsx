import React, { useEffect, useRef } from 'react';
import ScreenContainer from '../components/ScreenContainer';
import { View, StyleSheet } from 'react-native';
import { useRouter, useRootNavigationState } from 'expo-router';
import { useAuthStore } from '../src/store/useAuthStore';
import { applyStoredRTL } from '../src/shared/localization/i18n';

const NAVY_DARK = '#001E3C';

export default function SplashScreen() {
  const router = useRouter();
  const hydrate = useAuthStore((s) => s.hydrate);
  const rootNavState = useRootNavigationState();
  const pendingRoute = useRef<string | null>(null);

  useEffect(() => {
    const route = pendingRoute.current;
    if (rootNavState?.key && route) {
      pendingRoute.current = null;
      router.replace(route as any);
    }
  }, [rootNavState?.key]);

  useEffect(() => {
    const init = async () => {
      // Apply RTL early
      await applyStoredRTL();

      // Hydrate auth state
      const role = await hydrate();

      // Determine target route
      const target = !role
        ? '/role-selection'
        : role === 'CLIENT'
          ? '/(customer)/(tabs)'
          : role === 'DRIVER'
            ? '/(driver)/(tabs)'
            : '/role-selection'; // ADMIN or unknown → let them choose

      // If navigator is already mounted → navigate immediately.
      if (rootNavState?.key) {
        router.replace(target as any);
      } else {
        pendingRoute.current = target;
      }
    };

    init();
  }, []);

  return (
    <ScreenContainer style={styles.container} />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NAVY_DARK,
  },
});
