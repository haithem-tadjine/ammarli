import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

const BAR_HEIGHT = 32;

// Dynamic import to avoid TS module error if types aren't installed
let NetInfo: any = null;
try {
  NetInfo = require('@react-native-community/netinfo').default;
} catch {
  // NetInfo not available — OfflineBar will remain hidden
}

const OfflineBar = () => {
  const [isOffline, setIsOffline] = useState(false);
  const [visible, setVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const heightAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!NetInfo) return;

    const unsubscribe = NetInfo.addEventListener((state: { isConnected: boolean | null; isInternetReachable: boolean | null }) => {
      const offline = !(state.isConnected && state.isInternetReachable !== false);

      if (offline) setVisible(true);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: offline ? 1 : 0,
          duration: 350,
          useNativeDriver: false,
        }),
        Animated.timing(heightAnim, {
          toValue: offline ? BAR_HEIGHT : 0,
          duration: 350,
          useNativeDriver: false,
        }),
      ]).start(({ finished }) => {
        if (finished && !offline) setVisible(false);
      });

      setIsOffline(offline);
    });

    return () => unsubscribe();
  }, [fadeAnim, heightAnim]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.bar, { opacity: fadeAnim, height: heightAnim }]}>
      <Text style={styles.icon}>⚠</Text>
      <Text style={styles.text}>لا يوجد اتصال بالإنترنت</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  bar: {
    width: '100%',
    backgroundColor: '#B91C1C',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 9999,
    elevation: 20,
  },
  icon: {
    color: '#FFF',
    fontSize: 13,
    marginLeft: 8,
  },
  text: {
    color: '#FFF',
    fontFamily: 'Cairo-Bold',
    fontSize: 13,
    textAlign: 'center',
  },
});

export default OfflineBar;
