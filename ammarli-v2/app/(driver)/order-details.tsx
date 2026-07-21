import React, { useState } from 'react';
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
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useDriverStore } from '../../src/store/useDriverStore';

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
  }>();

  const registeredDriver = useDriverStore(state => state.registeredDriver);
  const updateDriverOrderStatus = useDriverStore(state => state.updateDriverOrderStatus);
  const activeDriverOrder = useDriverStore(state => state.activeDriverOrder);
  const [completing, setCompleting] = useState(false);

  React.useEffect(() => {
    if (!activeDriverOrder) {
      router.replace('/(driver)/(tabs)' as any);
    }
  }, [activeDriverOrder]);

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
          orderId: orderNumber, 
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

      <View style={styles.overlay}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={{ width: 44 }} />
          <Text style={styles.headerTitle}>تفاصيل الطلب</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollArea}>

          {/* ── بطاقة الحالة (داكنة) ── */}
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>قيد التنفيذ</Text>
              </View>
              <Text style={styles.orderLabel}>رقم الطلب</Text>
            </View>
            <Text style={styles.orderNumber}>#{orderNumber}</Text>
            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={16} color="rgba(255,255,255,0.6)" />
              <Text style={styles.dateText}>{dateLabel} • {timeLabel}</Text>
            </View>
          </View>

          {/* ── معلومات العميل ── */}
          <Text style={styles.sectionHeader}>معلومات العميل</Text>
          <View style={styles.infoCard}>
            <View style={styles.customerRow}>
              {activeDriverOrder?.customer?.avatarUrl || params.avatarUrl ? (
                <Image
                  source={{ uri: (activeDriverOrder?.customer?.avatarUrl || params.avatarUrl) as string }}
                  style={styles.avatar}
                />
              ) : (
                <View style={[styles.avatar, { backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }]}>
                  <Ionicons name="person" size={24} color="#64748B" />
                </View>
              )}
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>{customerName}</Text>
                <Text style={styles.customerPhone}>{customerPhone}</Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={13} color={COLORS.secondary} />
                  <Text style={styles.ratingText}>{params.rating ?? '5.0'}</Text>
                  <View style={styles.dot} />
                  <Text style={styles.ratingText}>{distance}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ── عنوان التوصيل ── */}
          <TouchableOpacity
            style={styles.infoCard}
            activeOpacity={0.85}
            onPress={handleNavigate}
          >
            <View style={styles.addressRow}>
              <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="navigate" size={22} color="#2563EB" />
              </View>
              <View style={{ flex: 1, alignItems: 'flex-start' }}>
                <Text style={styles.addressTitle}>عنوان التوصيل</Text>
                <Text style={styles.addressSub}>{address}</Text>
              </View>
              {/* زر قوقل ماب */}
              <View style={styles.navBadge}>
                <MaterialCommunityIcons name="google-maps" size={20} color="#2563EB" />
              </View>
            </View>
            {/* خريطة مصغرة */}
            <View style={styles.miniMapContainer}>
              <Image
                source={{ uri:
                  `https://maps.googleapis.com/maps/api/staticmap` +
                  `?size=600x250&maptype=roadmap` +
                  `&markers=color:blue%7C${driverLat},${driverLng}` +
                  `&markers=color:red%7C${customerLat},${customerLng}` +
                  `&key=YOUR_API_KEY`
                }}
                style={styles.miniMap}
                defaultSource={require('../../assets/images/icon.png')}
              />
              <View style={styles.mapPinCustomer}>
                <Ionicons name="location" size={34} color="#EF4444" />
              </View>
              <View style={styles.mapPinDriver}>
                <Ionicons name="car" size={28} color="#2563EB" />
              </View>
              {/* طبقة شفافة قابلة للضغط */}
              <TouchableOpacity
                style={styles.mapOverlay}
                activeOpacity={0.8}
                onPress={handleNavigate}
              >
                <View style={styles.openMapsBtn}>
                  <MaterialCommunityIcons name="google-maps" size={18} color="#FFFFFF" />
                  <Text style={styles.openMapsText}>فتح قوقل ماب</Text>
                </View>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>

          {/* ── محتوى الطلب ── */}
          <Text style={styles.sectionHeader}>محتوى الطلب</Text>
          <View style={styles.invoiceCard}>
            {activeDriverOrder?.items?.map((item, idx) => (
              <View style={styles.billItem} key={idx}>
                <Text style={styles.billPrice}>{(item.price || 0).toLocaleString('ar-DZ')} د.ج</Text>
                <View style={{ alignItems: 'flex-start', flex: 1 }}>
                  <Text style={styles.billName}>{item.description}</Text>
                  <Text style={styles.billSub}>{item.detail}</Text>
                </View>
                <View style={[styles.billIcon, { backgroundColor: meta.bg }]}>
                  <MaterialCommunityIcons name={item.icon as any || meta.icon} size={22} color={meta.color} />
                </View>
              </View>
            )) || (
              <View style={styles.billItem}>
                <Text style={styles.billPrice}>{(price || 0).toLocaleString('ar-DZ')} د.ج</Text>
                <View style={{ alignItems: 'flex-start', flex: 1 }}>
                  <Text style={styles.billName}>{meta.label}</Text>
                  <Text style={styles.billSub}>الطلبية الرئيسية</Text>
                </View>
                <View style={[styles.billIcon, { backgroundColor: meta.bg }]}>
                  <MaterialCommunityIcons name={meta.icon as any} size={22} color={meta.color} />
                </View>
              </View>
            )}

            <View style={styles.divider} />


            <View style={[styles.totalRow, { marginTop: 12 }]}>
              <Text style={styles.grandTotalVal}>{(total || 0).toLocaleString('ar-DZ')} د.ج</Text>
              <Text style={styles.grandTotalLabel}>الإجمالي</Text>
            </View>
          </View>

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
          <TouchableOpacity style={styles.callButton} onPress={handleCall} activeOpacity={0.8}>
            <Ionicons name="call-outline" size={20} color={COLORS.primary} style={{ marginRight: 10 }} />
            <Text style={styles.callText}>اتصال بالعميل</Text>
          </TouchableOpacity>

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
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, height: 60 },
  headerTitle: { fontSize: 20, fontFamily: 'Cairo-Black', color: COLORS.primary },
  backButton:  { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', elevation: 3 },

  scrollArea: { paddingHorizontal: 20 },

  // Status card (dark)
  statusCard: {
    backgroundColor: COLORS.primary, borderRadius: 30, padding: 25,
    marginTop: 15, elevation: 10,
    shadowColor: COLORS.primary, shadowOpacity: 0.25, shadowRadius: 15,
  },
  statusRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { backgroundColor: 'rgba(243,205,13,0.2)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
  statusText:  { color: COLORS.secondary, fontSize: 12, fontFamily: 'Cairo-Bold' },
  orderLabel:  { color: 'rgba(255,255,255,0.6)', fontFamily: 'Cairo-SemiBold' },
  orderNumber: { fontSize: 38, fontFamily: 'Cairo-Black', color: COLORS.white, textAlign: 'left', marginTop: 5 },
  dateRow:     { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
  dateText:    { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontFamily: 'Cairo-SemiBold' },

  sectionHeader: { fontSize: 15, fontFamily: 'Cairo-Black', color: COLORS.primary, textAlign: 'left', marginTop: 25, marginBottom: 15 },

  // Info cards
  infoCard:   { backgroundColor: COLORS.white, borderRadius: 22, padding: 15, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOpacity: 0.03 },
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  avatar:      { width: 60, height: 60, borderRadius: 30 },
  customerInfo: { flex: 1, alignItems: 'flex-start' },
  customerName: { fontSize: 18, fontFamily: 'Cairo-Bold', color: COLORS.primary },
  customerPhone: { fontSize: 13, fontFamily: 'Cairo-SemiBold', color: COLORS.textSecondary },
  ratingRow:   { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  ratingText:  { fontSize: 12, fontFamily: 'Cairo-Bold', color: COLORS.textSecondary },
  dot:         { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#CBD5E1' },

  addressRow:  { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 15 },
  iconBox:     { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  addressTitle: { fontSize: 16, fontFamily: 'Cairo-Bold', color: COLORS.primary },
  addressSub:  { fontSize: 12, fontFamily: 'Cairo-SemiBold', color: COLORS.textSecondary },
  miniMapContainer: { height: 130, borderRadius: 16, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  miniMap:     { width: '100%', height: '100%' },
  mapPin:      { position: 'absolute' },

  // Invoice
  invoiceCard: { backgroundColor: COLORS.white, borderRadius: 25, padding: 20, elevation: 2 },
  billItem:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 15 },
  billIcon:    { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  billName:    { fontSize: 16, fontFamily: 'Cairo-Bold', color: COLORS.primary },
  billSub:     { fontSize: 12, fontFamily: 'Cairo-SemiBold', color: COLORS.textSecondary },
  billPrice:   { fontSize: 16, fontFamily: 'Cairo-Black', color: COLORS.primary },
  divider:     { height: 1, backgroundColor: COLORS.border, marginVertical: 15 },
  totalRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  totalLabel:  { fontSize: 14, fontFamily: 'Cairo-SemiBold', color: COLORS.textSecondary },
  totalVal:    { fontSize: 14, fontFamily: 'Cairo-Bold', color: COLORS.primary },
  grandTotalLabel: { fontSize: 20, fontFamily: 'Cairo-Black', color: COLORS.primary },
  grandTotalVal:   { fontSize: 22, fontFamily: 'Cairo-Black', color: COLORS.primary },

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
  callButton:      { height: 60, borderWidth: 2, borderColor: COLORS.primary, borderRadius: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  callText:        { fontSize: 16, fontFamily: 'Cairo-Bold', color: COLORS.primary },
  cancelLink:      { textAlign: 'center', color: COLORS.danger, fontFamily: 'Cairo-Bold', textDecorationLine: 'underline', marginTop: 5 },

  // ── Navigation / Map ──────────────────────────────────────────────────────
  navBadge: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 10,
  },
  mapPinCustomer: { position: 'absolute', top: '30%', right: '55%' },
  mapPinDriver:   { position: 'absolute', top: '50%', right: '30%' },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 10,
  },
  openMapsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#2563EB',
    paddingHorizontal: 18, paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#2563EB', shadowOpacity: 0.35, shadowRadius: 8, elevation: 5,
  },
  openMapsText: { fontSize: 13, fontFamily: 'Cairo-Bold', color: '#FFFFFF' },
});

