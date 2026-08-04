import ScreenContainer from '../../components/ScreenContainer';
import React, { useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity,
  Dimensions, Platform, Animated, Image, Alert
} from 'react-native';
import MapView, { Marker } from '../../components/Map';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCustomerStore } from '../../src/store/useCustomerStore';

const { width, height } = Dimensions.get('window');

const NAVY   = '#012047';
const YELLOW = '#F3CD0D';
const WHITE  = '#FFFFFF';

// Water type config
const TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  Bottled:  { label: 'مياه معبأة',    icon: 'bottle-soda-classic', color: '#0EA5E9' },
  Spring:   { label: 'مياه ينابيع',   icon: 'water',               color: '#0EA5E9' },
  Well:     { label: 'مياه آبار',     icon: 'water-pump',          color: '#7C3AED' },
  Ashghal:  { label: 'مياه أشغال',   icon: 'dump-truck',          color: '#EA580C' },
};

export default function SearchingDriverScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const activeOrder      = useCustomerStore(s => s.activeOrder);
  const userLocation     = useCustomerStore(s => s.userLocation);
  const cancelOrder      = useCustomerStore(s => s.cancelOrder);
  const createOrder      = useCustomerStore(s => s.createOrder);
  const activeOrderStatus = useCustomerStore(s => s.activeOrder?.status);
  const creatingRef      = useRef(false);

  const coordinates = activeOrder?.location || userLocation || { latitude: 35.5557, longitude: 6.1748 };
  const typeCfg     = TYPE_CONFIG[activeOrder?.type || 'Bottled'] ?? TYPE_CONFIG['Bottled'];
  const locationName = activeOrder?.locationName || userLocation?.address || 'موقع التوصيل';
  const quantity     = activeOrder?.quantity ? `${activeOrder.quantity} لتر` : '';

  // ── Pulse animations ─────────────────────────────────────────────────────────
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;
  const pulse3 = useRef(new Animated.Value(0)).current;
  const dotAnim = useRef(new Animated.Value(0)).current;
  const slideUp  = useRef(new Animated.Value(80)).current;
  const fadeIn   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Sheet slide up + fade in
    Animated.parallel([
      Animated.spring(slideUp, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
      Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    // Radar pulse rings
    const makePulse = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 0,    useNativeDriver: true }),
        ])
      );
    makePulse(pulse1, 0).start();
    makePulse(pulse2, 600).start();
    makePulse(pulse3, 1200).start();

    // Dots animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, { toValue: 3, duration: 900, useNativeDriver: false }),
        Animated.timing(dotAnim, { toValue: 0, duration: 0,   useNativeDriver: false }),
      ])
    ).start();

    // Fetch order state
    useCustomerStore.getState().fetchActiveOrder();
  }, []);

  // Navigation observer
  useEffect(() => {
    if (!activeOrderStatus) return;
    if (['accepted', 'picked_up', 'delivering'].includes(activeOrderStatus)) {
      setTimeout(() => router.replace('/(customer)/order-tracking'), 300);
    } else if (activeOrderStatus === 'arrived') {
      setTimeout(() => router.replace('/(customer)/driver-arrived'), 300);
    }
  }, [activeOrderStatus, router]);

  // Send order to backend
  useEffect(() => {
    if (activeOrder && typeof activeOrder.id === 'string' && activeOrder.id.startsWith('local-') && !creatingRef.current) {
      creatingRef.current = true;
      createOrder(activeOrder).catch(e => {
        creatingRef.current = false;
        Alert.alert('خطأ', 'تعذر إرسال الطلب: ' + (e?.response?.data?.message || e.message || 'خطأ غير معروف'),
          [{ text: 'حسناً', onPress: () => router.back() }]);
      });
    } else if (activeOrder?.status === 'cancelled' || activeOrder?.status === 'expired') {
      const msg = activeOrder.status === 'expired'
        ? 'عذراً، لا يوجد سائقون متاحون حالياً.'
        : 'تم إلغاء الطلب بنجاح.';
      useCustomerStore.getState().clearActiveOrderStore();
      router.replace('/(customer)/(tabs)' as any);
      setTimeout(() => Alert.alert('تنبيه', msg), 500);
    }
  }, [activeOrder, createOrder, router]);

  const handleCancel = () => {
    cancelOrder();
    router.replace('/(customer)/(tabs)');
  };

  // Pulse ring style factory
  const pulseRingStyle = (anim: Animated.Value, size: number) => ({
    width: size, height: size, borderRadius: size / 2,
    position: 'absolute' as const,
    borderWidth: 2,
    borderColor: NAVY,
    opacity: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.4, 0.15, 0] }),
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.8] }) }],
  });

  return (
    <ScreenContainer style={styles.root}>

      {/* ── Full-screen Map ─────────────────────────────────────────────── */}
      {Platform.OS === 'web' ? (
        <Image
          source={{ uri: 'https://placehold.co/800x800/EAECEE/002147?font=roboto&text=Map+Preview' }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
      ) : (
        <MapView
          style={StyleSheet.absoluteFillObject}
          initialRegion={{ ...coordinates, latitudeDelta: 0.018, longitudeDelta: 0.018 }}
        >
          <Marker coordinate={coordinates} title="موقعك" />
          <Marker coordinate={{ latitude: coordinates.latitude + 0.005, longitude: coordinates.longitude + 0.005 }} title="شاحنة 1" iconType="truck" />
          <Marker coordinate={{ latitude: coordinates.latitude - 0.006, longitude: coordinates.longitude - 0.003 }} title="شاحنة 2" iconType="truck" />
          <Marker coordinate={{ latitude: coordinates.latitude + 0.002, longitude: coordinates.longitude - 0.007 }} title="شاحنة 3" iconType="truck" />
        </MapView>
      )}

      {/* ── Top Location Bar ────────────────────────────────────────────── */}
      <Animated.View style={[styles.topBar, { top: insets.top + 12, opacity: fadeIn }]}>
        <View style={styles.locPill}>
          <Ionicons name="location" size={16} color={typeCfg.color} />
          <Text style={styles.locPillText} numberOfLines={1}>{locationName}</Text>
        </View>
      </Animated.View>

      {/* ── Bottom Sheet ────────────────────────────────────────────────── */}
      <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + 20, transform: [{ translateY: slideUp }], opacity: fadeIn }]}>

        {/* Drag handle */}
        <View style={styles.handle} />

        {/* Radar + Status */}
        <View style={styles.radarSection}>
          {/* Pulse rings */}
          <Animated.View style={pulseRingStyle(pulse1, 140)} />
          <Animated.View style={pulseRingStyle(pulse2, 140)} />
          <Animated.View style={pulseRingStyle(pulse3, 140)} />

          {/* Center icon */}
          <View style={styles.radarCenter}>
            <MaterialCommunityIcons name={typeCfg.icon as any} size={34} color={NAVY} />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.searchTitle}>جاري البحث عن أقرب سائق</Text>
        <View style={styles.dotsRow}>
          {[0, 1, 2].map(i => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                {
                  opacity: dotAnim.interpolate({
                    inputRange: [i, i + 0.9, i + 1],
                    outputRange: [0.25, 1, 0.25],
                    extrapolate: 'clamp',
                  }),
                  transform: [{
                    translateY: dotAnim.interpolate({
                      inputRange: [i, i + 0.5, i + 1],
                      outputRange: [0, -5, 0],
                      extrapolate: 'clamp',
                    }),
                  }],
                },
              ]}
            />
          ))}
        </View>

        {/* Order Info Card */}
        <View style={styles.orderCard}>
          <View style={[styles.orderIconWrap, { backgroundColor: typeCfg.color + '18' }]}>
            <MaterialCommunityIcons name={typeCfg.icon as any} size={24} color={typeCfg.color} />
          </View>
          <View style={styles.orderInfo}>
            <Text style={styles.orderType}>{typeCfg.label}</Text>
            {!!quantity && <Text style={styles.orderQty}>{quantity}</Text>}
          </View>
          <View style={styles.orderStatusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusBadgeText}>قيد البحث</Text>
          </View>
        </View>

        {/* Tips row */}
        <View style={styles.tipRow}>
          <Ionicons name="time-outline" size={14} color="#64748B" />
          <Text style={styles.tipText}>عادةً ما يستغرق البحث من 1 إلى 3 دقائق</Text>
        </View>

        {/* Cancel Button */}
        <TouchableOpacity style={styles.cancelBtn} activeOpacity={0.85} onPress={handleCancel}>
          <Text style={styles.cancelBtnText}>إلغاء الطلب</Text>
        </TouchableOpacity>

      </Animated.View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E8EEF5' },

  // Top bar
  topBar: {
    position: 'absolute',
    width: '100%',
    paddingHorizontal: 20,
    zIndex: 10,
    alignItems: 'center',
  },
  locPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: WHITE,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 30,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    maxWidth: width - 40,
  },
  locPillText: {
    fontSize: 14, fontFamily: 'Cairo-Bold', color: NAVY, flexShrink: 1,
  },

  // Bottom sheet
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: WHITE,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 25,
    zIndex: 20,
  },
  handle: {
    width: 38, height: 4,
    backgroundColor: '#DDE3EC',
    borderRadius: 2,
    alignSelf: 'center',
    marginVertical: 12,
  },

  // Radar
  radarSection: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 140,
    marginBottom: 12,
  },
  radarCenter: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: '#E0E7FF',
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },

  // Texts
  searchTitle: {
    fontSize: 20, fontFamily: 'Cairo-Bold',
    color: NAVY, textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row', justifyContent: 'center',
    gap: 6, marginTop: 8, marginBottom: 20,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: NAVY,
  },

  // Order card
  orderCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#F8FAFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8EEF8',
    gap: 14,
  },
  orderIconWrap: {
    width: 50, height: 50, borderRadius: 25,
    justifyContent: 'center', alignItems: 'center',
  },
  orderInfo: { flex: 1, alignItems: 'flex-end' },
  orderType: { fontSize: 16, fontFamily: 'Cairo-Bold', color: NAVY },
  orderQty:  { fontSize: 13, fontFamily: 'Cairo-Regular', color: '#64748B', marginTop: 3 },
  orderStatusBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#FFF8DC',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
  },
  statusDot: {
    width: 7, height: 7, borderRadius: 3.5,
    backgroundColor: '#F59E0B',
  },
  statusBadgeText: { fontSize: 11, fontFamily: 'Cairo-Bold', color: '#92400E' },

  // Tip
  tipRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6, marginBottom: 20,
  },
  tipText: { fontSize: 12, fontFamily: 'Cairo-Regular', color: '#64748B' },

  // Cancel btn
  cancelBtn: {
    backgroundColor: YELLOW,
    height: 58, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: YELLOW,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  cancelBtnText: { fontSize: 17, fontFamily: 'Cairo-Bold', color: NAVY },
});
