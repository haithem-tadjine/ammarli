import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  Linking,
  Platform,
  Alert,
  ActivityIndicator,
  Animated,
  FlatList,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useDriverStore } from '../../src/store/useDriverStore';
import { useDriverAlert } from '../../src/hooks/useDriverAlert';

const COLORS = {
  primary:       '#002147',
  secondary:     '#F3CD0D',
  white:         '#FFFFFF',
  background:    '#E2E8F0',
  textSecondary: '#64748B',
  border:        '#F1F5F9',
  danger:        '#EF4444',
  success:       '#22C55E',
};

// ─── أيقونة وألوان لكل نوع طلبية ─────────────────────────────────────────────
const ORDER_META: Record<string, { icon: string; color: string; bg: string; label: string }> = {
  bottles:            { icon: 'bottle-wine-outline', color: '#16A34A', bg: '#F0FDF4', label: 'مياه معبأة'           },
  well_water:         { icon: 'water-well-outline',  color: '#2563EB', bg: '#EFF6FF', label: 'مياه آبار'            },
  construction_water: { icon: 'dump-truck',          color: '#D97706', bg: '#FFF7ED', label: 'مياه أشغال'           },
  spring_water:       { icon: 'water',               color: '#0284C7', bg: '#F0F9FF', label: 'مياه ينابيع طبيعية'  },
};

export default function OrderDetailsScreen() {
  const router = useRouter();

  // استقبال جميع بيانات الطلبية من الصفحة السابقة
  const params = useLocalSearchParams<{
    orderId?:     string;
    customerName: string;
    customerPhone?: string;
    price:        string;
    address:      string;
    orderType:    string;
    distance:     string;
    rating:       string;
    orderNumber:  string;
    customerLat:  string;
    customerLng:  string;
    avatarUrl:    string;
    capacity?:    string;
  }>();

  const registeredDriver = useDriverStore(state => state.registeredDriver);
  const updateDriverOrderStatus = useDriverStore(state => state.updateDriverOrderStatus);
  const activeDriverOrders = useDriverStore(state => state.activeDriverOrders);

  // ── التبويب المحدد: يبدأ بالطلبية المفعّلة من params أو الأولى في القائمة ──
  const [selectedOrderId, setSelectedOrderId] = useState<string>(
    params.orderId || activeDriverOrders[0]?.orderId || ''
  );

  // تحديث التبويب المحدد فوراً إذا تم الضغط على طلبية مختلفة من الشاشة الرئيسية
  useEffect(() => {
    if (params.orderId) {
      setSelectedOrderId(params.orderId);
    }
  }, [params.orderId]);

  // عندما تأتي طلبية جديدة أو تتغير القائمة، نتأكد أن المحدد ما زال موجوداً
  useEffect(() => {
    if (selectedOrderId && !activeDriverOrders.find(o => o.orderId === selectedOrderId)) {
      setSelectedOrderId(activeDriverOrders[0]?.orderId || '');
    }
  }, [activeDriverOrders]);

  const activeDriverOrder = activeDriverOrders.find(o => o.orderId === selectedOrderId) || activeDriverOrders[0];
  const [completing, setCompleting] = useState(false);

  const incomingOffers = useDriverStore(s => s.incomingOrdersQueue);
  const acceptDriverOrder = useDriverStore(s => s.acceptDriverOrder);
  const refuseDriverOrder = useDriverStore(s => s.refuseDriverOrder);
  const shiftIncomingQueue = useDriverStore(s => s.shiftIncomingQueue);

  // For the banner animation
  const bannerAnim = useRef(new Animated.Value(-150)).current;
  const currentOffer = incomingOffers[0];
  useDriverAlert(!!currentOffer);

  useEffect(() => {
    if (currentOffer) {
      Animated.spring(bannerAnim, {
        toValue: 20,
        useNativeDriver: true,
        friction: 8,
      }).start();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Animated.timing(bannerAnim, {
        toValue: -150,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [currentOffer]);

  const handleAcceptNewOrder = async () => {
    if (!currentOffer) return;
    try {
      await acceptDriverOrder(currentOffer);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // ── نفس منطق Fast Accept الموجود في index.tsx ──
      const isSpringTanker = registeredDriver?.driverType === 'Tanker' && registeredDriver?.waterType === 'spring';
      const isBottled = registeredDriver?.driverType === 'Bottled';
      const hasDefaultPrice = (registeredDriver?.defaultPrice ?? 0) > 0;

      const orderItems = currentOffer.items?.map((item: any, idx: number) => ({
        id: idx,
        qty: item.qty || 1,
        price: item.unitPrice || item.price,
      })) || [];

      const capacity = currentOffer.items?.[0]?.qty || 1000;

      const baseParams: any = {
        orderId: currentOffer.orderId,
        customerName: currentOffer.customer?.name || 'الزبون',
        customerPhone: currentOffer.customer?.phone || '',
        customerLat: String(currentOffer.deliveryAddress?.lat || ''),
        customerLng: String(currentOffer.deliveryAddress?.lng || ''),
        price: String(currentOffer.total || 0),
        address: currentOffer.deliveryAddress?.label || 'الجزائر',
        distance: currentOffer.deliveryAddress?.distance || '---',
        rating: '5.0',
        capacity: String(capacity),
      };

      // إذا عند السائق سعر افتراضي → احسب تلقائياً واذهب مباشرة لتفاصيل الطلبية
      if ((isSpringTanker || isBottled) && hasDefaultPrice) {
        let calculatedTotal = 0;
        if (isSpringTanker) {
          calculatedTotal = (Number(capacity) / 20) * registeredDriver!.defaultPrice!;
        } else if (isBottled) {
          calculatedTotal = orderItems.reduce((sum: number, item: any) =>
            sum + (item.qty * registeredDriver!.defaultPrice!), 0);
        }

        if (calculatedTotal > 0) {
          await useDriverStore.getState().updateDriverOrderStatus('driving', calculatedTotal, currentOffer.orderId);
          baseParams.price = calculatedTotal.toString();
          router.push({ pathname: '/(driver)/order-details' as any, params: baseParams });
          return;
        }
      }

      // إذا لم يكن عنده سعر افتراضي → اذهب لشاشة إدخال السعر
      router.push({ pathname: '/(driver)/order-acceptance' as any, params: baseParams });
    } catch (e) {
      Alert.alert('خطأ', 'تعذر قبول الطلبية');
    }
  };

  const handleDeclineNewOrder = () => {
    if (!currentOffer?.orderId) return;
    refuseDriverOrder(currentOffer.orderId);
    shiftIncomingQueue();
  };

  React.useEffect(() => {
    if (!activeDriverOrder && activeDriverOrders.length === 0) {
      router.replace('/(driver)/(tabs)' as any);
    }
  }, [activeDriverOrder, activeDriverOrders.length]);

  if (!activeDriverOrder) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const customerName = activeDriverOrder?.customer?.name || params.customerName || 'الزبون';
  const customerPhone = activeDriverOrder?.customer?.phone || params.customerPhone || '+213500000000';
  const price        = activeDriverOrder?.total || Number(params.price ?? 2500);
  const address      = activeDriverOrder?.deliveryAddress?.label || params.address || 'الجزائر العاصمة';
  const distance     = activeDriverOrder?.deliveryAddress?.distance || params.distance || '2.5 كم';
  const orderNumber  = activeDriverOrder?.orderId?.substring(0, 6).toUpperCase() || params.orderNumber || String(Math.floor(10000 + Math.random() * 90000));
  
  let orderType = params.orderType ?? 'spring_water';
  if (registeredDriver?.driverType === 'Bottled') orderType = 'bottles';
  else if (registeredDriver?.waterType === 'well') orderType = 'well_water';
  else if (registeredDriver?.waterType === 'construction') orderType = 'construction_water';
  
  const meta         = ORDER_META[orderType] ?? ORDER_META.spring_water;

  const total = price;

  const now = new Date();
  const dateLabel = now.toLocaleDateString('ar-DZ', { day: 'numeric', month: 'long', year: 'numeric' });
  const timeLabel = now.toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' });

  // ── إحداثيات السائق من الستور ──────────────────────────────────────────────
  const driverLat = registeredDriver?.location?.lat ?? 36.7372;
  const driverLng = registeredDriver?.location?.lng ?? 3.0865;

  // ── حساب إحداثيات الزبون بناءً على موقع السائق + المسافة ──────────────────
  const computeCustomerCoords = (): { lat: number; lng: number } => {
    if (activeDriverOrder?.deliveryAddress?.lat && activeDriverOrder?.deliveryAddress?.lng) {
      return { lat: Number(activeDriverOrder.deliveryAddress.lat), lng: Number(activeDriverOrder.deliveryAddress.lng) };
    }
    if (params.customerLat && params.customerLng) {
      return { lat: Number(params.customerLat), lng: Number(params.customerLng) };
    }
    const km = parseFloat(distance.replace(/[^0-9.]/g, '')) || 2.5;
    const R = 6371; 
    const bearing = Math.PI / 4; 
    const δ = km / R;
    const φ1 = (driverLat * Math.PI) / 180;
    const λ1 = (driverLng * Math.PI) / 180;
    const φ2 = Math.asin(
      Math.sin(φ1) * Math.cos(δ) +
      Math.cos(φ1) * Math.sin(δ) * Math.cos(bearing)
    );
    const λ2 =
      λ1 +
      Math.atan2(
        Math.sin(bearing) * Math.sin(δ) * Math.cos(φ1),
        Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
      );
    return {
      lat: (φ2 * 180) / Math.PI,
      lng: (λ2 * 180) / Math.PI,
    };
  };

  const { lat: customerLat, lng: customerLng } = computeCustomerCoords();

  // ── اتصال بالزبون ──────────────────────────────────────────────────────────
  const handleCall = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL(`tel:${customerPhone}`);
  };

  // ── فتح قوقل ماب ──────────────────────────────────────────────────────────
  const handleNavigate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const origin      = `${driverLat},${driverLng}`;
    const destination = `${customerLat},${customerLng}`;

    const googleMapsUrl =
      `https://www.google.com/maps/dir/?api=1` +
      `&origin=${origin}` +
      `&destination=${destination}` +
      `&travelmode=driving`;

    const nativeUrl = Platform.select({
      ios:     `comgooglemaps://?saddr=${origin}&daddr=${destination}&directionsmode=driving`,
      android: `google.navigation:q=${destination}&origin=${origin}`,
    });

    Linking.canOpenURL(nativeUrl!)
      .then(supported =>
        supported
          ? Linking.openURL(nativeUrl!)
          : Linking.openURL(googleMapsUrl)
      )
      .catch(() => Linking.openURL(googleMapsUrl));
  };

  // ── وصلت للموقع → الانتقال لشاشة ملخص الرحلة ────────────────────────────
  const handleComplete = async () => {
    setCompleting(true);
    try {
      await updateDriverOrderStatus('arrived');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push({
        pathname: '/(driver)/trip-completion',
        params: { 
          orderId: activeDriverOrder?.orderId || params.orderId || orderNumber, 
          serviceType: meta.label, 
          price: String(price),
          customerName: customerName
        },
      });
    } catch (e: any) {
      const errorMessage = e?.response?.data?.message || 'حدث خطأ أثناء التواصل مع الخادم.';
      Alert.alert('فشل', `عذراً، لم نتمكن من تحديث حالة الوصول.\nالسبب: ${errorMessage}`);
    } finally {
      setCompleting(false);
    }
  };

  // ── إلغاء الطلب ────────────────────────────────────────────────────────────
  const handleCancel = () => {
    router.push({
      pathname: '/(driver)/cancel-order' as any,
      params: params,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />

      {/* ── Floating Banner للطلب الجديد ── */}
      {currentOffer && (
        <Animated.View style={[styles.floatingBanner, { transform: [{ translateY: bannerAnim }] }]}>
          <View style={styles.bannerHeader}>
            <View style={styles.bannerIconBox}>
              <Ionicons name="water" size={24} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>طلب جديد قريب منك!</Text>
              <Text style={styles.bannerSub}>
                {currentOffer.items?.map(i => i.detail).join(' + ') || 'طلبية'} • {currentOffer.deliveryAddress?.distance || '---'}
              </Text>
            </View>
          </View>
          <View style={styles.bannerButtons}>
            <TouchableOpacity style={styles.bannerDeclineBtn} onPress={handleDeclineNewOrder}>
              <Text style={styles.bannerDeclineText}>رفض</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.bannerAcceptBtn} onPress={handleAcceptNewOrder}>
              <Text style={styles.bannerAcceptText}>قبول الطلب</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      <View style={styles.overlay}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={{ width: 44 }} />
          <Text style={styles.headerTitle}>تفاصيل الطلب</Text>
          {activeDriverOrders.length > 1 ? (
            <View style={styles.orderCountBadge}>
              <Text style={styles.orderCountText}>{activeDriverOrders.length}</Text>
            </View>
          ) : (
            <View style={{ width: 44 }} />
          )}
        </View>

        {/* ── شريط التبويبات — يظهر فقط عند وجود أكثر من طلبية ── */}
        {activeDriverOrders.length > 1 && (
          <FlatList
            horizontal
            data={activeDriverOrders}
            keyExtractor={o => o.orderId}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContainer}
            renderItem={({ item, index }) => {
              const isSelected = item.orderId === activeDriverOrder?.orderId;
              return (
                <TouchableOpacity
                  style={[styles.tab, isSelected && styles.tabActive]}
                  onPress={() => {
                    setSelectedOrderId(item.orderId);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.tabDot, isSelected && styles.tabDotActive]} />
                  <View style={{ alignItems: 'flex-start' }}>
                    <Text style={[styles.tabName, isSelected && styles.tabNameActive]} numberOfLines={1}>
                      {item.customer?.name || `طلب ${index + 1}`}
                    </Text>
                    <Text style={[styles.tabSub, isSelected && styles.tabSubActive]}>
                      {item.items?.[0]?.qty ? `${item.items[0].qty} ${orderType === 'bottles' ? 'قارورة' : 'لتر'}` : (params.capacity ? `${params.capacity} ${orderType === 'bottles' ? 'قارورة' : 'لتر'}` : '1000 لتر')}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollArea}>

          {/* ── بطاقة الحالة (داكنة) مع معلومات العميل ── */}
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>قيد التنفيذ</Text>
              </View>
              <Text style={styles.orderLabel}>رقم الطلب #{orderNumber}</Text>
            </View>
            
            <View style={styles.customerDarkRow}>
              <View style={{ flex: 1, alignItems: 'flex-start' }}>
                <Text style={styles.customerNameDark}>{customerName}</Text>
                <Text style={styles.customerPhoneDark}>{customerPhone}</Text>
              </View>
              <TouchableOpacity style={styles.callIconBtn} onPress={handleCall} activeOpacity={0.8}>
                <Ionicons name="call" size={22} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={16} color="rgba(255,255,255,0.6)" />
              <Text style={styles.dateText}>{dateLabel} • {timeLabel}</Text>
            </View>
          </View>

          {/* ── عنوان التوصيل المدمج ── */}
          <Text style={styles.sectionHeader}>موقع التوصيل</Text>
          <View style={styles.addressCompactCard}>
            <View style={styles.addressIconBox}>
              <Ionicons name="location" size={22} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1, alignItems: 'flex-start', paddingHorizontal: 12 }}>
              <Text style={styles.addressTitle}>عنوان التوصيل</Text>
              <Text style={styles.addressSub} numberOfLines={1}>{address}</Text>
            </View>
            <TouchableOpacity style={styles.navSmallBtn} onPress={handleNavigate} activeOpacity={0.8}>
              <MaterialCommunityIcons name="navigation-variant" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* ── الحجم والسعر ── */}
          <Text style={styles.sectionHeader}>تفاصيل الطلب</Text>
          <View style={styles.priceSizeCard}>
            <View style={styles.priceSizeHalf}>
              <View style={styles.psIconBox}>
                <MaterialCommunityIcons name="water" size={22} color="#2563EB" />
              </View>
              <Text style={styles.psLabel}>الكمية / الحجم</Text>
              <Text style={styles.psValue}>
                {activeDriverOrder?.items?.[0]?.qty || params.capacity || '1000'} {orderType === 'bottles' ? 'قارورة' : 'لتر'}
              </Text>
            </View>
            
            <View style={styles.psDivider} />

            <View style={styles.priceSizeHalf}>
              <View style={[styles.psIconBox, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="cash" size={22} color="#16A34A" />
              </View>
              <Text style={styles.psLabel}>السعر الإجمالي</Text>
              <Text style={[styles.psValue, { color: '#16A34A' }]}>{(total || 0).toLocaleString('ar-DZ')} د.ج</Text>
            </View>
          </View>

          {/* الطلبات الأخرى تُعرض عبر التبويبات أعلى الشاشة */}

          {/* رسالة الإتمام */}
          {completing && (
            <View style={styles.successBanner}>
              <MaterialCommunityIcons name="check-circle" size={22} color={COLORS.success} />
              <Text style={styles.successText}>تم إعلام العميل بوصولك...</Text>
            </View>
          )}

          <View style={{ height: 30 }} />
        </ScrollView>

        {/* ── أزرار الأسفل ── */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.completeButton, completing && { opacity: 0.7 }]}
            onPress={handleComplete}
            activeOpacity={0.8}
            disabled={completing}
          >
            <Ionicons name="checkmark-circle-outline" size={22} color={COLORS.primary} style={{ marginRight: 10 }} />
            <Text style={styles.completeText}>وصلت للموقع</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleCancel}>
            <Text style={styles.cancelLink}>إلغاء الطلب</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: COLORS.background },
  overlay:       { flex: 1 },

  // Header
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, height: 60 },
  headerTitle:     { fontSize: 20, fontFamily: 'Cairo-Black', color: COLORS.primary },
  backButton:      { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', elevation: 3 },
  orderCountBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.secondary, justifyContent: 'center', alignItems: 'center' },
  orderCountText:  { fontSize: 16, fontFamily: 'Cairo-Black', color: COLORS.primary },

  // Order Tabs strip
  tabsContainer: { paddingHorizontal: 15, paddingVertical: 10, gap: 10 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.white, borderRadius: 18,
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1.5, borderColor: 'transparent',
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8,
    minWidth: 140,
  },
  tabActive: {
    backgroundColor: COLORS.primary, borderColor: COLORS.secondary,
  },
  tabDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#CBD5E1',
  },
  tabDotActive: {
    backgroundColor: COLORS.secondary,
  },
  tabName: {
    fontSize: 15, fontFamily: 'Cairo-Bold', color: COLORS.primary,
  },
  tabNameActive: {
    color: COLORS.white,
  },
  tabSub: {
    fontSize: 12, fontFamily: 'Cairo-SemiBold', color: COLORS.textSecondary, marginTop: 2,
  },
  tabSubActive: {
    color: 'rgba(255,255,255,0.8)',
  },

  scrollArea: { paddingHorizontal: 20 },

  // Status card (dark)
  statusCard: {
    backgroundColor: COLORS.primary, borderRadius: 22, padding: 20,
    marginTop: 15, elevation: 8,
    shadowColor: COLORS.primary, shadowOpacity: 0.2, shadowRadius: 10,
  },
  statusRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { backgroundColor: 'rgba(243,205,13,0.2)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  statusText:  { color: COLORS.secondary, fontSize: 12, fontFamily: 'Cairo-Bold' },
  orderLabel:  { color: 'rgba(255,255,255,0.7)', fontFamily: 'Cairo-Bold', fontSize: 13 },
  customerDarkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 },
  customerNameDark: { fontSize: 22, fontFamily: 'Cairo-Black', color: COLORS.white, textAlign: 'left' },
  customerPhoneDark: { fontSize: 14, fontFamily: 'Cairo-SemiBold', color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  callIconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.secondary, justifyContent: 'center', alignItems: 'center' },
  dateRow:     { flexDirection: 'row', alignItems: 'center', marginTop: 15, gap: 8 },
  dateText:    { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontFamily: 'Cairo-SemiBold' },

  sectionHeader: { fontSize: 14, fontFamily: 'Cairo-Black', color: COLORS.primary, textAlign: 'left', marginTop: 20, marginBottom: 12 },

  // Compact Address Card
  addressCompactCard: { 
    flexDirection: 'row', alignItems: 'center', 
    backgroundColor: COLORS.white, borderRadius: 16, padding: 12, 
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6 
  },
  addressIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  addressTitle: { fontSize: 15, fontFamily: 'Cairo-Bold', color: COLORS.primary },
  addressSub:  { fontSize: 12, fontFamily: 'Cairo-SemiBold', color: COLORS.textSecondary, marginTop: 2 },
  navSmallBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#2563EB', justifyContent: 'center', alignItems: 'center', elevation: 3 },

  // Price & Size Card
  priceSizeCard: { 
    flexDirection: 'row', alignItems: 'center', 
    backgroundColor: COLORS.white, borderRadius: 18, padding: 15, 
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6 
  },
  priceSizeHalf: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  psDivider: { width: 1, height: '80%', backgroundColor: COLORS.border, marginHorizontal: 10 },
  psIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  psLabel: { fontSize: 12, fontFamily: 'Cairo-SemiBold', color: COLORS.textSecondary },
  psValue: { fontSize: 18, fontFamily: 'Cairo-Black', color: COLORS.primary, marginTop: 2 },

  // Success
  successBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F0FDF4', borderRadius: 16, padding: 16, marginTop: 16,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  successText: { fontSize: 15, fontFamily: 'Cairo-Bold', color: COLORS.success },

  // Footer
  footer:          { paddingHorizontal: 20, paddingBottom: 20, gap: 12 },
  completeButton:  { height: 60, backgroundColor: COLORS.secondary, borderRadius: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  completeText:    { fontSize: 18, fontFamily: 'Cairo-Black', color: COLORS.primary },
  cancelLink:      { textAlign: 'center', color: COLORS.danger, fontFamily: 'Cairo-Bold', textDecorationLine: 'underline', marginTop: 5 },

  // Upcoming Orders
  upcomingCard: {
    backgroundColor: COLORS.white, borderRadius: 16, padding: 15, marginBottom: 10,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5,
  },
  upcomingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  upcomingAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#E2E8F0',
    justifyContent: 'center', alignItems: 'center',
  },
  upcomingInitial: { fontSize: 18, fontFamily: 'Cairo-Black', color: COLORS.textSecondary },
  upcomingName: { fontSize: 15, fontFamily: 'Cairo-Bold', color: COLORS.primary },
  upcomingSub: { fontSize: 12, fontFamily: 'Cairo-SemiBold', color: COLORS.textSecondary, marginTop: 2 },
  upcomingTime: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12,
  },
  upcomingTimeText: { fontSize: 11, fontFamily: 'Cairo-Bold', color: COLORS.textSecondary },

  // Floating Banner
  floatingBanner: {
    position: 'absolute', top: 0, left: 15, right: 15,
    backgroundColor: COLORS.white, borderRadius: 20, padding: 15,
    zIndex: 999, elevation: 15,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    borderWidth: 1, borderColor: '#F3CD0D',
  },
  bannerHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 15 },
  bannerIconBox: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#FEF3C7',
    justifyContent: 'center', alignItems: 'center',
  },
  bannerTitle: { fontSize: 16, fontFamily: 'Cairo-Black', color: COLORS.primary },
  bannerSub: { fontSize: 13, fontFamily: 'Cairo-SemiBold', color: COLORS.textSecondary },
  bannerButtons: { flexDirection: 'row', gap: 10 },
  bannerDeclineBtn: {
    flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: COLORS.textSecondary,
    justifyContent: 'center', alignItems: 'center',
  },
  bannerDeclineText: { fontSize: 14, fontFamily: 'Cairo-Bold', color: COLORS.textSecondary },
  bannerAcceptBtn: {
    flex: 1, height: 44, borderRadius: 12, backgroundColor: COLORS.secondary,
    justifyContent: 'center', alignItems: 'center',
  },
  bannerAcceptText: { fontSize: 14, fontFamily: 'Cairo-Black', color: COLORS.primary },
});

