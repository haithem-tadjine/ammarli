import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  BackHandler,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useDriverStore } from '../../src/store/useDriverStore';
import { useDriverAlert } from '../../src/hooks/useDriverAlert';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useIsFocused } from '@react-navigation/native';

const COLORS = {
  primary:       '#002147',
  secondary:     '#F3CD0D',
  white:         '#FFFFFF',
  background:    '#F8FAFC',
  textSecondary: '#64748B',
  border:        '#E2E8F0',
  danger:        '#EF4444',
  success:       '#22C55E',
};

// ─── أيقونة وألوان لكل نوع طلبية ─────────────────────────────────────────────
const ORDER_META: Record<string, { icon: string; color: string; bg: string; label: string }> = {
  bottles:            { icon: 'bottle-wine-outline', color: '#16A34A', bg: 'rgba(22, 163, 74, 0.1)', label: 'مياه معبأة'           },
  well_water:         { icon: 'water-well-outline',  color: '#2563EB', bg: 'rgba(37, 99, 235, 0.1)', label: 'مياه آبار'            },
  construction_water: { icon: 'dump-truck',          color: '#D97706', bg: 'rgba(217, 119, 6, 0.1)', label: 'مياه أشغال'           },
  spring_water:       { icon: 'water',               color: '#0284C7', bg: 'rgba(2, 132, 199, 0.1)', label: 'مياه ينابيع طبيعية'  },
};

// ─── تسميات الأحجام بالعربية ──────────────────────────────────────────────────
const SIZE_LABELS: Record<string, string> = {
  '0.25L': 'فاردو 0.25 لتر',
  '0.5L':  'فاردو 0.5 لتر',
  '1L':    'فاردو 1 لتر',
  '1.5L':  'فاردو 1.5 لتر',
  '2L':    'فاردو 2 لتر',
  '5L':    'بيدون 5 لتر',
  '10L':   'بيدون 10 لتر',
  '19L':   'بيدون 19 لتر',
  '20L':   'بيدون 20 لتر',
};
const getSizeLabel = (size: string): string => SIZE_LABELS[size] ?? size;

export default function OrderDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
  
  const isOnline = useDriverStore((s: any) => s.isOnline);

  const activeDriverOrders = useDriverStore(state => state.activeDriverOrders);

  const [selectedOrderId, setSelectedOrderId] = useState<string>(
    params.orderId || activeDriverOrders[0]?.orderId || ''
  );

  useEffect(() => {
    if (params.orderId) {
      setSelectedOrderId(params.orderId);
    }
  }, [params.orderId]);

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

  const bannerAnim = useRef(new Animated.Value(-150)).current;
  const currentOffer = incomingOffers[0];
  useDriverAlert(!!currentOffer);

  const calculatedOfferPrice = useMemo(() => {
    if (!currentOffer) return null;
    
    const isSpring = registeredDriver?.driverType === 'Tanker' && registeredDriver?.waterType === 'spring';
    const isWell = registeredDriver?.driverType === 'Tanker' && registeredDriver?.waterType !== 'spring';
    const isBottled = registeredDriver?.driverType === 'Bottled';
    
    let subtotal = 0;
    let markup = 0;
    let hasSettings = false;

    if (isSpring) {
      if ((registeredDriver?.defaultPrice || 0) > 0) {
        hasSettings = true;
        const capacity = Number(currentOffer.items?.[0]?.qty || 1000);
        subtotal = (capacity / 20) * registeredDriver!.defaultPrice!;
        markup = (capacity / 20) * 5;
      }
    } else if (isWell) {
      if ((registeredDriver?.pricePerUnit || 0) > 0) {
        hasSettings = true;
        const capacity = Number(currentOffer.items?.[0]?.qty || 1500);
        const floorPrice = registeredDriver?.floorPrice || 0;
        const floor = Number(currentOffer.items?.[0]?.floor || 0);
        subtotal = Math.ceil(capacity / 1500) * registeredDriver!.pricePerUnit! + (floor * floorPrice);
        markup = Math.ceil(capacity / 1500) * 50;
      }
    } else if (isBottled) {
      if (registeredDriver?.bottledPrices) {
        hasSettings = true;
        const items = currentOffer.items || [];
        subtotal = items.reduce((sum: number, item: any) => {
          const itemSize = item.size || '1.5L';
          const price = (registeredDriver!.bottledPrices as any)[itemSize] || 0;
          return sum + (item.qty * price);
        }, 0);
        const totalFardous = items.reduce((sum: number, item: any) => sum + (item.qty || 1), 0);
        markup = totalFardous * 3;
      }
    }

    if (!hasSettings || subtotal <= 0) return null;

    return { subtotal, markup, total: subtotal + markup };
  }, [currentOffer, registeredDriver]);

  useEffect(() => {
    if (currentOffer) {
      Animated.spring(bannerAnim, {
        toValue: 50,
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

      let finalPrice = String(currentOffer.total || 0);
      let subtotalPrice = currentOffer.total || 0;

      if (calculatedOfferPrice) {
        subtotalPrice = calculatedOfferPrice.subtotal;
        finalPrice = calculatedOfferPrice.total.toString();
      }

      await useDriverStore.getState().updateDriverOrderStatus('driving', subtotalPrice, currentOffer.orderId);
      baseParams.price = finalPrice;
      router.replace({ pathname: '/(driver)/order-details' as any, params: baseParams });
    } catch (e) {
      Alert.alert('خطأ', 'تعذر قبول الطلبية');
    }
  };

  const handleDeclineNewOrder = () => {
    if (!currentOffer?.orderId) return;
    refuseDriverOrder(currentOffer.orderId);
    shiftIncomingQueue();
  };

  const isFocused = useIsFocused();

  React.useEffect(() => {
    const onBackPress = () => {
      router.replace('/(driver)/(tabs)' as any);
      return true;
    };
    const backSubscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSubscription.remove();
  }, []);

  React.useEffect(() => {
    if (isFocused && !activeDriverOrder && activeDriverOrders.length === 0) {
      router.replace('/(driver)/(tabs)' as any);
    }
  }, [activeDriverOrder, activeDriverOrders.length, isFocused]);

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

  const driverLat = registeredDriver?.location?.lat ?? 36.7372;
  const driverLng = registeredDriver?.location?.lng ?? 3.0865;

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

  const handleCall = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL(`tel:${customerPhone}`);
  };

  const handleWhatsApp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL(`whatsapp://send?phone=${customerPhone}`);
  };

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

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await updateDriverOrderStatus('arrived');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({
        pathname: '/(driver)/trip-completion',
        params: { 
          orderId: activeDriverOrder?.orderId || params.orderId || orderNumber, 
          serviceType: meta.label, 
          price: String(price),
          customerName: customerName,
          customerPhone: customerPhone,
          items: JSON.stringify(activeDriverOrder?.items || []),
          orderType: orderType,
        },
      });
    } catch (e: any) {
      const errorMessage = e?.response?.data?.message || 'حدث خطأ أثناء التواصل مع الخادم.';
      Alert.alert('فشل', `عذراً، لم نتمكن من تحديث حالة الوصول.\nالسبب: ${errorMessage}`);
    } finally {
      setCompleting(false);
    }
  };

  const handleCancel = () => {
    router.push({
      pathname: '/(driver)/cancel-order' as any,
      params: params,
    });
  };

  const bgColors = isOnline ? (['#F8FAFC', '#E2E8F0'] as const) : (['#F1F5F9', '#CBD5E1'] as const);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={bgColors} style={StyleSheet.absoluteFillObject} />

      {/* 1) رأس الصفحة مع زر الرجوع والعنوان */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(driver)/(tabs)' as any)}>
          <BlurView intensity={50} tint="light" style={styles.iconWrap}>
            <MaterialCommunityIcons name="chevron-right" size={28} color={COLORS.primary} />
          </BlurView>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>تفاصيل الطلبية</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* ── Floating Banner للطلب الجديد ── */}
      {currentOffer && (
        <Animated.View style={[styles.newOrderBanner, { transform: [{ translateY: bannerAnim }] }]}>
          <BlurView intensity={80} tint="light" style={styles.bannerBlur}>
            <View style={styles.bannerContent}>
              <View style={styles.bannerIconCircle}>
                <MaterialCommunityIcons name="bell-ring" size={20} color={COLORS.white} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.bannerTitle}>طلبية جديدة بانتظارك!</Text>
                <Text style={styles.bannerSubtitle}>{currentOffer.deliveryAddress?.label || 'موقع جديد'}</Text>
                {calculatedOfferPrice && (
                  <Text style={[styles.bannerTitle, { color: COLORS.secondary, marginTop: 4, fontSize: 16 }]}>
                    المبلغ: {calculatedOfferPrice.total.toLocaleString()} د.ج
                  </Text>
                )}
              </View>
              <View style={styles.bannerActions}>
                <TouchableOpacity style={styles.bannerBtnAccept} onPress={handleAcceptNewOrder}>
                  <Text style={styles.bannerBtnText}>قبول</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.bannerBtnDecline} onPress={handleDeclineNewOrder}>
                  <Text style={styles.bannerBtnText}>رفض</Text>
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        </Animated.View>
      )}

      {/* ── شريط التبويبات — يظهر فقط عند وجود أكثر من طلبية ── */}
      {activeDriverOrders.length > 1 && (
        <View style={{ marginBottom: 10 }}>
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
                  style={[styles.tabButton, isSelected && styles.tabButtonActive]}
                  onPress={() => {
                    setSelectedOrderId(item.orderId);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={[styles.tabButtonText, isSelected && styles.tabButtonTextActive]}>
                    طلبية {index + 1}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* 3) تفاصيل الزبون والطلب (مدمجة في بطاقة زجاجية واحدة) */}
        <BlurView intensity={70} tint="light" style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>رقم الطلبية #{orderNumber}</Text>
            <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
              <MaterialCommunityIcons name={meta.icon as any} size={14} color={meta.color} />
              <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
            </View>
          </View>

          {/* معلومات الزبون */}
          <View style={styles.customerRow}>
            {params.avatarUrl ? (
              <Image 
                source={{ uri: params.avatarUrl }} 
                style={styles.customerAvatar} 
              />
            ) : (
              <View style={[styles.customerAvatar, { backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: COLORS.white, fontSize: 24, fontFamily: 'Cairo-Bold' }}>
                  {customerName ? customerName.charAt(0).toUpperCase() : '?'}
                </Text>
              </View>
            )}
            <View style={styles.customerInfoText}>
              <Text style={styles.customerName}>{customerName}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text style={styles.ratingText}>5.0 (42 رحلة)</Text>
              </View>
            </View>
            {/* أزرار الاتصال (زجاجية) */}
            <View style={styles.contactActions}>
              <TouchableOpacity style={styles.contactBtn} onPress={handleCall}>
                <Ionicons name="call" size={20} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.contactBtn} onPress={handleWhatsApp}>
                <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider} />

          {/* تفاصيل الموقع والوقت */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <View style={styles.detailIconBox}>
                <Ionicons name="location" size={18} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>موقع التوصيل</Text>
                <Text style={styles.detailValue} numberOfLines={2}>{address}</Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <View style={styles.detailIconBox}>
                <Ionicons name="navigate" size={18} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>المسافة التقريبية</Text>
                <Text style={styles.detailValue}>{distance}</Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <View style={styles.detailIconBox}>
                <Ionicons name="time" size={18} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>وقت الطلب</Text>
                <Text style={styles.detailValue}>{timeLabel} - {dateLabel}</Text>
              </View>
            </View>
          </View>

          {/* زر فتح الخريطة */}
          <TouchableOpacity style={styles.mapBtn} onPress={handleNavigate}>
            <MaterialCommunityIcons name="map-marker-path" size={20} color={COLORS.white} />
            <Text style={styles.mapBtnText}>فتح في خرائط جوجل</Text>
          </TouchableOpacity>
        </BlurView>

        {/* ── الحجم والسعر ── */}
        <BlurView intensity={70} tint="light" style={styles.card}>
          <View style={styles.cardHeader}>
             <Text style={styles.cardTitle}>التكلفة والحجم</Text>
          </View>

          {/* ── تفاصيل الأصناف — للمياه المعبأة فقط ── */}
          {orderType === 'bottles' && activeDriverOrder?.items && activeDriverOrder.items.length > 0 && (
            <View style={styles.itemsSection}>
              <View style={styles.itemsSectionHeader}>
                <MaterialCommunityIcons name="package-variant" size={18} color={COLORS.primary} />
                <Text style={styles.itemsSectionTitle}>ما ستُنزله عند الوصول</Text>
              </View>
              {activeDriverOrder.items.map((item: any, index: number) => (
                <View key={index} style={styles.itemRow}>
                  <View style={styles.itemIconBox}>
                    <MaterialCommunityIcons name="bottle-soda-outline" size={18} color="#2563EB" />
                  </View>
                  <Text style={styles.itemLabel} numberOfLines={1}>
                    {getSizeLabel(item.size || '1.5L')}
                  </Text>
                  <View style={styles.itemQtyBadge}>
                    <Text style={styles.itemQtyText}>× {item.qty}</Text>
                  </View>
                </View>
              ))}
              <View style={styles.divider} />
            </View>
          )}

          <View style={styles.priceSizeCard}>
            <View style={styles.priceSizeHalf}>
              <View style={styles.psIconBox}>
                <MaterialCommunityIcons name="water" size={22} color="#2563EB" />
              </View>
              <Text style={styles.psLabel}>الكمية الإجمالية</Text>
              <Text style={styles.psValue}>
                {orderType === 'bottles' 
                  ? activeDriverOrder?.items?.reduce((sum, item) => sum + (Number(item.qty) || 1), 0) || params.capacity || '1'
                  : activeDriverOrder?.items?.[0]?.qty || params.capacity || '1000'} {orderType === 'bottles' ? 'قارورة' : 'لتر'}
              </Text>
            </View>
            
            <View style={styles.psDivider} />

            <View style={styles.priceSizeHalf}>
              {activeDriverOrder?.deliveryFee ? (
                <>
                  <Text style={[styles.psLabel, { fontSize: 11, marginBottom: 2 }]}>السعر الأساسي: {activeDriverOrder.subtotal?.toLocaleString('ar-DZ')} د.ج</Text>
                  <Text style={[styles.psLabel, { fontSize: 11, marginBottom: 4 }]}>حقوق التطبيق: {activeDriverOrder.deliveryFee.toLocaleString('ar-DZ')} د.ج</Text>
                </>
              ) : null}
              <View style={[styles.psIconBox, { backgroundColor: '#F0FDF4', marginBottom: activeDriverOrder?.deliveryFee ? 2 : 8 }]}>
                <Ionicons name="cash" size={22} color="#16A34A" />
              </View>
              <Text style={styles.psLabel}>السعر الإجمالي للزبون</Text>
              <Text style={[styles.psValue, { color: '#16A34A' }]}>{(total || 0).toLocaleString('ar-DZ')} د.ج</Text>
            </View>
          </View>
        </BlurView>

        {/* رسالة الإتمام */}
        {completing && (
          <View style={styles.successBanner}>
            <MaterialCommunityIcons name="check-circle" size={22} color={COLORS.success} />
            <Text style={styles.successText}>تم إعلام العميل بوصولك...</Text>
          </View>
        )}
      </ScrollView>

      {/* الأزرار العائمة في الأسفل */}
      <BlurView intensity={90} tint="light" style={[styles.bottomActions, { paddingBottom: insets.bottom + 15 }]}>
        <TouchableOpacity style={styles.completeBtn} onPress={handleComplete} disabled={completing}>
          {completing ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={24} color={COLORS.primary} />
              <Text style={styles.completeBtnText}>وصول واستكمال الرحلة</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
          <Text style={styles.cancelBtnText}>إلغاء الرحلة</Text>
        </TouchableOpacity>
      </BlurView>

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 15,
  },
  headerTitle: { fontSize: 24, fontFamily: 'Cairo-Black', color: COLORS.primary },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  iconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)' },

  // Tabs
  tabsContainer: { paddingHorizontal: 20, gap: 10 },
  tabButton: {
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
  },
  tabButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabButtonText: { fontSize: 16, fontFamily: 'Cairo-Bold', color: COLORS.primary },
  tabButtonTextActive: { color: COLORS.white },

  // Content
  scrollContent: { paddingHorizontal: 20, paddingTop: 5, paddingBottom: 160 },

  // Card
  card: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 24, padding: 20,
    marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)',
    overflow: 'hidden',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  cardTitle: { fontSize: 20, fontFamily: 'Cairo-Black', color: COLORS.primary },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  statusText: { fontSize: 13, fontFamily: 'Cairo-Bold' },

  customerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  customerAvatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: COLORS.white },
  customerInfoText: { flex: 1, marginHorizontal: 12 },
  customerName: { fontSize: 20, fontFamily: 'Cairo-Black', color: COLORS.primary, textAlign: 'left' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  ratingText: { fontSize: 13, fontFamily: 'Cairo-SemiBold', color: COLORS.textSecondary },
  
  contactActions: { flexDirection: 'row', gap: 10 },
  contactBtn: { width: 44, height: 44, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.8)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },

  divider: { height: 1, backgroundColor: 'rgba(0,33,71,0.08)', marginBottom: 20 },

  detailsGrid: { gap: 16, marginBottom: 20 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(0,33,71,0.05)', justifyContent: 'center', alignItems: 'center' },
  detailLabel: { fontSize: 14, fontFamily: 'Cairo-SemiBold', color: COLORS.textSecondary, textAlign: 'left' },
  detailValue: { fontSize: 16, fontFamily: 'Cairo-Bold', color: COLORS.primary, textAlign: 'left' },

  mapBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 16 },
  mapBtnText: { fontSize: 16, fontFamily: 'Cairo-Bold', color: COLORS.white },

  priceSizeCard: { flexDirection: 'row', alignItems: 'center' },
  priceSizeHalf: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  psDivider: { width: 1, height: '80%', backgroundColor: 'rgba(0,33,71,0.08)', marginHorizontal: 10 },
  psIconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(37,99,235,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  psLabel: { fontSize: 14, fontFamily: 'Cairo-SemiBold', color: COLORS.textSecondary },
  psValue: { fontSize: 20, fontFamily: 'Cairo-Black', color: COLORS.primary, marginTop: 2 },

  // Items breakdown
  itemsSection: { marginBottom: 16 },
  itemsSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  itemsSectionTitle: { fontSize: 15, fontFamily: 'Cairo-Bold', color: COLORS.primary },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(37,99,235,0.06)', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8,
  },
  itemIconBox: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(37,99,235,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  itemLabel: { flex: 1, fontSize: 15, fontFamily: 'Cairo-Bold', color: COLORS.primary, textAlign: 'left' },
  itemQtyBadge: {
    backgroundColor: COLORS.primary, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  itemQtyText: { fontSize: 14, fontFamily: 'Cairo-Black', color: COLORS.white },

  // Bottom Actions
  bottomActions: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 15,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.9)',
    backgroundColor: 'rgba(255,255,255,0.7)',
    gap: 12,
  },
  completeBtn: {
    height: 60, backgroundColor: COLORS.secondary, borderRadius: 20,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10,
    elevation: 5, shadowColor: COLORS.secondary, shadowOpacity: 0.3, shadowRadius: 10,
  },
  completeBtnText: { fontSize: 20, fontFamily: 'Cairo-Black', color: COLORS.primary },
  cancelBtn: { height: 50, justifyContent: 'center', alignItems: 'center' },
  cancelBtnText: { fontSize: 17, fontFamily: 'Cairo-Bold', color: COLORS.danger, textDecorationLine: 'underline' },

  // Success Banner
  successBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: 'rgba(34, 197, 94, 0.1)', padding: 15, borderRadius: 16, marginTop: 20,
    borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  successText: { fontSize: 14, fontFamily: 'Cairo-Bold', color: COLORS.success },

  // Incoming Order Banner
  newOrderBanner: {
    position: 'absolute', top: 0, left: 20, right: 20, zIndex: 100,
  },
  bannerBlur: {
    backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 24, padding: 16,
    borderWidth: 1, borderColor: COLORS.secondary,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 15, elevation: 8,
    overflow: 'hidden',
  },
  bannerContent: { flexDirection: 'row', alignItems: 'center' },
  bannerIconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.secondary, justifyContent: 'center', alignItems: 'center' },
  bannerTitle: { fontSize: 16, fontFamily: 'Cairo-Black', color: COLORS.primary, textAlign: 'left' },
  bannerSubtitle: { fontSize: 13, fontFamily: 'Cairo-SemiBold', color: COLORS.textSecondary, textAlign: 'left' },
  bannerActions: { flexDirection: 'row', gap: 8 },
  bannerBtnAccept: { backgroundColor: COLORS.secondary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14 },
  bannerBtnDecline: { backgroundColor: 'transparent', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: COLORS.textSecondary },
  bannerBtnText: { fontSize: 14, fontFamily: 'Cairo-Bold', color: COLORS.primary },
});
