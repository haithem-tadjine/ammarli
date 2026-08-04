import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Dimensions, Platform, KeyboardAvoidingView,
  Animated, StatusBar
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
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
const BG     = '#F0F4F8';

const BRANDS = [
  { id: 'Guedila',   name: 'قديلا',      color: '#1A4C8A', logo: require('../../assets/images/brands/guedila.png')       },
  { id: 'Ifri',      name: 'إفري',       color: '#0A829D', logo: require('../../assets/images/brands/ifri.png')          },
  { id: 'Saida',     name: 'سعيدة',      color: '#E02020', logo: require('../../assets/images/brands/saida.png')         },
  { id: 'Lalla',     name: 'للا خديجة', color: '#27AE60', logo: require('../../assets/images/brands/lalla-khedidja.png') },
  { id: 'Mansourah', name: 'منصورة',     color: '#8E44AD', logo: require('../../assets/images/brands/mansourah.png')     },
  { id: 'Hayat',     name: 'حياة',       color: '#F39C12', logo: require('../../assets/images/brands/hayat.jpg')         },
  { id: 'Messerghine', name: 'مسرغين',  color: '#16A085', logo: require('../../assets/images/brands/messerghine.png')   },
  { id: 'Texanna',   name: 'تيكسانا',    color: '#2980B9', logo: require('../../assets/images/brands/texanna.png')       },
  { id: 'Toudja',    name: 'توجة',       color: '#C0392B', logo: require('../../assets/images/brands/toudja.png')        },
  { id: 'Youkous',   name: 'يوكوس',      color: '#34495E', logo: require('../../assets/images/brands/youkous.png')       },
];

const SIZES = [
  { key: '19L', label: 'عبوة 19 لتر', sub: 'غالون كبير', icon: 'bottle-wine' },
  { key: '5L',  label: 'عبوة 5 لتر',  sub: 'قارورة واحدة', icon: 'bottle-soda-classic' },
  { key: '1.5L', label: 'عبوة 1.5 لتر', sub: 'كرتون 6 قوارير', icon: 'bottle-soda' },
  { key: '0.5L', label: 'عبوة 0.5 لتر', sub: 'كرتون 12 قارورة', icon: 'bottle-soda-outline' },
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

  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [cart, setCart] = useState<Record<string, Record<string, number>>>(() => {
    const init: Record<string, Record<string, number>> = {};
    BRANDS.forEach(b => { init[b.id] = { '19L': 0, '5L': 0, '1.5L': 0, '0.5L': 0 }; });
    return init;
  });

  const totalQuantity = useMemo(() => {
    return Object.values(cart).reduce((sum, sizes) => sum + Object.values(sizes).reduce((s, v) => s + v, 0), 0);
  }, [cart]);

  const brandTotal = useCallback((id: string) =>
    Object.values(cart[id] || {}).reduce((s, v) => s + v, 0), [cart]);

  const updateQuantity = useCallback((size: string, delta: number) => {
    if (!selectedBrand) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCart(prev => ({
      ...prev,
      [selectedBrand]: {
        ...prev[selectedBrand],
        [size]: Math.max(0, (prev[selectedBrand][size] || 0) + delta),
      },
    }));
  }, [selectedBrand]);

  const activeBrand = BRANDS.find(b => b.id === selectedBrand);

  const createOrder  = useCustomerStore(s => s.createOrder);
  const userLocation = useCustomerStore(s => s.userLocation);
  const draftOrder   = useCustomerStore(s => s.draftOrder);

  const handleOrderNow = async () => {
    if (totalQuantity === 0) { Alert.alert('تنبيه', 'أضف منتجاً واحداً على الأقل'); return; }
    if (!draftOrder.location) { triggerShake(); Alert.alert('تنبيه', 'يرجى تحديد موقع التوصيل أولاً'); return; }
    const items: any[] = [];
    Object.keys(cart).forEach(brand => {
      Object.keys(cart[brand]).forEach(size => {
        if (cart[brand][size] > 0) items.push({ brand, size, qty: cart[brand][size] });
      });
    });
    try {
      await createOrder({ id: Math.floor(Math.random() * 100000), type: 'Bottled', status: 'searching', location: draftOrder.location, locationName: draftOrder.location.address || 'موقع التوصيل', items });
      router.push('/(customer)/searching-driver');
    } catch {}
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
            <MaterialCommunityIcons name="bottle-soda-classic" size={20} color={WHITE} />
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
          contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}
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

          {/* ── Brand Selection ───────────────────────────────────────────── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>اختر العلامة التجارية</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.brandScroll}>
            {BRANDS.map(brand => {
              const total = brandTotal(brand.id);
              const isActive = selectedBrand === brand.id;
              return (
                <TouchableOpacity
                  key={brand.id}
                  style={[styles.brandCard, isActive && { borderColor: brand.color, borderWidth: 2.5 }]}
                  onPress={() => setSelectedBrand(brand.id)}
                  activeOpacity={0.8}
                >
                  {total > 0 && (
                    <View style={[styles.brandBadge, { backgroundColor: brand.color }]}>
                      <Text style={styles.brandBadgeText}>{total}</Text>
                    </View>
                  )}
                  <View style={[styles.brandLogoCircle, { backgroundColor: brand.color + '18' }]}>
                    <Image source={brand.logo} style={{ width: 44, height: 44 }} resizeMode="contain" />
                  </View>
                  <Text style={[styles.brandName, isActive && { color: brand.color }]}>{brand.name}</Text>
                  {isActive && <View style={[styles.brandActiveDot, { backgroundColor: brand.color }]} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* ── Size/Quantity Selection ───────────────────────────────────── */}
          {selectedBrand ? (
            <View style={[styles.card, { marginTop: 8 }]}>
              {/* Brand header */}
              <View style={styles.sizeCardHeader}>
                <View style={[styles.sizeCardBrandDot, { backgroundColor: activeBrand?.color }]} />
                <Text style={[styles.sizeCardBrandName, { color: activeBrand?.color }]}>{activeBrand?.name}</Text>
                <Text style={styles.sizeCardSubtitle}> — اختر الأحجام والكميات</Text>
              </View>

              {SIZES.map((sz, idx) => {
                const qty = cart[selectedBrand]?.[sz.key] || 0;
                return (
                  <View key={sz.key} style={[styles.sizeRow, idx < SIZES.length - 1 && styles.sizeRowBorder]}>
                    <View style={styles.sizeInfo}>
                      <MaterialCommunityIcons name={sz.icon as any} size={26} color={qty > 0 ? activeBrand?.color : '#94A3B8'} />
                      <View style={{ marginRight: 12, flex: 1 }}>
                        <Text style={[styles.sizeLabel, qty > 0 && { color: activeBrand?.color }]}>{sz.label}</Text>
                        <Text style={styles.sizeSub}>{sz.sub}</Text>
                      </View>
                    </View>
                    <View style={styles.stepper}>
                      <TouchableOpacity
                        style={[styles.stepBtn, qty === 0 && { backgroundColor: '#F1F5F9' }]}
                        onPress={() => updateQuantity(sz.key, -1)}
                        disabled={qty === 0}
                      >
                        <Feather name="minus" size={16} color={qty === 0 ? '#CBD5E1' : NAVY} />
                      </TouchableOpacity>
                      <Text style={styles.stepVal}>{qty}</Text>
                      <TouchableOpacity
                        style={[styles.stepBtn, { backgroundColor: NAVY }]}
                        onPress={() => updateQuantity(sz.key, 1)}
                      >
                        <Feather name="plus" size={16} color={WHITE} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="hand-pointing-up" size={42} color="#CBD5E1" />
              <Text style={styles.emptyStateText}>اختر علامة تجارية لتحديد الكمية</Text>
            </View>
          )}

          {/* ── Cart Summary ─────────────────────────────────────────────── */}
          {totalQuantity > 0 && (
            <View style={[styles.card, { marginTop: 8, marginBottom: 0 }]}>
              <Text style={styles.cardTitle}>ملخص الطلب</Text>
              {BRANDS.map(brand => {
                const total = brandTotal(brand.id);
                if (!total) return null;
                return (
                  <View key={brand.id} style={styles.summaryRow}>
                    <Text style={styles.summaryBrand}>{brand.name}</Text>
                    <View style={styles.summaryItems}>
                      {SIZES.map(sz => {
                        const qty = cart[brand.id]?.[sz.key] || 0;
                        if (!qty) return null;
                        return (
                          <View key={sz.key} style={[styles.summaryChip, { borderColor: brand.color + '80', backgroundColor: brand.color + '12' }]}>
                            <Text style={[styles.summaryChipText, { color: brand.color }]}>{sz.key} × {qty}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
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
          style={[styles.orderBtn, totalQuantity === 0 && { opacity: 0.45 }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); handleOrderNow(); }}
          disabled={totalQuantity === 0}
        >
          <Text style={styles.orderBtnText}>اطلب الآن</Text>
          <Ionicons name="arrow-back" size={20} color={NAVY} />
        </TouchableOpacity>
      </View>

    </ScreenContainer>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({

  // Header
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

  // Map
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

  // Section headers
  sectionHeader: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  sectionTitle: { fontSize: 16, fontFamily: 'Cairo-Bold', color: '#1E293B' },

  // Brand scroll
  brandScroll: { paddingHorizontal: 16, paddingBottom: 4, flexDirection: 'row-reverse' },
  brandCard: {
    width: 92, marginLeft: 10,
    backgroundColor: WHITE, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderWidth: 1.5, borderColor: '#E2E8F0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    position: 'relative',
  },
  brandBadge: { position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', zIndex: 10, borderWidth: 2, borderColor: WHITE },
  brandBadgeText: { color: WHITE, fontSize: 10, fontFamily: 'Cairo-Bold' },
  brandLogoCircle: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  brandName: { fontSize: 12, fontFamily: 'Cairo-Bold', color: '#475569', textAlign: 'center' },
  brandActiveDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },

  // Card
  card: {
    backgroundColor: WHITE, marginHorizontal: 16, marginTop: 16,
    borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  cardTitle: { fontSize: 16, fontFamily: 'Cairo-Bold', color: NAVY, textAlign: 'right', marginBottom: 16 },

  // Size card
  sizeCardHeader: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 18 },
  sizeCardBrandDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
  sizeCardBrandName: { fontSize: 15, fontFamily: 'Cairo-Bold' },
  sizeCardSubtitle: { fontSize: 13, fontFamily: 'Cairo-Regular', color: '#94A3B8' },

  sizeRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  sizeRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  sizeInfo: { flexDirection: 'row-reverse', alignItems: 'center', flex: 1 },
  sizeLabel: { fontSize: 14, fontFamily: 'Cairo-Bold', color: '#334155' },
  sizeSub: { fontSize: 11, fontFamily: 'Cairo-Regular', color: '#94A3B8', marginTop: 2 },

  stepper: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  stepBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  stepVal: { fontSize: 16, fontFamily: 'Cairo-Bold', color: NAVY, minWidth: 26, textAlign: 'center' },

  // Empty state
  emptyState: {
    marginHorizontal: 16, marginTop: 8, paddingVertical: 40,
    backgroundColor: WHITE, borderRadius: 20,
    alignItems: 'center', gap: 12,
    borderWidth: 1.5, borderColor: '#E2E8F0', borderStyle: 'dashed',
  },
  emptyStateText: { fontSize: 14, fontFamily: 'Cairo-Regular', color: '#94A3B8' },

  // Summary
  summaryRow: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 8, gap: 10 },
  summaryBrand: { fontSize: 13, fontFamily: 'Cairo-Bold', color: NAVY, minWidth: 70, textAlign: 'right' },
  summaryItems: { flex: 1, flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' },
  summaryChip: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  summaryChipText: { fontSize: 12, fontFamily: 'Cairo-Bold' },

  // Footer
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
