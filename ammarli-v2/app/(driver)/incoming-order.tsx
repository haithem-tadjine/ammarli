/**
 * ─── Incoming Order Screen ───────────────────────────────────────────────────
 * Triggered by Notifee fullScreenAction when a new order arrives.
 * Displays over other apps / lock screen on Android.
 *
 * Features:
 *  - 20-second countdown → auto-decline on expiry
 *  - Looping sound + vibration via useDriverAlert
 *  - Premium dark glassmorphism UI
 *  - Accept routes to order-acceptance, Decline routes to tabs
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import notifee from '@notifee/react-native';
import { useDriverStore } from '../../src/store/useDriverStore';
import { useDriverAlert } from '../../src/hooks/useDriverAlert';

const { width, height } = Dimensions.get('window');

const COUNTDOWN_SECONDS = 20;

const COLORS = {
  bg:           '#0B0E14',       // Deep obsidian
  surface:      '#141820',       // Card surface
  border:       'rgba(255,255,255,0.08)',
  accent:       '#00FF94',       // Neon green
  accentGlow:   'rgba(0,255,148,0.25)',
  accentDim:    'rgba(0,255,148,0.12)',
  danger:       '#EF4444',
  dangerDim:    'rgba(239,68,68,0.15)',
  dangerBorder: 'rgba(239,68,68,0.4)',
  blue:         '#3B82F6',
  yellow:       '#FFCC00',
  white:        '#FFFFFF',
  textPrimary:  '#F1F5F9',
  textSecondary:'#94A3B8',
  timerCritical:'#F97316',       // Orange when ≤ 5 s
};

export default function IncomingOrderScreen() {
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const params  = useLocalSearchParams<{
    customerName?: string;
    price?:        string;
    address?:      string;
    distance?:     string;
    rating?:       string;
    orderType?:    string;
  }>();

  const setDriverBusy = useDriverStore(s => s.setDriverBusy);
  const acceptDriverOrder = useDriverStore(s => s.acceptDriverOrder);
  const activeDriverOrder = useDriverStore(s => s.activeDriverOrder);

  const customerName = params.customerName ?? 'زبون جديد';
  const price        = params.price        ?? '2500';
  const distance     = params.distance     ?? '2.5 كم';
  const rating       = params.rating       ?? '4.8';
  const orderType    = params.orderType    ?? 'spring_water';

  // ── State ─────────────────────────────────────────────────────────────────
  const [seconds,   setSeconds]   = useState(COUNTDOWN_SECONDS);
  const [dismissed, setDismissed] = useState(false);

  // ── Sound + Vibration ─────────────────────────────────────────────────────
  // Plays looping alert sound and repeating vibration until dismissed
  useDriverAlert(!dismissed);

  // ── Pulse animation for the accept button glow ───────────────────────────
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.00, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // ── Countdown timer ───────────────────────────────────────────────────────
  useEffect(() => {
    if (dismissed) return;
    if (seconds <= 0) {
      handleDecline();
      return;
    }
    const t = setTimeout(() => setSeconds(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, dismissed]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const dismiss = async () => {
    setDismissed(true);
    await notifee.cancelAllNotifications();
  };

  const handleAccept = async () => {
    await dismiss();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    if (activeDriverOrder) {
      try {
        await acceptDriverOrder(activeDriverOrder);
      } catch (error) {
        console.error('Lock failed', error);
        return; // Don't proceed if locking failed
      }
    }
    
    // ── Fast Accept Logic ──
    const registeredDriver = useDriverStore.getState().registeredDriver;
    const driverTypeRaw = registeredDriver?.driverType?.toLowerCase() || '';
    const waterTypeRaw = registeredDriver?.waterType?.toLowerCase() || '';
    const isSpringTanker = driverTypeRaw === 'tanker' && (waterTypeRaw === 'spring' || waterTypeRaw.includes('ينابيع'));
    const isBottled = driverTypeRaw === 'bottled';
    const hasDefaultPrice = registeredDriver?.defaultPrice ? registeredDriver.defaultPrice > 0 : false;
    const hasBottledPrices = !!registeredDriver?.bottledPrices
      && Object.values(registeredDriver.bottledPrices).every((v: any) => v > 0);

    const isRetail = isSpringTanker || isBottled;
    if (!isRetail) {
      setDriverBusy(true);
    }

    const orderItems = activeDriverOrder?.items?.map((item: any, idx: number) => ({
      id: idx,
      name: item.description,
      qty: item.qty || 1,
      unit: item.detail,
      price: item.unitPrice || item.price,
      image: null
    })) || [
      { id: 1, name: 'مياه', qty: 1, unit: 'طلبية', price, image: 'https://img.icons8.com/3d-fluency/94/water-bottle.png' }
    ];

    const navParams: any = {
      orderId: activeDriverOrder?.orderId || '',
      customerName,
      customerPhone: activeDriverOrder?.customer?.phone || '',
      customerLat: activeDriverOrder?.deliveryAddress?.lat?.toString() || '',
      customerLng: activeDriverOrder?.deliveryAddress?.lng?.toString() || '',
      price: activeDriverOrder?.total?.toString() || price,
      address: params.address ?? activeDriverOrder?.deliveryAddress?.label ?? 'الجزائر العاصمة',
      orderType,
      distance,
      rating,
      capacity: activeDriverOrder?.items?.[0]?.detail?.replace(/\D/g, '') || '1000',
      floor: activeDriverOrder?.items?.[0]?.floor || 'غير محدد',
      items: JSON.stringify(orderItems),
    };

    if (isSpringTanker) {
      const driverDefaultPrice = (registeredDriver?.defaultPrice && registeredDriver.defaultPrice > 0) ? registeredDriver.defaultPrice : 150;
      const requestedLiters = parseFloat(navParams.capacity) || 1000;
      const calculatedTotal = (requestedLiters / 20) * driverDefaultPrice;
      if (calculatedTotal > 0) {
        await useDriverStore.getState().updateDriverOrderStatus('driving', calculatedTotal, activeDriverOrder?.orderId);
        navParams.price = calculatedTotal.toString();
        router.replace({ pathname: '/(driver)/order-details' as any, params: navParams });
        return;
      }
    }

    if (isBottled) {
      const defaultBottledPrices = { '0.5L': 15, '1.5L': 30, '5L': 100 };
      const driverBottledPrices = registeredDriver?.bottledPrices ? registeredDriver.bottledPrices : defaultBottledPrices;
      const prices = driverBottledPrices;
      const calculatedTotal = orderItems.reduce((sum: number, item: any) => {
        const size = item.unit as '0.5L' | '1.5L' | '5L';
        const unitPrice = (prices as any)[size] ?? 0;
        return sum + (item.qty * unitPrice);
      }, 0);
      if (calculatedTotal > 0) {
        await useDriverStore.getState().updateDriverOrderStatus('driving', calculatedTotal, activeDriverOrder?.orderId);
        navParams.price = calculatedTotal.toString();
        router.replace({ pathname: '/(driver)/order-details' as any, params: navParams });
        return;
      }
    }

    // ── Fallback: Route to order-acceptance ──
    router.replace({
      pathname: '/(driver)/order-acceptance' as any,
      params: navParams,
    });
  };

  const handleDecline = async () => {
    await dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (activeDriverOrder?.orderId) {
      try {
        await useDriverStore.getState().rejectDriverOrder(activeDriverOrder.orderId);
      } catch (e) {
        console.error('Failed to reject order', e);
      }
    }
    
    router.replace('/(driver)/(tabs)' as any);
  };

  // ── Timer color ───────────────────────────────────────────────────────────
  const timerColor = seconds <= 5 ? COLORS.timerCritical : COLORS.accent;
  const timerPct   = (seconds / COUNTDOWN_SECONDS) * 100;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* ── Deep gradient background ── */}
      <LinearGradient
        colors={['#0B0E14', '#0F1520', '#0B0E14']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* ── Glow orb behind accept button ── */}
      <View style={styles.glowOrb} pointerEvents="none" />

      <View style={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20 }]}>

        {/* ── TOP: Timer strip ── */}
        <View style={styles.timerStrip}>
          <View style={styles.timerTrack}>
            <View style={[styles.timerFill, { width: `${timerPct}%` as any, backgroundColor: timerColor }]} />
          </View>
          <View style={styles.timerRow}>
            <MaterialCommunityIcons name="timer-outline" size={16} color={timerColor} />
            <Text style={[styles.timerLabel, { color: timerColor }]}>
              {seconds} ث
            </Text>
            <Text style={styles.timerHint}>— سينتهي العرض تلقائياً</Text>
          </View>
        </View>

        {/* ── HEADER: Order type badge ── */}
        <View style={styles.headerRow}>
          <View style={styles.orderTypeBadge}>
            <MaterialCommunityIcons name="water" size={14} color={COLORS.blue} />
            <Text style={styles.orderTypeBadgeText}>{getOrderLabel(orderType)}</Text>
          </View>
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>⭐ {rating}</Text>
          </View>
        </View>

        {/* ── HERO: Price + Distance ── */}
        <View style={styles.heroCard}>
          <LinearGradient
            colors={['rgba(0,255,148,0.07)', 'rgba(0,255,148,0.02)']}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.heroRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroValue}>{Number(price).toLocaleString('ar-DZ')}</Text>
              <Text style={styles.heroUnit}>د.ج</Text>
              <Text style={styles.heroLabel}>السعر المتوقع</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroValue}>{distance.replace(' كم', '')}</Text>
              <Text style={styles.heroUnit}>كم</Text>
              <Text style={styles.heroLabel}>المسافة</Text>
            </View>
          </View>
        </View>

        {/* ── CUSTOMER CARD ── */}
        <View style={styles.customerCard}>
          <View style={styles.customerLeft}>
            <View style={styles.avatarCircle}>
              <MaterialCommunityIcons name="account" size={26} color={COLORS.blue} />
            </View>
            <View>
              <Text style={styles.customerLabel}>الزبون</Text>
              <Text style={styles.customerName}>{customerName}</Text>
            </View>
          </View>
          <View style={styles.waterDropBadge}>
            <MaterialCommunityIcons name="water" size={22} color={COLORS.blue} />
          </View>
        </View>

        {/* ── Spacer ── */}
        <View style={{ flex: 1 }} />

        {/* ── ACTION BUTTONS ── */}

        {/* Accept — massive glowing green */}
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={styles.acceptBtn}
            activeOpacity={0.85}
            onPress={handleAccept}
          >
            <LinearGradient
              colors={['#00FF94', '#00D67A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.acceptGradient}
            >
              <Ionicons name="checkmark-circle" size={28} color="#001E3C" />
              <Text style={styles.acceptText}>قبول الطلبية</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Decline — minimal dark-red outline */}
        <TouchableOpacity
          style={styles.declineBtn}
          activeOpacity={0.75}
          onPress={handleDecline}
        >
          <Ionicons name="close-circle-outline" size={20} color={COLORS.danger} />
          <Text style={styles.declineText}>رفض</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function getOrderLabel(type: string): string {
  switch (type) {
    case 'bottles':            return 'قوارير معبأة';
    case 'well_water':         return 'مياه آبار';
    case 'construction_water': return 'مياه بناء';
    default:                   return 'مياه ينابيع';
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  glowOrb: {
    position:     'absolute',
    bottom:       -80,
    alignSelf:    'center',
    width:        width * 1.2,
    height:       width * 1.2,
    borderRadius: width * 0.6,
    backgroundColor: COLORS.accentDim,
    // Blur effect via large shadow on Android
    shadowColor:  COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 120,
    elevation:    0,
  },

  container: {
    flex: 1,
    paddingHorizontal: 24,
  },

  // ── Timer ──
  timerStrip: {
    marginBottom: 24,
  },
  timerTrack: {
    height:          4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius:    2,
    overflow:        'hidden',
    marginBottom:    10,
  },
  timerFill: {
    height:       '100%',
    borderRadius: 2,
  },
  timerRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'flex-end',
    gap:            6,
  },
  timerLabel: {
    fontSize:   15,
    fontFamily: 'Cairo-Bold',
  },
  timerHint: {
    fontSize:   12,
    color:      COLORS.textSecondary,
    fontFamily: 'Cairo-SemiBold',
  },

  // ── Header row ──
  headerRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   20,
  },
  orderTypeBadge: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             6,
    backgroundColor: 'rgba(59,130,246,0.15)',
    paddingHorizontal: 12,
    paddingVertical:   6,
    borderRadius:    20,
    borderWidth:     1,
    borderColor:     'rgba(59,130,246,0.25)',
  },
  orderTypeBadgeText: {
    color:      COLORS.blue,
    fontSize:   13,
    fontFamily: 'Cairo-Bold',
  },
  ratingBadge: {
    backgroundColor: 'rgba(255,204,0,0.12)',
    paddingHorizontal: 12,
    paddingVertical:   6,
    borderRadius:    20,
    borderWidth:     1,
    borderColor:     'rgba(255,204,0,0.2)',
  },
  ratingText: {
    color:      COLORS.yellow,
    fontSize:   13,
    fontFamily: 'Cairo-Bold',
  },

  // ── Hero card ──
  heroCard: {
    borderRadius:    28,
    borderWidth:     1,
    borderColor:     COLORS.border,
    overflow:        'hidden',
    paddingVertical: 32,
    paddingHorizontal: 24,
    marginBottom:    20,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  heroRow: {
    flexDirection:  'row',
    justifyContent: 'space-around',
    alignItems:     'center',
  },
  heroStat: {
    alignItems: 'center',
    gap:        4,
  },
  heroValue: {
    fontSize:   48,
    color:      COLORS.white,
    fontFamily: 'Cairo-Bold',
    lineHeight: 56,
  },
  heroUnit: {
    fontSize:   18,
    color:      COLORS.textSecondary,
    fontFamily: 'Cairo-SemiBold',
    marginTop:  -4,
  },
  heroLabel: {
    fontSize:   13,
    color:      COLORS.textSecondary,
    fontFamily: 'Cairo-SemiBold',
    marginTop:  6,
  },
  heroDivider: {
    width:           1,
    height:          80,
    backgroundColor: COLORS.border,
  },

  // ── Customer card ──
  customerCard: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    backgroundColor:   'rgba(255,255,255,0.04)',
    borderRadius:      20,
    borderWidth:       1,
    borderColor:       COLORS.border,
    paddingHorizontal: 20,
    paddingVertical:   16,
    marginBottom:      12,
  },
  customerLeft: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           14,
  },
  avatarCircle: {
    width:           52,
    height:          52,
    borderRadius:    26,
    backgroundColor: 'rgba(59,130,246,0.12)',
    borderWidth:     1,
    borderColor:     'rgba(59,130,246,0.25)',
    justifyContent:  'center',
    alignItems:      'center',
  },
  customerLabel: {
    fontSize:   12,
    color:      COLORS.textSecondary,
    fontFamily: 'Cairo-SemiBold',
  },
  customerName: {
    fontSize:   18,
    color:      COLORS.textPrimary,
    fontFamily: 'Cairo-Bold',
  },
  waterDropBadge: {
    width:           44,
    height:          44,
    borderRadius:    22,
    backgroundColor: 'rgba(59,130,246,0.12)',
    borderWidth:     1,
    borderColor:     'rgba(59,130,246,0.2)',
    justifyContent:  'center',
    alignItems:      'center',
  },

  // ── Accept button ──
  acceptBtn: {
    borderRadius: 22,
    overflow:     'hidden',
    marginBottom: 14,
    // Glow shadow
    shadowColor:  COLORS.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation:    14,
  },
  acceptGradient: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            12,
    height:         72,
    borderRadius:   22,
  },
  acceptText: {
    fontSize:   22,
    color:      '#001E3C',
    fontFamily: 'Cairo-Bold',
  },

  // ── Decline button ──
  declineBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             8,
    height:          52,
    borderRadius:    16,
    borderWidth:     1.5,
    borderColor:     COLORS.dangerBorder,
    backgroundColor: COLORS.dangerDim,
  },
  declineText: {
    fontSize:   16,
    color:      COLORS.danger,
    fontFamily: 'Cairo-Bold',
  },
});
