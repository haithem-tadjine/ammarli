import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Dimensions, Platform, KeyboardAvoidingView,
  Animated, StatusBar, ActivityIndicator
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { useCustomerStore } from '../../src/store/useCustomerStore';
import * as Haptics from 'expo-haptics';
import ScreenContainer, { MIN_BOTTOM_INSET } from '../../components/ScreenContainer';
import MapView, { Marker } from '../../components/Map';

const { width } = Dimensions.get('window');

const NAVY   = '#012047';
const YELLOW = '#F3CD0D';
const WHITE  = '#FFFFFF';
const BG     = '#F4F7FA'; // Softer background

const SIZES = [
  { key: '5L',  label: 'عبوة 5 لتر',  sub: 'قارورة واحدة', image: require('../../assets/images/bottled_icon.png') },
  { key: '1.5L', label: 'عبوة 1.5 لتر', sub: 'فاردو 6 قوارير', image: require('../../assets/images/bottled_icon.png') },
  { key: '0.5L', label: 'عبوة 0.5 لتر', sub: 'فاردو 12 قارورة', image: require('../../assets/images/bottled_icon.png') },
];

export default function OrderDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const shakeAnim = React.useRef(new Animated.Value(0)).current;

  const triggerShake = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const [cart, setCart] = useState<Record<string, number>>({
    '5L': 0, '1.5L': 0, '0.5L': 0
  });

  const totalQuantity = useMemo(() => {
    return Object.values(cart).reduce((s, v) => s + v, 0);
  }, [cart]);

  const updateQuantity = useCallback((size: string, delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCart(prev => ({
      ...prev,
      [size]: Math.max(0, (prev[size] || 0) + delta),
    }));
  }, []);

  const createOrder  = useCustomerStore(s => s.createOrder);
  const userLocation = useCustomerStore(s => s.userLocation);
  const draftOrder   = useCustomerStore(s => s.draftOrder);
  const [isLoading, setIsLoading] = useState(false);

  const handleOrderNow = async () => {
    if (totalQuantity === 0) { Alert.alert('تنبيه', 'أضف منتجاً واحداً على الأقل'); return; }
    if (!draftOrder.location) { triggerShake(); Alert.alert('تنبيه', 'يرجى تحديد موقع التوصيل أولاً'); return; }
    const items: any[] = [];
    Object.keys(cart).forEach(size => {
      if (cart[size] > 0) items.push({ size, qty: cart[size] });
    });
    try {
      useCustomerStore.setState({
        activeOrder: {
          id: `local-${Date.now()}`,
          type: 'Bottled',
          status: 'created',
          location: draftOrder.location,
          locationName: draftOrder.location.address || 'موقع التوصيل',
          items,
        }
      });
      router.push('/(customer)/searching-driver');
    } catch {
    }
  };

  const handleSchedule = () => {
    if (totalQuantity === 0) return;
    if (!draftOrder.location) { triggerShake(); Alert.alert('تنبيه', 'يرجى تحديد موقع التوصيل أولاً'); return; }
    const title = 'مياه معبأة · ' + totalQuantity + ' وحدة';
    router.push({ pathname: '/(customer)/schedule-order', params: { orderTitle: title, isTanker: 'false' } });
  };

  return (
    <ScreenContainer edges={['top']} backgroundColor={NAVY} statusBarStyle="light-content" statusBarColor={NAVY}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={WHITE} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerIconWrap}>
            <Image source={require('../../assets/images/bottled_icon.png')} style={{ width: 20, height: 20, tintColor: WHITE }} resizeMode="contain" />
          </View>
          <Text style={styles.headerTitle}>مياه معبأة</Text>
        </View>
        {/* Cart badge */}
        <View style={styles.cartBadgeWrap}>
          <Ionicons name="cart-outline" size={24} color={WHITE} />
          {totalQuantity > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{totalQuantity}</Text>
            </View>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        behavior="padding"
        style={{ flex: 1, backgroundColor: BG }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : (StatusBar.currentHeight || 24) + 20}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Map / Location ────────────────────────────────────────────── */}
          <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
            <TouchableOpacity style={styles.mapBox} activeOpacity={0.9} onPress={() => router.push('/(customer)/location-picker')}>
              {Platform.OS === 'web' ? (
                <Image source={{ uri: 'https://placehold.co/600x200/EAECEE/002147?font=roboto&text=Map+Preview' }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
              ) : (
                <MapView
                  style={StyleSheet.absoluteFillObject}
                  initialRegion={{
                    latitude:  draftOrder.location?.latitude  || userLocation?.latitude  || 35.5557,
                    longitude: draftOrder.location?.longitude || userLocation?.longitude || 6.1748,
                    latitudeDelta: 0.01, longitudeDelta: 0.01,
                  }}
                  scrollEnabled={false} zoomEnabled={false}
                >
                  <Marker coordinate={{ latitude: draftOrder.location?.latitude || userLocation?.latitude || 35.5557, longitude: draftOrder.location?.longitude || userLocation?.longitude || 6.1748 }} />
                </MapView>
              )}
              <View style={styles.mapGradient} pointerEvents="none" />
              <View style={styles.mapPin} pointerEvents="none">
                <Ionicons name="location" size={36} color={YELLOW} />
              </View>
            </TouchableOpacity>

            {/* Location strip */}
            <View style={styles.locationStrip}>
              <View style={styles.locationLeft}>
                <View style={[styles.locationDot, { backgroundColor: YELLOW }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.locationLabel}>{draftOrder.location ? 'موقع التوصيل' : 'حدد موقع التوصيل'}</Text>
                  <Text style={styles.locationAddr} numberOfLines={1}>{draftOrder.location?.address || 'اضغط على الخريطة لاختيار موقعك'}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.changeLocBtn} onPress={() => router.push('/(customer)/location-picker')}>
                <Text style={styles.changeLocText}>تغيير</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* ── Size/Quantity Selection ───────────────────────────────────── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>اختر الأحجام والكميات</Text>
            <Text style={styles.sectionSubtitle}>حدد الكمية التي تحتاجها من كل نوع</Text>
          </View>

          <View style={styles.cardsContainer}>
            {SIZES.map((sz) => {
              const qty = cart[sz.key] || 0;
              const isActive = qty > 0;
              return (
                <View key={sz.key} style={[styles.premiumCard, isActive && styles.premiumCardActive]}>
                  <View style={styles.cardIconContainer}>
                    <View style={[styles.iconCircle, isActive ? { backgroundColor: YELLOW + '30' } : { backgroundColor: '#F1F5F9' }]}>
                      <Image 
                        source={sz.image} 
                        style={{ width: 32, height: 32, opacity: isActive ? 1 : 0.6 }} 
                        resizeMode="contain" 
                      />
                    </View>
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={[styles.cardTitleText, isActive && { color: NAVY }]}>{sz.label}</Text>
                    <Text style={styles.cardSubText}>{sz.sub}</Text>
                  </View>
                  <View style={styles.stepperContainer}>
                    <TouchableOpacity
                      style={[styles.stepperBtn, qty === 0 && { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}
                      onPress={() => updateQuantity(sz.key, -1)}
                      disabled={qty === 0}
                    >
                      <Feather name="minus" size={18} color={qty === 0 ? '#CBD5E1' : NAVY} />
                    </TouchableOpacity>
                    <View style={styles.qtyBox}>
                      <Text style={[styles.qtyText, isActive && { color: NAVY }]}>{qty}</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.stepperBtn, { backgroundColor: NAVY, borderColor: NAVY }]}
                      onPress={() => updateQuantity(sz.key, 1)}
                    >
                      <Feather name="plus" size={18} color={WHITE} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>

          {/* ── Cart Summary ─────────────────────────────────────────────── */}
          {totalQuantity > 0 && (
            <Animated.View style={styles.summaryContainer}>
              <View style={styles.summaryHeader}>
                <Ionicons name="receipt-outline" size={20} color={NAVY} />
                <Text style={styles.summaryTitle}>ملخص الطلب</Text>
              </View>
              <View style={styles.summaryChipsContainer}>
                {SIZES.map(sz => {
                  const qty = cart[sz.key] || 0;
                  if (!qty) return null;
                  return (
                    <View key={sz.key} style={styles.summaryChip}>
                      <Text style={styles.summaryChipText}>{sz.key} × {qty}</Text>
                    </View>
                  );
                })}
              </View>
            </Animated.View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, MIN_BOTTOM_INSET) + 12 }]}>
        <TouchableOpacity
          style={styles.scheduleBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleSchedule(); }}
        >
          <Ionicons name="calendar-outline" size={20} color={NAVY} />
          <Text style={styles.scheduleBtnText}>جدولة</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.orderBtn, (totalQuantity === 0 || isLoading) && { opacity: 0.45 }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); handleOrderNow(); }}
          disabled={totalQuantity === 0 || isLoading}
        >
          <Text style={styles.orderBtnText}>تأكيد الطلب</Text>
          {isLoading ? <ActivityIndicator size="small" color={NAVY} /> : <Ionicons name="arrow-back" size={20} color={NAVY} />}
        </TouchableOpacity>
      </View>

    </ScreenContainer>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({

  header: {
    height: 64, backgroundColor: NAVY,
    flexDirection: 'row-reverse', alignItems: 'center',
    paddingHorizontal: 16, gap: 0,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 10 },
  headerIconWrap: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'Cairo-Bold', color: WHITE },
  cartBadgeWrap: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  cartBadge: { position: 'absolute', top: 2, right: 2, backgroundColor: YELLOW, width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  cartBadgeText: { fontSize: 9, fontFamily: 'Cairo-Bold', color: NAVY },

  mapBox: { height: 180, backgroundColor: '#CBD5E1', overflow: 'hidden' },
  mapGradient: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(1,32,71,0.1)' },
  mapPin: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  locationStrip: {
    backgroundColor: WHITE, flexDirection: 'row-reverse',
    alignItems: 'center', paddingHorizontal: 18, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 12,
  },
  locationLeft: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  locationDot: { width: 10, height: 10, borderRadius: 5 },
  locationLabel: { fontSize: 13, fontFamily: 'Cairo-Bold', color: NAVY },
  locationAddr: { fontSize: 12, fontFamily: 'Cairo-Regular', color: '#64748B', marginTop: 2 },
  changeLocBtn: { borderWidth: 1.5, borderColor: NAVY, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  changeLocText: { fontSize: 13, fontFamily: 'Cairo-Bold', color: NAVY },

  sectionHeader: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 },
  sectionTitle: { fontSize: 18, fontFamily: 'Cairo-Bold', color: '#1E293B', textAlign: 'right' },
  sectionSubtitle: { fontSize: 13, fontFamily: 'Cairo-Regular', color: '#64748B', textAlign: 'right', marginTop: 2 },

  cardsContainer: { paddingHorizontal: 16, gap: 12 },
  premiumCard: {
    backgroundColor: WHITE,
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04, shadowRadius: 12, elevation: 2,
  },
  premiumCardActive: {
    borderColor: YELLOW,
    backgroundColor: '#FFFAED', // Very subtle yellow tint
  },
  cardIconContainer: { marginLeft: 16 },
  iconCircle: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  cardContent: { flex: 1, alignItems: 'flex-end', justifyContent: 'center' },
  cardTitleText: { fontSize: 16, fontFamily: 'Cairo-Bold', color: '#334155', marginBottom: 4 },
  cardSubText: { fontSize: 12, fontFamily: 'Cairo-SemiBold', color: '#94A3B8' },
  
  stepperContainer: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 20, padding: 4, marginRight: 12 },
  stepperBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: WHITE, borderWidth: 1, borderColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  qtyBox: { minWidth: 32, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontSize: 16, fontFamily: 'Cairo-Bold', color: '#64748B' },

  summaryContainer: {
    marginHorizontal: 16, marginTop: 20, marginBottom: 8,
    backgroundColor: WHITE, borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  summaryHeader: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 12, gap: 8 },
  summaryTitle: { fontSize: 15, fontFamily: 'Cairo-Bold', color: NAVY },
  summaryChipsContainer: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-start' },
  summaryChip: { backgroundColor: NAVY + '0F', borderWidth: 1, borderColor: NAVY + '20', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  summaryChipText: { fontSize: 13, fontFamily: 'Cairo-Bold', color: NAVY },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: WHITE, paddingHorizontal: 20, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
    flexDirection: 'row-reverse', gap: 12, zIndex: 100,
    shadowColor: '#000', shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 10,
  },
  scheduleBtn: {
    flex: 1, height: 56, borderRadius: 16, borderWidth: 1.5, borderColor: NAVY,
    justifyContent: 'center', alignItems: 'center',
    flexDirection: 'row-reverse', gap: 8, backgroundColor: '#F8FAFC',
  },
  scheduleBtnText: { fontSize: 15, fontFamily: 'Cairo-Bold', color: NAVY },
  orderBtn: {
    flex: 2, height: 56, borderRadius: 16, backgroundColor: YELLOW,
    justifyContent: 'center', alignItems: 'center',
    flexDirection: 'row-reverse', gap: 8,
    shadowColor: YELLOW, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },
  orderBtnText: { fontSize: 17, fontFamily: 'Cairo-Bold', color: NAVY },
});
