import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
  ScrollView,
  Linking,
  Alert,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
  Keyboard,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useDriverStore } from '../../src/store/useDriverStore';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp, useAnimatedStyle, withRepeat, withTiming, useSharedValue, withSequence } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const COLORS = {
  primary:       '#002147',
  secondary:     '#F3CD0D',
  background:    '#F4F7FA',
  white:         '#FFFFFF',
  textSecondary: '#64748B',
  danger:        '#EF4444',
  success:       '#22C55E',
  cardBg:        '#FFFFFF',
};

// ─── أيقونة لكل نوع طلبية ─────────────────────────────────────────────────────
const ORDER_META: Record<string, { icon: string; color: string; bg: string }> = {
  bottles:            { icon: 'bottle-wine-outline', color: '#16A34A', bg: '#F0FDF4' },
  well_water:         { icon: 'water-well-outline',  color: '#2563EB', bg: '#EFF6FF' },
  construction_water: { icon: 'dump-truck',          color: '#D97706', bg: '#FFF7ED' },
  spring_water:       { icon: 'water',               color: '#2563EB', bg: '#EFF6FF' },
};

export default function OrderAcceptanceScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const updateDriverOrderStatus = useDriverStore(s => s.updateDriverOrderStatus);

  const params = useLocalSearchParams<{ orderId: string; avatarUrl?: string }>();
  
  const activeDriverOrders = useDriverStore(s => s.activeDriverOrders);
  const activeDriverOrder = activeDriverOrders.find(o => o.orderId === params.orderId) || activeDriverOrders[0];
  const registeredDriver = useDriverStore(s => s.registeredDriver);
  
  const order = activeDriverOrder;

  const customerName = order?.customer.name ?? 'الزبون';
  const customerPhone = order?.customer.phone ?? '';
  const customerLat = String(order?.deliveryAddress.lat ?? '');
  const customerLng = String(order?.deliveryAddress.lng ?? '');
  const price        = Number(order?.total ?? 2500);
  const address      = order?.deliveryAddress.label  ?? 'الجزائر العاصمة';
  
  const orderType = registeredDriver?.driverType === 'Bottled' ? 'bottles' 
    : (registeredDriver?.waterType === 'well' ? 'well_water' 
    : (registeredDriver?.waterType === 'construction' ? 'construction_water' 
    : 'spring_water'));
    
  const meta         = ORDER_META[orderType] ?? ORDER_META.spring_water;
  const capacityLiters = Number(order?.items?.[0]?.qty || 1000);
  const floor = String(order?.items?.[0]?.floor || 'غير محدد');
  
  const [bucketPrice, setBucketPrice] = useState('');
  const [wellWaterPrice, setWellWaterPrice] = useState('');
  
  const [bottleItems, setBottleItems] = useState<{id: number, name: string, qty: number, unit: string, price: string, image: string}[]>(() => {
    return order?.items?.map((i, idx) => ({
      id: idx,
      name: i.description,
      qty: i.qty || 1,
      unit: i.detail,
      price: String(i.unitPrice || i.price || 0),
      image: i.icon
    })) || [];
  });

  const [totalPrice, setTotalPrice] = useState(orderType === 'spring_water' ? 0 : price);
  const [confirmed, setConfirmed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);

  const BUCKET_CAPACITY = 20;
  
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  // Animation values
  const pulseAnim = useSharedValue(1);
  const isUrgent = timeLeft <= 10;

  useEffect(() => {
    if (isUrgent) {
      pulseAnim.value = withRepeat(withSequence(withTiming(1.1, { duration: 500 }), withTiming(1, { duration: 500 })), -1, true);
    } else {
      pulseAnim.value = withTiming(1);
    }
  }, [isUrgent]);

  const animatedUrgentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  useEffect(() => {
    if (confirmed) return;
    if (timeLeft <= 0) {
      Alert.alert('انتهى الوقت', 'لقد انتهى وقت تحديد السعر، تمت العودة للرئيسية.');
      router.replace('/(driver)/(tabs)' as any);
      return;
    }
    const timerId = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearTimeout(timerId);
  }, [timeLeft, confirmed]);

  const handlePriceChange = (id: number, text: string) => {
    setBottleItems(prev => prev.map(item => item.id === id ? { ...item, price: text } : item));
  };

  const [markup, setMarkup] = useState(0);

  useEffect(() => {
    if (orderType === 'spring_water') {
      const p = parseFloat(bucketPrice);
      setTotalPrice(!isNaN(p) && p >= 0 ? (capacityLiters / BUCKET_CAPACITY) * p : 0);
      setMarkup((capacityLiters / 20) * 5);
    } else if (orderType === 'well_water' || orderType === 'construction_water') {
      const p = parseFloat(wellWaterPrice);
      setTotalPrice(!isNaN(p) && p >= 0 ? p : 0);
      setMarkup(Math.ceil(capacityLiters / 1500) * 50);
    } else if (orderType === 'bottles') {
      const total = bottleItems.reduce((sum, item) => sum + (item.qty * (parseFloat(item.price) || 0)), 0);
      setTotalPrice(total);
      const totalFardous = bottleItems.reduce((sum, item) => sum + (item.qty || 1), 0);
      setMarkup(totalFardous * 3);
    }
  }, [bucketPrice, wellWaterPrice, bottleItems, capacityLiters, orderType]);

  const handleCall = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (customerPhone) {
      Linking.openURL(`tel:${customerPhone}`);
    } else {
      Alert.alert('خطأ', 'رقم الهاتف غير متوفر');
    }
  };

  const handleConfirm = () => {
    if (totalPrice <= 0) {
      Alert.alert('تنبيه', 'يرجى إدخال السعر لتأكيد الاستلام');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setConfirmed(true);
    updateDriverOrderStatus('driving', totalPrice, activeDriverOrder?.orderId);
    setTimeout(() => {
      router.replace({
        pathname: '/(driver)/order-details' as any,
        params: {
          customerName: customerName,
          customerPhone: customerPhone,
          customerLat: customerLat,
          customerLng: customerLng,
          price:        String(totalPrice),
          address:      address,
          orderType:    orderType,
          distance:     order?.deliveryAddress.distance ?? '2.5 كم',
          rating:       (order?.customer as any)?.rating ?? '4.8',
          orderNumber:  activeDriverOrder?.orderId ? activeDriverOrder.orderId.split('-')[0].toUpperCase() : String(Math.floor(10000 + Math.random() * 90000)),
        },
      });
    }, 1200);
  };

  const handleReject = async () => {
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* ── خلفية علوية بتدرج لوني ── */}
      <LinearGradient
        colors={[COLORS.primary, '#003B7E']}
        style={[styles.headerGradient, { height: insets.top + 160 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex1}>
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={[styles.scrollArea, { paddingTop: insets.top + 20 }]}
          keyboardShouldPersistTaps="handled"
        >
          
          {/* ── العنوان والعداد ── */}
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.headerTitleRow}>
             <Text style={styles.headerTitle}>تأكيد الاستلام</Text>
             <Animated.View style={[styles.timerBadge, isUrgent && animatedUrgentStyle, { backgroundColor: isUrgent ? '#FEE2E2' : 'rgba(255,255,255,0.2)' }]}>
                <Ionicons name="time" size={18} color={isUrgent ? COLORS.danger : COLORS.white} />
                <Text style={[styles.timerText, { color: isUrgent ? COLORS.danger : COLORS.white }]}>
                  {timeLeft} ثانية
                </Text>
             </Animated.View>
          </Animated.View>

          {/* ── بطاقة العميل ── */}
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.customerCard}>
            <View style={styles.customerCardInner}>
              {params.avatarUrl ? (
                <Image source={{uri: params.avatarUrl}} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={26} color={COLORS.primary} />
                </View>
              )}
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>{customerName}</Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="location" size={14} color={COLORS.textSecondary} />
                  <Text style={styles.locationText}>{order?.deliveryAddress.distance ?? '2.5 كم'}</Text>
                  <View style={styles.dot} />
                  <Ionicons name="star" size={14} color={COLORS.secondary} />
                  <Text style={styles.locationText}>{(order?.customer as any)?.rating ?? '4.8'}</Text>
                </View>
              </View>
              <View style={styles.shieldIconBox}>
                <Ionicons name="shield-checkmark" size={24} color={COLORS.success} />
              </View>
            </View>
            <View style={styles.addressBox}>
              <Ionicons name="map-outline" size={18} color={COLORS.textSecondary} />
              <Text style={styles.addressLabel} numberOfLines={2}>{address}</Text>
            </View>
          </Animated.View>

          {/* ── تفاصيل الطلبية وتحديد السعر ── */}
          <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.detailsContainer}>
            
            <View style={styles.detailsHeader}>
              <View style={styles.titleRow}>
                <View style={[styles.iconBox, { backgroundColor: meta.bg }]}>
                  <MaterialCommunityIcons name={meta.icon as any} size={22} color={meta.color} />
                </View>
                <View>
                  <Text style={styles.detailsTitle}>{getOrderLabel(orderType)}</Text>
                  <Text style={styles.orderIdText}>طلب #{activeDriverOrder?.orderId ? activeDriverOrder.orderId.split('-')[0].toUpperCase() : '84729'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* السعة */}
            {(orderType === 'spring_water' || orderType === 'well_water' || orderType === 'construction_water') && (
              <View style={styles.capacityRow}>
                <Text style={styles.capacityLabel}>الكمية المطلوبة:</Text>
                <Text style={styles.capacityValue}>{capacityLiters} لتر</Text>
              </View>
            )}

            {/* الطابق (يظهر فقط لآبار) */}
            {orderType === 'well_water' && (
              <View style={styles.capacityRow}>
                <Text style={styles.capacityLabel}>الطابق:</Text>
                <Text style={styles.capacityValue}>{floor}</Text>
              </View>
            )}

            {/* ── قائمة القوارير ── */}
            {orderType === 'bottles' && bottleItems.map((item, index) => (
              <View key={item.id} style={styles.bottleItemContainer}>
                <View style={styles.itemRowBottles}>
                  <View style={styles.imageBoxBottles}>
                    {item.image ? (
                      <Image source={{ uri: item.image }} style={styles.productImageBottles} resizeMode="contain" />
                    ) : (
                      <MaterialCommunityIcons name="bottle-wine-outline" size={32} color={COLORS.primary} />
                    )}
                  </View>
                  <View style={styles.itemDetailsBottles}>
                    <Text style={styles.itemNameBottles}>{item.name}</Text>
                    <Text style={styles.itemQtyBottles}>الكمية: {item.qty} {item.unit}</Text>
                  </View>
                </View>
                
                <View style={styles.priceInputBox}>
                  <Text style={styles.priceInputLabel}>سعر الوحدة:</Text>
                  <View style={styles.inputWrapperSmall}>
                    <TextInput
                      style={styles.priceInputSmall}
                      value={item.price}
                      onChangeText={(text) => handlePriceChange(item.id, text)}
                      keyboardType="numeric"
                      textAlign="center"
                      placeholder="0"
                    />
                    <Text style={styles.currencyLabelSmall}>د.ج</Text>
                  </View>
                </View>
                {index !== bottleItems.length - 1 && <View style={styles.dividerLight} />}
              </View>
            ))}

            {/* ── إدخال السعر (للينابيع) ── */}
            {orderType === 'spring_water' && (
              <View style={styles.inputSection}>
                <View style={styles.inputTexts}>
                   <Text style={styles.inputLabel}>سعر الدلو الواحد (20 لتر)</Text>
                   <Text style={styles.inputHint}>الرجاء إدخال السعر لحساب الإجمالي</Text>
                </View>
                <View style={styles.inputWrapper}>
                   <TextInput
                     style={styles.priceInput}
                     placeholder="0"
                     placeholderTextColor="#94A3B8"
                     keyboardType="numeric"
                     value={bucketPrice}
                     onChangeText={setBucketPrice}
                     textAlign="center"
                   />
                   <Text style={styles.currencySuffix}>د.ج</Text>
                </View>
              </View>
            )}

            {/* ── إدخال السعر (لآبار وأشغال) ── */}
            {(orderType === 'well_water' || orderType === 'construction_water') && (
              <View style={styles.inputSection}>
                <View style={styles.inputTexts}>
                   <Text style={styles.inputLabel}>السعر الإجمالي للصهريج</Text>
                   <Text style={styles.inputHint}>أدخل المبلغ الإجمالي المتفق عليه</Text>
                </View>
                <View style={styles.inputWrapper}>
                   <TextInput
                     style={styles.priceInput}
                     placeholder="0"
                     placeholderTextColor="#94A3B8"
                     keyboardType="numeric"
                     value={wellWaterPrice}
                     onChangeText={setWellWaterPrice}
                     textAlign="center"
                   />
                   <Text style={styles.currencySuffix}>د.ج</Text>
                </View>
              </View>
            )}
            
            {/* ── السعر الإجمالي المحسوب ── */}
            {orderType !== 'well_water' && orderType !== 'construction_water' && (
              <>
                <View style={styles.divider} />
                <View style={[styles.totalRow, { marginBottom: 8 }]}>
                   <Text style={[styles.totalLabel, { color: COLORS.textSecondary }]}>السعر الأساسي</Text>
                   <Text style={[styles.totalValue, { fontSize: 16, color: COLORS.primary }]}>{totalPrice.toLocaleString('ar-DZ')} د.ج</Text>
                </View>
                {markup > 0 && (
                  <View style={[styles.totalRow, { marginBottom: 8 }]}>
                     <Text style={[styles.totalLabel, { color: COLORS.textSecondary }]}>حقوق التطبيق</Text>
                     <Text style={[styles.totalValue, { fontSize: 16, color: COLORS.success }]}>+ {markup.toLocaleString('ar-DZ')} د.ج</Text>
                  </View>
                )}
                <View style={styles.totalRow}>
                   <Text style={styles.totalLabel}>المبلغ الإجمالي</Text>
                   <Text style={styles.totalValue}>{(totalPrice + markup).toLocaleString('ar-DZ')} <Text style={styles.currencyLarge}>د.ج</Text></Text>
                </View>
              </>
            )}

          </Animated.View>

          {/* رسالة النجاح */}
          {confirmed && (
            <Animated.View entering={FadeInUp} style={styles.successBanner}>
              <MaterialCommunityIcons name="check-circle" size={24} color={COLORS.success} />
              <Text style={styles.successText}>تم تأكيد الاستلام وتحديث حالة الطلب!</Text>
            </Animated.View>
          )}

          <View style={{ height: 250 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── شريط الإجراءات السفلي (Floating Footer) ── */}
      {!isKeyboardVisible && (
        <Animated.View entering={FadeInUp.delay(500).springify()} style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 15, 25) }]}>
          <View style={styles.footerGlow} />
          <TouchableOpacity 
            style={[styles.confirmButton, confirmed && styles.confirmButtonDisabled]} 
            activeOpacity={0.85} 
            onPress={handleConfirm} 
            disabled={confirmed}
          >
            <LinearGradient
              colors={confirmed ? ['#E2E8F0', '#CBD5E1'] : [COLORS.secondary, '#EAB308']}
              style={styles.confirmGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={[styles.confirmButtonText, confirmed && { color: '#94A3B8' }]}>
                {confirmed ? 'جاري التأكيد...' : 'تأكيد الاستلام'}
              </Text>
              {!confirmed && <Ionicons name="checkmark-circle-outline" size={24} color={COLORS.primary} style={{ marginRight: 8 }} />}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelLink} onPress={handleReject} disabled={confirmed}>
            <Text style={styles.cancelText}>رفض الطلبية</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

    </View>
  );
}

// ─── مساعد: اسم نوع الطلبية بالعربية ────────────────────────────────────────
function getOrderLabel(type: string): string {
  switch (type) {
    case 'bottles':            return 'مياه معدنية معبأة';
    case 'well_water':         return 'صهريج مياه آبار';
    case 'construction_water': return 'صهريج مياه أشغال';
    default:                   return 'مياه ينابيع طبيعية';
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex1: { flex: 1 },
  headerGradient: { position: 'absolute', top: 0, left: 0, right: 0, borderBottomLeftRadius: 35, borderBottomRightRadius: 35 },
  
  scrollArea: { paddingHorizontal: 20 },
  
  headerTitleRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 24, fontFamily: 'Cairo-Black', color: COLORS.white },
  timerBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  timerText: { fontSize: 16, fontFamily: 'Cairo-Bold' },

  customerCard: { backgroundColor: COLORS.cardBg, borderRadius: 24, padding: 20, marginBottom: 20, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 12 },
  customerCardInner: { flexDirection: 'row-reverse', alignItems: 'center' },
  avatarPlaceholder: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.secondary },
  avatarImage: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: COLORS.secondary },
  customerInfo: { flex: 1, alignItems: 'flex-end', paddingHorizontal: 15 },
  customerName: { fontSize: 20, color: COLORS.primary, fontFamily: 'Cairo-Black', textAlign: 'right' },
  ratingRow: { flexDirection: 'row-reverse', alignItems: 'center', marginTop: 4, gap: 4 },
  locationText: { fontSize: 13, color: COLORS.textSecondary, fontFamily: 'Cairo-SemiBold' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', marginHorizontal: 4 },
  shieldIconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center' },
  addressBox: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, marginTop: 16, gap: 8 },
  addressLabel: { flex: 1, fontSize: 13, color: COLORS.textSecondary, fontFamily: 'Cairo-SemiBold', textAlign: 'right', lineHeight: 20 },

  detailsContainer: { backgroundColor: COLORS.cardBg, borderRadius: 24, padding: 24, marginBottom: 25, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12 },
  detailsHeader: { marginBottom: 10 },
  titleRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  iconBox: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  detailsTitle: { fontSize: 18, color: COLORS.primary, fontFamily: 'Cairo-Black', textAlign: 'right' },
  orderIdText: { fontSize: 13, color: COLORS.textSecondary, fontFamily: 'Cairo-SemiBold', textAlign: 'right', marginTop: 2 },
  
  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 20 },
  dividerLight: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 15 },

  capacityRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  capacityLabel: { fontSize: 15, color: COLORS.textSecondary, fontFamily: 'Cairo-SemiBold' },
  capacityValue: { fontSize: 16, color: COLORS.primary, fontFamily: 'Cairo-Black' },

  inputSection: { flexDirection: 'column', alignItems: 'flex-end', marginTop: 10 },
  inputTexts: { alignItems: 'flex-end', marginBottom: 12 },
  inputLabel: { fontSize: 16, color: COLORS.primary, fontFamily: 'Cairo-Bold', textAlign: 'right' },
  inputHint: { fontSize: 13, color: COLORS.textSecondary, fontFamily: 'Cairo-SemiBold', textAlign: 'right', marginTop: 2 },
  inputWrapper: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 16, width: '100%', height: 64 },
  priceInput: { flex: 1, fontSize: 24, color: COLORS.primary, fontFamily: 'Cairo-Black', paddingHorizontal: 10 },
  currencySuffix: { fontSize: 18, color: COLORS.primary, fontFamily: 'Cairo-Bold', marginLeft: 10 },

  bottleItemContainer: { marginVertical: 8 },
  itemRowBottles: { flexDirection: 'row-reverse', alignItems: 'center' },
  imageBoxBottles: { width: 60, height: 60, backgroundColor: '#F8FAFC', borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  productImageBottles: { width: 40, height: 40 },
  itemDetailsBottles: { flex: 1, alignItems: 'flex-end', paddingRight: 15 },
  itemNameBottles: { fontSize: 16, fontFamily: 'Cairo-Black', color: COLORS.primary, textAlign: 'right' },
  itemQtyBottles: { fontSize: 13, color: COLORS.textSecondary, fontFamily: 'Cairo-SemiBold', marginTop: 4, textAlign: 'right' },
  
  priceInputBox: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12 },
  priceInputLabel: { fontSize: 14, color: COLORS.primary, fontFamily: 'Cairo-Bold' },
  inputWrapperSmall: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: COLORS.white, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 10, height: 44, width: 140 },
  priceInputSmall: { flex: 1, fontSize: 16, fontFamily: 'Cairo-Black', color: COLORS.primary },
  currencyLabelSmall: { fontSize: 14, color: COLORS.textSecondary, fontFamily: 'Cairo-Bold', marginLeft: 8 },

  totalRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, backgroundColor: '#FDFBEB', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#FEF08A' },
  totalLabel: { fontSize: 16, color: COLORS.primary, fontFamily: 'Cairo-Black' },
  totalValue: { fontSize: 24, color: COLORS.primary, fontFamily: 'Cairo-Black' },
  currencyLarge: { fontSize: 16, fontFamily: 'Cairo-Bold' },

  successBanner: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#F0FDF4', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#BBF7D0', marginBottom: 20 },
  successText: { fontSize: 15, fontFamily: 'Cairo-Bold', color: COLORS.success },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.white, paddingTop: 20, paddingHorizontal: 24, borderTopLeftRadius: 30, borderTopRightRadius: 30, elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 20 },
  footerGlow: { position: 'absolute', top: -30, left: 0, right: 0, height: 30, backgroundColor: 'rgba(255,255,255,0.0)' }, // Optional glow effect
  confirmButton: { height: 60, borderRadius: 18, overflow: 'hidden', marginBottom: 12, elevation: 4, shadowColor: COLORS.secondary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  confirmButtonDisabled: { elevation: 0, shadowOpacity: 0 },
  confirmGradient: { flex: 1, flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center' },
  confirmButtonText: { color: COLORS.primary, fontSize: 18, fontFamily: 'Cairo-Black' },
  cancelLink: { alignSelf: 'center', padding: 10, marginBottom: 5 },
  cancelText: { color: COLORS.textSecondary, fontSize: 16, fontFamily: 'Cairo-Bold' }
});
